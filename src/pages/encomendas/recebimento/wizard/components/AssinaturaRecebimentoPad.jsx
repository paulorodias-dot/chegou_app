import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  enviarAssinaturaRecebimento,
} from "../services/evidenciasStorageService";

import "./AssinaturaRecebimentoPad.css";


// ============================================================
// SISTEMA CHEGOU!
// ASSINATURA DE RECEBIMENTO
//
// Responsabilidades:
// - superfície horizontal para assinatura do entregador;
// - desenho por mouse, touch ou caneta;
// - limpar/refazer;
// - converter assinatura para Blob;
// - enviar ao bucket privado de assinaturas;
// - devolver SOMENTE metadados serializáveis.
//
// NÃO:
// - bloqueia o recebimento;
// - decide se assinatura é obrigatória;
// - acessa tabela diretamente;
// - mantém Blob/File no estado persistente do Wizard.
//
// Regra oficial:
// assinatura obrigatória ausente = pendência administrativa,
// nunca bloqueio operacional.
// ============================================================


const LARGURA_BASE =
  900;

const ALTURA_BASE =
  300;


// ============================================================
// CANVAS → BLOB
// ============================================================

function canvasParaBlob(
  canvas
) {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(
              new Error(
                "Não foi possível gerar a imagem da assinatura."
              )
            );

            return;
          }

          resolve(blob);
        },

        "image/png",
        1
      );
    }
  );
}


// ============================================================
// COMPONENTE
// ============================================================

export default function AssinaturaRecebimentoPad({
  condominioId = null,
  clientReceiptId = null,

  entregadorNome = "",
  documentoMascarado = null,

  assinatura = null,

  disabled = false,

  onChange,
}) {
  const canvasRef =
    useRef(null);

  const containerRef =
    useRef(null);

  const desenhandoRef =
    useRef(false);

  const ultimoPontoRef =
    useRef(null);

  const possuiTracoRef =
    useRef(false);


  const [
    possuiTraco,
    setPossuiTraco,
  ] = useState(false);


  const [
    salvando,
    setSalvando,
  ] = useState(false);


  const [
    erro,
    setErro,
  ] = useState(null);


  // ==========================================================
  // ASSINATURA JÁ PERSISTIDA
  // ==========================================================

  const assinaturaEnviada =
    Boolean(
      assinatura?.bucket &&
      assinatura?.storagePath
    );


  // ==========================================================
  // PREPARAR CANVAS
  //
  // Internamente utilizamos alta resolução.
  // Visualmente ele continua responsivo.
  // ==========================================================

  const prepararCanvas =
    useCallback(() => {
      const canvas =
        canvasRef.current;

      if (!canvas) {
        return;
      }


      canvas.width =
        LARGURA_BASE;

      canvas.height =
        ALTURA_BASE;


      const contexto =
        canvas.getContext(
          "2d"
        );

      if (!contexto) {
        return;
      }


      /*
       * Fundo branco explícito.
       *
       * A assinatura final não dependerá
       * de transparência.
       */
      contexto.fillStyle =
        "#ffffff";

      contexto.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
      );


      contexto.strokeStyle =
        "#0f172a";

      contexto.lineWidth =
        4;

      contexto.lineCap =
        "round";

      contexto.lineJoin =
        "round";


      possuiTracoRef.current =
        false;

      setPossuiTraco(
        false
      );

      ultimoPontoRef.current =
        null;
    }, []);


  useEffect(() => {
    if (
      assinaturaEnviada
    ) {
      return;
    }

    prepararCanvas();
  }, [
    prepararCanvas,
    assinaturaEnviada,
  ]);


  // ==========================================================
  // COORDENADAS
  // ==========================================================

  function obterPonto(
    event
  ) {
    const canvas =
      canvasRef.current;

    if (!canvas) {
      return null;
    }


    const rect =
      canvas.getBoundingClientRect();


    if (
      rect.width <= 0 ||
      rect.height <= 0
    ) {
      return null;
    }


    const escalaX =
      canvas.width /
      rect.width;

    const escalaY =
      canvas.height /
      rect.height;


    return {
      x:
        (
          event.clientX -
          rect.left
        ) * escalaX,

      y:
        (
          event.clientY -
          rect.top
        ) * escalaY,
    };
  }


  // ==========================================================
  // COMEÇAR DESENHO
  // ==========================================================

  function handlePointerDown(
    event
  ) {
    if (
      disabled ||
      salvando ||
      assinaturaEnviada
    ) {
      return;
    }


    if (
      event.pointerType ===
        "mouse" &&
      event.button !== 0
    ) {
      return;
    }


    const ponto =
      obterPonto(
        event
      );

    if (!ponto) {
      return;
    }


    event.preventDefault();


    try {
      event.currentTarget
        .setPointerCapture(
          event.pointerId
        );
    } catch {
      // Sem impacto operacional.
    }


    desenhandoRef.current =
      true;

    ultimoPontoRef.current =
      ponto;


    /*
     * Pequeno ponto inicial.
     *
     * Também permite uma assinatura com toque muito curto
     * ser reconhecida como interação.
     */
    const canvas =
      canvasRef.current;

    const contexto =
      canvas?.getContext(
        "2d"
      );


    if (contexto) {
      contexto.beginPath();

      contexto.arc(
        ponto.x,
        ponto.y,
        2,
        0,
        Math.PI * 2
      );

      contexto.fillStyle =
        "#0f172a";

      contexto.fill();
    }


    possuiTracoRef.current =
      true;

    setPossuiTraco(
      true
    );

    setErro(null);
  }


  // ==========================================================
  // DESENHAR
  // ==========================================================

  function handlePointerMove(
    event
  ) {
    if (
      !desenhandoRef.current ||
      disabled ||
      salvando ||
      assinaturaEnviada
    ) {
      return;
    }


    const pontoAtual =
      obterPonto(
        event
      );

    const pontoAnterior =
      ultimoPontoRef.current;


    if (
      !pontoAtual ||
      !pontoAnterior
    ) {
      return;
    }


    event.preventDefault();


    const canvas =
      canvasRef.current;

    const contexto =
      canvas?.getContext(
        "2d"
      );


    if (!contexto) {
      return;
    }


    contexto.beginPath();

    contexto.moveTo(
      pontoAnterior.x,
      pontoAnterior.y
    );

    contexto.lineTo(
      pontoAtual.x,
      pontoAtual.y
    );

    contexto.stroke();


    ultimoPontoRef.current =
      pontoAtual;
  }


  // ==========================================================
  // FINALIZAR TRAÇO
  // ==========================================================

  function finalizarDesenho(
    event
  ) {
    if (
      !desenhandoRef.current
    ) {
      return;
    }


    desenhandoRef.current =
      false;

    ultimoPontoRef.current =
      null;


    try {
      if (
        event?.currentTarget
          ?.hasPointerCapture?.(
            event.pointerId
          )
      ) {
        event.currentTarget
          .releasePointerCapture(
            event.pointerId
          );
      }
    } catch {
      // Sem impacto operacional.
    }
  }


  // ==========================================================
  // LIMPAR
  // ==========================================================

  function handleLimpar() {
    if (
      salvando ||
      disabled
    ) {
      return;
    }


    /*
     * Assinatura já enviada não é apagada
     * fisicamente do Storage pelo navegador.
     *
     * Para substituir, o operador remove a referência
     * local e faz uma nova assinatura.
     */
    if (
      assinaturaEnviada
    ) {
      if (
        typeof onChange ===
        "function"
      ) {
        onChange(null);
      }

      setErro(null);

      window.requestAnimationFrame(
        () => {
          prepararCanvas();
        }
      );

      return;
    }


    prepararCanvas();

    setErro(null);
  }


  // ==========================================================
  // SALVAR / UPLOAD
  // ==========================================================

  async function handleSalvar() {
    if (
      disabled ||
      salvando ||
      assinaturaEnviada
    ) {
      return;
    }


    if (
      !possuiTracoRef.current
    ) {
      setErro(
        "Faça a assinatura antes de salvar."
      );

      return;
    }


    if (!condominioId) {
      setErro(
        "Não foi possível identificar o condomínio."
      );

      return;
    }


    if (!clientReceiptId) {
      setErro(
        "Não foi possível identificar este recebimento."
      );

      return;
    }


    const canvas =
      canvasRef.current;


    if (!canvas) {
      setErro(
        "Área de assinatura indisponível."
      );

      return;
    }


    try {
      setSalvando(true);
      setErro(null);


      /*
       * O PNG gerado aqui ainda passa pelo service,
       * que:
       *
       * - processa novamente;
       * - aplica configuração do condomínio;
       * - gera hash;
       * - usa path multi-tenant;
       * - envia ao Storage privado.
       */
      const blob =
        await canvasParaBlob(
          canvas
        );


      const resultado =
        await enviarAssinaturaRecebimento({
          arquivo:
            blob,

          condominioId,

          clientReceiptId,

          nomeSignatario:
            entregadorNome ||
            null,

          documentoMascarado:
            documentoMascarado ||
            null,

          tipoAssinatura:
            "RECEBIMENTO_ENTREGADOR",

          metadata: {
            origem_captura:
              "ASSINATURA_CANVAS",

            largura_canvas:
              LARGURA_BASE,

            altura_canvas:
              ALTURA_BASE,

            orientacao_superficie:
              "HORIZONTAL",
          },
        });


      if (
        !resultado?.bucket ||
        !resultado?.storagePath
      ) {
        throw new Error(
          "O armazenamento não retornou os dados da assinatura."
        );
      }


      if (
        typeof onChange ===
        "function"
      ) {
        onChange(
          resultado
        );
      }
    } catch (error) {
      console.error(
        "[Assinatura] Falha ao salvar:",
        error
      );


      setErro(
        error?.message ||
        "Não foi possível salvar a assinatura."
      );
    } finally {
      setSalvando(false);
    }
  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <section className="novo-recebimento-assinatura">

      <header className="novo-recebimento-assinatura__header">
        <div>
          <h4 className="novo-recebimento-assinatura__title">
            Assinatura do entregador
          </h4>

          <p className="novo-recebimento-assinatura__description">
            Opcional durante o recebimento. Quando exigida pelo
            condomínio e não coletada, o processo continua e a
            ausência é registrada para acompanhamento.
          </p>
        </div>


        {assinaturaEnviada && (
          <span className="novo-recebimento-assinatura__status">
            Assinatura coletada
          </span>
        )}
      </header>


      {entregadorNome && (
        <div className="novo-recebimento-assinatura__signatario">
          <span>
            Signatário
          </span>

          <strong>
            {entregadorNome}
          </strong>
        </div>
      )}


      {/* ====================================================
          ORIENTAÇÃO MOBILE
      ==================================================== */}

      {!assinaturaEnviada && (
        <div className="novo-recebimento-assinatura__orientation">
          Para maior conforto no celular, utilize o aparelho na
          horizontal quando possível.
        </div>
      )}


      {/* ====================================================
          CANVAS
      ==================================================== */}

      {!assinaturaEnviada ? (
        <div
          ref={
            containerRef
          }
          className="novo-recebimento-assinatura__canvas-wrap"
        >
          <canvas
            ref={
              canvasRef
            }
            className="novo-recebimento-assinatura__canvas"
            aria-label="Área para assinatura do entregador"
            onPointerDown={
              handlePointerDown
            }
            onPointerMove={
              handlePointerMove
            }
            onPointerUp={
              finalizarDesenho
            }
            onPointerCancel={
              finalizarDesenho
            }
            onPointerLeave={
              finalizarDesenho
            }
          />


          {!possuiTraco && (
            <div
              className="novo-recebimento-assinatura__placeholder"
              aria-hidden="true"
            >
              Assine nesta área
            </div>
          )}
        </div>
      ) : (
        <div className="novo-recebimento-assinatura__saved">
          <div className="novo-recebimento-assinatura__saved-icon">
            ✓
          </div>

          <div>
            <strong>
              Assinatura armazenada
            </strong>

            <span>
              A evidência foi protegida e vinculada a este
              recebimento.
            </span>
          </div>
        </div>
      )}


      {/* ====================================================
          ERRO
      ==================================================== */}

      {erro && (
        <div
          className="novo-recebimento-feedback novo-recebimento-feedback--error"
          role="alert"
        >
          {erro}
        </div>
      )}


      {/* ====================================================
          AÇÕES
      ==================================================== */}

      <div className="novo-recebimento-assinatura__actions">

        <button
          type="button"
          className="novo-recebimento-button novo-recebimento-button--secondary"
          disabled={
            disabled ||
            salvando ||
            (
              !possuiTraco &&
              !assinaturaEnviada
            )
          }
          onClick={
            handleLimpar
          }
        >
          {assinaturaEnviada
            ? "Refazer assinatura"
            : "Limpar"}
        </button>


        {!assinaturaEnviada && (
          <button
            type="button"
            className="novo-recebimento-button novo-recebimento-button--primary"
            disabled={
              disabled ||
              salvando ||
              !possuiTraco
            }
            onClick={
              handleSalvar
            }
          >
            {salvando
              ? "Salvando assinatura…"
              : "Salvar assinatura"}
          </button>
        )}

      </div>

    </section>
  );
}