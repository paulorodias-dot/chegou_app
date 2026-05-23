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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
      token,
    } = body as {
      token?: string;
    };

    if (!token) {
      return jsonResponse(
        { error: "Token obrigatório." },
        400
      );
    }

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

    const ip = obterIp(req);
    const userAgent = req.headers.get("user-agent") || "";

    const sistemaOperacional =
      detectarSistemaOperacional(userAgent);

    const navegador =
      detectarNavegador(userAgent);

    const contextoRequisicao = {
      ip,
      user_agent: userAgent,
      sistema_operacional: sistemaOperacional,
      navegador,
    };

    const { data: convite, error: conviteError } =
      await supabaseAdmin
        .from("convites_morador")
        .select(`
          *,
          pre_cadastro_moradores (
            *
          )
        `)
        .eq("token_convite", token)
        .maybeSingle();

    if (conviteError) {
      throw conviteError;
    }

    if (!convite) {
      return jsonResponse(
        {
          valido: false,
          motivo: "token_nao_encontrado",
          error: "Token inválido.",
        },
        404
      );
    }

    const preCadastro =
      convite.pre_cadastro_moradores;

    if (!preCadastro) {
      return jsonResponse(
        {
          valido: false,
          motivo: "pre_cadastro_nao_encontrado",
          error: "Pré-cadastro não encontrado.",
        },
        404
      );
    }

    if (convite.token_utilizado) {
      await registrarLog({
        supabaseAdmin,
        acao: "TOKEN_REUTILIZACAO_BLOQUEADA",
        condominio_id: convite.condominio_id,
        usuario_id: null,
        email: convite.email_destino,
        origem: "wizard_morador",
        detalhes: {
          token,
          convite_id: convite.id,
          ...contextoRequisicao,
        },
      });

      return jsonResponse(
        {
          valido: false,
          motivo: "token_ja_utilizado",
          error:
            "Este link já foi utilizado anteriormente.",
        },
        409
      );
    }

    const agora = new Date();
    const expiracao = convite.token_expira_em
      ? new Date(convite.token_expira_em)
      : null;

    if (
      expiracao &&
      expiracao.getTime() < agora.getTime()
    ) {
      await registrarLog({
        supabaseAdmin,
        acao: "TOKEN_EXPIRADO",
        condominio_id: convite.condominio_id,
        usuario_id: null,
        email: convite.email_destino,
        origem: "wizard_morador",
        detalhes: {
          token,
          convite_id: convite.id,
          expiracao,
          ...contextoRequisicao,
        },
      });

      return jsonResponse(
        {
          valido: false,
          motivo: "token_expirado",
          error:
            "Este link expirou. Solicite um novo convite.",
        },
        410
      );
    }

    if (
      convite.status_envio === "cancelado" ||
      convite.cancelado === true
    ) {
      return jsonResponse(
        {
          valido: false,
          motivo: "convite_cancelado",
          error:
            "Este convite foi cancelado.",
        },
        403
      );
    }

    if (
      preCadastro.token_revogado === true
    ) {
      return jsonResponse(
        {
          valido: false,
          motivo: "token_revogado",
          error:
            "Este acesso foi revogado.",
        },
        403
      );
    }

    const { data: condominio } =
      await supabaseAdmin
        .from("condominios")
        .select(`
          id,
          ativo,
          status_cadastro,
          razao_social,
          nome_fantasia,
          codigo_condominio
        `)
        .eq("id", convite.condominio_id)
        .maybeSingle();

    if (
      !condominio ||
      !condominio.ativo ||
      condominio.status_cadastro !== "ativo"
    ) {
      return jsonResponse(
        {
          valido: false,
          motivo: "condominio_inativo",
          error:
            "Condomínio não disponível no momento.",
        },
        403
      );
    }

    await supabaseAdmin
      .from("convites_morador")
      .update({
        ultimo_acesso_em:
          agora.toISOString(),
        ultimo_ip: ip,
        ultimo_dispositivo:
          userAgent,
        ultimo_navegador:
          navegador,
        ultimo_sistema_operacional:
          sistemaOperacional,
      })
      .eq("id", convite.id);

    await supabaseAdmin
      .from("pre_cadastro_moradores")
      .update({
        ultimo_acesso_em:
          agora.toISOString(),
        ip_ultimo_acesso: ip,
        dispositivo_ultimo_acesso:
          userAgent,
        navegador_ultimo_acesso:
          navegador,
        sistema_operacional:
          sistemaOperacional,
      })
      .eq("id", preCadastro.id);

    await registrarLog({
      supabaseAdmin,
      acao: "TOKEN_VALIDADO_WIZARD",
      condominio_id: convite.condominio_id,
      usuario_id: null,
      email: convite.email_destino,
      origem: "wizard_morador",
      detalhes: {
        convite_id: convite.id,
        pre_cadastro_id:
          preCadastro.id,
        token,
        ...contextoRequisicao,
      },
    });

    return jsonResponse({
      valido: true,

      convite: {
        id: convite.id,
        business_id:
          convite.business_id,
        tipo_envio:
          convite.tipo_envio,
        token_expira_em:
          convite.token_expira_em,
      },

      condominio: {
        id: condominio.id,
        nome:
          condominio.nome_fantasia ||
          condominio.razao_social,
        codigo_condominio:
          condominio.codigo_condominio,
      },

      pre_cadastro: {
        id: preCadastro.id,
        business_id:
          preCadastro.business_id,

        nome:
          preCadastro.nome || "",

        email:
          preCadastro.email || "",

        telefone:
          preCadastro.telefone || "",

        cpf:
          preCadastro.cpf || "",

        torre:
          preCadastro.torre || "",

        bloco:
          preCadastro.bloco || "",

        unidade:
          preCadastro.unidade || "",

        tipo_morador:
          preCadastro.tipo_morador ||
          "morador",

        status_cadastro:
          preCadastro.status_cadastro,

        status_auditoria:
          preCadastro.status_auditoria,

        possui_divergencia:
          preCadastro.possui_divergencia,

        divergencias:
          preCadastro.divergencias ||
          {},

        dados_importados:
          preCadastro.dados_importados ||
          {},

        observacoes:
          preCadastro.observacoes ||
          null,
      },
    });
  } catch (error) {
    console.error(
      "Erro validar-token-morador:",
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