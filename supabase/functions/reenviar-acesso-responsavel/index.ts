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

function montarHtml({ nome, nomeCondominio, codigoCondominio, linkAcesso, empresaEndereco }: any) {
  return `
<div style="background:#f4f7fb;padding:20px;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:#003fbd;padding:20px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:22px">Chegou<span style="color:#ff7900">!</span></h1>
      <p style="margin:5px 0 0;color:#dbeafe;font-size:13px">Gestão Inteligente de Condomínios</p>
    </div>

    <div style="padding:22px">
      <p>Olá <strong>${nome}</strong>,</p>

      <p>Recebemos uma solicitação para reenviar o link de criação de senha do condomínio <strong>${nomeCondominio}</strong>.</p>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin:18px 0">
        <p style="margin:0 0 6px"><strong>Código do Condomínio:</strong> ${codigoCondominio}</p>
      </div>

      <p>Por segurança, este link é individual e deve ser usado apenas pelo responsável autorizado.</p>

      <div style="text-align:center;margin:26px 0">
        <a href="${linkAcesso}" style="background:#003fbd;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
          Criar minha senha
        </a>
      </div>

      <p style="font-size:13px;color:#64748b">Caso o botão não funcione, copie e cole o link abaixo no navegador:</p>
      <p style="word-break:break-all;color:#003fbd;font-size:12px">${linkAcesso}</p>

      <p style="margin-top:18px"><strong>Equipe Chegou<span style="color:#ff7900">!</span></strong></p>
    </div>

    <div style="background:#f8fafc;padding:16px;text-align:center;font-size:11px;color:#64748b">
      <p style="margin:0">Este é um e-mail automático. Não responda esta mensagem.</p>
      <p style="margin:6px 0">${empresaEndereco}</p>
      <p style="margin:6px 0">© 2026 Chegou<span style="color:#ff7900">!</span> Todos os direitos reservados.</p>
    </div>
  </div>
</div>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Método não permitido." }, 405);
    }

    const body = await req.json();
    const {
      condominio_id,
      solicitado_por_usuario_id = null,
      solicitado_por_nome = null,
      solicitado_por_email = null,
      site_url = null,
    } = body;

    if (!condominio_id) {
      return jsonResponse({ error: "condominio_id é obrigatório." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Variáveis Supabase ausentes." }, 500);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: condominio, error: condominioError } = await supabaseAdmin
      .from("condominios")
      .select(`
        id,
        codigo_condominio,
        razao_social,
        nome_fantasia,
        status_cadastro,
        ativo,
        responsavel_logistica (
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

    if (condominio.status_cadastro !== "ativo" || !condominio.ativo) {
      return jsonResponse({ error: "Reenvio permitido apenas para condomínio ativo/aprovado." }, 409);
    }

    const responsavel = condominio.responsavel_logistica?.[0];

    if (!responsavel?.email) {
      return jsonResponse({ error: "Responsável logístico sem e-mail cadastrado." }, 400);
    }

    const email = String(responsavel.email).trim().toLowerCase();
    const nome = responsavel.nome || "Responsável do Condomínio";
    const nomeCondominio = condominio.nome_fantasia || condominio.razao_social || "Condomínio";
    const codigoCondominio = condominio.codigo_condominio || "Não informado";

    const origemPermitida = typeof site_url === "string" ? site_url.replace(/\/$/, "") : null;
    const origensPermitidas = [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://chegou-app.vercel.app",
    ];

    const siteUrlFinal =
      origemPermitida && origensPermitidas.includes(origemPermitida)
        ? origemPermitida
        : (Deno.env.get("SITE_URL") || "https://chegou-app.vercel.app").replace(/\/$/, "");

    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: `${siteUrlFinal}/criar-senha-responsavel`,
        },
      });

    if (linkError) throw linkError;

    const linkAcesso = linkData?.properties?.action_link;

    if (!linkAcesso) {
      return jsonResponse({ error: "Não foi possível gerar link seguro." }, 500);
    }

    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    const remetenteEmail = Deno.env.get("BREVO_SENDER_EMAIL") || "sistemachegou@gmail.com";
    const remetenteNome = Deno.env.get("BREVO_SENDER_NAME") || "Chegou! Sistema";
    const empresaEndereco =
      Deno.env.get("EMPRESA_ENDERECO") ||
      "[Endereço físico da empresa — definir no módulo institucional]";

    if (!brevoApiKey) {
      return jsonResponse({ error: "BREVO_API_KEY não configurada." }, 500);
    }

    const assunto = "Reenvio do link de criação de senha — Chegou!";
    const htmlContent = montarHtml({
      nome,
      nomeCondominio,
      codigoCondominio,
      linkAcesso,
      empresaEndereco,
    });

    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: remetenteNome, email: remetenteEmail },
        to: [{ email, name: nome }],
        subject: assunto,
        htmlContent,
      }),
    });

    const brevoResult = await brevoResponse.json().catch(() => ({}));

    if (!brevoResponse.ok) {
      return jsonResponse({
        error: brevoResult?.message || brevoResult?.error || "Erro no envio Brevo.",
        resposta_brevo: brevoResult,
      }, 500);
    }

    await supabaseAdmin.from("logs_sistema").insert({
      acao: "REENVIO_ACESSO_RESPONSAVEL",
      condominio_id: condominio.id,
      usuario_id: solicitado_por_usuario_id,
      email,
      origem: "master",
      detalhes: {
        nome_condominio: nomeCondominio,
        codigo_condominio: codigoCondominio,
        solicitado_por_nome,
        solicitado_por_email,
        brevo_message_id: brevoResult?.messageId || null,
        tipo_email: "reenvio_primeiro_acesso_responsavel",
      },
    });

    return jsonResponse({
      success: true,
      message: "E-mail de primeiro acesso reenviado com sucesso.",
      condominio_id: condominio.id,
      email,
      brevo_message_id: brevoResult?.messageId || null,
    });
  } catch (error) {
    console.error("Erro reenviar-acesso-responsavel:", error);

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao reenviar acesso.",
      },
      500
    );
  }
});