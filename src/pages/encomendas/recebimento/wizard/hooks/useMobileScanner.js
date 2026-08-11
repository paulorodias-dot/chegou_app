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
// Versão funcional: 2026.08.11.003
//
// Estratégia:
// 1. solicita acesso inicial à câmera traseira;
// 2. obtém permissão e labels disponíveis;
// 3. enumera as câmeras;
// 4. tenta identificar a câmera traseira principal;
// 5. reabre usando deviceId específico;
// 6. solicita resolução alta compatível;
// 7. ativa foco contínuo quando disponível;
// 8. NÃO aplica zoom digital automaticamente;
// 9. estabiliza o código em frames consecutivos;
// 10. mantém scanner aberto após cada leitura.
//
// NÃO:
// - cria Volume;
// - acessa Supabase;
// - faz matching com Morador;
// - normaliza rastreio oficialmente;
// - decide duplicidade operacional.
// ============================================================


// ============================================================
// SCANNER
// ============================================================

const INTERVALO_DETECCAO_MS = 110;

const TEMPO_BLOQUEIO_MESMO_CODIGO_MS =
  1800;

const DETECCOES_CONSECUTIVAS_NECESSARIAS =
  2;

const TEMPO_ESTABILIZACAO_CAMERA_MS =
  850;


// ============================================================
// RESOLUÇÃO
//
// Não pedimos "50 MP" porque getUserMedia trabalha com
// modos de vídeo disponibilizados pelo navegador/driver.
//
// Pedimos resolução alta de vídeo e deixamos o browser
// negociar o melhor modo suportado.
// ============================================================

const RESOLUCAO_PREFERENCIAL =
  Object.freeze({
    widthIdeal: 2560,
    heightIdeal: 1440,

    widthMin: 1280,
    heightMin: 720,

    frameRateIdeal: 30,
    frameRateMax: 60,
  });


// ============================================================
// ÁREA DE LEITURA
// ============================================================

const AREA_LEITURA =
  Object.freeze({
    xMin: 0.07,
    xMax: 0.93,

    yMin: 0.22,
    yMax: 0.78,
  });


// ============================================================
// FORMATOS
// ============================================================

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
// PALAVRAS PARA CLASSIFICAÇÃO DE CÂMERA
//
// Labels não são padronizados.
// Portanto isto é heurística auxiliar, nunca autoridade.
// ============================================================

const CAMERA_LABEL_POSITIVOS =
  Object.freeze([
    "back",
    "rear",
    "environment",
    "main",
    "principal",
    "wide",
    "1x",
  ]);


const CAMERA_LABEL_NEGATIVOS =
  Object.freeze([
    "front",
    "user",
    "selfie",

    "ultra wide",
    "ultrawide",
    "ultra-wide",
    "0.5x",
    "0,5x",

    "macro",

    "telephoto",
    "tele",
    "zoom",

    "depth",
    "tof",
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


function possuiEnumeracaoCamera() {
  return Boolean(
    typeof navigator !== "undefined" &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices
      .enumerateDevices === "function"
  );
}


function possuiBarcodeDetector() {
  return Boolean(
    typeof window !== "undefined" &&
    "BarcodeDetector" in window
  );
}


// ============================================================
// NORMALIZAÇÃO AUXILIAR
// ============================================================

function normalizarTexto(valor) {
  return String(
    valor || ""
  )
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .trim();
}


// ============================================================
// FORMATOS SUPORTADOS
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
// BARCODE DETECTOR
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
            formats,
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
// TRACK — LEITURA SEGURA
// ============================================================

function obterCapabilitiesTrack(
  track
) {
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


function obterSettingsTrack(
  track
) {
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


function obterConstraintsTrack(
  track
) {
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
// PARAR STREAM AUXILIAR
// ============================================================

function encerrarStream(
  stream
) {
  if (!stream) {
    return;
  }


  stream
    .getTracks()
    .forEach(
      (track) => {
        track.stop();
      }
    );
}


// ============================================================
// ENUMERAR CÂMERAS
// ============================================================

async function listarCamerasDisponiveis() {
  if (!possuiEnumeracaoCamera()) {
    return [];
  }


  try {
    const dispositivos =
      await navigator.mediaDevices
        .enumerateDevices();


    return dispositivos
      .filter(
        (device) =>
          device.kind ===
          "videoinput"
      )
      .map(
        (device, index) => ({
          deviceId:
            device.deviceId,

          groupId:
            device.groupId ||
            null,

          label:
            device.label ||
            `Câmera ${index + 1}`,

          labelOriginal:
            device.label ||
            "",

          indice:
            index,
        })
      );
  } catch (error) {
    console.warn(
      "[MobileScanner] Não foi possível enumerar câmeras:",
      error
    );


    return [];
  }
}


// ============================================================
// SCORE DE CÂMERA
//
// Tentamos selecionar a lente principal traseira.
// ============================================================

function calcularScoreCamera(
  camera,
  deviceIdCameraInicial = null
) {
  const label =
    normalizarTexto(
      camera?.labelOriginal ||
      camera?.label
    );


  let score =
    0;


  CAMERA_LABEL_POSITIVOS.forEach(
    (termo) => {
      if (
        label.includes(
          normalizarTexto(
            termo
          )
        )
      ) {
        score += 20;
      }
    }
  );


  CAMERA_LABEL_NEGATIVOS.forEach(
    (termo) => {
      if (
        label.includes(
          normalizarTexto(
            termo
          )
        )
      ) {
        score -= 45;
      }
    }
  );


  /*
   * A câmera inicialmente escolhida pelo browser para
   * environment recebe peso positivo como fallback.
   */
  if (
    deviceIdCameraInicial &&
    camera.deviceId ===
      deviceIdCameraInicial
  ) {
    score += 15;
  }


  /*
   * Labels vazios ou genéricos não são penalizados.
   */
  return score;
}


// ============================================================
// ESCOLHER CÂMERA PRINCIPAL
// ============================================================

function selecionarCameraPrincipal({
  cameras,
  deviceIdCameraInicial,
} = {}) {
  if (
    !Array.isArray(cameras) ||
    cameras.length === 0
  ) {
    return null;
  }


  const ordenadas =
    cameras
      .map(
        (camera) => ({
          ...camera,

          score:
            calcularScoreCamera(
              camera,
              deviceIdCameraInicial
            ),
        })
      )
      .sort(
        (a, b) =>
          b.score -
          a.score
      );


  return (
    ordenadas[0] ||
    null
  );
}


// ============================================================
// CONSTRAINTS INICIAIS
//
// Primeiro acesso serve para:
// - obter permissão;
// - descobrir labels;
// - identificar deviceId traseiro inicial.
// ============================================================

function obterConstraintsBootstrap() {
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
      },
    },
  };
}


// ============================================================
// CONSTRAINTS DA CÂMERA PRINCIPAL
// ============================================================

function obterConstraintsCameraPrincipal(
  deviceId
) {
  return {
    audio: false,

    video: {
      ...(deviceId
        ? {
            deviceId: {
              exact:
                deviceId,
            },
          }
        : {
            facingMode: {
              ideal:
                "environment",
            },
          }),

      width: {
        min:
          RESOLUCAO_PREFERENCIAL
            .widthMin,

        ideal:
          RESOLUCAO_PREFERENCIAL
            .widthIdeal,
      },

      height: {
        min:
          RESOLUCAO_PREFERENCIAL
            .heightMin,

        ideal:
          RESOLUCAO_PREFERENCIAL
            .heightIdeal,
      },

      frameRate: {
        ideal:
          RESOLUCAO_PREFERENCIAL
            .frameRateIdeal,

        max:
          RESOLUCAO_PREFERENCIAL
            .frameRateMax,
      },
    },
  };
}


// ============================================================
// FALLBACK DA CÂMERA PRINCIPAL
// ============================================================

function obterConstraintsFallback(
  deviceId
) {
  return {
    audio: false,

    video: {
      ...(deviceId
        ? {
            deviceId: {
              exact:
                deviceId,
            },
          }
        : {
            facingMode: {
              ideal:
                "environment",
            },
          }),

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
      },
    },
  };
}


// ============================================================
// ABRIR CÂMERA ESPECÍFICA
// ============================================================

async function abrirCameraSelecionada(
  deviceId
) {
  try {
    return await navigator.mediaDevices
      .getUserMedia(
        obterConstraintsCameraPrincipal(
          deviceId
        )
      );
  } catch (primeiroErro) {
    console.warn(
      "[MobileScanner] Resolução preferencial não aceita; tentando 1080p:",
      primeiroErro
    );


    return navigator.mediaDevices
      .getUserMedia(
        obterConstraintsFallback(
          deviceId
        )
      );
  }
}


// ============================================================
// CONFIGURAÇÃO PARA LEITURA
//
// Importante:
// NÃO aplicamos zoom automático.
//
// Barcode ocupa área suficiente no quadro e zoom digital pode
// ampliar desfoque/interpolação.
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

      focoContinuoAtivo:
        false,
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


  const advanced =
    {};


  // ----------------------------------------------------------
  // AUTOFOCUS
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
  // AUTO EXPOSURE
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
      capabilities
        ?.whiteBalanceMode
    ) &&
    capabilities
      .whiteBalanceMode
      .includes(
        "continuous"
      )
  ) {
    advanced.whiteBalanceMode =
      "continuous";
  }


  // ----------------------------------------------------------
  // APPLY
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
      console.warn(
        "[MobileScanner] Ajustes de foco/exposição parcialmente recusados:",
        error
      );
    }
  }


  const settingsDepois =
    obterSettingsTrack(
      track
    );


  const focoContinuoAtivo =
    settingsDepois
      ?.focusMode ===
      "continuous" ||
    advanced.focusMode ===
      "continuous";


  return {
    capabilities,

    settingsAntes,

    constraintsAntes,

    settingsDepois,

    focoContinuoAtivo,
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
// MELHOR RESULTADO
// ============================================================

function escolherMelhorResultado(
  resultados,
  video
) {
  const validos =
    (resultados || [])
      .filter(
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
          (a?.boundingBox
            ?.width || 0) *
          (a?.boundingBox
            ?.height || 0);


        const areaB =
          (b?.boundingBox
            ?.width || 0) *
          (b?.boundingBox
            ?.height || 0);


        return (
          areaB -
          areaA
        );
      }
    )[0];
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
    cameraLabel,
    setCameraLabel,
  ] = useState(null);

  const [
    cameraPrincipal,
    setCameraPrincipal,
  ] = useState(null);

  const [
    camerasDisponiveis,
    setCamerasDisponiveis,
  ] = useState([]);

  const [
    resolucaoAtual,
    setResolucaoAtual,
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

  const timerEstabilizacaoRef =
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

      registradoEm:
        0,
    });


  const candidatoRef =
    useRef({
      codigo: null,

      formato:
        null,

      quantidade:
        0,
    });


  // ==========================================================
  // REFS
  // ==========================================================

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
  // RESET CANDIDATO
  // ==========================================================

  const resetarCandidato =
    useCallback(() => {
      candidatoRef.current = {
        codigo:
          null,

        formato:
          null,

        quantidade:
          0,
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


      if (
        timerRef.current
      ) {
        window.clearTimeout(
          timerRef.current
        );

        timerRef.current =
          null;
      }


      if (
        timerEstabilizacaoRef
          .current
      ) {
        window.clearTimeout(
          timerEstabilizacaoRef
            .current
        );

        timerEstabilizacaoRef.current =
          null;
      }


      if (
        streamRef.current
      ) {
        encerrarStream(
          streamRef.current
        );

        streamRef.current =
          null;
      }


      if (
        videoRef?.current
      ) {
        videoRef.current
          .srcObject =
          null;
      }


      detectorRef.current =
        null;


      processandoRef.current =
        false;


      cameraAtivaRef.current =
        false;


      resetarCandidato();


      setCameraAtiva(
        false
      );

      setDetectorDisponivel(
        false
      );

      setFormatosSuportados(
        []
      );

      setFocoContinuoAtivo(
        false
      );

      setCameraLabel(
        null
      );

      setCameraPrincipal(
        null
      );

      setCamerasDisponiveis(
        []
      );

      setResolucaoAtual(
        null
      );

      setDiagnosticoCamera(
        null
      );
    }, [
      resetarCandidato,
      videoRef,
    ]);


  // ==========================================================
  // ESTABILIZAÇÃO DO CÓDIGO
  // ==========================================================

  const registrarCandidato =
    useCallback(
      (resultado) => {
        const codigo =
          String(
            resultado
              ?.rawValue ||
              ""
          ).trim();


        if (!codigo) {
          resetarCandidato();

          return false;
        }


        const formato =
          resultado
            ?.format ||
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
  // EMITIR DETECÇÃO
  // ==========================================================

  const emitirDeteccao =
    useCallback(
      (resultado) => {
        const codigo =
          String(
            resultado
              ?.rawValue ||
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
              resultado
                .format ||
              null,

            boundingBox:
              resultado
                .boundingBox ||
              null,

            cornerPoints:
              resultado
                .cornerPoints ||
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
  // DETECÇÃO
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
            .detect(
              video
            );


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


            if (
              estabilizado
            ) {
              emitirDeteccao(
                melhor
              );
            }
          }
        }
      } catch (error) {
        console.warn(
          "[MobileScanner] Falha na detecção:",
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
  // DESCOBRIR CÂMERA PRINCIPAL
  // ==========================================================

  const descobrirCameraPrincipal =
    useCallback(
      async () => {
        /*
         * Primeiro abrimos a traseira padrão.
         *
         * Isso:
         * - solicita permissão;
         * - permite revelar labels;
         * - informa o deviceId escolhido inicialmente.
         */
        const bootstrapStream =
          await navigator
            .mediaDevices
            .getUserMedia(
              obterConstraintsBootstrap()
            );


        const bootstrapTrack =
          bootstrapStream
            .getVideoTracks?.()[0] ||
          null;


        const bootstrapSettings =
          obterSettingsTrack(
            bootstrapTrack
          );


        const deviceIdInicial =
          bootstrapSettings
            ?.deviceId ||
          null;


        const cameras =
          await listarCamerasDisponiveis();


        setCamerasDisponiveis(
          cameras
        );


        const principal =
          selecionarCameraPrincipal({
            cameras,

            deviceIdCameraInicial:
              deviceIdInicial,
          });


        /*
         * Encerramos o bootstrap ANTES de abrir a câmera
         * definitiva, evitando conflito de hardware.
         */
        encerrarStream(
          bootstrapStream
        );


        return {
          principal,

          cameras,

          deviceIdInicial,

          bootstrapSettings,
        };
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


        setIniciando(
          true
        );

        setErroCamera(
          null
        );


        try {
          // --------------------------------------------------
          // 1. DESCOBRIR CÂMERA PRINCIPAL
          // --------------------------------------------------

          const descoberta =
            await descobrirCameraPrincipal();


          const principal =
            descoberta
              .principal;


          setCameraPrincipal(
            principal
          );


          // --------------------------------------------------
          // 2. ABRIR CÂMERA DEFINITIVA
          // --------------------------------------------------

          const stream =
            await abrirCameraSelecionada(
              principal?.deviceId ||
              descoberta
                .deviceIdInicial ||
              null
            );


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


          // --------------------------------------------------
          // 3. CONFIGURAR
          // --------------------------------------------------

          const configuracao =
            await configurarCameraParaLeitura(
              track
            );


          const settings =
            configuracao
              .settingsDepois;


          setFocoContinuoAtivo(
            Boolean(
              configuracao
                .focoContinuoAtivo
            )
          );


          setCameraLabel(
            track.label ||
            principal?.label ||
            null
          );


          setResolucaoAtual({
            width:
              settings
                ?.width ||
              null,

            height:
              settings
                ?.height ||
              null,

            frameRate:
              settings
                ?.frameRate ||
              null,
          });


          // --------------------------------------------------
          // 4. DIAGNÓSTICO
          // --------------------------------------------------

          const diagnostico = {
            cameraSelecionada: {
              deviceId:
                principal
                  ?.deviceId ||
                settings
                  ?.deviceId ||
                null,

              label:
                track.label ||
                principal
                  ?.label ||
                null,

              score:
                principal
                  ?.score ??
                null,
            },

            camerasEnumeradas:
              descoberta.cameras,

            deviceIdInicial:
              descoberta
                .deviceIdInicial,

            bootstrapSettings:
              descoberta
                .bootstrapSettings,

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
          };


          setDiagnosticoCamera(
            diagnostico
          );


          console.info(
            "[MobileScanner] Diagnóstico câmera principal:",
            diagnostico
          );


          // --------------------------------------------------
          // 5. VIDEO
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
          // 6. DETECTOR
          // --------------------------------------------------

          const {
            detector,
            formatos,
          } =
            await criarDetector();


          detectorRef.current =
            detector;


          setDetectorDisponivel(
            Boolean(
              detector
            )
          );


          setFormatosSuportados(
            formatos
          );


          // --------------------------------------------------
          // 7. LIBERAR
          // --------------------------------------------------

          cameraAtivaRef.current =
            true;


          setCameraAtiva(
            true
          );


          timerEstabilizacaoRef.current =
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
              "A câmera principal não aceitou a configuração solicitada.";
          }


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
        descobrirCameraPrincipal,
        detectarFrame,
        pararCamera,
        videoRef,
      ]
    );


  // ==========================================================
  // FECHAMENTO
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

    /*
     * Mantido por compatibilidade temporária com o
     * MobileScanner.jsx atual.
     *
     * Agora não existe zoom automático.
     */
    zoomAtual:
      null,

    cameraLabel,

    cameraPrincipal,

    camerasDisponiveis,

    resolucaoAtual,

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