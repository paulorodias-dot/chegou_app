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
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse(
        {
          success: false,
          code: "METODO_NAO_PERMITIDO",
          message: "Método não permitido.",
        },
        405
      );
    }

    const body = await req.json();

    const protocolo = body?.protocolo || null;
    const token = body?.token || null;
    const email = String(body?.email || "").trim().toLowerCase();

    if (!protocolo && !token && !email) {
      return jsonResponse(
        {
          success: false,
          code: "PARAMETROS_OBRIGATORIOS",
          message: "Informe protocolo, token ou e-mail.",
        },
        400
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        {
          success: false,
          code: "ENV_AUSENTE",
          message: "Variáveis Supabase ausentes.",
        },
        500
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let query = supabase
      .from("pre_cadastro_moradores")
      .select(`
        *,
        auditorias_morador (*)
      `)
      .order("criado_em", { ascending: false })
      .limit(1);

    if (protocolo) {
      query = query.eq("protocolo", protocolo);
    } else if (token) {
      query = query.or(`token_convite.eq.${token},token_acompanhamento.eq.${token}`);
    } else {
      query = query.eq("email", email);
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);

      return jsonResponse(
        {
          success: false,
          code: "ERRO_BUSCAR_STATUS",
          message: "Erro ao consultar status.",
        },
        500
      );
    }

    const cadastro = data?.[0];

    if (!cadastro) {
      return jsonResponse(
        {
          success: false,
          code: "CADASTRO_NAO_ENCONTRADO",
          message: "Cadastro não encontrado.",
        },
        404
      );
    }

    const auditoria = Array.isArray(cadastro.auditorias_morador)
      ? cadastro.auditorias_morador[0]
      : cadastro.auditorias_morador;

    const timeline = [
      {
        etapa: "Cadastro iniciado",
        status: "concluido",
        data_hora: cadastro.criado_em,
      },
      {
        etapa: "Convite enviado",
        status: cadastro.convite_enviado_em ? "concluido" : "pendente",
        data_hora: cadastro.convite_enviado_em,
      },
      {
        etapa: "Wizard iniciado",
        status: cadastro.convite_aberto_em ? "concluido" : "pendente",
        data_hora: cadastro.convite_aberto_em,
      },
      {
        etapa: "Cadastro finalizado",
        status: cadastro.wizard_finalizado_em ? "concluido" : "pendente",
        data_hora: cadastro.wizard_finalizado_em,
      },

      {
        etapa: "Senha preparada",
        status: cadastro.senha_preparada ? "concluido" : "pendente",
        data_hora: cadastro.atualizado_em,
      },
      {
        etapa: "Auditoria iniciada",
        status:
          cadastro.status_acompanhamento === "auditoria_iniciada"
            ? "atual"
            : ["em_analise", "aprovado", "conta_ativa"].includes(cadastro.status_acompanhamento)
              ? "concluido"
              : "pendente",
        data_hora: cadastro.auditoria_iniciada_em,
      },
      {
        etapa: "Em análise administrativa",
        status:
          cadastro.status_acompanhamento === "em_analise"
            ? "atual"
            : ["aprovado", "conta_ativa"].includes(cadastro.status_acompanhamento)
              ? "concluido"
              : "pendente",
        data_hora: cadastro.auditoria_iniciada_em,
      },
      {
        etapa: "Conta ativa",
        status: cadastro.status_acompanhamento === "conta_ativa" ? "concluido" : "pendente",
        data_hora: cadastro.primeiro_login_concluido_em,
      },

      {
        etapa: "Aguardando auditoria",
        status:
          cadastro.status_auditoria === "aguardando_auditoria"
            ? "atual"
            : "pendente",
        data_hora: cadastro.wizard_finalizado_em,
      },
      {
        etapa: "Correção solicitada",
        status:
          cadastro.status_auditoria === "correcao_solicitada"
            ? "atual"
            : "pendente",
        data_hora: auditoria?.correcao_solicitada_em || null,
      },
      {
        etapa: "Cadastro aprovado",
        status:
          cadastro.status_auditoria === "aprovado"
            ? "concluido"
            : "pendente",
        data_hora: cadastro.aprovado_em,
      },
      {
        etapa: "Cadastro rejeitado",
        status:
          cadastro.status_auditoria === "rejeitado"
            ? "concluido"
            : "pendente",
        data_hora: cadastro.rejeitado_em,
      },
    ];

    return jsonResponse({
      success: true,
      code: "STATUS_LOCALIZADO",
      message: "Status localizado com sucesso.",
      data: {
        id: cadastro.id,
        business_id: cadastro.business_id,
        nome: cadastro.nome,
        email: cadastro.email,
        telefone: cadastro.telefone,
        torre: cadastro.torre,
        bloco: cadastro.bloco,
        unidade: cadastro.unidade,
        tipo_morador: cadastro.tipo_morador,

        status_cadastro: cadastro.status_cadastro,
        status_convite: cadastro.status_convite,
        status_auditoria: cadastro.status_auditoria,

        status_acompanhamento: cadastro.status_acompanhamento,
        status_conta: cadastro.status_conta,
        auth_ativo: cadastro.auth_ativo,
        senha_preparada: cadastro.senha_preparada,
        senha_definida: cadastro.senha_definida,
        token_acompanhamento: cadastro.token_acompanhamento,
        token_acompanhamento_expira_em: cadastro.token_acompanhamento_expira_em,
        auditoria_iniciada_em: cadastro.auditoria_iniciada_em,
        auditoria_concluida_em: cadastro.auditoria_concluida_em,
        primeiro_login_concluido_em: cadastro.primeiro_login_concluido_em,

        percentual_preenchimento:
          cadastro.percentual_preenchimento || 0,
        possui_divergencia:
          cadastro.possui_divergencia || false,
        divergencias: cadastro.divergencias || {},
        token_expira_em: cadastro.token_expira_em,
        convite_enviado_em: cadastro.convite_enviado_em,
        convite_aberto_em: cadastro.convite_aberto_em,
        wizard_finalizado_em: cadastro.wizard_finalizado_em,
        aprovado_em: cadastro.aprovado_em,
        rejeitado_em: cadastro.rejeitado_em,
        ultimo_reenvio_em: cadastro.ultimo_reenvio_em,
        quantidade_reenvios:
          cadastro.quantidade_reenvios || 0,
        saude_cadastro: cadastro.saude_cadastro,
        observacoes: cadastro.observacoes,
        auditoria: auditoria || null,
        timeline,
      },
    });
  } catch (error) {
    console.error("Erro wizard-morador-status:", error);

    return jsonResponse(
      {
        success: false,
        code: "ERRO_INTERNO",
        message:
          error instanceof Error
            ? error.message
            : "Erro inesperado.",
      },
      500
    );
  }
});