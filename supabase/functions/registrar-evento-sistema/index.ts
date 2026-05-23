import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

function getIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    null
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Método não permitido." }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        { error: "Variáveis SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes." },
        500
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();

    const {
      tipo_evento,
      origem,
      origem_tipo,
      origem_id,
      modulo,

      titulo,
      mensagem,
      tipo,
      prioridade,
      icone,

      destino_tipo,
      usuario_id,

      condominio_id,
      business_id,
      acao_url,

      enviada_in_app,
      enviada_email,
      enviada_push,

      metadata,
    } = body;

    if (!titulo || !mensagem) {
      return jsonResponse(
        { error: "Título e mensagem são obrigatórios." },
        400
      );
    }

    if (!tipo_evento && !tipo) {
      return jsonResponse(
        { error: "tipo_evento ou tipo é obrigatório." },
        400
      );
    }

    const ipOrigem = getIp(req);
    const userAgent = req.headers.get("user-agent");

    const payloadNotificacao = {
      usuario_id: usuario_id || null,
      titulo,
      mensagem,
      tipo: tipo || tipo_evento || "sistema",
      lida: false,
      origem: origem || "sistema",
      business_id: business_id || null,
      condominio_id: condominio_id || null,
      prioridade: prioridade || "normal",
      icone: icone || null,
      acao_url: acao_url || null,
      modulo: modulo || null,
      destino_tipo: destino_tipo || null,
      ip_origem: ipOrigem,
      metadata: {
        ...(metadata || {}),
        tipo_evento: tipo_evento || tipo || "sistema",
        origem_tipo: origem_tipo || null,
        origem_id: origem_id || null,
        user_agent: userAgent || null,
        push_preparado: Boolean(enviada_push),
      },
      enviada_in_app: enviada_in_app ?? true,
      enviada_email: enviada_email ?? false,
      enviada_push: enviada_push ?? false,
      origem_id: origem_id || null,
      origem_tipo: origem_tipo || null,
      dispositivo_origem: userAgent || null,
    };

    const { data: notificacao, error: notificacaoError } = await supabaseAdmin
      .from("notificacoes")
      .insert(payloadNotificacao)
      .select("id")
      .single();

    if (notificacaoError) {
      throw notificacaoError;
    }

    const payloadLog = {
      acao: tipo_evento || tipo || "EVENTO_SISTEMA",
      condominio_id: condominio_id || null,
      usuario_id: usuario_id || null,
      email: metadata?.email_responsavel || metadata?.email || null,
      origem: origem || "sistema",
      detalhes: {
        titulo,
        mensagem,
        tipo: tipo || null,
        modulo: modulo || null,
        prioridade: prioridade || "normal",
        destino_tipo: destino_tipo || null,
        business_id: business_id || null,
        acao_url: acao_url || null,
        notificacao_id: notificacao?.id || null,
        origem_tipo: origem_tipo || null,
        origem_id: origem_id || null,
        ip_origem: ipOrigem,
        dispositivo_origem: userAgent,
        enviada_in_app: enviada_in_app ?? true,
        enviada_email: enviada_email ?? false,
        enviada_push: enviada_push ?? false,
        metadata: metadata || {},
      },
    };

    const { error: logError } = await supabaseAdmin
      .from("logs_sistema")
      .insert(payloadLog);

    if (logError) {
      console.error("Erro ao registrar log_sistema:", logError);
    }

    return jsonResponse({
      success: true,
      message: "Evento registrado com sucesso.",
      notificacao_id: notificacao?.id || null,
    });
  } catch (error) {
    console.error("Erro registrar-evento-sistema:", error);

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao registrar evento do sistema.",
      },
      500
    );
  }
});