import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Keyboard,
  RotateCcw,
  ScanBarcode,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  compararCodigoComVolume,
  criarCapturaLeitorFisico,
  criarCapturaManual,
} from "../../shared/captura";

import EntradaCameraScanner
  from "./EntradaCameraScanner";

import "./EntradaCapturaCodigo.css";

// ============================================================
// SISTEMA CHEGOU!
// ENTRADA OFICIAL — CONFERÊNCIA DE CÓDIGO
//
// E3.2-D.4
//
// O componente compara uma captura candidata
// com o código que já pertence ao Volume.
//
// NUNCA altera o código oficial.
// ============================================================

export default function EntradaCapturaCodigo({
  codigoEsperado,
  disabled = false,
  onConferenciaChange,
  onCameraOpenChange,
}) {
  const [
    valor,
    setValor,
  ] =
    useState("");

  const [
    conferencia,
    setConferencia,
  ] =
    useState(null);

  const [
    cameraAberta,
    setCameraAberta,
  ] =
    useState(false);

  // ==========================================================
  // RESET QUANDO MUDA O VOLUME
  // ==========================================================

  useEffect(() => {
    setValor("");
    setConferencia(null);

    setCameraAberta(false);

    onConferenciaChange?.(
      null
    );
  }, [
    codigoEsperado,
  ]);

  // ==========================================================
  // CÓDIGO DE REFERÊNCIA
  // ==========================================================

  const codigoReferencia =
    useMemo(
      () =>
        String(
          codigoEsperado ||
          ""
        ).trim(),
      [codigoEsperado]
    );

  // ==========================================================
  // APLICAR CAPTURA
  // ==========================================================

  function aplicarCaptura(
    captura
  ) {
    if (
      disabled ||
      !captura
    ) {
      return;
    }

    const comparacao =
      compararCodigoComVolume({
        codigoLido:
          captura.valor,

        codigoEsperado:
          codigoReferencia,
      });

    const proxima =
      {
        captura,

        comparacao,

        status:
          !comparacao
            .comparavel
            ? "NAO_COMPARAVEL"
            : comparacao
                .confere
              ? "CONFERE"
              : "DIVERGENTE",

        confere:
          Boolean(
            comparacao
              .comparavel &&
            comparacao
              .confere
          ),

        divergente:
          Boolean(
            comparacao
              .comparavel &&
            !comparacao
              .confere
          ),
      };

    setValor(
      captura.valor ||
      ""
    );

    setConferencia(
      proxima
    );

    onConferenciaChange?.(
      proxima
    );
  }

  // ==========================================================
  // LEITOR FÍSICO
  // ==========================================================

  function conferirComoLeitor() {
    const captura =
      criarCapturaLeitorFisico(
        valor
      );

    aplicarCaptura(
      captura
    );
  }

  // ==========================================================
  // MANUAL
  // ==========================================================

  function conferirManual() {
    const captura =
      criarCapturaManual(
        valor
      );

    aplicarCaptura(
      captura
    );
  }

  // ==========================================================
  // CÂMERA
  // ==========================================================

  function abrirCamera() {
    if (disabled) {
      return;
    }

    setCameraAberta(true);

    onCameraOpenChange?.(
      true
    );
  }

  function fecharCamera() {
    setCameraAberta(false);

    onCameraOpenChange?.(
      false
    );
  }

  function handleCameraDetected(
    captura
  ) {
    fecharCamera();

    aplicarCaptura(
      captura
    );
  }

  // ==========================================================
  // RESET DA DIVERGÊNCIA
  // ==========================================================

  function tentarNovamente() {
    if (disabled) {
      return;
    }

    setValor("");
    setConferencia(null);

    onConferenciaChange?.(
      null
    );
  }

  return (
    <>
      <section className="entrada-captura">
        <div className="entrada-captura__heading">
          <ScanBarcode
            size={18}
          />

          <div>
            <span>
              Conferência
            </span>

            <h3>
              Conferir código do volume
            </h3>
          </div>
        </div>

        <div className="entrada-captura__expected">
          <span>
            Código esperado
          </span>

          <strong>
            {codigoReferencia ||
              "Não informado"}
          </strong>
        </div>

        <label className="entrada-captura__field">
          <span>
            Leitor ou digitação
          </span>

          <div className="entrada-captura__input">
            <Keyboard
              size={18}
            />

            <input
              type="text"
              value={valor}
              disabled={disabled}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck="false"
              placeholder="Leia ou digite o código"
              onChange={(
                event
              ) =>
                setValor(
                  event.target.value
                )
              }
              onKeyDown={(
                event
              ) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  event.preventDefault();

                  conferirComoLeitor();
                }
              }}
            />
          </div>
        </label>

        <div className="entrada-captura__actions">
          <button
            type="button"
            className="entrada-captura__secondary"
            onClick={
              conferirManual
            }
            disabled={
              disabled ||
              !valor.trim()
            }
          >
            <CheckCircle2
              size={16}
            />

            Conferir
          </button>

          <button
            type="button"
            className="entrada-captura__camera"
            onClick={
              abrirCamera
            }
            disabled={disabled}
          >
            <Camera
              size={16}
            />

            Usar câmera
          </button>
        </div>

        {conferencia?.status ===
        "CONFERE" ? (
          <div
            className="entrada-captura__result entrada-captura__result--success"
            role="status"
          >
            <CheckCircle2
              size={20}
            />

            <div>
              <strong>
                Código conferido
              </strong>

              <p>
                {
                  conferencia
                    .captura
                    .valor
                }
              </p>
            </div>
          </div>
        ) : null}

        {conferencia?.status ===
        "DIVERGENTE" ? (
          <div
            className="entrada-captura__result entrada-captura__result--warning"
            role="alert"
          >
            <AlertTriangle
              size={20}
            />

            <div className="entrada-captura__divergence">
              <strong>
                Código diferente do volume
              </strong>

              <dl>
                <div>
                  <dt>
                    Esperado
                  </dt>

                  <dd>
                    {
                      codigoReferencia ||
                      "—"
                    }
                  </dd>
                </div>

                <div>
                  <dt>
                    Lido
                  </dt>

                  <dd>
                    {
                      conferencia
                        .captura
                        .valor ||
                      "—"
                    }
                  </dd>
                </div>
              </dl>

              <button
                type="button"
                onClick={
                  tentarNovamente
                }
                disabled={disabled}
              >
                <RotateCcw
                  size={15}
                />

                Tentar novamente
              </button>
            </div>
          </div>
        ) : null}

        {conferencia?.status ===
        "NAO_COMPARAVEL" ? (
          <div
            className="entrada-captura__result entrada-captura__result--warning"
            role="alert"
          >
            <AlertTriangle
              size={20}
            />

            <div>
              <strong>
                Não foi possível comparar
              </strong>

              <p>
                Confira o código do
                Volume antes de
                continuar.
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <EntradaCameraScanner
        open={
          cameraAberta
        }
        onClose={
          fecharCamera
        }
        onDetected={
          handleCameraDetected
        }
        onOpenChange={
          onCameraOpenChange
        }
      />
    </>
  );
}