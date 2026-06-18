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

    if (convite.token_revogado) {
      return jsonResponse(
        {
          success: false,
          error: "Convite revogado.",
        },
        400
      );
    }

    if (convite.token_expira_em && new Date(convite.token_expira_em) < new Date()) {
      return jsonResponse(
        {
          success: false,
          error: "Convite expirado.",
        },
        400
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

    const agora = new Date().toISOString();

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
      console.warn("RPC concluir_wizard_morador falhou. Aplicando fallback:", rpcError);
    }

    const { data: preAtualizado, error: updatePreError } = await supabase
      .from("pre_cadastro_moradores")
      .update({
        aceite_termos: true,
        aceite_lgpd: true,
        status_cadastro: "AGUARDANDO_AUDITORIA",
        status_convite: "WIZARD_FINALIZADO",
        status_auditoria: "AGUARDANDO_AUDITORIA",
        status_acompanhamento: "fila_auditoria",
        etapa_atual: 9,
        percentual_preenchimento: 100,
        wizard_finalizado_em: agora,
        enviado_auditoria_em: agora,
        dados_complementares: {
          ...(preCadastro.dados_complementares || {}),
          wizard_final: dadosFinais,
          finalizacao: {
            ip,
            user_agent: userAgent,
            finalizado_em: agora,
            origem: "wizard_morador_enviar_auditoria",
          },
        },
        atualizado_em: agora,
      })
      .eq("id", preCadastro.id)
      .select("*")
      .single();

    if (updatePreError) throw updatePreError;

    const { error: updateConviteError } = await supabase
      .from("convites_morador")
      .update({
        status_convite: "WIZARD_FINALIZADO",
        wizard_finalizado: true,
        wizard_finalizado_em: agora,
        token_utilizado: true,
        atualizado_em: agora,
      })
      .eq("id", convite.id);

    if (updateConviteError) throw updateConviteError;

    const { data: auditoriaExistente } = await supabase
      .from("auditorias_morador")
      .select("id")
      .eq("pre_cadastro_id", preCadastro.id)
      .maybeSingle();

    if (!auditoriaExistente?.id) {
      await supabase.from("auditorias_morador").insert({
        business_id: preCadastro.business_id || convite.business_id || null,
        condominio_id: preCadastro.condominio_id || convite.condominio_id || null,
        pre_cadastro_id: preCadastro.id,
        status_auditoria: "AGUARDANDO_AUDITORIA",
        origem: "wizard_morador",
        dados_auditoria: dadosFinais,
        criado_em: agora,
        atualizado_em: agora,
      });
    }
    
    if (criarNotificacao) {
      const { data: notificacaoExistente } = await supabase
        .from("notificacoes")
        .select("id")
        .eq("tipo", "morador_aguardando_auditoria")
        .eq("condominio_id", preCadastro.condominio_id || convite.condominio_id)
        .contains("metadata", {
          pre_cadastro_id: preCadastro.id,
        })
        .maybeSingle();

      if (!notificacaoExistente?.id) {
        await supabase.from("notificacoes").insert({
          usuario_id: null,
          business_id: preCadastro.business_id || convite.business_id || null,
          condominio_id: preCadastro.condominio_id || convite.condominio_id || null,
          titulo: "Novo cadastro aguardando auditoria",
          mensagem: `${preCadastro.nome || "Morador"} finalizou o cadastro e aguarda auditoria.`,
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
      condominio_id: preCadastro.condominio_id || convite.condominio_id,
      usuario_id: null,
      email: preCadastro.email,
      origem: "wizard_morador_enviar_auditoria",
      detalhes: {
        pre_cadastro_id: preCadastro.id,
        convite_id: convite.id,
        rpc_executada: !rpcError,
        rpc_erro: rpcError?.message || null,
        finalizado_em: agora,
      },
    });

    return jsonResponse({
      success: true,
      data: {
        pre_cadastro: preAtualizado,
        rpc: rpcData || null,
        fallback_aplicado: Boolean(rpcError),
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