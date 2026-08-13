import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

// ============================================================
// SISTEMA CHEGOU! — MOBILE SCANNER
// Release funcional: 2026.08.12.002
// ============================================================

const INTERVALO_DETECCAO_MS = 70;
const DETECCOES_CONSECUTIVAS_NECESSARIAS = 2;
const TEMPO_ESTABILIZACAO_CAMERA_MS = 700;

const COOLDOWN_CAPTURA_CAMERA_MS = 4000;
const INTERVALO_ATUALIZACAO_COOLDOWN_MS = 200;
const INTERVALO_AVISO_DUPLICADO_MS = 1800;

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

function possuiImageCaptureApi() {
  return Boolean(
    typeof window !== "undefined" &&
      "ImageCapture" in window
  );
}

function obterConstraintsSuportados() {
  try {
    return (
      navigator?.mediaDevices?.getSupportedConstraints?.() || {}
    );
  } catch {
    return {};
  }
}

function obterCapabilitiesTrack(track) {
  try {
    return track?.getCapabilities?.() || {};
  } catch {
    return {};
  }
}

function obterSettingsTrack(track) {
  try {
    return track?.getSettings?.() || {};
  } catch {
    return {};
  }
}

function obterConstraintsTrack(track) {
  try {
    return track?.getConstraints?.() || {};
  } catch {
    return {};
  }
}

function encerrarStream(stream) {
  stream?.getTracks?.().forEach((track) => track.stop());
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
    const formatos = await obterFormatosSuportados();

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

async function listarCamerasDisponiveis() {
  if (!possuiEnumeracaoCamera()) {
    return [];
  }

  try {
    const dispositivos =
      await navigator.mediaDevices.enumerateDevices();

    return dispositivos
      .filter(
        (device) => device.kind === "videoinput"
      )
      .map((device, index) => ({
        deviceId: device.deviceId,
        groupId: device.groupId || null,
        label:
          device.label || `Câmera ${index + 1}`,
        labelOriginal: device.label || "",
        indice: index,
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
  const label = normalizarTexto(
    camera?.labelOriginal || camera?.label
  );

  let score = 0;

  CAMERA_LABEL_POSITIVOS.forEach((termo) => {
    if (
      label.includes(normalizarTexto(termo))
    ) {
      score += 20;
    }
  });

  CAMERA_LABEL_NEGATIVOS.forEach((termo) => {
    if (
      label.includes(normalizarTexto(termo))
    ) {
      score -= 45;
    }
  });

  if (
    deviceIdCameraInicial &&
    camera.deviceId === deviceIdCameraInicial
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
        score: calcularScoreCamera(
          camera,
          deviceIdCameraInicial
        ),
      }))
      .sort((a, b) => b.score - a.score)[0] ||
    null
  );
}

function obterConstraintsBootstrap() {
  return {
    audio: false,
    video: {
      facingMode: {
        ideal: "environment",
      },
      width: {
        ideal: 1920,
      },
      height: {
        ideal: 1080,
      },
      frameRate: {
        ideal: 30,
      },
    },
  };
}

function obterConstraintsCameraPrincipal(
  deviceId
) {
  return {
    audio: false,

    video: {
      ...(deviceId
        ? {
            deviceId: {
              exact: deviceId,
            },
          }
        : {
            facingMode: {
              ideal: "environment",
            },
          }),

      width: {
        min:
          RESOLUCAO_PREFERENCIAL.widthMin,

        ideal:
          RESOLUCAO_PREFERENCIAL.widthIdeal,
      },

      height: {
        min:
          RESOLUCAO_PREFERENCIAL.heightMin,

        ideal:
          RESOLUCAO_PREFERENCIAL.heightIdeal,
      },

      frameRate: {
        ideal:
          RESOLUCAO_PREFERENCIAL.frameRateIdeal,

        max:
          RESOLUCAO_PREFERENCIAL.frameRateMax,
      },
    },
  };
}

function obterConstraintsFallback(deviceId) {
  return {
    audio: false,

    video: {
      ...(deviceId
        ? {
            deviceId: {
              exact: deviceId,
            },
          }
        : {
            facingMode: {
              ideal: "environment",
            },
          }),

      width: {
        ideal: 1920,
      },

      height: {
        ideal: 1080,
      },

      frameRate: {
        ideal: 30,
      },
    },
  };
}

async function abrirCameraSelecionada(
  deviceId
) {
  try {
    return await navigator.mediaDevices.getUserMedia(
      obterConstraintsCameraPrincipal(
        deviceId
      )
    );
  } catch (error) {
    console.warn(
      "[MobileScanner] Resolução preferencial recusada; tentando fallback:",
      error
    );

    return navigator.mediaDevices.getUserMedia(
      obterConstraintsFallback(deviceId)
    );
  }
}

function criarConstraintsPreservacao(track) {
  const settings =
    obterSettingsTrack(track);

  const constraints = {};

  if (
    Number.isFinite(settings?.width)
  ) {
    constraints.width =
      settings.width;
  }

  if (
    Number.isFinite(settings?.height)
  ) {
    constraints.height =
      settings.height;
  }

  if (
    Number.isFinite(settings?.frameRate)
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
      aplicado: false,
      confirmado: false,
      settings: {},
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
      aplicado: false,
      confirmado: false,
      settings:
        obterSettingsTrack(track),
    };
  }

  const suportados =
    obterConstraintsSuportados();

  const advanced = {
    focusMode: modo,
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

      advanced: [advanced],
    });
  } catch (error) {
    console.warn(
      `[MobileScanner] Não foi possível aplicar foco ${modo}:`,
      error
    );

    return {
      aplicado: false,
      confirmado: false,
      settings:
        obterSettingsTrack(track),
    };
  }

  await esperar(80);

  const settings =
    obterSettingsTrack(track);

  return {
    aplicado: true,

    confirmado:
      settings?.focusMode === modo,

    settings,
  };
}

function limitarNaFaixa(
  valor,
  capacidade
) {
  if (
    !capacidade ||
    typeof capacidade.min !==
      "number" ||
    typeof capacidade.max !==
      "number" ||
    typeof valor !== "number"
  ) {
    return null;
  }

  return Math.max(
    capacidade.min,
    Math.min(
      capacidade.max,
      valor
    )
  );
}

function obterValorAtual(
  settings,
  propriedade,
  capacidade
) {
  const atual =
    settings?.[propriedade];

  if (
    typeof atual === "number"
  ) {
    return atual;
  }

  if (
    typeof capacidade?.min ===
      "number" &&
    typeof capacidade?.max ===
      "number"
  ) {
    return (
      (capacidade.min +
        capacidade.max) /
      2
    );
  }

  return null;
}

async function configurarMedicaoAutomatica(
  track
) {
  if (!track) {
    return;
  }

  const capabilities =
    obterCapabilitiesTrack(track);

  const settings =
    obterSettingsTrack(track);

  const advanced = {};

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
    capabilities?.exposureCompensation
  ) {
    const atual = obterValorAtual(
      settings,
      "exposureCompensation",
      capabilities.exposureCompensation
    );

    const desejado =
      limitarNaFaixa(
        typeof atual === "number"
          ? atual - 0.25
          : 0,
        capabilities.exposureCompensation
      );

    if (
      typeof desejado === "number"
    ) {
      advanced.exposureCompensation =
        desejado;
    }
  }

  if (
    capabilities?.contrast
  ) {
    const atual = obterValorAtual(
      settings,
      "contrast",
      capabilities.contrast
    );

    const incremento =
      typeof capabilities.contrast
        ?.step === "number"
        ? capabilities.contrast.step *
          2
        : 0.1;

    const desejado =
      limitarNaFaixa(
        typeof atual === "number"
          ? atual + incremento
          : atual,
        capabilities.contrast
      );

    if (
      typeof desejado === "number"
    ) {
      advanced.contrast =
        desejado;
    }
  }

  if (
    capabilities?.sharpness
  ) {
    const atual = obterValorAtual(
      settings,
      "sharpness",
      capabilities.sharpness
    );

    const incremento =
      typeof capabilities.sharpness
        ?.step === "number"
        ? capabilities.sharpness.step *
          2
        : 0.1;

    const desejado =
      limitarNaFaixa(
        typeof atual === "number"
          ? atual + incremento
          : atual,
        capabilities.sharpness
      );

    if (
      typeof desejado === "number"
    ) {
      advanced.sharpness =
        desejado;
    }
  }

  if (
    Object.keys(advanced).length ===
    0
  ) {
    return;
  }

  try {
    await track.applyConstraints({
      ...criarConstraintsPreservacao(
        track
      ),

      advanced: [advanced],
    });
  } catch (error) {
    console.warn(
      "[MobileScanner] Ajustes ópticos adicionais não foram aplicados:",
      error
    );
  }
}

async function prepararAutofocus(track) {
  const capabilities =
    obterCapabilitiesTrack(track);

  if (
    suportaModoFoco(
      capabilities,
      "continuous"
    )
  ) {
    const resultado =
      await aplicarFoco({
        track,
        modo: "continuous",
      });

    return Boolean(
      resultado.aplicado
    );
  }

  if (
    suportaModoFoco(
      capabilities,
      "single-shot"
    )
  ) {
    await aplicarFoco({
      track,
      modo: "single-shot",
    });

    await esperar(
      TEMPO_SINGLE_SHOT_MS
    );

    return false;
  }

  return false;
}

function obterCentroBoundingBox(
  resultado
) {
  const box =
    resultado?.boundingBox;

  if (!box) {
    return null;
  }

  return {
    x:
      Number(box.x || 0) +
      Number(box.width || 0) / 2,

    y:
      Number(box.y || 0) +
      Number(box.height || 0) / 2,
  };
}

function resultadoEstaNaAreaCentral(
  resultado,
  video
) {
  const centro =
    obterCentroBoundingBox(resultado);

  if (!centro) {
    return true;
  }

  const largura =
    Number(video?.videoWidth || 0);

  const altura =
    Number(video?.videoHeight || 0);

  if (
    largura <= 0 ||
    altura <= 0
  ) {
    return true;
  }

  const x =
    centro.x / largura;

  const y =
    centro.y / altura;

  return (
    x >= AREA_LEITURA.xMin &&
    x <= AREA_LEITURA.xMax &&
    y >= AREA_LEITURA.yMin &&
    y <= AREA_LEITURA.yMax
  );
}

function escolherMelhorResultado(
  resultados,
  video
) {
  if (
    !Array.isArray(resultados) ||
    resultados.length === 0
  ) {
    return null;
  }

  const validos =
    resultados.filter(
      (resultado) =>
        resultado?.rawValue
    );

  if (
    validos.length === 0
  ) {
    return null;
  }

  const centrais =
    validos.filter((resultado) =>
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
    .map((resultado) => {
      const box =
        resultado?.boundingBox;

      const area =
        Number(box?.width || 0) *
        Number(box?.height || 0);

      return {
        resultado,
        area,
      };
    })
    .sort(
      (a, b) =>
        b.area - a.area
    )[0]?.resultado;
}

function obterRegiaoCentral(
  largura,
  altura
) {
  const x =
    Math.floor(
      largura *
        AREA_LEITURA.xMin
    );

  const y =
    Math.floor(
      altura *
        AREA_LEITURA.yMin
    );

  const width =
    Math.floor(
      largura *
        (AREA_LEITURA.xMax -
          AREA_LEITURA.xMin)
    );

  const height =
    Math.floor(
      altura *
        (AREA_LEITURA.yMax -
          AREA_LEITURA.yMin)
    );

  return {
    x,
    y,
    width,
    height,
  };
}

function criarCanvasReforcado(
  source
) {
  const larguraOriginal =
    Number(
      source?.width ||
        source?.videoWidth ||
        0
    );

  const alturaOriginal =
    Number(
      source?.height ||
        source?.videoHeight ||
        0
    );

  if (
    larguraOriginal <= 0 ||
    alturaOriginal <= 0
  ) {
    return null;
  }

  const regiao =
    obterRegiaoCentral(
      larguraOriginal,
      alturaOriginal
    );

  const escala =
    Math.min(
      1,
      MAX_LARGURA_PROCESSAMENTO /
        regiao.width
    );

  const largura =
    Math.max(
      1,
      Math.floor(
        regiao.width * escala
      )
    );

  const altura =
    Math.max(
      1,
      Math.floor(
        regiao.height * escala
      )
    );

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width = largura;
  canvas.height = altura;

  const context =
    canvas.getContext("2d", {
      willReadFrequently: true,
    });

  if (!context) {
    return null;
  }

  context.imageSmoothingEnabled =
    false;

  context.drawImage(
    source,
    regiao.x,
    regiao.y,
    regiao.width,
    regiao.height,
    0,
    0,
    largura,
    altura
  );

  const imageData =
    context.getImageData(
      0,
      0,
      largura,
      altura
    );

  const dados =
    imageData.data;

  const contraste =
    CONTRASTE_REFORCADO;

  const intercepto =
    128 *
    (1 - contraste);

  for (
    let index = 0;
    index < dados.length;
    index += 4
  ) {
    const r =
      dados[index];

    const g =
      dados[index + 1];

    const b =
      dados[index + 2];

    const cinza =
      0.299 * r +
      0.587 * g +
      0.114 * b;

    const reforcado =
      Math.max(
        0,
        Math.min(
          255,
          cinza *
            contraste +
            intercepto
        )
      );

    dados[index] =
      reforcado;

    dados[index + 1] =
      reforcado;

    dados[index + 2] =
      reforcado;
  }

  context.putImageData(
    imageData,
    0,
    0
  );

  return canvas;
}

function normalizarCodigo(valor) {
  return String(valor || "")
    .trim()
    .replace(/\s+/g, "");
}

function obterFormatoResultado(
  resultado
) {
  return (
    resultado?.format ||
    "unknown"
  );
}

export default function useMobileScanner({
  ativo,
  videoRef,
  onDetected,
}) {
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
  ] = useState({
    width: null,
    height: null,
    frameRate: null,
  });

  const [
    lendo,
    setLendo,
  ] = useState(false);

  const [
    leituraReforcadaAtiva,
    setLeituraReforcadaAtiva,
  ] = useState(false);

  const [
    cooldownRestanteMs,
    setCooldownRestanteMs,
  ] = useState(0);

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

  const imageCaptureRef =
    useRef(null);

  const timerDeteccaoRef =
    useRef(null);

  const timerEstabilizacaoRef =
    useRef(null);

  const timerCooldownRef =
    useRef(null);

  const processandoFrameRef =
    useRef(false);

  const reforcandoRef =
    useRef(false);

  const cameraAtivaRef =
    useRef(false);

  const ativoRef =
    useRef(Boolean(ativo));

  const liberadoParaDetectarRef =
    useRef(false);

  const onDetectedRef =
    useRef(onDetected);

  const candidatoRef =
    useRef({
      codigo: null,
      formato: null,
      quantidade: 0,
    });

  /*
   * Trava síncrona.
   *
   * Este ref é a autoridade para impedir
   * vídeo + grabFrame + takePhoto de
   * confirmarem o mesmo volume em paralelo.
   */
  const capturaBloqueadaRef =
    useRef(false);

  const cooldownAteRef =
    useRef(0);

  const ultimoCodigoAceitoRef =
    useRef(null);

  const ultimoAvisoDuplicadoEmRef =
    useRef(0);

  const ultimaDeteccaoVisualRef =
    useRef(Date.now());

  const ultimoRefocoEmRef =
    useRef(0);

  const ultimoSnapshotEmRef =
    useRef(0);

  const ultimaFotoEmRef =
    useRef(0);

  useEffect(() => {
    ativoRef.current =
      Boolean(ativo);
  }, [ativo]);

  useEffect(() => {
    onDetectedRef.current =
      onDetected;
  }, [onDetected]);

  const limparTimerDeteccao =
    useCallback(() => {
      if (
        timerDeteccaoRef.current
      ) {
        window.clearTimeout(
          timerDeteccaoRef.current
        );

        timerDeteccaoRef.current =
          null;
      }
    }, []);

  const limparTimerEstabilizacao =
    useCallback(() => {
      if (
        timerEstabilizacaoRef.current
      ) {
        window.clearTimeout(
          timerEstabilizacaoRef.current
        );

        timerEstabilizacaoRef.current =
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

  const resetarCandidato =
    useCallback(() => {
      candidatoRef.current = {
        codigo: null,
        formato: null,
        quantidade: 0,
      };

      setLendo(false);
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

      if (restante <= 0) {
        capturaBloqueadaRef.current =
          false;

        cooldownAteRef.current =
          0;

        ultimoCodigoAceitoRef.current =
          null;

        limparTimerCooldown();
      }
    }, [limparTimerCooldown]);

  const iniciarCooldown =
    useCallback(
      (codigo) => {
        /*
         * IMPORTANTE:
         * trava ANTES do callback.
         *
         * Portanto qualquer detector
         * concorrente que chegar alguns
         * milissegundos depois já encontra
         * capturaBloqueadaRef = true.
         */
        capturaBloqueadaRef.current =
          true;

        ultimoCodigoAceitoRef.current =
          codigo;

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
      },
      [
        atualizarCooldown,
        limparTimerCooldown,
      ]
    );

  const avisarDuplicidade =
    useCallback(
      (codigo, formato) => {
        const agora =
          Date.now();

        if (
          agora -
            ultimoAvisoDuplicadoEmRef.current <
          INTERVALO_AVISO_DUPLICADO_MS
        ) {
          return;
        }

        ultimoAvisoDuplicadoEmRef.current =
          agora;

        onDetectedRef.current?.({
          codigo,
          formato,
          origem: "CAMERA",
          duplicado: true,
        });
      },
      []
    );

  const emitirDeteccao =
    useCallback(
      (resultado) => {
        const codigo =
          normalizarCodigo(
            resultado?.rawValue
          );

        if (!codigo) {
          return false;
        }

        const formato =
          obterFormatoResultado(
            resultado
          );

        /*
         * PRIMEIRA BARREIRA:
         * se alguma camada já ganhou a
         * corrida, nenhuma outra camada
         * pode registrar.
         */
        if (
          capturaBloqueadaRef.current ||
          Date.now() <
            cooldownAteRef.current
        ) {
          if (
            codigo ===
            ultimoCodigoAceitoRef.current
          ) {
            avisarDuplicidade(
              codigo,
              formato
            );
          }

          return false;
        }

        /*
         * TRAVA ATÔMICA:
         * cooldown começa ANTES do
         * onDetected.
         */
        iniciarCooldown(codigo);

        resetarCandidato();

        ultimaDeteccaoVisualRef.current =
          Date.now();

        try {
          onDetectedRef.current?.({
            codigo,
            formato,
            origem: "CAMERA",
            duplicado: false,
          });

          return true;
        } catch (error) {
          console.error(
            "[MobileScanner] Falha ao entregar captura:",
            error
          );

          /*
           * Mesmo se o callback falhar,
           * não liberamos imediatamente
           * para evitar dupla captura.
           */
          return false;
        }
      },
      [
        avisarDuplicidade,
        iniciarCooldown,
        resetarCandidato,
      ]
    );

  const registrarCandidato =
    useCallback((resultado) => {
      const codigo =
        normalizarCodigo(
          resultado?.rawValue
        );

      if (!codigo) {
        return false;
      }

      const formato =
        obterFormatoResultado(
          resultado
        );

      const atual =
        candidatoRef.current;

      if (
        atual.codigo === codigo &&
        atual.formato === formato
      ) {
        atual.quantidade += 1;
      } else {
        candidatoRef.current = {
          codigo,
          formato,
          quantidade: 1,
        };
      }

      const quantidade =
        candidatoRef.current
          .quantidade;

      setLendo(
        quantidade > 0 &&
          quantidade <
            DETECCOES_CONSECUTIVAS_NECESSARIAS
      );

      return (
        quantidade >=
        DETECCOES_CONSECUTIVAS_NECESSARIAS
      );
    }, []);

  const pararCamera =
    useCallback(() => {
      limparTimerDeteccao();
      limparTimerEstabilizacao();
      limparTimerCooldown();

      liberadoParaDetectarRef.current =
        false;

      processandoFrameRef.current =
        false;

      reforcandoRef.current =
        false;

      capturaBloqueadaRef.current =
        false;

      cooldownAteRef.current =
        0;

      ultimoCodigoAceitoRef.current =
        null;

      resetarCandidato();

      setLeituraReforcadaAtiva(
        false
      );

      setCooldownRestanteMs(0);

      const stream =
        streamRef.current;

      if (stream) {
        encerrarStream(stream);
      }

      streamRef.current = null;
      trackRef.current = null;
      detectorRef.current = null;
      imageCaptureRef.current = null;

      cameraAtivaRef.current =
        false;

      setCameraAtiva(false);
      setDetectorDisponivel(false);
      setFormatosSuportados([]);
      setFocoContinuoAtivo(false);

      const video =
        videoRef?.current;

      if (video) {
        try {
          video.pause();
        } catch {
          // Sem ação.
        }

        video.srcObject = null;
      }
    }, [
      limparTimerCooldown,
      limparTimerDeteccao,
      limparTimerEstabilizacao,
      resetarCandidato,
      videoRef,
    ]);

  const tentarRefocoAutomatico =
    useCallback(async () => {
      const track =
        trackRef.current;

      if (!track) {
        return;
      }

      if (
        capturaBloqueadaRef.current ||
        Date.now() <
          cooldownAteRef.current
      ) {
        return;
      }

      const agora =
        Date.now();

      const semLeitura =
        agora -
        ultimaDeteccaoVisualRef.current;

      const desdeUltimoRefoco =
        agora -
        ultimoRefocoEmRef.current;

      if (
        semLeitura <
          TEMPO_SEM_LEITURA_PARA_REFOCO_MS ||
        desdeUltimoRefoco <
          INTERVALO_MINIMO_REFOCO_MS
      ) {
        return;
      }

      ultimoRefocoEmRef.current =
        agora;

      const capabilities =
        obterCapabilitiesTrack(track);

      if (
        suportaModoFoco(
          capabilities,
          "single-shot"
        )
      ) {
        await aplicarFoco({
          track,
          modo: "single-shot",
        });

        await esperar(
          TEMPO_SINGLE_SHOT_MS
        );

        if (
          suportaModoFoco(
            capabilities,
            "continuous"
          )
        ) {
          await aplicarFoco({
            track,
            modo: "continuous",
          });
        }

        return;
      }

      if (
        suportaModoFoco(
          capabilities,
          "continuous"
        )
      ) {
        await aplicarFoco({
          track,
          modo: "continuous",
        });
      }
    }, []);

  const tentarLeituraReforcada =
    useCallback(async () => {
      if (
        reforcandoRef.current ||
        capturaBloqueadaRef.current ||
        Date.now() <
          cooldownAteRef.current
      ) {
        return false;
      }

      const detector =
        detectorRef.current;

      const imageCapture =
        imageCaptureRef.current;

      if (
        !detector ||
        !imageCapture
      ) {
        return false;
      }

      reforcandoRef.current =
        true;

      let bitmap = null;

      try {
        const agoraSnapshot =
          performance.now();

        const desdeUltimoSnapshot =
          agoraSnapshot -
          ultimoSnapshotEmRef.current;

        const semLeitura =
          Date.now() -
          ultimaDeteccaoVisualRef.current;

        if (
          semLeitura >=
            TEMPO_SEM_LEITURA_PARA_SNAPSHOT_MS &&
          desdeUltimoSnapshot >=
            INTERVALO_MINIMO_SNAPSHOT_MS &&
          typeof imageCapture.grabFrame ===
            "function"
        ) {
          ultimoSnapshotEmRef.current =
            agoraSnapshot;

          try {
            bitmap =
              await imageCapture.grabFrame();

            /*
             * Durante o await outra
             * camada pode ter capturado.
             * Verificamos novamente.
             */
            if (
              capturaBloqueadaRef.current ||
              Date.now() <
                cooldownAteRef.current
            ) {
              return false;
            }

            const resultadosSnapshot =
              await detector.detect(
                bitmap
              );

            const snapshot =
              (
                resultadosSnapshot ||
                []
              ).find(
                (resultado) =>
                  resultado?.rawValue
              );

            if (snapshot) {
              return emitirDeteccao(
                snapshot
              );
            }

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

        /*
         * Antes da fotografia high-res,
         * verificamos novamente se outra
         * camada já ganhou a corrida.
         */
        if (
          capturaBloqueadaRef.current ||
          Date.now() <
            cooldownAteRef.current
        ) {
          return false;
        }

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

        let fotoBitmap = null;

        try {
          const blob =
            await imageCapture.takePhoto();

          if (
            capturaBloqueadaRef.current ||
            Date.now() <
              cooldownAteRef.current
          ) {
            return false;
          }

          const resultadosFoto =
            await detector.detect(blob);

          const foto =
            (
              resultadosFoto ||
              []
            ).find(
              (resultado) =>
                resultado?.rawValue
            );

          if (foto) {
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
              return emitirDeteccao(
                fotoReforcada
              );
            }
          }
        } finally {
          fotoBitmap?.close?.();
        }

        return false;
      } catch (error) {
        console.warn(
          "[MobileScanner] Leitura multicamada falhou:",
          error
        );

        return false;
      } finally {
        bitmap?.close?.();

        reforcandoRef.current =
          false;

        setLeituraReforcadaAtiva(
          false
        );
      }
    }, [emitirDeteccao]);

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

      /*
       * Durante cooldown não executamos
       * detector desnecessariamente.
       */
      if (
        capturaBloqueadaRef.current ||
        Date.now() <
          cooldownAteRef.current
      ) {
        timerDeteccaoRef.current =
          window.setTimeout(
            detectarFrame,
            INTERVALO_DETECCAO_MS
          );

        return;
      }

      if (
        processandoFrameRef.current
      ) {
        timerDeteccaoRef.current =
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
        timerDeteccaoRef.current =
          window.setTimeout(
            detectarFrame,
            INTERVALO_DETECCAO_MS
          );

        return;
      }

      processandoFrameRef.current =
        true;

      try {
        const resultados =
          await detectorRef.current.detect(
            video
          );

        /*
         * O detector pode ter ficado
         * aguardando enquanto outra
         * camada capturou.
         */
        if (
          capturaBloqueadaRef.current ||
          Date.now() <
            cooldownAteRef.current
        ) {
          return;
        }

        const melhor =
          escolherMelhorResultado(
            resultados,
            video
          );

        if (!melhor) {
          resetarCandidato();

          if (
            Date.now() >=
              cooldownAteRef.current &&
            !capturaBloqueadaRef.current
          ) {
            void tentarRefocoAutomatico();

            void tentarLeituraReforcada();
          }
        } else if (
          resultadoEstaNaAreaCentral(
            melhor,
            video
          )
        ) {
          ultimaDeteccaoVisualRef.current =
            Date.now();

          const estabilizado =
            registrarCandidato(
              melhor
            );

          if (estabilizado) {
            emitirDeteccao(
              melhor
            );
          }
        } else {
          resetarCandidato();
        }
      } catch (error) {
        console.warn(
          "[MobileScanner] Falha na detecção:",
          error
        );

        resetarCandidato();
      } finally {
        processandoFrameRef.current =
          false;

        if (
          ativoRef.current &&
          cameraAtivaRef.current &&
          liberadoParaDetectarRef.current
        ) {
          timerDeteccaoRef.current =
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
        await navigator.mediaDevices.getUserMedia(
          obterConstraintsBootstrap()
        );

      const bootstrapTrack =
        bootstrapStream.getVideoTracks?.()[
          0
        ] || null;

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

      if (streamRef.current) {
        return true;
      }

      setIniciando(true);
      setErroCamera(null);

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
              descoberta.deviceIdInicial ||
              null
          );

        streamRef.current =
          stream;

        const track =
          stream.getVideoTracks?.()[0] ||
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

        video.muted = true;

        await video.play();

        await esperar(220);

        await configurarMedicaoAutomatica(
          track
        );

        const focoAtivo =
          await prepararAutofocus(
            track
          );

        setFocoContinuoAtivo(
          focoAtivo
        );

        const settingsDepois =
          obterSettingsTrack(track);

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
          possuiImageCaptureApi()
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
        } = await criarDetector();

        detectorRef.current =
          detector;

        setDetectorDisponivel(
          Boolean(detector)
        );

        setFormatosSuportados(
          formatos
        );

        setDiagnosticoCamera({
          cameraSelecionada: {
            deviceId:
              settingsDepois?.deviceId ||
              principal?.deviceId ||
              null,

            label:
              track.label ||
              principal?.label ||
              null,

            score:
              principal?.score ??
              null,
          },

          camerasEnumeradas:
            descoberta.cameras,

          bootstrapSettings:
            descoberta.bootstrapSettings,

          capabilities,

          constraints,

          settingsDepois,

          autofocus: {
            focusModeSuportados:
              capabilities?.focusMode ||
              [],

            focusModeAtual:
              settingsDepois?.focusMode ||
              null,

            focusDistance:
              settingsDepois?.focusDistance ??
              null,

            focoContinuoConfirmado:
              settingsDepois?.focusMode ===
              "continuous",
          },

          imageCaptureDisponivel:
            Boolean(
              imageCaptureRef.current
            ),

          contentHint:
            track.contentHint ||
            null,
        });

        cameraAtivaRef.current =
          true;

        setCameraAtiva(true);

        ultimaDeteccaoVisualRef.current =
          Date.now();

        ultimoRefocoEmRef.current =
          Date.now();

        ultimoSnapshotEmRef.current =
          0;

        ultimaFotoEmRef.current =
          0;

        capturaBloqueadaRef.current =
          false;

        cooldownAteRef.current =
          0;

        ultimoCodigoAceitoRef.current =
          null;

        setCooldownRestanteMs(0);

        timerEstabilizacaoRef.current =
          window.setTimeout(() => {
            if (
              ativoRef.current &&
              cameraAtivaRef.current
            ) {
              liberadoParaDetectarRef.current =
                true;

              detectarFrame();
            }
          }, TEMPO_ESTABILIZACAO_CAMERA_MS);

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
        setIniciando(false);
      }
    }, [
      detectarFrame,
      descobrirCameraPrincipal,
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
    [pararCamera]
  );

  return {
    cameraAtiva,

    iniciando,

    erroCamera,

    detectorDisponivel,

    formatosSuportados,

    focoContinuoAtivo,

    zoomAtual: null,

    cameraLabel,

    cameraPrincipal,

    camerasDisponiveis,

    resolucaoAtual,

    lendo,

    leituraReforcadaAtiva,

    cooldownRestanteMs,

    cooldownAtivo:
      cooldownRestanteMs > 0,

    diagnosticoCamera,

    iniciarCamera,

    pararCamera,

    possuiSuporteCamera:
      possuiSuporteCamera(),

    possuiDetectorNativo:
      possuiBarcodeDetector(),

    possuiImageCapture:
      possuiImageCaptureApi(),
  };
}