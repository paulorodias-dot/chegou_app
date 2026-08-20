import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
}

function objeto(
  valor: unknown
): Record<string, any> {
  return (
    valor &&
    typeof valor === "object" &&
    !Array.isArray(valor)
  )
    ? valor as Record<string, any>
    : {};
}

function sanitizarSemBase64(
  valor: any
): any {
  if (Array.isArray(valor)) {
    return valor.map(
      (item) =>
        sanitizarSemBase64(item)
    );
  }

  if (
    valor &&
    typeof valor === "object"
  ) {
    const saida: Record<string, any> = {};

    for (
      const [chave, conteudo]
      of Object.entries(valor)
    ) {
      const chaveNormalizada =
        chave.toLowerCase();

      if (
        chaveNormalizada ===
          "foto_base64" ||
        chaveNormalizada.endsWith(
          "_base64"
        )
      ) {
        continue;
      }

      if (
        typeof conteudo === "string" &&
        conteudo
          .trim()
          .toLowerCase()
          .startsWith("data:image/")
      ) {
        continue;
      }

      saida[chave] =
        sanitizarSemBase64(
          conteudo
        );
    }

    return saida;
  }

  return valor;
}

function extrairResultadoRpc(
  rpcData: unknown
) {
  if (Array.isArray(rpcData)) {
    return rpcData[0] || null;
  }

  return rpcData || null;
}

async function registrarLog({
  supabase,
  acao,
  condominioId,
  email,
  detalhes,
}: {
  supabase: ReturnType<
    typeof createClient
  >;
  acao: string;
  condominioId?: string | null;
  email?: string | null;
  detalhes?: Record<
    string,
    unknown
  >;
}) {
  try {
    await supabase
      .from("logs_sistema")
      .insert({
        acao,
        condominio_id:
          condominioId || null,
        usuario_id: null,
        email: email || null,
        origem:
          "wizard_morador_enviar_auditoria",
        detalhes:
          detalhes || {},
      });
  } catch (error) {
    /*
     * Log auxiliar não pode
     * derrubar o fluxo principal.
     */
    console.error(
      `Erro ao registrar ${acao}:`,
      error
    );
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(
      "ok",
      {
        headers: corsHeaders,
      }
    );
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse(
        {
          success: false,
          error:
            "Método não permitido.",
        },
        405
      );
    }

    const body =
      await req.json();

    const token =
      String(
        body?.token || ""
      ).trim();

    const aceiteTermos =
      body?.aceite_termos === true;

    const aceiteLgpd =
      body?.aceite_lgpd === true;

    const dadosFinais =
      sanitizarSemBase64(
        objeto(
          body?.dados_finais
        )
      );

    if (!token) {
      return jsonResponse(
        {
          success: false,
          error:
            "Não foi possível identificar seu convite. Abra novamente o link que você recebeu.",
        },
        400
      );
    }

    if (
      !aceiteTermos ||
      !aceiteLgpd
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Para concluir, aceite os Termos de Uso e a Política de Privacidade.",
        },
        400
      );
    }

    const supabaseUrl =
      Deno.env.get(
        "SUPABASE_URL"
      );

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY"
      );

    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "O serviço está temporariamente indisponível. Tente novamente em alguns instantes.",
        },
        500
      );
    }

    const supabase =
      createClient(
        supabaseUrl,
        serviceRoleKey
      );

    const ip =
      req.headers
        .get("x-forwarded-for")
        ?.split(",")[0]
        ?.trim() ||
      req.headers.get(
        "cf-connecting-ip"
      ) ||
      req.headers.get(
        "x-real-ip"
      ) ||
      "0.0.0.0";

    const userAgent =
      req.headers.get(
        "user-agent"
      ) || "unknown";


    /*
     * -------------------------------------------------------
     * 1. LEITURA PRÉVIA SOMENTE PARA EXPERIÊNCIA
     * -------------------------------------------------------
     *
     * Não governa a conclusão.
     * A autoridade permanece na RPC.
     */

    const {
      data: convite,
      error: conviteError,
    } = await supabase
      .from("convites_morador")
      .select(`
        id,
        pre_cadastro_id,
        condominio_id,
        business_id,
        token_expira_em,
        token_utilizado,
        token_revogado,
        wizard_finalizado
      `)
      .eq(
        "token_convite",
        token
      )
      .maybeSingle();

    if (conviteError) {
      throw conviteError;
    }

    if (!convite?.id) {
      return jsonResponse(
        {
          success: false,
          error:
            "Não foi possível localizar este convite. Verifique o link recebido.",
        },
        404
      );
    }


    /*
     * Idempotência de experiência.
     *
     * A RPC continua protegida também
     * no banco.
     */

    if (
      convite.wizard_finalizado ===
      true
    ) {
      const {
        data: cadastroFinalizado,
        error:
          cadastroFinalizadoError,
      } = await supabase
        .from(
          "pre_cadastro_moradores"
        )
        .select("*")
        .eq(
          "id",
          convite.pre_cadastro_id
        )
        .maybeSingle();

      if (
        cadastroFinalizadoError
      ) {
        throw cadastroFinalizadoError;
      }

      return jsonResponse({
        success: true,

        data: {
          pre_cadastro:
            cadastroFinalizado,

          idempotente: true,

          status_cadastro:
            cadastroFinalizado
              ?.status_cadastro ||
            null,

          status_acompanhamento:
            cadastroFinalizado
              ?.status_acompanhamento ||
            null,

          token_acompanhamento:
            cadastroFinalizado
              ?.token_acompanhamento ||
            null,

          token_acompanhamento_expira_em:
            cadastroFinalizado
              ?.token_acompanhamento_expira_em ||
            null,

          bloqueado_para_edicao:
            cadastroFinalizado
              ?.bloqueado_para_edicao ===
            true,

          auth_ativo:
            cadastroFinalizado
              ?.auth_ativo === true,

          auth_criado:
            false,

          message:
            "Cadastro já estava concluído.",
        },
      });
    }


    /*
     * -------------------------------------------------------
     * 2. PRÉ-CADASTRO
     * -------------------------------------------------------
     */

    const {
      data: preCadastro,
      error: preError,
    } = await supabase
      .from(
        "pre_cadastro_moradores"
      )
      .select(`
        id,
        condominio_id,
        business_id,
        email,
        senha_preparada,
        senha_hash,
        senha_auth_criptografada
      `)
      .eq(
        "id",
        convite.pre_cadastro_id
      )
      .maybeSingle();

    if (preError) {
      throw preError;
    }

    if (!preCadastro?.id) {
      return jsonResponse(
        {
          success: false,
          error:
            "Não foi possível localizar seu cadastro.",
        },
        404
      );
    }


    /*
     * A conta continua sendo criada
     * somente após aprovação.
     */

    if (
      preCadastro.senha_preparada !==
      true
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Conclua a criação da sua senha antes de finalizar o cadastro.",
        },
        409
      );
    }

    if (
      !preCadastro
        .senha_auth_criptografada ||
      !preCadastro.senha_hash
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Não foi possível confirmar sua senha. Volte à etapa de senha e tente novamente.",
        },
        409
      );
    }


    /*
     * -------------------------------------------------------
     * 3. ÚNICA AUTORIDADE DE CONCLUSÃO
     * -------------------------------------------------------
     */

    const {
      data: rpcData,
      error: rpcError,
    } = await supabase.rpc(
      "concluir_wizard_morador",
      {
        p_token:
          token,

        /*
         * Envia os aceites REALMENTE
         * recebidos do frontend.
         */
        p_aceite_termos:
          aceiteTermos,

        p_aceite_lgpd:
          aceiteLgpd,

        p_ip:
          ip,

        p_user_agent:
          userAgent,

        p_dados_finais:
          dadosFinais,
      }
    );


    if (rpcError) {
      await registrarLog({
        supabase,

        acao:
          "WIZARD_MORADOR_FINALIZACAO_RPC_ERRO",

        condominioId:
          preCadastro.condominio_id ||
          convite.condominio_id,

        email:
          preCadastro.email,

        detalhes: {
          pre_cadastro_id:
            preCadastro.id,

          convite_id:
            convite.id,

          erro:
            rpcError.message,
        },
      });

      return jsonResponse(
        {
          success: false,
          error:
            "Não foi possível concluir seu cadastro. Revise as informações e tente novamente.",
        },
        409
      );
    }


    const resultadoRpc: any =
      extrairResultadoRpc(
        rpcData
      );


    if (
      !resultadoRpc ||
      resultadoRpc.success !==
        true
    ) {
      await registrarLog({
        supabase,

        acao:
          "WIZARD_MORADOR_FINALIZACAO_RECUSADA",

        condominioId:
          preCadastro.condominio_id ||
          convite.condominio_id,

        email:
          preCadastro.email,

        detalhes: {
          pre_cadastro_id:
            preCadastro.id,

          convite_id:
            convite.id,

          resultado_rpc:
            resultadoRpc,
        },
      });

      return jsonResponse(
        {
          success: false,

          error:
            "Há informações que precisam ser corrigidas antes de concluir o cadastro.",

          data:
            resultadoRpc,
        },
        422
      );
    }


    /*
     * -------------------------------------------------------
     * 4. READ AFTER WRITE
     * -------------------------------------------------------
     *
     * A Edge NÃO reconstrói estado.
     * Apenas lê o resultado autoritativo
     * produzido pelo PostgreSQL.
     */

    const {
      data: preFinal,
      error: preFinalError,
    } = await supabase
      .from(
        "pre_cadastro_moradores"
      )
      .select(`
        id,
        protocolo,
        protocolo_auditoria,
        status_cadastro,
        status_auditoria,
        status_acompanhamento,
        etapa_atual,
        percentual_preenchimento,
        bloqueado_para_edicao,
        wizard_finalizado_em,
        enviado_auditoria_em,
        token_acompanhamento,
        token_acompanhamento_expira_em,
        status_conta,
        auth_ativo
      `)
      .eq(
        "id",
        preCadastro.id
      )
      .single();

    if (preFinalError) {
      throw preFinalError;
    }


    /*
     * Log complementar da camada HTTP.
     *
     * NÃO é autoridade documental.
     */

    await registrarLog({
      supabase,

      acao:
        "WIZARD_MORADOR_ENVIO_HTTP_CONCLUIDO",

      condominioId:
        preCadastro.condominio_id ||
        convite.condominio_id,

      email:
        preCadastro.email,

      detalhes: {
        pre_cadastro_id:
          preCadastro.id,

        convite_id:
          convite.id,

        status_cadastro:
          preFinal.status_cadastro,

        status_acompanhamento:
          preFinal.status_acompanhamento,

        rpc_executada:
          true,

        auth_criado:
          false,
      },
    });


    /*
     * -------------------------------------------------------
     * 5. RESPOSTA
     * -------------------------------------------------------
     */

    return jsonResponse({
      success: true,

      data: {
        pre_cadastro:
          preFinal,

        rpc:
          resultadoRpc,

        percentual_preenchimento:
          preFinal
            .percentual_preenchimento ||
          100,

        status_cadastro:
          preFinal.status_cadastro,

        status_acompanhamento:
          preFinal
            .status_acompanhamento,

        token_acompanhamento:
          preFinal
            .token_acompanhamento,

        token_acompanhamento_expira_em:
          preFinal
            .token_acompanhamento_expira_em,

        bloqueado_para_edicao:
          preFinal
            .bloqueado_para_edicao ===
          true,

        auth_ativo:
          preFinal.auth_ativo ===
          true,

        auth_criado:
          false,
      },
    });

  } catch (error) {
    console.error(
      "wizard-morador-enviar-auditoria:",
      error
    );

    return jsonResponse(
      {
        success: false,

        error:
          "Não foi possível concluir seu cadastro agora. Tente novamente em alguns instantes.",
      },
      500
    );
  }
});