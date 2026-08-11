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
// Superfície Premium de captura contínua para:
// - códigos de barras;
// - QR Code;
// - Data Matrix;
// - PDF417.
//
// A câmera permanece aberta após cada captura.
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


export default function MobileScanner({
  open,

  quantidadeInformada = null,
  quantidadeBipada = 0,

  onBack,

  onDetected,
}) {
  const videoRef =
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


        if (
          resposta?.ok === false
        ) {
          if (
            resposta.motivo ===
            "CODIGO_DUPLICADO_LOCAL"
          ) {
            setMensagem({
              tipo:
                "warning",

              texto:
                "Este volume já foi capturado.",
            });

            return;
          }


          setMensagem({
            tipo:
              "danger",

            texto:
              "Não foi possível registrar esta leitura.",
          });

          return;
        }


        setMensagem({
          tipo:
            "success",

          texto:
            resultado.formato
              ? `${nomeFormatoDetector(
                  resultado.formato
                )} capturado.`
              : "Volume capturado.",
        });


        window.setTimeout(() => {
          setMensagem(null);
        }, 1000);
      },
      [
        onDetected,
      ]
    );


  const {
    cameraAtiva,
    iniciando,
    erroCamera,

    detectorDisponivel,

    formatosSuportados,

    focoContinuoAtivo,

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


      const prioritarios =
        formatosSuportados
          .map(
            nomeFormatoDetector
          )
          .filter(Boolean);


      return prioritarios.join(
        " • "
      );
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
  // TORCH
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


  if (!open) {
    return null;
  }


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
          <div
            className="mobile-scanner__counter"
            aria-label={`${quantidadeBipada} volumes capturados`}
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
                />
              ) : (
                <Zap
                  size={18}
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
          CAMERA
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
              />

              <span>
                Reconhecendo...
              </span>
            </div>
          )}
        </div>


        {iniciando && (
          <div className="mobile-scanner__loading">
            <Camera
              size={28}
            />

            <span>
              Abrindo câmera...
            </span>
          </div>
        )}


        {erroCamera && (
          <div className="mobile-scanner__error">
            <Camera
              size={28}
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


        {focoContinuoAtivo && (
          <div className="mobile-scanner__status">
            <Focus
              size={14}
            />

            <span>
              Foco automático ativo
            </span>
          </div>
        )}


        {detectorDisponivel &&
          formatosTexto && (
            <div className="mobile-scanner__formats">
              {formatosTexto}
            </div>
          )}


        {!detectorDisponivel &&
          cameraAtiva && (
            <div className="mobile-scanner__warning">
              A câmera está funcionando, mas este navegador
              não oferece o detector nativo necessário para
              a leitura automática.
            </div>
          )}


        {mensagem && (
          <div
            className={
              `mobile-scanner__feedback mobile-scanner__feedback--${mensagem.tipo}`
            }
          >
            {mensagem.texto}
          </div>
        )}
      </footer>
    </div>
  );
}