import { createClient } from "npm:@supabase/supabase-js@2";

/* ============================================================
   SISTEMA CHEGOU!
   Edge Function: login-morador

   Login canônico do papel Morador.

   Entrada:
   - CPF OU email_login do papel Morador
   - senha

   Fluxo:
   identificador residencial
       ↓
   resolvedor interno service_role
       ↓
   usuario_id/Auth canônico
       ↓
   Supabase Auth valida senha
       ↓
   contexto residencial canônico
============================================================ */

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL");

const SUPABASE_ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY");

const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");


if (
  !SUPABASE_URL ||
  !SUPABASE_ANON_KEY ||
  !SUPABASE_SERVICE_ROLE_KEY
) {
  throw new Error(
    "Variáveis obrigatórias do Supabase não configuradas."
  );
}


/* ============================================================
   CORS
============================================================ */

const allowedOrigins = String(
  Deno.env.get("LOGIN_ALLOWED_ORIGINS") || ""
)
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);


function getCorsHeaders(req: Request) {
  const origin =
    req.headers.get("origin") || "";

  let allowOrigin = "*";

  if (allowedOrigins.length > 0) {
    allowOrigin =
      allowedOrigins.includes(origin)
        ? origin
        : "";
  } else if (origin) {
    allowOrigin = origin;
  }

  return {
    "Access-Control-Allow-Origin":
      allowOrigin,

    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",

    "Access-Control-Allow-Methods":
      "POST, OPTIONS",

    Vary: "Origin",
  };
}


/* ============================================================
   RESPOSTA JSON
============================================================ */

function jsonResponse(
  req: Request,
  body: unknown,
  status = 200
) {
  return new Response(
    JSON.stringify(body),
    {
      status,

      headers: {
        ...getCorsHeaders(req),

        "Content-Type":
          "application/json; charset=utf-8",

        "Cache-Control":
          "no-store",
      },
    }
  );
}


/* ============================================================
   ERRO GENÉRICO DE CREDENCIAL

   Não permite enumeração de contas.
============================================================ */

function respostaCredencialInvalida(
  req: Request
) {
  return jsonResponse(
    req,
    {
      success: false,

      error:
        "CPF/e-mail ou senha inválidos.",

      code:
        "CREDENTIALS_INVALID",
    },
    401
  );
}


/* ============================================================
   HANDLER
============================================================ */

Deno.serve(async (req: Request) => {

  const corsHeaders =
    getCorsHeaders(req);


  /* ----------------------------------------------------------
     PRE-FLIGHT
  ---------------------------------------------------------- */

  if (req.method === "OPTIONS") {
    return new Response(
      null,
      {
        status: 204,
        headers: corsHeaders,
      }
    );
  }


  /* ----------------------------------------------------------
     SOMENTE POST
  ---------------------------------------------------------- */

  if (req.method !== "POST") {
    return jsonResponse(
      req,
      {
        success: false,
        error: "Método não permitido.",
      },
      405
    );
  }


  /* ----------------------------------------------------------
     VALIDAÇÃO DE ORIGEM
  ---------------------------------------------------------- */

  const origin =
    req.headers.get("origin") || "";


  if (
    allowedOrigins.length > 0 &&
    origin &&
    !allowedOrigins.includes(origin)
  ) {
    return jsonResponse(
      req,
      {
        success: false,
        error: "Origem não autorizada.",
      },
      403
    );
  }


  try {

    /* ========================================================
       1. BODY
    ======================================================== */

    const body =
      await req.json().catch(
        () => null
      );


    const identificador =
      String(
        body?.identificador || ""
      ).trim();


    const senha =
      typeof body?.senha === "string"
        ? body.senha
        : "";


    if (
      !identificador ||
      !senha
    ) {
      return respostaCredencialInvalida(
        req
      );
    }


    /* ========================================================
       2. CLIENT ADMIN / SERVICE ROLE
    ======================================================== */

    const supabaseAdmin =
      createClient(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        }
      );


    /* ========================================================
       3. RESOLVER IDENTIDADE MORADOR

       CPF/email residencial
             ↓
       usuario_id canônico
    ======================================================== */

    const {
      data: resolucao,
      error: erroResolucao,
    } =
      await supabaseAdmin.rpc(
        "fn_auth_morador_resolver_identidade_v1",
        {
          p_identificador:
            identificador,
        }
      );


    if (
      erroResolucao ||
      resolucao?.success !== true ||
      !resolucao?.usuario_id
    ) {
      return respostaCredencialInvalida(
        req
      );
    }


    const usuarioId =
      String(
        resolucao.usuario_id
      );


    /* ========================================================
       4. LOCALIZAR AUTH CANÔNICO

       O e-mail técnico permanece exclusivamente
       dentro da Edge Function.
    ======================================================== */

    const {
      data: authAdminData,
      error: authAdminError,
    } =
      await supabaseAdmin.auth.admin
        .getUserById(usuarioId);


    const authUser =
      authAdminData?.user;


    if (
      authAdminError ||
      !authUser ||
      !authUser.email
    ) {
      return respostaCredencialInvalida(
        req
      );
    }


    const emailTecnico =
      authUser.email
        .toLowerCase()
        .trim();


    /* ========================================================
       5. VALIDAR SENHA NO SUPABASE AUTH

       A senha NÃO é comparada diretamente no banco.
    ======================================================== */

    const supabaseAuth =
      createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        }
      );


    const {
      data: loginData,
      error: loginError,
    } =
      await supabaseAuth.auth
        .signInWithPassword({
          email: emailTecnico,
          password: senha,
        });


    if (
      loginError ||
      !loginData?.session ||
      !loginData?.user
    ) {
      return respostaCredencialInvalida(
        req
      );
    }


    /* ========================================================
       6. DEFESA CONTRA RESOLUÇÃO CRUZADA
    ======================================================== */

    if (
      loginData.user.id !==
      usuarioId
    ) {
      return respostaCredencialInvalida(
        req
      );
    }


    const accessToken =
      loginData.session.access_token;

    const refreshToken =
      loginData.session.refresh_token;


    if (
      !accessToken ||
      !refreshToken
    ) {
      return respostaCredencialInvalida(
        req
      );
    }


    /* ========================================================
       7. CLIENT AUTENTICADO COMO USUÁRIO CANÔNICO
    ======================================================== */

    const supabaseMorador =
      createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
            },
          },

          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        }
      );


    /* ========================================================
       8. SELF-CONTEXT MORADOR
    ======================================================== */

    const {
      data: contextoData,
      error: contextoError,
    } =
      await supabaseMorador.rpc(
        "fn_auth_morador_contexto_v1"
      );


    if (
      contextoError ||
      contextoData?.success !== true
    ) {
      return respostaCredencialInvalida(
        req
      );
    }


    const contexto =
      contextoData?.contexto;


    if (!contexto) {

      return jsonResponse(
        req,
        {
          success: false,

          error:
            contextoData?.selecao_necessaria
              ? "Há mais de um contexto residencial disponível para esta conta."
              : "Contexto residencial não encontrado.",

          code:
            contextoData?.selecao_necessaria
              ? "RESIDENTIAL_CONTEXT_SELECTION_REQUIRED"
              : "RESIDENTIAL_CONTEXT_NOT_FOUND",
        },
        409
      );
    }


    /* ========================================================
       9. DADOS SEGUROS DA IDENTIDADE RAIZ

       NÃO retornar:
       - email raiz;
       - username raiz;
       - nivel raiz como nível efetivo;
       - permissao_global raiz.
    ======================================================== */

    const {
      data: usuarioSeguro,
      error: usuarioSeguroError,
    } =
      await supabaseAdmin
        .from("usuarios")
        .select(`
          id,
          business_id,
          nome,
          telefone,
          cpf,
          ativo,
          status_cadastro,
          primeiro_acesso
        `)
        .eq(
          "id",
          usuarioId
        )
        .single();


    if (
      usuarioSeguroError ||
      !usuarioSeguro ||
      usuarioSeguro.ativo !== true
    ) {
      return respostaCredencialInvalida(
        req
      );
    }


    /* ========================================================
       10. PERFIL CONTEXTUAL MORADOR
    ======================================================== */

    const perfil = {

      id:
        usuarioSeguro.id,

      business_id:
        usuarioSeguro.business_id,

      nome:
        usuarioSeguro.nome,

      telefone:
        usuarioSeguro.telefone,

      cpf:
        usuarioSeguro.cpf,

      ativo:
        usuarioSeguro.ativo,

      status_cadastro:
        usuarioSeguro.status_cadastro,

      primeiro_acesso:
        usuarioSeguro.primeiro_acesso,


      /* ------------------------------------------------------
         IDENTIDADE DO PAPEL MORADOR
      ------------------------------------------------------ */

      email:
        contexto.email_login || null,

      username:
        null,


      /* ------------------------------------------------------
         PAPEL
      ------------------------------------------------------ */

      nivel_id:
        Number(
          contexto.nivel_contextual
        ),

      nivel_contextual:
        Number(
          contexto.nivel_contextual
        ),

      papel:
        contexto.papel,

      tipo_vinculo:
        "morador",

      tipo_morador:
        contexto.tipo_morador || null,

      origem_login:
        "morador",


      /* ------------------------------------------------------
         CONTEXTO RESIDENCIAL
      ------------------------------------------------------ */

      pessoa_id:
        contexto.pessoa_id,

      condominio_id:
        contexto.condominio_id,

      unidade_id:
        contexto.unidade_id,

      usuario_condominio_vinculo_id:
        contexto.usuario_condominio_vinculo_id,

      morador_unidade_vinculo_id:
        contexto.morador_unidade_vinculo_id,

      principal:
        Boolean(
          contexto.principal
        ),


      /* ------------------------------------------------------
         GLOBALIDADE NUNCA VAZA PARA MORADOR
      ------------------------------------------------------ */

      permissao_global:
        false,

      permissao_global_contextual:
        false,
    };


    /* ========================================================
       11. RETORNO

       Não retornar:
       - loginData.user
       - emailTecnico
    ======================================================== */

    return jsonResponse(
      req,
      {
        success: true,

        session: {
          access_token:
            loginData.session.access_token,

          refresh_token:
            loginData.session.refresh_token,

          expires_in:
            loginData.session.expires_in,

          expires_at:
            loginData.session.expires_at,

          token_type:
            loginData.session.token_type,
        },

        perfil,
      },
      200
    );

  } catch (error) {

    /*
     * Não registrar:
     * - senha
     * - body completo
     */

    console.error(
      "[login-morador] erro interno:",
      error instanceof Error
        ? error.message
        : "erro desconhecido"
    );


    return jsonResponse(
      req,
      {
        success: false,

        error:
          "Não foi possível realizar o login neste momento.",

        code:
          "LOGIN_INTERNAL_ERROR",
      },
      500
    );
  }
});