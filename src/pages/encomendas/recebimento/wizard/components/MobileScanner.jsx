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
  Sparkles,
  Zap,
  ZapOff,
} from "lucide-react";

import { useMobileScanner } from "../hooks";

// ============================================================
// SISTEMA CHEGOU! — MOBILE SCANNER
// Release funcional: 2026.08.12.002
// ============================================================

function mapearFormatoDetector(formato) {
  const mapa = {
    code_128: "CODIGO_BARRAS",
    code_39: "CODIGO_BARRAS",
    code_93: "CODIGO_BARRAS",
    codabar: "CODIGO_BARRAS",
    ean_13: "CODIGO_BARRAS",
    ean_8: "CODIGO_BARRAS",
    itf: "CODIGO_BARRAS",
    upc_a: "CODIGO_BARRAS",
    upc_e: "CODIGO_BARRAS",
    qr_code: "QR_CODE",
    data_matrix: "DATA_MATRIX",
    pdf417: "PDF417",
  };

  return mapa[formato] || "DESCONHECIDO";
}

function nomeFormatoDetector(formato) {
  const mapa = {
    code_128: "Code 128",
    code_39: "Code 39",
    code_93: "Code 93",
    codabar: "Codabar",
    ean_13: "EAN-13",
    ean_8: "EAN-8",
    itf: "ITF",
    upc_a: "UPC-A",
    upc_e: "UPC-E",
    qr_code: "QR Code",
    data_matrix: "Data Matrix",
    pdf417: "PDF417",
  };

  return mapa[formato] || formato;
}

export default function MobileScanner({
  open,
  quantidadeInformada = null,
  quantidadeBipada = 0,
  onBack,
  onDetected,
}) {
  const videoRef = useRef(null);
  const mensagemTimerRef = useRef(null);

  const [flashAtivo, setFlashAtivo] = useState(false);
  const [flashDisponivel, setFlashDisponivel] = useState(false);
  const [mensagem, setMensagem] = useState(null);

  const mostrarMensagem = useCallback(
    (proximaMensagem, duracao = 1000) => {
      if (mensagemTimerRef.current) {
        window.clearTimeout(mensagemTimerRef.current);
        mensagemTimerRef.current = null;
      }

      setMensagem(proximaMensagem);

      if (duracao > 0) {
        mensagemTimerRef.current = window.setTimeout(() => {
          setMensagem(null);
          mensagemTimerRef.current = null;
        }, duracao);
      }
    },
    []
  );

  const handleDetected = useCallback(
    (resultado) => {
      if (typeof onDetected !== "function") {
        return {
          ok: false,
          motivo: "HANDLER_INDISPONIVEL",
        };
      }

      const resposta = onDetected({
        codigo: resultado.codigo,
        formato: mapearFormatoDetector(resultado.formato),
        origemCaptura: "CAMERA_DISPOSITIVO",
      });

      if (resposta?.ok === false) {
        if (resposta.motivo === "CODIGO_DUPLICADO_LOCAL") {
          mostrarMensagem(
            {
              tipo: "warning",
              titulo: "Volume já capturado",
              texto: "Este código já consta neste recebimento.",
            },
            2200
          );

          return resposta;
        }

        mostrarMensagem(
          {
            tipo: "danger",
            titulo: "Leitura não registrada",
            texto: "Não foi possível registrar esta leitura.",
          },
          1600
        );

        return resposta;
      }

      mostrarMensagem(
        {
          tipo: "success",
          titulo: "Volume capturado",
          texto: resultado.formato
            ? `${nomeFormatoDetector(resultado.formato)} registrado.`
            : "Código registrado neste recebimento.",
        },
        1000
      );

      return resposta;
    },
    [mostrarMensagem, onDetected]
  );

  const {
    cameraAtiva,
    iniciando,
    erroCamera,
    detectorDisponivel,
    formatosSuportados,
    focoContinuoAtivo,
    resolucaoAtual,
    lendo,
    leituraReforcadaAtiva,
    cooldownRestanteMs,
    cooldownAtivo,
    possuiImageCapture,
    iniciarCamera,
    pararCamera,
  } = useMobileScanner({
    ativo: open,
    videoRef,
    onDetected: handleDetected,
  });

  const cooldownSegundos = Math.max(
    0,
    Math.ceil(cooldownRestanteMs / 1000)
  );

  const formatosTexto = useMemo(() => {
    if (
      !Array.isArray(formatosSuportados) ||
      formatosSuportados.length === 0
    ) {
      return "";
    }

    return formatosSuportados
      .map(nomeFormatoDetector)
      .filter(Boolean)
      .join(" • ");
  }, [formatosSuportados]);

  useEffect(() => {
    if (!open) {
      return;
    }

    iniciarCamera();
  }, [open, iniciarCamera]);

  useEffect(
    () => () => {
      if (mensagemTimerRef.current) {
        window.clearTimeout(mensagemTimerRef.current);
        mensagemTimerRef.current = null;
      }
    },
    []
  );

  useEffect(() => {
    if (!cameraAtiva || !videoRef.current?.srcObject) {
      setFlashDisponivel(false);
      setFlashAtivo(false);
      return;
    }

    const stream = videoRef.current.srcObject;
    const track = stream?.getVideoTracks?.()[0];

    let capabilities = null;

    try {
      capabilities = track?.getCapabilities?.() || null;
    } catch {
      capabilities = null;
    }

    setFlashDisponivel(Boolean(capabilities?.torch));
  }, [cameraAtiva]);

  async function alternarFlash() {
    const stream = videoRef.current?.srcObject;
    const track = stream?.getVideoTracks?.()[0];

    if (!track || !flashDisponivel) {
      return;
    }

    const novoValor = !flashAtivo;

    try {
      await track.applyConstraints({
        advanced: [{ torch: novoValor }],
      });

      setFlashAtivo(novoValor);
    } catch (error) {
      console.warn(
        "[MobileScanner] Flash indisponível:",
        error
      );
    }
  }

  function handleVoltar() {
    pararCamera();

    if (typeof onBack === "function") {
      onBack();
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="mobile-scanner">
      <header className="mobile-scanner__header">
        <button
          type="button"
          className="mobile-scanner__back"
          onClick={handleVoltar}
        >
          <ArrowLeft size={19} aria-hidden="true" />
          <span>Voltar</span>
        </button>

        <div className="mobile-scanner__heading">
          <span className="mobile-scanner__eyebrow">
            Recebimento
          </span>
          <h3>Ler código</h3>
        </div>

        <div className="mobile-scanner__header-action">
          <div
            className="mobile-scanner__counter"
            aria-label={`${quantidadeBipada} volumes capturados`}
          >
            <strong>{quantidadeBipada}</strong>

            {quantidadeInformada !== null &&
              quantidadeInformada !== "" && (
                <>
                  <span>/</span>
                  <small>{quantidadeInformada}</small>
                </>
              )}
          </div>

          {flashDisponivel ? (
            <button
              type="button"
              className="mobile-scanner__icon-button"
              onClick={alternarFlash}
              aria-label={
                flashAtivo
                  ? "Desligar flash"
                  : "Ligar flash"
              }
            >
              {flashAtivo ? (
                <ZapOff size={18} aria-hidden="true" />
              ) : (
                <Zap size={18} aria-hidden="true" />
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

      <div className="mobile-scanner__camera">
        <video
          ref={videoRef}
          className="mobile-scanner__video"
          autoPlay
          muted
          playsInline
        />

        <div
          className="mobile-scanner__shade mobile-scanner__shade--top"
          aria-hidden="true"
        />
        <div
          className="mobile-scanner__shade mobile-scanner__shade--bottom"
          aria-hidden="true"
        />
        <div
          className="mobile-scanner__shade mobile-scanner__shade--left"
          aria-hidden="true"
        />
        <div
          className="mobile-scanner__shade mobile-scanner__shade--right"
          aria-hidden="true"
        />

        <div
          className={`mobile-scanner__target${
            lendo
              ? " mobile-scanner__target--reading"
              : ""
          }`}
          aria-hidden="true"
        >
          <span className="mobile-scanner__corner mobile-scanner__corner--tl" />
          <span className="mobile-scanner__corner mobile-scanner__corner--tr" />
          <span className="mobile-scanner__corner mobile-scanner__corner--bl" />
          <span className="mobile-scanner__corner mobile-scanner__corner--br" />

          <div className="mobile-scanner__laser" />

          {lendo && !leituraReforcadaAtiva && (
            <div className="mobile-scanner__focus-indicator">
              <Focus size={18} aria-hidden="true" />
              <span>Reconhecendo...</span>
            </div>
          )}

          {leituraReforcadaAtiva && (
            <div className="mobile-scanner__focus-indicator">
              <Sparkles size={18} aria-hidden="true" />
              <span>Aprimorando etiqueta...</span>
            </div>
          )}
        </div>

        {iniciando && (
          <div className="mobile-scanner__loading">
            <Camera size={28} aria-hidden="true" />
            <span>Abrindo câmera...</span>
          </div>
        )}

        {erroCamera && (
          <div className="mobile-scanner__error">
            <Camera size={28} aria-hidden="true" />
            <strong>Câmera indisponível</strong>
            <span>{erroCamera}</span>
          </div>
        )}
      </div>

      <footer className="mobile-scanner__footer">
        <div className="mobile-scanner__instruction">
          <ScanLine size={20} aria-hidden="true" />

          <div>
            <strong>Posicione o código na linha vermelha</strong>
            <span>
              A câmera é uma alternativa de captura. Para códigos
              pequenos ou muito densos, aproxime até as barras ficarem
              nítidas e evite reflexos diretos. A leitura é automática.
            </span>
          </div>
        </div>

        {focoContinuoAtivo && (
          <div className="mobile-scanner__status">
            <Focus size={14} aria-hidden="true" />
            <span>Foco automático ativo</span>
          </div>
        )}

        {cooldownAtivo && (
          <div className="mobile-scanner__status">
            <ScanLine size={14} aria-hidden="true" />
            <span>
              Próxima leitura em {cooldownSegundos}s
            </span>
          </div>
        )}

        {resolucaoAtual?.width &&
          resolucaoAtual?.height && (
            <div className="mobile-scanner__status">
              <ScanLine size={14} aria-hidden="true" />
              <span>
                {resolucaoAtual.width}
                {" × "}
                {resolucaoAtual.height}
                {resolucaoAtual?.frameRate
                  ? ` • ${Math.round(
                      resolucaoAtual.frameRate
                    )} fps`
                  : ""}
              </span>
            </div>
          )}

        {possuiImageCapture && (
          <div className="mobile-scanner__status">
            <Sparkles size={14} aria-hidden="true" />
            <span>Leitura reforçada de etiqueta ativa</span>
          </div>
        )}

        {detectorDisponivel && formatosTexto && (
          <div className="mobile-scanner__formats">
            {formatosTexto}
          </div>
        )}

        {!detectorDisponivel && cameraAtiva && (
          <div className="mobile-scanner__warning">
            A câmera está funcionando, mas este navegador não
            oferece o detector nativo necessário para a leitura
            automática.
          </div>
        )}

        {mensagem && (
          <div
            className={`mobile-scanner__feedback mobile-scanner__feedback--${mensagem.tipo}`}
            role={
              mensagem.tipo === "danger"
                ? "alert"
                : "status"
            }
          >
            {mensagem.titulo && (
              <strong className="mobile-scanner__feedback-title">
                {mensagem.titulo}
              </strong>
            )}

            <span className="mobile-scanner__feedback-text">
              {mensagem.texto}
            </span>
          </div>
        )}
      </footer>
    </div>
  );
}