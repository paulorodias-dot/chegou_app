import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";


// ============================================================
// SISTEMA CHEGOU!
// MOBILE SCANNER HOOK
//
// Versão funcional: 2026.08.11.002
//
// Responsabilidades:
// - solicitar câmera;
// - preferir câmera traseira;
// - inspecionar configuração real da câmera;
// - aplicar autofocus contínuo quando suportado;
// - aplicar zoom inicial adaptativo quando suportado;
// - controlar MediaStream;
// - detectar códigos suportados pelo BarcodeDetector;
// - priorizar códigos dentro da área central;
// - estabilizar a leitura antes da captura;
// - manter leitura contínua após cada volume.
//
// NÃO:
// - cria Volume;
// - acessa Supabase;
// - normaliza rastreio oficialmente;
// - decide duplicidade operacional.
// ============================================================


const INTERVALO_DETECCAO_MS = 120;

const TEMPO_BLOQUEIO_MESMO_CODIGO_MS =
  1800;

const DETECCOES_CONSECUTIVAS_NECESSARIAS =
  2;


/*
 * Pequena espera depois da abertura da câmera.
 *
 * Ajuda o hardware a estabilizar exposição/foco antes de
 * começarmos a exigir leituras consecutivas.
 */
const TEMPO_ESTABILIZACAO_CAMERA_MS =
  650;


/*
 * Não aplicamos um zoom fixo absoluto.
 *
 * O valor é calculado dentro da faixa real exposta pela
 * câmera daquele dispositivo.
 */
const FRACAO_ZOOM_INICIAL =
  0.2;


/*
 * Limite adicional para evitar zoom excessivo mesmo em
 * aparelhos que exponham uma faixa muito grande.
 */
const ZOOM_INICIAL_MAXIMO =
  2.0;


const AREA_LEITURA =
  Object.freeze({
    xMin: 0.08,
    xMax: 0.92,

    yMin: 0.24,
    yMax: 0.76,
  });


const FORMATOS_DESEJADOS =
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


// ============================================================
// SUPORTE
// ============================================================

function possuiSuporteCamera() {
  return Boolean(
    typeof navigator !== "undefined" &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices
      .getUserMedia === "function"
  );
}


function possuiBarcodeDetector() {
  return Boolean(
    typeof window !== "undefined" &&
    "BarcodeDetector" in window
  );
}


// ============================================================
// FORMATOS
// ============================================================

async function obterFormatosSuportados() {
  if (!possuiBarcodeDetector()) {
    return [];
  }


  try {
    if (
      typeof window.BarcodeDetector
        .getSupportedFormats !==
      "function"
    ) {
      return [
        ...FORMATOS_DESEJADOS,
      ];
    }


    const suportados =
      await window.BarcodeDetector
        .getSupportedFormats();


    return FORMATOS_DESEJADOS.filter(
      (formato) =>
        suportados.includes(
          formato
        )
    );
  } catch (error) {
    console.warn(
      "[MobileScanner] Não foi possível consultar formatos suportados:",
      error
    );

    return [];
  }
}


// ============================================================
// DETECTOR
// ============================================================

async function criarDetector() {
  if (!possuiBarcodeDetector()) {
    return {
      detector: null,
      formatos: [],
    };
  }


  try {
    const formatos =
      await obterFormatosSuportados();


    const detector =
      formatos.length > 0
        ? new window.BarcodeDetector({
            formats: formatos,
          })
        : new window.BarcodeDetector();


    return {
      detector,
      formatos,
    };
  } catch (error) {
    console.warn(
      "[MobileScanner] BarcodeDetector indisponível:",
      error
    );

    return {
      detector: null,
      formatos: [],
    };
  }
}


// ============================================================
// CÂMERA — LEITURA SEGURA DE ESTADO
// ============================================================

function obterCapabilitiesTrack(track) {
  try {
    if (
      typeof track?.getCapabilities ===
      "function"
    ) {
      return (
        track.getCapabilities() ||
        {}
      );
    }
  } catch (error) {
    console.warn(
      "[MobileScanner] getCapabilities indisponível:",
      error
    );
  }


  return {};
}


function obterSettingsTrack(track) {
  try {
    if (
      typeof track?.getSettings ===
      "function"
    ) {
      return (
        track.getSettings() ||
        {}
      );
    }
  } catch (error) {
    console.warn(
      "[MobileScanner] getSettings indisponível:",
      error
    );
  }


  return {};
}


function obterConstraintsTrack(track) {
  try {
    if (
      typeof track?.getConstraints ===
      "function"
    ) {
      return (
        track.getConstraints() ||
        {}
      );
    }
  } catch (error) {
    console.warn(
      "[MobileScanner] getConstraints indisponível:",
      error
    );
  }


  return {};
}


// ============================================================
// ZOOM ADAPTATIVO
// ============================================================

function calcularZoomInicial(
  capabilities,
  settings
) {
  const zoom =
    capabilities?.zoom;


  if (
    !zoom ||
    typeof zoom.min !== "number" ||
    typeof zoom.max !== "number"
  ) {
    return null;
  }


  if (
    zoom.max <= zoom.min
  ) {
    return null;
  }


  const atual =
    typeof settings?.zoom === "number"
      ? settings.zoom
      : zoom.min;


  /*
   * Calcula um pequeno avanço dentro da faixa disponível.
   */
  const amplitude =
    zoom.max - zoom.min;


  let desejado =
    zoom.min +
    amplitude *
      FRACAO_ZOOM_INICIAL;


  /*
   * Nunca reduzimos um zoom que o aparelho já escolheu.
   */
  desejado =
    Math.max(
      desejado,
      atual
    );


  /*
   * Não queremos começar excessivamente aproximado.
   */
  desejado =
    Math.min(
      desejado,
      ZOOM_INICIAL_MAXIMO,
      zoom.max
    );


  desejado =
    Math.max(
      desejado,
      zoom.min
    );


  /*
   * Ajusta ao step quando informado.
   */
  if (
    typeof zoom.step === "number" &&
    zoom.step > 0
  ) {
    const passos =
      Math.round(
        (desejado - zoom.min) /
          zoom.step
      );


    desejado =
      zoom.min +
      passos *
        zoom.step;
  }


  return Number(
    desejado.toFixed(3)
  );
}


// ============================================================
// OTIMIZAÇÃO DA CÂMERA
// ============================================================

async function configurarCameraParaLeitura(
  track
) {
  if (!track) {
    return {
      capabilities: {},
      settingsAntes: {},
      constraintsAntes: {},
      settingsDepois: {},
      focoContinuoAtivo: false,
      zoomAplicado: null,
    };
  }


  const capabilities =
    obterCapabilitiesTrack(
      track
    );


  const settingsAntes =
    obterSettingsTrack(
      track
    );


  const constraintsAntes =
    obterConstraintsTrack(
      track
    );


  const advanced = {};


  // ----------------------------------------------------------
  // FOCO
  // ----------------------------------------------------------

  if (
    Array.isArray(
      capabilities?.focusMode
    ) &&
    capabilities.focusMode.includes(
      "continuous"
    )
  ) {
    advanced.focusMode =
      "continuous";
  }


  // ----------------------------------------------------------
  // EXPOSIÇÃO
  // ----------------------------------------------------------

  if (
    Array.isArray(
      capabilities?.exposureMode
    ) &&
    capabilities.exposureMode.includes(
      "continuous"
    )
  ) {
    advanced.exposureMode =
      "continuous";
  }


  // ----------------------------------------------------------
  // WHITE BALANCE
  // ----------------------------------------------------------

  if (
    Array.isArray(
      capabilities?.whiteBalanceMode
    ) &&
    capabilities.whiteBalanceMode.includes(
      "continuous"
    )
  ) {
    advanced.whiteBalanceMode =
      "continuous";
  }


  // ----------------------------------------------------------
  // ZOOM
  // ----------------------------------------------------------

  const zoomInicial =
    calcularZoomInicial(
      capabilities,
      settingsAntes
    );


  if (
    zoomInicial !== null
  ) {
    advanced.zoom =
      zoomInicial;
  }


  // ----------------------------------------------------------
  // APPLY CONSTRAINTS
  // ----------------------------------------------------------

  if (
    Object.keys(
      advanced
    ).length > 0
  ) {
    try {
      await track.applyConstraints({
        advanced: [
          advanced,
        ],
      });
    } catch (error) {
      /*
       * Não bloqueia o scanner.
       *
       * Alguns navegadores expõem uma capability, mas podem
       * recusar sua aplicação dependendo da câmera ativa.
       */
      console.warn(
        "[MobileScanner] Ajustes avançados da câmera parcialmente recusados:",
        error
      );
    }
  }


  const settingsDepois =
    obterSettingsTrack(
      track
    );


  const focoContinuoAtivo =
    settingsDepois?.focusMode ===
      "continuous" ||
    advanced.focusMode ===
      "continuous";


  const zoomAplicado =
    typeof settingsDepois?.zoom ===
      "number"
      ? settingsDepois.zoom
      : zoomInicial;


  return {
    capabilities,
    settingsAntes,
    constraintsAntes,
    settingsDepois,

    focoContinuoAtivo,

    zoomAplicado,
  };
}


// ============================================================
// ÁREA CENTRAL
// ============================================================

function resultadoEstaNaAreaCentral(
  resultado,
  video
) {
  const box =
    resultado?.boundingBox;


  if (
    !box ||
    !video?.videoWidth ||
    !video?.videoHeight
  ) {
    return true;
  }


  const centroX =
    box.x +
    box.width / 2;


  const centroY =
    box.y +
    box.height / 2;


  const xRelativo =
    centroX /
    video.videoWidth;


  const yRelativo =
    centroY /
    video.videoHeight;


  return (
    xRelativo >=
      AREA_LEITURA.xMin &&
    xRelativo <=
      AREA_LEITURA.xMax &&
    yRelativo >=
      AREA_LEITURA.yMin &&
    yRelativo <=
      AREA_LEITURA.yMax
  );
}


// ============================================================
// ESCOLHER MELHOR RESULTADO
// ============================================================

function escolherMelhorResultado(
  resultados,
  video
) {
  const validos =
    (resultados || []).filter(
      (resultado) =>
        Boolean(
          resultado?.rawValue
        )
    );


  if (
    validos.length === 0
  ) {
    return null;
  }


  const centrais =
    validos.filter(
      (resultado) =>
        resultadoEstaNaAreaCentral(
          resultado,
          video
        )
    );


  const candidatos =
    centrais.length > 0
      ? centrais
      : validos;


  return candidatos
    .slice()
    .sort(
      (a, b) => {
        const areaA =
          (a?.boundingBox?.width ||
            0) *
          (a?.boundingBox?.height ||
            0);


        const areaB =
          (b?.boundingBox?.width ||
            0) *
          (b?.boundingBox?.height ||
            0);


        return (
          areaB -
          areaA
        );
      }
    )[0];
}


// ============================================================
// CONSTRAINTS INICIAIS
// ============================================================

function obterConstraintsPreferenciais() {
  return {
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

      frameRate: {
        ideal:
          30,

        max:
          60,
      },
    },
  };
}


function obterConstraintsFallback() {
  return {
    audio: false,

    video: {
      facingMode: {
        ideal:
          "environment",
      },
    },
  };
}


// ============================================================
// HOOK
// ============================================================

export default function useMobileScanner({
  ativo = false,
  videoRef,
  onDetected,
} = {}) {
  const [
    cameraAtiva,
    setCameraAtiva,
  ] = useState(false);

  const [
    iniciando,
    setIniciando,
  ] = useState(false);

  const [
    erroCamera,
    setErroCamera,
  ] = useState(null);

  const [
    detectorDisponivel,
    setDetectorDisponivel,
  ] = useState(false);

  const [
    formatosSuportados,
    setFormatosSuportados,
  ] = useState([]);

  const [
    focoContinuoAtivo,
    setFocoContinuoAtivo,
  ] = useState(false);

  const [
    zoomAtual,
    setZoomAtual,
  ] = useState(null);

  const [
    cameraLabel,
    setCameraLabel,
  ] = useState(null);

  const [
    lendo,
    setLendo,
  ] = useState(false);

  const [
    diagnosticoCamera,
    setDiagnosticoCamera,
  ] = useState(null);


  const streamRef =
    useRef(null);

  const detectorRef =
    useRef(null);

  const timerRef =
    useRef(null);

  const processandoRef =
    useRef(false);

  const cameraAtivaRef =
    useRef(false);

  const ativoRef =
    useRef(ativo);

  const liberadoParaDetectarRef =
    useRef(false);


  const ultimoCodigoRef =
    useRef({
      codigo: null,
      registradoEm: 0,
    });


  const candidatoRef =
    useRef({
      codigo: null,
      formato: null,
      quantidade: 0,
    });


  useEffect(() => {
    ativoRef.current =
      ativo;
  }, [
    ativo,
  ]);


  useEffect(() => {
    cameraAtivaRef.current =
      cameraAtiva;
  }, [
    cameraAtiva,
  ]);


  // ==========================================================
  // RESET
  // ==========================================================

  const resetarCandidato =
    useCallback(() => {
      candidatoRef.current = {
        codigo: null,
        formato: null,
        quantidade: 0,
      };

      setLendo(false);
    }, []);


  // ==========================================================
  // PARAR
  // ==========================================================

  const pararCamera =
    useCallback(() => {
      liberadoParaDetectarRef.current =
        false;


      if (timerRef.current) {
        window.clearTimeout(
          timerRef.current
        );

        timerRef.current =
          null;
      }


      if (
        streamRef.current
      ) {
        streamRef.current
          .getTracks()
          .forEach(
            (track) => {
              track.stop();
            }
          );


        streamRef.current =
          null;
      }


      if (
        videoRef?.current
      ) {
        videoRef.current.srcObject =
          null;
      }


      detectorRef.current =
        null;


      processandoRef.current =
        false;


      cameraAtivaRef.current =
        false;


      resetarCandidato();


      setCameraAtiva(false);

      setDetectorDisponivel(
        false
      );

      setFormatosSuportados(
        []
      );

      setFocoContinuoAtivo(
        false
      );

      setZoomAtual(null);

      setCameraLabel(null);

      setDiagnosticoCamera(
        null
      );
    }, [
      resetarCandidato,
      videoRef,
    ]);


  // ==========================================================
  // ESTABILIZAÇÃO
  // ==========================================================

  const registrarCandidato =
    useCallback(
      (resultado) => {
        const codigo =
          String(
            resultado?.rawValue ||
              ""
          ).trim();


        if (!codigo) {
          resetarCandidato();

          return false;
        }


        const formato =
          resultado?.format ||
          null;


        const atual =
          candidatoRef.current;


        if (
          atual.codigo ===
            codigo &&
          atual.formato ===
            formato
        ) {
          candidatoRef.current = {
            ...atual,

            quantidade:
              atual.quantidade +
              1,
          };
        } else {
          candidatoRef.current = {
            codigo,
            formato,
            quantidade:
              1,
          };
        }


        setLendo(true);


        return (
          candidatoRef.current
            .quantidade >=
          DETECCOES_CONSECUTIVAS_NECESSARIAS
        );
      },
      [
        resetarCandidato,
      ]
    );


  // ==========================================================
  // EMITIR
  // ==========================================================

  const emitirDeteccao =
    useCallback(
      (resultado) => {
        const codigo =
          String(
            resultado?.rawValue ||
              ""
          ).trim();


        if (!codigo) {
          return;
        }


        const agora =
          Date.now();


        const ultimo =
          ultimoCodigoRef.current;


        const mesmoCodigoRecente =
          ultimo.codigo ===
            codigo &&
          agora -
            ultimo.registradoEm <
            TEMPO_BLOQUEIO_MESMO_CODIGO_MS;


        if (
          mesmoCodigoRecente
        ) {
          resetarCandidato();

          return;
        }


        ultimoCodigoRef.current = {
          codigo,

          registradoEm:
            agora,
        };


        resetarCandidato();


        if (
          typeof onDetected ===
          "function"
        ) {
          onDetected({
            codigo,

            formato:
              resultado.format ||
              null,

            boundingBox:
              resultado.boundingBox ||
              null,

            cornerPoints:
              resultado.cornerPoints ||
              null,

            detectadoEm:
              new Date()
                .toISOString(),
          });
        }
      },
      [
        onDetected,
        resetarCandidato,
      ]
    );


  // ==========================================================
  // LOOP
  // ==========================================================

  const detectarFrame =
    useCallback(async () => {
      if (
        !ativoRef.current ||
        !cameraAtivaRef.current ||
        !liberadoParaDetectarRef.current ||
        !detectorRef.current ||
        !videoRef?.current
      ) {
        return;
      }


      if (
        processandoRef.current
      ) {
        timerRef.current =
          window.setTimeout(
            detectarFrame,
            INTERVALO_DETECCAO_MS
          );

        return;
      }


      const video =
        videoRef.current;


      if (
        video.readyState < 2 ||
        video.videoWidth === 0 ||
        video.videoHeight === 0
      ) {
        timerRef.current =
          window.setTimeout(
            detectarFrame,
            INTERVALO_DETECCAO_MS
          );

        return;
      }


      processandoRef.current =
        true;


      try {
        const resultados =
          await detectorRef.current
            .detect(video);


        const melhor =
          escolherMelhorResultado(
            resultados,
            video
          );


        if (!melhor) {
          resetarCandidato();
        } else {
          const centralizado =
            resultadoEstaNaAreaCentral(
              melhor,
              video
            );


          if (!centralizado) {
            resetarCandidato();
          } else {
            const estabilizado =
              registrarCandidato(
                melhor
              );


            if (estabilizado) {
              emitirDeteccao(
                melhor
              );
            }
          }
        }
      } catch (error) {
        console.warn(
          "[MobileScanner] Falha na detecção do frame:",
          error
        );


        resetarCandidato();
      } finally {
        processandoRef.current =
          false;


        if (
          ativoRef.current &&
          cameraAtivaRef.current &&
          liberadoParaDetectarRef.current
        ) {
          timerRef.current =
            window.setTimeout(
              detectarFrame,
              INTERVALO_DETECCAO_MS
            );
        }
      }
    }, [
      emitirDeteccao,
      registrarCandidato,
      resetarCandidato,
      videoRef,
    ]);


  // ==========================================================
  // SOLICITAR STREAM
  // ==========================================================

  const solicitarStream =
    useCallback(
      async () => {
        try {
          return await navigator
            .mediaDevices
            .getUserMedia(
              obterConstraintsPreferenciais()
            );
        } catch (
          primeiroErro
        ) {
          console.warn(
            "[MobileScanner] Constraints preferenciais recusadas; usando fallback.",
            primeiroErro
          );


          return navigator
            .mediaDevices
            .getUserMedia(
              obterConstraintsFallback()
            );
        }
      },
      []
    );


  // ==========================================================
  // INICIAR
  // ==========================================================

  const iniciarCamera =
    useCallback(
      async () => {
        if (
          !possuiSuporteCamera()
        ) {
          setErroCamera(
            "A câmera não está disponível neste navegador."
          );

          return false;
        }


        if (
          streamRef.current
        ) {
          return true;
        }


        setIniciando(true);

        setErroCamera(null);


        try {
          const stream =
            await solicitarStream();


          streamRef.current =
            stream;


          const track =
            stream
              .getVideoTracks?.()[0] ||
            null;


          if (!track) {
            throw new Error(
              "Nenhuma faixa de vídeo foi disponibilizada."
            );
          }


          setCameraLabel(
            track.label ||
              null
          );


          // --------------------------------------------------
          // DIAGNÓSTICO ANTES
          // --------------------------------------------------

          const configuracao =
            await configurarCameraParaLeitura(
              track
            );


          setFocoContinuoAtivo(
            Boolean(
              configuracao
                .focoContinuoAtivo
            )
          );


          setZoomAtual(
            configuracao
              .zoomAplicado ??
              null
          );


          const diagnostico = {
            label:
              track.label ||
              null,

            capabilities:
              configuracao
                .capabilities,

            settingsAntes:
              configuracao
                .settingsAntes,

            constraintsAntes:
              configuracao
                .constraintsAntes,

            settingsDepois:
              configuracao
                .settingsDepois,

            focoContinuoAtivo:
              configuracao
                .focoContinuoAtivo,

            zoomAplicado:
              configuracao
                .zoomAplicado,
          };


          setDiagnosticoCamera(
            diagnostico
          );


          /*
           * Temporário para homologação no aparelho real.
           *
           * Depois de validarmos os celulares, podemos
           * retirar ou condicionar ao modo de desenvolvimento.
           */
          console.info(
            "[MobileScanner] Diagnóstico da câmera ativa:",
            diagnostico
          );


          // --------------------------------------------------
          // VIDEO
          // --------------------------------------------------

          const video =
            videoRef?.current;


          if (!video) {
            throw new Error(
              "Área de vídeo não encontrada."
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


          // --------------------------------------------------
          // DETECTOR
          // --------------------------------------------------

          const {
            detector,
            formatos,
          } =
            await criarDetector();


          detectorRef.current =
            detector;


          setDetectorDisponivel(
            Boolean(detector)
          );


          setFormatosSuportados(
            formatos
          );


          cameraAtivaRef.current =
            true;


          setCameraAtiva(true);


          /*
           * Permite foco/exposição estabilizarem antes do
           * primeiro ciclo de leitura automática.
           */
          window.setTimeout(
            () => {
              if (
                ativoRef.current &&
                cameraAtivaRef.current
              ) {
                liberadoParaDetectarRef.current =
                  true;
              }
            },
            TEMPO_ESTABILIZACAO_CAMERA_MS
          );


          return true;
        } catch (error) {
          console.error(
            "[MobileScanner] Não foi possível iniciar câmera:",
            error
          );


          pararCamera();


          let mensagem =
            "Não foi possível acessar a câmera.";


          if (
            error?.name ===
            "NotAllowedError"
          ) {
            mensagem =
              "Permissão da câmera não concedida.";
          }


          if (
            error?.name ===
            "NotFoundError"
          ) {
            mensagem =
              "Nenhuma câmera compatível foi encontrada.";
          }


          if (
            error?.name ===
            "NotReadableError"
          ) {
            mensagem =
              "A câmera está sendo utilizada por outro aplicativo.";
          }


          if (
            error?.name ===
            "OverconstrainedError"
          ) {
            mensagem =
              "A câmera não suporta a configuração solicitada.";
          }


          setErroCamera(
            mensagem
          );


          return false;
        } finally {
          setIniciando(false);
        }
      },
      [
        pararCamera,
        solicitarStream,
        videoRef,
      ]
    );


  // ==========================================================
  // LOOP INICIAL
  // ==========================================================

  useEffect(() => {
    if (
      !ativo ||
      !cameraAtiva ||
      !detectorRef.current
    ) {
      return undefined;
    }


    const timerInicial =
      window.setTimeout(
        () => {
          if (
            ativoRef.current &&
            cameraAtivaRef.current
          ) {
            liberadoParaDetectarRef.current =
              true;


            detectarFrame();
          }
        },
        TEMPO_ESTABILIZACAO_CAMERA_MS
      );


    return () => {
      window.clearTimeout(
        timerInicial
      );


      if (
        timerRef.current
      ) {
        window.clearTimeout(
          timerRef.current
        );


        timerRef.current =
          null;
      }
    };
  }, [
    ativo,
    cameraAtiva,
    detectarFrame,
  ]);


  // ==========================================================
  // FECHOU
  // ==========================================================

  useEffect(() => {
    if (!ativo) {
      pararCamera();
    }
  }, [
    ativo,
    pararCamera,
  ]);


  // ==========================================================
  // UNMOUNT
  // ==========================================================

  useEffect(
    () => () => {
      pararCamera();
    },
    [
      pararCamera,
    ]
  );


  // ==========================================================
  // API
  // ==========================================================

  return {
    cameraAtiva,
    iniciando,
    erroCamera,

    detectorDisponivel,

    formatosSuportados,

    focoContinuoAtivo,

    zoomAtual,

    cameraLabel,

    lendo,

    diagnosticoCamera,

    iniciarCamera,
    pararCamera,

    possuiSuporteCamera:
      possuiSuporteCamera(),

    possuiDetectorNativo:
      possuiBarcodeDetector(),
  };
}