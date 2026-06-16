import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type TipoEnvio = "individual" | "lote" | "reenvio" | "correcao" | "dependente";

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizarTexto(valor = "") {
  return String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizarEmail(valor = "") {
  return String(valor).trim().toLowerCase();
}

function somenteNumeros(valor = "") {
  return String(valor).replace(/\D/g, "");
}

function formatarNomeProprio(valor = "") {
  return String(valor)
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .split(" ")
    .filter(Boolean)
    .map((parte) => {
      const minusculas = ["da", "de", "do", "das", "dos", "e"];
      if (minusculas.includes(parte)) return parte;
      return parte.charAt(0).toLocaleUpperCase("pt-BR") + parte.slice(1);
    })
    .join(" ");
}

function gerarTokenSeguro() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);

  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function gerarBusinessId(prefixo = "MOR") {
  const data = new Date();
  const y = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  const random = crypto.randomUUID().slice(0, 8).toUpperCase();

  return `${prefixo}-${y}${m}${d}-${random}`;
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

function montarHtmlConviteMorador({
  nome,
  nomeCondominio,
  linkWizard,
  empresaEndereco,
}: {
  nome: string;
  nomeCondominio: string;
  linkWizard: string;
  empresaEndereco: string;
}) {
  return `
<div style="background:#f4f7fb;padding:20px;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <div style="max-width:540px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:#003fbd;padding:20px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:24px">
        Chegou<span style="color:#ff7900">!</span>
      </h1>
      <p style="margin:5px 0 0;color:#dbeafe;font-size:13px">
        Gestão Inteligente de Encomendas
      </p>
    </div>

    <div style="padding:22px">
      <p>Olá <strong>${nome}</strong>,</p>

      <p>
        Você recebeu um convite para completar seu cadastro no sistema
        Chegou<span style="color:#ff7900">!</span> do condomínio
        <strong>${nomeCondominio}</strong>.
      </p>

      <p>
        O cadastro é necessário para liberar o acompanhamento, recebimento
        e notificações das suas encomendas.
      </p>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin:18px 0">
        <p style="margin:0;color:#475569;font-size:13px">
          Este link é pessoal, seguro e de uso único. Não compartilhe com terceiros.
        </p>
      </div>

      <div style="text-align:center;margin:26px 0">
        <a href="${linkWizard}"
          style="background:#003fbd;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
          Completar meu cadastro
        </a>
      </div>

      <p style="font-size:13px;color:#64748b;margin-top:20px">
        Caso o botão acima não funcione, copie e cole o link abaixo no navegador:
      </p>

      <p style="word-break:break-all;color:#003fbd;font-size:12px">${linkWizard}</p>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">

      <p style="font-size:12px;color:#64748b">
        Após o envio do cadastro, os dados serão analisados pelo responsável autorizado do condomínio.
      </p>

      <p style="margin-top:18px">
        <strong>Equipe Chegou<span style="color:#ff7900">!</span></strong>
      </p>
    </div>

    <div style="background:#f8fafc;padding:16px;text-align:center;font-size:11px;color:#64748b">
      <p style="margin:0">Este é um e-mail automático. Não responda esta mensagem.</p>
      <p style="margin:6px 0">${empresaEndereco}</p>
      <p style="margin:6px 0">© 2026 Chegou<span style="color:#ff7900">!</span> Todos os direitos reservados.</p>
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
  } catch (error) {
    console.error(`Erro ao registrar log ${acao}:`, error);
  }
}

function compararCampos(dadosAtuais: Record<string, unknown>, dadosNovos: Record<string, unknown>) {
  const campos = ["nome", "email", "telefone", "torre", "unidade"];
  const divergencias: Record<string, { anterior: unknown; novo: unknown }> = {};

  for (const campo of campos) {
    const anterior = normalizarTexto(String(dadosAtuais?.[campo] ?? ""));
    const novo = normalizarTexto(String(dadosNovos?.[campo] ?? ""));

    if (anterior !== novo) {
      divergencias[campo] = {
        anterior: dadosAtuais?.[campo] ?? null,
        novo: dadosNovos?.[campo] ?? null,
      };
    }
  }

  return divergencias;
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
      pre_cadastro_id = null,
      nome = null,
      email = null,
      telefone = null,
      torre = null,
      unidade = null,
      unidade_id = null,
      tipo_envio = "individual",
      origem_cadastro = "manual",
      enviado_por = null,
      prioridade = 0,
      enviar_agora = false,
      observacoes = null,
      site_url = null,
    } = body as {
      condominio_id?: string;
      pre_cadastro_id?: string | null;
      nome?: string | null;
      email?: string | null;
      telefone?: string | null;
      torre?: string | null;
      unidade?: string | null;
      unidade_id?: string | null;
      tipo_envio?: TipoEnvio;
      origem_cadastro?: string;
      enviado_por?: string | null;
      prioridade?: number;
      enviar_agora?: boolean;
      observacoes?: string | null;
      site_url?: string | null;
    };

    if (!condominio_id) {
      return jsonResponse({ error: "condominio_id é obrigatório." }, 400);
    }

    if (!nome) {
      return jsonResponse({ error: "nome é obrigatório." }, 400);
    }

    if (!email) {
      return jsonResponse({ error: "email é obrigatório." }, 400);
    }

    if (!telefone || somenteNumeros(telefone).length < 10) {
      return jsonResponse({ error: "telefone/WhatsApp é obrigatório." }, 400);
    }

    if (!torre) {
      return jsonResponse({ error: "torre/bloco é obrigatório." }, 400);
    }

    if (!unidade) {
      return jsonResponse({ error: "unidade é obrigatória." }, 400);
    }

    const nomeFormatado = formatarNomeProprio(nome);
    const emailNormalizado = normalizarEmail(email);
    const telefoneNormalizado = telefone ? `+${somenteNumeros(telefone)}` : null;
    const torreNormalizada = String(torre).trim();
    const unidadeNormalizada = String(unidade).trim();

    const ip = obterIp(req);
    const userAgent = req.headers.get("user-agent") || "";
    const sistemaOperacional = detectarSistemaOperacional(userAgent);
    const navegador = detectarNavegador(userAgent);

    const contextoRequisicao = {
      ip,
      user_agent: userAgent,
      sistema_operacional: sistemaOperacional,
      navegador,
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
      .select("id, razao_social, nome_fantasia, ativo, status_cadastro, codigo_condominio")
      .eq("id", condominio_id)
      .single();

    if (condominioError || !condominio) {
      return jsonResponse({ error: "Condomínio não encontrado." }, 404);
    }

    if (!condominio.ativo || condominio.status_cadastro !== "ativo") {
      return jsonResponse({ error: "Condomínio não está ativo para envio de convites." }, 409);
    }

    let preCadastroExistente = null;

    const { data: torreEncontrada, error: torreError } = await supabaseAdmin
      .from("torres")
      .select("id, nome, identificador")
      .eq("condominio_id", condominio_id)
      .eq("nome", torreNormalizada)
      .maybeSingle();

    if (torreError) throw torreError;

    if (!torreEncontrada) {
      return jsonResponse(
        { error: "Torre não cadastrada para este condomínio." },
        400
      );
    }

    if (pre_cadastro_id) {
      const { data } = await supabaseAdmin
        .from("pre_cadastro_moradores")
        .select("*")
        .eq("id", pre_cadastro_id)
        .eq("condominio_id", condominio_id)
        .maybeSingle();

      preCadastroExistente = data;
    }

    if (!preCadastroExistente) {
      const { data } = await supabaseAdmin
        .from("pre_cadastro_moradores")
        .select("*")
        .eq("condominio_id", condominio_id)
        .eq("email", emailNormalizado)
        .maybeSingle();

      preCadastroExistente = data;
    }

    const dadosNovos = {
      nome: nomeFormatado,
      email: emailNormalizado,
      telefone: telefoneNormalizado,
      torre: torreNormalizada,
      bloco: null,
      unidade: unidadeNormalizada,
      cpf: null,
      tipo_morador: "morador",
    };

    const divergencias = preCadastroExistente
      ? compararCampos(preCadastroExistente, dadosNovos)
      : {};

    const possuiDivergencia = Object.keys(divergencias).length > 0;

    const token = gerarTokenSeguro();
    const agora = new Date();
    const expiraEm = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const businessId =
      preCadastroExistente?.business_id ||
      gerarBusinessId(condominio.codigo_condominio || "MOR");

    const payloadPreCadastro = {
      business_id: businessId,
      condominio_id,
      unidade_id: unidade_id || preCadastroExistente?.unidade_id || null,
      nome: nomeFormatado,
      email: emailNormalizado,
      telefone: telefoneNormalizado,
      cpf: null,
      torre: torreNormalizada,
      bloco: null,
      unidade: unidadeNormalizada,
      tipo_morador: "morador",
      origem_cadastro,
      status_cadastro: "aguardando_preenchimento",
      status_convite: enviar_agora ? "enviado" : "aguardando_envio",
      status_auditoria: "nao_enviado",
      percentual_preenchimento: 0,
      possui_divergencia: possuiDivergencia,
      divergencias,
      dados_anteriores: preCadastroExistente || {},
      dados_importados: dadosNovos,
      observacoes,
      token_convite: token,
      token_expira_em: expiraEm,
      ultimo_reenvio_em: preCadastroExistente ? agora.toISOString() : null,
      quantidade_reenvios: preCadastroExistente
        ? Number(preCadastroExistente.quantidade_reenvios || 0) + 1
        : 0,
      fila_prioridade: prioridade,
      ip_ultimo_acesso: ip,
      dispositivo_ultimo_acesso: userAgent,
      navegador_ultimo_acesso: navegador,
      sistema_operacional: sistemaOperacional,
    };

    let preCadastro;

    if (preCadastroExistente) {
      const { data, error } = await supabaseAdmin
        .from("pre_cadastro_moradores")
        .update(payloadPreCadastro)
        .eq("id", preCadastroExistente.id)
        .select("*")
        .single();

      if (error) throw error;
      preCadastro = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from("pre_cadastro_moradores")
        .insert(payloadPreCadastro)
        .select("*")
        .single();

      if (error) throw error;
      preCadastro = data;
    }

    const siteUrlRecebido =
      typeof site_url === "string" ? site_url.replace(/\/$/, "") : null;

    const origensPermitidas = [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://chegou-app.vercel.app",
    ];

    const siteUrl =
      siteUrlRecebido && origensPermitidas.includes(siteUrlRecebido)
        ? siteUrlRecebido
        : (Deno.env.get("SITE_URL") || "https://chegou-app.vercel.app").replace(/\/$/, "");

    const linkWizard = `${siteUrl}/wizard-morador?token=${token}`;

    const tipoEnvioFinal = tipo_envio || "individual";
    const statusEnvio = enviar_agora ? "enviado" : "aguardando_envio";

    const { data: convite, error: conviteError } = await supabaseAdmin
      .from("convites_morador")
      .insert({
        business_id: gerarBusinessId("CONV"),
        condominio_id,
        pre_cadastro_id: preCadastro.id,
        usuario_id: null,
        email_destino: emailNormalizado,
        nome_destino: nomeFormatado,
        tipo_envio: tipoEnvioFinal,
        canal_envio: "email",
        origem_envio: origem_cadastro || "administrativo",
        status_envio: statusEnvio,
        prioridade,
        token_convite: token,
        token_utilizado: false,
        token_revogado: false,
        token_expira_em: expiraEm,
        enviado_em: enviar_agora ? agora.toISOString() : null,
        quantidade_tentativas: enviar_agora ? 1 : 0,
        ultimo_reenvio_em: preCadastroExistente ? agora.toISOString() : null,
        assunto_email: "Complete seu cadastro no Chegou!",
        template_email: "convite_morador_v2",
        payload_envio: {
          nome: nomeFormatado,
          email: emailNormalizado,
          telefone: telefoneNormalizado,
          nome_condominio: condominio.nome_fantasia || condominio.razao_social,
          link_wizard: linkWizard,
        },
        enviado_por,
      })
      .select("*")
      .single();

    if (conviteError) throw conviteError;

    const nomeCondominio = condominio.nome_fantasia || condominio.razao_social || "Condomínio";
    const empresaEndereco =
      Deno.env.get("EMPRESA_ENDERECO") ||
      "[Endereço físico da empresa — definir no módulo institucional]";

    const assunto = "Complete seu cadastro no Chegou!";
    const htmlContent = montarHtmlConviteMorador({
      nome: nomeFormatado || "Morador",
      nomeCondominio,
      linkWizard,
      empresaEndereco,
    });

    const { data: filaEmail, error: filaError } = await supabaseAdmin
      .from("fila_emails")
      .insert({
        business_id: gerarBusinessId("EMAIL"),
        condominio_id,
        usuario_id: null,
        pre_cadastro_id: preCadastro.id,
        auditoria_id: null,
        convite_id: convite.id,
        tipo_email: "convite_morador",
        categoria_email: "convite",
        origem_email: origem_cadastro || "administrativo",
        email_destino: emailNormalizado,
        nome_destino: nomeFormatado,
        assunto,
        template_email: "convite_morador_v2",
        payload: {
          nome: nomeFormatado,
          nome_condominio: nomeCondominio,
          link_wizard: linkWizard,
          html_content: htmlContent,
        },
        prioridade,
        peso_envio: prioridade,
        status_envio: enviar_agora ? "processando" : "aguardando_envio",
        limite_diario_grupo: "convites",
        proxima_tentativa_em: agora.toISOString(),
        envio_lote: tipoEnvioFinal === "lote",
        lote_id: tipoEnvioFinal === "lote" ? `LOTE-${condominio_id}-${agora.toISOString().slice(0, 10)}` : null,
        criado_por: enviado_por,
      })
      .select("*")
      .single();

    if (filaError) throw filaError;

    let emailStatus = "fila";
    let brevoMessageId: string | null = null;
    let brevoErrorMessage: string | null = null;

    if (enviar_agora) {
      const brevoApiKey = Deno.env.get("BREVO_API_KEY");
      const remetenteEmail = Deno.env.get("BREVO_SENDER_EMAIL") || "sistemachegou@gmail.com";
      const remetenteNome = Deno.env.get("BREVO_SENDER_NAME") || "Chegou! Sistema";

      if (!brevoApiKey) {
        emailStatus = "erro";
        brevoErrorMessage = "BREVO_API_KEY não configurada.";

        await supabaseAdmin
          .from("fila_emails")
          .update({
            status_envio: "erro_envio",
            erro_em: new Date().toISOString(),
            mensagem_erro: brevoErrorMessage,
            processado: false,
          })
          .eq("id", filaEmail.id);
      } else {
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
                  email: emailNormalizado,
                  name: nomeFormatado || "Morador",
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
              brevoResult?.message || brevoResult?.error || "Erro desconhecido no envio Brevo.";

            await supabaseAdmin
              .from("fila_emails")
              .update({
                status_envio: "erro_envio",
                erro_em: new Date().toISOString(),
                mensagem_erro: brevoErrorMessage,
                resposta_brevo: brevoResult,
                quantidade_tentativas: 1,
                processado: false,
              })
              .eq("id", filaEmail.id);

            await supabaseAdmin
              .from("convites_morador")
              .update({
                status_envio: "erro_envio",
                erro_envio_em: new Date().toISOString(),
                mensagem_erro: brevoErrorMessage,
                resposta_brevo: brevoResult,
              })
              .eq("id", convite.id);
          } else {
            emailStatus = "enviado";
            brevoMessageId = brevoResult?.messageId || null;

            await supabaseAdmin
              .from("fila_emails")
              .update({
                status_envio: "enviado",
                enviado_em: new Date().toISOString(),
                brevo_message_id: brevoMessageId,
                resposta_brevo: brevoResult,
                processado: true,
              })
              .eq("id", filaEmail.id);

            await supabaseAdmin
              .from("convites_morador")
              .update({
                status_envio: "enviado",
                enviado_em: new Date().toISOString(),
                brevo_message_id: brevoMessageId,
                resposta_brevo: brevoResult,
              })
              .eq("id", convite.id);

            await supabaseAdmin
              .from("pre_cadastro_moradores")
              .update({
                status_convite: "enviado",
                convite_enviado_em: new Date().toISOString(),
              })
              .eq("id", preCadastro.id);
          }
        } catch (error) {
          emailStatus = "erro";
          brevoErrorMessage =
            error instanceof Error ? error.message : "Erro inesperado ao enviar e-mail.";

          await supabaseAdmin
            .from("fila_emails")
            .update({
              status_envio: "erro_envio",
              erro_em: new Date().toISOString(),
              mensagem_erro: brevoErrorMessage,
              processado: false,
            })
            .eq("id", filaEmail.id);
        }
      }
    }

    await registrarLog({
      supabaseAdmin,
      acao: preCadastroExistente ? "CONVITE_MORADOR_REPROCESSADO" : "CONVITE_MORADOR_CRIADO",
      condominio_id,
      usuario_id: enviado_por,
      email: emailNormalizado,
      origem: origem_cadastro || "administrativo",
      detalhes: {
        pre_cadastro_id: preCadastro.id,
        convite_id: convite.id,
        fila_email_id: filaEmail.id,
        tipo_envio: tipoEnvioFinal,
        enviar_agora,
        possui_divergencia: possuiDivergencia,
        divergencias,
        status_email: emailStatus,
        brevo_message_id: brevoMessageId,
        brevo_error: brevoErrorMessage,
        ...contextoRequisicao,
      },
    });

    return jsonResponse({
      success: true,
      message: enviar_agora
        ? "Convite processado para envio imediato."
        : "Convite criado e adicionado à fila de envio.",
      pre_cadastro_id: preCadastro.id,
      convite_id: convite.id,
      fila_email_id: filaEmail.id,
      email: emailNormalizado,
      status_email: emailStatus,
      possui_divergencia: possuiDivergencia,
      divergencias,
      link_wizard: linkWizard,
      brevo_message_id: brevoMessageId,
      brevo_error: brevoErrorMessage,
    });
  } catch (error) {
      console.error("Erro enviar-convite-morador:", error);

      return jsonResponse(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Erro inesperado ao enviar convite do morador.",
          detalhes: error,
        },
        500
      );
    }
});