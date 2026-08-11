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
// Responsabilidades:
// - solicitar câmera;
// - preferir câmera traseira;
// - aplicar foco contínuo quando suportado;
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

/*
 * Exige o mesmo código em pelo menos dois frames
 * para reduzir leituras ocasionais/falsas.
 */
const DETECCOES_CONSECUTIVAS_NECESSARIAS =
  2;

/*
 * Área aproximada correspondente ao quadro visual
 * central do scanner.
 *
 * Valores relativos ao frame do vídeo.
 */
const AREA_LEITURA = Object.freeze({
  xMin: 0.07,
  xMax: 0.93,
  yMin: 0.22,
  yMax: 0.78,
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
    typeof navigator.mediaDevices.getUserMedia ===
      "function"
  );
}


function possuiBarcodeDetector() {
  return Boolean(
    typeof window !== "undefined" &&
    "BarcodeDetector" in window
  );
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
            formats:
              formatos,
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
    /*
     * Alguns detectores podem não fornecer boundingBox.
     * Nesse caso não bloqueamos a leitura.
     */
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
//
// Quando houver mais de um código no frame:
// 1. prioriza os localizados na região central;
// 2. entre eles, prioriza o maior boundingBox.
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


  if (validos.length === 0) {
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

      return areaB - areaA;
    })[0];
}


// ============================================================
// CONSTRAINTS DA CÂMERA
// ============================================================

function obterConstraintsPreferenciais() {
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

      /*
       * Ajuda browsers que utilizam isso na escolha
       * da câmera/configuração.
       */
      frameRate: {
        ideal: 30,
        max: 60,
      },
    },
  };
}


function obterConstraintsFallback() {
  return {
    audio: false,

    video: {
      facingMode: {
        ideal: "environment",
      },
    },
  };
}


// ============================================================
// APLICAR FOCO CONTÍNUO
//
// As capacidades dependem do navegador + câmera.
//
// Nunca bloquear o scanner caso o aparelho não exponha
// focusMode / exposureMode / whiteBalanceMode.
// ============================================================

async function configurarCameraParaLeitura(
  track
) {
  if (!track) {
    return {
      focoContinuoAtivo: false,
      capabilities: null,
    };
  }


  let capabilities =
    null;


  try {
    capabilities =
      typeof track.getCapabilities ===
      "function"
        ? track.getCapabilities()
        : null;
  } catch {
    capabilities = null;
  }


  const advanced = {};


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
    Object.keys(advanced).length >
    0
  ) {
    try {
      await track.applyConstraints({
        advanced: [
          advanced,
        ],
      });
    } catch (error) {
      /*
       * Não bloqueia a câmera.
       * Alguns browsers expõem capability mas recusam
       * determinada constraint em runtime.
       */
      console.warn(
        "[MobileScanner] Não foi possível aplicar todos os ajustes automáticos:",
        error
      );
    }
  }


  return {
    focoContinuoAtivo:
      advanced.focusMode ===
      "continuous",

    capabilities,
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
    cameraLabel,
    setCameraLabel,
  ] = useState(null);

  const [
    lendo,
    setLendo,
  ] = useState(false);


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


  /*
   * Evita recaptura imediata do mesmo código.
   */
  const ultimoCodigoRef =
    useRef({
      codigo: null,
      registradoEm: 0,
    });


  /*
   * Estabilização:
   * mesmo código precisa aparecer em frames consecutivos.
   */
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
  // RESET DA ESTABILIZAÇÃO
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
  // PARAR CÂMERA
  // ==========================================================

  const pararCamera =
    useCallback(() => {
      if (timerRef.current) {
        window.clearTimeout(
          timerRef.current
        );

        timerRef.current = null;
      }


      if (streamRef.current) {
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


      if (videoRef?.current) {
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
      setDetectorDisponivel(false);
      setFormatosSuportados([]);
      setFocoContinuoAtivo(false);
      setCameraLabel(null);
    }, [
      resetarCandidato,
      videoRef,
    ]);


  // ==========================================================
  // VALIDAR ESTABILIDADE DO CÓDIGO
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
          atual.codigo === codigo &&
          atual.formato === formato
        ) {
          candidatoRef.current = {
            ...atual,

            quantidade:
              atual.quantidade + 1,
          };
        } else {
          candidatoRef.current = {
            codigo,
            formato,
            quantidade: 1,
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
          ultimo.codigo === codigo &&
          agora -
            ultimo.registradoEm <
            TEMPO_BLOQUEIO_MESMO_CODIGO_MS;


        if (mesmoCodigoRecente) {
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
  // DETECÇÃO CONTÍNUA
  // ==========================================================

  const detectarFrame =
    useCallback(async () => {
      if (
        !ativoRef.current ||
        !cameraAtivaRef.current ||
        !detectorRef.current ||
        !videoRef?.current
      ) {
        return;
      }


      if (processandoRef.current) {
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
          await detectorRef.current.detect(
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
          const estaCentralizado =
            resultadoEstaNaAreaCentral(
              melhor,
              video
            );


          if (!estaCentralizado) {
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
          cameraAtivaRef.current
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
  //
  // Primeiro tenta resolução/fps ideais.
  // Se o aparelho recusar, tenta configuração simples.
  // ==========================================================

  const solicitarStream =
    useCallback(async () => {
      try {
        return await navigator.mediaDevices
          .getUserMedia(
            obterConstraintsPreferenciais()
          );
      } catch (primeiroErro) {
        console.warn(
          "[MobileScanner] Constraints preferenciais recusadas; tentando fallback.",
          primeiroErro
        );


        return navigator.mediaDevices
          .getUserMedia(
            obterConstraintsFallback()
          );
      }
    }, []);


  // ==========================================================
  // INICIAR CÂMERA
  // ==========================================================

  const iniciarCamera =
    useCallback(async () => {
      if (!possuiSuporteCamera()) {
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
        const stream =
          await solicitarStream();


        streamRef.current =
          stream;


        const track =
          stream
            .getVideoTracks?.()[0] ||
          null;


        if (track) {
          setCameraLabel(
            track.label ||
            null
          );


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
        }


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
    }, [
      pararCamera,
      solicitarStream,
      videoRef,
    ]);


  // ==========================================================
  // INICIAR LOOP
  // ==========================================================

  useEffect(() => {
    if (
      !ativo ||
      !cameraAtiva ||
      !detectorRef.current
    ) {
      return undefined;
    }


    timerRef.current =
      window.setTimeout(
        detectarFrame,
        INTERVALO_DETECCAO_MS
      );


    return () => {
      if (timerRef.current) {
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
  // FECHOU SCANNER
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
  // API PÚBLICA
  // ==========================================================

  return {
    cameraAtiva,
    iniciando,
    erroCamera,

    detectorDisponivel,

    formatosSuportados,

    focoContinuoAtivo,

    cameraLabel,

    lendo,

    iniciarCamera,
    pararCamera,

    possuiSuporteCamera:
      possuiSuporteCamera(),

    possuiDetectorNativo:
      possuiBarcodeDetector(),
  };
}