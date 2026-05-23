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

function gerarBusinessId(prefixo = "REENVIO") {
  const data = new Date();
  const y = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  const random = crypto.randomUUID().slice(0, 8).toUpperCase();
  return `${prefixo}-${y}${m}${d}-${random}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse(
        { success: false, code: "METODO_NAO_PERMITIDO", message: "Método não permitido." },
        405
      );
    }

    const body = await req.json();

    const token = body?.token || null;
    const email = String(body?.email || "").trim().toLowerCase();
    const motivo = body?.motivo || "Solicitação de reenvio pelo morador.";

    if (!token && !email) {
      return jsonResponse(
        {
          success: false,
          code: "TOKEN_OU_EMAIL_OBRIGATORIO",
          message: "Informe o token ou o e-mail para solicitar reenvio.",
        },
        400
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        { success: false, code: "ENV_AUSENTE", message: "Variáveis Supabase ausentes." },
        500
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      null;

    const userAgent = req.headers.get("user-agent") || null;

    let query = supabase
      .from("convites_morador")
      .select(`
        *,
        pre_cadastro_moradores (*)
      `)
      .order("criado_em", { ascending: false })
      .limit(1);

    if (token) {
      query = query.eq("token_convite", token);
    } else {
      query = query.eq("email_destino", email);
    }

    const { data: convites, error: conviteError } = await query;

    if (conviteError) {
      console.error(conviteError);
      return jsonResponse(
        { success: false, code: "ERRO_BUSCAR_CONVITE", message: "Erro ao buscar convite." },
        500
      );
    }

    const convite = convites?.[0];

    if (!convite) {
      return jsonResponse(
        { success: false, code: "CONVITE_NAO_ENCONTRADO", message: "Convite não encontrado." },
        404
      );
    }

    const preCadastro = convite.pre_cadastro_moradores;

    if (!preCadastro) {
      return jsonResponse(
        {
          success: false,
          code: "PRE_CADASTRO_NAO_ENCONTRADO",
          message: "Pré-cadastro não encontrado.",
        },
        404
      );
    }

    const agora = new Date();

    const { data: reenviosRecentes, error: recentesError } = await supabase
      .from("notificacoes")
      .select("id")
      .eq("condominio_id", preCadastro.condominio_id)
      .eq("origem_tipo", "solicitacao_reenvio_convite_morador")
      .eq("origem_id", convite.id)
      .gte("created_at", new Date(agora.getTime() - 30 * 60 * 1000).toISOString());

    if (recentesError) {
      console.warn("Erro ao validar anti-spam de reenvio:", recentesError);
    }

    if ((reenviosRecentes || []).length > 0) {
      return jsonResponse(
        {
          success: false,
          code: "REENVIO_JA_SOLICITADO",
          message: "Já existe uma solicitação recente de reenvio. Aguarde alguns minutos.",
        },
        429
      );
    }

    await supabase.from("notificacoes").insert({
      usuario_id: null,
      titulo: "Solicitação de reenvio de convite",
      mensagem: `O morador ${preCadastro.nome || convite.nome_destino || email} solicitou reenvio do convite de cadastro.`,
      tipo: "solicitacao_reenvio",
      lida: false,
      origem: "wizard_morador",
      business_id: preCadastro.business_id,
      condominio_id: preCadastro.condominio_id,
      prioridade: "media",
      icone: "mail-warning",
      acao_url: "/sistema",
      modulo: "moradores",
      destino_tipo: "administrativo",
      enviada_in_app: true,
      enviada_email: true,
      origem_id: convite.id,
      origem_tipo: "solicitacao_reenvio_convite_morador",
      ip_origem: ip,
      dispositivo_origem: userAgent,
      metadata: {
        pre_cadastro_id: preCadastro.id,
        convite_id: convite.id,
        email: convite.email_destino,
        motivo,
        token_expira_em: convite.token_expira_em,
      },
    });

    await supabase.from("logs_sistema").insert({
      acao: "SOLICITACAO_REENVIO_CONVITE_MORADOR",
      condominio_id: preCadastro.condominio_id,
      usuario_id: null,
      email: convite.email_destino || email || null,
      origem: "wizard_morador",
      detalhes: {
        business_id: preCadastro.business_id,
        pre_cadastro_id: preCadastro.id,
        convite_id: convite.id,
        motivo,
        ip,
        user_agent: userAgent,
      },
    });

    await supabase.from("fila_emails").insert({
      business_id: gerarBusinessId("EMAIL"),
      condominio_id: preCadastro.condominio_id,
      usuario_id: null,
      pre_cadastro_id: preCadastro.id,
      convite_id: convite.id,
      tipo_email: "solicitacao_reenvio_convite_morador",
      categoria_email: "operacional",
      origem_email: "wizard_morador",
      email_destino: null,
      nome_destino: "Administrativo",
      assunto: "Solicitação de reenvio de convite de morador",
      template_email: "solicitacao_reenvio_convite_morador_v1",
      payload: {
        nome_morador: preCadastro.nome || convite.nome_destino,
        email_morador: convite.email_destino,
        motivo,
        pre_cadastro_id: preCadastro.id,
        convite_id: convite.id,
      },
      prioridade: 2,
      peso_envio: 2,
      status_envio: "aguardando_envio",
      limite_diario_grupo: "operacional",
      proxima_tentativa_em: new Date().toISOString(),
      envio_lote: false,
      criado_por: null,
    });

    return jsonResponse({
      success: true,
      code: "REENVIO_SOLICITADO",
      message: "Solicitação de reenvio enviada ao Administrativo.",
      data: {
        pre_cadastro_id: preCadastro.id,
        convite_id: convite.id,
      },
    });
  } catch (error) {
    console.error("Erro wizard-morador-solicitar-reenvio:", error);

    return jsonResponse(
      {
        success: false,
        code: "ERRO_INTERNO",
        message: error instanceof Error ? error.message : "Erro inesperado.",
      },
      500
    );
  }
});