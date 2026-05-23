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

function normalizarCodigo(value = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

function normalizarUsername(nome = "") {
  const partes = String(nome)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (partes.length >= 2) {
    return `${partes[0]}.${partes[partes.length - 1]}`;
  }

  return partes[0] || `usuario.${crypto.randomUUID().slice(0, 6)}`;
}

function montarBusinessId(codigoCondominio = "") {
  const codigo = normalizarCodigo(codigoCondominio || "COND");
  return `${codigo}-SIND-001`;
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

function montarHtmlEmailAprovacao({
  nome,
  username,
  nomeCondominio,
  codigoCondominio,
  linkAcesso,
  linkAvaliacao,
  empresaEndereco,
}: {
  nome: string;
  username: string;
  nomeCondominio: string;
  codigoCondominio: string;
  linkAcesso: string;
  linkAvaliacao: string;
  empresaEndereco: string;
}) {
  return `
<div style="background:#f4f7fb;padding:20px;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:#003fbd;padding:20px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:22px">
        Chegou<span style="color:#ff7900">!</span>
      </h1>
      <p style="margin:5px 0 0;color:#dbeafe;font-size:13px">
        Gestão Inteligente de Condomínios
      </p>
    </div>

    <div style="padding:22px">
      <p>Olá <strong>${nome}</strong>,</p>

      <p>
        Que alegria informar que o cadastro do condomínio
        <strong>${nomeCondominio}</strong> foi
        <strong style="color:#16a34a">aprovado com sucesso</strong>.
      </p>

      <p>
        Antes de acessar o sistema, você será direcionado para criar sua senha de acesso
        com segurança. Após concluir essa etapa, o acesso ao módulo administrativo do
        condomínio será liberado.
      </p>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin:18px 0">
        <p style="margin:0 0 8px"><strong>Dados de acesso:</strong></p>
        <p style="margin:0 0 6px"><strong>Login:</strong> ${username}</p>
        <p style="margin:0"><strong>Código do Condomínio:</strong> ${codigoCondominio}</p>
      </div>

      <p>
        Esses dados são pessoais e de uso exclusivo do responsável autorizado.
        Não compartilhe seu login, código de acesso ou credenciais com terceiros.
      </p>

      <p>
        Conforme os Termos de Uso e Política de Privacidade aceitos no cadastro,
        cada usuário deverá utilizar seu próprio acesso, garantindo segurança,
        rastreabilidade e responsabilidade individual nas ações realizadas dentro
        do sistema.
      </p>

      <div style="text-align:center;margin:26px 0">
        <a href="${linkAcesso}"
          style="background:#003fbd;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
          Criar minha senha
        </a>
      </div>

      <div style="text-align:center;margin:12px 0;opacity:0;height:0;overflow:hidden">
        <a href="${linkAvaliacao}"
          style="background:#ff7900;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
          Avaliar experiência do cadastro
        </a>
      </div>

      <p style="font-size:13px;color:#64748b;margin-top:20px">
        Caso o botão acima não funcione, copie e cole o link abaixo no navegador:
      </p>

      <p style="word-break:break-all;color:#003fbd;font-size:12px">
        ${linkAcesso}
      </p>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">

      <p style="font-size:12px;color:#64748b">
        Próximos passos recomendados: cadastrar ou validar funcionários autorizados,
        organizar perfis de acesso, iniciar o cadastro dos moradores e orientar a equipe
        sobre o uso correto do sistema.
      </p>

      <p style="margin-top:18px">
        <strong>Equipe Chegou<span style="color:#ff7900">!</span></strong>
      </p>
    </div>

    <div style="background:#f8fafc;padding:16px;text-align:center;font-size:11px;color:#64748b">
      <p style="margin:0">
        Este é um e-mail automático. Não responda esta mensagem.
      </p>

      <p style="margin:6px 0">
        ${empresaEndereco}
      </p>

      <p style="margin:6px 0">
        © 2026 Chegou<span style="color:#ff7900">!</span> Todos os direitos reservados.
      </p>
    </div>
  </div>
</div>
`;
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
  } catch (logError) {
    console.error(`Erro ao registrar log ${acao}:`, logError);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Método não permitido." }, 405);
    }

    const body = await req.json();

    const {
      condominio_id,
      aprovado_por_usuario_id = null,
      aprovado_por_nome = null,
      aprovado_por_email = null,
      email_assunto = null,
      email_html_preview = null,
    } = body;

    if (!condominio_id) {
      return jsonResponse({ error: "condominio_id é obrigatório." }, 400);
    }

    const ip = obterIp(req);
    const userAgent = req.headers.get("user-agent") || "";
    const sistemaOperacional = detectarSistemaOperacional(userAgent);
    const navegador = detectarNavegador(userAgent);

    const contextoRequisicao = {
      ip,
      user_agent: userAgent,
      sistema_operacional: sistemaOperacional,
      navegador,
      localizacao: null,
      localizacao_status: "nao_solicitada",
    };

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        { error: "Variáveis SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes." },
        500
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: condominio, error: condominioError } = await supabaseAdmin
      .from("condominios")
      .select(`
        id,
        cnpj,
        codigo_condominio,
        razao_social,
        nome_fantasia,
        email_condominio,
        telefone_condominio,
        status_cadastro,
        responsavel_logistica (
          id,
          nome,
          email,
          telefone,
          funcao,
          status
        )
      `)
      .eq("id", condominio_id)
      .single();

    if (condominioError || !condominio) {
      return jsonResponse({ error: "Condomínio não encontrado." }, 404);
    }

    if (condominio.status_cadastro === "ativo") {
      return jsonResponse(
        { error: "Este condomínio já está ativo/aprovado." },
        409
      );
    }

    const responsavel = condominio.responsavel_logistica?.[0];

    if (!responsavel?.email) {
      return jsonResponse(
        { error: "Responsável sem e-mail cadastrado." },
        400
      );
    }

    const email = String(responsavel.email).trim().toLowerCase();
    const nome = responsavel.nome || "Responsável do Condomínio";
    const username = normalizarUsername(nome);
    const nomeCondominio =
      condominio.nome_fantasia || condominio.razao_social || "Condomínio";
    const codigoCondominio = normalizarCodigo(
      condominio.codigo_condominio || "NAOINFORMADO"
    );
    const businessId = montarBusinessId(codigoCondominio);

    const { data: usuariosExistentes, error: listarAuthError } =
      await supabaseAdmin.auth.admin.listUsers();

    if (listarAuthError) throw listarAuthError;

    const usuarioAuthExistente = usuariosExistentes.users.find(
      (user) => user.email?.toLowerCase() === email
    );

    let authUserId = usuarioAuthExistente?.id;

    if (!authUserId) {
      const { data: novoUsuario, error: criarAuthError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            nome,
            username,
            tipo: "admin_logistica",
            nivel_id: 4,
            condominio_id: condominio.id,
            codigo_condominio: codigoCondominio,
            business_id: businessId,
          },
        });

      if (criarAuthError || !novoUsuario?.user?.id) {
        throw criarAuthError || new Error("Erro ao criar usuário Auth.");
      }

      authUserId = novoUsuario.user.id;
    } else {
      const { error: atualizarAuthError } =
        await supabaseAdmin.auth.admin.updateUserById(authUserId, {
          email_confirm: true,
          user_metadata: {
            nome,
            username,
            tipo: "admin_logistica",
            nivel_id: 4,
            condominio_id: condominio.id,
            codigo_condominio: codigoCondominio,
            business_id: businessId,
          },
        });

      if (atualizarAuthError) throw atualizarAuthError;
    }

    const { data: usuarioExistente } = await supabaseAdmin
      .from("usuarios")
      .select("id")
      .eq("id", authUserId)
      .maybeSingle();

    const payloadUsuario = {
      id: authUserId,
      business_id: businessId,
      nome,
      username,
      email,
      condominio_id: condominio.id,
      nivel_id: 4,
      ativo: true,
      status_cadastro: "ativo",
      primeiro_acesso: true,
      notificacoes_ativas: true,
      token_revogado: false,
      permite_visibilidade: false,
      data_nascimento: null,
      permite_exibir_aniversario: false,
    };

    if (usuarioExistente) {
      const { error: atualizarUsuarioError } = await supabaseAdmin
        .from("usuarios")
        .update(payloadUsuario)
        .eq("id", authUserId);

      if (atualizarUsuarioError) throw atualizarUsuarioError;
    } else {
      const { error: inserirUsuarioError } = await supabaseAdmin
        .from("usuarios")
        .insert(payloadUsuario);

      if (inserirUsuarioError) throw inserirUsuarioError;
    }

    const { data: vinculoExistente, error: buscarVinculoError } = await supabaseAdmin
      .from("usuario_condominio_vinculos")
      .select("id")
      .eq("usuario_id", authUserId)
      .eq("condominio_id", condominio.id)
      .maybeSingle();

    if (buscarVinculoError) throw buscarVinculoError;

    const payloadVinculo = {
      usuario_id: authUserId,
      condominio_id: condominio.id,
      username,
      email_login: email,
      tipo_vinculo: "administrativo",
      cargo: "Responsável de Logística",
      ativo: true,
    };

    if (vinculoExistente) {
      const { error: atualizarVinculoError } = await supabaseAdmin
        .from("usuario_condominio_vinculos")
        .update(payloadVinculo)
        .eq("id", vinculoExistente.id);

    if (atualizarVinculoError) throw atualizarVinculoError;
  } else {
    const { error: inserirVinculoError } = await supabaseAdmin
      .from("usuario_condominio_vinculos")
      .insert(payloadVinculo);

    if (inserirVinculoError) throw inserirVinculoError;
  }

    const { error: atualizarResponsavelError } = await supabaseAdmin
      .from("responsavel_logistica")
      .update({
        status: "ativo",
        atualizado_em: new Date().toISOString(),
      })
      .eq("condominio_id", condominio.id)
      .eq("email", email);

    if (atualizarResponsavelError) throw atualizarResponsavelError;

    const agora = new Date().toISOString();

    const { error: atualizarCondominioError } = await supabaseAdmin
      .from("condominios")
      .update({
        codigo_condominio: codigoCondominio,
        status_cadastro: "ativo",
        ativo: true,
        aprovado_em: agora,
        data_aprovacao: agora,
        aprovado_por: aprovado_por_usuario_id,
        motivo_rejeicao: null,
        rejeitado_em: null,
        atualizado_em: agora,
      })
      .eq("id", condominio.id);

    if (atualizarCondominioError) throw atualizarCondominioError;

    await registrarLog({
      supabaseAdmin,
      acao: "CONDOMINIO_APROVADO",
      condominio_id: condominio.id,
      usuario_id: authUserId,
      email,
      origem: "master",
      detalhes: {
        codigo_condominio: codigoCondominio,
        nome_condominio: nomeCondominio,
        username,
        nivel_atribuido: 4,
        tipo_usuario: "admin_logistica",
        aprovado_por_usuario_id,
        aprovado_por_nome,
        aprovado_por_email,
        ...contextoRequisicao,
      },
    });

    const siteUrlRecebido =
      typeof body.site_url === "string" ? body.site_url.replace(/\/$/, "") : null;

    const origensPermitidas = [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://chegou-app.vercel.app",
    ];

    const siteUrl =
      siteUrlRecebido && origensPermitidas.includes(siteUrlRecebido)
        ? siteUrlRecebido
        : (Deno.env.get("SITE_URL") || "https://chegou-app.vercel.app").replace(/\/$/, "");

    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: `${siteUrl}/criar-senha-responsavel`,
        },
      });

    if (linkError) throw linkError;

    const linkAcesso = linkData?.properties?.action_link || `${siteUrl}/login`;
    const linkAvaliacao = `${siteUrl}/wizard-condominio-avaliacao?condominio_id=${condominio.id}`;

    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    const remetenteEmail =
      Deno.env.get("BREVO_SENDER_EMAIL") || "sistemachegou@gmail.com";
    const remetenteNome =
      Deno.env.get("BREVO_SENDER_NAME") || "Chegou! Sistema";
    const empresaEndereco =
      Deno.env.get("EMPRESA_ENDERECO") ||
      "[Endereço físico da empresa — definir no módulo institucional]";

    let emailStatus = "nao_enviado";
    let brevoMessageId: string | null = null;
    let brevoErrorMessage: string | null = null;

    if (brevoApiKey) {
      const assunto =
        typeof email_assunto === "string" && email_assunto.trim()
          ? email_assunto.trim()
          : "Cadastro aprovado no Chegou! Crie sua senha de acesso";

      const htmlBase = montarHtmlEmailAprovacao({
        nome,
        username,
        nomeCondominio,
        codigoCondominio,
        linkAcesso,
        linkAvaliacao,
        empresaEndereco,
      });

      const htmlContent =
        typeof email_html_preview === "string" && email_html_preview.trim()
          ? email_html_preview
              .replaceAll("LINK_SEGURO_GERADO_PELO_SUPABASE_APOS_APROVACAO", linkAcesso)
              .replaceAll("LOGIN_RESPONSAVEL_GERADO_PELO_SISTEMA", username)
          : htmlBase;

      if (Deno.env.get("DEBUG_EMAIL_PREVIEW") === "true") {
        console.log(htmlContent);
      }

      try {
        const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": brevoApiKey,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            sender: {
              name: remetenteNome,
              email: remetenteEmail,
            },
            to: [
              {
                email,
                name: nome,
              },
            ],
            subject: assunto,
            htmlContent,
          }),
        });

        const brevoResult = await brevoResponse.json().catch(() => ({}));

        if (!brevoResponse.ok) {
          emailStatus = "erro";
          brevoErrorMessage =
            brevoResult?.message ||
            brevoResult?.error ||
            "Erro desconhecido no envio Brevo.";

          await registrarLog({
            supabaseAdmin,
            acao: "EMAIL_APROVACAO_ERRO",
            condominio_id: condominio.id,
            usuario_id: authUserId,
            email,
            origem: "sistema",
            detalhes: {
              tipo_email: "aprovacao_condominio",
              status: "erro",
              assunto,
              erro: brevoErrorMessage,
              resposta_brevo: brevoResult,
              username,
              ...contextoRequisicao,
            },
          });
        } else {
          emailStatus = "enviado";
          brevoMessageId = brevoResult?.messageId || null;

          await registrarLog({
            supabaseAdmin,
            acao: "EMAIL_APROVACAO_ENVIADO",
            condominio_id: condominio.id,
            usuario_id: authUserId,
            email,
            origem: "sistema",
            detalhes: {
              tipo_email: "aprovacao_condominio",
              status: "sucesso",
              assunto,
              message_id: brevoMessageId,
              remetente_nome: remetenteNome,
              remetente_email: remetenteEmail,
              template: "brevo_aprovacao_v2",
              username,
              ...contextoRequisicao,
            },
          });
        }
      } catch (emailError) {
        emailStatus = "erro";
        brevoErrorMessage =
          emailError instanceof Error
            ? emailError.message
            : "Erro inesperado ao enviar e-mail.";

        await registrarLog({
          supabaseAdmin,
          acao: "EMAIL_APROVACAO_ERRO",
          condominio_id: condominio.id,
          usuario_id: authUserId,
          email,
          origem: "sistema",
          detalhes: {
            tipo_email: "aprovacao_condominio",
            status: "erro",
            erro: brevoErrorMessage,
            username,
            ...contextoRequisicao,
          },
        });

        console.error("Erro ao enviar e-mail Brevo:", emailError);
      }
    } else {
      await registrarLog({
        supabaseAdmin,
        acao: "EMAIL_APROVACAO_ERRO",
        condominio_id: condominio.id,
        usuario_id: authUserId,
        email,
        origem: "sistema",
        detalhes: {
          tipo_email: "aprovacao_condominio",
          status: "erro",
          erro: "BREVO_API_KEY não configurada.",
          username,
          ...contextoRequisicao,
        },
      });
    }

    return jsonResponse({
      success: true,
      message: "Condomínio aprovado e usuário criado/liberado com sucesso.",
      condominio_id: condominio.id,
      usuario_id: authUserId,
      email,
      nome,
      username,
      nivel_id: 4,
      business_id: businessId,
      codigo_condominio: codigoCondominio,
      link_acesso: linkAcesso,
      email_status: emailStatus,
      brevo_message_id: brevoMessageId,
      brevo_error: brevoErrorMessage,
    });
  } catch (error) {
    console.error("Erro aprovar-condominio:", error);

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao aprovar condomínio.",
      },
      500
    );
  }
});