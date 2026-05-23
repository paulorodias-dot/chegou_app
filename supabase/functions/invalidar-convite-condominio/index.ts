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
      return jsonResponse({ error: "Método não permitido." }, 405);
    }

    const { convite_id } = await req.json();

    if (!convite_id) {
      return jsonResponse({ error: "convite_id é obrigatório." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Variáveis do Supabase ausentes." }, 500);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const agora = new Date().toISOString();

    const { data: convite, error: conviteError } = await supabaseAdmin
      .from("convites_condominio")
      .select("id, status")
      .eq("id", convite_id)
      .maybeSingle();

    if (conviteError) throw conviteError;

    if (!convite) {
      return jsonResponse({ error: "Convite não encontrado." }, 404);
    }

    const status = String(convite.status || "").trim().toLowerCase();

    if (!["pendente", "enviado"].includes(status)) {
      return jsonResponse(
        { error: `Convite não pode ser usado. Status atual: ${convite.status}` },
        409
      );
    }

    const { data, error } = await supabaseAdmin
      .from("convites_condominio")
      .update({
        status: "usado",
        aceito_em: agora,
        atualizado_em: agora,
      })
      .eq("id", convite_id)
      .select("id, status, aceito_em")
      .single();

    if (error) throw error;

    return jsonResponse({
      success: true,
      convite: data,
    });
  } catch (error) {
    console.error("Erro invalidar-convite-condominio:", error);

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao invalidar convite.",
      },
      500
    );
  }
});