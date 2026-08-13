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
// - mantém estado React;
// - manipula IndexedDB.
//
// FLUXO:
//
// processar_v2(confirmar=false)
// ↓
// Pré-Recebimento
// ↓
// lote_concluir_v3
// ↓
// LOTE_CONCLUIDO
//
// Entrada Oficial é outro fluxo.
// ============================================================


// ============================================================
// RPCs OFICIAIS
// ============================================================

const RPC = Object.freeze({
  PROCESSAR_RECEBIMENTO:
    "rpc_encomenda_pre_recebimento_processar_v2",

  RETOMAR_RECEBIMENTO:
    "rpc_encomenda_pre_recebimento_retomar_v2",

  CONCLUIR_LOTE:
    "rpc_encomenda_lote_concluir_v3",

  LISTAR_TRANSPORTADORAS:
    "rpc_encomendas_transportadoras_disponiveis_v1",

  LISTAR_PRE_RECEBIMENTOS:
    "rpc_encomenda_pre_recebimentos_listar_v2",

  OBTER_RESUMO_RECEBIMENTO:
    "rpc_encomenda_recebimento_resumo_v1",

  TRANSPORTADORAS_FILTRO:
    "rpc_encomenda_recebimento_transportadoras_filtro_v1",
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
  const error =
    new Error(
      message ||
        "Não foi possível processar o recebimento."
    );

  error.name =
    "RecebimentoServiceError";

  error.code =
    code;

  error.details =
    details;

  error.hint =
    hint;

  error.originalError =
    originalError;

  return error;
}


// ============================================================
// NORMALIZAR ERRO DO SUPABASE
// ============================================================

function normalizarErroSupabase(
  error,
  mensagemPadrao
) {
  if (!error) {
    return criarErroRecebimento({
      message:
        mensagemPadrao,
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
  if (
    typeof navigator ===
    "undefined"
  ) {
    return null;
  }

  return (
    navigator.userAgent ||
    null
  );
}


function detectarNavegador() {
  if (
    typeof navigator ===
    "undefined"
  ) {
    return null;
  }


  const userAgent =
    navigator.userAgent ||
    "";


  if (
    /edg/i.test(
      userAgent
    )
  ) {
    return "Edge";
  }


  if (
    /opr|opera/i.test(
      userAgent
    )
  ) {
    return "Opera";
  }


  if (
    /firefox|fxios/i.test(
      userAgent
    )
  ) {
    return "Firefox";
  }


  if (
    /chrome|chromium|crios/i.test(
      userAgent
    )
  ) {
    return "Chrome";
  }


  if (
    /safari/i.test(
      userAgent
    )
  ) {
    return "Safari";
  }


  return "Outro";
}


function detectarSistemaOperacional() {
  if (
    typeof navigator ===
    "undefined"
  ) {
    return null;
  }


  const userAgent =
    navigator.userAgent ||
    "";


  if (
    /windows/i.test(
      userAgent
    )
  ) {
    return "Windows";
  }


  if (
    /android/i.test(
      userAgent
    )
  ) {
    return "Android";
  }


  if (
    /iphone|ipad|ipod/i.test(
      userAgent
    )
  ) {
    return "iOS";
  }


  if (
    /macintosh|mac os x/i.test(
      userAgent
    )
  ) {
    return "macOS";
  }


  if (
    /linux/i.test(
      userAgent
    )
  ) {
    return "Linux";
  }


  return "Outro";
}


function detectarTipoDispositivo() {
  if (
    typeof navigator ===
    "undefined"
  ) {
    return null;
  }


  const userAgent =
    navigator.userAgent ||
    "";


  if (
    /ipad|tablet/i.test(
      userAgent
    )
  ) {
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


// ============================================================
// CONTEXTO TÉCNICO PÚBLICO
// ============================================================

export function obterContextoTecnicoRecebimento() {
  return {
    ip:
      null,

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
// VALIDAÇÕES
// ============================================================

function validarChaveIdempotencia(
  chaveIdempotencia
) {
  if (
    typeof chaveIdempotencia !==
      "string" ||
    chaveIdempotencia
      .trim()
      .length < 16
  ) {
    throw criarErroRecebimento({
      message:
        "Chave de idempotência do recebimento inválida.",
    });
  }


  return (
    chaveIdempotencia
      .trim()
  );
}


function validarPayload(
  payload
) {
  if (
    !payload ||
    typeof payload !==
      "object" ||
    Array.isArray(
      payload
    )
  ) {
    throw criarErroRecebimento({
      message:
        "Payload do recebimento inválido.",
    });
  }


  return payload;
}


function validarRespostaBackend(
  data,
  mensagemPadrao
) {
  if (!data) {
    throw criarErroRecebimento({
      message:
        "O servidor não retornou resultado.",
    });
  }


  /*
   * Algumas RPCs retornam JSON:
   *
   * {
   *   ok: false,
   *   erro_codigo,
   *   erro_mensagem,
   *   erro_detalhes
   * }
   *
   * Isso NÃO deve ser considerado sucesso apenas
   * porque o Supabase não retornou `error`.
   */
  if (
    data.ok === false
  ) {
    throw criarErroRecebimento({
      message:
        data.erro_mensagem ||
        data.message ||
        mensagemPadrao,

      code:
        data.erro_codigo ||
        data.code ||
        null,

      details:
        data.erro_detalhes ||
        data.details ||
        data,
    });
  }


  return data;
}

// ============================================================
// NORMALIZAÇÃO — TELA PRINCIPAL DE RECEBIMENTO
// ============================================================

function normalizarNumero(valor, fallback = 0) {
  const numero =
    Number(valor);

  return Number.isFinite(numero)
    ? numero
    : fallback;
}


function normalizarSerieRecebimento(
  serie
) {
  if (!Array.isArray(serie)) {
    return [];
  }

  return serie.map((item) => ({
    data:
      item?.data ||
      null,

    total:
      normalizarNumero(
        item?.total
      ),
  }));
}


function normalizarResumoItem(
  item
) {
  return {
    total:
      normalizarNumero(
        item?.total
      ),

    unidadeContagem:
      item?.unidade_contagem ||
      null,

    serie7Dias:
      normalizarSerieRecebimento(
        item?.serie_7_dias
      ),
  };
}


function normalizarIdentificacaoVolume(
  volume
) {
  const identificacao =
    volume?.identificacao &&
    typeof volume.identificacao ===
      "object"
      ? volume.identificacao
      : {};

  return {
    status:
      volume?.identificacao_status ||
      "NAO_IDENTIFICADO",

    rastreioAguardado:
      Boolean(
        volume?.rastreio_aguardado
      ),

    rastreioAguardadoId:
      volume?.rastreio_aguardado_id ||
      null,

    rastreioStatus:
      volume?.rastreio_status ||
      null,

    unidadeId:
      identificacao.unidade_id ||
      null,

    torre:
      identificacao.torre ||
      null,

    bloco:
      identificacao.bloco ||
      null,

    unidade:
      identificacao.unidade ||
      null,

    beneficiarioPessoaId:
      identificacao
        .beneficiario_pessoa_id ||
      null,

    beneficiarioDependenteId:
      identificacao
        .beneficiario_dependente_id ||
      null,

    beneficiarioNome:
      identificacao
        .beneficiario_nome ||
      null,
  };
}


function normalizarEntradaOficialVolume(
  volume
) {
  const entrada =
    volume?.entrada_oficial &&
    typeof volume.entrada_oficial ===
      "object"
      ? volume.entrada_oficial
      : {};

  return {
    realizada:
      Boolean(
        entrada.realizada
      ),

    encomendaId:
      entrada.encomenda_id ||
      null,

    promovidoEm:
      entrada.promovido_em ||
      null,

    promovidoEmLocal:
      entrada.promovido_em_local ||
      null,
  };
}


function normalizarAvariaVolume(
  avaria
) {
  if (
    !avaria ||
    typeof avaria !==
      "object"
  ) {
    return null;
  }

  return {
    ocorrenciaId:
      avaria.ocorrencia_id ||
      null,

    tipoOcorrencia:
      avaria.tipo_ocorrencia ||
      null,

    gravidade:
      avaria.gravidade ||
      null,

    status:
      avaria.status ||
      null,

    descricao:
      avaria.descricao ||
      null,

    decisaoOperacional:
      avaria.decisao_operacional ||
      null,

    requerFoto:
      Boolean(
        avaria.requer_foto
      ),

    requerRevisao:
      Boolean(
        avaria.requer_revisao
      ),
  };
}


function normalizarVolumeRecebimento(
  volume
) {
  if (!volume?.volume_id) {
    return null;
  }

  const avarias =
    Array.isArray(
      volume.avarias
    )
      ? volume.avarias
          .map(
            normalizarAvariaVolume
          )
          .filter(Boolean)
      : [];

  return {
    id:
      volume.volume_id,

    numeroVolume:
      volume.numero_volume ??
      null,

    codigoLido:
      volume.codigo_lido ||
      null,

    codigoNormalizado:
      volume.codigo_normalizado ||
      null,

    status:
      volume.status ||
      null,

    entradaOficial:
      normalizarEntradaOficialVolume(
        volume
      ),

    identificacao:
      normalizarIdentificacaoVolume(
        volume
      ),

    possuiAvaria:
      Boolean(
        volume.possui_avaria
      ),

    fotoAvariaPendente:
      Boolean(
        volume.foto_avaria_pendente
      ),

    avarias,
  };
}


function normalizarPreRecebimento(
  item
) {
  if (
    !item?.pre_recebimento_id
  ) {
    return null;
  }

  const volumes =
    Array.isArray(
      item.volumes
    )
      ? item.volumes
          .map(
            normalizarVolumeRecebimento
          )
          .filter(Boolean)
      : [];

  return {
    id:
      item.pre_recebimento_id,

    preRecebimentoId:
      item.pre_recebimento_id,

    numeroLote:
      item.numero_lote ??
      null,

    referenciaLote:
      item.referencia_lote ||
      null,

    correlationId:
      item.correlation_id ||
      null,

    businessId:
      item.business_id ||
      null,

    condominioId:
      item.condominio_id ||
      null,

    transportadoraId:
      item.transportadora_id ||
      null,

    transportadora:
      item.transportadora_nome ||
      null,

    entregador:
      item.entregador_nome ||
      null,

    entregadorEmpresa:
      item.entregador_empresa ||
      null,

    operadorUsuarioId:
      item.operador_usuario_id ||
      null,

    operadorUsername:
      item.operador_username ||
      null,

    status:
      item.status ||
      null,

    decisaoRecebimento:
      item.decisao_recebimento ||
      null,

    quantidadeInformada:
      item.quantidade_informada ??
      null,

    quantidadeCapturada:
      item.quantidade_bipada ??
      null,

    quantidadeConferida:
      item.quantidade_conferida ??
      null,

    possuiDivergenciaQuantidade:
      Boolean(
        item.possui_divergencia_quantidade
      ),

    justificativaDivergencia:
      item.justificativa_divergencia ||
      null,

    volumesTotal:
      normalizarNumero(
        item.volumes_total
      ),

    volumesAguardandoEntrada:
      normalizarNumero(
        item.volumes_aguardando_entrada
      ),

    volumesComEntradaOficial:
      normalizarNumero(
        item.volumes_com_entrada_oficial
      ),

    volumesComAvaria:
      normalizarNumero(
        item.volumes_com_avaria
      ),

    ocorrenciasAbertas:
      normalizarNumero(
        item.ocorrencias_abertas
      ),

    criadoEm:
      item.criado_em ||
      null,

    criadoEmLocal:
      item.criado_em_local ||
      null,

    finalizadoEm:
      item.finalizado_em ||
      null,

    finalizadoEmLocal:
      item.finalizado_em_local ||
      null,

    atualizadoEm:
      item.atualizado_em ||
      null,

    volumes,
  };
}


// ============================================================
// EXECUÇÃO GENÉRICA DAS RPCs DE PROCESSAMENTO
//
// Usada por:
// - processar_v2;
// - retomar_v2.
//
// Ambas possuem exatamente o mesmo contrato técnico.
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
    validarPayload(
      payload
    );


  const contexto = {
    ...obterContextoTecnicoRecebimento(),

    ...(contextoTecnico ||
      {}),
  };


  const {
    data,
    error,
  } =
    await supabase.rpc(
      rpc,
      {
        p_chave_idempotencia:
          chave,

        p_payload:
          payloadValidado,

        p_ip:
          contexto.ip ||
          null,

        p_user_agent:
          contexto.userAgent ||
          null,

        p_navegador:
          contexto.navegador ||
          null,

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


  return validarRespostaBackend(
    data,
    "Não foi possível processar o recebimento."
  );
}


// ============================================================
// FASE 1 — PROCESSAR RECEBIMENTO
//
// IndexedDB
// ↓
// payload final
// ↓
// processar_v2
// ↓
// Pré-Recebimento
//
// O payload DEVE utilizar confirmar=false.
//
// Esta função NÃO:
// - conclui o lote;
// - promove Encomenda Oficial;
// - executa Entrada Oficial.
// ============================================================

export async function processarRecebimento({
  chaveIdempotencia,
  payload,
  contextoTecnico = null,
} = {}) {
  if (
    payload?.confirmar ===
    true
  ) {
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
// RETOMAR FASE 1
//
// Utilizado quando não sabemos se processar_v2 chegou ou não
// ao servidor.
//
// REGRA:
//
// MESMA chave de idempotência
// +
// MESMO payload congelado.
//
// O backend reconcilia a operação.
//
// Depois deste retorno, o HOOK deverá:
// - persistir pre_recebimento_id;
// - executar lote_concluir_v3.
// ============================================================

export async function retomarRecebimento({
  chaveIdempotencia,
  payload,
  contextoTecnico = null,
} = {}) {
  if (
    payload?.confirmar ===
    true
  ) {
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
// FASE 2 — CONCLUIR LOTE
//
// Pré-Recebimento
// ↓
// rpc_encomenda_lote_concluir_v3
// ↓
// LOTE_CONCLUIDO
//
// Regras homologadas:
//
// FOTO DE AVARIA
// - ausência pode gerar pendência;
// - não bloqueia Concluir Recebimento;
// - poderá bloquear Entrada Oficial.
//
// ASSINATURA
// - ausência pode gerar pendência administrativa;
// - não bloqueia Concluir Recebimento.
//
// Esta RPC NÃO executa Entrada Oficial.
// ============================================================

export async function concluirLoteRecebimento({
  preRecebimentoId,

  quantidadeConferida,

  decisaoRecebimento =
    "ACEITO_NORMALMENTE",

  justificativaDivergencia =
    null,

  observacoes =
    null,

  contextoTecnico =
    null,
} = {}) {

  // ==========================================================
  // VALIDAR PRÉ
  // ==========================================================

  const preId =
    String(
      preRecebimentoId ||
      ""
    ).trim();


  if (!preId) {
    throw criarErroRecebimento({
      message:
        "Pré-Recebimento não identificado para conclusão do lote.",
    });
  }


  // ==========================================================
  // VALIDAR QUANTIDADE
  // ==========================================================

  const quantidade =
    Number(
      quantidadeConferida
    );


  if (
    !Number.isInteger(
      quantidade
    ) ||
    quantidade < 1
  ) {
    throw criarErroRecebimento({
      message:
        "Quantidade conferida inválida para conclusão do lote.",
    });
  }


  // ==========================================================
  // DECISÃO
  // ==========================================================

  const decisao =
    String(
      decisaoRecebimento ||
      "ACEITO_NORMALMENTE"
    )
      .trim()
      .toUpperCase();


  const decisoesPermitidas =
    new Set([
      "ACEITO_NORMALMENTE",
      "ACEITO_COM_RESSALVA",
    ]);


  if (
    !decisoesPermitidas.has(
      decisao
    )
  ) {
    throw criarErroRecebimento({
      message:
        "Decisão de recebimento inválida para conclusão do lote.",
    });
  }


  // ==========================================================
  // CONTEXTO TÉCNICO
  // ==========================================================

  const contexto = {
    ...obterContextoTecnicoRecebimento(),

    ...(contextoTecnico ||
      {}),
  };


  // ==========================================================
  // RPC V3
  // ==========================================================

  const {
    data,
    error,
  } =
    await supabase.rpc(
      RPC.CONCLUIR_LOTE,
      {
        p_pre_recebimento_id:
          preId,

        p_quantidade_conferida:
          quantidade,

        p_decisao_recebimento:
          decisao,

        p_justificativa_divergencia:
          justificativaDivergencia
            ?.trim() ||
          null,

        p_observacoes:
          observacoes
            ?.trim() ||
          null,

        p_ip:
          contexto.ip ||
          null,

        p_user_agent:
          contexto.userAgent ||
          null,

        p_navegador:
          contexto.navegador ||
          null,

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
      "Não foi possível concluir o lote de recebimento."
    );
  }


  return validarRespostaBackend(
    data,
    "Não foi possível concluir o lote de recebimento."
  );
}


// ============================================================
// DETECÇÃO BÁSICA DE CONECTIVIDADE
//
// navigator.onLine é apenas sinal auxiliar de UX.
// Não representa confirmação do servidor.
// ============================================================

export function navegadorEstaOnline() {
  if (
    typeof navigator ===
    "undefined"
  ) {
    return true;
  }


  return (
    navigator.onLine !==
    false
  );
}


// ============================================================
// CLASSIFICAR PROVÁVEL ERRO DE REDE
//
// Não decide regra de negócio.
// Apenas auxilia o hook a distinguir:
// - provável falha de rede;
// - rejeição explícita do backend.
// ============================================================

export function erroPareceConectividade(
  error
) {
  if (!error) {
    return false;
  }


  if (
    !navegadorEstaOnline()
  ) {
    return true;
  }


  const mensagem =
    String(
      error.message ||
      ""
    ).toLowerCase();


  const code =
    String(
      error.code ||
      ""
    ).toLowerCase();


  return (
    mensagem.includes(
      "failed to fetch"
    ) ||

    mensagem.includes(
      "network"
    ) ||

    mensagem.includes(
      "networkerror"
    ) ||

    mensagem.includes(
      "connection"
    ) ||

    mensagem.includes(
      "timeout"
    ) ||

    mensagem.includes(
      "load failed"
    ) ||

    code ===
      "fetch_error" ||

    code ===
      "network_error"
  );
}


// ============================================================
// TRANSPORTADORAS OFICIAIS
//
// Fonte única:
//
// rpc_encomendas_transportadoras_disponiveis_v1
//
// O frontend NÃO consulta public.transportadoras diretamente.
// ============================================================

function normalizarTransportadoraRecebimento(
  transportadora
) {
  if (
    !transportadora?.id
  ) {
    return null;
  }


  const businessId =
    transportadora.business_id ||
    null;


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
     * TRP-00022 já representa oficialmente:
     * Outras Transportadoras.
     *
     * Não usamos UUID fixo no frontend.
     */
    ehOutras:
      businessId ===
      "TRP-00022",
  };
}


// ============================================================
// LISTAR TRANSPORTADORAS
// ============================================================

export async function listarTransportadorasRecebimento({
  condominioId,

  busca =
    null,

  limite =
    100,

  offset =
    0,
} = {}) {
  if (!condominioId) {
    throw criarErroRecebimento({
      message:
        "Condomínio não identificado para carregar as transportadoras.",
    });
  }


  const {
    data,
    error,
  } =
    await supabase.rpc(
      RPC.LISTAR_TRANSPORTADORAS,
      {
        p_condominio_id:
          condominioId,

        p_busca:
          busca?.trim() ||
          null,

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


  const resultado =
    validarRespostaBackend(
      data,
      "Não foi possível carregar as transportadoras."
    );


  /*
   * Contrato:
   *
   * {
   *   ok,
   *   itens,
   *   total,
   *   limite,
   *   offset
   * }
   */
  const itens =
    Array.isArray(
      resultado?.itens
    )
      ? resultado.itens
      : [];


  const transportadoras =
    itens
      .map(
        normalizarTransportadoraRecebimento
      )
      .filter(
        Boolean
      );


  return {
    ok:
      true,

    transportadoras,

    total:
      Number(
        resultado?.total ??
        transportadoras.length
      ),

    limite:
      Number(
        resultado?.limite ??
        limite
      ),

    offset:
      Number(
        resultado?.offset ??
        offset
      ),
  };
}

// ============================================================
// TELA PRINCIPAL — LISTAR PRÉ-RECEBIMENTOS
//
// Fonte única:
// rpc_encomenda_pre_recebimentos_listar_v2
//
// Retorna uma linha por Lote.
// volumes[] alimenta a sanfona/subtabela.
// ============================================================

export async function listarPreRecebimentosRecebimento({
  condominioId,

  busca =
    null,

  status =
    null,

  transportadoraId =
    null,

  apenasMeusProcessos =
    false,

  dataInicio =
    null,

  dataFim =
    null,

  limite =
    30,

  offset =
    0,
} = {}) {
  if (!condominioId) {
    throw criarErroRecebimento({
      message:
        "Condomínio não identificado para carregar os Pré-Recebimentos.",
    });
  }


  const {
    data,
    error,
  } =
    await supabase.rpc(
      RPC.LISTAR_PRE_RECEBIMENTOS,
      {
        p_condominio_id:
          condominioId,

        p_busca:
          busca?.trim() ||
          null,

        p_status:
          status?.trim() ||
          null,

        p_transportadora_id:
          transportadoraId ||
          null,

        p_apenas_meus_processos:
          Boolean(
            apenasMeusProcessos
          ),

        p_data_inicio:
          dataInicio ||
          null,

        p_data_fim:
          dataFim ||
          null,

        p_limite:
          limite,

        p_offset:
          offset,
      }
    );


  if (error) {
    throw normalizarErroSupabase(
      error,
      "Não foi possível carregar os Pré-Recebimentos."
    );
  }


  const resultado =
    validarRespostaBackend(
      data,
      "Não foi possível carregar os Pré-Recebimentos."
    );


  const itens =
    Array.isArray(
      resultado?.itens
    )
      ? resultado.itens
      : [];


  const recebimentos =
    itens
      .map(
        normalizarPreRecebimento
      )
      .filter(Boolean);


  return {
    ok:
      true,

    recebimentos,

    total:
      normalizarNumero(
        resultado?.total,
        recebimentos.length
      ),

    limite:
      normalizarNumero(
        resultado?.limite,
        limite
      ),

    offset:
      normalizarNumero(
        resultado?.offset,
        offset
      ),

    timezoneIana:
      resultado?.timezone_iana ||
      null,
  };
}

// ============================================================
// TELA PRINCIPAL — RESUMO OPERACIONAL
//
// Fonte única:
// rpc_encomenda_recebimento_resumo_v1
//
// Alimenta:
// - Entradas oficiais hoje;
// - Aguardando Entrada Oficial;
// - Com divergência;
// - Com avaria;
// - micrográficos dos últimos 7 dias.
// ============================================================

export async function obterResumoRecebimento({
  condominioId,
} = {}) {
  if (!condominioId) {
    throw criarErroRecebimento({
      message:
        "Condomínio não identificado para carregar o resumo do Recebimento.",
    });
  }


  const {
    data,
    error,
  } =
    await supabase.rpc(
      RPC.OBTER_RESUMO_RECEBIMENTO,
      {
        p_condominio_id:
          condominioId,
      }
    );


  if (error) {
    throw normalizarErroSupabase(
      error,
      "Não foi possível carregar o resumo operacional do Recebimento."
    );
  }


  const resultado =
    validarRespostaBackend(
      data,
      "Não foi possível carregar o resumo operacional do Recebimento."
    );


  return {
    ok:
      true,

    condominioId:
      resultado?.condominio_id ||
      condominioId,

    timezoneIana:
      resultado?.timezone_iana ||
      null,

    dataLocal:
      resultado?.data_local ||
      null,

    entradasOficiaisHoje:
      normalizarResumoItem(
        resultado
          ?.entradas_oficiais_hoje
      ),

    aguardandoEntradaOficial:
      normalizarResumoItem(
        resultado
          ?.aguardando_entrada_oficial
      ),

    comDivergencia:
      normalizarResumoItem(
        resultado
          ?.com_divergencia
      ),

    comAvaria:
      normalizarResumoItem(
        resultado
          ?.com_avaria
      ),
  };
}

// ============================================================
// RECEBIMENTO — TRANSPORTADORAS PRESENTES NA FILA
//
// Não retorna o catálogo global.
//
// Retorna somente transportadoras presentes na fila
// operacional dentro do período consultado.
//
// Para registros originados de "Outras", preserva o
// nome informado pelo operador.
// ============================================================

export async function listarTransportadorasFiltroRecebimento({
  condominioId,
  dataInicio = null,
  dataFim = null,
} = {}) {
  if (!condominioId) {
    throw criarErroRecebimento({
      message:
        "Condomínio não identificado para carregar as transportadoras da fila.",
    });
  }


  const {
    data,
    error,
  } =
    await supabase.rpc(
      RPC.TRANSPORTADORAS_FILTRO,
      {
        p_condominio_id:
          condominioId,

        p_data_inicio:
          dataInicio ||
          null,

        p_data_fim:
          dataFim ||
          null,
      }
    );


  if (error) {
    throw normalizarErroSupabase(
      error,
      "Não foi possível carregar as transportadoras da fila."
    );
  }


  const resultado =
    validarRespostaBackend(
      data,
      "Não foi possível carregar as transportadoras da fila."
    );


  const itens =
    Array.isArray(
      resultado?.transportadoras
    )
      ? resultado.transportadoras
      : [];


  return {
    ok:
      true,

    transportadoras:
      itens.map(
        (item) => ({
          filtroKey:
            item?.filtro_key ||
            null,

          transportadoraId:
            item?.transportadora_id ||
            null,

          nome:
            item?.nome_exibicao ||
            "Transportadora",
        })
      ),
  };
}