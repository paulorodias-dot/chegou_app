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
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ======================================================
    // BODY
    // ======================================================

    const body = await req.json();

    const token = body?.token;

    if (!token) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "TOKEN_NAO_INFORMADO",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // ======================================================
    // SUPABASE
    // ======================================================

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ======================================================
    // VALIDAR TOKEN
    // ======================================================

    const { data: tokenData, error: tokenError } = await supabase.rpc(
      "validar_token_convite_morador",
      {
        p_token: token,
      }
    );

    if (tokenError) {
      console.error(tokenError);

      return new Response(
        JSON.stringify({
          success: false,
          error: "ERRO_VALIDACAO_TOKEN",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const tokenInfo = tokenData?.[0];

    if (!tokenInfo?.valido) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "TOKEN_INVALIDO",
          detalhes: tokenInfo,
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // ======================================================
    // BUSCAR PRÉ-CADASTRO
    // ======================================================

    const { data: preCadastro, error: preCadastroError } = await supabase
      .from("pre_cadastro_moradores")
      .select("*")
      .eq("id", tokenInfo.pre_cadastro_id)
      .single();

    if (preCadastroError || !preCadastro) {
      console.error(preCadastroError);

      return new Response(
        JSON.stringify({
          success: false,
          error: "PRE_CADASTRO_NAO_ENCONTRADO",
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // ======================================================
    // CONDOMÍNIO
    // ======================================================

    const { data: condominio } = await supabase
      .from("condominios")
      .select("*")
      .eq("id", preCadastro.condominio_id)
      .single();

    // ======================================================
    // TORRES
    // ======================================================

    const { data: torres } = await supabase
      .from("torres")
      .select("*")
      .eq("condominio_id", preCadastro.condominio_id)
      .order("nome", { ascending: true });

    // ======================================================
    // UNIDADES
    // ======================================================

    const { data: unidades } = await supabase
      .from("unidades")
      .select("*")
      .eq("condominio_id", preCadastro.condominio_id)
      .order("numero", { ascending: true });

    // ======================================================
    // CRIAR / RECUPERAR SESSÃO
    // ======================================================

    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("cf-connecting-ip") ||
      null;

    const userAgent = req.headers.get("user-agent") || null;

    const { data: sessaoData, error: sessaoError } = await supabase.rpc(
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

    // ======================================================
    // MARCAR CONVITE ABERTO
    // ======================================================

    await supabase.rpc("marcar_convite_aberto", {
      p_token: token,
      p_ip: ip,
      p_user_agent: userAgent,
      p_dispositivo: userAgent,
      p_sistema: userAgent,
    });

    // ======================================================
    // RESPONSE
    // ======================================================

    return new Response(
      JSON.stringify({
        success: true,

        token: {
          valido: true,
          expiracao: preCadastro.token_expira_em,
        },

        sessao: sessaoData?.[0] || null,

        preCadastro,

        condominio,

        torres: torres || [],

        unidades: unidades || [],
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error(error);

    return new Response(
      JSON.stringify({
        success: false,
        error: "ERRO_INTERNO",
        detalhes: error?.message || null,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});