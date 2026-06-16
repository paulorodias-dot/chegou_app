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

function agoraBrasilia() {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date());

  const mapa = Object.fromEntries(partes.map((p) => [p.type, p.value]));

  return {
    hora: Number(mapa.hour),
    minuto: Number(mapa.minute),
    dataHoraTexto: `${mapa.year}-${mapa.month}-${mapa.day} ${mapa.hour}:${mapa.minute}:${mapa.second}`,
  };
}

function dentroJanelaEnvio() {
  const brasilia = agoraBrasilia();

  return brasilia.hora >= 8 && brasilia.hora < 20;
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
      origem: origem || "processar_fila_emails",
      detalhes: detalhes || {},
    });
  } catch (error) {
    console.error(`Erro ao registrar log ${acao}:`, error);
  }
}

async function criarNotificacaoErroEnvio({
  supabaseAdmin,
  item,
  erro,
}: {
  supabaseAdmin: ReturnType<typeof createClient>;
  item: Record<string, any>;
  erro: string;
}) {
  const { data: preCadastro } = await supabaseAdmin
    .from("pre_cadastro_moradores")
    .select("id, nome, email, torre, unidade, business_id, condominio_id")
    .eq("id", item.pre_cadastro_id)
    .maybeSingle();

  await supabaseAdmin.from("notificacoes").insert({
    usuario_id: null,
    titulo: "Falha no envio do convite",
    mensagem: `Não foi possível entregar o convite para ${
      preCadastro?.nome || item.nome_destino || "morador"
    }. Revise o e-mail e entre em contato com o morador para ajuste.`,
    tipo: "erro_envio_convite",
    lida: false,
    origem: "processar_fila_emails",
    business_id: preCadastro?.business_id || item.business_id || null,
    condominio_id: preCadastro?.condominio_id || item.condominio_id || null,
    prioridade: "alta",
    icone: "mail-warning",
    modulo: "moradores",
    destino_tipo: "administrativo",
    enviada_in_app: true,
    enviada_email: false,
    metadata: {
      pre_cadastro_id: item.pre_cadastro_id,
      convite_id: item.convite_id,
      fila_email_id: item.id,
      nome: preCadastro?.nome || item.nome_destino || null,
      email: preCadastro?.email || item.email_destino || null,
      torre: preCadastro?.torre || null,
      unidade: preCadastro?.unidade || null,
      motivo_tecnico: erro,
      orientacao:
        "Após 3 tentativas, o envio automático foi interrompido. O administrativo deve revisar o e-mail do morador.",
    },
  });
}

async function atualizarStatusRelacionado({
  supabaseAdmin,
  item,
  status,
  enviadoEm = null,
  brevoResult = null,
  brevoMessageId = null,
  mensagemErro = null,
}: {
  supabaseAdmin: ReturnType<typeof createClient>;
  item: Record<string, any>;
  status: "processando" | "aguardando_envio" | "enviado" | "erro_envio";
  enviadoEm?: string | null;
  brevoResult?: Record<string, unknown> | null;
  brevoMessageId?: string | null;
  mensagemErro?: string | null;
}) {
  if (item.convite_id) {
    const payloadConvite: Record<string, unknown> = {
      status_envio: status,
      updated_at: new Date().toISOString(),
    };

    if (enviadoEm) payloadConvite.enviado_em = enviadoEm;
    if (brevoResult) payloadConvite.resposta_brevo = brevoResult;
    if (brevoMessageId) payloadConvite.brevo_message_id = brevoMessageId;
    if (mensagemErro) payloadConvite.mensagem_erro = mensagemErro;

    await supabaseAdmin
      .from("convites_morador")
      .update(payloadConvite)
      .eq("id", item.convite_id);
  }

  if (item.pre_cadastro_id) {
    const payloadPre: Record<string, unknown> = {
      status_convite: status,
      atualizado_em: new Date().toISOString(),
    };

    if (enviadoEm) payloadPre.convite_enviado_em = enviadoEm;

    await supabaseAdmin
      .from("pre_cadastro_moradores")
      .update(payloadPre)
      .eq("id", item.pre_cadastro_id);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        { success: false, error: "SUPABASE_URL ou SERVICE_ROLE ausente." },
        500
      );
    }

    if (!brevoApiKey) {
      return jsonResponse(
        { success: false, error: "BREVO_API_KEY não configurada." },
        500
      );
    }

    if (!dentroJanelaEnvio()) {
      return jsonResponse({
        success: true,
        enviado: false,
        motivo: "Fora da janela de envio 08h às 20h Brasília.",
        horario_brasilia: agoraBrasilia().dataHoraTexto,
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const remetenteEmail =
      Deno.env.get("BREVO_SENDER_EMAIL") || "sistemachegou@gmail.com";

    const remetenteNome =
      Deno.env.get("BREVO_SENDER_NAME") || "Chegou! Sistema";

    const { data: configuracao } = await supabaseAdmin
      .from("configuracoes_envio_email")
      .select("*")
      .eq("ativo", true)
      .limit(1)
      .maybeSingle();

    if (configuracao?.pausar_envios) {
      return jsonResponse({
        success: true,
        enviado: false,
        motivo: "Envios pausados nas configurações.",
      });
    }

    const maxTentativas = Number(configuracao?.max_tentativas || 3);
    const limiteDiarioConvites = Number(configuracao?.limite_diario_convites || 40);

    const umMinutoAtras = new Date(Date.now() - 60 * 1000).toISOString();

    const { count: enviadosUltimoMinuto } = await supabaseAdmin
      .from("fila_emails")
      .select("id", { count: "exact", head: true })
      .eq("status_envio", "enviado")
      .gte("enviado_em", umMinutoAtras);

    if (Number(enviadosUltimoMinuto || 0) > 0) {
      return jsonResponse({
        success: true,
        enviado: false,
        motivo: "Anti-spam ativo: já houve envio no último minuto.",
      });
    }

    const inicioDia = new Date();
    inicioDia.setHours(0, 0, 0, 0);

    const fimDia = new Date();
    fimDia.setHours(23, 59, 59, 999);

    const { count: convitesHoje } = await supabaseAdmin
      .from("fila_emails")
      .select("id", { count: "exact", head: true })
      .eq("categoria_email", "convite")
      .eq("status_envio", "enviado")
      .gte("enviado_em", inicioDia.toISOString())
      .lte("enviado_em", fimDia.toISOString());

    if (Number(convitesHoje || 0) >= limiteDiarioConvites) {
      return jsonResponse({
        success: true,
        enviado: false,
        motivo: "Limite diário de convites atingido.",
        limite_diario_convites: limiteDiarioConvites,
      });
    }

    const agora = new Date().toISOString();

    const { data: fila, error: filaError } = await supabaseAdmin
      .from("fila_emails")
      .select("*")
      .in("status_envio", ["aguardando_envio", "erro_envio"])
      .eq("pausado", false)
      .eq("cancelado", false)
      .eq("processado", false)
      .lte("quantidade_tentativas", maxTentativas - 1)
      .or(`proxima_tentativa_em.is.null,proxima_tentativa_em.lte.${agora}`)
      .order("prioridade", { ascending: false })
      .order("peso_envio", { ascending: false })
      .order("criado_em", { ascending: true })
      .limit(1);

    if (filaError) throw filaError;

    const item = fila?.[0];

    if (!item) {
      return jsonResponse({
        success: true,
        enviado: false,
        motivo: "Nenhum e-mail pendente elegível na fila.",
      });
    }

    const { data: itemBloqueado, error: lockError } = await supabaseAdmin
      .from("fila_emails")
      .update({
        status_envio: "processando",
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", item.id)
      .in("status_envio", ["aguardando_envio", "erro_envio"])
      .select("*")
      .maybeSingle();

    if (lockError) throw lockError;

    if (!itemBloqueado) {
      return jsonResponse({
        success: true,
        enviado: false,
        motivo: "Item já foi capturado por outro processamento.",
      });
    }

    await atualizarStatusRelacionado({
      supabaseAdmin,
      item,
      status: "processando",
    });

    await registrarLog({
      supabaseAdmin,
      acao: "EMAIL_PROCESSANDO",
      condominio_id: item.condominio_id,
      usuario_id: item.usuario_id,
      email: item.email_destino,
      origem: "processar_fila_emails",
      detalhes: {
        fila_email_id: item.id,
        convite_id: item.convite_id,
        pre_cadastro_id: item.pre_cadastro_id,
        tentativa: Number(item.quantidade_tentativas || 0) + 1,
      },
    });

    const payload = item.payload || {};
    const htmlContent = payload.html_content || "";

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
            email: item.email_destino,
            name: item.nome_destino || "Morador",
          },
        ],
        subject: item.assunto || "Complete seu cadastro no Chegou!",
        htmlContent,
      }),
    });

    const brevoResult = await brevoResponse.json().catch(() => ({}));

    if (!brevoResponse.ok) {
      const tentativaAtual = Number(item.quantidade_tentativas || 0) + 1;
      const erro =
        brevoResult?.message ||
        brevoResult?.error ||
        "Erro desconhecido no envio de e-mail.";

      const atingiuLimite = tentativaAtual >= maxTentativas;

      await supabaseAdmin
        .from("fila_emails")
        .update({
          status_envio: atingiuLimite ? "erro_envio" : "aguardando_envio",
          quantidade_tentativas: tentativaAtual,
          erro_em: new Date().toISOString(),
          mensagem_erro: erro,
          resposta_brevo: brevoResult,
          processado: false,
          pausado: atingiuLimite,
          proxima_tentativa_em: atingiuLimite
            ? null
            : new Date(Date.now() + tentativaAtual * 10 * 60 * 1000).toISOString(),
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", item.id);

      await atualizarStatusRelacionado({
        supabaseAdmin,
        item,
        status: atingiuLimite ? "erro_envio" : "aguardando_envio",
        brevoResult,
        mensagemErro: erro,
      });

      if (atingiuLimite) {
        await criarNotificacaoErroEnvio({
          supabaseAdmin,
          item,
          erro,
        });
      }

      await registrarLog({
        supabaseAdmin,
        acao: atingiuLimite ? "EMAIL_ERRO_FINAL" : "EMAIL_ERRO_REPROCESSAR",
        condominio_id: item.condominio_id,
        usuario_id: item.usuario_id,
        email: item.email_destino,
        origem: "processar_fila_emails",
        detalhes: {
          fila_email_id: item.id,
          convite_id: item.convite_id,
          pre_cadastro_id: item.pre_cadastro_id,
          tentativa: tentativaAtual,
          max_tentativas: maxTentativas,
          erro,
          resposta_brevo: brevoResult,
        },
      });

      return jsonResponse({
        success: true,
        enviado: false,
        status: atingiuLimite ? "erro_envio" : "aguardando_envio",
        tentativa: tentativaAtual,
        erro,
      });
    }

    const enviadoEm = new Date().toISOString();
    const brevoMessageId = brevoResult?.messageId || null;

    await supabaseAdmin
      .from("fila_emails")
      .update({
        status_envio: "enviado",
        enviado_em: enviadoEm,
        brevo_message_id: brevoMessageId,
        resposta_brevo: brevoResult,
        processado: true,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", item.id);

    await atualizarStatusRelacionado({
      supabaseAdmin,
      item,
      status: "enviado",
      enviadoEm,
      brevoResult,
      brevoMessageId,
    });

    await registrarLog({
      supabaseAdmin,
      acao: "EMAIL_ENVIADO",
      condominio_id: item.condominio_id,
      usuario_id: item.usuario_id,
      email: item.email_destino,
      origem: "processar_fila_emails",
      detalhes: {
        fila_email_id: item.id,
        convite_id: item.convite_id,
        pre_cadastro_id: item.pre_cadastro_id,
        brevo_message_id: brevoMessageId,
      },
    });

    return jsonResponse({
      success: true,
      enviado: true,
      fila_email_id: item.id,
      email: item.email_destino,
      brevo_message_id: brevoMessageId,
      enviado_em: enviadoEm,
    });
  } catch (error) {
    console.error("Erro processar-fila-emails:", error);

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao processar fila de e-mails.",
      },
      500
    );
  }
});