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

function detectarSistemaOperacional(userAgent = "") {
  const ua = userAgent.toLowerCase();

  if (ua.includes("windows")) return "Windows";
  if (ua.includes("android")) return "Android";
  if (ua.includes("iphone") || ua.includes("ipad")) return "iOS";
  if (ua.includes("mac os") || ua.includes("macintosh")) return "macOS";
  if (ua.includes("linux")) return "Linux";

  return "Não identificado";
}

function detectarNavegador(userAgent = "") {
  const ua = userAgent.toLowerCase();

  if (ua.includes("edg/")) return "Microsoft Edge";
  if (ua.includes("chrome/") && !ua.includes("edg/")) return "Google Chrome";
  if (ua.includes("firefox/")) return "Mozilla Firefox";
  if (ua.includes("safari/") && !ua.includes("chrome/")) return "Safari";

  return "Não identificado";
}

async function registrarLog({
  supabaseAdmin,
  acao,
  condominio_id,
  usuario_id,
  email,
  origem,
  detalhes,
}: {
  supabaseAdmin: ReturnType<typeof createClient>;
  acao: string;
  condominio_id?: string | null;
  usuario_id?: string | null;
  email?: string | null;
  origem?: string | null;
  detalhes?: Record<string, unknown>;
}) {
  try {
    await supabaseAdmin.from("logs_sistema").insert({
      acao,
      condominio_id: condominio_id || null,
      usuario_id: usuario_id || null,
      email: email || null,
      origem: origem || "sistema",
      detalhes: detalhes || {},
    });
  } catch (error) {
    console.error(`Erro ao registrar log ${acao}:`, error);
  }
}

function montarHtmlBoasVindas({
  nome,
  nomeCondominio,
  empresaEndereco,
}: {
  nome: string;
  nomeCondominio: string;
  empresaEndereco: string;
}) {
  return `
<div style="background:#0b0f17;padding:20px;font-family:Arial,Helvetica,sans-serif;color:#e5e7eb">
  <div style="max-width:540px;margin:0 auto;background:#0f172a;border-radius:12px;overflow:hidden;border:1px solid #1e293b">

    <div style="background:#0f3f8f;padding:20px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:24px">
        Chegou<span style="color:#ff7900">!</span>
      </h1>

      <p style="margin:5px 0 0;color:#cbd5e1;font-size:13px">
        Gestão Inteligente de Encomendas
      </p>
    </div>

    <div style="padding:22px">

      <p>Olá <strong>${nome}</strong>,</p>

      <p>
        Seu cadastro no condomínio
        <strong>${nomeCondominio}</strong>
        foi aprovado com sucesso.
      </p>

      <p>
        Agora você já pode acompanhar notificações,
        entregas e movimentações das suas encomendas
        diretamente pelo sistema Chegou<span style="color:#ff7900">!</span>
      </p>

      <div style="background:#111827;border:1px solid #1f2937;border-radius:10px;padding:14px;margin:18px 0">
        <p style="margin:0;color:#cbd5e1;font-size:13px">
          Seu acesso já está liberado.
        </p>
      </div>

      <p>
        Utilize seu e-mail cadastrado para acessar o sistema.
      </p>

      <p style="margin-top:20px">
        <strong>Equipe Chegou<span style="color:#ff7900">!</span></strong>
      </p>
    </div>

    <div style="background:#020617;padding:16px;text-align:center;font-size:11px;color:#64748b">
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse(
        { error: "Método não permitido." },
        405
      );
    }

    const body = await req.json();

    const {
      auditoria_id,
      aprovado_por,
      aprovado_por_nome,
      aprovado_por_email,
    } = body;

    if (!auditoria_id) {
      return jsonResponse(
        {
          error:
            "auditoria_id obrigatório.",
        },
        400
      );
    }

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY"
      );

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        {
          error:
            "Variáveis Supabase ausentes.",
        },
        500
      );
    }

    const supabaseAdmin =
      createClient(
        supabaseUrl,
        serviceRoleKey
      );

    const ip = obterIp(req);

    const userAgent =
      req.headers.get("user-agent") || "";

    const sistemaOperacional =
      detectarSistemaOperacional(
        userAgent
      );

    const navegador =
      detectarNavegador(userAgent);

    const contextoRequisicao = {
      ip,
      user_agent: userAgent,
      sistema_operacional:
        sistemaOperacional,
      navegador,
    };

    const {
      data: auditoria,
      error: auditoriaError,
    } = await supabaseAdmin
      .from(
        "auditorias_morador"
      )
      .select(`
        *,
        pre_cadastro_moradores (*)
      `)
      .eq("id", auditoria_id)
      .maybeSingle();

    if (auditoriaError) {
      throw auditoriaError;
    }

    if (!auditoria) {
      return jsonResponse(
        {
          error:
            "Auditoria não encontrada.",
        },
        404
      );
    }

    if (
      auditoria.status_auditoria ===
      "aprovado"
    ) {
      return jsonResponse(
        {
          error:
            "Morador já aprovado.",
        },
        409
      );
    }

    const preCadastro =
      auditoria.pre_cadastro_moradores;

    if (!preCadastro) {
      return jsonResponse(
        {
          error:
            "Pré-cadastro não encontrado.",
        },
        404
      );
    }

    const email =
      String(
        preCadastro.email || ""
      )
        .trim()
        .toLowerCase();

    if (!email) {
      return jsonResponse(
        {
          error:
            "E-mail não encontrado.",
        },
        400
      );
    }

    const nome =
      preCadastro.nome ||
      "Morador";

    const {
      data: authUsers,
      error: authListError,
    } =
      await supabaseAdmin.auth.admin.listUsers();

    if (authListError) {
      throw authListError;
    }

    let usuarioAuth =
      authUsers.users.find(
        (item) =>
          item.email?.toLowerCase() ===
          email
      );

    let authUserId =
      usuarioAuth?.id || null;

    if (!authUserId) {
      const {
        data: novoAuth,
        error: createAuthError,
      } =
        await supabaseAdmin.auth.admin.createUser(
          {
            email,
            email_confirm: true,

            user_metadata: {
              nome,
              tipo:
                "morador",
              nivel_id: 6,

              condominio_id:
                auditoria.condominio_id,

              business_id:
                preCadastro.business_id,
            },
          }
        );

      if (
        createAuthError ||
        !novoAuth?.user?.id
      ) {
        throw (
          createAuthError ||
          new Error(
            "Erro ao criar Auth."
          )
        );
      }

      authUserId =
        novoAuth.user.id;
    }

    const {
      data: usuarioExistente,
    } =
      await supabaseAdmin
        .from("usuarios")
        .select("id")
        .eq("id", authUserId)
        .maybeSingle();

    const payloadUsuario = {
      id: authUserId,

      business_id:
        preCadastro.business_id,

      nome,

      email,

      telefone:
        preCadastro.telefone,

      cpf:
        preCadastro.cpf,

      condominio_id:
        auditoria.condominio_id,

      nivel_id: 6,

      ativo: true,

      status_cadastro:
        "ativo",

      primeiro_acesso: true,

      notificacoes_ativas:
        true,

      data_aprovacao:
        new Date().toISOString(),

      aprovado_por:
        aprovado_por ||
        null,

      token_revogado:
        false,
    };

    if (usuarioExistente) {
      const {
        error:
          updateUsuarioError,
      } =
        await supabaseAdmin
          .from("usuarios")
          .update(
            payloadUsuario
          )
          .eq(
            "id",
            authUserId
          );

      if (
        updateUsuarioError
      ) {
        throw updateUsuarioError;
      }
    } else {
      const {
        error:
          insertUsuarioError,
      } =
        await supabaseAdmin
          .from("usuarios")
          .insert(
            payloadUsuario
          );

      if (
        insertUsuarioError
      ) {
        throw insertUsuarioError;
      }
    }

    const agora =
      new Date().toISOString();

    await supabaseAdmin
      .from(
        "auditorias_morador"
      )
      .update({
        status_auditoria:
          "aprovado",

        aprovado_em: agora,

        aprovado_por:
          aprovado_por ||
          null,

        observacao_auditor:
          "Cadastro aprovado.",

        ip_auditor: ip,

        dispositivo_auditor:
          userAgent,

        navegador_auditor:
          navegador,
      })
      .eq(
        "id",
        auditoria.id
      );

    await supabaseAdmin
      .from(
        "pre_cadastro_moradores"
      )
      .update({
        status_cadastro:
          "ativo",

        status_auditoria:
          "aprovado",

        aprovado_em:
          agora,

        aprovado_por:
          aprovado_por ||
          null,
      })
      .eq(
        "id",
        preCadastro.id
      );

    const {
      data: convites,
    } =
      await supabaseAdmin
        .from(
          "convites_morador"
        )
        .select("id")
        .eq(
          "pre_cadastro_id",
          preCadastro.id
        );

    if (
      convites &&
      convites.length > 0
    ) {
      const ids =
        convites.map(
          (item) => item.id
        );

      await supabaseAdmin
        .from(
          "convites_morador"
        )
        .update({
          token_utilizado:
            true,

          token_revogado:
            true,

          status_envio:
            "finalizado",
        })
        .in("id", ids);
    }

    const {
      data: condominio,
    } =
      await supabaseAdmin
        .from("condominios")
        .select(`
          nome_fantasia,
          razao_social
        `)
        .eq(
          "id",
          auditoria.condominio_id
        )
        .maybeSingle();

    const nomeCondominio =
      condominio
        ?.nome_fantasia ||
      condominio
        ?.razao_social ||
      "Condomínio";

    const empresaEndereco =
      Deno.env.get(
        "EMPRESA_ENDERECO"
      ) ||
      "[Endereço físico da empresa — definir no módulo institucional]";

    const brevoApiKey =
      Deno.env.get(
        "BREVO_API_KEY"
      );

    const remetenteEmail =
      Deno.env.get(
        "BREVO_SENDER_EMAIL"
      ) ||
      "sistemachegou@gmail.com";

    const remetenteNome =
      Deno.env.get(
        "BREVO_SENDER_NAME"
      ) ||
      "Chegou! Sistema";

    let emailStatus =
      "nao_enviado";

    let brevoMessageId =
      null;

    let brevoError =
      null;

    if (brevoApiKey) {
      try {
        const htmlContent =
          montarHtmlBoasVindas(
            {
              nome,
              nomeCondominio,
              empresaEndereco,
            }
          );

        const brevoResponse =
          await fetch(
            "https://api.brevo.com/v3/smtp/email",
            {
              method:
                "POST",

              headers: {
                "api-key":
                  brevoApiKey,

                "Content-Type":
                  "application/json",

                Accept:
                  "application/json",
              },

              body:
                JSON.stringify(
                  {
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
                  }
                ),
            }
          );

        const brevoResult =
          await brevoResponse
            .json()
            .catch(
              () => ({})
            );

        if (
          !brevoResponse.ok
        ) {
          emailStatus =
            "erro";

          brevoError =
            brevoResult?.message ||
            brevoResult?.error ||
            "Erro Brevo.";
        } else {
          emailStatus =
            "enviado";

          brevoMessageId =
            brevoResult?.messageId ||
            null;
        }
      } catch (error) {
        emailStatus =
          "erro";

        brevoError =
          error instanceof Error
            ? error.message
            : "Erro inesperado.";
      }
    }

    await registrarLog({
      supabaseAdmin,

      acao:
        "MORADOR_APROVADO",

      condominio_id:
        auditoria.condominio_id,

      usuario_id:
        authUserId,

      email,

      origem:
        "auditoria_morador",

      detalhes: {
        auditoria_id:
          auditoria.id,

        pre_cadastro_id:
          preCadastro.id,

        aprovado_por,

        aprovado_por_nome,

        aprovado_por_email,

        email_status:
          emailStatus,

        brevo_message_id:
          brevoMessageId,

        brevo_error:
          brevoError,

        ...contextoRequisicao,
      },
    });

    return jsonResponse({
      success: true,

      message:
        "Morador aprovado com sucesso.",

      usuario_id:
        authUserId,

      auditoria_id:
        auditoria.id,

      pre_cadastro_id:
        preCadastro.id,

      email_status:
        emailStatus,

      brevo_message_id:
        brevoMessageId,

      brevo_error:
        brevoError,
    });
  } catch (error) {
    console.error(
      "Erro aprovar-morador:",
      error
    );

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado.",
      },
      500
    );
  }
});