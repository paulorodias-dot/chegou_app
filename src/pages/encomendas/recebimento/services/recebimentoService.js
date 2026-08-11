import { supabase } from "../../../../services/supabase";


// ============================================================
// SISTEMA CHEGOU!
// RECEBIMENTO SERVICE
// Módulo Portaria
//
// Única camada do fluxo de Recebimento autorizada a
// conversar diretamente com Supabase/RPC.
//
// NÃO:
// - acessa tabelas diretamente;
// - implementa matching de rastreio;
// - resolve tenant;
// - decide autorização;
// - promove Encomenda Oficial;
// - mantém estado React.
// ============================================================


// ============================================================
// RPCs OFICIAIS
// ============================================================

const RPC = Object.freeze({
  PROCESSAR_RECEBIMENTO:
    "rpc_encomenda_pre_recebimento_processar_v1",

  RETOMAR_RECEBIMENTO:
    "rpc_encomenda_pre_recebimento_retomar_v1",

  LISTAR_TRANSPORTADORAS:
    "rpc_encomendas_transportadoras_disponiveis_v1",
});


// ============================================================
// ERRO NORMALIZADO DO SERVICE
// ============================================================

function criarErroRecebimento({
  message,
  code = null,
  details = null,
  hint = null,
  originalError = null,
} = {}) {
  const error = new Error(
    message ||
      "Não foi possível processar o recebimento."
  );

  error.name = "RecebimentoServiceError";
  error.code = code;
  error.details = details;
  error.hint = hint;
  error.originalError = originalError;

  return error;
}


function normalizarErroSupabase(
  error,
  mensagemPadrao
) {
  if (!error) {
    return criarErroRecebimento({
      message: mensagemPadrao,
    });
  }

  return criarErroRecebimento({
    message:
      error.message ||
      mensagemPadrao,

    code:
      error.code ||
      null,

    details:
      error.details ||
      null,

    hint:
      error.hint ||
      null,

    originalError:
      error,
  });
}


// ============================================================
// METADADOS TÉCNICOS DO DISPOSITIVO
//
// Dados auxiliares de auditoria.
//
// O backend continua sendo responsável pela identidade
// oficial do usuário por auth.uid().
// ============================================================

function obterUserAgent() {
  if (typeof navigator === "undefined") {
    return null;
  }

  return navigator.userAgent || null;
}


function detectarNavegador() {
  if (typeof navigator === "undefined") {
    return null;
  }

  const userAgent =
    navigator.userAgent || "";

  if (/edg/i.test(userAgent)) {
    return "Edge";
  }

  if (/opr|opera/i.test(userAgent)) {
    return "Opera";
  }

  if (/firefox|fxios/i.test(userAgent)) {
    return "Firefox";
  }

  if (
    /chrome|chromium|crios/i.test(userAgent)
  ) {
    return "Chrome";
  }

  if (/safari/i.test(userAgent)) {
    return "Safari";
  }

  return "Outro";
}


function detectarSistemaOperacional() {
  if (typeof navigator === "undefined") {
    return null;
  }

  const userAgent =
    navigator.userAgent || "";

  if (/windows/i.test(userAgent)) {
    return "Windows";
  }

  if (/android/i.test(userAgent)) {
    return "Android";
  }

  if (/iphone|ipad|ipod/i.test(userAgent)) {
    return "iOS";
  }

  if (/macintosh|mac os x/i.test(userAgent)) {
    return "macOS";
  }

  if (/linux/i.test(userAgent)) {
    return "Linux";
  }

  return "Outro";
}


function detectarTipoDispositivo() {
  if (typeof navigator === "undefined") {
    return null;
  }

  const userAgent =
    navigator.userAgent || "";

  if (/ipad|tablet/i.test(userAgent)) {
    return "TABLET";
  }

  if (
    /android|iphone|ipod|mobile/i.test(
      userAgent
    )
  ) {
    return "MOBILE";
  }

  return "DESKTOP";
}


export function obterContextoTecnicoRecebimento() {
  return {
    ip: null,

    userAgent:
      obterUserAgent(),

    navegador:
      detectarNavegador(),

    sistemaOperacional:
      detectarSistemaOperacional(),

    tipoDispositivo:
      detectarTipoDispositivo(),

    identificadorDispositivo:
      null,
  };
}


// ============================================================
// VALIDAR PARÂMETROS
// ============================================================

function validarChaveIdempotencia(
  chaveIdempotencia
) {
  if (
    typeof chaveIdempotencia !== "string" ||
    chaveIdempotencia.trim().length < 16
  ) {
    throw criarErroRecebimento({
      message:
        "Chave de idempotência do recebimento inválida.",
    });
  }

  return chaveIdempotencia.trim();
}


function validarPayload(payload) {
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    throw criarErroRecebimento({
      message:
        "Payload do recebimento inválido.",
    });
  }

  return payload;
}


// ============================================================
// EXECUÇÃO GENÉRICA DA RPC
// ============================================================

async function executarRpcRecebimento({
  rpc,
  chaveIdempotencia,
  payload,
  contextoTecnico,
}) {
  const chave =
    validarChaveIdempotencia(
      chaveIdempotencia
    );

  const payloadValidado =
    validarPayload(payload);

  const contexto = {
    ...obterContextoTecnicoRecebimento(),
    ...(contextoTecnico || {}),
  };


  const { data, error } =
    await supabase.rpc(
      rpc,
      {
        p_chave_idempotencia:
          chave,

        p_payload:
          payloadValidado,

        p_ip:
          contexto.ip || null,

        p_user_agent:
          contexto.userAgent || null,

        p_navegador:
          contexto.navegador || null,

        p_sistema_operacional:
          contexto.sistemaOperacional ||
          null,

        p_tipo_dispositivo:
          contexto.tipoDispositivo ||
          null,

        p_identificador_dispositivo:
          contexto.identificadorDispositivo ||
          null,
      }
    );


  if (error) {
    throw normalizarErroSupabase(
      error,
      "Não foi possível processar o recebimento."
    );
  }


  if (!data) {
    throw criarErroRecebimento({
      message:
        "O servidor não retornou o resultado do recebimento.",
    });
  }


  return data;
}


// ============================================================
// CONCLUIR RECEBIMENTO
//
// MODELO A:
//
// IndexedDB
// ↓
// payload final
// ↓
// processar_v1
// ↓
// Pré-Recebimento
//
// O payload DEVE utilizar confirmar=false.
// Este service não promove Encomenda Oficial.
// ============================================================

export async function processarRecebimento({
  chaveIdempotencia,
  payload,
  contextoTecnico = null,
} = {}) {
  if (payload?.confirmar === true) {
    throw criarErroRecebimento({
      message:
        "O fluxo de Recebimento não pode promover uma Encomenda Oficial.",
    });
  }


  return executarRpcRecebimento({
    rpc:
      RPC.PROCESSAR_RECEBIMENTO,

    chaveIdempotencia,
    payload,
    contextoTecnico,
  });
}


// ============================================================
// RETOMAR CONCLUSÃO
//
// Deve ser usado quando:
// - houve timeout;
// - caiu internet;
// - navegador fechou;
// - computador desligou;
// - não sabemos se a primeira execução chegou ao servidor.
//
// REGRA:
// MESMA chave + MESMO payload.
// ============================================================

export async function retomarRecebimento({
  chaveIdempotencia,
  payload,
  contextoTecnico = null,
} = {}) {
  if (payload?.confirmar === true) {
    throw criarErroRecebimento({
      message:
        "O fluxo de Recebimento não pode promover uma Encomenda Oficial.",
    });
  }


  return executarRpcRecebimento({
    rpc:
      RPC.RETOMAR_RECEBIMENTO,

    chaveIdempotencia,
    payload,
    contextoTecnico,
  });
}


// ============================================================
// DETECÇÃO BÁSICA DE FALHA DE CONECTIVIDADE
//
// Isto é apenas UX.
// navigator.onLine NÃO é fonte de verdade sobre o servidor.
// ============================================================

export function navegadorEstaOnline() {
  if (
    typeof navigator === "undefined"
  ) {
    return true;
  }

  return navigator.onLine !== false;
}


// ============================================================
// CLASSIFICAR ERRO PARA O HOOK
//
// Não decide regra de negócio.
// Apenas ajuda a UX a distinguir provável falha de rede
// de rejeição explícita do backend.
// ============================================================

export function erroPareceConectividade(
  error
) {
  if (!error) {
    return false;
  }

  if (!navegadorEstaOnline()) {
    return true;
  }

  const mensagem =
    String(
      error.message || ""
    ).toLowerCase();


  return (
    mensagem.includes("fetch") ||
    mensagem.includes("network") ||
    mensagem.includes("failed to fetch") ||
    mensagem.includes("timeout") ||
    mensagem.includes("connection")
  );
}

// ============================================================
// TRANSPORTADORAS OFICIAIS
//
// Fonte única:
// rpc_encomendas_transportadoras_disponiveis_v1
//
// O frontend NÃO consulta public.transportadoras diretamente.
// ============================================================

function normalizarTransportadoraRecebimento(
  transportadora
) {
  if (!transportadora?.id) {
    return null;
  }

  const businessId =
    transportadora.business_id || null;

  return {
    id:
      transportadora.id,

    businessId,

    nomeFantasia:
      transportadora.nome_fantasia ||
      "",

    tipo:
      transportadora.tipo ||
      null,

    status:
      transportadora.status ||
      null,

    logoStoragePath:
      transportadora.logo_storage_path ||
      null,

    logoUrl:
      transportadora.logo_url ||
      null,

    usaLogoPadrao:
      Boolean(
        transportadora.usa_logo_padrao
      ),

    aceitaRastreio:
      Boolean(
        transportadora.aceita_rastreio
      ),

    possuiIntegracaoApi:
      Boolean(
        transportadora.possui_integracao_api
      ),

    avisoOperacional:
      transportadora.aviso_operacional ||
      null,

    /*
     * TRP-00022 já é a entidade oficial
     * "Outras Transportadoras".
     *
     * Não usamos UUID fixo no frontend.
     */
    ehOutras:
      businessId === "TRP-00022",
  };
}


export async function listarTransportadorasRecebimento({
  condominioId,
  busca = null,
  limite = 100,
  offset = 0,
} = {}) {
  if (!condominioId) {
    throw criarErroRecebimento({
      message:
        "Condomínio não identificado para carregar as transportadoras.",
    });
  }


  const { data, error } =
    await supabase.rpc(
      RPC.LISTAR_TRANSPORTADORAS,
      {
        p_condominio_id:
          condominioId,

        p_busca:
          busca?.trim() || null,

        p_limite:
          limite,

        p_offset:
          offset,
      }
    );


  if (error) {
    throw normalizarErroSupabase(
      error,
      "Não foi possível carregar as transportadoras."
    );
  }


  /*
   * Contrato oficial atual:
   * {
   *   ok,
   *   itens,
   *   total,
   *   limite,
   *   offset
   * }
   */
  const itens =
    Array.isArray(data?.itens)
      ? data.itens
      : [];


  const transportadoras =
    itens
      .map(
        normalizarTransportadoraRecebimento
      )
      .filter(Boolean);


  return {
    ok:
      data?.ok !== false,

    transportadoras,

    total:
      Number(
        data?.total ??
        transportadoras.length
      ),

    limite:
      Number(
        data?.limite ??
        limite
      ),

    offset:
      Number(
        data?.offset ??
        offset
      ),
  };
}