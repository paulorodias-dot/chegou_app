import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

// ============================================================
// SISTEMA CHEGOU! — MOBILE SCANNER
// Release funcional: 2026.08.11.005
//
// Estratégia:
// - câmera traseira principal por deviceId;
// - stream de alta resolução sem zoom digital obrigatório;
// - autofocus inicial + contínuo quando suportado;
// - refoco automático;
// - leitura contínua via BarcodeDetector;
// - fast path via vídeo ao vivo;
// - snapshot invisível via ImageCapture.grabFrame();
// - recorte central + contraste local sem persistir imagem;
// - hard fallback via ImageCapture.takePhoto() somente quando necessário;
// - câmera permanece aberta após cada leitura.
// ============================================================

const INTERVALO_DETECCAO_MS = 70;
const TEMPO_BLOQUEIO_MESMO_CODIGO_MS = 1800;
const DETECCOES_CONSECUTIVAS_NECESSARIAS = 2;
const TEMPO_ESTABILIZACAO_CAMERA_MS = 700;
const TEMPO_SINGLE_SHOT_MS = 380;
const TEMPO_SEM_LEITURA_PARA_REFOCO_MS = 1300;
const INTERVALO_MINIMO_REFOCO_MS = 1500;
const TEMPO_SEM_LEITURA_PARA_SNAPSHOT_MS = 120;
const INTERVALO_MINIMO_SNAPSHOT_MS = 160;
const TEMPO_SEM_LEITURA_PARA_FOTO_MS = 700;
const INTERVALO_MINIMO_FOTO_MS = 1200;
const CONTRASTE_REFORCADO = 1.55;
const MAX_LARGURA_PROCESSAMENTO = 1800;

const RESOLUCAO_PREFERENCIAL = Object.freeze({
  widthIdeal: 2560,
  heightIdeal: 1440,
  widthMin: 1280,
  heightMin: 720,
  frameRateIdeal: 30,
  frameRateMax: 60,
});

const AREA_LEITURA = Object.freeze({
  xMin: 0.06,
  xMax: 0.94,
  yMin: 0.2,
  yMax: 0.8,
});

const PONTO_INTERESSE_CENTRAL = Object.freeze({
  x: 0.5,
  y: 0.5,
});

const FORMATOS_DESEJADOS = Object.freeze([
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

const CAMERA_LABEL_POSITIVOS = Object.freeze([
  "back",
  "rear",
  "environment",
  "main",
  "principal",
  "wide",
  "1x",
]);

const CAMERA_LABEL_NEGATIVOS = Object.freeze([
  "front",
  "user",
  "selfie",
  "ultra wide",
  "ultrawide",
  "ultra-wide",
  "0.5x",
  "0,5x",
  "telephoto",
  "tele",
  "depth",
  "tof",
]);

function esperar(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function possuiSuporteCamera() {
  return Boolean(
    typeof navigator !== "undefined" &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

function possuiEnumeracaoCamera() {
  return Boolean(
    typeof navigator !== "undefined" &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.enumerateDevices === "function"
  );
}

function possuiBarcodeDetector() {
  return Boolean(
    typeof window !== "undefined" &&
      "BarcodeDetector" in window
  );
}

function possuiImageCapture() {
  return Boolean(
    typeof window !== "undefined" &&
      "ImageCapture" in window
  );
}

function obterConstraintsSuportados() {
  try {
    return (
      navigator?.mediaDevices?.getSupportedConstraints?.() ||
      {}
    );
  } catch {
    return {};
  }
}

async function obterFormatosSuportados() {
  if (!possuiBarcodeDetector()) {
    return [];
  }

  try {
    if (
      typeof window.BarcodeDetector.getSupportedFormats !==
      "function"
    ) {
      return [...FORMATOS_DESEJADOS];
    }

    const suportados =
      await window.BarcodeDetector.getSupportedFormats();

    return FORMATOS_DESEJADOS.filter((formato) =>
      suportados.includes(formato)
    );
  } catch (error) {
    console.warn(
      "[MobileScanner] Falha ao consultar formatos:",
      error
    );

    return [];
  }
}

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

function obterCapabilitiesTrack(track) {
  try {
    return (
      track?.getCapabilities?.() ||
      {}
    );
  } catch {
    return {};
  }
}

function obterSettingsTrack(track) {
  try {
    return (
      track?.getSettings?.() ||
      {}
    );
  } catch {
    return {};
  }
}

function obterConstraintsTrack(track) {
  try {
    return (
      track?.getConstraints?.() ||
      {}
    );
  } catch {
    return {};
  }
}

function encerrarStream(stream) {
  stream?.getTracks?.().forEach(
    (track) => track.stop()
  );
}

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
      }));
  } catch (error) {
    console.warn(
      "[MobileScanner] Falha ao enumerar câmeras:",
      error
    );

    return [];
  }
}

function calcularScoreCamera(
  camera,
  deviceIdCameraInicial
) {
  const label =
    normalizarTexto(
      camera?.labelOriginal ||
        camera?.label
    );

  let score = 0;

  CAMERA_LABEL_POSITIVOS.forEach(
    (termo) => {
      if (
        label.includes(
          normalizarTexto(termo)
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
          normalizarTexto(termo)
        )
      ) {
        score -= 45;
      }
    }
  );

  if (
    deviceIdCameraInicial &&
    camera.deviceId ===
      deviceIdCameraInicial
  ) {
    score += 15;
  }

  return score;
}

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

  return (
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
      )[0] || null
  );
}

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
      "[MobileScanner] Resolução preferencial recusada; tentando fallback:",
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

function criarConstraintsPreservacao(
  track
) {
  const settings =
    obterSettingsTrack(track);

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

function suportaModoFoco(
  capabilities,
  modo
) {
  return Boolean(
    Array.isArray(
      capabilities?.focusMode
    ) &&
      capabilities.focusMode.includes(
        modo
      )
  );
}

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
    obterCapabilitiesTrack(track);

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
        obterSettingsTrack(track),
    };
  }

  const suportados =
    obterConstraintsSuportados();

  const advanced = {
    focusMode:
      modo,
  };

  if (
    usarPontoInteresse &&
    suportados?.pointsOfInterest ===
      true
  ) {
    advanced.pointsOfInterest = [
      PONTO_INTERESSE_CENTRAL,
    ];
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
      `[MobileScanner] Não foi possível aplicar foco ${modo}:`,
      error
    );

    return {
      aplicado:
        false,

      confirmado:
        false,

      settings:
        obterSettingsTrack(track),
    };
  }

  await esperar(80);

  const settings =
    obterSettingsTrack(track);

  return {
    aplicado:
      true,

    confirmado:
      settings?.focusMode ===
      modo,

    settings,
  };
}

async function configurarMedicaoAutomatica(
  track
) {
  if (!track) {
    return;
  }

  const capabilities =
    obterCapabilitiesTrack(track);

  const advanced =
    {};

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
      "[MobileScanner] Medição automática não aplicada:",
      error
    );
  }
}

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
    obterCapabilitiesTrack(track);

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

  if (possuiSingleShot) {
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

  if (possuiContinuous) {
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
        resultado.settings
          ?.focusMode ||
        null,

      settings:
        resultado.settings,
    };
  }

  return {
    focoContinuoAtivo:
      false,

    modoFinal:
      obterSettingsTrack(track)
        ?.focusMode ||
      (possuiSingleShot
        ? "single-shot"
        : null),

    settings:
      obterSettingsTrack(track),
  };
}

async function executarRefoco(
  track
) {
  if (!track) {
    return;
  }

  const capabilities =
    obterCapabilitiesTrack(track);

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

  if (possuiSingleShot) {
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

  if (possuiContinuous) {
    await aplicarFoco({
      track,

      modo:
        "continuous",

      usarPontoInteresse:
        true,
    });
  }
}

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
    .sort((a, b) => {
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
    })[0];
}

function criarCanvasReforcado(
  bitmap
) {
  if (
    !bitmap?.width ||
    !bitmap?.height
  ) {
    return null;
  }

  const cropX =
    Math.round(
      bitmap.width *
        0.04
    );

  const cropY =
    Math.round(
      bitmap.height *
        0.18
    );

  const cropWidth =
    Math.round(
      bitmap.width *
        0.92
    );

  const cropHeight =
    Math.round(
      bitmap.height *
        0.64
    );

  const escala =
    Math.min(
      1.5,
      MAX_LARGURA_PROCESSAMENTO /
        cropWidth
    );

  const destinoWidth =
    Math.max(
      1,
      Math.round(
        cropWidth *
          escala
      )
    );

  const destinoHeight =
    Math.max(
      1,
      Math.round(
        cropHeight *
          escala
      )
    );

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width =
    destinoWidth;

  canvas.height =
    destinoHeight;

  const context =
    canvas.getContext(
      "2d",
      {
        willReadFrequently:
          true,

        alpha:
          false,
      }
    );

  if (!context) {
    return null;
  }

  context.imageSmoothingEnabled =
    true;

  context.imageSmoothingQuality =
    "high";

  context.drawImage(
    bitmap,

    cropX,
    cropY,
    cropWidth,
    cropHeight,

    0,
    0,
    destinoWidth,
    destinoHeight
  );

  const imageData =
    context.getImageData(
      0,
      0,
      destinoWidth,
      destinoHeight
    );

  const data =
    imageData.data;

  const contraste =
    CONTRASTE_REFORCADO;

  for (
    let index = 0;
    index < data.length;
    index += 4
  ) {
    const r =
      data[index];

    const g =
      data[index + 1];

    const b =
      data[index + 2];

    const cinza =
      0.299 * r +
      0.587 * g +
      0.114 * b;

    const ajustado =
      Math.max(
        0,
        Math.min(
          255,
          (cinza - 128) *
            contraste +
            128
        )
      );

    data[index] =
      ajustado;

    data[index + 1] =
      ajustado;

    data[index + 2] =
      ajustado;
  }

  context.putImageData(
    imageData,
    0,
    0
  );

  return canvas;
}

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
    leituraReforcadaAtiva,
    setLeituraReforcadaAtiva,
  ] = useState(false);

  const [
    diagnosticoCamera,
    setDiagnosticoCamera,
  ] = useState(null);

  const streamRef =
    useRef(null);

  const trackRef =
    useRef(null);

  const imageCaptureRef =
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

  const reforcandoRef =
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

  const ultimaDeteccaoVisualRef =
    useRef(
      Date.now()
    );

  const ultimoRefocoEmRef =
    useRef(0);

  const ultimoSnapshotEmRef =
    useRef(0);

  const ultimaFotoEmRef =
    useRef(0);

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

      imageCaptureRef.current =
        null;

      detectorRef.current =
        null;

      processandoRef.current =
        false;

      refocandoRef.current =
        false;

      reforcandoRef.current =
        false;

      cameraAtivaRef.current =
        false;

      resetarCandidato();

      setLeituraReforcadaAtiva(
        false
      );

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

  const emitirDeteccao =
    useCallback(
      (resultado) => {
        const codigo =
          String(
            resultado?.rawValue ||
              ""
          ).trim();

        if (!codigo) {
          return false;
        }

        const agora =
          Date.now();

        const ultimo =
          ultimoCodigoRef.current;

        if (
          ultimo.codigo ===
            codigo &&
          agora -
            ultimo.registradoEm <
            TEMPO_BLOQUEIO_MESMO_CODIGO_MS
        ) {
          resetarCandidato();

          return false;
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
              resultado?.format ||
              null,

            boundingBox:
              resultado
                ?.boundingBox ||
              null,

            cornerPoints:
              resultado
                ?.cornerPoints ||
              null,

            detectadoEm:
              new Date()
                .toISOString(),
          });
        }

        return true;
      },
      [
        onDetected,
        resetarCandidato,
      ]
    );

  const tentarRefocoAutomatico =
    useCallback(async () => {
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
          settings?.focusMode ===
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
    }, []);

  const tentarLeituraReforcada =
    useCallback(async () => {
      const detector =
        detectorRef.current;

      const imageCapture =
        imageCaptureRef.current;

      if (
        !detector ||
        !imageCapture ||
        reforcandoRef.current ||
        !ativoRef.current ||
        !cameraAtivaRef.current
      ) {
        return false;
      }

      const agora =
        performance.now();

      const semLeituraHa =
        Date.now() -
        ultimaDeteccaoVisualRef.current;

      const desdeUltimoSnapshot =
        agora -
        ultimoSnapshotEmRef.current;

      if (
        semLeituraHa <
          TEMPO_SEM_LEITURA_PARA_SNAPSHOT_MS ||
        desdeUltimoSnapshot <
          INTERVALO_MINIMO_SNAPSHOT_MS
      ) {
        return false;
      }

      reforcandoRef.current =
        true;

      ultimoSnapshotEmRef.current =
        agora;

      let bitmap =
        null;

      try {
        // ------------------------------------------------------
        // NÍVEL 2 — SNAPSHOT INVISÍVEL / FAST PATH
        // ------------------------------------------------------

        if (
          typeof imageCapture.grabFrame ===
          "function"
        ) {
          try {
            bitmap =
              await imageCapture.grabFrame();

            const resultadosFrame =
              await detector.detect(
                bitmap
              );

            const frame =
              (
                resultadosFrame ||
                []
              ).find(
                (resultado) =>
                  resultado?.rawValue
              );

            if (frame) {
              ultimaDeteccaoVisualRef.current =
                Date.now();

              return emitirDeteccao(
                frame
              );
            }

            // --------------------------------------------------
            // NÍVEL 3 — SNAPSHOT + RECORTE + CONTRASTE
            // --------------------------------------------------

            const canvas =
              criarCanvasReforcado(
                bitmap
              );

            if (canvas) {
              const resultadosReforcados =
                await detector.detect(
                  canvas
                );

              const reforcado =
                (
                  resultadosReforcados ||
                  []
                ).find(
                  (resultado) =>
                    resultado?.rawValue
                );

              if (reforcado) {
                ultimaDeteccaoVisualRef.current =
                  Date.now();

                return emitirDeteccao(
                  reforcado
                );
              }
            }
          } catch (error) {
            console.warn(
              "[MobileScanner] Snapshot rápido indisponível:",
              error
            );
          }
        }

        // ------------------------------------------------------
        // NÍVEL 4 — FOTO HIGH-RES / HARD PATH
        // ------------------------------------------------------

        const agoraFoto =
          performance.now();

        const desdeUltimaFoto =
          agoraFoto -
          ultimaFotoEmRef.current;

        const semLeituraParaFoto =
          Date.now() -
          ultimaDeteccaoVisualRef.current;

        if (
          semLeituraParaFoto <
            TEMPO_SEM_LEITURA_PARA_FOTO_MS ||
          desdeUltimaFoto <
            INTERVALO_MINIMO_FOTO_MS ||
          typeof imageCapture.takePhoto !==
            "function"
        ) {
          return false;
        }

        ultimaFotoEmRef.current =
          agoraFoto;

        setLeituraReforcadaAtiva(
          true
        );

        let blob =
          null;

        let fotoBitmap =
          null;

        try {
          blob =
            await imageCapture.takePhoto();

          const resultadosFoto =
            await detector.detect(
              blob
            );

          const foto =
            (
              resultadosFoto ||
              []
            ).find(
              (resultado) =>
                resultado?.rawValue
            );

          if (foto) {
            ultimaDeteccaoVisualRef.current =
              Date.now();

            return emitirDeteccao(
              foto
            );
          }

          fotoBitmap =
            await createImageBitmap(
              blob
            );

          const canvasFoto =
            criarCanvasReforcado(
              fotoBitmap
            );

          if (canvasFoto) {
            const resultadosFotoReforcada =
              await detector.detect(
                canvasFoto
              );

            const fotoReforcada =
              (
                resultadosFotoReforcada ||
                []
              ).find(
                (resultado) =>
                  resultado?.rawValue
              );

            if (fotoReforcada) {
              ultimaDeteccaoVisualRef.current =
                Date.now();

              return emitirDeteccao(
                fotoReforcada
              );
            }
          }
        } finally {
          if (
            fotoBitmap &&
            typeof fotoBitmap.close ===
              "function"
          ) {
            try {
              fotoBitmap.close();
            } catch {
              // Sem impacto operacional.
            }
          }
        }

        return false;
      } catch (error) {
        console.warn(
          "[MobileScanner] Leitura multicamada falhou:",
          error
        );

        return false;
      } finally {
        if (
          bitmap &&
          typeof bitmap.close ===
            "function"
        ) {
          try {
            bitmap.close();
          } catch {
            // Sem impacto operacional.
          }
        }

        reforcandoRef.current =
          false;

        setLeituraReforcadaAtiva(
          false
        );
      }
    }, [
      emitirDeteccao,
    ]);

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

          void tentarRefocoAutomatico();

          void tentarLeituraReforcada();
        } else {
          ultimaDeteccaoVisualRef.current =
            Date.now();

          if (
            resultadoEstaNaAreaCentral(
              melhor,
              video
            )
          ) {
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
          } else {
            resetarCandidato();
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
      tentarLeituraReforcada,
      tentarRefocoAutomatico,
      videoRef,
    ]);

  const descobrirCameraPrincipal =
    useCallback(async () => {
      const bootstrapStream =
        await navigator.mediaDevices
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
        bootstrapSettings?.deviceId ||
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
    }, []);

  const iniciarCamera =
    useCallback(async () => {
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
        const descoberta =
          await descobrirCameraPrincipal();

        const principal =
          descoberta.principal;

        setCameraPrincipal(
          principal
        );

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

        try {
          if (
            "contentHint" in track
          ) {
            track.contentHint =
              "text";
          }
        } catch {
          // Hint opcional.
        }

        setCameraLabel(
          track.label ||
            principal?.label ||
            null
        );

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

        await esperar(
          220
        );

        await configurarMedicaoAutomatica(
          track
        );

        const autofocus =
          await prepararAutofocus(
            track
          );

        setFocoContinuoAtivo(
          autofocus
            .focoContinuoAtivo
        );

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
            settingsDepois?.width ||
            null,

          height:
            settingsDepois?.height ||
            null,

          frameRate:
            settingsDepois?.frameRate ||
            null,
        });

        if (
          possuiImageCapture()
        ) {
          try {
            imageCaptureRef.current =
              new window.ImageCapture(
                track
              );
          } catch (error) {
            console.warn(
              "[MobileScanner] ImageCapture indisponível:",
              error
            );

            imageCaptureRef.current =
              null;
          }
        }

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
              principal?.score ??
              null,
          },

          camerasEnumeradas:
            descoberta.cameras,

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

            focusDistance:
              settingsDepois
                ?.focusDistance ??
              null,

            focoContinuoConfirmado:
              settingsDepois
                ?.focusMode ===
              "continuous",
          },

          imageCaptureDisponivel:
            Boolean(
              imageCaptureRef.current
            ),

          contentHint:
            track.contentHint ||
            null,
        };

        setDiagnosticoCamera(
          diagnostico
        );

        console.info(
          "[MobileScanner] Diagnóstico completo:",
          diagnostico
        );

        cameraAtivaRef.current =
          true;

        setCameraAtiva(
          true
        );

        ultimaDeteccaoVisualRef.current =
          Date.now();

        ultimoRefocoEmRef.current =
          Date.now();

        ultimoSnapshotEmRef.current =
          0;

        ultimaFotoEmRef.current =
          0;

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
    }, [
      descobrirCameraPrincipal,
      detectarFrame,
      pararCamera,
      videoRef,
    ]);

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

  return {
    cameraAtiva,

    iniciando,

    erroCamera,

    detectorDisponivel,

    formatosSuportados,

    focoContinuoAtivo,

    zoomAtual:
      null,

    cameraLabel,

    cameraPrincipal,

    camerasDisponiveis,

    resolucaoAtual,

    lendo,

    leituraReforcadaAtiva,

    diagnosticoCamera,

    iniciarCamera,

    pararCamera,

    possuiSuporteCamera:
      possuiSuporteCamera(),

    possuiDetectorNativo:
      possuiBarcodeDetector(),

    possuiImageCapture:
      possuiImageCapture(),
  };
}