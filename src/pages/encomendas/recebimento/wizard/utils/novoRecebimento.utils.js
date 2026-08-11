import {
  NOVO_RECEBIMENTO_FORMATO_CODIGO,
  NOVO_RECEBIMENTO_INITIAL_STATE,
  NOVO_RECEBIMENTO_LOCAL_STATUS,
  NOVO_RECEBIMENTO_ORIGEM_CAPTURA,
  NOVO_RECEBIMENTO_SYNC_STATUS,
} from "../constants";


// ============================================================
// CLONE SEGURO DO ESTADO INICIAL
// Evita reaproveitar referências internas do objeto congelado.
// ============================================================

export function criarEstadoInicialNovoRecebimento() {
  return {
    ...NOVO_RECEBIMENTO_INITIAL_STATE,

    identificacao: {
      ...NOVO_RECEBIMENTO_INITIAL_STATE.identificacao,
    },

    captura: {
      ...NOVO_RECEBIMENTO_INITIAL_STATE.captura,
      volumes: [],
    },

    assinatura: null,
  };
}


// ============================================================
// UUID LOCAL
// Utilizado para:
// - clientReceiptId
// - clientVolumeId
// - chave de idempotência
//
// Não representa ID oficial do banco.
// ============================================================

export function gerarUuidLocal() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return [
    Date.now().toString(16),
    Math.random().toString(16).slice(2),
    Math.random().toString(16).slice(2),
  ].join("-");
}


// ============================================================
// IDENTIFICADOR LOCAL DO RECEBIMENTO
// ============================================================

export function gerarClientReceiptId() {
  return `receipt-${gerarUuidLocal()}`;
}


// ============================================================
// CHAVE DE IDEMPOTÊNCIA
//
// A RPC oficial exige chave com pelo menos 16 caracteres.
// Esta chave deve permanecer a mesma durante retries
// do MESMO payload final.
// ============================================================

export function gerarChaveIdempotenciaRecebimento() {
  return `recebimento-${gerarUuidLocal()}`;
}


// ============================================================
// NORMALIZAÇÃO VISUAL LOCAL
//
// IMPORTANTE:
// Isto NÃO substitui fn_encomendas_normalizar_rastreio_v1.
//
// Serve apenas para:
// - comparação local
// - feedback visual
// - prevenção simples de duplicidade no Wizard
//
// O backend continua sendo a autoridade.
// ============================================================

export function normalizarCodigoLocal(valor) {
  if (valor === null || valor === undefined) {
    return "";
  }

  return String(valor)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}


// ============================================================
// QUANTIDADE
// ============================================================

export function normalizarQuantidadeLocal(valor) {
  if (
    valor === "" ||
    valor === null ||
    valor === undefined
  ) {
    return "";
  }

  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return "";
  }

  const inteiro = Math.trunc(numero);

  if (inteiro < 0) {
    return 0;
  }

  return inteiro;
}


export function calcularQuantidadeBipada(volumes = []) {
  if (!Array.isArray(volumes)) {
    return 0;
  }

  return volumes.filter(
    (volume) => volume?.removido !== true
  ).length;
}


export function calcularDiferencaQuantidade(
  quantidadeInformada,
  quantidadeBipada
) {
  if (
    quantidadeInformada === "" ||
    quantidadeInformada === null ||
    quantidadeInformada === undefined
  ) {
    return null;
  }

  const informada = Number(quantidadeInformada);
  const bipada = Number(quantidadeBipada || 0);

  if (
    !Number.isFinite(informada) ||
    !Number.isFinite(bipada)
  ) {
    return null;
  }

  return bipada - informada;
}


export function possuiDivergenciaQuantidadeLocal(
  quantidadeInformada,
  quantidadeBipada
) {
  const diferenca = calcularDiferencaQuantidade(
    quantidadeInformada,
    quantidadeBipada
  );

  return diferenca !== null && diferenca !== 0;
}


// ============================================================
// VOLUME LOCAL
// ============================================================

export function criarVolumeLocal({
  codigoLido,
  formatoCodigo = NOVO_RECEBIMENTO_FORMATO_CODIGO.DESCONHECIDO,
  origemCaptura = NOVO_RECEBIMENTO_ORIGEM_CAPTURA.DIGITACAO_MANUAL,
  confianca = null,
} = {}) {
  const agora = new Date().toISOString();

  return {
    clientVolumeId: `volume-${gerarUuidLocal()}`,

    codigoLido: String(codigoLido || "").trim(),
    codigoNormalizadoLocal:
      normalizarCodigoLocal(codigoLido),

    formatoCodigo,
    origemCaptura,

    confianca,

    capturadoEm: agora,

    numeroVolume: null,

    removido: false,
    removidoEm: null,

    avaria: null,
    evidencias: [],

    serverVolumeId: null,

    moradorAguardandoRecebimento: null,

    syncStatus:
      NOVO_RECEBIMENTO_SYNC_STATUS.LOCAL,

    ultimoErro: null,
  };
}


// ============================================================
// DUPLICIDADE LOCAL
//
// Proteção de UX.
// O banco permanece com a proteção oficial.
// ============================================================

export function codigoJaExisteLocalmente(
  volumes,
  codigoLido
) {
  const codigoNormalizado =
    normalizarCodigoLocal(codigoLido);

  if (!codigoNormalizado) {
    return false;
  }

  return (volumes || []).some((volume) => {
    if (volume?.removido === true) {
      return false;
    }

    return (
      normalizarCodigoLocal(
        volume?.codigoLido
      ) === codigoNormalizado
    );
  });
}


// ============================================================
// REENUMERAÇÃO LOCAL
//
// Mantém a sequência visual dos volumes ativos.
// Não representa código oficial.
// ============================================================

export function reenumerarVolumesLocais(volumes = []) {
  let contador = 0;

  return volumes.map((volume) => {
    if (volume?.removido === true) {
      return volume;
    }

    contador += 1;

    return {
      ...volume,
      numeroVolume: contador,
    };
  });
}


// ============================================================
// ATUALIZAÇÃO DERIVADA DO ESTADO
// ============================================================

export function recalcularEstadoCaptura(state) {
  const volumes = reenumerarVolumesLocais(
    state?.captura?.volumes || []
  );

  const quantidadeBipada =
    calcularQuantidadeBipada(volumes);

  const possuiDivergencia =
    possuiDivergenciaQuantidadeLocal(
      state?.captura?.quantidadeInformada,
      quantidadeBipada
    );

  return {
    ...state,

    captura: {
      ...state.captura,
      volumes,
      quantidadeBipada,
    },

    possuiDivergenciaQuantidade:
      possuiDivergencia,

    atualizadoEm: new Date().toISOString(),
  };
}


// ============================================================
// ESTADO DE NOVO RECEBIMENTO ABERTO
// ============================================================

export function iniciarNovoRecebimentoLocal() {
  const agora = new Date().toISOString();

  return {
    ...criarEstadoInicialNovoRecebimento(),

    clientReceiptId:
      gerarClientReceiptId(),

    chaveIdempotencia:
      gerarChaveIdempotenciaRecebimento(),

    abertoEm: agora,
    atualizadoEm: agora,

    statusLocal:
      NOVO_RECEBIMENTO_LOCAL_STATUS.EM_ANDAMENTO,

    syncStatus:
      NOVO_RECEBIMENTO_SYNC_STATUS.LOCAL,
  };
}


// ============================================================
// VALIDAÇÃO VISUAL DAS ETAPAS
//
// Estas validações são apenas de UX.
// Não substituem validações das RPCs.
// ============================================================

export function podeAvancarIdentificacao(state) {
  const entregadorNome =
    state?.identificacao?.entregadorNome?.trim();

  const transportadoraId =
    state?.identificacao?.transportadoraId;

  return Boolean(
    entregadorNome &&
    transportadoraId
  );
}


export function podeIniciarCaptura(state) {
  const quantidade =
    state?.captura?.quantidadeInformada;

  if (
    quantidade === "" ||
    quantidade === null ||
    quantidade === undefined
  ) {
    return false;
  }

  const numero = Number(quantidade);

  return Number.isInteger(numero) && numero > 0;
}


export function podeConcluirRecebimento(state) {
  if (!podeAvancarIdentificacao(state)) {
    return false;
  }

  if (!podeIniciarCaptura(state)) {
    return false;
  }

  const quantidadeBipada =
    Number(state?.captura?.quantidadeBipada || 0);

  return quantidadeBipada > 0;
}


// ============================================================
// SERIALIZAÇÃO DO PAYLOAD
//
// IMPORTANTE:
// Este método apenas monta o contrato frontend.
//
// O service será responsável por enviar à RPC.
// Não inclui confirmar=true.
// Portanto NÃO promove para Encomenda Oficial.
// ============================================================

export function montarPayloadProcessarRecebimento({
  state,
  condominioId,
} = {}) {
  if (!state) {
    throw new Error(
      "Estado do recebimento não informado."
    );
  }

  if (!condominioId) {
    throw new Error(
      "Condomínio não informado."
    );
  }

  const volumesAtivos =
    (state.captura?.volumes || []).filter(
      (volume) => volume?.removido !== true
    );

  const ocorrencias = [];
  const evidencias = [];

  volumesAtivos.forEach(
    (volume, volumeIndice) => {
      if (volume?.avaria) {
        ocorrencias.push({
          volume_indice: volumeIndice,

          tipo_ocorrencia:
            volume.avaria.tipoOcorrencia ||
            "OUTRA_OCORRENCIA",

          gravidade:
            volume.avaria.gravidade ||
            "BAIXA",

          decisao_operacional:
            volume.avaria.decisaoOperacional ||
            null,

          descricao:
            volume.avaria.descricao || null,

          justificativa:
            volume.avaria.justificativa || null,

          requer_foto:
            Boolean(
              volume.avaria.requerFoto
            ),

          requer_revisao:
            Boolean(
              volume.avaria.requerRevisao
            ),

          metadata:
            volume.avaria.metadata || {},
        });

        const ocorrenciaIndice =
          ocorrencias.length - 1;

        (volume.evidencias || []).forEach(
          (evidencia) => {
            evidencias.push({
              volume_indice: volumeIndice,
              ocorrencia_indice:
                ocorrenciaIndice,

              tipo_evidencia:
                evidencia.tipoEvidencia ||
                "FOTO_AVARIA",

              bucket:
                evidencia.bucket || null,

              storage_path:
                evidencia.storagePath || null,

              mime_type:
                evidencia.mimeType || null,

              tamanho_bytes:
                evidencia.tamanhoBytes ?? null,

              largura_px:
                evidencia.larguraPx ?? null,

              altura_px:
                evidencia.alturaPx ?? null,

              hash_sha256:
                evidencia.hashSha256 || null,

              arquivo_original:
                Boolean(
                  evidencia.arquivoOriginal
                ),

              exif_removido:
                evidencia.exifRemovido !== false,

              classificacao_acesso:
                evidencia.classificacaoAcesso ||
                "INCIDENTE",

              retencao_dias:
                evidencia.retencaoDias ?? null,

              metadata:
                evidencia.metadata || {},
            });
          }
        );
      }
    }
  );

  return {
    condominio_id: condominioId,

    transportadora_id:
      state.identificacao.transportadoraId ||
      null,

    tipo_entrega:
      "ENCOMENDA_PADRAO",

    fluxo_operacional:
      "NORMAL",

    quantidade_informada:
      Number(
        state.captura.quantidadeInformada
      ),

    quantidade_conferida:
      Number(
        state.captura.quantidadeBipada
      ),

    entregador_nome:
      state.identificacao.entregadorNome
        ?.trim() || null,

    entregador_empresa:
      state.identificacao.transportadoraNome
        ?.trim() || null,

    observacoes:
      state.observacoes?.trim() || null,

    justificativa_divergencia:
      state.justificativaDivergencia
        ?.trim() || null,

    confirmar: false,

    volumes: volumesAtivos.map(
      (volume, index) => ({
        codigo_lido:
          volume.codigoLido || null,

        formato_codigo:
          volume.formatoCodigo ||
          NOVO_RECEBIMENTO_FORMATO_CODIGO.DESCONHECIDO,

        numero_volume: index + 1,

        origem_captura:
          volume.origemCaptura ||
          NOVO_RECEBIMENTO_ORIGEM_CAPTURA.DIGITACAO_MANUAL,

        confianca:
          volume.confianca ?? null,
      })
    ),

    capturas: [],

    ocorrencias,

    evidencias,

    assinatura: state.assinatura
      ? {
          registrar: true,

          tipo_assinatura:
            state.assinatura.tipoAssinatura ||
            "RECEBIMENTO_ENTREGADOR",

          nome_signatario:
            state.assinatura.nomeSignatario ||
            state.identificacao.entregadorNome ||
            null,

          documento_mascarado_signatario:
            state.assinatura.documentoMascarado ||
            null,

          bucket:
            state.assinatura.bucket || null,

          storage_path:
            state.assinatura.storagePath || null,

          hash_sha256:
            state.assinatura.hashSha256 || null,

          mime_type:
            state.assinatura.mimeType || null,

          tamanho_bytes:
            state.assinatura.tamanhoBytes ?? null,

          metadata:
            state.assinatura.metadata || {},
        }
      : {
          registrar: false,
        },
  };
}


// ============================================================
// MARCAÇÕES DE SINCRONIZAÇÃO
// ============================================================

export function marcarRecebimentoConcluindo(state) {
  return {
    ...state,

    statusLocal:
      NOVO_RECEBIMENTO_LOCAL_STATUS.CONCLUINDO,

    syncStatus:
      NOVO_RECEBIMENTO_SYNC_STATUS.SINCRONIZANDO,

    ultimoErro: null,

    atualizadoEm: new Date().toISOString(),
  };
}


export function marcarRecebimentoConcluido(
  state,
  resultado
) {
  return {
    ...state,

    statusLocal:
      NOVO_RECEBIMENTO_LOCAL_STATUS.CONCLUIDO,

    syncStatus:
      NOVO_RECEBIMENTO_SYNC_STATUS.SINCRONIZADO,

    preRecebimentoId:
      resultado?.pre_recebimento_id ||
      state.preRecebimentoId ||
      null,

    correlationId:
      resultado?.pre_recebimento
        ?.correlation_id ||
      state.correlationId ||
      null,

    ultimoErro: null,

    atualizadoEm: new Date().toISOString(),
  };
}


export function marcarRecebimentoAguardandoSincronizacao(
  state,
  erro = null
) {
  return {
    ...state,

    statusLocal:
      NOVO_RECEBIMENTO_LOCAL_STATUS
        .AGUARDANDO_SINCRONIZACAO,

    syncStatus:
      NOVO_RECEBIMENTO_SYNC_STATUS.PENDENTE,

    ultimoErro: erro
      ? {
          message:
            erro?.message ||
            "Falha de sincronização.",
          registradoEm:
            new Date().toISOString(),
        }
      : null,

    atualizadoEm: new Date().toISOString(),
  };
}