import {
  analisarTextoEtiquetaOCR,
} from "./ocrEtiqueta.utils";

// ============================================================
// SISTEMA CHEGOU!
// OCR LOCAL DE ETIQUETA
//
// E3.2-D.5.2
//
// - Tesseract carregado sob demanda;
// - Worker reutilizado durante a sessão;
// - nenhuma imagem enviada à Supabase;
// - nenhuma identidade decidida aqui;
// - OCR produz somente pistas.
// ============================================================

let tesseractPromise =
  null;

let workerPromise =
  null;

let loggerAtual =
  null;

// ============================================================
// TESSERACT — LAZY LOAD
// ============================================================

async function carregarTesseract() {
  if (!tesseractPromise) {
    tesseractPromise =
      import(
        "tesseract.js"
      )
        .then(
          (modulo) =>
            modulo
        )
        .catch(
          (error) => {
            tesseractPromise =
              null;

            throw error;
          }
        );
  }

  return tesseractPromise;
}

// ============================================================
// WORKER REUTILIZÁVEL
// ============================================================

async function obterWorker({
  onProgress,
} = {}) {
  loggerAtual =
    typeof onProgress ===
    "function"
      ? onProgress
      : null;

  if (!workerPromise) {
    workerPromise =
      carregarTesseract()
        .then(
          async ({
            createWorker,
            PSM,
          }) => {
            if (
              typeof createWorker !==
              "function"
            ) {
              throw new Error(
                "O leitor de etiqueta não está disponível."
              );
            }

            const worker =
              await createWorker(
                "por",
                1,
                {
                  logger:
                    (message) => {
                      loggerAtual?.(
                        message
                      );
                    },
                }
              );

            /*
             * Etiquetas normalmente possuem blocos
             * espalhados pela imagem.
             *
             * SPARSE_TEXT costuma ser mais adequado
             * que assumir um único parágrafo.
             */
            try {
              if (
                PSM
                  ?.SPARSE_TEXT !==
                undefined
              ) {
                await worker
                  .setParameters({
                    tessedit_pageseg_mode:
                      PSM.SPARSE_TEXT,
                  });
              }
            } catch (
              error
            ) {
              console.warn(
                "[OCR Etiqueta] Não foi possível ajustar segmentação:",
                error
              );
            }

            return worker;
          }
        )
        .catch(
          (error) => {
            workerPromise =
              null;

            throw error;
          }
        );
  }

  return workerPromise;
}

// ============================================================
// PREPARAÇÃO DA IMAGEM
// ============================================================

function criarCanvasTratado(
  source
) {
  const canvas =
    document.createElement(
      "canvas"
    );

  let largura =
    source?.videoWidth ||
    source?.naturalWidth ||
    source?.width ||
    0;

  let altura =
    source?.videoHeight ||
    source?.naturalHeight ||
    source?.height ||
    0;

  if (
    !largura ||
    !altura
  ) {
    throw new Error(
      "Imagem inválida para leitura da etiqueta."
    );
  }

  /*
   * OCR ganha com resolução superior ao
   * decoder de barcode, mas sem canvas enorme.
   */
  const limite =
    2000;

  const escala =
    Math.min(
      1,
      limite /
        Math.max(
          largura,
          altura
        )
    );

  largura =
    Math.max(
      1,
      Math.round(
        largura *
          escala
      )
    );

  altura =
    Math.max(
      1,
      Math.round(
        altura *
          escala
      )
    );

  canvas.width =
    largura;

  canvas.height =
    altura;

  const ctx =
    canvas.getContext(
      "2d",
      {
        alpha: false,
        willReadFrequently:
          true,
      }
    );

  if (!ctx) {
    throw new Error(
      "Não foi possível preparar a etiqueta."
    );
  }

  /*
   * Tratamento deliberadamente moderado.
   * Contraste agressivo pode destruir
   * caracteres finos de impressão térmica.
   */
  ctx.filter =
    "grayscale(1) contrast(1.35) brightness(1.06)";

  ctx.drawImage(
    source,
    0,
    0,
    largura,
    altura
  );

  return canvas;
}

// ============================================================
// RECONHECER
// ============================================================

export async function reconhecerEtiquetaOCR({
  source,
  onProgress,
} = {}) {
  if (!source) {
    throw new Error(
      "Nenhuma imagem foi informada para leitura."
    );
  }

  const canvas =
    criarCanvasTratado(
      source
    );

  const worker =
    await obterWorker({
      onProgress,
    });

  const resultado =
    await worker.recognize(
      canvas
    );

  const texto =
    resultado?.data
      ?.text ||
    "";

  const confianca =
    Number(
      resultado?.data
        ?.confidence
    );

  const analise =
    analisarTextoEtiquetaOCR(
      texto
    );

  return {
    ok: true,

    texto:
      analise.texto,

    confianca:
      Number.isFinite(
        confianca
      )
        ? confianca
        : null,

    pistas: {
      nome:
        analise.nome,

      torreBloco:
        analise.torreBloco,

      unidade:
        analise.unidade,
    },

    metadata: {
      motor:
        "TESSERACT",

      idioma:
        "por",

      processadoLocalmente:
        true,
    },
  };
}

// ============================================================
// LIBERAÇÃO OPCIONAL
//
// Pode ser usada futuramente no logout ou quando desejarmos
// liberar explicitamente memória do worker.
// ============================================================

export async function encerrarWorkerOCR() {
  if (!workerPromise) {
    return;
  }

  try {
    const worker =
      await workerPromise;

    await worker
      .terminate();
  } catch {
    // Nada a executar.
  } finally {
    workerPromise =
      null;

    loggerAtual =
      null;
  }
}

export default {
  reconhecerEtiquetaOCR,
  encerrarWorkerOCR,
};