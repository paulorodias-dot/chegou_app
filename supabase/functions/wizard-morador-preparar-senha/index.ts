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

function validarCpfBasico(cpf = "") {
  return somenteNumeros(cpf).length === 11;
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

  const salt = Array.from(saltArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

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

async function obterChaveCriptografia() {
  const secret = Deno.env.get("CHEGOU_AUTH_PASSWORD_SECRET");

  if (!secret || secret.length < 32) {
    throw new Error("CHEGOU_AUTH_PASSWORD_SECRET ausente ou inválida.");
  }

  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(secret));

  return crypto.subtle.importKey(
    "raw",
    hash,
    "AES-GCM",
    false,
    ["encrypt"]
  );
}

function bytesParaBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

async function criptografarSenhaAuth(senha: string) {
  const encoder = new TextEncoder();
  const chave = await obterChaveCriptografia();

  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    chave,
    encoder.encode(senha)
  );

  return [
    "v1",
    bytesParaBase64(iv),
    bytesParaBase64(new Uint8Array(encrypted)),
  ].join("$");
}

function obterIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    null
  );
}

function cpfCanonicoDoPreCadastro(preCadastro: Record<string, any>) {
  return somenteNumeros(
    preCadastro?.documento_cpf_cnpj ||
      preCadastro?.cpf ||
      preCadastro?.dados_complementares?.cpf ||
      ""
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
      return jsonResponse(
        {
          success: false,
          error:
            "A senha deve ter no mínimo 8 caracteres, uma letra maiúscula, um número e um caractere especial.",
        },
        400
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ success: false, error: "Variáveis Supabase ausentes." }, 500);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: tokenData, error: tokenError } = await supabaseAdmin.rpc(
      "validar_token_convite_morador",
      { p_token: token }
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
      return jsonResponse({ success: false, error: "Pré-cadastro não encontrado." }, 404);
    }

    if (preCadastro.bloqueado_para_edicao === true) {
      return jsonResponse(
        {
          success: false,
          error: "Cadastro já finalizado. A senha não pode ser alterada por este fluxo.",
        },
        409
      );
    }

    if (
      preCadastro.token_expira_em &&
      new Date(preCadastro.token_expira_em) < new Date()
    ) {
      return jsonResponse({ success: false, error: "Token do convite expirado." }, 410);
    }

    const cpfInformado = somenteNumeros(cpf_login);
    const cpfCanonico = cpfCanonicoDoPreCadastro(preCadastro);

    if (!validarCpfBasico(cpfInformado || cpfCanonico)) {
      return jsonResponse(
        {
          success: false,
          error: "CPF do responsável é obrigatório para preparar a credencial de acesso.",
        },
        400
      );
    }

    if (cpfInformado && cpfCanonico && cpfInformado !== cpfCanonico) {
      return jsonResponse(
        {
          success: false,
          error: "O CPF informado para acesso não corresponde ao CPF do pré-cadastro.",
        },
        409
      );
    }

    if (
      email_login &&
      preCadastro.email &&
      String(email_login).trim().toLowerCase() !==
        String(preCadastro.email).trim().toLowerCase()
    ) {
      return jsonResponse(
        {
          success: false,
          error: "O e-mail informado para acesso não corresponde ao e-mail do pré-cadastro.",
        },
        409
      );
    }

    const senhaHash = await hashSenha(senha);
    const senhaAuthCriptografada = await criptografarSenhaAuth(senha);

    const ip = obterIp(req);
    const userAgent = req.headers.get("user-agent") || "";

    const dadosComplementaresAtualizados = {
      ...(preCadastro.dados_complementares || {}),
      cpf: cpfCanonico || cpfInformado,
      senha_preparada: true,
      senha_definida: true,
    };

    /*
      NÃO alterar status_acompanhamento aqui.

      Antes da finalização da Tela 7 ele deve permanecer NULL.
      A constraint atual só aceita estados pós-finalização:
      fila_auditoria, auditoria_iniciada, em_analise,
      aprovado, recusado, conta_ativa.
    */
    const { error: updateError } = await supabaseAdmin
      .from("pre_cadastro_moradores")
      .update({
        cpf: preCadastro.cpf || cpfCanonico || cpfInformado,
        documento_cpf_cnpj:
          preCadastro.documento_cpf_cnpj || cpfCanonico || cpfInformado,

        senha_hash: senhaHash,
        senha_auth_criptografada: senhaAuthCriptografada,
        senha_preparada: true,
        senha_definida: true,

        status_conta: "PENDENTE_APROVACAO",
        auth_ativo: false,

        dados_complementares: dadosComplementaresAtualizados,

        ip_ultimo_acesso: ip,
        dispositivo_ultimo_acesso: userAgent,
        navegador_ultimo_acesso:
          contexto?.navegador || preCadastro.navegador_ultimo_acesso,
        sistema_operacional:
          contexto?.sistema_operacional || preCadastro.sistema_operacional,

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
        descricao:
          "Senha preparada com segurança. Conta ainda não criada e pendente de aprovação administrativa.",
        ip,
        user_agent: userAgent,
        dados: {
          email_login: email_login || preCadastro.email || null,
          cpf_login: cpfCanonico || cpfInformado,
          contexto,
          auth_criado: false,
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
        auth_criado: false,
        senha_preparada: true,
        senha_definida: true,
        status_acompanhamento: preCadastro.status_acompanhamento || null,
      },
    });
  } catch (error) {
    console.error("Erro wizard-morador-preparar-senha:", error);

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao preparar senha.",
      },
      500
    );
  }
});