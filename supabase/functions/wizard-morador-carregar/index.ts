// ======================================================
// EDGE FUNCTION
// wizard-morador-carregar
// Sistema Chegou!
// ======================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function obterIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    null
  );
}

function normalizarStatus(valor: unknown) {
  return String(valor || "").trim().toUpperCase();
}

function wizardFinalizado(
  convite: Record<string, any>,
  preCadastro: Record<string, any>
) {
  const statusCadastro = normalizarStatus(
    preCadastro?.status_cadastro
  );

  const statusAuditoria = normalizarStatus(
    preCadastro?.status_auditoria
  );

  return (
    convite?.wizard_finalizado === true ||
    Boolean(preCadastro?.wizard_finalizado_em) ||
    preCadastro?.bloqueado_para_edicao === true ||
    [
      "AGUARDANDO_AUDITORIA",
      "EM_AUDITORIA",
      "APROVADO",
      "REJEITADO",
      "RECUSADO",
      "CORRECAO_SOLICITADA",
    ].includes(statusCadastro) ||
    [
      "AGUARDANDO_AUDITORIA",
      "PENDENTE",
      "EM_ANALISE",
      "EM_AUDITORIA",
      "APROVADO",
      "REJEITADO",
      "RECUSADO",
      "CORRECAO_SOLICITADA",
    ].includes(statusAuditoria)
  );
}

function expirou(dataIso: string | null | undefined) {
  if (!dataIso) return false;
  return new Date(dataIso) < new Date();
}

function mapearStatusAcompanhamento(
  preCadastro: Record<string, any>
) {
  const atual = String(
    preCadastro?.status_acompanhamento || ""
  ).trim();

  if (atual) return atual;

  const auditoria = normalizarStatus(
    preCadastro?.status_auditoria
  );

  const cadastro = normalizarStatus(
    preCadastro?.status_cadastro
  );

  if (
    auditoria === "APROVADO" ||
    cadastro === "APROVADO"
  ) {
    return "aprovado";
  }

  if (
    auditoria === "EM_ANALISE" ||
    auditoria === "EM_AUDITORIA"
  ) {
    return "em_analise";
  }

  if (
    auditoria === "REJEITADO" ||
    auditoria === "RECUSADO" ||
    cadastro === "REJEITADO" ||
    cadastro === "RECUSADO"
  ) {
    return "recusado";
  }

  if (
    auditoria === "PENDENTE" ||
    auditoria === "AGUARDANDO_AUDITORIA" ||
    cadastro === "AGUARDANDO_AUDITORIA"
  ) {
    return "fila_auditoria";
  }

  return "preenchimento";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse(
        {
          success: false,
          error: "METODO_NAO_PERMITIDO",
        },
        405
      );
    }

    const body = await req.json();
    const token = body?.token;

    if (!token) {
      return jsonResponse(
        {
          success: false,
          error: "TOKEN_NAO_INFORMADO",
        },
        400
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        {
          success: false,
          error: "VARIAVEIS_SUPABASE_AUSENTES",
        },
        500
      );
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey
    );

    // ======================================================
    // 1. LOCALIZA O CONVITE DIRETAMENTE
    //
    // Isso permite que o MESMO link do e-mail continue
    // identificando o processo após o token ter sido
    // marcado como utilizado/revogado para ESCRITA.
    // ======================================================

    const { data: convite, error: conviteError } =
      await supabase
        .from("convites_morador")
        .select("*")
        .eq("token_convite", token)
        .maybeSingle();

    if (conviteError) throw conviteError;

    if (!convite?.id || !convite?.pre_cadastro_id) {
      return jsonResponse(
        {
          success: false,
          error: "TOKEN_INVALIDO",
        },
        401
      );
    }

    const { data: preCadastro, error: preCadastroError } =
      await supabase
        .from("pre_cadastro_moradores")
        .select("*")
        .eq("id", convite.pre_cadastro_id)
        .single();

    if (preCadastroError || !preCadastro) {
      console.error(preCadastroError);

      return jsonResponse(
        {
          success: false,
          error: "PRE_CADASTRO_NAO_ENCONTRADO",
        },
        404
      );
    }

    const finalizado = wizardFinalizado(
      convite,
      preCadastro
    );

    // ======================================================
    // 2. TOKEN DE PREENCHIMENTO
    //
    // Enquanto o Wizard NÃO foi concluído, continua valendo
    // a validação forte original do convite.
    // ======================================================

    let tokenInfo: any = null;

    if (!finalizado) {
      const { data: tokenData, error: tokenError } =
        await supabase.rpc(
          "validar_token_convite_morador",
          {
            p_token: token,
          }
        );

      if (tokenError) {
        console.error(tokenError);

        return jsonResponse(
          {
            success: false,
            error: "ERRO_VALIDACAO_TOKEN",
          },
          500
        );
      }

      tokenInfo = tokenData?.[0];

      if (!tokenInfo?.valido) {
        return jsonResponse(
          {
            success: false,
            error: "TOKEN_INVALIDO",
            detalhes: tokenInfo,
          },
          401
        );
      }
    }

    // ======================================================
    // 3. TOKEN DE ACOMPANHAMENTO
    //
    // Depois da conclusão, o link original é somente uma
    // chave de localização READ-ONLY para a Tela 9.
    //
    // A validade passa a obedecer
    // token_acompanhamento_expira_em (7 dias).
    // ======================================================

    if (
      finalizado &&
      expirou(preCadastro.token_acompanhamento_expira_em)
    ) {
      return jsonResponse(
        {
          success: false,
          error: "TOKEN_ACOMPANHAMENTO_EXPIRADO",
          status_acompanhamento:
            mapearStatusAcompanhamento(preCadastro),
        },
        410
      );
    }

    // ======================================================
    // 4. DADOS DE CONTEXTO
    // ======================================================

    const { data: condominio } = await supabase
      .from("condominios")
      .select("*")
      .eq("id", preCadastro.condominio_id)
      .single();

    const { data: torres } = await supabase
      .from("torres")
      .select("*")
      .eq("condominio_id", preCadastro.condominio_id)
      .order("nome", { ascending: true });

    const { data: unidades } = await supabase
      .from("unidades")
      .select("*")
      .eq("condominio_id", preCadastro.condominio_id)
      .order("numero", { ascending: true });

    const ip = obterIp(req);
    const userAgent =
      req.headers.get("user-agent") || null;

    // ======================================================
    // 5. SESSÃO EDITÁVEL SOMENTE DURANTE PREENCHIMENTO
    // ======================================================

    let sessao = null;

    if (!finalizado) {
      const { data: sessaoData, error: sessaoError } =
        await supabase.rpc(
          "criar_ou_recuperar_sessao_wizard",
          {
            p_pre_cadastro_id: preCadastro.id,
            p_token: token,
            p_ip: ip,
            p_dispositivo: userAgent,
            p_navegador: userAgent,
            p_sistema: userAgent,
            p_fingerprint: null,
          }
        );

      if (sessaoError) {
        console.error(sessaoError);
      }

      sessao = sessaoData?.[0] || null;

      // Evento de abertura somente no fluxo editável.
      try {
        await supabase.rpc("marcar_convite_aberto", {
          p_token: token,
          p_ip: ip,
          p_user_agent: userAgent,
          p_dispositivo: userAgent,
          p_sistema: userAgent,
        });
      } catch (error) {
        console.error(
          "Erro ao marcar convite aberto:",
          error
        );
      }
    }

    const statusAcompanhamento =
      mapearStatusAcompanhamento(preCadastro);

    // ======================================================
    // 6. MODO AUTORITATIVO
    // ======================================================

    const modo =
      finalizado
        ? "ACOMPANHAMENTO"
        : "PREENCHIMENTO";

    const etapaAutoritativa =
      finalizado
        ? 9
        : Number(preCadastro.etapa_atual || 1);

    const progressoAutoritativo =
      finalizado
        ? 100
        : Number(preCadastro.percentual_preenchimento || 0);

    // ======================================================
    // RESPONSE
    // ======================================================

    return jsonResponse({
      success: true,

      modo,
      somente_leitura: finalizado,

      token: {
        valido: true,
        tipo:
          finalizado
            ? "ACOMPANHAMENTO"
            : "CONVITE",
        expiracao:
          finalizado
            ? preCadastro.token_acompanhamento_expira_em
            : preCadastro.token_expira_em,
      },

      // O frontend deve usar estes campos como autoridade.
      etapa_atual: etapaAutoritativa,
      progresso: progressoAutoritativo,
      percentual_preenchimento:
        progressoAutoritativo,

      status_cadastro:
        preCadastro.status_cadastro,
      status_auditoria:
        preCadastro.status_auditoria,
      status_acompanhamento:
        statusAcompanhamento,

      bloqueado_para_edicao:
        finalizado ||
        preCadastro.bloqueado_para_edicao === true,

      wizard_finalizado:
        finalizado,
      wizard_finalizado_em:
        preCadastro.wizard_finalizado_em || null,

      protocolo:
        preCadastro.protocolo_auditoria ||
        preCadastro.protocolo ||
        null,

      token_acompanhamento:
        preCadastro.token_acompanhamento || null,
      token_acompanhamento_expira_em:
        preCadastro.token_acompanhamento_expira_em ||
        null,

      sessao,

      preCadastro: {
        ...preCadastro,

        // Evita que estado legado interno contradiga
        // a navegação autoritativa do acompanhamento.
        etapa_atual: etapaAutoritativa,
        percentual_preenchimento:
          progressoAutoritativo,
        status_acompanhamento:
          statusAcompanhamento,
        bloqueado_para_edicao:
          finalizado ||
          preCadastro.bloqueado_para_edicao === true,

        // Nunca devolver segredos/artefatos de senha ao browser.
        senha_hash: undefined,
        senha_auth_criptografada: undefined,
      },

      condominio,
      torres: torres || [],
      unidades: unidades || [],
    });
  } catch (error) {
    console.error(error);

    return jsonResponse(
      {
        success: false,
        error: "ERRO_INTERNO",
        detalhes:
          error instanceof Error
            ? error.message
            : null,
      },
      500
    );
  }
});