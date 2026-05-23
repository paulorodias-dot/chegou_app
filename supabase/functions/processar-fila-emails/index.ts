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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        {
          error:
            "Variáveis SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes.",
        },
        500
      );
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey
    );

    const brevoApiKey = Deno.env.get("BREVO_API_KEY");

    if (!brevoApiKey) {
      return jsonResponse(
        { error: "BREVO_API_KEY não configurada." },
        500
      );
    }

    const remetenteEmail =
      Deno.env.get("BREVO_SENDER_EMAIL") ||
      "sistemachegou@gmail.com";

    const remetenteNome =
      Deno.env.get("BREVO_SENDER_NAME") ||
      "Chegou! Sistema";

    const hoje = new Date();
    const inicioDia = new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      hoje.getDate(),
      0,
      0,
      0
    ).toISOString();

    const fimDia = new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      hoje.getDate(),
      23,
      59,
      59
    ).toISOString();

    const { data: configuracao } = await supabaseAdmin
      .from("configuracoes_envio_email")
      .select("*")
      .eq("ativo", true)
      .limit(1)
      .maybeSingle();

    if (!configuracao) {
      return jsonResponse(
        { error: "Configuração de envio não encontrada." },
        404
      );
    }

    if (configuracao.pausar_envios) {
      return jsonResponse({
        success: true,
        message: "Envios pausados pelo sistema.",
      });
    }

    const limiteConvites =
      configuracao.limite_diario_convites || 40;

    const limiteConfirmacoes =
      configuracao.limite_diario_confirmacoes || 20;

    const { count: convitesHoje } = await supabaseAdmin
      .from("fila_emails")
      .select("*", { count: "exact", head: true })
      .eq("categoria_email", "convite")
      .eq("status_envio", "enviado")
      .gte("enviado_em", inicioDia)
      .lte("enviado_em", fimDia);

    const { count: confirmacoesHoje } = await supabaseAdmin
      .from("fila_emails")
      .select("*", { count: "exact", head: true })
      .eq("categoria_email", "confirmacao")
      .eq("status_envio", "enviado")
      .gte("enviado_em", inicioDia)
      .lte("enviado_em", fimDia);

    const restanteConvites =
      limiteConvites - Number(convitesHoje || 0);

    const restanteConfirmacoes =
      limiteConfirmacoes - Number(confirmacoesHoje || 0);

    const totalDisponivel =
      Math.max(restanteConvites, 0) +
      Math.max(restanteConfirmacoes, 0);

    if (totalDisponivel <= 0) {
      return jsonResponse({
        success: true,
        message: "Limite diário atingido.",
      });
    }

    const { data: fila, error: filaError } =
      await supabaseAdmin
        .from("fila_emails")
        .select("*")
        .in("status_envio", [
          "aguardando_envio",
          "erro_envio",
        ])
        .eq("pausado", false)
        .eq("cancelado", false)
        .lte(
          "quantidade_tentativas",
          configuracao.max_tentativas || 5
        )
        .order("prioridade", { ascending: false })
        .order("peso_envio", { ascending: false })
        .order("criado_em", { ascending: true })
        .limit(totalDisponivel);

    if (filaError) throw filaError;

    if (!fila || fila.length === 0) {
      return jsonResponse({
        success: true,
        message: "Nenhum e-mail pendente na fila.",
      });
    }

    const resultados = [];

    for (const item of fila) {
      try {
        const categoria = item.categoria_email || "convite";

        if (
          categoria === "convite" &&
          restanteConvites <= 0
        ) {
          continue;
        }

        if (
          categoria === "confirmacao" &&
          restanteConfirmacoes <= 0
        ) {
          continue;
        }

        const payload = item.payload || {};

        const htmlContent =
          payload.html_content || "";

        const responseBrevo = await fetch(
          "https://api.brevo.com/v3/smtp/email",
          {
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
                  name:
                    item.nome_destino || "Usuário",
                },
              ],
              subject:
                item.assunto ||
                "Chegou! Sistema",
              htmlContent,
            }),
          }
        );

        const brevoResult = await responseBrevo
          .json()
          .catch(() => ({}));

        if (!responseBrevo.ok) {
          await supabaseAdmin
            .from("fila_emails")
            .update({
              status_envio: "erro_envio",
              erro_em: new Date().toISOString(),
              mensagem_erro:
                brevoResult?.message ||
                brevoResult?.error ||
                "Erro Brevo",
              resposta_brevo: brevoResult,
              quantidade_tentativas:
                Number(item.quantidade_tentativas || 0) + 1,
              processado: false,
            })
            .eq("id", item.id);

          resultados.push({
            fila_email_id: item.id,
            status: "erro",
          });

          await registrarLog({
            supabaseAdmin,
            acao: "FILA_EMAIL_ERRO",
            condominio_id: item.condominio_id,
            usuario_id: item.usuario_id,
            email: item.email_destino,
            origem: "processador_fila",
            detalhes: {
              fila_email_id: item.id,
              erro:
                brevoResult?.message ||
                brevoResult?.error,
            },
          });

          continue;
        }

        const enviadoEm = new Date().toISOString();

        await supabaseAdmin
          .from("fila_emails")
          .update({
            status_envio: "enviado",
            enviado_em: enviadoEm,
            processado: true,
            resposta_brevo: brevoResult,
            brevo_message_id:
              brevoResult?.messageId || null,
          })
          .eq("id", item.id);

        if (item.convite_id) {
          await supabaseAdmin
            .from("convites_morador")
            .update({
              status_envio: "enviado",
              enviado_em: enviadoEm,
              resposta_brevo: brevoResult,
              brevo_message_id:
                brevoResult?.messageId || null,
            })
            .eq("id", item.convite_id);
        }

        if (item.pre_cadastro_id) {
          await supabaseAdmin
            .from("pre_cadastro_moradores")
            .update({
              status_convite: "enviado",
              convite_enviado_em: enviadoEm,
            })
            .eq("id", item.pre_cadastro_id);
        }

        resultados.push({
          fila_email_id: item.id,
          status: "enviado",
        });

        await registrarLog({
          supabaseAdmin,
          acao: "FILA_EMAIL_PROCESSADA",
          condominio_id: item.condominio_id,
          usuario_id: item.usuario_id,
          email: item.email_destino,
          origem: "processador_fila",
          detalhes: {
            fila_email_id: item.id,
            categoria_email:
              item.categoria_email,
            tipo_email: item.tipo_email,
            brevo_message_id:
              brevoResult?.messageId || null,
          },
        });
      } catch (error) {
        console.error(
          "Erro item fila:",
          item.id,
          error
        );

        await supabaseAdmin
          .from("fila_emails")
          .update({
            status_envio: "erro_envio",
            erro_em: new Date().toISOString(),
            mensagem_erro:
              error instanceof Error
                ? error.message
                : "Erro inesperado.",
            quantidade_tentativas:
              Number(item.quantidade_tentativas || 0) + 1,
          })
          .eq("id", item.id);

        resultados.push({
          fila_email_id: item.id,
          status: "erro",
        });
      }
    }

    return jsonResponse({
      success: true,
      processados: resultados.length,
      resultados,
      limite_convites: limiteConvites,
      limite_confirmacoes: limiteConfirmacoes,
      convites_enviados_hoje: convitesHoje || 0,
      confirmacoes_enviadas_hoje:
        confirmacoesHoje || 0,
    });
  } catch (error) {
    console.error(
      "Erro processar-fila-emails:",
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