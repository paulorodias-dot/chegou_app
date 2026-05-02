import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

const onlyNumbers = (value = "") => value.replace(/\D/g, "");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Método não permitido." }),
        { status: 405, headers: jsonHeaders }
      );
    }

    const { cnpj } = await req.json();
    const cnpjLimpo = onlyNumbers(cnpj);

    if (cnpjLimpo.length !== 14) {
      return new Response(
        JSON.stringify({ error: "CNPJ inválido." }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const response = await fetch(
      `https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "Chegou-SaaS/1.0",
        },
      }
    );

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: "CNPJ não encontrado ou indisponível." }),
        { status: response.status, headers: jsonHeaders }
      );
    }

    const data = await response.json();

    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error?.message || "Erro interno ao consultar CNPJ.",
      }),
      { status: 500, headers: jsonHeaders }
    );
  }
});



