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

function somenteNumeros(valor = "") {
  return String(valor).replace(/\D/g, "");
}

function validarCPF(cpf = "") {
  const valor = somenteNumeros(cpf);

  if (valor.length !== 11) return false;

  if (/^(\d)\1+$/.test(valor)) return false;

  let soma = 0;

  for (let i = 0; i < 9; i++) {
    soma += Number(valor.charAt(i)) * (10 - i);
  }

  let resto = (soma * 10) % 11;

  if (resto === 10) resto = 0;

  if (resto !== Number(valor.charAt(9))) {
    return false;
  }

  soma = 0;

  for (let i = 0; i < 10; i++) {
    soma += Number(valor.charAt(i)) * (11 - i);
  }

  resto = (soma * 10) % 11;

  if (resto === 10) resto = 0;

  return resto === Number(valor.charAt(10));
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

function calcularPercentualPreenchimento(dados: Record<string, unknown>) {
  const campos = [
    "nome",
    "email",
    "telefone",
    "cpf",
    "torre",
    "unidade",
  ];

  let preenchidos = 0;

  for (const campo of campos) {
    if (
      dados[campo] &&
      String(dados[campo]).trim() !== ""
    ) {
      preenchidos++;
    }
  }

  return Math.round(
    (preenchidos / campos.length) * 100
  );
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
      token,

      nome,
      email,
      telefone,
      cpf,

      torre,
      bloco,
      unidade,

      tipo_morador,

      dados_complementares = {},

      dependentes = [],
      pets = [],
      veiculos = [],
      funcionarios_lar = [],

      observacoes = null,
    } = body;

    if (!token) {
      return jsonResponse(
        { error: "Token obrigatório." },
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
            "Variáveis SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes.",
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

    const { data: convite, error: conviteError } =
      await supabaseAdmin
        .from("convites_morador")
        .select(`
          *,
          pre_cadastro_moradores (*)
        `)
        .eq("token_convite", token)
        .maybeSingle();

    if (conviteError) {
      throw conviteError;
    }

    if (!convite) {
      return jsonResponse(
        {
          error:
            "Convite não encontrado.",
        },
        404
      );
    }

    if (convite.token_utilizado) {
      return jsonResponse(
        {
          error:
            "Este link já foi utilizado.",
        },
        409
      );
    }

    const expiracao =
      convite.token_expira_em
        ? new Date(
            convite.token_expira_em
          )
        : null;

    if (
      expiracao &&
      expiracao.getTime() <
        new Date().getTime()
    ) {
      return jsonResponse(
        {
          error:
            "Este link expirou.",
        },
        410
      );
    }

    const camposObrigatorios = [];

    if (!nome)
      camposObrigatorios.push("nome");

    if (!email)
      camposObrigatorios.push("email");

    if (!telefone)
      camposObrigatorios.push("telefone");

    if (!cpf)
      camposObrigatorios.push("cpf");

    if (!torre)
      camposObrigatorios.push("torre");

    if (!unidade)
      camposObrigatorios.push("unidade");

    if (
      camposObrigatorios.length > 0
    ) {
      return jsonResponse(
        {
          error:
            "Existem campos obrigatórios pendentes.",

          campos_pendentes:
            camposObrigatorios,
        },
        400
      );
    }

    if (!validarCPF(cpf)) {
      return jsonResponse(
        {
          error:
            "CPF inválido.",
        },
        400
      );
    }

    const percentual =
      calcularPercentualPreenchimento({
        nome,
        email,
        telefone,
        cpf,
        torre,
        unidade,
      });

    const agora =
      new Date().toISOString();

    const preCadastro =
      convite.pre_cadastro_moradores;

    const payloadAtualizacao = {
      nome,
      email,
      telefone,
      cpf,

      torre,
      bloco,
      unidade,

      tipo_morador,

      status_cadastro:
        "cadastro_finalizado",

      status_auditoria:
        "pendente",

      percentual_preenchimento:
        percentual,

      saude_cadastro:
        percentual >= 100
          ? "completo"
          : "incompleto",

      dados_complementares,

      dependentes,
      pets,
      veiculos,
      funcionarios_lar,

      observacoes,

      wizard_finalizado_em:
        agora,

      ultimo_acesso_em:
        agora,

      ip_ultimo_acesso: ip,

      dispositivo_ultimo_acesso:
        userAgent,

      navegador_ultimo_acesso:
        navegador,

      sistema_operacional:
        sistemaOperacional,
    };

    const {
      data: preCadastroAtualizado,
      error:
        atualizarPreCadastroError,
    } = await supabaseAdmin
      .from(
        "pre_cadastro_moradores"
      )
      .update(payloadAtualizacao)
      .eq("id", preCadastro.id)
      .select("*")
      .single();

    if (
      atualizarPreCadastroError
    ) {
      throw atualizarPreCadastroError;
    }

    const {
      data: auditoriaExistente,
    } = await supabaseAdmin
      .from("auditorias_morador")
      .select("id")
      .eq(
        "pre_cadastro_id",
        preCadastro.id
      )
      .maybeSingle();

    let auditoriaId =
      auditoriaExistente?.id ||
      null;

    if (!auditoriaExistente) {
      const {
        data: novaAuditoria,
        error: auditoriaError,
      } = await supabaseAdmin
        .from(
          "auditorias_morador"
        )
        .insert({
          business_id:
            preCadastro.business_id,

          condominio_id:
            convite.condominio_id,

          pre_cadastro_id:
            preCadastro.id,

          usuario_id: null,

          unidade_id:
            preCadastro.unidade_id,

          status_auditoria:
            "pendente",

          tipo_auditoria:
            "cadastro_morador",

          origem_auditoria:
            "wizard_morador",

          percentual_preenchimento:
            percentual,

          saude_cadastro:
            percentual >= 100
              ? "completo"
              : "incompleto",

          prioridade:
            percentual >= 100
              ? "normal"
              : "alta",

          solicitou_correcao:
            false,

          dados_depois:
            payloadAtualizacao,

          ip_auditor: ip,

          dispositivo_auditor:
            userAgent,

          navegador_auditor:
            navegador,
        })
        .select("*")
        .single();

      if (auditoriaError) {
        throw auditoriaError;
      }

      auditoriaId =
        novaAuditoria.id;
    }

    await supabaseAdmin
      .from("convites_morador")
      .update({
        token_utilizado: true,

        token_utilizado_em:
          agora,

        status_envio:
          "finalizado",

        ultimo_acesso_em:
          agora,

        ultimo_ip: ip,

        ultimo_dispositivo:
          userAgent,

        ultimo_navegador:
          navegador,

        ultimo_sistema_operacional:
          sistemaOperacional,
      })
      .eq("id", convite.id);

    await registrarLog({
      supabaseAdmin,

      acao:
        "WIZARD_MORADOR_FINALIZADO",

      condominio_id:
        convite.condominio_id,

      usuario_id: null,

      email,

      origem:
        "wizard_morador",

      detalhes: {
        convite_id:
          convite.id,

        pre_cadastro_id:
          preCadastro.id,

        auditoria_id:
          auditoriaId,

        percentual_preenchimento:
          percentual,

        dependentes:
          dependentes.length,

        pets: pets.length,

        veiculos:
          veiculos.length,

        funcionarios_lar:
          funcionarios_lar.length,

        ...contextoRequisicao,
      },
    });

    return jsonResponse({
      success: true,

      message:
        "Cadastro enviado para auditoria com sucesso.",

      pre_cadastro_id:
        preCadastro.id,

      auditoria_id:
        auditoriaId,

      percentual_preenchimento:
        percentual,

      status_auditoria:
        "pendente",
    });
  } catch (error) {
    console.error(
      "Erro finalizar-wizard-morador:",
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