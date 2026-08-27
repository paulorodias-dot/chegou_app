import {
  AlertCircle,
  Camera,
  CheckCircle2,
  FileSearch,
  LoaderCircle,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import {
  reconhecerEtiquetaOCR,
} from "../../shared/captura";

import {
  buscarDestinatariosEntradaOCR,
} from "../services/entradaOCRMatchingService";

import EntradaCameraScanner
  from "./EntradaCameraScanner";

import "./EntradaEtiquetaOCR.css";

// ============================================================
// SISTEMA CHEGOU!
// ENTRADA — OCR ASSISTIDO DA ETIQUETA
//
// E3.2-D.5.2
//
// OCR = assistência.
//
// Este componente NÃO:
// - escolhe pessoa;
// - escolhe unidade canônica;
// - altera Volume;
// - confirma Entrada;
// - grava qualquer identidade no backend.
// ============================================================

function capitalizarTexto(
  value
) {
  const texto =
    String(
      value || ""
    ).trim();

  if (!texto) {
    return null;
  }

  return texto
    .toLocaleLowerCase(
      "pt-BR"
    )
    .replace(
      /(^|[\s'-])([\p{L}])/gu,
      (
        _,
        separador,
        letra
      ) =>
        `${separador}${letra.toLocaleUpperCase(
          "pt-BR"
        )}`
    );
}

function traduzirStatusOCR(
  status
) {
  switch (status) {
    case "loading tesseract core":
      return "Preparando leitor";

    case "initializing tesseract":
      return "Preparando leitura";

    case "loading language traineddata":
      return "Carregando idioma";

    case "initializing api":
      return "Iniciando análise";

    case "recognizing text":
      return "Lendo etiqueta";

    default:
      return "Analisando etiqueta";
  }
}

export default function EntradaEtiquetaOCR({
  volumeId,

  disabled = false,

  onCandidatosEncontrados,
}) {
  const [
    cameraAberta,
    setCameraAberta,
  ] =
    useState(false);

  const [
    processando,
    setProcessando,
  ] =
    useState(false);

  const [
    progresso,
    setProgresso,
  ] =
    useState(0);

  const [
    progressoLabel,
    setProgressoLabel,
  ] =
    useState(
      "Analisando etiqueta"
    );

  const [
    resultado,
    setResultado,
  ] =
    useState(null);

  const [
    erro,
    setErro,
  ] =
    useState(null);

    const [
    buscandoCandidatos,
    setBuscandoCandidatos,
  ] =
    useState(false);

  const [
    erroMatching,
    setErroMatching,
  ] =
    useState(null);

  // ==========================================================
  // PISTAS
  // ==========================================================

  const pistas =
    resultado?.pistas ||
    null;

  const nome =
    capitalizarTexto(
      pistas?.nome
        ?.valor
    );

  const torreBloco =
    capitalizarTexto(
      pistas?.torreBloco
        ?.valor
    );

  const unidade =
    String(
      pistas?.unidade
        ?.valor ||
      ""
    ).trim() ||
    null;

  const possuiAlgumaPista =
    Boolean(
      nome ||
      torreBloco ||
      unidade
    );

  const confianca =
    useMemo(
      () => {
        const valor =
          Number(
            resultado
              ?.confianca
          );

        if (
          !Number.isFinite(
            valor
          )
        ) {
          return null;
        }

        return Math.max(
          0,
          Math.min(
            100,
            Math.round(
              valor
            )
          )
        );
      },
      [
        resultado,
      ]
    );

  // ==========================================================
  // CAPTURA
  // ==========================================================

  async function handleImagemCapturada(
    snapshot,
    metadataCamera
  ) {
    setCameraAberta(false);

    setProcessando(true);
    setErro(null);
    setErroMatching(null);
    setResultado(null);

    setProgresso(0);

    setProgressoLabel(
      "Preparando leitor"
    );

    try {
      const resposta =
        await reconhecerEtiquetaOCR({
          source:
            snapshot,

          onProgress:
            (message) => {
              const valor =
                Number(
                  message?.progress
                );

              if (
                Number.isFinite(
                  valor
                )
              ) {
                setProgresso(
                  Math.max(
                    0,
                    Math.min(
                      100,
                      Math.round(
                        valor *
                          100
                      )
                    )
                  )
                );
              }

              if (
                message?.status
              ) {
                setProgressoLabel(
                  traduzirStatusOCR(
                    message.status
                  )
                );
              }
            },
        });

      setResultado({
        ...resposta,

        metadataCamera,
      });

      setProgresso(100);

      setProgressoLabel(
        "Etiqueta analisada"
      );
    } catch (error) {
      console.error(
        "[EntradaEtiquetaOCR] Falha no OCR:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível analisar a etiqueta."
      );
    } finally {
      setProcessando(false);
    }
  }

  // ==========================================================
  // NOVA FOTO
  // ==========================================================

  function fotografarNovamente() {
    if (
      disabled ||
      processando
    ) {
      return;
    }

    setResultado(null);
    setErro(null);
    setErroMatching(null);

    setProgresso(0);

    setCameraAberta(true);
  }

  // ==========================================================
  // USAR PISTAS
  // ==========================================================

    async function buscarDestinatarios() {
    if (
      !volumeId ||
      !possuiAlgumaPista ||
      disabled ||
      processando ||
      buscandoCandidatos
    ) {
      return;
    }

    setBuscandoCandidatos(
      true
    );

    setErroMatching(
      null
    );

    try {
      const resposta =
        await buscarDestinatariosEntradaOCR({
          volumeId,

          nome,

          torreBloco,

          unidade,

          limite:
            8,
        });

      onCandidatosEncontrados?.({
        resultados:
          resposta
            ?.resultados ||
          [],

        pistas:
          resposta
            ?.pistas ||
          {
            nome,
            torreBloco,
            unidade,
          },

        consultaExecutada:
          resposta
            ?.consultaExecutada ===
            true,
      });
    } catch (error) {
      console.error(
        "[EntradaEtiquetaOCR] Falha no matching OCR:",
        error
      );

      setErroMatching(
        error?.message ||
          "Não foi possível localizar destinatários com estas informações."
      );
    } finally {
      setBuscandoCandidatos(
        false
      );
    }
  }

  return (
    <>
      <section className="entrada-ocr">
        <div className="entrada-ocr__heading">
          <FileSearch
            size={18}
          />

          <div>
            <span>
              Identificação assistida
            </span>

            <h3>
              Ler etiqueta
            </h3>
          </div>
        </div>

        {!resultado &&
        !processando &&
        !erro ? (
          <div className="entrada-ocr__initial">
            <div>
              <Sparkles
                size={20}
              />

              <div>
                <strong>
                  Localizar informações da etiqueta
                </strong>

                <p>
                  Fotografe a etiqueta para
                  tentar localizar nome,
                  Torre/Bloco e Unidade.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setCameraAberta(
                  true
                )
              }
              disabled={
                disabled
              }
            >
              <Camera
                size={16}
              />

              Ler etiqueta
            </button>
          </div>
        ) : null}

        {/* ===================================================
            PROCESSAMENTO
            =================================================== */}

        {processando ? (
          <div
            className="entrada-ocr__processing"
            role="status"
            aria-live="polite"
          >
            <LoaderCircle
              size={25}
              className="entrada-ocr__spinner"
            />

            <div className="entrada-ocr__processing-content">
              <div>
                <strong>
                  {progressoLabel}
                </strong>

                <span>
                  {progresso}%
                </span>
              </div>

              <div className="entrada-ocr__progress">
                <span
                  style={{
                    width:
                      `${progresso}%`,
                  }}
                />
              </div>

              <p>
                A análise está sendo
                realizada no dispositivo.
              </p>
            </div>
          </div>
        ) : null}

        {/* ===================================================
            ERRO
            =================================================== */}

        {erro ? (
          <div
            className="entrada-ocr__error"
            role="alert"
          >
            <AlertCircle
              size={20}
            />

            <div>
              <strong>
                Não foi possível ler a etiqueta
              </strong>

              <p>
                {erro}
              </p>

              <button
                type="button"
                onClick={
                  fotografarNovamente
                }
              >
                <RefreshCw
                  size={15}
                />

                Fotografar novamente
              </button>
            </div>
          </div>
        ) : null}

        {/* ===================================================
            RESULTADO
            =================================================== */}

        {resultado ? (
          <div className="entrada-ocr__result">
            <div className="entrada-ocr__result-title">
              <CheckCircle2
                size={20}
              />

              <div>
                <strong>
                  Etiqueta analisada
                </strong>

                <p>
                  Confira as informações
                  antes de utilizá-las.
                </p>
              </div>

              {confianca !==
              null ? (
                <span>
                  {confianca}%
                </span>
              ) : null}
            </div>

            <div className="entrada-ocr__fields">
              <div>
                <span>
                  Possível nome
                </span>

                <strong>
                  {nome ||
                    "Não identificado"}
                </strong>
              </div>

              <div>
                <span>
                  Torre / Bloco
                </span>

                <strong>
                  {torreBloco ||
                    "Não identificado"}
                </strong>
              </div>

              <div>
                <span>
                  Unidade
                </span>

                <strong>
                  {unidade ||
                    "Não identificada"}
                </strong>
              </div>
            </div>

            <div className="entrada-ocr__actions">
              <button
                type="button"
                className="entrada-ocr__secondary"
                onClick={
                  fotografarNovamente
                }
                disabled={
                  disabled
                }
              >
                <RefreshCw
                  size={15}
                />

                Fotografar novamente
              </button>

              <button
                type="button"
                className="entrada-ocr__primary"
                onClick={
                  buscarDestinatarios
                }
                disabled={
                  disabled ||
                  !possuiAlgumaPista ||
                  buscandoCandidatos
                }
              >
                {buscandoCandidatos ? (
                  <>
                    <LoaderCircle
                      size={15}
                      className="entrada-ocr__spinner"
                    />

                    Localizando...
                  </>
                ) : (
                  <>
                    <Search
                      size={15}
                    />

                    Buscar destinatário
                  </>
                )}
              </button>
            </div>

            {erroMatching ? (
              <div
                className="entrada-ocr__matching-error"
                role="alert"
              >
                <AlertCircle
                  size={17}
                />

                <span>
                  {erroMatching}
                </span>
              </div>
            ) : null}

            <details className="entrada-ocr__raw">
              <summary>
                Ver texto identificado
              </summary>

              <pre>
                {resultado.texto ||
                  "Nenhum texto identificado."}
              </pre>
            </details>
          </div>
        ) : null}
      </section>

      <EntradaCameraScanner
        open={
          cameraAberta
        }
        modo="ETIQUETA"
        onClose={() =>
          setCameraAberta(
            false
          )
        }
        onCapturedImage={
          handleImagemCapturada
        }
      />
    </>
  );
}