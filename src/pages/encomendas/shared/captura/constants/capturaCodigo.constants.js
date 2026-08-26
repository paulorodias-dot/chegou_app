// ============================================================
// SISTEMA CHEGOU!
// CENTRAL DE ENCOMENDAS
//
// CAPTURA INTELIGENTE COMPARTILHADA
// GATE E3.2-D.3
//
// Esta camada NÃO:
// - cria Volume;
// - altera Volume;
// - identifica destinatário;
// - confirma Entrada;
// - armazena Encomenda;
// - disponibiliza Encomenda.
//
// Ela somente produz uma leitura candidata normalizada.
// ============================================================

export const CAPTURA_ORIGEM = Object.freeze({
  LEITOR_FISICO:
    "LEITOR_FISICO",

  CAMERA:
    "CAMERA",

  OCR:
    "OCR",

  MANUAL:
    "MANUAL",
});

export const CAPTURA_MOTOR = Object.freeze({
  BARCODE_DETECTOR:
    "BARCODE_DETECTOR",

  ZXING:
    "ZXING",

  OCR:
    "OCR",

  TECLADO:
    "TECLADO",

  MANUAL:
    "MANUAL",
});

export const CAPTURA_FORMATO = Object.freeze({
  CODIGO_BARRAS:
    "CODIGO_BARRAS",

  QR_CODE:
    "QR_CODE",

  DATA_MATRIX:
    "DATA_MATRIX",

  PDF417:
    "PDF417",

  TEXTO:
    "TEXTO",

  DESCONHECIDO:
    "DESCONHECIDO",
});

export const CAPTURA_STATUS = Object.freeze({
  NAO_INICIADA:
    "NAO_INICIADA",

  PROCESSANDO:
    "PROCESSANDO",

  ENCONTRADO:
    "ENCONTRADO",

  NAO_ENCONTRADO:
    "NAO_ENCONTRADO",

  DIVERGENTE:
    "DIVERGENTE",

  CONFERE:
    "CONFERE",

  ERRO:
    "ERRO",
});

export const FORMATOS_BARCODE_DETECTOR =
  Object.freeze([
    "code_128",
    "code_39",
    "code_93",
    "codabar",
    "ean_13",
    "ean_8",
    "itf",
    "upc_a",
    "upc_e",
    "qr_code",
    "data_matrix",
    "pdf417",
  ]);

export const CAPTURA_CONFIG =
  Object.freeze({
    /*
     * Não limitar códigos reais a um tamanho
     * excessivamente pequeno.
     */
    TAMANHO_MAXIMO_CODIGO:
      250,

    /*
     * Leitor físico normalmente envia Enter
     * ao terminar a leitura.
     */
    TECLADO_FINALIZADORES: [
      "Enter",
      "Tab",
    ],

    /*
     * O decoder alternativo só é carregado
     * quando houver necessidade.
     */
    ZXING_LAZY:
      true,
  });

export default {
  CAPTURA_ORIGEM,
  CAPTURA_MOTOR,
  CAPTURA_FORMATO,
  CAPTURA_STATUS,
  FORMATOS_BARCODE_DETECTOR,
  CAPTURA_CONFIG,
};