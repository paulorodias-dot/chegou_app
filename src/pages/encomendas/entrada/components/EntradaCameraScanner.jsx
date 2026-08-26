import {
  AlertCircle,
  Camera,
  LoaderCircle,
  ScanBarcode,
  X,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  decodificarCodigoImagem,
} from "../../shared/captura";

import "./EntradaCameraScanner.css";

// ============================================================
// SISTEMA CHEGOU!
// CENTRAL DE ENCOMENDAS — ENTRADA
//
// E3.2-D.4
//
// Scanner leve da Entrada.
//
// IMPORTANTE:
// - não cria Volume;
// - não altera código do Volume;
// - não confirma Entrada;
// - não chama Supabase;
// - BarcodeDetector é apenas primeira estratégia;
// - ZXing atua como fallback;
// - câmera existe somente enquanto este modal estiver aberto.
// ============================================================

const INTERVALO_LEITURA_MS =
  850;

export default function EntradaCameraScanner({
  open,
  onClose,
  onDetected,
  onOpenChange,
}) {
  const videoRef =
    useRef(null);

  const canvasRef =
    useRef(null);

  const streamRef =
    useRef(null);

  const timerRef =
    useRef(null);

  const processandoRef =
    useRef(false);

  const ativoRef =
    useRef(false);

  const [
    iniciando,
    setIniciando,
  ] =
    useState(false);

  const [
    procurando,
    setProcurando,
  ] =
    useState(false);

  const [
    erro,
    setErro,
  ] =
    useState(null);

  // ==========================================================
  // PARAR
  // ==========================================================

  const pararCamera =
    useCallback(() => {
      ativoRef.current =
        false;

      if (
        timerRef.current
      ) {
        window.clearTimeout(
          timerRef.current
        );

        timerRef.current =
          null;
      }

      const stream =
        streamRef.current;

      if (stream) {
        stream
          .getTracks()
          .forEach(
            (track) =>
              track.stop()
          );
      }

      streamRef.current =
        null;

      if (
        videoRef.current
      ) {
        videoRef.current.srcObject =
          null;
      }

      processandoRef.current =
        false;

      setProcurando(false);
    }, []);

  // ==========================================================
  // FRAME → DECODER
  // ==========================================================

  const tentarLeitura =
    useCallback(
      async ({
        manual = false,
      } = {}) => {
        if (
          !ativoRef.current ||
          processandoRef.current
        ) {
          return false;
        }

        const video =
          videoRef.current;

        const canvas =
          canvasRef.current;

        if (
          !video ||
          !canvas ||
          video.readyState < 2 ||
          !video.videoWidth ||
          !video.videoHeight
        ) {
          return false;
        }

        processandoRef.current =
          true;

        if (manual) {
          setProcurando(true);
        }

        try {
          /*
           * Mantemos uma resolução operacional
           * suficientemente boa sem construir
           * canvas gigantes em cada tentativa.
           */
          const larguraFonte =
            video.videoWidth;

          const alturaFonte =
            video.videoHeight;

          const limite =
            1280;

          const escala =
            Math.min(
              1,
              limite /
                Math.max(
                  larguraFonte,
                  alturaFonte
                )
            );

          const largura =
            Math.max(
              1,
              Math.round(
                larguraFonte *
                  escala
              )
            );

          const altura =
            Math.max(
              1,
              Math.round(
                alturaFonte *
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
            return false;
          }

          ctx.drawImage(
            video,
            0,
            0,
            largura,
            altura
          );

          const resposta =
            await decodificarCodigoImagem(
              canvas
            );

          if (
            !ativoRef.current
          ) {
            return false;
          }

          if (
            resposta?.encontrado &&
            resposta?.resultado
          ) {
            const resultado =
              resposta.resultado;

            pararCamera();

            onDetected?.(
              resultado
            );

            return true;
          }

          return false;
        } catch (err) {
          console.warn(
            "[EntradaCameraScanner] Falha de leitura:",
            err
          );

          return false;
        } finally {
          processandoRef.current =
            false;

          if (manual) {
            setProcurando(false);
          }
        }
      },
      [
        onDetected,
        pararCamera,
      ]
    );

  // ==========================================================
  // LOOP CONTROLADO
  // ==========================================================

  const agendarLeitura =
    useCallback(() => {
      if (
        !ativoRef.current
      ) {
        return;
      }

      if (
        timerRef.current
      ) {
        window.clearTimeout(
          timerRef.current
        );
      }

      timerRef.current =
        window.setTimeout(
          async () => {
            if (
              !ativoRef.current
            ) {
              return;
            }

            await tentarLeitura();

            if (
              ativoRef.current
            ) {
              agendarLeitura();
            }
          },
          INTERVALO_LEITURA_MS
        );
    }, [
      tentarLeitura,
    ]);

  // ==========================================================
  // INICIAR CÂMERA
  // ==========================================================

  useEffect(() => {
    if (!open) {
      pararCamera();

      onOpenChange?.(
        false
      );

      return undefined;
    }

    let cancelado =
      false;

    async function iniciar() {
      setIniciando(true);
      setErro(null);

      onOpenChange?.(
        true
      );

      try {
        if (
          !navigator
            ?.mediaDevices
            ?.getUserMedia
        ) {
          throw new Error(
            "A câmera não está disponível neste dispositivo."
          );
        }

        const stream =
          await navigator
            .mediaDevices
            .getUserMedia({
              audio: false,

              video: {
                facingMode: {
                  ideal:
                    "environment",
                },

                width: {
                  ideal:
                    1920,
                },

                height: {
                  ideal:
                    1080,
                },
              },
            });

        if (cancelado) {
          stream
            .getTracks()
            .forEach(
              (track) =>
                track.stop()
            );

          return;
        }

        streamRef.current =
          stream;

        const video =
          videoRef.current;

        if (!video) {
          throw new Error(
            "Não foi possível preparar a câmera."
          );
        }

        video.srcObject =
          stream;

        await video.play();

        ativoRef.current =
          true;

        agendarLeitura();
      } catch (err) {
        console.error(
          "[EntradaCameraScanner] Falha ao iniciar câmera:",
          err
        );

        setErro(
          err?.message ||
            "Não foi possível iniciar a câmera."
        );

        pararCamera();
      } finally {
        if (!cancelado) {
          setIniciando(false);
        }
      }
    }

    iniciar();

    return () => {
      cancelado =
        true;

      pararCamera();

      onOpenChange?.(
        false
      );
    };
  }, [
    open,
    agendarLeitura,
    pararCamera,
    onOpenChange,
  ]);

  // ==========================================================
  // ESC
  // ==========================================================

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown =
      (event) => {
        if (
          event.key ===
          "Escape"
        ) {
          event.preventDefault();
          event.stopPropagation();

          pararCamera();

          onClose?.();
        }
      };

    /*
     * Capture=true:
     * este modal recebe o ESC
     * antes do Drawer principal.
     */
    document.addEventListener(
      "keydown",
      handleKeyDown,
      true
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
        true
      );
    };
  }, [
    open,
    onClose,
    pararCamera,
  ]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="entrada-camera"
      role="dialog"
      aria-modal="true"
      aria-label="Leitor pela câmera"
    >
      <div
        className="entrada-camera__backdrop"
        onClick={() => {
          pararCamera();
          onClose?.();
        }}
      />

      <section className="entrada-camera__panel">
        <header className="entrada-camera__header">
          <div>
            <span>
              Conferência do volume
            </span>

            <h3>
              Ler código pela câmera
            </h3>
          </div>

          <button
            type="button"
            onClick={() => {
              pararCamera();
              onClose?.();
            }}
            aria-label="Fechar câmera"
          >
            <X size={19} />
          </button>
        </header>

        <div className="entrada-camera__body">
          <div className="entrada-camera__preview">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
            />

            <div
              className="entrada-camera__target"
              aria-hidden="true"
            >
              <span />
              <span />
              <span />
              <span />
            </div>

            {iniciando ? (
              <div className="entrada-camera__overlay-state">
                <LoaderCircle
                  size={28}
                  className="entrada-camera__spinner"
                />

                <strong>
                  Iniciando câmera
                </strong>
              </div>
            ) : null}
          </div>

          <canvas
            ref={canvasRef}
            className="entrada-camera__canvas"
            aria-hidden="true"
          />

          {erro ? (
            <div
              className="entrada-camera__error"
              role="alert"
            >
              <AlertCircle
                size={19}
              />

              <div>
                <strong>
                  Câmera indisponível
                </strong>

                <p>
                  {erro}
                </p>
              </div>
            </div>
          ) : (
            <div className="entrada-camera__instructions">
              <ScanBarcode
                size={19}
              />

              <div>
                <strong>
                  Posicione o código
                </strong>

                <p>
                  Mantenha a etiqueta
                  dentro da área indicada.
                  A leitura ocorre
                  automaticamente.
                </p>
              </div>
            </div>
          )}
        </div>

        <footer className="entrada-camera__footer">
          <button
            type="button"
            className="entrada-camera__secondary"
            onClick={() => {
              pararCamera();
              onClose?.();
            }}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="entrada-camera__primary"
            onClick={() =>
              tentarLeitura({
                manual: true,
              })
            }
            disabled={
              iniciando ||
              Boolean(erro) ||
              procurando
            }
          >
            {procurando ? (
              <>
                <LoaderCircle
                  size={17}
                  className="entrada-camera__spinner"
                />

                Lendo...
              </>
            ) : (
              <>
                <Camera
                  size={17}
                />

                Capturar agora
              </>
            )}
          </button>
        </footer>
      </section>
    </div>
  );
}