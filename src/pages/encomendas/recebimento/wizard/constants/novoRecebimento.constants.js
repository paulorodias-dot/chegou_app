// ============================================================
// SISTEMA CHEGOU!
// NOVO RECEBIMENTO — CONSTANTS
// Módulo Portaria
// ============================================================

export const NOVO_RECEBIMENTO_ETAPAS = Object.freeze({
  IDENTIFICACAO: 1,
  CAPTURA_VOLUMES: 2,
  FINALIZACAO: 3,
});


export const NOVO_RECEBIMENTO_ETAPAS_CONFIG = Object.freeze([
  {
    id: NOVO_RECEBIMENTO_ETAPAS.IDENTIFICACAO,
    key: "identificacao",
    label: "Identificação",
    description: "Dados do entregador e da transportadora.",
  },
  {
    id: NOVO_RECEBIMENTO_ETAPAS.CAPTURA_VOLUMES,
    key: "captura-volumes",
    label: "Volumes",
    description: "Quantidade e captura das encomendas recebidas.",
  },
  {
    id: NOVO_RECEBIMENTO_ETAPAS.FINALIZACAO,
    key: "finalizacao",
    label: "Conferência",
    description: "Revisão e conclusão do recebimento.",
  },
]);


export const NOVO_RECEBIMENTO_PRIMEIRA_ETAPA =
  NOVO_RECEBIMENTO_ETAPAS.IDENTIFICACAO;

export const NOVO_RECEBIMENTO_ULTIMA_ETAPA =
  NOVO_RECEBIMENTO_ETAPAS.FINALIZACAO;


// ============================================================
// ESTADO LOCAL DO WIZARD
// Estes estados pertencem apenas à experiência frontend.
// Não representam status oficiais do banco.
// ============================================================

export const NOVO_RECEBIMENTO_LOCAL_STATUS = Object.freeze({
  IDLE: "IDLE",
  EM_ANDAMENTO: "EM_ANDAMENTO",
  CONCLUINDO: "CONCLUINDO",
  CONCLUIDO: "CONCLUIDO",
  ERRO: "ERRO",
  AGUARDANDO_SINCRONIZACAO: "AGUARDANDO_SINCRONIZACAO",
});


// ============================================================
// SINCRONIZAÇÃO LOCAL
// ============================================================

export const NOVO_RECEBIMENTO_SYNC_STATUS = Object.freeze({
  LOCAL: "LOCAL",
  PENDENTE: "PENDENTE",
  SINCRONIZANDO: "SINCRONIZANDO",
  SINCRONIZADO: "SINCRONIZADO",
  ERRO: "ERRO",
});


// ============================================================
// ORIGEM DA CAPTURA
// Valores compatíveis com a camada de integração.
// A validação oficial continua pertencendo ao backend.
// ============================================================

export const NOVO_RECEBIMENTO_ORIGEM_CAPTURA = Object.freeze({
  LEITOR_USB: "LEITOR_USB",
  CAMERA_DISPOSITIVO: "CAMERA_DISPOSITIVO",
  DIGITACAO_MANUAL: "DIGITACAO_MANUAL",
  OCR: "OCR",
});


// ============================================================
// FORMATO DO CÓDIGO
// ============================================================

export const NOVO_RECEBIMENTO_FORMATO_CODIGO = Object.freeze({
  CODIGO_BARRAS: "CODIGO_BARRAS",
  QR_CODE: "QR_CODE",
  DATA_MATRIX: "DATA_MATRIX",
  PDF417: "PDF417",
  OCR_ETIQUETA: "OCR_ETIQUETA",
  DESCONHECIDO: "DESCONHECIDO",
});


// ============================================================
// AVARIAS / OCORRÊNCIAS
// Estes valores refletem contratos já existentes no backend.
// ============================================================

export const NOVO_RECEBIMENTO_TIPOS_AVARIA = Object.freeze([
  {
    value: "AVARIA_LEVE",
    label: "Avaria leve",
  },
  {
    value: "AVARIA_MODERADA",
    label: "Avaria moderada",
  },
  {
    value: "AVARIA_GRAVE",
    label: "Avaria grave",
  },
  {
    value: "EMBALAGEM_ABERTA",
    label: "Embalagem aberta",
  },
  {
    value: "EMBALAGEM_VIOLADA",
    label: "Embalagem violada",
  },
  {
    value: "EMBALAGEM_MOLHADA",
    label: "Embalagem molhada",
  },
  {
    value: "EMBALAGEM_AMASSADA",
    label: "Embalagem amassada",
  },
  {
    value: "VOLUME_INCOMPLETO",
    label: "Volume incompleto",
  },
  {
    value: "ETIQUETA_ILEGIVEL",
    label: "Etiqueta ilegível",
  },
  {
    value: "OUTRA_OCORRENCIA",
    label: "Outra ocorrência",
  },
]);


export const NOVO_RECEBIMENTO_GRAVIDADES = Object.freeze([
  {
    value: "INFORMATIVA",
    label: "Informativa",
  },
  {
    value: "BAIXA",
    label: "Baixa",
  },
  {
    value: "MEDIA",
    label: "Média",
  },
  {
    value: "ALTA",
    label: "Alta",
  },
  {
    value: "CRITICA",
    label: "Crítica",
  },
]);


// ============================================================
// EVIDÊNCIAS
// ============================================================

export const NOVO_RECEBIMENTO_TIPO_EVIDENCIA_AVARIA =
  "FOTO_AVARIA";

export const NOVO_RECEBIMENTO_CLASSIFICACAO_EVIDENCIA =
  "INCIDENTE";


// ============================================================
// ASSINATURA
// ============================================================

export const NOVO_RECEBIMENTO_TIPO_ASSINATURA =
  "RECEBIMENTO_ENTREGADOR";


// ============================================================
// CONFIGURAÇÕES LOCAIS DE PERSISTÊNCIA
// ============================================================

export const NOVO_RECEBIMENTO_STORAGE = Object.freeze({
  DB_NAME: "chegou-recebimentos",
  DB_VERSION: 1,

  STORE_RECEBIMENTOS: "recebimentos",

  ACTIVE_RECEIPT_KEY: "novo-recebimento-ativo",
});


// ============================================================
// ESTADO INICIAL
// ============================================================

export const NOVO_RECEBIMENTO_INITIAL_STATE = Object.freeze({
  clientReceiptId: null,

  etapaAtual: NOVO_RECEBIMENTO_PRIMEIRA_ETAPA,

  abertoEm: null,
  atualizadoEm: null,

  statusLocal: NOVO_RECEBIMENTO_LOCAL_STATUS.IDLE,

  identificacao: {
    entregadorNome: "",
    entregadorDocumento: "",
    transportadoraId: "",
    transportadoraNome: "",
    transportadoraNomeInformado: "",
  },

  captura: {
    quantidadeInformada: "",
    quantidadeBipada: 0,
    volumes: [],
  },

  assinatura: null,

  possuiDivergenciaQuantidade: false,
  justificativaDivergencia: "",

  observacoes: "",

  chaveIdempotencia: null,

  preRecebimentoId: null,
  correlationId: null,

  syncStatus: NOVO_RECEBIMENTO_SYNC_STATUS.LOCAL,

  ultimoErro: null,
});


// ============================================================
// TEXTOS OPERACIONAIS
// ============================================================

export const NOVO_RECEBIMENTO_MESSAGES = Object.freeze({
  CONCLUIR: "Concluir Recebimento",

  RECUPERACAO_ENCONTRADA:
    "Foi encontrado um recebimento em andamento neste dispositivo.",

  SALVO_LOCALMENTE:
    "Recebimento salvo neste dispositivo.",

  AGUARDANDO_INTERNET:
    "Sem conexão. O recebimento permanece salvo neste dispositivo.",

  SINCRONIZANDO:
    "Sincronizando recebimento...",

  SINCRONIZADO:
    "Recebimento sincronizado com sucesso.",

  ERRO_CONCLUSAO:
    "Não foi possível concluir o recebimento. Os dados permanecem salvos neste dispositivo.",
});