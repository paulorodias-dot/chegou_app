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

function gerarTokenSeguro() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);

  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function adicionarDiasIso(dataBase: Date, dias: number) {
  const data = new Date(dataBase);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString();
}

function extrairResultadoRpc(rpcData: unknown) {
  if (Array.isArray(rpcData)) {
    return rpcData[0] || null;
  }

  return rpcData || null;
}

function rpcConcluiuComSucesso(rpcData: unknown) {
  const resultado: any = extrairResultadoRpc(rpcData);

  if (!resultado) return false;

  if (typeof resultado.success === "boolean") {
    return resultado.success === true;
  }

  return true;
}

async function registrarLog({
  supabase,
  acao,
  condominio_id,
  usuario_id,
  email,
  origem,
  detalhes,
}: {
  supabase: ReturnType<typeof createClient>;
  acao: string;
  condominio_id?: string | null;
  usuario_id?: string | null;
  email?: string | null;
  origem?: string | null;
  detalhes?: Record<string, unknown>;
}) {
  try {
    await supabase.from("logs_sistema").insert({
      acao,
      condominio_id: condominio_id || null,
      usuario_id: usuario_id || null,
      email: email || null,
      origem: origem || "wizard_morador_enviar_auditoria",
      detalhes: detalhes || {},
    });
  } catch (error) {
    console.error(`Erro ao registrar log ${acao}:`, error);
  }
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
          error: "Método não permitido.",
        },
        405
      );
    }

    const body = await req.json();

    const token = body?.token;
    const aceiteTermos = body?.aceite_termos === true;
    const aceiteLgpd = body?.aceite_lgpd === true;
    const dadosFinais = body?.dados_finais || {};
    const contexto = body?.contexto || {};
    const criarNotificacao =
      body?.criar_notificacao_responsavel_logistica !== false;

    if (!token) {
      return jsonResponse(
        {
          success: false,
          error: "Token não informado.",
        },
        400
      );
    }

    if (!aceiteTermos || !aceiteLgpd) {
      return jsonResponse(
        {
          success: false,
          error: "Aceite dos termos e LGPD são obrigatórios.",
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
          error: "Variáveis Supabase ausentes.",
        },
        500
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      "0.0.0.0";

    const userAgent = req.headers.get("user-agent") || "unknown";

    const { data: convite, error: conviteError } = await supabase
      .from("convites_morador")
      .select(
        `
        id,
        pre_cadastro_id,
        condominio_id,
        business_id,
        token_expira_em,
        token_utilizado,
        token_revogado,
        status_envio,
        status_convite,
        wizard_finalizado
      `
      )
      .eq("token_convite", token)
      .maybeSingle();

    if (conviteError) throw conviteError;

    if (!convite?.id) {
      return jsonResponse(
        {
          success: false,
          error: "Convite não encontrado.",
        },
        404
      );
    }

    // Idempotência de experiência:
    // se o Wizard já foi concluído, não repetir a finalização.
    if (convite.wizard_finalizado === true) {
      const { data: preJaFinalizado, error: preJaFinalizadoError } =
        await supabase
          .from("pre_cadastro_moradores")
          .select("*")
          .eq("id", convite.pre_cadastro_id)
          .maybeSingle();

      if (preJaFinalizadoError) throw preJaFinalizadoError;

      return jsonResponse({
        success: true,
        data: {
          pre_cadastro: preJaFinalizado,
          idempotente: true,
          message: "Wizard já estava finalizado.",
        },
      });
    }

    if (convite.token_revogado) {
      return jsonResponse(
        {
          success: false,
          error: "Convite revogado.",
        },
        400
      );
    }

    if (
      convite.token_expira_em &&
      new Date(convite.token_expira_em) < new Date()
    ) {
      return jsonResponse(
        {
          success: false,
          error: "Convite expirado.",
        },
        410
      );
    }

    const { data: preCadastro, error: preError } = await supabase
      .from("pre_cadastro_moradores")
      .select("*")
      .eq("id", convite.pre_cadastro_id)
      .maybeSingle();

    if (preError) throw preError;

    if (!preCadastro?.id) {
      return jsonResponse(
        {
          success: false,
          error: "Pré-cadastro não encontrado.",
        },
        404
      );
    }

    if (preCadastro.senha_preparada !== true) {
      return jsonResponse(
        {
          success: false,
          error:
            "A senha ainda não foi preparada. Conclua a etapa de Senha e Aceites antes de enviar o cadastro.",
        },
        409
      );
    }

    if (
      !preCadastro.senha_auth_criptografada ||
      !preCadastro.senha_hash
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "A credencial preparada está incompleta. O cadastro não será finalizado.",
        },
        409
      );
    }

    const agora = new Date();
    const agoraIso = agora.toISOString();

    // 1) Autoridade de validação/conclusão.
    // Não aplicar fallback que burle pendências críticas.
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "concluir_wizard_morador",
      {
        p_token: token,
        p_aceite_termos: true,
        p_aceite_lgpd: true,
        p_ip: ip,
        p_user_agent: userAgent,
        p_dados_finais: dadosFinais,
      }
    );

    if (rpcError) {
      await registrarLog({
        supabase,
        acao: "WIZARD_MORADOR_FINALIZACAO_RPC_ERRO",
        condominio_id:
          preCadastro.condominio_id || convite.condominio_id,
        email: preCadastro.email,
        detalhes: {
          pre_cadastro_id: preCadastro.id,
          convite_id: convite.id,
          erro: rpcError.message,
        },
      });

      return jsonResponse(
        {
          success: false,
          error:
            "Não foi possível validar e concluir o cadastro.",
          detalhes: rpcError.message,
        },
        409
      );
    }

    if (!rpcConcluiuComSucesso(rpcData)) {
      const resultadoRpc: any = extrairResultadoRpc(rpcData);

      await registrarLog({
        supabase,
        acao: "WIZARD_MORADOR_FINALIZACAO_RECUSADA",
        condominio_id:
          preCadastro.condominio_id || convite.condominio_id,
        email: preCadastro.email,
        detalhes: {
          pre_cadastro_id: preCadastro.id,
          convite_id: convite.id,
          resultado_rpc: resultadoRpc,
        },
      });

      return jsonResponse(
        {
          success: false,
          error:
            "O cadastro possui pendências que impedem a finalização.",
          data: resultadoRpc,
        },
        422
      );
    }

    // Recarrega após a RPC porque ela altera o Pré-Cadastro.
    const { data: prePosRpc, error: prePosRpcError } = await supabase
      .from("pre_cadastro_moradores")
      .select("*")
      .eq("id", preCadastro.id)
      .single();

    if (prePosRpcError) throw prePosRpcError;

    const tokenAcompanhamento =
      prePosRpc.token_acompanhamento || gerarTokenSeguro();

    const tokenAcompanhamentoExpiraEm =
      prePosRpc.token_acompanhamento_expira_em ||
      adicionarDiasIso(agora, 7);

    const dadosComplementaresFinal = {
      ...(prePosRpc.dados_complementares || {}),
      wizard_final: dadosFinais,
      finalizacao: {
        ip,
        user_agent: userAgent,
        contexto,
        finalizado_em: agoraIso,
        origem: "wizard_morador_enviar_auditoria",
      },
    };

    // 2) Consolidação autoritativa do estado final do Wizard.
    // Auth continua NÃO criado.
    const { data: preAtualizado, error: updatePreError } =
      await supabase
        .from("pre_cadastro_moradores")
        .update({
          aceite_termos: true,
          aceite_lgpd: true,
          aceite_termos_em:
            prePosRpc.aceite_termos_em || agoraIso,
          aceite_ip: prePosRpc.aceite_ip || ip,
          aceite_user_agent:
            prePosRpc.aceite_user_agent || userAgent,

          status_cadastro: "AGUARDANDO_AUDITORIA",
          status_convite: "WIZARD_FINALIZADO",
          status_auditoria: "AGUARDANDO_AUDITORIA",
          status_acompanhamento: "fila_auditoria",

          etapa_atual: 8,
          percentual_preenchimento: 100,

          wizard_finalizado_em:
            prePosRpc.wizard_finalizado_em || agoraIso,
          enviado_auditoria_em:
            prePosRpc.enviado_auditoria_em || agoraIso,

          bloqueado_para_edicao: true,

          // A conta só será criada na aprovação.
          auth_ativo: false,
          status_conta: "PENDENTE_APROVACAO",

          // Token específico de acompanhamento.
          token_acompanhamento: tokenAcompanhamento,
          token_acompanhamento_expira_em:
            tokenAcompanhamentoExpiraEm,

          dados_complementares: dadosComplementaresFinal,

          atualizado_em: agoraIso,
        })
        .eq("id", preCadastro.id)
        .select("*")
        .single();

    if (updatePreError) throw updatePreError;

    // O token do convite pode ser considerado "utilizado" para escrita.
    // A Edge de carregar tratará o mesmo link como acesso READ-ONLY
    // à Tela 9 depois da conclusão.
    const { error: updateConviteError } = await supabase
      .from("convites_morador")
      .update({
        status_convite: "WIZARD_FINALIZADO",
        wizard_finalizado: true,
        wizard_finalizado_em: agoraIso,
        token_utilizado: true,
        token_utilizado_em: agoraIso,
        updated_at: agoraIso,
      })
      .eq("id", convite.id);

    if (updateConviteError) throw updateConviteError;

    // 3) Garante uma Auditoria única para este Pré-Cadastro.
    const { data: auditoriaExistente, error: auditoriaBuscaError } =
      await supabase
        .from("auditorias_morador")
        .select("id")
        .eq("pre_cadastro_id", preCadastro.id)
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (auditoriaBuscaError) throw auditoriaBuscaError;

    let auditoriaId = auditoriaExistente?.id || null;

    if (!auditoriaId) {
      const { data: auditoriaCriada, error: auditoriaInsertError } =
        await supabase
          .from("auditorias_morador")
          .insert({
            business_id:
              preCadastro.business_id || convite.business_id || null,
            condominio_id:
              preCadastro.condominio_id ||
              convite.condominio_id ||
              null,
            pre_cadastro_id: preCadastro.id,

            status_auditoria: "AGUARDANDO_AUDITORIA",
            tipo_auditoria: "cadastro_morador",
            origem_auditoria: "wizard_morador",

            percentual_preenchimento: 100,
            saude_cadastro:
              preAtualizado.saude_cadastro ||
              "aguardando_auditoria",

            aprovado_rapido: false,

            campos_criticos_pendentes:
              preAtualizado.pendencias_criticas || [],
            campos_nao_criticos_pendentes:
              preAtualizado.pendencias_informativas || [],

            divergencias:
              preAtualizado.divergencias || {},

            dados_antes:
              preAtualizado.dados_anteriores || {},

            dados_depois: preAtualizado,

            prioridade: "normal",
            solicitou_correcao: false,

            criado_em: agoraIso,
            atualizado_em: agoraIso,
          })
          .select("id")
          .single();

      if (auditoriaInsertError) throw auditoriaInsertError;

      auditoriaId = auditoriaCriada?.id || null;
    } else {
      const { error: auditoriaUpdateError } = await supabase
        .from("auditorias_morador")
        .update({
          status_auditoria: "AGUARDANDO_AUDITORIA",
          percentual_preenchimento: 100,
          dados_depois: preAtualizado,
          atualizado_em: agoraIso,
        })
        .eq("id", auditoriaId);

      if (auditoriaUpdateError) throw auditoriaUpdateError;
    }

    // 4) Notificação administrativa idempotente.
    if (criarNotificacao) {
      const { data: notificacaoExistente } = await supabase
        .from("notificacoes")
        .select("id")
        .eq("tipo", "morador_aguardando_auditoria")
        .eq(
          "condominio_id",
          preCadastro.condominio_id || convite.condominio_id
        )
        .contains("metadata", {
          pre_cadastro_id: preCadastro.id,
        })
        .maybeSingle();

      if (!notificacaoExistente?.id) {
        await supabase.from("notificacoes").insert({
          usuario_id: null,
          business_id:
            preCadastro.business_id || convite.business_id || null,
          condominio_id:
            preCadastro.condominio_id ||
            convite.condominio_id ||
            null,
          titulo: "Novo cadastro aguardando auditoria",
          mensagem: `${
            preCadastro.nome || "Morador"
          } finalizou o cadastro e aguarda auditoria.`,
          tipo: "morador_aguardando_auditoria",
          destino_tipo: "administrativo",
          modulo: "moradores",
          prioridade: "normal",
          lida: false,
          enviada_in_app: true,
          enviada_email: false,
          metadata: {
            pre_cadastro_id: preCadastro.id,
            convite_id: convite.id,
            auditoria_id: auditoriaId,
            nome: preCadastro.nome || null,
            email: preCadastro.email || null,
            torre: preCadastro.torre || null,
            unidade: preCadastro.unidade || null,
          },
        });
      }
    }

    await registrarLog({
      supabase,
      acao: "WIZARD_MORADOR_ENVIADO_AUDITORIA",
      condominio_id:
        preCadastro.condominio_id || convite.condominio_id,
      usuario_id: null,
      email: preCadastro.email,
      origem: "wizard_morador_enviar_auditoria",
      detalhes: {
        pre_cadastro_id: preCadastro.id,
        convite_id: convite.id,
        auditoria_id: auditoriaId,
        rpc_executada: true,
        percentual_preenchimento: 100,
        finalizado_em: agoraIso,
        auth_criado: false,
      },
    });

    return jsonResponse({
      success: true,
      data: {
        pre_cadastro: preAtualizado,
        auditoria_id: auditoriaId,
        rpc: rpcData || null,
        percentual_preenchimento: 100,
        status_cadastro: "AGUARDANDO_AUDITORIA",
        status_acompanhamento: "fila_auditoria",
        token_acompanhamento: tokenAcompanhamento,
        token_acompanhamento_expira_em:
          tokenAcompanhamentoExpiraEm,
        bloqueado_para_edicao: true,
        auth_ativo: false,
        auth_criado: false,
      },
    });
  } catch (err) {
    console.error("EDGE ERROR:", err);

    return jsonResponse(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Erro inesperado ao enviar cadastro para auditoria.",
      },
      500
    );
  }
});