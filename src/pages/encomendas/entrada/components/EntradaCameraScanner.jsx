import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Focus,
  LoaderCircle,
  ScanBarcode,
  SwitchCamera,
  X,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
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
// GATE E3.2-D.4.2
//
// CAPTURA APRIMORADA
//
// - escolha automática da melhor câmera;
// - seleção manual da câmera;
// - preferência por câmera traseira;
// - tentativa de foco contínuo;
// - tentativa de exposição contínua;
// - Vertical / Horizontal;
// - recorte da região de interesse;
// - fallback de imagem completa;
// - tentativa com contraste reforçado;
// - BarcodeDetector + ZXing através da camada compartilhada.
//
// IMPORTANTE:
// esta camada NÃO:
// - altera Volume;
// - cria Volume;
// - identifica pessoa;
// - confirma Entrada;
// - grava no backend.
// ============================================================

const INTERVALO_LEITURA_MS =
  700;

const LIMITE_FRAME =
  1600;

const ENQUADRAMENTO = Object.freeze({
  HORIZONTAL:
    "HORIZONTAL",

  VERTICAL:
    "VERTICAL",
});

// ============================================================
// HELPERS
// ============================================================

function textoNormalizado(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toLocaleLowerCase(
      "pt-BR"
    );
}

function pontuarCamera(
  device
) {
  const label =
    textoNormalizado(
      device?.label
    );

  let score = 0;

  /*
   * Preferências comuns em Android/iOS.
   */
  if (
    label.includes(
      "back"
    ) ||
    label.includes(
      "rear"
    ) ||
    label.includes(
      "traseira"
    ) ||
    label.includes(
      "environment"
    )
  ) {
    score += 100;
  }

  /*
   * Em vários Androids a principal aparece
   * como "camera 0".
   */
  if (
    label.includes(
      "camera 0"
    ) ||
    label.includes(
      "câmera 0"
    )
  ) {
    score += 25;
  }

  /*
   * Evitar ultrawide como escolha automática:
   * costuma prejudicar código de barras próximo.
   */
  if (
    label.includes(
      "ultra"
    ) ||
    label.includes(
      "wide angle"
    ) ||
    label.includes(
      "0.5"
    )
  ) {
    score -= 30;
  }

  /*
   * Telefoto também não costuma ser a melhor
   * escolha para etiqueta próxima.
   */
  if (
    label.includes(
      "tele"
    ) ||
    label.includes(
      "telephoto"
    )
  ) {
    score -= 20;
  }

  /*
   * Câmera frontal é último recurso.
   */
  if (
    label.includes(
      "front"
    ) ||
    label.includes(
      "frontal"
    ) ||
    label.includes(
      "user"
    )
  ) {
    score -= 100;
  }

  return score;
}

function escolherMelhorCamera(
  devices
) {
  if (
    !Array.isArray(devices) ||
    devices.length === 0
  ) {
    return null;
  }

  return [...devices]
    .sort(
      (a, b) =>
        pontuarCamera(b) -
        pontuarCamera(a)
    )[0];
}

function nomeCamera(
  device,
  index
) {
  const label =
    String(
      device?.label || ""
    ).trim();

  if (label) {
    return label;
  }

  return `Câmera ${
    index + 1
  }`;
}

// ============================================================
// COMPONENT
// ============================================================

export default function EntradaCameraScanner({
  open,
  onClose,
  onDetected,
  onCapturedImage,
  onOpenChange,

  modo = "CODIGO",
}) {
  const modoEtiqueta =
    modo ===
    "ETIQUETA";

  const videoRef =
    useRef(null);

  const canvasRef =
    useRef(null);

  const canvasProcessadoRef =
    useRef(null);

  const streamRef =
    useRef(null);

  const timerRef =
    useRef(null);

  const processandoRef =
    useRef(false);

  const ativoRef =
    useRef(false);

  const dispositivoAtualRef =
    useRef(null);

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

  const [
    cameras,
    setCameras,
  ] =
    useState([]);

  const [
    cameraSelecionadaId,
    setCameraSelecionadaId,
  ] =
    useState(null);

  const [
    enquadramento,
    setEnquadramento,
  ] =
    useState(
      ENQUADRAMENTO.HORIZONTAL
    );

  const [
    focoStatus,
    setFocoStatus,
  ] =
    useState("AUTOMATICO");

  const [
    resolucaoAtiva,
    setResolucaoAtiva,
  ] =
    useState(null);

  // ==========================================================
  // LABEL DA CÂMERA
  // ==========================================================

  const cameraSelecionada =
    useMemo(
      () =>
        cameras.find(
          (item) =>
            item.deviceId ===
            cameraSelecionadaId
        ) || null,
      [
        cameras,
        cameraSelecionadaId,
      ]
    );

  // ==========================================================
  // PARAR CÂMERA
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

      dispositivoAtualRef.current =
        null;

      if (
        videoRef.current
      ) {
        videoRef.current
          .srcObject = null;
      }

      processandoRef.current =
        false;

      setProcurando(false);
    }, []);

  // ==========================================================
  // ENUMERAR CÂMERAS
  // ==========================================================

  const listarCameras =
    useCallback(
      async () => {
        if (
          !navigator
            ?.mediaDevices
            ?.enumerateDevices
        ) {
          return [];
        }

        try {
          const devices =
            await navigator
              .mediaDevices
              .enumerateDevices();

          const videoInputs =
            devices.filter(
              (device) =>
                device.kind ===
                "videoinput"
            );

          setCameras(
            videoInputs
          );

          return videoInputs;
        } catch (
          error
        ) {
          console.warn(
            "[EntradaCameraScanner] Não foi possível enumerar câmeras:",
            error
          );

          return [];
        }
      },
      []
    );

  // ==========================================================
  // AJUSTES ÓPTICOS
  // ==========================================================

  const aplicarAjustesOpticos =
    useCallback(
      async (
        track
      ) => {
        if (!track) {
          return;
        }

        let capabilities =
          {};

        try {
          capabilities =
            track
              .getCapabilities?.() ||
            {};
        } catch {
          capabilities =
            {};
        }

        const advanced =
          {};

        // ------------------------------------------------------
        // FOCO
        // ------------------------------------------------------

        const focusModes =
          Array.isArray(
            capabilities
              ?.focusMode
          )
            ? capabilities
                .focusMode
            : [];

        if (
          focusModes.includes(
            "continuous"
          )
        ) {
          advanced.focusMode =
            "continuous";

          setFocoStatus(
            "CONTINUO"
          );
        } else if (
          focusModes.includes(
            "single-shot"
          )
        ) {
          advanced.focusMode =
            "single-shot";

          setFocoStatus(
            "UNICO"
          );
        } else {
          setFocoStatus(
            "AUTOMATICO"
          );
        }

        // ------------------------------------------------------
        // EXPOSIÇÃO
        // ------------------------------------------------------

        const exposureModes =
          Array.isArray(
            capabilities
              ?.exposureMode
          )
            ? capabilities
                .exposureMode
            : [];

        if (
          exposureModes.includes(
            "continuous"
          )
        ) {
          advanced.exposureMode =
            "continuous";
        }

        // ------------------------------------------------------
        // WHITE BALANCE
        // ------------------------------------------------------

        const wbModes =
          Array.isArray(
            capabilities
              ?.whiteBalanceMode
          )
            ? capabilities
                .whiteBalanceMode
            : [];

        if (
          wbModes.includes(
            "continuous"
          )
        ) {
          advanced.whiteBalanceMode =
            "continuous";
        }

        // ------------------------------------------------------
        // APLICAR
        // ------------------------------------------------------

        if (
          Object.keys(
            advanced
          ).length === 0
        ) {
          return;
        }

        try {
          await track.applyConstraints({
            advanced: [
              advanced,
            ],
          });
        } catch (
          error
        ) {
          console.warn(
            "[EntradaCameraScanner] Ajustes ópticos não suportados:",
            error
          );
        }
      },
      []
    );

  // ==========================================================
  // ÁREA DE CAPTURA
  // ==========================================================

  function obterRegiaoCaptura({
    width,
    height,
  }) {
    /*
     * Horizontal:
     * mais larga e baixa.
     * Ideal para Code128, etiquetas de transporte etc.
     */
    if (
      enquadramento ===
      ENQUADRAMENTO.HORIZONTAL
    ) {
      const w =
        width * 0.92;

      const h =
        height * 0.42;

      return {
        sx:
          (width - w) /
          2,

        sy:
          (height - h) /
          2,

        sw:
          w,

        sh:
          h,
      };
    }

    /*
     * Vertical:
     * permite etiqueta mais alta.
     * Será reaproveitado no OCR.
     */
    const w =
      width * 0.68;

    const h =
      height * 0.82;

    return {
      sx:
        (width - w) /
        2,

      sy:
        (height - h) /
        2,

      sw:
        w,

      sh:
        h,
    };
  }

  // ==========================================================
  // DESENHAR RECORTE
  // ==========================================================

  function desenharRecorte({
    source,
    target,
    regiao,
    contraste = false,
  }) {
    const limite =
      LIMITE_FRAME;

    const escala =
      Math.min(
        1,
        limite /
          Math.max(
            regiao.sw,
            regiao.sh
          )
      );

    const width =
      Math.max(
        1,
        Math.round(
          regiao.sw *
            escala
        )
      );

    const height =
      Math.max(
        1,
        Math.round(
          regiao.sh *
            escala
        )
      );

    target.width =
      width;

    target.height =
      height;

    const ctx =
      target.getContext(
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

    ctx.save();

    /*
     * Contraste moderado para etiquetas
     * com impressão cinza / papel térmico.
     */
    ctx.filter =
      contraste
        ? "grayscale(1) contrast(1.65) brightness(1.05)"
        : "none";

    ctx.drawImage(
      source,

      regiao.sx,
      regiao.sy,
      regiao.sw,
      regiao.sh,

      0,
      0,
      width,
      height
    );

    ctx.restore();

    return true;
  }

  // ==========================================================
  // DESENHAR FRAME COMPLETO
  // ==========================================================

  function desenharFrameCompleto({
    source,
    target,
  }) {
    const larguraFonte =
      source.videoWidth;

    const alturaFonte =
      source.videoHeight;

    const escala =
      Math.min(
        1,
        LIMITE_FRAME /
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

    target.width =
      largura;

    target.height =
      altura;

    const ctx =
      target.getContext(
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

    ctx.filter =
      "none";

    ctx.drawImage(
      source,
      0,
      0,
      largura,
      altura
    );

    return true;
  }

  // ==========================================================
  // TENTAR UM CANVAS
  // ==========================================================

  async function decodificarCanvas(
    canvas
  ) {
    const resposta =
      await decodificarCodigoImagem(
        canvas
      );

    if (
      resposta?.encontrado &&
      resposta?.resultado
    ) {
      return resposta.resultado;
    }

    return null;
  }

  // ==========================================================
  // LEITURA MULTICAMADA
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

        const processado =
          canvasProcessadoRef.current;

        if (
          !video ||
          !canvas ||
          !processado ||
          video.readyState < 2 ||
          !video.videoWidth ||
          !video.videoHeight
        ) {
          return false;
        }

        processandoRef.current =
          true;

        if (manual) {
          setProcurando(
            true
          );
        }

        try {
          const regiao =
            obterRegiaoCaptura({
              width:
                video.videoWidth,

              height:
                video.videoHeight,
            });

          // ====================================================
          // 1. REGIÃO CENTRAL
          // ====================================================

          desenharRecorte({
            source:
              video,

            target:
              canvas,

            regiao,

            contraste:
              false,
          });

          let resultado =
            await decodificarCanvas(
              canvas
            );

          if (
            resultado &&
            ativoRef.current
          ) {
            pararCamera();

            onDetected?.(
              resultado
            );

            return true;
          }

          // ====================================================
          // 2. FRAME COMPLETO
          // ====================================================

          desenharFrameCompleto({
            source:
              video,

            target:
              canvas,
          });

          resultado =
            await decodificarCanvas(
              canvas
            );

          if (
            resultado &&
            ativoRef.current
          ) {
            pararCamera();

            onDetected?.(
              resultado
            );

            return true;
          }

          // ====================================================
          // 3. RECORTE COM CONTRASTE
          // ====================================================

          desenharRecorte({
            source:
              video,

            target:
              processado,

            regiao,

            contraste:
              true,
          });

          resultado =
            await decodificarCanvas(
              processado
            );

          if (
            resultado &&
            ativoRef.current
          ) {
            pararCamera();

            onDetected?.(
              resultado
            );

            return true;
          }

          return false;
        } catch (
          error
        ) {
          console.warn(
            "[EntradaCameraScanner] Falha de leitura:",
            error
          );

          return false;
        } finally {
          processandoRef.current =
            false;

          if (manual) {
            setProcurando(
              false
            );
          }
        }
      },
      [
        enquadramento,
        onDetected,
        pararCamera,
      ]
    );

  // ==========================================================
  // LOOP DE LEITURA
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
  // ABRIR STREAM
  // ==========================================================

  const iniciarCamera =
    useCallback(
      async (
        deviceId = null
      ) => {
        pararCamera();

        setIniciando(
          true
        );

        setErro(null);

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

          const constraints =
            deviceId
              ? {
                  audio:
                    false,

                  video: {
                    deviceId: {
                      exact:
                        deviceId,
                    },

                    width: {
                      ideal:
                        2560,
                    },

                    height: {
                      ideal:
                        1440,
                    },
                  },
                }
              : {
                  audio:
                    false,

                  video: {
                    facingMode: {
                      ideal:
                        "environment",
                    },

                    width: {
                      ideal:
                        2560,
                    },

                    height: {
                      ideal:
                        1440,
                    },
                  },
                };

          const stream =
            await navigator
              .mediaDevices
              .getUserMedia(
                constraints
              );

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

          const track =
            stream
              .getVideoTracks?.()[0];

          dispositivoAtualRef.current =
            track || null;

          if (track) {
            await aplicarAjustesOpticos(
              track
            );

            try {
              const settings =
                track
                  .getSettings?.() ||
                {};

              setResolucaoAtiva({
                width:
                  settings.width ||
                  null,

                height:
                  settings.height ||
                  null,
              });
            } catch {
              setResolucaoAtiva(
                null
              );
            }
          }

          /*
           * Depois da permissão, labels das
           * câmeras ficam disponíveis.
           */
          const lista =
            await listarCameras();

          if (
            !deviceId &&
            lista.length > 0
          ) {
            const melhor =
              escolherMelhorCamera(
                lista
              );

            if (
              melhor?.deviceId
            ) {
              setCameraSelecionadaId(
                melhor.deviceId
              );

              /*
               * Se o navegador já escolheu a melhor
               * não reabrimos a stream sem necessidade.
               */
              const settings =
                track?.getSettings?.() ||
                {};

              if (
                settings.deviceId &&
                settings.deviceId !==
                  melhor.deviceId
              ) {
                /*
                 * Reabrir somente se houver uma
                 * escolha claramente diferente.
                 */
                window.setTimeout(
                  () => {
                    if (
                      ativoRef.current
                    ) {
                      iniciarCamera(
                        melhor.deviceId
                      );
                    }
                  },
                  120
                );

                return;
              }
            }
          }

          ativoRef.current =
            true;

          /*
          * Código:
          * leitura automática.
          *
          * Etiqueta:
          * fotografia somente quando
          * o operador solicitar.
          */
          if (!modoEtiqueta) {
            agendarLeitura();
          }
        } catch (
          error
        ) {
          console.error(
            "[EntradaCameraScanner] Falha ao iniciar câmera:",
            error
          );

          setErro(
            error?.message ||
              "Não foi possível iniciar a câmera."
          );

          pararCamera();
        } finally {
          setIniciando(
            false
          );
        }
      },
      [
        agendarLeitura,
        aplicarAjustesOpticos,
        listarCameras,
        pararCamera,
      ]
    );

  // ==========================================================
  // ABRIR MODAL
  // ==========================================================

  useEffect(() => {
    if (!open) {
      pararCamera();

      onOpenChange?.(
        false
      );

      return undefined;
    }

    onOpenChange?.(
      true
    );

    iniciarCamera(
      cameraSelecionadaId
    );

    return () => {
      pararCamera();

      onOpenChange?.(
        false
      );
    };
  }, [
    open,
  ]);

  // ==========================================================
  // TROCAR CÂMERA
  // ==========================================================

  async function handleTrocarCamera(
    event
  ) {
    const id =
      event.target.value ||
      null;

    setCameraSelecionadaId(
      id
    );

    if (id) {
      await iniciarCamera(
        id
      );
    }
  }

  // ==========================================================
  // REAPLICAR FOCO
  // ==========================================================

  async function tentarReaplicarFoco() {
    const track =
      dispositivoAtualRef.current;

    if (!track) {
      return;
    }

    await aplicarAjustesOpticos(
      track
    );

    /*
     * Também permite alguns frames para
     * estabilização antes da tentativa manual.
     */
    window.setTimeout(
      () => {
        tentarLeitura({
          manual: true,
        });
      },
      280
    );
  }

  // ==========================================================
  // CAPTURA DA ETIQUETA PARA OCR
  // ==========================================================

  async function fotografarEtiqueta() {
    if (
      !modoEtiqueta ||
      procurando
    ) {
      return;
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
      return;
    }

    setProcurando(true);

    try {
      const regiao =
        obterRegiaoCaptura({
          width:
            video.videoWidth,

          height:
            video.videoHeight,
        });

      /*
       * No OCR usamos o enquadramento selecionado
       * como região real da fotografia.
       *
       * Horizontal → etiqueta larga.
       * Vertical → etiqueta alta.
       */
      const ok =
        desenharRecorte({
          source:
            video,

          target:
            canvas,

          regiao,

          contraste:
            false,
        });

      if (!ok) {
        throw new Error(
          "Não foi possível fotografar a etiqueta."
        );
      }

      /*
       * Criamos uma cópia própria.
       *
       * Assim o modal pode fechar e o OCR
       * continua com uma imagem estável.
       */
      const snapshot =
        document.createElement(
          "canvas"
        );

      snapshot.width =
        canvas.width;

      snapshot.height =
        canvas.height;

      const ctx =
        snapshot.getContext(
          "2d",
          {
            alpha: false,
          }
        );

      if (!ctx) {
        throw new Error(
          "Não foi possível preparar a fotografia."
        );
      }

      ctx.drawImage(
        canvas,
        0,
        0
      );

      pararCamera();

      onCapturedImage?.(
        snapshot,
        {
          enquadramento,

          cameraDeviceId:
            cameraSelecionadaId,

          cameraLabel:
            cameraSelecionada
              ? nomeCamera(
                  cameraSelecionada,
                  cameras.indexOf(
                    cameraSelecionada
                  )
                )
              : null,

          resolucao:
            resolucaoAtiva,
        }
      );
    } catch (error) {
      console.error(
        "[EntradaCameraScanner] Falha ao fotografar etiqueta:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível fotografar a etiqueta."
      );
    } finally {
      setProcurando(false);
    }
  }

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
        {/* ===================================================
            HEADER
            =================================================== */}

        <header className="entrada-camera__header">
          <div>
            <span>
              Conferência do volume
            </span>

            <h3>
              {modoEtiqueta
                ? "Fotografar etiqueta"
                : "Ler código pela câmera"}
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
            <X
              size={19}
            />
          </button>
        </header>

        {/* ===================================================
            TOOLBAR
            =================================================== */}

        <div className="entrada-camera__toolbar">
          <div className="entrada-camera__orientation">
            <span>
              Enquadramento
            </span>

            <div>
              <button
                type="button"
                className={
                  enquadramento ===
                  ENQUADRAMENTO.HORIZONTAL
                    ? "is-active"
                    : ""
                }
                onClick={() =>
                  setEnquadramento(
                    ENQUADRAMENTO.HORIZONTAL
                  )
                }
              >
                Horizontal
              </button>

              <button
                type="button"
                className={
                  enquadramento ===
                  ENQUADRAMENTO.VERTICAL
                    ? "is-active"
                    : ""
                }
                onClick={() =>
                  setEnquadramento(
                    ENQUADRAMENTO.VERTICAL
                  )
                }
              >
                Vertical
              </button>
            </div>
          </div>

          {cameras.length >
          1 ? (
            <label className="entrada-camera__camera-select">
              <span>
                Câmera
              </span>

              <div>
                <SwitchCamera
                  size={16}
                />

                <select
                  value={
                    cameraSelecionadaId ||
                    ""
                  }
                  onChange={
                    handleTrocarCamera
                  }
                  disabled={
                    iniciando
                  }
                >
                  {cameras.map(
                    (
                      camera,
                      index
                    ) => (
                      <option
                        key={
                          camera.deviceId
                        }
                        value={
                          camera.deviceId
                        }
                      >
                        {nomeCamera(
                          camera,
                          index
                        )}
                      </option>
                    )
                  )}
                </select>
              </div>
            </label>
          ) : null}
        </div>

        {/* ===================================================
            BODY
            =================================================== */}

        <div className="entrada-camera__body">
          <div
            className={`entrada-camera__preview entrada-camera__preview--${enquadramento.toLowerCase()}`}
          >
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
                  Preparando câmera
                </strong>
              </div>
            ) : null}
          </div>

          <canvas
            ref={canvasRef}
            className="entrada-camera__canvas"
            aria-hidden="true"
          />

          <canvas
            ref={
              canvasProcessadoRef
            }
            className="entrada-camera__canvas"
            aria-hidden="true"
          />

          {/* =================================================
              STATUS DA CÂMERA
              ================================================= */}

          {!erro ? (
            <div className="entrada-camera__camera-status">
              <div>
                <CheckCircle2
                  size={16}
                />

                <span>
                  {cameraSelecionada
                    ? nomeCamera(
                        cameraSelecionada,
                        cameras.indexOf(
                          cameraSelecionada
                        )
                      )
                    : "Câmera traseira automática"}
                </span>
              </div>

              <div>
                <Focus
                  size={16}
                />

                <span>
                  {focoStatus ===
                  "CONTINUO"
                    ? "Foco contínuo"
                    : focoStatus ===
                        "UNICO"
                      ? "Foco automático"
                      : "Foco controlado pela câmera"}
                </span>
              </div>

              {resolucaoAtiva
                ?.width &&
              resolucaoAtiva
                ?.height ? (
                <div>
                  <Camera
                    size={16}
                  />

                  <span>
                    {
                      resolucaoAtiva.width
                    }
                    ×
                    {
                      resolucaoAtiva.height
                    }
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}

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
              {modoEtiqueta ? (
                <Camera
                  size={19}
                />
              ) : (
                <ScanBarcode
                  size={19}
                />
              )}

              <div>
                <strong>
                  {modoEtiqueta
                    ? "Enquadre as informações da etiqueta"
                    : "Posicione somente o código dentro da área"}
                </strong>

                <p>
                  {modoEtiqueta
                    ? "Inclua principalmente o nome do destinatário, a Torre/Bloco e a Unidade. Use Horizontal ou Vertical conforme o formato da etiqueta."
                    : "Evite inclinação e reflexo. Para códigos longos, prefira Horizontal. Para etiquetas altas, experimente Vertical."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ===================================================
            FOOTER
            =================================================== */}

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
            className="entrada-camera__focus"
            onClick={
              tentarReaplicarFoco
            }
            disabled={
              iniciando ||
              Boolean(erro) ||
              procurando
            }
          >
            <Focus
              size={17}
            />

            Ajustar foco
          </button>

          <button
            type="button"
            className="entrada-camera__primary"
            onClick={
              modoEtiqueta
                ? fotografarEtiqueta
                : () =>
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

                {modoEtiqueta
                  ? "Fotografando..."
                  : "Lendo..."}
              </>
            ) : modoEtiqueta ? (
              <>
                <Camera
                  size={17}
                />

                Fotografar etiqueta
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