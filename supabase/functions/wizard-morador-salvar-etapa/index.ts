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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse(
        { success: false, code: "METODO_NAO_PERMITIDO", message: "Método não permitido." },
        405
      );
    }

    const body = await req.json();

    const token = body?.token;
    const etapa = Number(body?.etapa || 1);
    const dados = body?.dados || {};
    const avancar = body?.avancar === true;

    if (!token) {
      return jsonResponse(
        { success: false, code: "TOKEN_NAO_INFORMADO", message: "Token não informado." },
        400
      );
    }

    if (!etapa || etapa < 1 || etapa > 9) {
      return jsonResponse(
        { success: false, code: "ETAPA_INVALIDA", message: "Etapa inválida." },
        400
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        { success: false, code: "ENV_AUSENTE", message: "Variáveis Supabase ausentes." },
        500
      );
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
      console.error("Erro ao salvar etapa:", error);

      return jsonResponse(
        {
          success: false,
          code: "ERRO_SALVAR_ETAPA",
          message: error.message || "Erro ao salvar etapa.",
        },
        400
      );
    }

    if (etapa === 7) {
      const aceiteTermos = dados?.aceite_termos === true;
      const aceiteLgpd = dados?.aceite_lgpd === true;

      if (aceiteTermos && aceiteLgpd) {
        await supabase
          .from("pre_cadastro_moradores")
          .update({
            aceite_termos: true,
            aceite_lgpd: true,
            aceite_comunicacoes:
              dados?.aceite_comunicacoes === true ||
              dados?.aceite_comunicacao_operacional === true,
            versao_termos: dados?.versao_termos || null,
            aceito_em: dados?.aceito_em || new Date().toISOString(),
            atualizado_em: new Date().toISOString(),
          })
          .eq("token_convite", token);
      }
    }

    const proximaEtapa = avancar ? Math.min(etapa + 1, 9) : etapa;

    return jsonResponse({
      success: true,
      code: "ETAPA_SALVA",
      message: "Etapa salva com sucesso.",
      data: {
        etapa_atual: etapa,
        proxima_etapa: proximaEtapa,
        autosave: data?.[0] || null,
      },
    });
  } catch (error) {
    console.error("Erro wizard-morador-salvar-etapa:", error);

    return jsonResponse(
      {
        success: false,
        code: "ERRO_INTERNO",
        message: error instanceof Error ? error.message : "Erro inesperado.",
      },
      500
    );
  }
});