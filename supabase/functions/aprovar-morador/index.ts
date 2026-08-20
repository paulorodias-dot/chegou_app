import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Sistema Chegou!
 * Edge Function: aprovar-morador
 *
 * Orquestrador oficial da Saga R4 da Migration 011.
 *
 * Regras principais:
 * - autoridade administrativa sempre derivada do backend;
 * - Snapshot é imutável após congelamento;
 * - Auth só é criado após aprovação;
 * - retries reutilizam correlation/idempotency keys determinísticas;
 * - EM_PROMOCAO retoma depois do Core sem repetir o Core;
 * - PROMOVIDO apenas garante encerramento idempotente;
 * - a Edge não cria Pessoa/Usuário/Unidade/Vínculos/Multivalorados manualmente.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type JsonObject = Record<string, any>;

type SupabaseClientLike =
  ReturnType<typeof createClient>;

function jsonResponse(
  body: JsonObject,
  status = 200
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type":
          "application/json",
      },
    }
  );
}

function texto(valor: unknown) {
  return String(
    valor ?? ""
  ).trim();
}

function emailNormalizado(
  valor: unknown
) {
  return texto(
    valor
  ).toLowerCase();
}

function somenteNumeros(
  valor: unknown
) {
  return texto(
    valor
  ).replace(
    /\D/g,
    ""
  );
}

function obterIp(req: Request) {
  return (
    req.headers
      .get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim() ||
    req.headers.get(
      "cf-connecting-ip"
    ) ||
    req.headers.get(
      "x-real-ip"
    ) ||
    null
  );
}

function detectarSistemaOperacional(
  userAgent = ""
) {
  const ua =
    userAgent.toLowerCase();

  if (
    ua.includes("windows")
  ) {
    return "Windows";
  }

  if (
    ua.includes("android")
  ) {
    return "Android";
  }

  if (
    ua.includes("iphone") ||
    ua.includes("ipad")
  ) {
    return "iOS";
  }

  if (
    ua.includes("mac os") ||
    ua.includes("macintosh")
  ) {
    return "macOS";
  }

  if (
    ua.includes("linux")
  ) {
    return "Linux";
  }

  return "Não identificado";
}

function detectarNavegador(
  userAgent = ""
) {
  const ua =
    userAgent.toLowerCase();

  if (
    ua.includes("edg/")
  ) {
    return "Microsoft Edge";
  }

  if (
    ua.includes("chrome/") &&
    !ua.includes("edg/")
  ) {
    return "Google Chrome";
  }

  if (
    ua.includes("firefox/")
  ) {
    return "Mozilla Firefox";
  }

  if (
    ua.includes("safari/") &&
    !ua.includes("chrome/")
  ) {
    return "Safari";
  }

  return "Não identificado";
}

async function uuidDeterministico(
  seed: string
) {
  const bytes =
    new TextEncoder().encode(
      seed
    );

  const digest =
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        bytes
      )
    );

  const uuidBytes =
    digest.slice(0, 16);

  uuidBytes[6] =
    (
      uuidBytes[6] &
      0x0f
    ) |
    0x50;

  uuidBytes[8] =
    (
      uuidBytes[8] &
      0x3f
    ) |
    0x80;

  const hex =
    Array.from(
      uuidBytes
    )
      .map(
        (byte) =>
          byte
            .toString(16)
            .padStart(
              2,
              "0"
            )
      )
      .join("");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

async function obterChaveDescriptografia() {
  const secret =
    Deno.env.get(
      "CHEGOU_AUTH_PASSWORD_SECRET"
    );

  if (
    !secret ||
    secret.length < 32
  ) {
    throw new Error(
      "CHEGOU_AUTH_PASSWORD_SECRET ausente ou inválida."
    );
  }

  const hash =
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(
        secret
      )
    );

  return crypto.subtle.importKey(
    "raw",
    hash,
    "AES-GCM",
    false,
    ["decrypt"]
  );
}

function base64ParaBytes(
  base64: string
) {
  const binario =
    atob(base64);

  return Uint8Array.from(
    binario,
    (char) =>
      char.charCodeAt(0)
  );
}

async function descriptografarSenhaAuth(
  valor: string
) {
  const partes =
    String(
      valor || ""
    ).split("$");

  if (
    partes.length !== 3 ||
    partes[0] !== "v1"
  ) {
    throw new Error(
      "Formato da senha temporária inválido."
    );
  }

  const [
    ,
    ivBase64,
    encryptedBase64,
  ] = partes;

  const chave =
    await obterChaveDescriptografia();

  const decrypted =
    await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv:
          base64ParaBytes(
            ivBase64
          ),
      },
      chave,
      base64ParaBytes(
        encryptedBase64
      )
    );

  return new TextDecoder().decode(
    decrypted
  );
}

function extrairPrimeiro<T = any>(
  data:
    | T
    | T[]
    | null
    | undefined
): T | null {
  if (
    Array.isArray(data)
  ) {
    return (
      data[0] ??
      null
    );
  }

  return data ?? null;
}

async function rpcObrigatoria({
  supabaseAdmin,
  nome,
  parametros,
}: {
  supabaseAdmin:
    SupabaseClientLike;
  nome: string;
  parametros: JsonObject;
}) {
  const {
    data,
    error,
  } =
    await supabaseAdmin.rpc(
      nome,
      parametros
    );

  if (error) {
    console.error(
      `[aprovar-morador] RPC ${nome}:`,
      error
    );

    throw new Error(
      `${nome}: ${error.message}`
    );
  }

  return data;
}

async function localizarOperacaoSaga({
  supabaseAdmin,
  snapshotId,
  correlationId,
  operacaoTipo,
  idempotencyKey,
}: {
  supabaseAdmin:
    SupabaseClientLike;
  snapshotId: string;
  correlationId: string;
  operacaoTipo: string;
  idempotencyKey?:
    | string
    | null;
}) {
  let consulta =
    supabaseAdmin
      .from(
        "auditorias_morador_operacoes"
      )
      .select(
        `
        id,
        operacao_tipo,
        status,
        snapshot_id,
        correlation_id,
        idempotency_key,
        parent_operation_id,
        causation_id,
        auth_user_id,
        pessoa_id,
        usuario_id,
        usuario_condominio_vinculo_id,
        morador_unidade_vinculo_id,
        usuario_unidade_id,
        resultado,
        preparada_em,
        recebida_em
      `
      )
      .eq(
        "snapshot_id",
        snapshotId
      )
      .eq(
        "correlation_id",
        correlationId
      )
      .eq(
        "operacao_tipo",
        operacaoTipo
      );

  if (
    idempotencyKey
  ) {
    consulta =
      consulta.eq(
        "idempotency_key",
        idempotencyKey
      );
  }

  const {
    data,
    error,
  } =
    await consulta
      .order(
        "preparada_em",
        {
          ascending:
            false,
          nullsFirst:
            false,
        }
      )
      .order(
        "recebida_em",
        {
          ascending:
            false,
          nullsFirst:
            false,
        }
      )
      .limit(1)
      .maybeSingle();

  if (error) {
    throw new Error(
      `Erro ao localizar operação ${operacaoTipo}: ${error.message}`
    );
  }

  return (
    data as
      | JsonObject
      | null
  );
}

async function localizarAuthPorEmail({
  supabaseAdmin,
  email,
}: {
  supabaseAdmin:
    SupabaseClientLike;
  email: string;
}) {
  const alvo =
    emailNormalizado(
      email
    );

  if (!alvo) {
    return null;
  }

  const perPage = 200;

  for (
    let page = 1;
    page <= 50;
    page += 1
  ) {
    const {
      data,
      error,
    } =
      await supabaseAdmin
        .auth
        .admin
        .listUsers({
          page,
          perPage,
        });

    if (error) {
      throw new Error(
        `Erro ao consultar Auth: ${error.message}`
      );
    }

    const users =
      data?.users ||
      [];

    const encontrado =
      users.find(
        (user) =>
          emailNormalizado(
            user.email
          ) ===
          alvo
      );

    if (encontrado) {
      return encontrado;
    }

    if (
      users.length <
      perPage
    ) {
      break;
    }
  }

  return null;
}

async function obterAuthPorId({
  supabaseAdmin,
  authUserId,
}: {
  supabaseAdmin:
    SupabaseClientLike;
  authUserId: string;
}) {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .auth
      .admin
      .getUserById(
        authUserId
      );

  if (error) {
    return null;
  }

  return (
    data?.user ||
    null
  );
}

async function registrarLog({
  supabaseAdmin,
  acao,
  condominioId,
  usuarioId,
  email,
  origem,
  detalhes,
}: {
  supabaseAdmin:
    SupabaseClientLike;
  acao: string;
  condominioId?:
    | string
    | null;
  usuarioId?:
    | string
    | null;
  email?:
    | string
    | null;
  origem?:
    | string
    | null;
  detalhes?: JsonObject;
}) {
  try {
    const {
      error,
    } =
      await supabaseAdmin
        .from(
          "logs_sistema"
        )
        .insert({
          acao,
          condominio_id:
            condominioId ||
            null,
          usuario_id:
            usuarioId ||
            null,
          email:
            email ||
            null,
          origem:
            origem ||
            "aprovar-morador",
          detalhes:
            detalhes ||
            {},
        });

    if (error) {
      console.error(
        `[aprovar-morador] log ${acao}:`,
        error
      );
    }
  } catch (error) {
    console.error(
      `[aprovar-morador] log ${acao}:`,
      error
    );
  }
}

function montarHtmlBoasVindas({
  nome,
  nomeCondominio,
  empresaEndereco,
  loginUrl,
  authReutilizado,
}: {
  nome: string;
  nomeCondominio: string;
  empresaEndereco: string;
  loginUrl: string;
  authReutilizado: boolean;
}) {
  const textoAcesso =
    authReutilizado
      ? `
        Sua identidade de acesso ao Sistema Chegou! já existia.
        O novo perfil de Morador foi vinculado à sua conta.
        Utilize suas credenciais de acesso já existentes.
      `
      : `
        Seu acesso já está liberado.
        Utilize o e-mail cadastrado e a senha definida no Wizard.
      `;

  return `
<div style="background:#f4f7fb;padding:20px;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <div style="max-width:540px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 12px 30px rgba(15,23,42,0.08)">

    <div style="background:#174ea6;padding:22px;text-align:center">
      <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800">
        Chegou<span style="color:#ff7900">!</span>
      </h1>

      <p style="margin:6px 0 0;color:#eaf2ff;font-size:13px">
        Gestão Inteligente de Encomendas
      </p>
    </div>

    <div style="padding:24px;color:#0f172a;font-size:15px;line-height:1.55">

      <p style="margin:0 0 14px">
        Olá <strong>${nome}</strong>,
      </p>

      <p style="margin:0 0 14px">
        Seu cadastro no condomínio
        <strong>${nomeCondominio}</strong>
        foi aprovado com sucesso.
      </p>

      <p style="margin:0 0 16px">
        Seu perfil de Morador está disponível no Sistema Chegou<span style="color:#ff7900">!</span>.
      </p>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;margin:18px 0;color:#334155">
        <p style="margin:0;font-size:13px">
          ${textoAcesso}
        </p>
      </div>

      <div style="text-align:center;margin:24px 0 18px">
        <a
          href="${loginUrl}"
          style="display:inline-block;background:#ff7900;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:700;font-size:15px"
        >
          Acessar o Sistema Chegou!
        </a>
      </div>

      <p style="font-size:12px;color:#64748b;margin:0 0 18px">
        Caso o botão não funcione, copie e cole este endereço no navegador:<br>
        <span style="color:#174ea6;word-break:break-all">${loginUrl}</span>
      </p>

      <p style="margin:20px 0 0">
        <strong>Equipe Chegou<span style="color:#ff7900">!</span></strong>
      </p>
    </div>

    <div style="background:#f8fafc;padding:16px;text-align:center;font-size:11px;color:#64748b;border-top:1px solid #e5e7eb">
      <p style="margin:0">
        Este é um e-mail automático.
      </p>

      <p style="margin:6px 0">
        ${empresaEndereco}
      </p>

      <p style="margin:6px 0">
        © 2026 Chegou<span style="color:#ff7900">!</span>
      </p>
    </div>

  </div>
</div>
`;
}

async function enviarEmailAprovacao({
  supabaseAdmin,
  nome,
  email,
  nomeCondominio,
  condominioId,
  preCadastroId,
  auditoriaId,
  usuarioId,
  correlationId,
  loginUrl,
  authReutilizado,
  contextoRequisicao,
}: {
  supabaseAdmin:
    SupabaseClientLike;
  nome: string;
  email: string;
  nomeCondominio: string;
  condominioId: string;
  preCadastroId: string;
  auditoriaId: string;
  usuarioId: string;
  correlationId: string;
  loginUrl: string;
  authReutilizado: boolean;
  contextoRequisicao:
    JsonObject;
}) {
  const brevoApiKey =
    Deno.env.get(
      "BREVO_API_KEY"
    );

  const remetenteEmail =
    Deno.env.get(
      "BREVO_SENDER_EMAIL"
    ) ||
    "noreply@sistemachegou.com.br";

  const remetenteNome =
    Deno.env.get(
      "BREVO_SENDER_NAME"
    ) ||
    "Sistema Chegou!";

  const empresaEndereco =
    Deno.env.get(
      "EMPRESA_ENDERECO"
    ) ||
    "[Endereço físico da empresa — definir no módulo institucional]";

  if (!brevoApiKey) {
    return {
      status:
        "nao_enviado",
      messageId:
        null,
      error:
        "BREVO_API_KEY não configurada.",
    };
  }

  try {
    const htmlContent =
      montarHtmlBoasVindas({
        nome,
        nomeCondominio,
        empresaEndereco,
        loginUrl,
        authReutilizado,
      });

    const response =
      await fetch(
        "https://api.brevo.com/v3/smtp/email",
        {
          method: "POST",

          headers: {
            "api-key":
              brevoApiKey,
            "Content-Type":
              "application/json",
            Accept:
              "application/json",
          },

          body:
            JSON.stringify({
              sender: {
                name:
                  remetenteNome,
                email:
                  remetenteEmail,
              },

              to: [
                {
                  email,
                  name:
                    nome,
                },
              ],

              subject:
                "Cadastro aprovado no Chegou!",

              htmlContent,
            }),
        }
      );

    const result =
      await response
        .json()
        .catch(
          () => ({})
        );

    if (!response.ok) {
      const mensagem =
        result?.message ||
        result?.error ||
        "Erro ao enviar e-mail pelo Brevo.";

      await registrarLog({
        supabaseAdmin,

        acao:
          "EMAIL_APROVACAO_MORADOR_ERRO",

        condominioId,
        usuarioId,
        email,

        origem:
          "brevo",

        detalhes: {
          tipo_email:
            "aprovacao_morador",

          erro:
            mensagem,

          pre_cadastro_id:
            preCadastroId,

          auditoria_id:
            auditoriaId,

          correlation_id:
            correlationId,

          auth_reutilizado:
            authReutilizado,

          ...contextoRequisicao,
        },
      });

      return {
        status:
          "erro",
        messageId:
          null,
        error:
          mensagem,
      };
    }

    const messageId =
      result?.messageId ||
      null;

    await registrarLog({
      supabaseAdmin,

      acao:
        "EMAIL_APROVACAO_MORADOR_ENVIADO",

      condominioId,
      usuarioId,
      email,

      origem:
        "brevo",

      detalhes: {
        tipo_email:
          "aprovacao_morador",

        brevo_message_id:
          messageId,

        remetente_email:
          remetenteEmail,

        remetente_nome:
          remetenteNome,

        login_url:
          loginUrl,

        pre_cadastro_id:
          preCadastroId,

        auditoria_id:
          auditoriaId,

        correlation_id:
          correlationId,

        auth_reutilizado:
          authReutilizado,

        ...contextoRequisicao,
      },
    });

    return {
      status:
        "enviado",
      messageId,
      error:
        null,
    };
  } catch (error) {
    const mensagem =
      error instanceof Error
        ? error.message
        : "Erro inesperado no envio.";

    return {
      status:
        "erro",
      messageId:
        null,
      error:
        mensagem,
    };
  }
}

serve(async (req) => {
  if (
    req.method ===
    "OPTIONS"
  ) {
    return new Response(
      "ok",
      {
        headers:
          corsHeaders,
      }
    );
  }

  let authCriadoNestaExecucao:
    string | null =
    null;

  let coreConcluido =
    false;

  let sagaSnapshotId:
    string | null =
    null;

  let sagaCorrelationId:
    string | null =
    null;

  let supabaseAdmin:
    SupabaseClientLike |
    null =
    null;

  try {
    if (
      req.method !==
      "POST"
    ) {
      return jsonResponse(
        {
          error:
            "Método não permitido.",
        },
        405
      );
    }

    const supabaseUrl =
      Deno.env.get(
        "SUPABASE_URL"
      );

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY"
      );

    const anonKey =
      Deno.env.get(
        "SUPABASE_ANON_KEY"
      );

    if (
      !supabaseUrl ||
      !serviceRoleKey ||
      !anonKey
    ) {
      return jsonResponse(
        {
          error:
            "Variáveis Supabase ausentes.",
        },
        500
      );
    }

    supabaseAdmin =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            persistSession:
              false,
            autoRefreshToken:
              false,
          },
        }
      );

    const authorization =
      req.headers.get(
        "authorization"
      );

    if (
      !authorization ||
      !authorization
        .toLowerCase()
        .startsWith(
          "bearer "
        )
    ) {
      return jsonResponse(
        {
          error:
            "Sessão administrativa ausente.",
        },
        401
      );
    }

    const supabaseUsuario =
      createClient(
        supabaseUrl,
        anonKey,
        {
          global: {
            headers: {
              Authorization:
                authorization,
            },
          },

          auth: {
            persistSession:
              false,
            autoRefreshToken:
              false,
          },
        }
      );

    const {
      data:
        authData,
      error:
        authError,
    } =
      await supabaseUsuario
        .auth
        .getUser();

    if (
      authError ||
      !authData
        ?.user
        ?.id
    ) {
      return jsonResponse(
        {
          error:
            "Sessão administrativa inválida ou expirada.",
        },
        401
      );
    }

    const actorAuthId =
      authData.user.id;

    const body =
      await req.json();

    const auditoriaIdInformada =
      texto(
        body?.auditoria_id
      );

    const preCadastroIdInformado =
      texto(
        body?.pre_cadastro_id
      );

    const condominioIdInformado =
      texto(
        body?.condominio_id
      );

    const observacao =
      texto(
        body?.observacao ||
        body?.observacoes
      ) ||
      null;

    if (
      !auditoriaIdInformada &&
      !preCadastroIdInformado
    ) {
      return jsonResponse(
        {
          error:
            "auditoria_id ou pre_cadastro_id obrigatório.",
        },
        400
      );
    }

    let auditoria:
      JsonObject | null =
      null;

    let preCadastro:
      JsonObject | null =
      null;

    if (
      auditoriaIdInformada
    ) {
      const {
        data,
        error,
      } =
        await supabaseAdmin
          .from(
            "auditorias_morador"
          )
          .select(
            `
            *,
            pre_cadastro_moradores (*)
          `
          )
          .eq(
            "id",
            auditoriaIdInformada
          )
          .maybeSingle();

      if (error) {
        throw error;
      }

      auditoria =
        data ||
        null;

      preCadastro =
        data
          ?.pre_cadastro_moradores ||
        null;
    } else {
      let consulta =
        supabaseAdmin
          .from(
            "pre_cadastro_moradores"
          )
          .select("*")
          .eq(
            "id",
            preCadastroIdInformado
          );

      if (
        condominioIdInformado
      ) {
        consulta =
          consulta.eq(
            "condominio_id",
            condominioIdInformado
          );
      }

      const {
        data,
        error,
      } =
        await consulta
          .maybeSingle();

      if (error) {
        throw error;
      }

      preCadastro =
        data ||
        null;

      if (
        preCadastro?.id
      ) {
        const {
          data:
            auditoriaAtual,
          error:
            auditoriaError,
        } =
          await supabaseAdmin
            .from(
              "auditorias_morador"
            )
            .select("*")
            .eq(
              "pre_cadastro_id",
              preCadastro.id
            )
            .eq(
              "condominio_id",
              preCadastro
                .condominio_id
            )
            .order(
              "criado_em",
              {
                ascending:
                  false,
              }
            )
            .limit(1)
            .maybeSingle();

        if (
          auditoriaError
        ) {
          throw auditoriaError;
        }

        auditoria =
          auditoriaAtual ||
          null;
      }
    }

    if (!preCadastro) {
      return jsonResponse(
        {
          error:
            "Pré-cadastro não encontrado.",
        },
        404
      );
    }

    if (
      !auditoria?.id
    ) {
      return jsonResponse(
        {
          error:
            "Auditoria do Morador não encontrada.",
        },
        404
      );
    }

    const preCadastroId =
      texto(
        preCadastro.id
      );

    const auditoriaId =
      texto(
        auditoria.id
      );

    const condominioId =
      texto(
        preCadastro
          .condominio_id
      );

    const businessId =
      texto(
        preCadastro
          .business_id
      ) ||
      null;

    if (!condominioId) {
      throw new Error(
        "Pré-cadastro sem condominio_id."
      );
    }

    if (
      texto(
        auditoria
          .pre_cadastro_id
      ) !==
      preCadastroId
    ) {
      throw new Error(
        "Auditoria e Pré-Cadastro possuem vínculo divergente."
      );
    }

    if (
      texto(
        auditoria
          .condominio_id
      ) !==
      condominioId
    ) {
      throw new Error(
        "Auditoria pertence a outro condomínio."
      );
    }

    const {
      data:
        contextoData,
      error:
        contextoError,
    } =
      await supabaseUsuario.rpc(
        "fn_admin_contexto_condominio_v1",
        {
          p_condominio_id:
            condominioId,
        }
      );

    if (
      contextoError
    ) {
      console.error(
        "[aprovar-morador] contexto administrativo:",
        contextoError
      );

      return jsonResponse(
        {
          error:
            "Acesso administrativo negado para este condomínio.",
        },
        403
      );
    }

    const contextoAdmin =
      extrairPrimeiro(
        contextoData
      ) as JsonObject | null;

    if (
      !contextoAdmin
        ?.usuario_id
    ) {
      return jsonResponse(
        {
          error:
            "Contexto administrativo não resolvido.",
        },
        403
      );
    }

    if (
      texto(
        contextoAdmin
          .condominio_id
      ) !==
      condominioId
    ) {
      return jsonResponse(
        {
          error:
            "Contexto administrativo divergente do condomínio.",
        },
        403
      );
    }

    if (
      businessId &&
      texto(
        contextoAdmin
          .business_id
      ) !==
      businessId
    ) {
      return jsonResponse(
        {
          error:
            "Contexto administrativo divergente do tenant.",
        },
        403
      );
    }

    const actorUsuarioId =
      texto(
        contextoAdmin
          .usuario_id
      );

    const actorVinculoId =
      texto(
        contextoAdmin
          .vinculo_id
      ) ||
      null;

    const nivelId =
      Number(
        contextoAdmin
          .nivel_id
      );

    const actorTipo =
      nivelId === 2
        ? "SINDICO"
        : nivelId === 3
        ? "SUBSINDICO"
        : "ADMINISTRATIVO";

    const {
      data:
        actorPerfil,
      error:
        actorPerfilError,
    } =
      await supabaseAdmin
        .from(
          "usuarios"
        )
        .select(
          `
          id,
          nome,
          email,
          nivel_id,
          ativo
        `
        )
        .eq(
          "id",
          actorUsuarioId
        )
        .maybeSingle();

    if (
      actorPerfilError
    ) {
      throw actorPerfilError;
    }

    if (
      !actorPerfil?.id ||
      actorPerfil.ativo !==
      true
    ) {
      return jsonResponse(
        {
          error:
            "Usuário administrativo inválido ou inativo.",
        },
        403
      );
    }

    const actorNome =
      texto(
        actorPerfil.nome
      ) ||
      "Administrativo";

    const actorEmail =
      emailNormalizado(
        actorPerfil.email ||
        authData.user.email
      ) ||
      null;

    const ip =
      obterIp(req);

    const userAgent =
      req.headers.get(
        "user-agent"
      ) ||
      "";

    const contextoRequisicao = {
      ip,

      user_agent:
        userAgent,

      sistema_operacional:
        detectarSistemaOperacional(
          userAgent
        ),

      navegador:
        detectarNavegador(
          userAgent
        ),

      actor_auth_id:
        actorAuthId,

      actor_usuario_id:
        actorUsuarioId,

      actor_vinculo_id:
        actorVinculoId,

      actor_tipo:
        actorTipo,
    };

    const baseSaga =
      `CHEGOU:R4:APROVAR_MORADOR:${preCadastroId}:${auditoriaId}`;

    const decisionIdempotencyKey =
      await uuidDeterministico(
        `${baseSaga}:DECISAO`
      );

    const coreIdempotencyKey =
      await uuidDeterministico(
        `${baseSaga}:CORE`
      );

    const multivaloradosIdempotencyKey =
      await uuidDeterministico(
        `${baseSaga}:MULTIVALORADOS`
      );

    const finalizacaoIdempotencyKey =
      await uuidDeterministico(
        `${baseSaga}:FINALIZAR`
      );

    /*
     * 1. LOCALIZAR O SNAPSHOT CANÔNICO SUBMETIDO PELO WIZARD
     *
     * REGRA R4F02:
     * - a aprovação administrativa NÃO gera nova revisão documental;
     * - a revisão congelada pelo Wizard é o documento que a Auditoria decide;
     * - R2/R3/... somente surgem após nova submissão real do Morador,
     *   normalmente decorrente de correção solicitada;
     * - snapshots RASCUNHO residuais/incompletos nunca são escolhidos para
     *   aprovação;
     * - a correlation_id utilizada pela Saga de decisão/promoção deve ser
     *   a correlation_id do próprio Snapshot canônico selecionado.
     *
     * Isso preserva o grafo oficial:
     * CONGELADO -> APROVADO -> EM_PROMOCAO -> PROMOVIDO.
     */

    const {
      data:
        snapshotSagaExistente,
      error:
        snapshotSagaError,
    } =
      await supabaseAdmin
        .from(
          "wizard_morador_snapshots"
        )
        .select(
          `
          id,
          pre_cadastro_id,
          auditoria_id,
          revisao,
          snapshot_anterior_id,
          status,
          valido,
          correlation_id,
          payload_hash,
          contrato_nome,
          contrato_versao,
          schema_versao,
          criado_em,
          aprovado_em,
          promocao_iniciada_em,
          promovido_em
        `
        )
        .eq(
          "pre_cadastro_id",
          preCadastroId
        )
        .eq(
          "valido",
          true
        )
        .in(
          "status",
          [
            "CONGELADO",
            "APROVADO",
            "EM_PROMOCAO",
            "PROMOVIDO",
          ]
        )
        .order(
          "revisao",
          {
            ascending:
              false,
          }
        )
        .limit(1)
        .maybeSingle();

    if (
      snapshotSagaError
    ) {
      throw snapshotSagaError;
    }

    if (
      !snapshotSagaExistente
        ?.id
    ) {
      throw new Error(
        "Nenhum Snapshot canônico válido e submetido foi localizado para aprovação. A aprovação não pode gerar uma nova revisão automaticamente."
      );
    }

    const snapshotCorrelationId =
      texto(
        snapshotSagaExistente
          .correlation_id
      );

    if (
      !snapshotCorrelationId
    ) {
      throw new Error(
        "O Snapshot canônico selecionado não possui correlation_id válida."
      );
    }

    const correlationId =
      snapshotCorrelationId;

    sagaCorrelationId =
      correlationId;

    const snapshotGerado:
      JsonObject = {
        ...snapshotSagaExistente,

        snapshot_id:
          snapshotSagaExistente.id,

        acao:
          "REUTILIZAR_SNAPSHOT_CANONICO_SUBMETIDO",

        idempotente:
          true,
      };

    const snapshotId =
      texto(
        snapshotGerado
          ?.snapshot_id
      );

    if (!snapshotId) {
      throw new Error(
        "A Saga R4 não retornou snapshot_id."
      );
    }

    sagaSnapshotId =
      snapshotId;

    let snapshotStatus =
      texto(
        snapshotGerado
          ?.status
      ).toUpperCase();

    if (!snapshotStatus) {
      throw new Error(
        "A Saga R4 não retornou o status do Snapshot."
      );
    }

    const statusInicialDaRequisicao =
      snapshotStatus;

    const retomadaPosCoreInicial =
      [
        "EM_PROMOCAO",
        "PROMOVIDO",
      ].includes(
        statusInicialDaRequisicao
      );

    const preCadastroJaEncerradoAntes =
      texto(
        preCadastro
          .status_cadastro
      ).toUpperCase() ===
        "APROVADO" &&
      texto(
        preCadastro
          .status_auditoria
      ).toUpperCase() ===
        "APROVADO";

    let validacao:
      JsonObject = {
        acao:
          "ETAPA_AINDA_NAO_EXECUTADA",
        idempotente:
          false,
        status_atual:
          snapshotStatus,
      };

    let congelamento:
      JsonObject = {
        acao:
          "ETAPA_AINDA_NAO_EXECUTADA",
        idempotente:
          false,
        status_atual:
          snapshotStatus,
      };

    let decisao:
      JsonObject = {
        acao:
          "ETAPA_AINDA_NAO_EXECUTADA",
        idempotente:
          false,
        status_atual:
          snapshotStatus,
      };

    let sincronizacaoAuditoria:
      JsonObject = {
        acao:
          "ETAPA_AINDA_NAO_EXECUTADA",
        idempotente:
          false,
      };

    let resolucao:
      JsonObject = {
        acao:
          "ETAPA_AINDA_NAO_EXECUTADA",
        idempotente:
          false,
      };

    let core:
      JsonObject = {
        acao:
          "ETAPA_AINDA_NAO_EXECUTADA",
        idempotente:
          false,
      };

    let multivalorados:
      JsonObject = {
        acao:
          "ETAPA_AINDA_NAO_EXECUTADA",
        idempotente:
          false,
      };

    let finalizacao:
      JsonObject = {
        acao:
          "ETAPA_AINDA_NAO_EXECUTADA",
        idempotente:
          false,
      };

    let encerramento:
      JsonObject = {
        acao:
          "ETAPA_AINDA_NAO_EXECUTADA",
        idempotente:
          false,
      };

    let cpfCanonico =
      somenteNumeros(
        preCadastro?.cpf
      );

    let emailCanonico =
      emailNormalizado(
        preCadastro?.email
      );

    let nomeCanonico =
      texto(
        preCadastro
          ?.nome_social
      ) ||
      texto(
        preCadastro
          ?.nome
      ) ||
      "Morador";

    let authUserId:
      string | null =
      null;

    let authReutilizado =
      false;

    let authOrigem =
      "";

    let usuarioId =
      "";

    let pessoaId:
      string | null =
      null;

    /*
     * 2. FASE ANTERIOR AO CORE
     */

    if (
      !retomadaPosCoreInicial
    ) {
      if (
        [
          "RASCUNHO",
          "GERANDO",
        ].includes(
          snapshotStatus
        )
      ) {
        validacao =
          await rpcObrigatoria({
            supabaseAdmin,

            nome:
              "fn_r4f02_validar_snapshot_rascunho_v1",

            parametros: {
              p_snapshot_id:
                snapshotId,

              p_correlation_id:
                correlationId,
            },
          }) as JsonObject;

        snapshotStatus =
          texto(
            validacao
              ?.status_atual ||
            "VALIDANDO"
          ).toUpperCase();
      } else {
        validacao = {
          acao:
            "REUTILIZAR_VALIDACAO_EXISTENTE",

          idempotente:
            true,

          status_atual:
            snapshotStatus,

          snapshot_id:
            snapshotId,
        };
      }

      if (
        snapshotStatus ===
        "VALIDANDO"
      ) {
        congelamento =
          await rpcObrigatoria({
            supabaseAdmin,

            nome:
              "fn_r4f02_congelar_snapshot_v1",

            parametros: {
              p_snapshot_id:
                snapshotId,

              p_correlation_id:
                correlationId,
            },
          }) as JsonObject;

        snapshotStatus =
          texto(
            congelamento
              ?.status_atual ||
            "CONGELADO"
          ).toUpperCase();
      } else if (
        [
          "CONGELADO",
          "APROVADO",
        ].includes(
          snapshotStatus
        )
      ) {
        congelamento = {
          acao:
            "REUTILIZAR_CONGELAMENTO_EXISTENTE",

          idempotente:
            true,

          status_atual:
            snapshotStatus,

          snapshot_id:
            snapshotId,
        };
      } else {
        throw new Error(
          `Snapshot em estado incompatível antes do congelamento: ${snapshotStatus}.`
        );
      }

      if (
        ![
          "CONGELADO",
          "APROVADO",
        ].includes(
          snapshotStatus
        )
      ) {
        throw new Error(
          `Snapshot em estado incompatível para aprovação: ${snapshotStatus}.`
        );
      }

      decisao =
        await rpcObrigatoria({
          supabaseAdmin,

          nome:
            "fn_r4f02_decidir_snapshot_congelado_v1",

          parametros: {
            p_snapshot_id:
              snapshotId,

            p_auditoria_id:
              auditoriaId,

            p_idempotency_key:
              decisionIdempotencyKey,

            p_correlation_id:
              correlationId,

            p_decisao:
              "APROVAR",

            p_motivo:
              observacao,

            p_actor_tipo:
              actorTipo,

            p_actor_auth_id:
              actorAuthId,

            p_actor_usuario_id:
              actorUsuarioId,

            p_actor_pessoa_id:
              null,

            p_actor_vinculo_id:
              actorVinculoId,

            p_actor_nome_snapshot:
              actorNome,

            p_actor_email_snapshot:
              actorEmail,
          },
        }) as JsonObject;

      snapshotStatus =
        texto(
          decisao
            ?.status_atual ||
          "APROVADO"
        ).toUpperCase();

      if (
        snapshotStatus !==
        "APROVADO"
      ) {
        throw new Error(
          `A decisão documental não deixou o Snapshot APROVADO. Estado: ${snapshotStatus}.`
        );
      }

      const auditoriaJaAprovada =
        texto(
          auditoria
            ?.status_auditoria
        ).toUpperCase() ===
          "APROVADO" &&
        Boolean(
          auditoria
            ?.aprovado_em
        );

      if (
        auditoriaJaAprovada
      ) {
        sincronizacaoAuditoria = {
          acao:
            "REUTILIZAR_AUDITORIA_APROVADA",

          idempotente:
            true,

          auditoria_id:
            auditoriaId,

          snapshot_id:
            snapshotId,

          status_auditoria:
            "APROVADO",

          aprovado_em:
            auditoria
              ?.aprovado_em ||
            null,
        };
      } else {
        sincronizacaoAuditoria =
          await rpcObrigatoria({
            supabaseAdmin,

            nome:
              "fn_r4f02_sincronizar_auditoria_aprovada_v1",

            parametros: {
              p_snapshot_id:
                snapshotId,

              p_correlation_id:
                correlationId,

              p_actor_auth_id:
                actorAuthId,

              p_actor_usuario_id:
                actorUsuarioId,

              p_actor_vinculo_id:
                actorVinculoId,

              p_actor_nome:
                actorNome,

              p_actor_email:
                actorEmail,

              p_ip:
                ip,

              p_user_agent:
                userAgent,
            },
          }) as JsonObject;
      }

      resolucao =
        await rpcObrigatoria({
          supabaseAdmin,

          nome:
            "fn_r4f02_resolver_identidade_pre_promocao_v1",

          parametros: {
            p_snapshot_id:
              snapshotId,

            p_correlation_id:
              correlationId,
          },
        }) as JsonObject;

      const totalBloqueios =
        Number(
          resolucao
            ?.qualidade
            ?.total_bloqueios ||
          0
        );

      const aptoParaMutacao =
        resolucao
          ?.qualidade
          ?.apto_para_mutacao ===
        true;

      if (
        totalBloqueios > 0 ||
        !aptoParaMutacao
      ) {
        throw new Error(
          `Resolução canônica possui bloqueios: ${
            JSON.stringify(
              resolucao
                ?.qualidade
                ?.bloqueios ||
              []
            )
          }`
        );
      }

      cpfCanonico =
        somenteNumeros(
          resolucao
            ?.identificadores_normalizados
            ?.cpf
        );

      emailCanonico =
        emailNormalizado(
          resolucao
            ?.identificadores_normalizados
            ?.email
        );

      nomeCanonico =
        texto(
          resolucao
            ?.identificadores_normalizados
            ?.nome_social
        ) ||
        texto(
          resolucao
            ?.identificadores_normalizados
            ?.nome_civil
        ) ||
        texto(
          preCadastro.nome
        ) ||
        "Morador";

      if (
        cpfCanonico.length !==
        11
      ) {
        throw new Error(
          "CPF canônico inválido para promoção."
        );
      }

      if (!emailCanonico) {
        throw new Error(
          "E-mail canônico ausente para promoção."
        );
      }

      const authReferenciadoId =
        texto(
          resolucao
            ?.decisoes
            ?.auth
            ?.auth_user_id
        ) ||
        texto(
          preCadastro
            .auth_user_id
        ) ||
        null;

      const usuarioCanonicoExistenteId =
        texto(
          resolucao
            ?.decisoes
            ?.usuario
            ?.usuario_id
        ) ||
        null;

      if (
        authReferenciadoId
      ) {
        const authExistente =
          await obterAuthPorId({
            supabaseAdmin,

            authUserId:
              authReferenciadoId,
          });

        if (!authExistente) {
          throw new Error(
            "O Pré-Cadastro referencia um Auth inexistente. Reconciliação manual necessária."
          );
        }

        if (
          usuarioCanonicoExistenteId &&
          usuarioCanonicoExistenteId !==
            authReferenciadoId
        ) {
          throw new Error(
            "Conflito entre Auth referenciado e Usuário canônico."
          );
        }

        authUserId =
          authReferenciadoId;

        authReutilizado =
          true;

        authOrigem =
          "AUTH_REFERENCIADO_PRE_CADASTRO";
      } else if (
        usuarioCanonicoExistenteId
      ) {
        const authExistente =
          await obterAuthPorId({
            supabaseAdmin,

            authUserId:
              usuarioCanonicoExistenteId,
          });

        if (!authExistente) {
          throw new Error(
            "Usuário canônico existente não possui Auth correspondente. Reconciliação de identidade necessária antes da aprovação."
          );
        }

        authUserId =
          usuarioCanonicoExistenteId;

        authReutilizado =
          true;

        authOrigem =
          "AUTH_DO_USUARIO_CANONICO";
      } else {
        const authPorEmail =
          await localizarAuthPorEmail({
            supabaseAdmin,

            email:
              emailCanonico,
          });

        if (
          authPorEmail?.id
        ) {
          authUserId =
            authPorEmail.id;

          authReutilizado =
            true;

          authOrigem =
            "AUTH_EXISTENTE_POR_EMAIL";
        }
      }

      if (!authUserId) {
        if (
          preCadastro
            .senha_preparada !==
            true ||
          !preCadastro
            .senha_auth_criptografada
        ) {
          throw new Error(
            "Novo Auth necessário, mas a senha do Morador não está preparada."
          );
        }

        const senhaAuth =
          await descriptografarSenhaAuth(
            String(
              preCadastro
                .senha_auth_criptografada
            )
          );

        if (
          !senhaAuth ||
          senhaAuth.length < 8
        ) {
          throw new Error(
            "Senha temporária inválida para criação do Auth."
          );
        }

        const {
          data:
            novoAuth,
          error:
            createAuthError,
        } =
          await supabaseAdmin
            .auth
            .admin
            .createUser({
              email:
                emailCanonico,

              password:
                senhaAuth,

              email_confirm:
                true,

              user_metadata: {
                nome:
                  nomeCanonico,

                cpf:
                  cpfCanonico,

                origem:
                  "WIZARD_MORADOR_R4",
              },
            });

        if (
          createAuthError ||
          !novoAuth
            ?.user
            ?.id
        ) {
          throw new Error(
            createAuthError
              ?.message ||
            "Erro ao criar Auth principal."
          );
        }

        authUserId =
          novoAuth.user.id;

        authCriadoNestaExecucao =
          authUserId;

        authReutilizado =
          false;

        authOrigem =
          "AUTH_CRIADO_PELA_APROVACAO_R4";
      }

      if (!authUserId) {
        throw new Error(
          "Não foi possível resolver auth_user_id efetivo."
        );
      }

      core =
        await rpcObrigatoria({
          supabaseAdmin,

          nome:
            "fn_r4f02_executar_resolucao_canonica_v1",

          parametros: {
            p_snapshot_id:
              snapshotId,

            p_auth_user_id:
              authUserId,

            p_idempotency_key:
              coreIdempotencyKey,

            p_correlation_id:
              correlationId,

            p_actor_tipo:
              actorTipo,

            p_actor_auth_id:
              actorAuthId,

            p_actor_usuario_id:
              actorUsuarioId,

            p_actor_pessoa_id:
              null,

            p_actor_vinculo_id:
              actorVinculoId,

            p_actor_nome:
              actorNome,

            p_actor_email:
              actorEmail,
          },
        }) as JsonObject;

      coreConcluido =
        true;

      usuarioId =
        texto(
          core
            ?.usuario
            ?.usuario_id
        ) ||
        authUserId;

      pessoaId =
        texto(
          core
            ?.pessoa
            ?.pessoa_id
        ) ||
        null;

      snapshotStatus =
        texto(
          core
            ?.status_snapshot ||
          "EM_PROMOCAO"
        ).toUpperCase();

      if (
        snapshotStatus !==
        "EM_PROMOCAO"
      ) {
        throw new Error(
          `O Core não deixou o Snapshot EM_PROMOCAO. Estado: ${snapshotStatus}.`
        );
      }
    } else {
      /*
       * 3. RETOMADA PÓS-CORE
       */

      validacao = {
        acao:
          "REUTILIZAR_VALIDACAO_PERSISTIDA_POS_CORE",

        idempotente:
          true,

        snapshot_id:
          snapshotId,

        status_atual:
          snapshotStatus,
      };

      congelamento = {
        acao:
          "REUTILIZAR_CONGELAMENTO_PERSISTIDO_POS_CORE",

        idempotente:
          true,

        snapshot_id:
          snapshotId,

        status_atual:
          snapshotStatus,
      };

      decisao = {
        acao:
          "REUTILIZAR_DECISAO_APROVADA_POS_CORE",

        idempotente:
          true,

        snapshot_id:
          snapshotId,

        status_atual:
          snapshotStatus,
      };

      sincronizacaoAuditoria = {
        acao:
          "REUTILIZAR_AUDITORIA_APROVADA_POS_CORE",

        idempotente:
          true,

        auditoria_id:
          auditoriaId,

        snapshot_id:
          snapshotId,

        status_auditoria:
          texto(
            auditoria
              ?.status_auditoria
          ) ||
          "APROVADO",

        aprovado_em:
          auditoria
            ?.aprovado_em ||
          null,
      };

      let operacaoCore =
        await localizarOperacaoSaga({
          supabaseAdmin,

          snapshotId,

          correlationId,

          operacaoTipo:
            "PROMOVER_DADOS_COMPLEMENTARES",

          idempotencyKey:
            coreIdempotencyKey,
        });

      if (
        !operacaoCore?.id
      ) {
        operacaoCore =
          await localizarOperacaoSaga({
            supabaseAdmin,

            snapshotId,

            correlationId,

            operacaoTipo:
              "PROMOVER_DADOS_COMPLEMENTARES",
          });
      }

      if (
        !operacaoCore?.id
      ) {
        throw new Error(
          "Snapshot está em retomada pós-Core, mas a operação PROMOVER_DADOS_COMPLEMENTARES não foi localizada."
        );
      }

      authUserId =
        texto(
          operacaoCore
            .auth_user_id
        ) ||
        texto(
          operacaoCore
            ?.resultado
            ?.auth
            ?.auth_user_id
        ) ||
        null;

      usuarioId =
        texto(
          operacaoCore
            .usuario_id
        ) ||
        texto(
          operacaoCore
            ?.resultado
            ?.usuario
            ?.usuario_id
        );

      pessoaId =
        texto(
          operacaoCore
            .pessoa_id
        ) ||
        texto(
          operacaoCore
            ?.resultado
            ?.pessoa
            ?.pessoa_id
        ) ||
        null;

      if (
        !authUserId ||
        !usuarioId ||
        !pessoaId ||
        !texto(
          operacaoCore
            .morador_unidade_vinculo_id
        )
      ) {
        throw new Error(
          "Operação Core persistida não possui identidade materializada completa para retomada."
        );
      }

      const authExistente =
        await obterAuthPorId({
          supabaseAdmin,
          authUserId,
        });

      if (!authExistente) {
        throw new Error(
          "Auth materializado pelo Core não foi localizado durante a retomada."
        );
      }

      authReutilizado =
        true;

      authOrigem =
        "AUTH_REUTILIZADO_DA_OPERACAO_CORE";

      coreConcluido =
        true;

      core = {
        ...(
          operacaoCore
            .resultado ||
          {}
        ),

        acao:
          "REUTILIZAR_NUCLEO_CANONICO_PERSISTIDO",

        idempotente:
          true,

        operacao_id:
          operacaoCore.id,

        status_operacao:
          operacaoCore.status,

        snapshot_id:
          snapshotId,

        auth_user_id:
          authUserId,

        usuario_id:
          usuarioId,

        pessoa_id:
          pessoaId,
      };

      const {
        data:
          usuarioPromovido,
        error:
          usuarioPromovidoError,
      } =
        await supabaseAdmin
          .from(
            "usuarios"
          )
          .select(
            `
            id,
            nome,
            email
          `
          )
          .eq(
            "id",
            usuarioId
          )
          .maybeSingle();

      if (
        usuarioPromovidoError
      ) {
        throw usuarioPromovidoError;
      }

      emailCanonico =
        emailNormalizado(
          usuarioPromovido
            ?.email ||
          authExistente.email ||
          preCadastro?.email
        );

      nomeCanonico =
        texto(
          usuarioPromovido
            ?.nome
        ) ||
        texto(
          preCadastro
            ?.nome_social
        ) ||
        texto(
          preCadastro
            ?.nome
        ) ||
        "Morador";

      if (!emailCanonico) {
        throw new Error(
          "E-mail canônico não pôde ser recuperado durante a retomada."
        );
      }

      resolucao = {
        acao:
          "REUTILIZAR_IDENTIDADE_MATERIALIZADA_PELO_CORE",

        idempotente:
          true,

        snapshot_id:
          snapshotId,

        operacao_core_id:
          operacaoCore.id,

        identificadores_normalizados: {
          email:
            emailCanonico,

          nome_civil:
            nomeCanonico,
        },

        decisoes: {
          auth: {
            auth_user_id:
              authUserId,
          },

          usuario: {
            usuario_id:
              usuarioId,
          },

          pessoa: {
            pessoa_id:
              pessoaId,
          },
        },

        qualidade: {
          total_bloqueios:
            0,

          apto_para_mutacao:
            true,

          retomada_pos_core:
            true,
        },
      };
    }

    /*
     * 4. MULTIVALORADOS
     */

    if (
      snapshotStatus ===
      "EM_PROMOCAO"
    ) {
      multivalorados =
        await rpcObrigatoria({
          supabaseAdmin,

          nome:
            "fn_r4f02_executar_multivalorados_v1",

          parametros: {
            p_snapshot_id:
              snapshotId,

            p_idempotency_key:
              multivaloradosIdempotencyKey,

            p_correlation_id:
              correlationId,

            p_actor_auth_id:
              actorAuthId,

            p_actor_usuario_id:
              actorUsuarioId,

            p_actor_pessoa_id:
              null,

            p_actor_vinculo_id:
              actorVinculoId,

            p_actor_tipo:
              actorTipo,

            p_actor_nome:
              actorNome,

            p_actor_email:
              actorEmail,
          },
        }) as JsonObject;
    } else if (
      snapshotStatus ===
      "PROMOVIDO"
    ) {
      const operacaoMultivalorados =
        (
          await localizarOperacaoSaga({
            supabaseAdmin,

            snapshotId,

            correlationId,

            operacaoTipo:
              "PROMOVER_MULTIVALORADOS",

            idempotencyKey:
              multivaloradosIdempotencyKey,
          })
        ) ||
        (
          await localizarOperacaoSaga({
            supabaseAdmin,

            snapshotId,

            correlationId,

            operacaoTipo:
              "PROMOVER_MULTIVALORADOS",
          })
        );

      multivalorados = {
        ...(
          operacaoMultivalorados
            ?.resultado ||
          {}
        ),

        acao:
          "REUTILIZAR_MULTIVALORADOS_PERSISTIDOS",

        idempotente:
          true,

        operacao_id:
          operacaoMultivalorados
            ?.id ||
          null,

        snapshot_id:
          snapshotId,
      };
    } else {
      throw new Error(
        `Snapshot em estado incompatível antes dos multivalorados: ${snapshotStatus}.`
      );
    }

    /*
     * 5. FINALIZAÇÃO
     */

    if (
      snapshotStatus ===
      "EM_PROMOCAO"
    ) {
      finalizacao =
        await rpcObrigatoria({
          supabaseAdmin,

          nome:
            "fn_r4f02_finalizar_promocao_v1",

          parametros: {
            p_snapshot_id:
              snapshotId,

            p_idempotency_key:
              finalizacaoIdempotencyKey,

            p_correlation_id:
              correlationId,

            p_actor_auth_id:
              actorAuthId,

            p_actor_usuario_id:
              actorUsuarioId,

            p_actor_pessoa_id:
              null,

            p_actor_vinculo_id:
              actorVinculoId,

            p_actor_tipo:
              actorTipo,

            p_actor_nome:
              actorNome,

            p_actor_email:
              actorEmail,
          },
        }) as JsonObject;

      snapshotStatus =
        texto(
          finalizacao
            ?.status_final ||
          finalizacao
            ?.status_atual ||
          "PROMOVIDO"
        ).toUpperCase();
    } else {
      const operacaoFinalizacao =
        (
          await localizarOperacaoSaga({
            supabaseAdmin,

            snapshotId,

            correlationId,

            operacaoTipo:
              "FINALIZAR_PROMOCAO",

            idempotencyKey:
              finalizacaoIdempotencyKey,
          })
        ) ||
        (
          await localizarOperacaoSaga({
            supabaseAdmin,

            snapshotId,

            correlationId,

            operacaoTipo:
              "FINALIZAR_PROMOCAO",
          })
        );

      finalizacao = {
        ...(
          operacaoFinalizacao
            ?.resultado ||
          {}
        ),

        acao:
          "REUTILIZAR_FINALIZACAO_PERSISTIDA",

        idempotente:
          true,

        operacao_id:
          operacaoFinalizacao
            ?.id ||
          null,

        snapshot_id:
          snapshotId,

        status_final:
          "PROMOVIDO",
      };

      snapshotStatus =
        "PROMOVIDO";
    }

    if (
      snapshotStatus !==
      "PROMOVIDO"
    ) {
      throw new Error(
        `A finalização não deixou o Snapshot PROMOVIDO. Estado: ${snapshotStatus}.`
      );
    }

    /*
     * 6. ENCERRAMENTO
     */

    encerramento =
      await rpcObrigatoria({
        supabaseAdmin,

        nome:
          "fn_r4f02_encerrar_aprovacao_promovida_v1",

        parametros: {
          p_snapshot_id:
            snapshotId,

          p_correlation_id:
            correlationId,

          p_actor_auth_id:
            actorAuthId,

          p_actor_usuario_id:
            actorUsuarioId,

          p_actor_vinculo_id:
            actorVinculoId,

          p_actor_nome:
            actorNome,

          p_actor_email:
            actorEmail,

          p_ip:
            ip,

          p_user_agent:
            userAgent,
        },
      }) as JsonObject;

    if (
      encerramento
        ?.success !==
        true &&
      texto(
        encerramento
          ?.status_cadastro
      ).toUpperCase() !==
        "APROVADO"
    ) {
      throw new Error(
        "A Saga foi promovida, mas o encerramento de negócio não confirmou o cadastro APROVADO."
      );
    }

    const {
      data:
        condominio,
    } =
      await supabaseAdmin
        .from(
          "condominios"
        )
        .select(
          `
          nome_fantasia,
          razao_social
        `
        )
        .eq(
          "id",
          condominioId
        )
        .maybeSingle();

    const nomeCondominio =
      condominio
        ?.nome_fantasia ||
      condominio
        ?.razao_social ||
      "Condomínio";

    /*
     * 7. E-MAIL COM DEDUPLICAÇÃO
     */

    const appUrl =
      Deno.env.get(
        "CHEGOU_APP_URL"
      ) ||
      "https://sistemachegou.com.br";

    const loginUrl =
      `${appUrl.replace(
        /\/$/,
        ""
      )}/login`;

    const {
      data:
        emailJaEnviadoLog,
      error:
        emailJaEnviadoError,
    } =
      await supabaseAdmin
        .from(
          "logs_sistema"
        )
        .select("id")
        .eq(
          "acao",
          "EMAIL_APROVACAO_MORADOR_ENVIADO"
        )
        .eq(
          "condominio_id",
          condominioId
        )
        .eq(
          "email",
          emailCanonico
        )
        .contains(
          "detalhes",
          {
            pre_cadastro_id:
              preCadastroId,

            correlation_id:
              correlationId,
          }
        )
        .limit(1)
        .maybeSingle();

    if (
      emailJaEnviadoError
    ) {
      console.error(
        "[aprovar-morador] falha ao verificar idempotência do e-mail:",
        emailJaEnviadoError
      );
    }

    const emailResultado =
      emailJaEnviadoLog?.id
        ? {
            status:
              "ja_enviado",

            messageId:
              null,

            error:
              null,
          }
        : await enviarEmailAprovacao({
            supabaseAdmin,

            nome:
              nomeCanonico,

            email:
              emailCanonico,

            nomeCondominio,

            condominioId,

            preCadastroId,

            auditoriaId,

            usuarioId,

            correlationId,

            loginUrl,

            authReutilizado,

            contextoRequisicao,
          });

    await registrarLog({
      supabaseAdmin,

      acao:
        "MORADOR_APROVADO_R4",

      condominioId,

      usuarioId,

      email:
        emailCanonico,

      origem:
        "aprovar-morador",

      detalhes: {
        pre_cadastro_id:
          preCadastroId,

        auditoria_id:
          auditoriaId,

        snapshot_id:
          snapshotId,

        correlation_id:
          correlationId,

        pessoa_id:
          pessoaId,

        usuario_id:
          usuarioId,

        auth_user_id:
          authUserId,

        auth_reutilizado:
          authReutilizado,

        auth_origem:
          authOrigem,

        status_inicial_saga:
          statusInicialDaRequisicao,

        retomada_pos_core:
          retomadaPosCoreInicial,

        pre_cadastro_ja_encerrado_antes:
          preCadastroJaEncerradoAntes,

        actor_auth_id:
          actorAuthId,

        actor_usuario_id:
          actorUsuarioId,

        actor_vinculo_id:
          actorVinculoId,

        actor_tipo:
          actorTipo,

        email_status:
          emailResultado.status,

        brevo_message_id:
          emailResultado.messageId,

        brevo_error:
          emailResultado.error,

        ...contextoRequisicao,
      },
    });

    return jsonResponse({
      success:
        true,

      message:
        "Morador aprovado com sucesso.",

      pre_cadastro_id:
        preCadastroId,

      auditoria_id:
        auditoriaId,

      snapshot_id:
        snapshotId,

      correlation_id:
        correlationId,

      pessoa_id:
        pessoaId,

      usuario_id:
        usuarioId,

      auth_user_id:
        authUserId,

      auth_reutilizado:
        authReutilizado,

      auth_origem:
        authOrigem,

      status_inicial_saga:
        statusInicialDaRequisicao,

      retomada_pos_core:
        retomadaPosCoreInicial,

      status_cadastro:
        encerramento
          ?.status_cadastro ||
        "APROVADO",

      status_auditoria:
        encerramento
          ?.status_auditoria ||
        "APROVADO",

      status_acompanhamento:
        encerramento
          ?.status_acompanhamento ||
        "aprovado",

      status_conta:
        encerramento
          ?.status_conta ||
        "AGUARDANDO_PRIMEIRO_ACESSO",

      auth_ativo:
        encerramento
          ?.auth_ativo ===
        true,

      primeiro_acesso_concluido:
        false,

      email_status:
        emailResultado.status,

      brevo_message_id:
        emailResultado.messageId,

      brevo_error:
        emailResultado.error,

      r4: {
        snapshot:
          snapshotGerado,

        validacao,

        congelamento,

        decisao,

        sincronizacao_auditoria:
          sincronizacaoAuditoria,

        resolucao_identidade:
          resolucao,

        core,

        multivalorados,

        finalizacao,

        encerramento,
      },
    });
  } catch (error) {
    const mensagem =
      error instanceof Error
        ? error.message
        : "Erro inesperado.";

    console.error(
      "[aprovar-morador] erro:",
      error
    );

    /*
     * Compensação segura do Auth.
     *
     * Antes de apagar um Auth recém-criado,
     * confirmamos que o Core realmente não foi persistido.
     */

    if (
      supabaseAdmin &&
      authCriadoNestaExecucao &&
      !coreConcluido
    ) {
      try {
        let corePersistidoAposErro =
          false;

        if (
          sagaSnapshotId &&
          sagaCorrelationId
        ) {
          const operacaoCoreAposErro =
            await localizarOperacaoSaga({
              supabaseAdmin,

              snapshotId:
                sagaSnapshotId,

              correlationId:
                sagaCorrelationId,

              operacaoTipo:
                "PROMOVER_DADOS_COMPLEMENTARES",
            });

          corePersistidoAposErro =
            Boolean(
              operacaoCoreAposErro
                ?.id
            );
        }

        if (
          corePersistidoAposErro
        ) {
          coreConcluido =
            true;

          console.info(
            "[aprovar-morador] Core persistido localizado após erro; Auth não será compensado."
          );
        } else {
          const {
            error:
              deleteAuthError,
          } =
            await supabaseAdmin
              .auth
              .admin
              .deleteUser(
                authCriadoNestaExecucao
              );

          if (
            deleteAuthError
          ) {
            console.error(
              "[aprovar-morador] falha ao compensar Auth recém-criado:",
              deleteAuthError
            );
          } else {
            console.info(
              "[aprovar-morador] Auth recém-criado compensado após falha comprovadamente pré-Core."
            );
          }
        }
      } catch (
        compensationError
      ) {
        console.error(
          "[aprovar-morador] erro ao verificar/compensar Auth:",
          compensationError
        );
      }
    }

    return jsonResponse(
      {
        success:
          false,

        error:
          mensagem,
      },
      500
    );
  }
});