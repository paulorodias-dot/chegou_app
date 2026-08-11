import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowLeft,
  Camera,
  Focus,
  ScanLine,
  Zap,
  ZapOff,
} from "lucide-react";

import {
  useMobileScanner,
} from "../hooks";


// ============================================================
// SISTEMA CHEGOU!
// MOBILE SCANNER
//
// Versão funcional: 2026.08.11.003
//
// Superfície Premium de captura contínua para:
// - códigos de barras;
// - QR Code;
// - Data Matrix;
// - PDF417.
//
// A câmera:
// - permanece aberta após cada captura;
// - prioriza a câmera principal definida pelo hook;
// - apresenta a resolução realmente negociada;
// - utiliza autofocus quando suportado;
// - mantém contador operacional visível.
// ============================================================


// ============================================================
// FORMATO INTERNO
// ============================================================

function mapearFormatoDetector(
  formato
) {
  const mapa = {
    code_128:
      "CODIGO_BARRAS",

    code_39:
      "CODIGO_BARRAS",

    code_93:
      "CODIGO_BARRAS",

    codabar:
      "CODIGO_BARRAS",

    ean_13:
      "CODIGO_BARRAS",

    ean_8:
      "CODIGO_BARRAS",

    itf:
      "CODIGO_BARRAS",

    upc_a:
      "CODIGO_BARRAS",

    upc_e:
      "CODIGO_BARRAS",

    qr_code:
      "QR_CODE",

    data_matrix:
      "DATA_MATRIX",

    pdf417:
      "PDF417",
  };


  return (
    mapa[formato] ||
    "DESCONHECIDO"
  );
}


// ============================================================
// NOME VISUAL DO FORMATO
// ============================================================

function nomeFormatoDetector(
  formato
) {
  const mapa = {
    code_128:
      "Code 128",

    code_39:
      "Code 39",

    code_93:
      "Code 93",

    codabar:
      "Codabar",

    ean_13:
      "EAN-13",

    ean_8:
      "EAN-8",

    itf:
      "ITF",

    upc_a:
      "UPC-A",

    upc_e:
      "UPC-E",

    qr_code:
      "QR Code",

    data_matrix:
      "Data Matrix",

    pdf417:
      "PDF417",
  };


  return (
    mapa[formato] ||
    formato
  );
}


// ============================================================
// COMPONENTE
// ============================================================

export default function MobileScanner({
  open,

  quantidadeInformada = null,
  quantidadeBipada = 0,

  onBack,

  onDetected,
}) {
  const videoRef =
    useRef(null);

  const mensagemTimerRef =
    useRef(null);


  const [
    flashAtivo,
    setFlashAtivo,
  ] = useState(false);

  const [
    flashDisponivel,
    setFlashDisponivel,
  ] = useState(false);

  const [
    mensagem,
    setMensagem,
  ] = useState(null);


  // ==========================================================
  // FEEDBACK TEMPORÁRIO
  // ==========================================================

  const mostrarMensagem =
    useCallback(
      (
        proximaMensagem,
        duracao = 1000
      ) => {
        if (
          mensagemTimerRef.current
        ) {
          window.clearTimeout(
            mensagemTimerRef.current
          );

          mensagemTimerRef.current =
            null;
        }


        setMensagem(
          proximaMensagem
        );


        if (
          duracao > 0
        ) {
          mensagemTimerRef.current =
            window.setTimeout(
              () => {
                setMensagem(null);

                mensagemTimerRef.current =
                  null;
              },
              duracao
            );
        }
      },
      []
    );


  // ==========================================================
  // DETECÇÃO
  // ==========================================================

  const handleDetected =
    useCallback(
      (resultado) => {
        if (
          typeof onDetected !==
          "function"
        ) {
          return;
        }


        const resposta =
          onDetected({
            codigo:
              resultado.codigo,

            formato:
              mapearFormatoDetector(
                resultado.formato
              ),

            origemCaptura:
              "CAMERA_DISPOSITIVO",
          });


        // ------------------------------------------------------
        // FALHA
        // ------------------------------------------------------

        if (
          resposta?.ok === false
        ) {
          if (
            resposta.motivo ===
            "CODIGO_DUPLICADO_LOCAL"
          ) {
            mostrarMensagem(
              {
                tipo:
                  "warning",

                texto:
                  "Este volume já foi capturado.",
              },
              1400
            );


            return;
          }


          mostrarMensagem(
            {
              tipo:
                "danger",

              texto:
                "Não foi possível registrar esta leitura.",
            },
            1600
          );


          return;
        }


        // ------------------------------------------------------
        // SUCESSO
        // ------------------------------------------------------

        mostrarMensagem(
          {
            tipo:
              "success",

            texto:
              resultado.formato
                ? `${nomeFormatoDetector(
                    resultado.formato
                  )} capturado.`
                : "Volume capturado.",
          },
          1000
        );
      },
      [
        mostrarMensagem,
        onDetected,
      ]
    );


  // ==========================================================
  // HOOK DE CÂMERA
  // ==========================================================

  const {
    cameraAtiva,

    iniciando,

    erroCamera,

    detectorDisponivel,

    formatosSuportados,

    focoContinuoAtivo,

    resolucaoAtual,

    lendo,

    iniciarCamera,

    pararCamera,
  } = useMobileScanner({
    ativo:
      open,

    videoRef,

    onDetected:
      handleDetected,
  });


  // ==========================================================
  // FORMATOS PARA EXIBIÇÃO
  // ==========================================================

  const formatosTexto =
    useMemo(() => {
      if (
        !Array.isArray(
          formatosSuportados
        ) ||
        formatosSuportados
          .length === 0
      ) {
        return "";
      }


      return formatosSuportados
        .map(
          nomeFormatoDetector
        )
        .filter(Boolean)
        .join(" • ");
    }, [
      formatosSuportados,
    ]);


  // ==========================================================
  // ABRIR CÂMERA
  // ==========================================================

  useEffect(() => {
    if (!open) {
      return;
    }


    iniciarCamera();
  }, [
    open,
    iniciarCamera,
  ]);


  // ==========================================================
  // LIMPEZA DE MENSAGEM
  // ==========================================================

  useEffect(
    () => () => {
      if (
        mensagemTimerRef.current
      ) {
        window.clearTimeout(
          mensagemTimerRef.current
        );

        mensagemTimerRef.current =
          null;
      }
    },
    []
  );


  // ==========================================================
  // TORCH / FLASH
  // ==========================================================

  useEffect(() => {
    if (
      !cameraAtiva ||
      !videoRef.current
        ?.srcObject
    ) {
      setFlashDisponivel(
        false
      );

      setFlashAtivo(
        false
      );


      return;
    }


    const stream =
      videoRef.current
        .srcObject;


    const track =
      stream
        ?.getVideoTracks?.()[0];


    let capabilities =
      null;


    try {
      capabilities =
        track
          ?.getCapabilities?.() ||
        null;
    } catch {
      capabilities =
        null;
    }


    setFlashDisponivel(
      Boolean(
        capabilities?.torch
      )
    );
  }, [
    cameraAtiva,
  ]);


  // ==========================================================
  // ALTERNAR FLASH
  // ==========================================================

  async function alternarFlash() {
    const stream =
      videoRef.current
        ?.srcObject;


    const track =
      stream
        ?.getVideoTracks?.()[0];


    if (
      !track ||
      !flashDisponivel
    ) {
      return;
    }


    const novoValor =
      !flashAtivo;


    try {
      await track.applyConstraints({
        advanced: [
          {
            torch:
              novoValor,
          },
        ],
      });


      setFlashAtivo(
        novoValor
      );
    } catch (error) {
      console.warn(
        "[MobileScanner] Flash indisponível:",
        error
      );
    }
  }


  // ==========================================================
  // VOLTAR
  // ==========================================================

  function handleVoltar() {
    pararCamera();


    if (
      typeof onBack ===
      "function"
    ) {
      onBack();
    }
  }


  // ==========================================================
  // FECHADO
  // ==========================================================

  if (!open) {
    return null;
  }


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="mobile-scanner">

      {/* ====================================================
          HEADER
      ==================================================== */}

      <header className="mobile-scanner__header">
        <button
          type="button"
          className="mobile-scanner__back"
          onClick={
            handleVoltar
          }
        >
          <ArrowLeft
            size={19}
            aria-hidden="true"
          />

          <span>
            Voltar
          </span>
        </button>


        <div className="mobile-scanner__heading">
          <span className="mobile-scanner__eyebrow">
            Recebimento
          </span>

          <h3>
            Ler código
          </h3>
        </div>


        <div className="mobile-scanner__header-action">

          {/* CONTADOR */}

          <div
            className="mobile-scanner__counter"
            aria-label={
              `${quantidadeBipada} volumes capturados`
            }
          >
            <strong>
              {quantidadeBipada}
            </strong>


            {quantidadeInformada !==
              null &&
              quantidadeInformada !==
                "" && (
                <>
                  <span>
                    /
                  </span>

                  <small>
                    {
                      quantidadeInformada
                    }
                  </small>
                </>
              )}
          </div>


          {/* FLASH */}

          {flashDisponivel ? (
            <button
              type="button"
              className="mobile-scanner__icon-button"
              onClick={
                alternarFlash
              }
              aria-label={
                flashAtivo
                  ? "Desligar flash"
                  : "Ligar flash"
              }
            >
              {flashAtivo ? (
                <ZapOff
                  size={18}
                  aria-hidden="true"
                />
              ) : (
                <Zap
                  size={18}
                  aria-hidden="true"
                />
              )}
            </button>
          ) : (
            <span
              className="mobile-scanner__icon-placeholder"
              aria-hidden="true"
            />
          )}
        </div>
      </header>


      {/* ====================================================
          CÂMERA
      ==================================================== */}

      <div className="mobile-scanner__camera">
        <video
          ref={
            videoRef
          }
          className="mobile-scanner__video"
          autoPlay
          muted
          playsInline
        />


        {/* SOMBREAMENTO */}

        <div
          className="
            mobile-scanner__shade
            mobile-scanner__shade--top
          "
          aria-hidden="true"
        />

        <div
          className="
            mobile-scanner__shade
            mobile-scanner__shade--bottom
          "
          aria-hidden="true"
        />

        <div
          className="
            mobile-scanner__shade
            mobile-scanner__shade--left
          "
          aria-hidden="true"
        />

        <div
          className="
            mobile-scanner__shade
            mobile-scanner__shade--right
          "
          aria-hidden="true"
        />


        {/* ÁREA DE LEITURA */}

        <div
          className={
            `mobile-scanner__target${
              lendo
                ? " mobile-scanner__target--reading"
                : ""
            }`
          }
          aria-hidden="true"
        >
          <span className="mobile-scanner__corner mobile-scanner__corner--tl" />

          <span className="mobile-scanner__corner mobile-scanner__corner--tr" />

          <span className="mobile-scanner__corner mobile-scanner__corner--bl" />

          <span className="mobile-scanner__corner mobile-scanner__corner--br" />


          <div className="mobile-scanner__laser" />


          {lendo && (
            <div className="mobile-scanner__focus-indicator">
              <Focus
                size={18}
                aria-hidden="true"
              />

              <span>
                Reconhecendo...
              </span>
            </div>
          )}
        </div>


        {/* INICIALIZAÇÃO */}

        {iniciando && (
          <div className="mobile-scanner__loading">
            <Camera
              size={28}
              aria-hidden="true"
            />

            <span>
              Abrindo câmera...
            </span>
          </div>
        )}


        {/* ERRO */}

        {erroCamera && (
          <div className="mobile-scanner__error">
            <Camera
              size={28}
              aria-hidden="true"
            />

            <strong>
              Câmera indisponível
            </strong>

            <span>
              {erroCamera}
            </span>
          </div>
        )}
      </div>


      {/* ====================================================
          FOOTER
      ==================================================== */}

      <footer className="mobile-scanner__footer">

        {/* ORIENTAÇÃO */}

        <div className="mobile-scanner__instruction">
          <ScanLine
            size={20}
            aria-hidden="true"
          />

          <div>
            <strong>
              Posicione o código na linha vermelha
            </strong>

            <span>
              A câmera ajusta o foco quando o dispositivo
              oferece suporte. Quando a leitura estiver
              estável, a captura ocorre automaticamente.
            </span>
          </div>
        </div>


        {/* FOCO */}

        {focoContinuoAtivo && (
          <div className="mobile-scanner__status">
            <Focus
              size={14}
              aria-hidden="true"
            />

            <span>
              Foco automático ativo
            </span>
          </div>
        )}


        {/* RESOLUÇÃO REAL */}

        {resolucaoAtual?.width &&
          resolucaoAtual?.height && (
            <div className="mobile-scanner__status">
              <ScanLine
                size={14}
                aria-hidden="true"
              />

              <span>
                {resolucaoAtual.width}
                {" × "}
                {resolucaoAtual.height}

                {resolucaoAtual
                  ?.frameRate
                  ? ` • ${Math.round(
                      resolucaoAtual.frameRate
                    )} fps`
                  : ""}
              </span>
            </div>
          )}


        {/* FORMATOS */}

        {detectorDisponivel &&
          formatosTexto && (
            <div className="mobile-scanner__formats">
              {formatosTexto}
            </div>
          )}


        {/* DETECTOR NÃO DISPONÍVEL */}

        {!detectorDisponivel &&
          cameraAtiva && (
            <div className="mobile-scanner__warning">
              A câmera está funcionando, mas este navegador
              não oferece o detector nativo necessário para
              a leitura automática.
            </div>
          )}


        {/* FEEDBACK */}

        {mensagem && (
          <div
            className={
              `mobile-scanner__feedback mobile-scanner__feedback--${mensagem.tipo}`
            }
            role={
              mensagem.tipo ===
              "danger"
                ? "alert"
                : "status"
            }
          >
            {mensagem.texto}
          </div>
        )}
      </footer>
    </div>
  );
}