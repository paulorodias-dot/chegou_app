import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  renderRecuperacaoSenhaEmail,
} from "../_shared/email-system/index.ts";

const PUBLIC_MESSAGE =
  "Se existir uma conta vinculada ao e-mail informado, enviaremos as instruções para redefinir sua senha. O e-mail pode levar até 3 minutos para chegar. Verifique também a caixa de spam ou lixo eletrônico.";

const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://chegou-app.vercel.app",
  "https://sistemachegou.com.br",
]);

type SupabaseAdminClient = ReturnType<typeof createClient>;

type RateLimitResult = {
  solicitacao_id: string;
  correlation_id: string;
  permitida: boolean;
  motivo_interno: string;
  status_inicial: string;
};

type CanonicalUser = {
  id: string;
  nome: string | null;
  email: string | null;
  ativo: boolean | null;
  status_cadastro: string | null;
  token_revogado: boolean | null;
};

type CentralNotificationEvent = {
  event_type: "LIMITE_EMAIL_SEGURANCA_ATINGIDO";
  event_version: 1;
  priority: "ALTA";
  source_module: "AUTENTICACAO";
  correlation_id: string;
  occurred_at: string;
  audience: "EQUIPE_CHEGOU";
  payload: {
    grupo: "seguranca_conta";
    tipo_email: "recuperacao_senha";
    quantidade_pendente: number;
    motivo: "LIMITE_DIARIO_OU_RESERVA_CRITICA_INDISPONIVEL";
    fila_email_id: string | null;
    solicitacao_recuperacao_id: string;
    email_mascarado: string;
  };
};

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowedOrigin =
    origin && ALLOWED_ORIGINS.has(origin)
      ? origin
      : "https://sistemachegou.com.br";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function jsonResponse(
  req: Request,
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

function publicSuccessResponse(
  req: Request,
  correlationId?: string | null,
): Response {
  return jsonResponse(req, {
    success: true,
    message: PUBLIC_MESSAGE,
    estimated_delivery_minutes: 3,
    correlation_id: correlationId || null,
  });
}

function normalizeEmail(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function maskEmail(email: string): string {
  const [localPart = "", domain = ""] = email.split("@");

  if (!localPart || !domain) return "***";

  const visibleLocal =
    localPart.length <= 2
      ? localPart.slice(0, 1)
      : localPart.slice(0, 2);

  const domainParts = domain.split(".");
  const domainName = domainParts.shift() || "";
  const suffix = domainParts.join(".");

  const visibleDomain =
    domainName.length <= 2
      ? domainName.slice(0, 1)
      : domainName.slice(0, 2);

  return `${visibleLocal}***@${visibleDomain}***${
    suffix ? `.${suffix}` : ""
  }`;
}

function normalizeName(value: unknown): string {
  const normalized = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

  return normalized || "Usuário";
}

function getIp(req: Request): string | null {
  return (
    req.headers
      .get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    null
  );
}

function detectOperatingSystem(userAgent = ""): string {
  const ua = userAgent.toLowerCase();

  if (ua.includes("windows")) return "Windows";
  if (ua.includes("android")) return "Android";

  if (
    ua.includes("iphone") ||
    ua.includes("ipad") ||
    ua.includes("ipod")
  ) {
    return "iOS";
  }

  if (
    ua.includes("mac os") ||
    ua.includes("macintosh")
  ) {
    return "macOS";
  }

  if (ua.includes("linux")) return "Linux";

  return "Não identificado";
}

function detectBrowser(userAgent = ""): string {
  const ua = userAgent.toLowerCase();

  if (ua.includes("edg/")) {
    return "Microsoft Edge";
  }

  if (
    ua.includes("chrome/") &&
    !ua.includes("edg/")
  ) {
    return "Google Chrome";
  }

  if (ua.includes("firefox/")) {
    return "Mozilla Firefox";
  }

  if (
    ua.includes("safari/") &&
    !ua.includes("chrome/")
  ) {
    return "Safari";
  }

  return "Não identificado";
}

function getSaoPauloHour(date = new Date()): number {
  const hour = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    hour12: false,
  }).format(date);

  return Number(hour);
}

function isOutsideStandardWindow(date = new Date()): boolean {
  const hour = getSaoPauloHour(date);

  return hour < 8 || hour >= 20;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function hmacSha256(
  value: string,
  secret: string,
): Promise<string> {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(value),
  );

  return base64UrlEncode(
    new Uint8Array(signature),
  );
}

function isProviderCapacityError(
  status: number,
  result: Record<string, unknown>,
): boolean {
  if (status === 429) return true;

  const message = String(
    result?.message ??
      result?.error ??
      "",
  ).toLowerCase();

  return [
    "limit",
    "quota",
    "credit",
    "credits",
    "insufficient",
    "rate",
    "too many",
  ].some((term) => message.includes(term));
}

async function registerSystemLog({
  supabaseAdmin,
  action,
  userId = null,
  email = null,
  details = {},
}: {
  supabaseAdmin: SupabaseAdminClient;
  action: string;
  userId?: string | null;
  email?: string | null;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from("logs_sistema")
      .insert({
        acao: action,
        condominio_id: null,
        usuario_id: userId,
        email,
        origem: "autenticacao",
        detalhes: details,
      });

    if (error) {
      console.error(
        `Falha ao registrar log ${action}:`,
        error,
      );
    }
  } catch (error) {
    console.error(
      `Erro inesperado ao registrar log ${action}:`,
      error,
    );
  }
}

async function updateRecoveryRequest(
  supabaseAdmin: SupabaseAdminClient,
  requestId: string,
  values: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("solicitacoes_recuperacao_senha")
    .update(values)
    .eq("id", requestId);

  if (error) {
    throw error;
  }
}

async function applyAdditionalNightProtection({
  supabaseAdmin,
  emailHash,
  ipHash,
}: {
  supabaseAdmin: SupabaseAdminClient;
  emailHash: string;
  ipHash: string | null;
}): Promise<{
  allowed: boolean;
  reason:
    | "FORA_HORARIO_EMAIL_LIMITE"
    | "FORA_HORARIO_IP_LIMITE"
    | null;
}> {
  if (!isOutsideStandardWindow()) {
    return {
      allowed: true,
      reason: null,
    };
  }

  const since12Hours = new Date(
    Date.now() - 12 * 60 * 60 * 1000,
  ).toISOString();

  const allowedStatuses = [
    "RECEBIDA",
    "LINK_GERADO",
    "AGUARDANDO_ENVIO_PRIORITARIO",
    "AGUARDANDO_CAPACIDADE_SEGURANCA",
    "ENFILEIRADA",
    "PROCESSANDO_ENVIO",
    "ENVIADA",
    "ERRO_GERACAO_LINK",
    "ERRO_FILA",
    "ERRO_ENVIO",
  ];

  const { count: emailCount, error: emailError } =
    await supabaseAdmin
      .from("solicitacoes_recuperacao_senha")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("email_hash", emailHash)
      .gte("solicitado_em", since12Hours)
      .in("status", allowedStatuses);

  if (emailError) {
    throw emailError;
  }

  if ((emailCount ?? 0) > 3) {
    return {
      allowed: false,
      reason: "FORA_HORARIO_EMAIL_LIMITE",
    };
  }

  if (ipHash) {
    const since30Minutes = new Date(
      Date.now() - 30 * 60 * 1000,
    ).toISOString();

    const { count: ipCount, error: ipError } =
      await supabaseAdmin
        .from("solicitacoes_recuperacao_senha")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("ip_hash", ipHash)
        .gte(
          "solicitado_em",
          since30Minutes,
        );

    if (ipError) {
      throw ipError;
    }

    if ((ipCount ?? 0) > 10) {
      return {
        allowed: false,
        reason: "FORA_HORARIO_IP_LIMITE",
      };
    }
  }

  return {
    allowed: true,
    reason: null,
  };
}

async function publishCentralNotification({
  supabaseUrl,
  serviceRoleKey,
  event,
}: {
  supabaseUrl: string;
  serviceRoleKey: string;
  event: CentralNotificationEvent;
}): Promise<{
  published: boolean;
  eventId: string | null;
  error: string | null;
}> {
  const functionName =
    Deno.env.get(
      "CENTRAL_NOTIFICATIONS_FUNCTION_NAME",
    ) || "publicar-evento-notificacao";

  const endpoint = `${supabaseUrl.replace(
    /\/$/,
    "",
  )}/functions/v1/${functionName}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });

    const result = await response
      .json()
      .catch(() => ({}));

    if (!response.ok) {
      return {
        published: false,
        eventId: null,
        error:
          String(
            result?.error ??
              result?.message ??
              `HTTP ${response.status}`,
          ),
      };
    }

    return {
      published: true,
      eventId:
        typeof result?.event_id === "string"
          ? result.event_id
          : typeof result?.id === "string"
            ? result.id
            : null,
      error: null,
    };
  } catch (error) {
    return {
      published: false,
      eventId: null,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao publicar evento na Central de Notificações.",
    };
  }
}

async function markCapacityUnavailable({
  supabaseAdmin,
  supabaseUrl,
  serviceRoleKey,
  requestId,
  correlationId,
  queueId,
  maskedEmail,
  providerResult,
}: {
  supabaseAdmin: SupabaseAdminClient;
  supabaseUrl: string;
  serviceRoleKey: string;
  requestId: string;
  correlationId: string;
  queueId: string | null;
  maskedEmail: string;
  providerResult: Record<string, unknown>;
}): Promise<void> {
  const occurredAt = new Date().toISOString();

  const event: CentralNotificationEvent = {
    event_type:
      "LIMITE_EMAIL_SEGURANCA_ATINGIDO",
    event_version: 1,
    priority: "ALTA",
    source_module: "AUTENTICACAO",
    correlation_id: correlationId,
    occurred_at: occurredAt,
    audience: "EQUIPE_CHEGOU",
    payload: {
      grupo: "seguranca_conta",
      tipo_email: "recuperacao_senha",
      quantidade_pendente: 1,
      motivo:
        "LIMITE_DIARIO_OU_RESERVA_CRITICA_INDISPONIVEL",
      fila_email_id: queueId,
      solicitacao_recuperacao_id: requestId,
      email_mascarado: maskedEmail,
    },
  };

  await updateRecoveryRequest(
    supabaseAdmin,
    requestId,
    {
      status:
        "AGUARDANDO_CAPACIDADE_SEGURANCA",
      resultado_interno:
        "CAPACIDADE_SEGURANCA_INDISPONIVEL",
      notificacao_central_pendente: true,
      notificacao_central_event_type:
        event.event_type,
    },
  );

  const publication =
    await publishCentralNotification({
      supabaseUrl,
      serviceRoleKey,
      event,
    });

  if (publication.published) {
    await updateRecoveryRequest(
      supabaseAdmin,
      requestId,
      {
        notificacao_central_pendente: false,
        notificacao_central_event_id:
          publication.eventId,
        notificacao_central_publicada_em:
          new Date().toISOString(),
      },
    );
  }

  await registerSystemLog({
    supabaseAdmin,
    action:
      "LIMITE_EMAIL_SEGURANCA_ATINGIDO",
    details: {
      correlation_id: correlationId,
      solicitacao_recuperacao_id:
        requestId,
      fila_email_id: queueId,
      email_mascarado: maskedEmail,
      prioridade: "ALTA",
      central_notificacoes_publicada:
        publication.published,
      central_notificacoes_event_id:
        publication.eventId,
      central_notificacoes_erro:
        publication.error,
      resposta_provedor: providerResult,
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: getCorsHeaders(req),
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      req,
      {
        success: false,
        error: "Método não permitido.",
      },
      405,
    );
  }

  const requestOrigin =
    req.headers.get("origin");

  if (
    requestOrigin &&
    !ALLOWED_ORIGINS.has(requestOrigin)
  ) {
    return jsonResponse(
      req,
      {
        success: false,
        error: "Origem não permitida.",
      },
      403,
    );
  }

  let correlationId: string | null = null;
  let recoveryRequestId: string | null = null;
  let normalizedEmail = "";
  let maskedEmail = "***";

  try {
    const body = await req
      .json()
      .catch(() => ({}));

    normalizedEmail = normalizeEmail(
      body?.email,
    );

    if (!isValidEmail(normalizedEmail)) {
      return publicSuccessResponse(req);
    }

    maskedEmail = maskEmail(
      normalizedEmail,
    );

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY",
      );

    const hashSecret =
      Deno.env.get(
        "RECOVERY_HASH_SECRET",
      );

    if (
      !supabaseUrl ||
      !serviceRoleKey ||
      !hashSecret
    ) {
      console.error(
        "Secrets obrigatórios ausentes em solicitar-recuperacao-senha.",
      );

      return publicSuccessResponse(req);
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const ip = getIp(req);
    const userAgent =
      req.headers.get("user-agent") || "";

    const operatingSystem =
      detectOperatingSystem(userAgent);

    const browser =
      detectBrowser(userAgent);

    const emailHash = await hmacSha256(
      normalizedEmail,
      hashSecret,
    );

    const ipHash = ip
      ? await hmacSha256(
          ip,
          hashSecret,
        )
      : null;

    const {
      data: rateLimitRows,
      error: rateLimitError,
    } = await supabaseAdmin.rpc(
      "iniciar_solicitacao_recuperacao_senha",
      {
        p_email_hash: emailHash,
        p_email_mascarado: maskedEmail,
        p_ip_hash: ipHash,
        p_user_agent_resumido:
          userAgent.slice(0, 500),
        p_sistema_operacional:
          operatingSystem,
        p_navegador: browser,
      },
    );

    if (
      rateLimitError ||
      !Array.isArray(rateLimitRows) ||
      rateLimitRows.length === 0
    ) {
      console.error(
        "Falha na RPC de rate limit:",
        rateLimitError,
      );

      return publicSuccessResponse(req);
    }

    const rateLimit =
      rateLimitRows[0] as RateLimitResult;

    recoveryRequestId =
      rateLimit.solicitacao_id;

    correlationId =
      rateLimit.correlation_id;

    if (!rateLimit.permitida) {
      await registerSystemLog({
        supabaseAdmin,
        action:
          "RECUPERACAO_SENHA_BLOQUEADA_RATE_LIMIT",
        email: normalizedEmail,
        details: {
          correlation_id: correlationId,
          solicitacao_recuperacao_id:
            recoveryRequestId,
          email_mascarado: maskedEmail,
          motivo_interno:
            rateLimit.motivo_interno,
          status_inicial:
            rateLimit.status_inicial,
          ip_hash_presente:
            Boolean(ipHash),
          fora_horario_padrao:
            isOutsideStandardWindow(),
          sistema_operacional:
            operatingSystem,
          navegador: browser,
        },
      });

      return publicSuccessResponse(
        req,
        correlationId,
      );
    }

    const nightProtection =
      await applyAdditionalNightProtection({
        supabaseAdmin,
        emailHash,
        ipHash,
      });

    if (!nightProtection.allowed) {
      await updateRecoveryRequest(
        supabaseAdmin,
        recoveryRequestId,
        {
          status: "IGNORADA_LIMITE_30_MIN",
          resultado_interno:
            "LIMITE_30_MIN_ATINGIDO",
        },
      );

      await registerSystemLog({
        supabaseAdmin,
        action:
          "RECUPERACAO_SENHA_BLOQUEADA_FORA_HORARIO",
        email: normalizedEmail,
        details: {
          correlation_id: correlationId,
          solicitacao_recuperacao_id:
            recoveryRequestId,
          email_mascarado: maskedEmail,
          motivo:
            nightProtection.reason,
          sistema_operacional:
            operatingSystem,
          navegador: browser,
        },
      });

      return publicSuccessResponse(
        req,
        correlationId,
      );
    }

    const officialSiteUrl = (
      Deno.env.get("SITE_URL") ||
      "https://sistemachegou.com.br"
    ).replace(/\/$/, "");

    const redirectTo =
      `${officialSiteUrl}/redefinir-senha`;

    const {
      data: generatedLink,
      error: generateLinkError,
    } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: normalizedEmail,
        options: {
          redirectTo,
        },
      });

    const authUser =
      generatedLink?.user ?? null;

    const actionLink =
      generatedLink?.properties
        ?.action_link ?? null;

    if (
      generateLinkError ||
      !authUser ||
      !actionLink
    ) {
      await updateRecoveryRequest(
        supabaseAdmin,
        recoveryRequestId,
        {
          status:
            "CONTA_NAO_LOCALIZADA",
          resultado_interno:
            "EMAIL_NAO_ENCONTRADO",
        },
      );

      await registerSystemLog({
        supabaseAdmin,
        action:
          "RECUPERACAO_SENHA_SOLICITADA_CONTA_NAO_LOCALIZADA",
        email: normalizedEmail,
        details: {
          correlation_id: correlationId,
          solicitacao_recuperacao_id:
            recoveryRequestId,
          email_mascarado: maskedEmail,
          fora_horario_padrao:
            isOutsideStandardWindow(),
          erro_auth_codigo:
            generateLinkError?.code ?? null,
        },
      });

      return publicSuccessResponse(
        req,
        correlationId,
      );
    }

    const authUserId = authUser.id;

    const {
      data: canonicalUser,
      error: canonicalUserError,
    } = await supabaseAdmin
      .from("usuarios")
      .select(
        "id, nome, email, ativo, status_cadastro, token_revogado",
      )
      .eq("id", authUserId)
      .maybeSingle<CanonicalUser>();

    if (
      canonicalUserError ||
      !canonicalUser
    ) {
      await updateRecoveryRequest(
        supabaseAdmin,
        recoveryRequestId,
        {
          auth_user_id: authUserId,
          status:
            "AUTH_CANONICO_NAO_RESOLVIDO",
          resultado_interno:
            "USUARIO_CANONICO_NAO_RESOLVIDO",
        },
      );

      await registerSystemLog({
        supabaseAdmin,
        action:
          "RECUPERACAO_SENHA_AUTH_CANONICO_NAO_RESOLVIDO",
        email: normalizedEmail,
        details: {
          correlation_id: correlationId,
          solicitacao_recuperacao_id:
            recoveryRequestId,
          auth_user_id: authUserId,
          email_mascarado: maskedEmail,
          erro_consulta:
            canonicalUserError?.message ??
            null,
        },
      });

      return publicSuccessResponse(
        req,
        correlationId,
      );
    }

    const accountIsActive =
      canonicalUser.ativo !== false &&
      canonicalUser.status_cadastro !==
        "inativo" &&
      canonicalUser.status_cadastro !==
        "bloqueado" &&
      canonicalUser.token_revogado !== true;

    if (!accountIsActive) {
      await updateRecoveryRequest(
        supabaseAdmin,
        recoveryRequestId,
        {
          auth_user_id: authUserId,
          usuario_canonico_id:
            canonicalUser.id,
          status: "CONTA_INATIVA",
          resultado_interno:
            "CONTA_INATIVA",
        },
      );

      await registerSystemLog({
        supabaseAdmin,
        action:
          "RECUPERACAO_SENHA_CONTA_INATIVA",
        userId: canonicalUser.id,
        email: normalizedEmail,
        details: {
          correlation_id: correlationId,
          solicitacao_recuperacao_id:
            recoveryRequestId,
          auth_user_id: authUserId,
          email_mascarado: maskedEmail,
          ativo: canonicalUser.ativo,
          status_cadastro:
            canonicalUser.status_cadastro,
          token_revogado:
            canonicalUser.token_revogado,
        },
      });

      return publicSuccessResponse(
        req,
        correlationId,
      );
    }

    const recipientName =
      normalizeName(
        canonicalUser.nome ||
          authUser.user_metadata?.nome ||
          authUser.user_metadata?.full_name,
      );

    const now = new Date();
    const expiresAt = addMinutes(
      now,
      30,
    ).toISOString();

    await updateRecoveryRequest(
      supabaseAdmin,
      recoveryRequestId,
      {
        auth_user_id: authUserId,
        usuario_canonico_id:
          canonicalUser.id,
        status: "LINK_GERADO",
        resultado_interno:
          "USUARIO_CANONICO_RESOLVIDO",
        link_gerado_em:
          now.toISOString(),
        expira_em: expiresAt,
      },
    );

    const emailAssetsBaseUrl = (
      Deno.env.get(
        "EMAIL_ASSETS_BASE_URL",
      ) || officialSiteUrl
    ).replace(/\/$/, "");

    const companyAddress =
      Deno.env.get("EMPRESA_ENDERECO") ||
      "[Endereço físico da empresa — definir no módulo institucional]";

    const renderedEmail =
      renderRecuperacaoSenhaEmail({
        templateId:
          "recuperacao_senha_premium_v1",
        theme: "light",
        language: "pt-BR",
        currentYear:
          new Date().getFullYear(),
        sender: {
          name: "Sistema Chegou!",
          origin: "sistema_chegou",
        },
        assets: {
          baseUrl: emailAssetsBaseUrl,
        },
        recipientName,
        recoveryUrl: actionLink,
        validityMinutes: 30,
        companyAddress,
      });

    const queuePayload = {
      correlation_id: correlationId,
      solicitacao_recuperacao_id:
        recoveryRequestId,
      auth_user_id: authUserId,
      usuario_canonico_id:
        canonicalUser.id,
      email_mascarado: maskedEmail,      
      validade_minutos: 30,
      prazo_estimado_entrega_minutos: 3,
      prioridade: "ALTA",
      fora_horario_padrao:
        isOutsideStandardWindow(),
      tema: "light",
      template_id:
        renderedEmail.templateId,
      subject: renderedEmail.subject,
      preheader:
        renderedEmail.preheader,
      html_content:
        renderedEmail.html,
      text_content:
        renderedEmail.text,
    };

    const {
      data: queueEmail,
      error: queueError,
    } = await supabaseAdmin
      .from("fila_emails")
      .insert({
        business_id:
          `SEG-${crypto
            .randomUUID()
            .slice(0, 8)
            .toUpperCase()}`,
        condominio_id: null,
        usuario_id:
          canonicalUser.id,
        pre_cadastro_id: null,
        auditoria_id: null,
        convite_id: null,
        tipo_email:
          "recuperacao_senha",
        categoria_email:
          "seguranca",
        origem_email:
          "autenticacao",
        email_destino:
          normalizedEmail,
        nome_destino:
          recipientName,
        assunto:
          renderedEmail.subject,
        template_email:
          renderedEmail.templateId,
        payload: queuePayload,
        prioridade: 100,
        peso_envio: 100,
        status_envio: "processando",
        limite_diario_grupo:
          "seguranca_conta",
        quantidade_tentativas: 0,
        max_tentativas: 3,
        proxima_tentativa_em:
          now.toISOString(),
        envio_lote: false,
        pausado: false,
        cancelado: false,
        processado: false,
        criado_por: null,
      })
      .select("id")
      .single();

    if (queueError || !queueEmail) {
      await updateRecoveryRequest(
        supabaseAdmin,
        recoveryRequestId,
        {
          status: "ERRO_FILA",
          resultado_interno:
            "ERRO_INTERNO",
        },
      );

      await registerSystemLog({
        supabaseAdmin,
        action:
          "RECUPERACAO_SENHA_ERRO_FILA",
        userId: canonicalUser.id,
        email: normalizedEmail,
        details: {
          correlation_id: correlationId,
          solicitacao_recuperacao_id:
            recoveryRequestId,
          auth_user_id: authUserId,
          email_mascarado: maskedEmail,
          erro:
            queueError?.message ?? null,
        },
      });

      return publicSuccessResponse(
        req,
        correlationId,
      );
    }

    const queueId = queueEmail.id;

    await updateRecoveryRequest(
      supabaseAdmin,
      recoveryRequestId,
      {
        fila_email_id: queueId,
        status:
          "AGUARDANDO_ENVIO_PRIORITARIO",
        resultado_interno:
          "EMAIL_ENFILEIRADO",
        enfileirado_em:
          new Date().toISOString(),
      },
    );

    const brevoApiKey =
      Deno.env.get("BREVO_API_KEY");

    const senderEmail =
      Deno.env.get(
        "BREVO_SENDER_EMAIL",
      ) ||
      "noreply@sistemachegou.com.br";

    const senderName =
      Deno.env.get(
        "BREVO_SENDER_NAME",
      ) || "Sistema Chegou!";

    if (!brevoApiKey) {
      const providerResult = {
        error:
          "BREVO_API_KEY não configurada.",
      };

      await supabaseAdmin
        .from("fila_emails")
        .update({
          status_envio: "erro_envio",
          erro_em:
            new Date().toISOString(),
          codigo_erro:
            "BREVO_API_KEY_AUSENTE",
          mensagem_erro:
            "Provedor de e-mail não configurado.",
          quantidade_tentativas: 1,
          processado: false,
        })
        .eq("id", queueId);

      await updateRecoveryRequest(
        supabaseAdmin,
        recoveryRequestId,
        {
          status: "ERRO_ENVIO",
          resultado_interno:
            "FALHA_PROVEDOR",
          quantidade_tentativas: 1,
          ultima_tentativa_em:
            new Date().toISOString(),
        },
      );

      await registerSystemLog({
        supabaseAdmin,
        action:
          "RECUPERACAO_SENHA_ERRO_CONFIGURACAO_PROVEDOR",
        userId: canonicalUser.id,
        email: normalizedEmail,
        details: {
          correlation_id: correlationId,
          solicitacao_recuperacao_id:
            recoveryRequestId,
          fila_email_id: queueId,
          email_mascarado: maskedEmail,
          prioridade: "ALTA",
          ...providerResult,
        },
      });

      return publicSuccessResponse(
        req,
        correlationId,
      );
    }

    await updateRecoveryRequest(
      supabaseAdmin,
      recoveryRequestId,
      {
        status:
          "PROCESSANDO_ENVIO",
        quantidade_tentativas: 1,
        ultima_tentativa_em:
          new Date().toISOString(),
      },
    );

    const brevoResponse = await fetch(
      "https://api.brevo.com/v3/smtp/email",
      {
        method: "POST",
        headers: {
          "api-key": brevoApiKey,
          "Content-Type":
            "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          sender: {
            name: senderName,
            email: senderEmail,
          },
          to: [
            {
              email: normalizedEmail,
              name: recipientName,
            },
          ],
          subject:
            renderedEmail.subject,
          htmlContent:
            renderedEmail.html,
          textContent:
            renderedEmail.text,
          headers: {
            "X-Correlation-ID":
              correlationId,
            "X-Chegou-Email-Type":
              "recuperacao_senha",
            "X-Chegou-Priority": "ALTA",
          },
          tags: [
            "seguranca",
            "recuperacao-senha",
            "prioridade-alta",
          ],
        }),
      },
    );

    const brevoResult =
      (await brevoResponse
        .json()
        .catch(() => ({}))) as Record<
        string,
        unknown
      >;

    if (!brevoResponse.ok) {
      const capacityError =
        isProviderCapacityError(
          brevoResponse.status,
          brevoResult,
        );

      if (capacityError) {
        await supabaseAdmin
          .from("fila_emails")
          .update({
            status_envio:
              "aguardando_capacidade_seguranca",
            erro_em:
              new Date().toISOString(),
            codigo_erro:
              "CAPACIDADE_SEGURANCA_INDISPONIVEL",
            mensagem_erro:
              String(
                brevoResult?.message ??
                  brevoResult?.error ??
                  "Limite do provedor atingido.",
              ),
            resposta_brevo:
              brevoResult,
            quantidade_tentativas: 1,
            proxima_tentativa_em:
              addMinutes(
                new Date(),
                3,
              ).toISOString(),
            processado: false,
          })
          .eq("id", queueId);

        await markCapacityUnavailable({
          supabaseAdmin,
          supabaseUrl,
          serviceRoleKey,
          requestId:
            recoveryRequestId,
          correlationId,
          queueId,
          maskedEmail,
          providerResult:
            brevoResult,
        });

        return publicSuccessResponse(
          req,
          correlationId,
        );
      }

      const retryAt = addMinutes(
        new Date(),
        1,
      ).toISOString();

      await supabaseAdmin
        .from("fila_emails")
        .update({
          status_envio:
            "aguardando_envio",
          erro_em:
            new Date().toISOString(),
          codigo_erro:
            `BREVO_HTTP_${brevoResponse.status}`,
          mensagem_erro:
            String(
              brevoResult?.message ??
                brevoResult?.error ??
                "Erro no envio pelo provedor.",
            ),
          resposta_brevo:
            brevoResult,
          quantidade_tentativas: 1,
          proxima_tentativa_em:
            retryAt,
          processado: false,
        })
        .eq("id", queueId);

      await updateRecoveryRequest(
        supabaseAdmin,
        recoveryRequestId,
        {
          status: "ERRO_ENVIO",
          resultado_interno:
            "FALHA_PROVEDOR",
          quantidade_tentativas: 1,
          ultima_tentativa_em:
            new Date().toISOString(),
        },
      );

      await registerSystemLog({
        supabaseAdmin,
        action:
          "RECUPERACAO_SENHA_ERRO_ENVIO",
        userId: canonicalUser.id,
        email: normalizedEmail,
        details: {
          correlation_id: correlationId,
          solicitacao_recuperacao_id:
            recoveryRequestId,
          fila_email_id: queueId,
          email_mascarado: maskedEmail,
          prioridade: "ALTA",
          status_http:
            brevoResponse.status,
          proxima_tentativa_em:
            retryAt,
          resposta_brevo:
            brevoResult,
        },
      });

      return publicSuccessResponse(
        req,
        correlationId,
      );
    }

    const messageId =
      typeof brevoResult?.messageId ===
      "string"
        ? brevoResult.messageId
        : null;

    const sentAt =
      new Date().toISOString();

    await Promise.all([
      supabaseAdmin
        .from("fila_emails")
        .update({
          status_envio: "enviado",
          enviado_em: sentAt,
          brevo_message_id:
            messageId,
          resposta_brevo:
            brevoResult,
          quantidade_tentativas: 1,
          processado: true,
          mensagem_erro: null,
          codigo_erro: null,
        })
        .eq("id", queueId),

      updateRecoveryRequest(
        supabaseAdmin,
        recoveryRequestId,
        {
          status: "ENVIADA",
          resultado_interno:
            "EMAIL_ENVIADO",
          brevo_message_id:
            messageId,
          enviado_em: sentAt,
          quantidade_tentativas: 1,
          ultima_tentativa_em:
            sentAt,
        },
      ),
    ]);

    await registerSystemLog({
      supabaseAdmin,
      action:
        "RECUPERACAO_SENHA_EMAIL_ENVIADO",
      userId: canonicalUser.id,
      email: normalizedEmail,
      details: {
        correlation_id: correlationId,
        solicitacao_recuperacao_id:
          recoveryRequestId,
        fila_email_id: queueId,
        auth_user_id: authUserId,
        usuario_canonico_id:
          canonicalUser.id,
        email_mascarado: maskedEmail,
        brevo_message_id: messageId,
        prioridade: "ALTA",
        prazo_estimado_entrega_minutos: 3,
        validade_link_minutos: 30,
        fora_horario_padrao:
          isOutsideStandardWindow(),
        sistema_operacional:
          operatingSystem,
        navegador: browser,
      },
    });

    return publicSuccessResponse(
      req,
      correlationId,
    );
  } catch (error) {
    console.error(
      "Erro em solicitar-recuperacao-senha:",
      error,
    );

    if (
      recoveryRequestId &&
      normalizedEmail
    ) {
      try {
        const supabaseUrl =
          Deno.env.get("SUPABASE_URL");

        const serviceRoleKey =
          Deno.env.get(
            "SUPABASE_SERVICE_ROLE_KEY",
          );

        if (
          supabaseUrl &&
          serviceRoleKey
        ) {
          const supabaseAdmin =
            createClient(
              supabaseUrl,
              serviceRoleKey,
            );

          await updateRecoveryRequest(
            supabaseAdmin,
            recoveryRequestId,
            {
              status:
                "ERRO_GERACAO_LINK",
              resultado_interno:
                "ERRO_INTERNO",
            },
          );

          await registerSystemLog({
            supabaseAdmin,
            action:
              "RECUPERACAO_SENHA_ERRO_INTERNO",
            email: normalizedEmail,
            details: {
              correlation_id:
                correlationId,
              solicitacao_recuperacao_id:
                recoveryRequestId,
              email_mascarado:
                maskedEmail,
              erro:
                error instanceof Error
                  ? error.message
                  : "Erro interno não identificado.",
            },
          });
        }
      } catch (secondaryError) {
        console.error(
          "Falha ao registrar erro secundário:",
          secondaryError,
        );
      }
    }

    return publicSuccessResponse(
      req,
      correlationId,
    );
  }
});