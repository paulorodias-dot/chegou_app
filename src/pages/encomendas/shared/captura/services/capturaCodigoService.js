import {
  CAPTURA_FORMATO,
  CAPTURA_MOTOR,
  CAPTURA_ORIGEM,
  FORMATOS_BARCODE_DETECTOR,
} from "../constants/capturaCodigo.constants";

import {
  criarResultadoCaptura,
  mapearFormatoCaptura,
} from "../utils/capturaCodigo.utils";

// ============================================================
// SISTEMA CHEGOU!
// CAPTURA INTELIGENTE — ADAPTER
//
// Estratégia:
//
// 1. BarcodeDetector
// 2. ZXing fallback
//
// O consumidor NÃO precisa saber qual motor executou.
//
// ZXing é carregado dinamicamente somente se necessário.
// ============================================================

let zxingPromise = null;

// ============================================================
// CAPABILITIES
// ============================================================

export function possuiBarcodeDetectorNativo() {
  return Boolean(
    typeof window !==
      "undefined" &&
    "BarcodeDetector" in
      window
  );
}

export function possuiSuporteCameraBrowser() {
  return Boolean(
    typeof navigator !==
      "undefined" &&
    navigator.mediaDevices &&
    typeof navigator
      .mediaDevices
      .getUserMedia ===
      "function"
  );
}

// ============================================================
// BARCODE DETECTOR
// ============================================================

async function obterFormatosNativos() {
  if (
    !possuiBarcodeDetectorNativo()
  ) {
    return [];
  }

  try {
    if (
      typeof window
        .BarcodeDetector
        .getSupportedFormats !==
      "function"
    ) {
      return [
        ...FORMATOS_BARCODE_DETECTOR,
      ];
    }

    const formatos =
      await window
        .BarcodeDetector
        .getSupportedFormats();

    if (
      !Array.isArray(
        formatos
      )
    ) {
      return [];
    }

    return FORMATOS_BARCODE_DETECTOR.filter(
      (formato) =>
        formatos.includes(
          formato
        )
    );
  } catch {
    return [];
  }
}

async function criarDetectorNativo() {
  if (
    !possuiBarcodeDetectorNativo()
  ) {
    return null;
  }

  try {
    const formatos =
      await obterFormatosNativos();

    if (
      formatos.length > 0
    ) {
      return new window.BarcodeDetector({
        formats:
          formatos,
      });
    }

    return new window.BarcodeDetector();
  } catch {
    return null;
  }
}

async function decodificarComBarcodeDetector(
  source
) {
  const detector =
    await criarDetectorNativo();

  if (!detector) {
    return null;
  }

  try {
    const resultados =
      await detector.detect(
        source
      );

    if (
      !Array.isArray(
        resultados
      ) ||
      resultados.length === 0
    ) {
      return null;
    }

    const resultado =
      resultados.find(
        (item) =>
          String(
            item?.rawValue ||
            ""
          ).trim()
      );

    if (!resultado) {
      return null;
    }

    return criarResultadoCaptura({
      valor:
        resultado.rawValue,

      origem:
        CAPTURA_ORIGEM.CAMERA,

      motor:
        CAPTURA_MOTOR.BARCODE_DETECTOR,

      formato:
        mapearFormatoCaptura(
          resultado.format
        ),

      formatoOriginal:
        resultado.format ||
        null,

      metadata: {
        engine:
          "BarcodeDetector",
      },
    });
  } catch {
    /*
     * Falha do nativo não é erro terminal.
     * O fallback será tentado.
     */
    return null;
  }
}

// ============================================================
// ZXING — LAZY LOAD
// ============================================================

async function carregarZXing() {
  if (!zxingPromise) {
    zxingPromise =
      Promise.all([
        import(
          "@zxing/browser"
        ),

        import(
          "@zxing/library"
        ),
      ])
        .then(
          ([
            browser,
            library,
          ]) => ({
            browser,
            library,
          })
        )
        .catch(
          (error) => {
            /*
             * Permite uma nova tentativa futura
             * caso o chunk tenha falhado por rede.
             */
            zxingPromise =
              null;

            throw error;
          }
        );
  }

  return zxingPromise;
}

function mapearZXingBarcodeFormat(
  format,
  BarcodeFormat
) {
  if (
    format ===
    BarcodeFormat.QR_CODE
  ) {
    return {
      formato:
        CAPTURA_FORMATO.QR_CODE,

      original:
        "QR_CODE",
    };
  }

  if (
    format ===
    BarcodeFormat.DATA_MATRIX
  ) {
    return {
      formato:
        CAPTURA_FORMATO.DATA_MATRIX,

      original:
        "DATA_MATRIX",
    };
  }

  if (
    format ===
    BarcodeFormat.PDF_417
  ) {
    return {
      formato:
        CAPTURA_FORMATO.PDF417,

      original:
        "PDF_417",
    };
  }

  return {
    formato:
      CAPTURA_FORMATO.CODIGO_BARRAS,

    original:
      String(
        format ?? ""
      ),
  };
}

async function decodificarComZXing(
  source
) {
  try {
    const {
      browser,
      library,
    } =
      await carregarZXing();

    const {
      BrowserMultiFormatReader,
    } =
      browser;

    const {
      BarcodeFormat,
    } =
      library;

    if (
      typeof BrowserMultiFormatReader !==
      "function"
    ) {
      return null;
    }

    const reader =
      new BrowserMultiFormatReader();

    let resultado = null;

    /*
     * Nossa fundação inicialmente recebe
     * Canvas ou elemento de imagem.
     *
     * A câmera contínua será integrada
     * no próximo Gate.
     */
    if (
      typeof HTMLCanvasElement !==
        "undefined" &&
      source instanceof
        HTMLCanvasElement
    ) {
      resultado =
        await reader
          .decodeFromCanvas(
            source
          );
    } else if (
      typeof HTMLImageElement !==
        "undefined" &&
      source instanceof
        HTMLImageElement
    ) {
      resultado =
        await reader
          .decodeFromImageElement(
            source
          );
    } else {
      return null;
    }

    const texto =
      resultado?.getText?.() ||
      resultado?.text ||
      null;

    if (!texto) {
      return null;
    }

    const formatoZXing =
      resultado
        ?.getBarcodeFormat?.();

    const mapeado =
      mapearZXingBarcodeFormat(
        formatoZXing,
        BarcodeFormat
      );

    return criarResultadoCaptura({
      valor:
        texto,

      origem:
        CAPTURA_ORIGEM.CAMERA,

      motor:
        CAPTURA_MOTOR.ZXING,

      formato:
        mapeado.formato,

      formatoOriginal:
        mapeado.original,

      metadata: {
        engine:
          "ZXing",
      },
    });
  } catch {
    return null;
  }
}

// ============================================================
// API PÚBLICA — IMAGEM/CANVAS
// ============================================================

export async function decodificarCodigoImagem(
  source
) {
  if (!source) {
    return {
      ok: false,

      encontrado: false,

      resultado: null,

      motoresTentados: [],
    };
  }

  const motoresTentados =
    [];

  // ----------------------------------------------------------
  // 1. MOTOR NATIVO
  // ----------------------------------------------------------

  if (
    possuiBarcodeDetectorNativo()
  ) {
    motoresTentados.push(
      CAPTURA_MOTOR.BARCODE_DETECTOR
    );

    const nativo =
      await decodificarComBarcodeDetector(
        source
      );

    if (nativo) {
      return {
        ok: true,
        encontrado: true,

        resultado:
          nativo,

        motoresTentados,
      };
    }
  }

  // ----------------------------------------------------------
  // 2. FALLBACK ZXING
  // ----------------------------------------------------------

  motoresTentados.push(
    CAPTURA_MOTOR.ZXING
  );

  const zxing =
    await decodificarComZXing(
      source
    );

  if (zxing) {
    return {
      ok: true,
      encontrado: true,

      resultado:
        zxing,

      motoresTentados,
    };
  }

  // ----------------------------------------------------------
  // NÃO ENCONTRADO
  // ----------------------------------------------------------

  return {
    ok: true,

    encontrado:
      false,

    resultado:
      null,

    motoresTentados,
  };
}

// ============================================================
// LEITOR FÍSICO / TECLADO
// ============================================================

export function criarCapturaLeitorFisico(
  value
) {
  return criarResultadoCaptura({
    valor:
      value,

    origem:
      CAPTURA_ORIGEM.LEITOR_FISICO,

    motor:
      CAPTURA_MOTOR.TECLADO,

    formato:
      CAPTURA_FORMATO.DESCONHECIDO,

    metadata: {
      engine:
        "KeyboardWedge",
    },
  });
}

// ============================================================
// DIGITAÇÃO MANUAL
// ============================================================

export function criarCapturaManual(
  value
) {
  return criarResultadoCaptura({
    valor:
      value,

    origem:
      CAPTURA_ORIGEM.MANUAL,

    motor:
      CAPTURA_MOTOR.MANUAL,

    formato:
      CAPTURA_FORMATO.TEXTO,
  });
}

// ============================================================
// DIAGNÓSTICO
// ============================================================

export async function obterCapacidadesCaptura() {
  const formatosNativos =
    await obterFormatosNativos();

  return {
    camera:
      possuiSuporteCameraBrowser(),

    barcodeDetector:
      possuiBarcodeDetectorNativo(),

    barcodeDetectorFormatos:
      formatosNativos,

    zxing:
      true,

    /*
     * Ainda não implementado.
     * Não fingimos suporte.
     */
    ocr:
      false,
  };
}

export default {
  decodificarCodigoImagem,
  criarCapturaLeitorFisico,
  criarCapturaManual,
  obterCapacidadesCaptura,
  possuiBarcodeDetectorNativo,
  possuiSuporteCameraBrowser,
};