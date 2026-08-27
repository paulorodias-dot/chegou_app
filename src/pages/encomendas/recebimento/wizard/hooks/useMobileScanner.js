import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  decodificarCodigoImagem,
  possuiSuporteCameraBrowser,
} from "../../../shared/captura";


// ============================================================
// SISTEMA CHEGOU!
// CENTRAL DE ENCOMENDAS — RECEBIMENTO
//
// MOBILE SCANNER
//
// Padrão compartilhado com Entrada:
//
// - melhor câmera traseira;
// - troca manual de câmera;
// - Horizontal / Vertical;
// - foco contínuo quando suportado;
// - exposição / white balance quando suportados;
// - ROI;
// - frame completo;
// - ROI tratado;
// - BarcodeDetector + ZXing via shared/captura;
// - leitura automática;
// - captura manual;
// - cooldown operacional da câmera.
//
// IMPORTANTE:
//
// ESTA CAMADA NÃO:
// - cria Volume;
// - altera Volume;
// - conclui Recebimento;
// - decide destinatário;
// - grava no backend.
//
// Ela somente entrega uma CAPTURA CANDIDATA
// ao fluxo já existente do Wizard.
// ============================================================


// ============================================================
// CONFIGURAÇÃO
// ============================================================

const INTERVALO_LEITURA_MS =
  700;

const TEMPO_ESTABILIZACAO_CAMERA_MS =
  500;

const TEMPO_REAPLICAR_FOCO_MS =
  280;

const COOLDOWN_CAPTURA_CAMERA_MS =
  4000;

const INTERVALO_ATUALIZACAO_COOLDOWN_MS =
  200;

const LIMITE_FRAME =
  1600;


export const MOBILE_SCANNER_ENQUADRAMENTO =
  Object.freeze({
    HORIZONTAL:
      "HORIZONTAL",

    VERTICAL:
      "VERTICAL",
  });


// ============================================================
// HELPERS
// ============================================================

function esperar(ms) {
  return new Promise(
    (resolve) => {
      window.setTimeout(
        resolve,
        ms
      );
    }
  );
}


function textoNormalizado(
  value
) {
  return String(
    value || ""
  )
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .trim()
    .toLowerCase();
}


// ============================================================
// CÂMERAS
// ============================================================

function pontuarCamera(
  device
) {
  const label =
    textoNormalizado(
      device?.label
    );


  let score = 0;


  /*
   * Preferência forte por traseira.
   */
  if (
    label.includes("back") ||
    label.includes("rear") ||
    label.includes("traseira") ||
    label.includes("environment")
  ) {
    score += 100;
  }


  /*
   * Muitos Androids identificam
   * a principal como camera 0.
   */
  if (
    label.includes("camera 0") ||
    label.includes("camera0")
  ) {
    score += 30;
  }


  if (
    label.includes("main") ||
    label.includes("principal") ||
    label.includes("1x")
  ) {
    score += 25;
  }


  /*
   * Evitar ultrawide.
   */
  if (
    label.includes("ultra") ||
    label.includes(
      "wide angle"
    ) ||
    label.includes("0.5") ||
    label.includes("0,5")
  ) {
    score -= 50;
  }


  /*
   * Evitar telefoto.
   */
  if (
    label.includes("tele") ||
    label.includes(
      "telephoto"
    )
  ) {
    score -= 35;
  }


  /*
   * Frontal é último recurso.
   */
  if (
    label.includes("front") ||
    label.includes("frontal") ||
    label.includes("user") ||
    label.includes("selfie")
  ) {
    score -= 120;
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
    )[0] || null;
}


function nomeCameraInterno(
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
// TRACK
// ============================================================

function obterCapabilitiesTrack(
  track
) {
  try {
    return (
      track
        ?.getCapabilities?.() ||
      {}
    );
  } catch {
    return {};
  }
}


function obterSettingsTrack(
  track
) {
  try {
    return (
      track?.getSettings?.() ||
      {}
    );
  } catch {
    return {};
  }
}


function encerrarStream(
  stream
) {
  stream
    ?.getTracks?.()
    .forEach(
      (track) =>
        track.stop()
    );
}


// ============================================================
// REGIÃO DE INTERESSE
// ============================================================

function obterRegiaoCaptura({
  width,
  height,
  enquadramento,
}) {
  if (
    enquadramento ===
    MOBILE_SCANNER_ENQUADRAMENTO
      .HORIZONTAL
  ) {
    const largura =
      width * 0.92;

    const altura =
      height * 0.42;


    return {
      sx:
        (width - largura) /
        2,

      sy:
        (height - altura) /
        2,

      sw:
        largura,

      sh:
        altura,
    };
  }


  const largura =
    width * 0.68;

  const altura =
    height * 0.82;


  return {
    sx:
      (width - largura) /
      2,

    sy:
      (height - altura) /
      2,

    sw:
      largura,

    sh:
      altura,
  };
}


// ============================================================
// CANVAS
// ============================================================

function obterCanvasContext(
  canvas
) {
  return canvas.getContext(
    "2d",
    {
      alpha:
        false,

      willReadFrequently:
        true,
    }
  );
}


function desenharRecorte({
  source,
  target,
  regiao,
  contraste = false,
}) {
  const escala =
    Math.min(
      1,

      LIMITE_FRAME /
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
    obterCanvasContext(
      target
    );


  if (!ctx) {
    return false;
  }


  ctx.save();


  ctx.imageSmoothingEnabled =
    false;


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


function desenharFrameCompleto({
  source,
  target,
}) {
  const larguraFonte =
    Number(
      source?.videoWidth ||
      0
    );


  const alturaFonte =
    Number(
      source?.videoHeight ||
      0
    );


  if (
    larguraFonte <= 0 ||
    alturaFonte <= 0
  ) {
    return false;
  }


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
    obterCanvasContext(
      target
    );


  if (!ctx) {
    return false;
  }


  ctx.imageSmoothingEnabled =
    false;

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


// ============================================================
// HOOK
// ============================================================

export default function useMobileScanner({
  ativo,
  videoRef,
  onDetected,
}) {
  // ==========================================================
  // STATE
  // ==========================================================

  const [
    cameraAtiva,
    setCameraAtiva,
  ] =
    useState(false);


  const [
    iniciando,
    setIniciando,
  ] =
    useState(false);


  const [
    erroCamera,
    setErroCamera,
  ] =
    useState(null);


  const [
    camerasDisponiveis,
    setCamerasDisponiveis,
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
      MOBILE_SCANNER_ENQUADRAMENTO
        .HORIZONTAL
    );


  const [
    focoStatus,
    setFocoStatus,
  ] =
    useState(
      "AUTOMATICO"
    );


  const [
    resolucaoAtual,
    setResolucaoAtual,
  ] =
    useState(null);


  const [
    processando,
    setProcessando,
  ] =
    useState(false);


  const [
    cooldownRestanteMs,
    setCooldownRestanteMs,
  ] =
    useState(0);


  // ==========================================================
  // REFS
  // ==========================================================

  const streamRef =
    useRef(null);


  const trackRef =
    useRef(null);


  const canvasRef =
    useRef(null);


  const canvasProcessadoRef =
    useRef(null);


  const timerLeituraRef =
    useRef(null);


  const timerCooldownRef =
    useRef(null);


  const processandoRef =
    useRef(false);


  const ativoRef =
    useRef(
      Boolean(ativo)
    );


  const onDetectedRef =
    useRef(
      onDetected
    );


  const cooldownAteRef =
    useRef(0);


  const cameraSelecionadaIdRef =
    useRef(null);


  // ==========================================================
  // DERIVADOS
  // ==========================================================

  const cameraSelecionada =
    useMemo(
      () =>
        camerasDisponiveis.find(
          (camera) =>
            camera.deviceId ===
            cameraSelecionadaId
        ) ||
        null,
      [
        camerasDisponiveis,
        cameraSelecionadaId,
      ]
    );


  const cameraLabel =
    cameraSelecionada
      ? nomeCameraInterno(
          cameraSelecionada,
          camerasDisponiveis
            .indexOf(
              cameraSelecionada
            )
        )
      : "Câmera traseira automática";


  // ==========================================================
  // REFS SINCRONIZADOS
  // ==========================================================

  useEffect(() => {
    ativoRef.current =
      Boolean(
        ativo
      );
  }, [
    ativo,
  ]);


  useEffect(() => {
    onDetectedRef.current =
      onDetected;
  }, [
    onDetected,
  ]);


  useEffect(() => {
    cameraSelecionadaIdRef.current =
      cameraSelecionadaId;
  }, [
    cameraSelecionadaId,
  ]);


  // ==========================================================
  // TIMERS
  // ==========================================================

  const limparTimerLeitura =
    useCallback(() => {
      if (
        timerLeituraRef.current
      ) {
        window.clearTimeout(
          timerLeituraRef.current
        );

        timerLeituraRef.current =
          null;
      }
    }, []);


  const limparTimerCooldown =
    useCallback(() => {
      if (
        timerCooldownRef.current
      ) {
        window.clearInterval(
          timerCooldownRef.current
        );

        timerCooldownRef.current =
          null;
      }
    }, []);


  const atualizarCooldown =
    useCallback(() => {
      const restante =
        Math.max(
          0,

          cooldownAteRef.current -
            Date.now()
        );


      setCooldownRestanteMs(
        restante
      );


      if (
        restante <= 0
      ) {
        cooldownAteRef.current =
          0;

        limparTimerCooldown();
      }
    }, [
      limparTimerCooldown,
    ]);


  const iniciarCooldown =
    useCallback(() => {
      cooldownAteRef.current =
        Date.now() +
        COOLDOWN_CAPTURA_CAMERA_MS;


      setCooldownRestanteMs(
        COOLDOWN_CAPTURA_CAMERA_MS
      );


      limparTimerCooldown();


      timerCooldownRef.current =
        window.setInterval(
          atualizarCooldown,
          INTERVALO_ATUALIZACAO_COOLDOWN_MS
        );
    }, [
      atualizarCooldown,
      limparTimerCooldown,
    ]);


  // ==========================================================
  // PARAR CÂMERA
  // ==========================================================

  const pararCamera =
    useCallback(() => {
      limparTimerLeitura();
      limparTimerCooldown();


      processandoRef.current =
        false;


      setProcessando(
        false
      );


      cooldownAteRef.current =
        0;


      setCooldownRestanteMs(
        0
      );


      const stream =
        streamRef.current;


      if (stream) {
        encerrarStream(
          stream
        );
      }


      streamRef.current =
        null;

      trackRef.current =
        null;


      const video =
        videoRef?.current;


      if (video) {
        try {
          video.pause();
        } catch {
          // Sem ação.
        }


        video.srcObject =
          null;
      }


      setCameraAtiva(
        false
      );


      setResolucaoAtual(
        null
      );
    }, [
      limparTimerCooldown,
      limparTimerLeitura,
      videoRef,
    ]);


  // ==========================================================
  // ENUMERAR CÂMERAS
  // ==========================================================

  const listarCameras =
    useCallback(async () => {
      if (
        typeof navigator ===
          "undefined" ||
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


        const cameras =
          devices.filter(
            (device) =>
              device.kind ===
              "videoinput"
          );


        setCamerasDisponiveis(
          cameras
        );


        return cameras;
      } catch (error) {
        console.warn(
          "[MobileScanner] Não foi possível enumerar câmeras:",
          error
        );


        return [];
      }
    }, []);


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


        const capabilities =
          obterCapabilitiesTrack(
            track
          );


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

        const whiteBalanceModes =
          Array.isArray(
            capabilities
              ?.whiteBalanceMode
          )
            ? capabilities
                .whiteBalanceMode
            : [];


        if (
          whiteBalanceModes.includes(
            "continuous"
          )
        ) {
          advanced.whiteBalanceMode =
            "continuous";
        }


        if (
          Object.keys(
            advanced
          ).length === 0
        ) {
          return;
        }


        try {
          await track
            .applyConstraints({
              advanced: [
                advanced,
              ],
            });
        } catch (error) {
          /*
           * Não quebrar a câmera.
           *
           * Alguns browsers expõem capability
           * mas recusam applyConstraints.
           */
          console.warn(
            "[MobileScanner] Ajustes ópticos não suportados:",
            error
          );
        }
      },
      []
    );


  // ==========================================================
  // DECODIFICAR CANVAS
  // ==========================================================

  const decodificarCanvas =
    useCallback(
      async (
        canvas
      ) => {
        const resposta =
          await decodificarCodigoImagem(
            canvas
          );


        if (
          resposta
            ?.encontrado &&
          resposta
            ?.resultado
        ) {
          return resposta
            .resultado;
        }


        return null;
      },
      []
    );


  // ==========================================================
  // ENTREGAR RESULTADO AO WIZARD
  // ==========================================================

  const entregarCaptura =
    useCallback(
      async (
        resultado
      ) => {
        if (
          !resultado ||
          !ativoRef.current
        ) {
          return false;
        }


        let resposta =
          null;


        try {
          resposta =
            await onDetectedRef
              .current?.(
                resultado
              );
        } catch (error) {
          console.error(
            "[MobileScanner] Falha ao entregar captura ao Wizard:",
            error
          );


          return false;
        }


        /*
         * O Wizard continua sendo a autoridade
         * para aceitar/rejeitar a captura.
         *
         * Só iniciamos o cooldown quando não
         * houve rejeição explícita.
         */
        if (
          resposta?.ok ===
          false
        ) {
          return false;
        }


        iniciarCooldown();


        return true;
      },
      [
        iniciarCooldown,
      ]
    );


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


        if (
          Date.now() <
          cooldownAteRef.current
        ) {
          return false;
        }


        const video =
          videoRef?.current;


        if (
          !video ||
          video.readyState < 2 ||
          !video.videoWidth ||
          !video.videoHeight
        ) {
          return false;
        }


        if (
          !canvasRef.current
        ) {
          canvasRef.current =
            document
              .createElement(
                "canvas"
              );
        }


        if (
          !canvasProcessadoRef
            .current
        ) {
          canvasProcessadoRef.current =
            document
              .createElement(
                "canvas"
              );
        }


        const canvas =
          canvasRef.current;


        const processado =
          canvasProcessadoRef.current;


        processandoRef.current =
          true;


        setProcessando(
          true
        );


        try {
          const regiao =
            obterRegiaoCaptura({
              width:
                video.videoWidth,

              height:
                video.videoHeight,

              enquadramento,
            });


          // ====================================================
          // CAMADA 1 — ROI NORMAL
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
            return await entregarCaptura(
              resultado
            );
          }


          // ====================================================
          // CAMADA 2 — FRAME COMPLETO
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
            return await entregarCaptura(
              resultado
            );
          }


          // ====================================================
          // CAMADA 3 — ROI TRATADO
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
            return await entregarCaptura(
              resultado
            );
          }


          return false;
        } catch (error) {
          console.warn(
            manual
              ? "[MobileScanner] Falha na captura manual:"
              : "[MobileScanner] Falha na leitura automática:",
            error
          );


          return false;
        } finally {
          processandoRef.current =
            false;


          setProcessando(
            false
          );
        }
      },
      [
        decodificarCanvas,
        enquadramento,
        entregarCaptura,
        videoRef,
      ]
    );


  // ==========================================================
  // LOOP AUTOMÁTICO
  // ==========================================================

  const agendarLeitura =
    useCallback(() => {
      if (
        !ativoRef.current ||
        !streamRef.current
      ) {
        return;
      }


      limparTimerLeitura();


      timerLeituraRef.current =
        window.setTimeout(
          async () => {
            if (
              !ativoRef.current ||
              !streamRef.current
            ) {
              return;
            }


            await tentarLeitura();


            if (
              ativoRef.current &&
              streamRef.current
            ) {
              agendarLeitura();
            }
          },
          INTERVALO_LEITURA_MS
        );
    }, [
      limparTimerLeitura,
      tentarLeitura,
    ]);


  // ==========================================================
  // ABRIR CÂMERA
  // ==========================================================

  const iniciarCamera =
    useCallback(
      async (
        deviceId = null
      ) => {
        if (
          !possuiSuporteCameraBrowser()
        ) {
          setErroCamera(
            "A câmera não está disponível neste navegador."
          );

          return false;
        }


        /*
         * Ao trocar câmera:
         * somente uma stream permanece viva.
         */
        pararCamera();


        setIniciando(
          true
        );


        setErroCamera(
          null
        );


        try {
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


          let stream =
            null;


          try {
            stream =
              await navigator
                .mediaDevices
                .getUserMedia(
                  constraints
                );
          } catch (
            erroPreferencial
          ) {
            console.warn(
              "[MobileScanner] Configuração preferencial recusada; tentando fallback:",
              erroPreferencial
            );


            stream =
              await navigator
                .mediaDevices
                .getUserMedia({
                  audio:
                    false,

                  video:
                    deviceId
                      ? {
                          deviceId: {
                            exact:
                              deviceId,
                          },

                          width: {
                            ideal:
                              1920,
                          },

                          height: {
                            ideal:
                              1080,
                          },
                        }
                      : {
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
          }


          streamRef.current =
            stream;


          const video =
            videoRef?.current;


          if (!video) {
            throw new Error(
              "Não foi possível preparar a câmera."
            );
          }


          video.srcObject =
            stream;


          video.setAttribute(
            "playsinline",
            "true"
          );


          video.muted =
            true;


          await video.play();


          const track =
            stream
              .getVideoTracks?.()[0] ||
            null;


          if (!track) {
            throw new Error(
              "Nenhuma faixa de vídeo foi disponibilizada."
            );
          }


          trackRef.current =
            track;


          try {
            if (
              "contentHint" in
              track
            ) {
              track.contentHint =
                "text";
            }
          } catch {
            // Hint opcional.
          }


          await aplicarAjustesOpticos(
            track
          );


          const settings =
            obterSettingsTrack(
              track
            );


          setResolucaoAtual({
            width:
              settings?.width ||
              null,

            height:
              settings?.height ||
              null,

            frameRate:
              settings
                ?.frameRate ||
              null,
          });


          /*
           * Depois da permissão, os labels
           * normalmente ficam disponíveis.
           */
          const cameras =
            await listarCameras();


          const deviceIdAtual =
            settings?.deviceId ||
            null;


          if (
            deviceIdAtual
          ) {
            setCameraSelecionadaId(
              deviceIdAtual
            );
          }


          /*
           * Na abertura automática descobrimos
           * a melhor câmera e, se necessário,
           * trocamos para ela.
           */
          if (
            !deviceId &&
            cameras.length > 1
          ) {
            const melhor =
              escolherMelhorCamera(
                cameras
              );


            if (
              melhor?.deviceId &&
              melhor.deviceId !==
                deviceIdAtual
            ) {
              setCameraSelecionadaId(
                melhor.deviceId
              );


              /*
               * Esta stream precisa encerrar antes
               * da nova abertura.
               */
              encerrarStream(
                stream
              );


              streamRef.current =
                null;

              trackRef.current =
                null;

              video.srcObject =
                null;


              setIniciando(
                false
              );


              return iniciarCamera(
                melhor.deviceId
              );
            }
          }


          setCameraAtiva(
            true
          );


          /*
           * Pequena estabilização antes
           * de iniciar decoders.
           */
          await esperar(
            TEMPO_ESTABILIZACAO_CAMERA_MS
          );


          if (
            ativoRef.current &&
            streamRef.current
          ) {
            agendarLeitura();
          }


          return true;
        } catch (error) {
          console.error(
            "[MobileScanner] Não foi possível iniciar câmera:",
            error
          );


          let mensagem =
            "Não foi possível acessar a câmera.";


          if (
            error?.name ===
            "NotAllowedError"
          ) {
            mensagem =
              "Permissão da câmera não concedida.";
          } else if (
            error?.name ===
            "NotFoundError"
          ) {
            mensagem =
              "Nenhuma câmera compatível foi encontrada.";
          } else if (
            error?.name ===
            "NotReadableError"
          ) {
            mensagem =
              "A câmera está sendo utilizada por outro aplicativo.";
          } else if (
            error?.name ===
            "OverconstrainedError"
          ) {
            mensagem =
              "A câmera não aceitou a configuração solicitada.";
          }


          pararCamera();


          setErroCamera(
            mensagem
          );


          return false;
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
        videoRef,
      ]
    );


  // ==========================================================
  // TROCAR CÂMERA
  // ==========================================================

  const trocarCamera =
    useCallback(
      async (
        deviceId
      ) => {
        if (!deviceId) {
          return false;
        }


        setCameraSelecionadaId(
          deviceId
        );


        return iniciarCamera(
          deviceId
        );
      },
      [
        iniciarCamera,
      ]
    );


  // ==========================================================
  // AJUSTAR FOCO
  // ==========================================================

  const ajustarFoco =
    useCallback(async () => {
      const track =
        trackRef.current;


      if (!track) {
        return false;
      }


      await aplicarAjustesOpticos(
        track
      );


      await esperar(
        TEMPO_REAPLICAR_FOCO_MS
      );


      if (
        ativoRef.current
      ) {
        await tentarLeitura({
          manual:
            true,
        });
      }


      return true;
    }, [
      aplicarAjustesOpticos,
      tentarLeitura,
    ]);


  // ==========================================================
  // CAPTURA MANUAL
  // ==========================================================

  const capturarAgora =
    useCallback(
      async () =>
        tentarLeitura({
          manual:
            true,
        }),
      [
        tentarLeitura,
      ]
    );


  // ==========================================================
  // ALTERAR ENQUADRAMENTO
  // ==========================================================

  const alterarEnquadramento =
    useCallback(
      (
        proximo
      ) => {
        if (
          !Object.values(
            MOBILE_SCANNER_ENQUADRAMENTO
          ).includes(
            proximo
          )
        ) {
          return;
        }


        setEnquadramento(
          proximo
        );
      },
      []
    );


  // ==========================================================
  // CICLO DE VIDA
  // ==========================================================

  useEffect(() => {
    if (!ativo) {
      pararCamera();
    }
  }, [
    ativo,
    pararCamera,
  ]);


  useEffect(
    () => () => {
      pararCamera();
    },
    [
      pararCamera,
    ]
  );


  // ==========================================================
  // RETURN
  // ==========================================================

  return {
    cameraAtiva,

    iniciando,

    erroCamera,

    camerasDisponiveis,

    cameraSelecionadaId,

    cameraSelecionada,

    cameraLabel,

    enquadramento,

    focoStatus,

    resolucaoAtual,

    processando,

    lendo:
      processando,

    cooldownRestanteMs,

    cooldownAtivo:
      cooldownRestanteMs > 0,

    iniciarCamera,

    pararCamera,

    trocarCamera,

    alterarEnquadramento,

    ajustarFoco,

    capturarAgora,

    possuiSuporteCamera:
      possuiSuporteCameraBrowser(),
  };
}