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

    const {
      token,
      protocolo,
      pesquisa,
      contexto = {},
    } = body;

    if (!token) {
      return jsonResponse(
        {
          success: false,
          error: "Token é obrigatório.",
        },
        400
      );
    }

    if (!pesquisa || typeof pesquisa !== "object") {
      return jsonResponse(
        {
          success: false,
          error: "Dados da pesquisa inválidos.",
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
          error: "Variáveis Supabase não configuradas.",
        },
        500
      );
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey
    );

    const { data: preCadastro, error: preError } = await supabaseAdmin
      .from("pre_cadastro_moradores")
      .select("*")
      .eq("token_convite", token)
      .maybeSingle();

    if (preError) throw preError;

    if (!preCadastro) {
      return jsonResponse(
        {
          success: false,
          error: "Pré-cadastro não encontrado.",
        },
        404
      );
    }

    const ip = obterIp(req);
    const userAgent = req.headers.get("user-agent") || "";

    const payloadPesquisa = {
      pre_cadastro_id: preCadastro.id,
      condominio_id: preCadastro.condominio_id,
      business_id: preCadastro.business_id,
      protocolo: protocolo || preCadastro.protocolo,

      nota_nps: pesquisa.nota_nps ?? null,
      facilidade_preenchimento:
        pesquisa.facilidade_preenchimento ?? null,

      etapas_dificeis:
        Array.isArray(pesquisa.etapas_dificeis)
          ? pesquisa.etapas_dificeis
          : [],

      problemas_encontrados:
        Array.isArray(pesquisa.problemas_encontrados)
          ? pesquisa.problemas_encontrados
          : [],

      sugestao: pesquisa.sugestao ?? null,
      permite_contato: pesquisa.permite_contato ?? false,
      canal_contato: pesquisa.canal_contato ?? null,
      horario_preferencial:
        pesquisa.horario_preferencial ?? null,
    };

    const { data: pesquisaSalva, error: pesquisaError } =
      await supabaseAdmin
        .from("pesquisa_wizard_morador")
        .insert(payloadPesquisa)
        .select("*")
        .single();

    if (pesquisaError) throw pesquisaError;

    await supabaseAdmin
      .from("cadastro_status_timeline")
      .insert({
        pre_cadastro_id: preCadastro.id,
        condominio_id: preCadastro.condominio_id,
        business_id: preCadastro.business_id,
        protocolo: preCadastro.protocolo,
        status: "pesquisa_nps_enviada",
        descricao:
          "Pesquisa de experiência do wizard enviada pelo usuário.",
        ip,
        user_agent: userAgent,
        dados: {
          pesquisa: payloadPesquisa,
          contexto,
        },
        data_hora: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
      });

    return jsonResponse({
      success: true,
      message: "Pesquisa salva com sucesso.",
      data: pesquisaSalva,
    });
  } catch (error) {
    console.error(
      "Erro wizard-morador-salvar-pesquisa:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao salvar pesquisa.",
      },
      500
    );
  }
});