import {
  CAPTURA_FORMATO,
} from "../constants/capturaCodigo.constants";

// ============================================================
// NORMALIZAÇÃO
// ============================================================

export function textoOuNull(
  value
) {
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

export function normalizarCodigoCaptura(
  value
) {
  const texto =
    textoOuNull(value);

  if (!texto) {
    return null;
  }

  return texto
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toUpperCase()
    .replace(
      /[^A-Z0-9]/g,
      ""
    );
}

// ============================================================
// FORMATOS
// ============================================================

export function mapearFormatoCaptura(
  formato
) {
  const valor =
    String(
      formato || ""
    )
      .trim()
      .toLowerCase();

  switch (valor) {
    case "qr_code":
    case "qr code":
    case "qr":
      return CAPTURA_FORMATO.QR_CODE;

    case "data_matrix":
    case "data matrix":
    case "datamatrix":
      return CAPTURA_FORMATO.DATA_MATRIX;

    case "pdf417":
    case "pdf_417":
    case "pdf 417":
      return CAPTURA_FORMATO.PDF417;

    case "code_128":
    case "code 128":
    case "code_39":
    case "code 39":
    case "code_93":
    case "code 93":
    case "codabar":
    case "ean_13":
    case "ean 13":
    case "ean_8":
    case "ean 8":
    case "itf":
    case "upc_a":
    case "upc a":
    case "upc_e":
    case "upc e":
      return CAPTURA_FORMATO.CODIGO_BARRAS;

    default:
      return CAPTURA_FORMATO.DESCONHECIDO;
  }
}

// ============================================================
// COMPARAÇÃO COM VOLUME
// ============================================================

export function compararCodigoComVolume({
  codigoLido,
  codigoEsperado,
} = {}) {
  const lidoNormalizado =
    normalizarCodigoCaptura(
      codigoLido
    );

  const esperadoNormalizado =
    normalizarCodigoCaptura(
      codigoEsperado
    );

  if (
    !lidoNormalizado ||
    !esperadoNormalizado
  ) {
    return {
      comparavel: false,
      confere: false,

      codigoLido:
        textoOuNull(
          codigoLido
        ),

      codigoEsperado:
        textoOuNull(
          codigoEsperado
        ),

      codigoLidoNormalizado:
        lidoNormalizado,

      codigoEsperadoNormalizado:
        esperadoNormalizado,
    };
  }

  return {
    comparavel: true,

    confere:
      lidoNormalizado ===
      esperadoNormalizado,

    codigoLido:
      textoOuNull(
        codigoLido
      ),

    codigoEsperado:
      textoOuNull(
        codigoEsperado
      ),

    codigoLidoNormalizado:
      lidoNormalizado,

    codigoEsperadoNormalizado:
      esperadoNormalizado,
  };
}

// ============================================================
// RESULTADO CANÔNICO DE CAPTURA
// ============================================================

export function criarResultadoCaptura({
  valor,
  origem,
  motor,
  formato,
  formatoOriginal = null,
  confianca = null,
  metadata = null,
} = {}) {
  const valorTexto =
    textoOuNull(valor);

  const normalizado =
    normalizarCodigoCaptura(
      valorTexto
    );

  if (
    !valorTexto ||
    !normalizado
  ) {
    return null;
  }

  return {
    valor:
      valorTexto,

    valorNormalizado:
      normalizado,

    origem:
      origem || null,

    motor:
      motor || null,

    formato:
      formato ||
      CAPTURA_FORMATO.DESCONHECIDO,

    formatoOriginal:
      formatoOriginal || null,

    confianca:
      typeof confianca ===
      "number"
        ? confianca
        : null,

    capturadoEm:
      new Date()
        .toISOString(),

    metadata:
      metadata &&
      typeof metadata ===
        "object"
        ? metadata
        : {},
  };
}