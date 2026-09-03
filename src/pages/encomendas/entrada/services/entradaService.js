import { supabase } from "../../../../services/supabase";

// ============================================================
// SISTEMA CHEGOU!
// CENTRAL DE ENCOMENDAS — ENTRADA OFICIAL
// SERVICE
//
// Responsabilidade:
// - única camada da Entrada autorizada a conversar com Supabase;
// - consumir somente contratos públicos homologados;
// - normalizar respostas para apresentação;
// - nunca resolver autorização no React;
// - nunca acessar tabelas diretamente.
//
// MULTI-TENANT:
// O condominioId recebido representa o contexto solicitado.
// A autoridade continua sendo o backend:
// auth.uid() + vínculo + condomínio + business + permissão.
// ============================================================

const RPC = Object.freeze({
  LISTAR_FILA:
    "rpc_encomenda_pre_recebimentos_listar_v2",

  OBTER_RESUMO:
    "rpc_encomenda_recebimento_resumo_v1",

  TRANSPORTADORAS_FILTRO:
    "rpc_encomenda_recebimento_transportadoras_filtro_v1",

  LOCALIZAR_VOLUME_POR_CODIGO:
    "rpc_encomenda_volume_localizar_entrada_por_codigo_v1",

  OBTER_CONTEXTO_VOLUME:
    "rpc_encomenda_volume_contexto_entrada_v1",

  CONFIRMAR_ENTRADA:
    "rpc_encomenda_entrada_confirmar_v1",
});

// ============================================================
// ERROS
// ============================================================

function criarErroEntrada({
  message,
  code = null,
  details = null,
  hint = null,
  originalError = null,
} = {}) {
  const error = new Error(
    message ||
      "Não foi possível concluir a operação."
  );

  error.name = "EntradaServiceError";
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
    return criarErroEntrada({
      message: mensagemPadrao,
    });
  }

  const mensagemBackend =
    String(error.message || "").trim();

  let mensagemUsuario =
    mensagemPadrao;

  if (
    /acesso negado/i.test(mensagemBackend) ||
    error.code === "42501"
  ) {
    mensagemUsuario =
      "Você não possui permissão para acessar esta operação.";
  } else if (
    /não autenticado|nao autenticado/i.test(
      mensagemBackend
    )
  ) {
    mensagemUsuario =
      "Sua sessão não está disponível. Entre novamente para continuar.";
  } else if (
    /volume não encontrado|volume nao encontrado/i.test(
      mensagemBackend
    )
  ) {
    mensagemUsuario =
      "Este volume não está mais disponível para processamento.";
  }

  return criarErroEntrada({
    message: mensagemUsuario,
    code: error.code || null,
    details: error.details || null,
    hint: error.hint || null,
    originalError: error,
  });
}

// ============================================================
// RESPOSTA BACKEND
// ============================================================

function validarRespostaBackend(
  data,
  mensagemPadrao
) {
  if (!data || typeof data !== "object") {
    throw criarErroEntrada({
      message: mensagemPadrao,
    });
  }

  if (data.ok === false) {
    throw criarErroEntrada({
      message:
        data.message ||
        data.mensagem ||
        mensagemPadrao,
      code:
        data.code ||
        data.codigo ||
        null,
    });
  }

  return data;
}

// ============================================================
// NORMALIZAÇÕES BÁSICAS
// ============================================================

function normalizarNumero(
  value,
  fallback = 0
) {
  const numero = Number(value);

  return Number.isFinite(numero)
    ? numero
    : fallback;
}

function textoOuNull(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const texto =
    String(value).trim();

  return texto || null;
}

function capitalizarNome(value) {
  const texto =
    textoOuNull(value);

  if (!texto) {
    return null;
  }

  return texto
    .toLocaleLowerCase("pt-BR")
    .replace(
      /(^|[\s'-])([\p{L}])/gu,
      (_, separador, letra) =>
        `${separador}${letra.toLocaleUpperCase(
          "pt-BR"
        )}`
    );
}

// ============================================================
// DATA/HORA
//
// O backend já devolve *_local usando o timezone oficial
// do condomínio. Não recalculamos timezone no navegador.
// ============================================================

function formatarDataHoraLocal(value) {
  const texto =
    textoOuNull(value);

  if (!texto) {
    return "—";
  }

  const match =
    texto.match(
      /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/
    );

  if (!match) {
    return texto;
  }

  const [
    ,
    ano,
    mes,
    dia,
    hora,
    minuto,
  ] = match;

  return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
}

// ============================================================
// STATUS — APENAS APRESENTAÇÃO
// ============================================================

function obterSituacaoLote(item) {
  if (
    item?.status ===
    "PARCIALMENTE_PROCESSADO"
  ) {
    return {
      codigo: "ENTRADA_PARCIAL",
      label: "Entrada parcial",
    };
  }

  if (
    item?.possui_divergencia_quantidade ===
    true
  ) {
    return {
      codigo: "COM_DIVERGENCIA",
      label: "Com divergência",
    };
  }

  if (
    normalizarNumero(
      item?.volumes_com_avaria
    ) > 0
  ) {
    return {
      codigo: "COM_AVARIA",
      label: "Com avaria",
    };
  }

  return {
    codigo: "AGUARDANDO_ENTRADA",
    label: "Aguardando entrada",
  };
}

function obterSituacaoVolume(volume) {
  if (
    volume?.entrada_oficial
      ?.realizada === true
  ) {
    return {
      codigo: "ENTRADA_CONCLUIDA",
      label: "Entrada concluída",
    };
  }

  if (
    volume?.possui_avaria === true
  ) {
    return {
      codigo: "COM_AVARIA",
      label: "Com avaria",
    };
  }

  switch (
    volume?.identificacao_status
  ) {
    case "RASTREIO_RECONHECIDO":
      return {
        codigo:
          "DESTINATARIO_IDENTIFICADO",
        label:
          "Destinatário identificado",
      };

    case "EM_IDENTIFICACAO":
      return {
        codigo: "EM_IDENTIFICACAO",
        label: "Em identificação",
      };

    case "AGUARDANDO_IDENTIFICACAO":
      return {
        codigo:
          "PENDENTE_IDENTIFICACAO",
        label:
          "Identificação pendente",
      };

    default:
      return {
        codigo: "AGUARDANDO_ENTRADA",
        label: "Aguardando entrada",
      };
  }
}

// ============================================================
// VOLUME
// ============================================================

function normalizarVolume(
  volume,
  lote
) {
  if (!volume?.volume_id) {
    return null;
  }

  const situacao =
    obterSituacaoVolume(volume);

  const identificacao =
    volume?.identificacao &&
    typeof volume.identificacao ===
      "object"
      ? volume.identificacao
      : {};

  const numeroVolume =
    normalizarNumero(
      volume.numero_volume,
      0
    );

  return {
    id:
      volume.volume_id,

    volumeId:
      volume.volume_id,

    preRecebimentoId:
      lote?.pre_recebimento_id ||
      null,

    referenciaLote:
      lote?.referencia_lote ||
      null,

    referencia:
      numeroVolume > 0
        ? `Volume ${numeroVolume}`
        : "Volume",

    numeroVolume,

    codigoCapturado:
      textoOuNull(
        volume.codigo_lido
      ) ||
      "Não informado",

    codigoNormalizado:
      textoOuNull(
        volume.codigo_normalizado
      ),

    status:
      volume.status ||
      null,

    situacao:
      situacao.codigo,

    situacaoLabel:
      situacao.label,

    possuiAvaria:
      volume.possui_avaria ===
      true,

    avarias:
      Array.isArray(volume.avarias)
        ? volume.avarias
        : [],

    fotoAvariaPendente:
      volume.foto_avaria_pendente ===
      true,

    rastreioAguardado:
      volume.rastreio_aguardado ===
      true,

    rastreioAguardadoId:
      volume.rastreio_aguardado_id ||
      null,

    rastreioStatus:
      volume.rastreio_status ||
      null,

    identificacaoStatus:
      volume.identificacao_status ||
      null,

    unidadeId:
      identificacao.unidade_id ||
      null,

    torre:
      textoOuNull(
        identificacao.torre
      ),

    bloco:
      textoOuNull(
        identificacao.bloco
      ),

    unidade:
      textoOuNull(
        identificacao.unidade
      ),

    beneficiarioPessoaId:
      identificacao
        .beneficiario_pessoa_id ||
      null,

    beneficiarioDependenteId:
      identificacao
        .beneficiario_dependente_id ||
      null,

    beneficiarioNome:
      capitalizarNome(
        identificacao.beneficiario_nome
      ),

    entradaOficial:
      volume?.entrada_oficial &&
      typeof volume.entrada_oficial ===
        "object"
        ? volume.entrada_oficial
        : null,

    contextType:
      "volume",
  };
}

// ============================================================
// LOTE
// ============================================================

function normalizarLote(item) {
  if (!item?.pre_recebimento_id) {
    return null;
  }

  const situacao =
    obterSituacaoLote(item);

  const volumesBrutos =
    Array.isArray(item.volumes)
      ? item.volumes
      : [];

  const volumes =
    volumesBrutos
      .map((volume) =>
        normalizarVolume(
          volume,
          item
        )
      )
      .filter(Boolean);

  return {
    id:
      item.pre_recebimento_id,

    preRecebimentoId:
      item.pre_recebimento_id,

    correlationId:
      item.correlation_id ||
      null,

    businessId:
      item.business_id ||
      null,

    condominioId:
      item.condominio_id ||
      null,

    numeroLote:
      normalizarNumero(
        item.numero_lote,
        0
      ),

    referenciaLote:
      textoOuNull(
        item.referencia_lote
      ) ||
      "Lote",

    transportadoraId:
      item.transportadora_id ||
      null,

    transportadora:
      capitalizarNome(
        item.transportadora_nome
      ) ||
      "Não informada",

    entregadorNome:
      capitalizarNome(
        item.entregador_nome
      ),

    entregadorEmpresa:
      capitalizarNome(
        item.entregador_empresa
      ),

    operadorUsuarioId:
      item.operador_usuario_id ||
      null,

    operadorNome:
      capitalizarNome(
        item.operador_username
      ),

    status:
      item.status ||
      null,

    situacao:
      situacao.codigo,

    situacaoLabel:
      situacao.label,

    possuiDivergencia:
      item
        .possui_divergencia_quantidade ===
      true,

    justificativaDivergencia:
      textoOuNull(
        item.justificativa_divergencia
      ),

    totalVolumes:
      normalizarNumero(
        item.volumes_total,
        volumes.length
      ),

    volumesAguardandoEntrada:
      normalizarNumero(
        item.volumes_aguardando_entrada
      ),

    volumesComEntrada:
      normalizarNumero(
        item
          .volumes_com_entrada_oficial
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

    recebidoEm:
      formatarDataHoraLocal(
        item.finalizado_em_local ||
        item.criado_em_local
      ),

    volumes,
  };
}

// ============================================================
// RESUMO
// ============================================================

function normalizarResumoItem(
  value
) {
  if (
    value &&
    typeof value === "object"
  ) {
    return {
      total:
        normalizarNumero(
          value.total
        ),

      serie:
        Array.isArray(value.serie)
          ? value.serie
          : [],
    };
  }

  return {
    total:
      normalizarNumero(value),

    serie: [],
  };
}

function normalizarResumo(
  resultado,
  condominioId
) {
  return {
    condominioId:
      resultado?.condominio_id ||
      condominioId,

    timezoneIana:
      resultado?.timezone_iana ||
      null,

    dataLocal:
      resultado?.data_local ||
      null,

    entradasHoje:
      normalizarResumoItem(
        resultado
          ?.entradas_oficiais_hoje
      ),

    aguardandoEntrada:
      normalizarResumoItem(
        resultado
          ?.aguardando_entrada_oficial
      ),

    comDivergencia:
      normalizarResumoItem(
        resultado?.com_divergencia
      ),

    comAvaria:
      normalizarResumoItem(
        resultado?.com_avaria
      ),
  };
}

// ============================================================
// LOCALIZAÇÃO DO VOLUME — RESPOSTA NORMALIZADA
//
// O backend é a fonte autoritativa para:
// - normalização do código;
// - escopo do condomínio;
// - cardinalidade;
// - integridade da cadeia Volume → Entrada → Encomenda;
// - estado persistido;
// - próxima etapa permitida.
//
// O frontend apenas consome o resultado.
// ============================================================

function normalizarLocalizacaoVolumeEntrada(
  resultado
) {
  return {
    ok:
      resultado?.ok !== false,

    resultado:
      textoOuNull(
        resultado?.resultado
      ),

    localizado:
      resultado?.localizado === true,

    podeRetomar:
      resultado?.pode_retomar === true,

    motivo:
      textoOuNull(
        resultado?.motivo
      ),

    codigoNormalizado:
      textoOuNull(
        resultado?.codigo_normalizado
      ),

    quantidadeCandidatos:
      resultado?.quantidade_candidatos ===
        null ||
      resultado?.quantidade_candidatos ===
        undefined
        ? null
        : normalizarNumero(
            resultado.quantidade_candidatos,
            0
          ),

    quantidadeEntradas:
      resultado?.quantidade_entradas ===
        null ||
      resultado?.quantidade_entradas ===
        undefined
        ? null
        : normalizarNumero(
            resultado.quantidade_entradas,
            0
          ),

    businessId:
      resultado?.business_id ||
      null,

    condominioId:
      resultado?.condominio_id ||
      null,

    volumeId:
      resultado?.volume_id ||
      null,

    preRecebimentoId:
      resultado?.pre_recebimento_id ||
      null,

    referenciaLote:
      textoOuNull(
        resultado?.referencia_lote
      ),

    statusLote:
      textoOuNull(
        resultado?.status_lote
      ),

    statusVolume:
      textoOuNull(
        resultado?.status_volume
      ),

    encomendaId:
      resultado?.encomenda_id ||
      null,

    numeroEncomenda:
      resultado?.numero_encomenda ??
      null,

    statusEncomenda:
      textoOuNull(
        resultado?.status_encomenda
      ),

    tipoEntrega:
      textoOuNull(
        resultado?.tipo_entrega
      ),

    entradaId:
      resultado?.entrada_id ||
      null,

    etapaAtual:
      textoOuNull(
        resultado?.etapa_atual
      ),

    proximaEtapa:
      textoOuNull(
        resultado?.proxima_etapa
      ),

    timezoneIana:
      textoOuNull(
        resultado?.timezone_iana
      ),

    entradaConfirmadaEm:
      resultado?.entrada_confirmada_em ||
      null,

    entradaConfirmadaEmLocal:
      resultado
        ?.entrada_confirmada_em_local ||
      null,

    armazenadoEm:
      resultado?.armazenado_em ||
      null,

    armazenadoEmLocal:
      resultado?.armazenado_em_local ||
      null,

    localizacaoAtualId:
      resultado?.localizacao_atual_id ||
      null,

    disponibilizadoEm:
      resultado?.disponibilizado_em ||
      null,

    disponibilizadoEmLocal:
      resultado
        ?.disponibilizado_em_local ||
      null,

    retiradoEm:
      resultado?.retirado_em ||
      null,

    finalizadoEm:
      resultado?.finalizado_em ||
      null,
  };
}

// ============================================================
// FILA
// ============================================================

export async function listarFilaEntrada({
  condominioId,

  busca = null,

  status = null,

  transportadoraId = null,

  apenasMeusProcessos = false,

  dataInicio = null,

  dataFim = null,

  limite = 30,

  offset = 0,
} = {}) {
  if (!condominioId) {
    throw criarErroEntrada({
      message:
        "Não foi possível identificar o condomínio atual.",
    });
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      RPC.LISTAR_FILA,
      {
        p_condominio_id:
          condominioId,

        p_busca:
          textoOuNull(busca),

        p_status:
          textoOuNull(status),

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
          Math.max(
            1,
            Math.min(
              normalizarNumero(
                limite,
                30
              ),
              100
            )
          ),

        p_offset:
          Math.max(
            0,
            normalizarNumero(
              offset,
              0
            )
          ),
      }
    );

  if (error) {
    throw normalizarErroSupabase(
      error,
      "Não foi possível carregar a fila de Entrada."
    );
  }

  const resultado =
    validarRespostaBackend(
      data,
      "Não foi possível carregar a fila de Entrada."
    );

  const itens =
    Array.isArray(resultado.itens)
      ? resultado.itens
      : [];

  const lotes =
    itens
      .map(normalizarLote)
      .filter(Boolean);

  return {
    ok: true,

    condominioId:
      resultado.condominio_id ||
      condominioId,

    timezoneIana:
      resultado.timezone_iana ||
      null,

    total:
      normalizarNumero(
        resultado.total,
        lotes.length
      ),

    limite:
      normalizarNumero(
        resultado.limite,
        limite
      ),

    offset:
      normalizarNumero(
        resultado.offset,
        offset
      ),

    lotes,
  };
}

// ============================================================
// RESUMO OPERACIONAL
// ============================================================

export async function obterResumoEntrada({
  condominioId,
} = {}) {
  if (!condominioId) {
    throw criarErroEntrada({
      message:
        "Não foi possível identificar o condomínio atual.",
    });
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      RPC.OBTER_RESUMO,
      {
        p_condominio_id:
          condominioId,
      }
    );

  if (error) {
    throw normalizarErroSupabase(
      error,
      "Não foi possível carregar o resumo da Entrada."
    );
  }

  const resultado =
    validarRespostaBackend(
      data,
      "Não foi possível carregar o resumo da Entrada."
    );

  return {
    ok: true,
    resumo:
      normalizarResumo(
        resultado,
        condominioId
      ),
  };
}

// ============================================================
// LOCALIZADOR AUTORITATIVO DO VOLUME POR CÓDIGO
//
// Entrada:
// - condominioId: contexto operacional atual solicitado pela UI;
// - codigo: valor bruto capturado pelo leitor/câmera/teclado.
//
// Segurança:
// - o condominioId NÃO é autoridade;
// - o backend revalida auth.uid() + vínculo + condomínio +
//   business + permissão;
// - a normalização oficial do código ocorre somente no backend.
//
// Esta função é somente leitura.
// ============================================================

export async function localizarVolumeEntradaPorCodigo({
  condominioId,
  codigo,
} = {}) {
  if (!condominioId) {
    throw criarErroEntrada({
      message:
        "Não foi possível identificar o condomínio atual.",
    });
  }

  const codigoInformado =
    textoOuNull(codigo);

  if (!codigoInformado) {
    throw criarErroEntrada({
      message:
        "Informe ou leia o código da encomenda.",
    });
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      RPC.LOCALIZAR_VOLUME_POR_CODIGO,
      {
        p_condominio_id:
          condominioId,

        /*
         * Enviamos o valor capturado sem tentar reproduzir
         * a normalização oficial no navegador.
         * O backend usa fn_encomendas_normalizar_rastreio_v1.
         */
        p_codigo:
          codigoInformado,
      }
    );

  if (error) {
    throw normalizarErroSupabase(
      error,
      "Não foi possível localizar esta encomenda."
    );
  }

  const resultado =
    validarRespostaBackend(
      data,
      "Não foi possível localizar esta encomenda."
    );

  return normalizarLocalizacaoVolumeEntrada(
    resultado
  );
}

// ============================================================
// CONTEXTO AUTORITATIVO DO VOLUME
//
// Será usado no Workspace em E3.2.
// Já deixamos o contrato preparado no service.
// ============================================================

export async function obterContextoVolumeEntrada({
  volumeId,
} = {}) {
  if (!volumeId) {
    throw criarErroEntrada({
      message:
        "Não foi possível identificar o volume selecionado.",
    });
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      RPC.OBTER_CONTEXTO_VOLUME,
      {
        p_volume_id:
          volumeId,
      }
    );

  if (error) {
    throw normalizarErroSupabase(
      error,
      "Não foi possível carregar os dados deste volume."
    );
  }

  return validarRespostaBackend(
    data,
    "Não foi possível carregar os dados deste volume."
  );
}

// ============================================================
// CONFIRMAÇÃO PRODUTIVA DA ENTRADA
// ============================================================

export async function confirmarEntrada({
  volumeId,

  unidadeId,

  destinatarioTipo,

  destinatarioMoradorVinculoId = null,

  destinatarioDependenteId = null,

  destinatarioUsuarioId = null,

  destinatarioPessoaId = null,

  destinatarioNome = null,

  tipoEntrega = null,

  prioridade = "NORMAL",

  observacoes = null,

  chaveIdempotencia,
} = {}) {
  if (!volumeId) {
    throw criarErroEntrada({
      message:
        "Não foi possível identificar o volume.",
    });
  }

  if (!unidadeId) {
    throw criarErroEntrada({
      message:
        "Não foi possível identificar a unidade do destinatário.",
    });
  }

  if (!destinatarioTipo) {
    throw criarErroEntrada({
      message:
        "Não foi possível identificar o tipo do destinatário.",
    });
  }

  const destinatarioIdentificado =
    destinatarioTipo === "DEPENDENTE"
      ? Boolean(
          destinatarioDependenteId
        )
      : destinatarioTipo === "MORADOR"
        ? Boolean(
            destinatarioMoradorVinculoId ||
            destinatarioPessoaId ||
            destinatarioUsuarioId
          )
        : Boolean(
            destinatarioPessoaId ||
            destinatarioUsuarioId
          );

  if (!destinatarioIdentificado) {
    throw criarErroEntrada({
      message:
        "Não foi possível identificar o destinatário.",
    });
  }

  if (!chaveIdempotencia) {
    throw criarErroEntrada({
      message:
        "Não foi possível preparar a confirmação com segurança.",
    });
  }

  const userAgent =
    typeof navigator !==
    "undefined"
      ? navigator.userAgent ||
        null
      : null;

  const sistemaOperacional =
    typeof navigator !==
    "undefined"
      ? navigator.platform ||
        null
      : null;

  const tipoDispositivo =
    typeof navigator !==
      "undefined" &&
    /Android|iPhone|iPad|iPod|Mobile/i.test(
      navigator.userAgent ||
      ""
    )
      ? "MOBILE"
      : "DESKTOP";

  const {
    data,
    error,
  } =
    await supabase.rpc(
      RPC.CONFIRMAR_ENTRADA,
      {
        p_volume_id:
          volumeId,

        p_unidade_id:
          unidadeId,

        p_destinatario_tipo:
          destinatarioTipo,

        p_destinatario_morador_vinculo_id:
          destinatarioMoradorVinculoId,

        p_destinatario_dependente_id:
          destinatarioDependenteId,

        p_destinatario_usuario_id:
          destinatarioUsuarioId,

        p_destinatario_pessoa_id:
          destinatarioPessoaId,

        p_destinatario_nome_informado:
          destinatarioNome,

        p_tipo_entrega:
          tipoEntrega,

        p_prioridade:
          prioridade,

        p_observacoes:
          observacoes,

        p_chave_idempotencia:
          chaveIdempotencia,

        /*
         * IP não é confiado ao navegador.
         * Quando houver captura autoritativa de rede,
         * será feita em camada apropriada.
         */
        p_ip:
          null,

        p_user_agent:
          userAgent,

        p_navegador:
          null,

        p_sistema_operacional:
          sistemaOperacional,

        p_tipo_dispositivo:
          tipoDispositivo,

        p_identificador_dispositivo:
          null,
      }
    );

  if (error) {
    throw normalizarErroSupabase(
      error,
      "Não foi possível confirmar a Entrada."
    );
  }

  return validarRespostaBackend(
    data,
    "Não foi possível confirmar a Entrada."
  );
}

// ============================================================
// TRANSPORTADORAS PRESENTES NA FILA
// ============================================================

export async function listarTransportadorasFiltroEntrada({
  condominioId,
  dataInicio = null,
  dataFim = null,
} = {}) {
  if (!condominioId) {
    throw criarErroEntrada({
      message:
        "Não foi possível identificar o condomínio atual.",
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

  const normalizados =
    itens
      .map(
        (
          item,
          index
        ) => {
          const id =
            item?.transportadora_id ||
            item?.id ||
            null;

          const nome =
            capitalizarNome(
              item?.nome_exibicao ||
              item?.transportadora_nome ||
              item?.transportadora_nome_informado ||
              item?.nome_fantasia ||
              item?.nome
            );

          if (!id || !nome) {
            return null;
          }

          return {
            key:
              item?.filtro_key ||
              `${id}:${nome}:${index}`,

            transportadoraId:
              id,

            nome,
          };
        }
      )
      .filter(Boolean);

  return {
    ok: true,

    condominioId:
      resultado?.condominio_id ||
      condominioId,

    transportadoras:
      normalizados,
  };
}

export const entradaService =
  Object.freeze({
    listarFilaEntrada,
    obterResumoEntrada,
    listarTransportadorasFiltroEntrada,
    localizarVolumeEntradaPorCodigo,
    obterContextoVolumeEntrada,
    confirmarEntrada,
  });

export default entradaService;