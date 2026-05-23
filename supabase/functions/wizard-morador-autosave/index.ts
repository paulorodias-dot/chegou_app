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
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "METODO_NAO_PERMITIDO" }, 405);
    }

    const body = await req.json();

    const token = body?.token;
    const etapa = Number(body?.etapa || 1);
    const dados = body?.dados || {};
    const sessaoId = body?.sessao_id || null;
    const progresso = Number(body?.progresso || 0);
    const acao = body?.acao || "AUTOSAVE";

    if (!token) {
      return jsonResponse({ success: false, error: "TOKEN_NAO_INFORMADO" }, 400);
    }

    if (!etapa || etapa < 1 || etapa > 8) {
      return jsonResponse({ success: false, error: "ETAPA_INVALIDA" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ success: false, error: "ENV_SUPABASE_AUSENTE" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      null;

    const userAgent = req.headers.get("user-agent") || null;

    const { data, error } = await supabase.rpc("autosave_wizard_morador", {
      p_token: token,
      p_etapa: etapa,
      p_dados: dados,
      p_ip: ip,
      p_user_agent: userAgent,
    });

    if (error) {
      console.error("Erro autosave_wizard_morador:", error);
      return jsonResponse({
        success: false,
        error: "ERRO_AUTOSAVE",
        detalhes: error.message,
      }, 400);
    }

    if (sessaoId) {
      const { error: sessaoError } = await supabase.rpc("atualizar_progresso_wizard", {
        p_sessao_id: sessaoId,
        p_etapa: etapa,
        p_progresso: progresso,
        p_acao: acao,
      });

      if (sessaoError) {
        console.warn("Erro ao atualizar sessão wizard:", sessaoError);
      }
    }

    return jsonResponse({
      success: true,
      autosave: data?.[0] || null,
    });
  } catch (error) {
    console.error("Erro wizard-morador-autosave:", error);

    return jsonResponse({
      success: false,
      error: "ERRO_INTERNO",
      detalhes: error instanceof Error ? error.message : "Erro inesperado.",
    }, 500);
  }
});