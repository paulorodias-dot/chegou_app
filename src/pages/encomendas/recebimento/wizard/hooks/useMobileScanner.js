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
// Versão funcional: 2026.08.11.004
//
// Estratégia:
// - obter permissão para câmera;
// - enumerar câmeras disponíveis;
// - priorizar câmera traseira principal;
// - abrir a câmera pelo deviceId;
// - solicitar resolução alta compatível;
// - NÃO aplicar zoom digital automático;
// - executar autofocus inicial;
// - priorizar o centro da área de leitura;
// - manter autofocus contínuo quando confirmado;
// - solicitar novo autofocus quando a leitura não evoluir;
// - detectar códigos automaticamente;
// - estabilizar leitura em frames consecutivos;
// - manter câmera aberta após cada captura.
// ============================================================


// ============================================================
// SCANNER
// ============================================================

const INTERVALO_DETECCAO_MS =
  110;

const TEMPO_BLOQUEIO_MESMO_CODIGO_MS =
  1800;

const DETECCOES_CONSECUTIVAS_NECESSARIAS =
  2;

const TEMPO_ESTABILIZACAO_CAMERA_MS =
  900;


// ============================================================
// AUTOFOCUS
// ============================================================

const TEMPO_SINGLE_SHOT_MS =
  450;

/*
 * Se o detector ficar este período sem conseguir encontrar
 * um código válido, solicitamos novo autofocus.
 */
const TEMPO_SEM_LEITURA_PARA_REFOCO_MS =
  1800;

/*
 * Evita ficar solicitando autofocus continuamente.
 */
const INTERVALO_MINIMO_REFOCO_MS =
  1800;


// ============================================================
// RESOLUÇÃO
// ============================================================

const RESOLUCAO_PREFERENCIAL =
  Object.freeze({
    widthIdeal:
      2560,

    heightIdeal:
      1440,

    widthMin:
      1280,

    heightMin:
      720,

    frameRateIdeal:
      30,

    frameRateMax:
      60,
  });


// ============================================================
// ÁREA DE LEITURA
// ============================================================

const AREA_LEITURA =
  Object.freeze({
    xMin:
      0.07,

    xMax:
      0.93,

    yMin:
      0.22,

    yMax:
      0.78,
  });


// ============================================================
// PONTO DE INTERESSE
//
// Centro do quadro visual / linha vermelha.
// ============================================================

const PONTO_INTERESSE_CENTRAL =
  Object.freeze({
    x: 0.5,
    y: 0.5,
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
// CLASSIFICAÇÃO AUXILIAR DE CÂMERAS
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

    "depth",
    "tof",
  ]);


// ============================================================
// UTIL
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


function normalizarTexto(
  valor
) {
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
// SUPORTE
// ============================================================

function possuiSuporteCamera() {
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


function possuiEnumeracaoCamera() {
  return Boolean(
    typeof navigator !==
      "undefined" &&
    navigator.mediaDevices &&
    typeof navigator
      .mediaDevices
      .enumerateDevices ===
      "function"
  );
}


function possuiBarcodeDetector() {
  return Boolean(
    typeof window !==
      "undefined" &&
    "BarcodeDetector" in window
  );
}


function obterConstraintsSuportados() {
  try {
    return (
      navigator
        ?.mediaDevices
        ?.getSupportedConstraints?.() ||
      {}
    );
  } catch {
    return {};
  }
}


// ============================================================
// BARCODE FORMATS
// ============================================================

async function obterFormatosSuportados() {
  if (
    !possuiBarcodeDetector()
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
        ...FORMATOS_DESEJADOS,
      ];
    }


    const suportados =
      await window
        .BarcodeDetector
        .getSupportedFormats();


    return FORMATOS_DESEJADOS.filter(
      (formato) =>
        suportados.includes(
          formato
        )
    );
  } catch (error) {
    console.warn(
      "[MobileScanner] Falha ao consultar formatos:",
      error
    );


    return [];
  }
}


// ============================================================
// BARCODE DETECTOR
// ============================================================

async function criarDetector() {
  if (
    !possuiBarcodeDetector()
  ) {
    return {
      detector:
        null,

      formatos:
        [],
    };
  }


  try {
    const formatos =
      await obterFormatosSuportados();


    const detector =
      formatos.length > 0
        ? new window
            .BarcodeDetector({
              formats:
                formatos,
            })
        : new window
            .BarcodeDetector();


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
      detector:
        null,

      formatos:
        [],
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
      track
        ?.getSettings?.() ||
      {}
    );
  } catch {
    return {};
  }
}


function obterConstraintsTrack(
  track
) {
  try {
    return (
      track
        ?.getConstraints?.() ||
      {}
    );
  } catch {
    return {};
  }
}


// ============================================================
// STREAM
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
// CÂMERAS DISPONÍVEIS
// ============================================================

async function listarCamerasDisponiveis() {
  if (!possuiEnumeracaoCamera()) {
    return [];
  }

  try {
    const dispositivos =
      await navigator.mediaDevices.enumerateDevices();

    return dispositivos
      .filter(
        (device) =>
          device.kind === "videoinput"
      )
      .map((device, index) => ({
        deviceId:
          device.deviceId,

        groupId:
          device.groupId || null,

        label:
          device.label ||
          `Câmera ${index + 1}`,

        labelOriginal:
          device.label || "",

        indice:
          index,
      }));
  } catch (error) {
    console.warn(
      "[MobileScanner] Falha ao enumerar câmeras:",
      error
    );

    return [];
  }
}


// ============================================================
// SCORE DE CÂMERA
// ============================================================

function calcularScoreCamera(
  camera,
  deviceIdCameraInicial
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
        score +=
          20;
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
        score -=
          45;
      }
    }
  );


  if (
    deviceIdCameraInicial &&
    camera.deviceId ===
      deviceIdCameraInicial
  ) {
    score +=
      15;
  }


  return score;
}


// ============================================================
// CÂMERA PRINCIPAL
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

  const classificadas =
    cameras
      .map((camera) => ({
        ...camera,

        score:
          calcularScoreCamera(
            camera,
            deviceIdCameraInicial
          ),
      }))
      .sort(
        (a, b) =>
          b.score - a.score
      );

  return (
    classificadas[0] ||
    null
  );
}


// ============================================================
// GET USER MEDIA — BOOTSTRAP
// ============================================================

function obterConstraintsBootstrap() {
  return {
    audio:
      false,

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
// GET USER MEDIA — PRINCIPAL
// ============================================================

function obterConstraintsCameraPrincipal(
  deviceId
) {
  return {
    audio:
      false,

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


function obterConstraintsFallback(
  deviceId
) {
  return {
    audio:
      false,

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


async function abrirCameraSelecionada(
  deviceId
) {
  try {
    return await navigator
      .mediaDevices
      .getUserMedia(
        obterConstraintsCameraPrincipal(
          deviceId
        )
      );
  } catch (error) {
    console.warn(
      "[MobileScanner] Resolução preferencial recusada; tentando fallback.",
      error
    );


    return navigator
      .mediaDevices
      .getUserMedia(
        obterConstraintsFallback(
          deviceId
        )
      );
  }
}


// ============================================================
// PRESERVAR RESOLUÇÃO DURANTE AJUSTES
// ============================================================

function criarConstraintsPreservacao(
  track
) {
  const settings =
    obterSettingsTrack(
      track
    );


  const constraints =
    {};


  if (
    Number.isFinite(
      settings?.width
    )
  ) {
    constraints.width =
      settings.width;
  }


  if (
    Number.isFinite(
      settings?.height
    )
  ) {
    constraints.height =
      settings.height;
  }


  if (
    Number.isFinite(
      settings?.frameRate
    )
  ) {
    constraints.frameRate =
      settings.frameRate;
  }


  return constraints;
}


// ============================================================
// SUPORTE DE FOCUS MODE
// ============================================================

function suportaModoFoco(
  capabilities,
  modo
) {
  return Boolean(
    Array.isArray(
      capabilities?.focusMode
    ) &&
    capabilities
      .focusMode
      .includes(
        modo
      )
  );
}


// ============================================================
// APLICAR FOCO
// ============================================================

async function aplicarFoco({
  track,
  modo,
  usarPontoInteresse = true,
} = {}) {
  if (!track) {
    return {
      aplicado:
        false,

      confirmado:
        false,

      settings:
        {},
    };
  }


  const capabilities =
    obterCapabilitiesTrack(
      track
    );


  if (
    !suportaModoFoco(
      capabilities,
      modo
    )
  ) {
    return {
      aplicado:
        false,

      confirmado:
        false,

      settings:
        obterSettingsTrack(
          track
        ),
    };
  }


  const suportados =
    obterConstraintsSuportados();


  const advanced = {
    focusMode:
      modo,
  };


  /*
   * O ponto de interesse é centralizado exatamente onde
   * está o quadro de leitura / linha vermelha.
   */
  if (
    usarPontoInteresse &&
    suportados
      ?.pointsOfInterest ===
      true
  ) {
    advanced.pointsOfInterest =
      [
        PONTO_INTERESSE_CENTRAL,
      ];
  }


  const base =
    criarConstraintsPreservacao(
      track
    );


  try {
    await track.applyConstraints({
      ...base,

      advanced: [
        advanced,
      ],
    });
  } catch (error) {
    console.warn(
      `[MobileScanner] Não foi possível aplicar foco ${modo}:`,
      error
    );


    return {
      aplicado:
        false,

      confirmado:
        false,

      settings:
        obterSettingsTrack(
          track
        ),
    };
  }


  await esperar(
    80
  );


  const settings =
    obterSettingsTrack(
      track
    );


  return {
    aplicado:
      true,

    /*
     * Só tratamos como confirmado quando getSettings()
     * realmente informa o modo solicitado.
     */
    confirmado:
      settings
        ?.focusMode ===
      modo,

    settings,
  };
}


// ============================================================
// EXPOSIÇÃO / WHITE BALANCE
// ============================================================

async function configurarMedicaoAutomatica(
  track
) {
  if (!track) {
    return;
  }


  const capabilities =
    obterCapabilitiesTrack(
      track
    );


  const advanced =
    {};


  if (
    Array.isArray(
      capabilities
        ?.exposureMode
    ) &&
    capabilities
      .exposureMode
      .includes(
        "continuous"
      )
  ) {
    advanced.exposureMode =
      "continuous";
  }


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


  if (
    Object.keys(
      advanced
    ).length === 0
  ) {
    return;
  }


  try {
    await track.applyConstraints({
      ...criarConstraintsPreservacao(
        track
      ),

      advanced: [
        advanced,
      ],
    });
  } catch (error) {
    console.warn(
      "[MobileScanner] Ajustes automáticos de exposição não aplicados:",
      error
    );
  }
}


// ============================================================
// AUTOFOCUS INICIAL
//
// Estratégia:
// 1. single-shot no centro, quando disponível;
// 2. espera varredura;
// 3. continuous no centro, quando disponível.
// ============================================================

async function prepararAutofocus(
  track
) {
  if (!track) {
    return {
      focoContinuoAtivo:
        false,

      modoFinal:
        null,

      settings:
        {},
    };
  }


  const capabilities =
    obterCapabilitiesTrack(
      track
    );


  const possuiSingleShot =
    suportaModoFoco(
      capabilities,
      "single-shot"
    );


  const possuiContinuous =
    suportaModoFoco(
      capabilities,
      "continuous"
    );


  if (
    possuiSingleShot
  ) {
    await aplicarFoco({
      track,

      modo:
        "single-shot",

      usarPontoInteresse:
        true,
    });


    await esperar(
      TEMPO_SINGLE_SHOT_MS
    );
  }


  if (
    possuiContinuous
  ) {
    const resultado =
      await aplicarFoco({
        track,

        modo:
          "continuous",

        usarPontoInteresse:
          true,
      });


    return {
      focoContinuoAtivo:
        resultado.confirmado,

      modoFinal:
        resultado
          .settings
          ?.focusMode ||
        null,

      settings:
        resultado.settings,
    };
  }


  /*
   * Alguns aparelhos só expõem single-shot.
   * Nesse caso mantemos esse modo.
   */
  return {
    focoContinuoAtivo:
      false,

    modoFinal:
      obterSettingsTrack(
        track
      )?.focusMode ||
      (
        possuiSingleShot
          ? "single-shot"
          : null
      ),

    settings:
      obterSettingsTrack(
        track
      ),
  };
}


// ============================================================
// REFOCO AUTOMÁTICO
// ============================================================

async function executarRefoco(
  track
) {
  if (!track) {
    return;
  }


  const capabilities =
    obterCapabilitiesTrack(
      track
    );


  const possuiSingleShot =
    suportaModoFoco(
      capabilities,
      "single-shot"
    );


  const possuiContinuous =
    suportaModoFoco(
      capabilities,
      "continuous"
    );


  if (
    possuiSingleShot
  ) {
    await aplicarFoco({
      track,

      modo:
        "single-shot",

      usarPontoInteresse:
        true,
    });


    await esperar(
      TEMPO_SINGLE_SHOT_MS
    );
  }


  if (
    possuiContinuous
  ) {
    await aplicarFoco({
      track,

      modo:
        "continuous",

      usarPontoInteresse:
        true,
    });
  }
}


// ============================================================
// ÁREA DE LEITURA
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
          (a
            ?.boundingBox
            ?.width ||
            0) *
          (a
            ?.boundingBox
            ?.height ||
            0);


        const areaB =
          (b
            ?.boundingBox
            ?.width ||
            0) *
          (b
            ?.boundingBox
            ?.height ||
            0);


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

  const trackRef =
    useRef(null);

  const detectorRef =
    useRef(null);

  const timerRef =
    useRef(null);

  const timerEstabilizacaoRef =
    useRef(null);

  const processandoRef =
    useRef(false);

  const refocandoRef =
    useRef(false);

  const cameraAtivaRef =
    useRef(false);

  const ativoRef =
    useRef(ativo);

  const liberadoParaDetectarRef =
    useRef(false);


  const ultimoCodigoRef =
    useRef({
      codigo:
        null,

      registradoEm:
        0,
    });


  const candidatoRef =
    useRef({
      codigo:
        null,

      formato:
        null,

      quantidade:
        0,
    });


  /*
   * Último momento em que o detector conseguiu pelo menos
   * encontrar um código.
   */
  const ultimaDeteccaoVisualRef =
    useRef(
      Date.now()
    );


  const ultimoRefocoEmRef =
    useRef(0);


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


      setLendo(
        false
      );
    }, []);


  // ==========================================================
  // PARAR CÂMERA
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
        timerEstabilizacaoRef.current
      ) {
        window.clearTimeout(
          timerEstabilizacaoRef.current
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
        videoRef.current.srcObject =
          null;
      }


      trackRef.current =
        null;

      detectorRef.current =
        null;

      processandoRef.current =
        false;

      refocandoRef.current =
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
  // REFOCO AUTOMÁTICO CONTROLADO
  // ==========================================================

  const tentarRefocoAutomatico =
    useCallback(
      async () => {
        const track =
          trackRef.current;


        if (
          !track ||
          refocandoRef.current
        ) {
          return;
        }


        const agora =
          Date.now();


        const semLeituraHa =
          agora -
          ultimaDeteccaoVisualRef.current;


        const desdeUltimoRefoco =
          agora -
          ultimoRefocoEmRef.current;


        if (
          semLeituraHa <
            TEMPO_SEM_LEITURA_PARA_REFOCO_MS ||
          desdeUltimoRefoco <
            INTERVALO_MINIMO_REFOCO_MS
        ) {
          return;
        }


        refocandoRef.current =
          true;


        ultimoRefocoEmRef.current =
          agora;


        try {
          await executarRefoco(
            track
          );


          const settings =
            obterSettingsTrack(
              track
            );


          setFocoContinuoAtivo(
            settings
              ?.focusMode ===
              "continuous"
          );
        } catch (error) {
          console.warn(
            "[MobileScanner] Refoco automático falhou:",
            error
          );
        } finally {
          refocandoRef.current =
            false;
        }
      },
      []
    );


  // ==========================================================
  // ESTABILIZAÇÃO
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


        setLendo(
          true
        );


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


        ultimaDeteccaoVisualRef.current =
          agora;


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
  // LOOP
  // ==========================================================

  const detectarFrame =
    useCallback(
      async () => {
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


            /*
             * Nenhum código foi reconhecido.
             * Pode ser falta de foco.
             */
            void tentarRefocoAutomatico();
          } else {
            ultimaDeteccaoVisualRef.current =
              Date.now();


            const centralizado =
              resultadoEstaNaAreaCentral(
                melhor,
                video
              );


            if (
              !centralizado
            ) {
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
      },
      [
        emitirDeteccao,
        registrarCandidato,
        resetarCandidato,
        tentarRefocoAutomatico,
        videoRef,
      ]
    );


  // ==========================================================
  // DESCOBRIR CÂMERA PRINCIPAL
  // ==========================================================

  const descobrirCameraPrincipal =
    useCallback(
      async () => {
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
          // 1. DESCOBRIR CÂMERA
          // --------------------------------------------------

          const descoberta =
            await descobrirCameraPrincipal();


          const principal =
            descoberta.principal;


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


          trackRef.current =
            track;


          setCameraLabel(
            track.label ||
            principal?.label ||
            null
          );


          // --------------------------------------------------
          // 3. VIDEO PRIMEIRO
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


          /*
           * Deixa a câmera começar a produzir frames antes
           * de solicitar a primeira varredura de foco.
           */
          await esperar(
            250
          );


          // --------------------------------------------------
          // 4. EXPOSIÇÃO AUTOMÁTICA
          // --------------------------------------------------

          await configurarMedicaoAutomatica(
            track
          );


          // --------------------------------------------------
          // 5. AUTOFOCUS INICIAL
          // --------------------------------------------------

          const autofocus =
            await prepararAutofocus(
              track
            );


          setFocoContinuoAtivo(
            autofocus
              .focoContinuoAtivo
          );


          // --------------------------------------------------
          // 6. SETTINGS REAIS
          // --------------------------------------------------

          const settingsDepois =
            obterSettingsTrack(
              track
            );


          const capabilities =
            obterCapabilitiesTrack(
              track
            );


          const constraints =
            obterConstraintsTrack(
              track
            );


          setResolucaoAtual({
            width:
              settingsDepois
                ?.width ||
              null,

            height:
              settingsDepois
                ?.height ||
              null,

            frameRate:
              settingsDepois
                ?.frameRate ||
              null,
          });


          // --------------------------------------------------
          // 7. DIAGNÓSTICO
          // --------------------------------------------------

          const diagnostico = {
            cameraSelecionada: {
              deviceId:
                settingsDepois
                  ?.deviceId ||
                principal
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
              descoberta
                .cameras,

            bootstrapSettings:
              descoberta
                .bootstrapSettings,

            capabilities,

            constraints,

            settingsDepois,

            autofocus: {
              focusModeSuportados:
                capabilities
                  ?.focusMode ||
                [],

              focusModeAtual:
                settingsDepois
                  ?.focusMode ||
                null,

              pointsOfInterest:
                settingsDepois
                  ?.pointsOfInterest ||
                null,

              focusDistance:
                settingsDepois
                  ?.focusDistance ??
                null,

              focoContinuoConfirmado:
                settingsDepois
                  ?.focusMode ===
                  "continuous",
            },
          };


          setDiagnosticoCamera(
            diagnostico
          );


          console.info(
            "[MobileScanner] Diagnóstico completo:",
            diagnostico
          );


          // --------------------------------------------------
          // 8. DETECTOR
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
          // 9. ATIVAR
          // --------------------------------------------------

          cameraAtivaRef.current =
            true;


          setCameraAtiva(
            true
          );


          ultimaDeteccaoVisualRef.current =
            Date.now();


          ultimoRefocoEmRef.current =
            Date.now();


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

    /*
     * Compatibilidade com versões anteriores.
     * Zoom automático continua desativado.
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