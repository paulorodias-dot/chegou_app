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

function somenteNumeros(valor = "") {
  return String(valor).replace(/\D/g, "");
}

function gerarTokenSeguro() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function validarSenhaForte(senha = "") {
  return (
    senha.length >= 8 &&
    /[A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇ]/.test(senha) &&
    /\d/.test(senha) &&
    /[^A-Za-zÀ-ÿ0-9]/.test(senha)
  );
}

async function hashSenha(senha: string) {
  const encoder = new TextEncoder();
  const saltArray = new Uint8Array(16);
  crypto.getRandomValues(saltArray);

  const salt = Array.from(saltArray).map((b) => b.toString(16).padStart(2, "0")).join("");
  const iterations = 210000;

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(senha),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  const hash = Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `pbkdf2_sha256$${iterations}$${salt}$${hash}`;
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
      return jsonResponse({ success: false, error: "Método não permitido." }, 405);
    }

    const body = await req.json();

    const {
      token,
      senha,
      confirmar_senha,
      email_login = null,
      cpf_login = null,
      contexto = {},
    } = body;

    if (!token) {
      return jsonResponse({ success: false, error: "Token do convite é obrigatório." }, 400);
    }

    if (!senha || !confirmar_senha) {
      return jsonResponse({ success: false, error: "Senha e confirmação são obrigatórias." }, 400);
    }

    if (senha !== confirmar_senha) {
      return jsonResponse({ success: false, error: "As senhas não conferem." }, 400);
    }

    if (!validarSenhaForte(senha)) {
      return jsonResponse({
        success: false,
        error: "A senha deve ter no mínimo 8 caracteres, uma letra maiúscula, um número e um caractere especial.",
      }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ success: false, error: "Variáveis Supabase ausentes." }, 500);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: tokenData, error: tokenError } = await supabaseAdmin.rpc(
      "validar_token_convite_morador",
      {
        p_token: token,
      }
    );

    if (tokenError) throw tokenError;

    const tokenInfo = tokenData?.[0];

    if (!tokenInfo?.valido || !tokenInfo?.pre_cadastro_id) {
      return jsonResponse(
        {
          success: false,
          error: "Convite não encontrado ou inválido.",
          detalhes: tokenInfo || null,
        },
        401
      );
    }

    const { data: preCadastro, error: buscaError } = await supabaseAdmin
      .from("pre_cadastro_moradores")
      .select("*")
      .eq("id", tokenInfo.pre_cadastro_id)
      .maybeSingle();

    if (buscaError) throw buscaError;

    if (!preCadastro) {
      return jsonResponse(
        { success: false, error: "Pré-cadastro não encontrado." },
        404
      );
    }

    if (preCadastro.token_expira_em && new Date(preCadastro.token_expira_em) < new Date()) {
      return jsonResponse({ success: false, error: "Token do convite expirado." }, 410);
    }

    const senhaHash = await hashSenha(senha);
    const tokenAcompanhamento = preCadastro.token_acompanhamento || gerarTokenSeguro();

    const ip = obterIp(req);
    const userAgent = req.headers.get("user-agent") || "";

    const { error: updateError } = await supabaseAdmin
      .from("pre_cadastro_moradores")
      .update({
        senha_hash: senhaHash,
        senha_preparada: true,
        senha_definida: true,
        status_conta: "PENDENTE_APROVACAO",
        auth_ativo: false,
        token_acompanhamento: tokenAcompanhamento,
        status_acompanhamento: preCadastro.status_acompanhamento || "fila_auditoria",
        ip_ultimo_acesso: ip,
        dispositivo_ultimo_acesso: userAgent,
        navegador_ultimo_acesso: contexto?.navegador || preCadastro.navegador_ultimo_acesso,
        sistema_operacional: contexto?.sistema_operacional || preCadastro.sistema_operacional,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", preCadastro.id);

    if (updateError) throw updateError;

    try {
      await supabaseAdmin.from("cadastro_status_timeline").insert({
        pre_cadastro_id: preCadastro.id,
        condominio_id: preCadastro.condominio_id,
        business_id: preCadastro.business_id,
        protocolo: preCadastro.protocolo,
        status: "senha_preparada",
        descricao: "Senha preparada com segurança. Conta pendente de aprovação administrativa.",
        ip,
        user_agent: userAgent,
        dados: {
          email_login,
          cpf_login: somenteNumeros(cpf_login),
          contexto,
        },
        data_hora: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
      });
    } catch (logError) {
      console.error("Erro ao registrar timeline senha:", logError);
    }

    return jsonResponse({
      success: true,
      message: "Senha preparada com segurança.",
      data: {
        pre_cadastro_id: preCadastro.id,
        status_conta: "PENDENTE_APROVACAO",
        auth_ativo: false,
        senha_preparada: true,
        token_acompanhamento: tokenAcompanhamento,
      },
    });
  } catch (error) {
    console.error("Erro wizard-morador-preparar-senha:", error);

    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : "Erro inesperado ao preparar senha.",
    }, 500);
  }
});