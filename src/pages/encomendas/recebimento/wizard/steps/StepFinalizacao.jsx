import {
  useMemo,
  useState,
} from "react";

import {
  NOVO_RECEBIMENTO_TIPO_ASSINATURA,
} from "../constants";


// ============================================================
// SISTEMA CHEGOU!
// STEP — FINALIZAÇÃO
//
// Responsabilidades:
// - resumo do recebimento;
// - diferença de quantidade;
// - total de avarias;
// - justificativa operacional;
// - observações;
// - preparação da assinatura do Entregador.
//
// NÃO:
// - acessa Supabase;
// - grava Pré-Recebimento;
// - faz upload;
// - define retenção;
// - promove Encomenda Oficial.
// ============================================================


function formatarNumero(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return "—";
  }

  return String(valor);
}


function tentarOrientacaoHorizontal() {
  if (
    typeof screen === "undefined" ||
    !screen.orientation ||
    typeof screen.orientation.lock !==
      "function"
  ) {
    return Promise.resolve(false);
  }

  return screen.orientation
    .lock("landscape")
    .then(() => true)
    .catch(() => false);
}


export default function StepFinalizacao({
  operadorNome,

  entregadorNome,
  transportadoraNome,

  quantidadeInformada,
  quantidadeBipada,
  diferencaQuantidade,

  volumes = [],

  assinatura,

  observacoes = "",
  justificativaDivergencia = "",

  possuiDivergenciaQuantidade = false,

  onChangeAssinatura,
  onChangeObservacoes,
  onChangeJustificativaDivergencia,
}) {
  const [
    assinaturaAberta,
    setAssinaturaAberta,
  ] = useState(false);


  const quantidadeAvarias =
    useMemo(
      () =>
        volumes.filter(
          (volume) =>
            Boolean(volume?.avaria)
        ).length,
      [volumes]
    );


  const resumoDivergencia =
    useMemo(() => {
      if (
        diferencaQuantidade === null ||
        diferencaQuantidade === undefined
      ) {
        return "—";
      }

      if (diferencaQuantidade === 0) {
        return "Sem divergência";
      }

      if (diferencaQuantidade > 0) {
        return `+${diferencaQuantidade}`;
      }

      return String(
        diferencaQuantidade
      );
    }, [diferencaQuantidade]);


  const resumoQuantidadeClass =
    possuiDivergenciaQuantidade
      ? "novo-recebimento-summary__item--danger"
      : "novo-recebimento-summary__item--success";


  async function abrirAssinatura() {
    await tentarOrientacaoHorizontal();

    setAssinaturaAberta(true);
  }


  function fecharAssinatura() {
    setAssinaturaAberta(false);
  }


  function registrarAssinaturaEstrutural() {
    if (
      typeof onChangeAssinatura !==
      "function"
    ) {
      return;
    }

    /*
     * Estrutura temporária do frontend.
     *
     * A captura real em canvas, geração do arquivo,
     * SHA-256 e upload ao Storage serão conectados
     * posteriormente.
     */
    onChangeAssinatura({
      tipoAssinatura:
        NOVO_RECEBIMENTO_TIPO_ASSINATURA,

      nomeSignatario:
        entregadorNome || null,

      documentoMascarado:
        null,

      bucket:
        null,

      storagePath:
        null,

      hashSha256:
        null,

      mimeType:
        null,

      tamanhoBytes:
        null,

      metadata: {
        origem:
          "WIZARD_RECEBIMENTO_PORTARIA",
      },

      capturadaLocalmente: true,

      capturadaEm:
        new Date().toISOString(),
    });

    setAssinaturaAberta(false);
  }


  return (
    <section className="novo-recebimento-section">
      <header className="novo-recebimento-section__header">
        <h3 className="novo-recebimento-section__title">
          Conferência final
        </h3>

        <p className="novo-recebimento-section__description">
          Revise as informações antes de concluir o
          recebimento.
        </p>
      </header>


      {/* ====================================================
          RESUMO
      ==================================================== */}

      <div className="novo-recebimento-summary">
        <div className="novo-recebimento-summary__item">
          <span className="novo-recebimento-summary__label">
            Lote
          </span>

          <span className="novo-recebimento-summary__value">
            Será atribuído ao concluir
          </span>
        </div>


        <div className="novo-recebimento-summary__item">
          <span className="novo-recebimento-summary__label">
            Operador
          </span>

          <span className="novo-recebimento-summary__value">
            {operadorNome || "—"}
          </span>
        </div>


        <div
          className={
            `novo-recebimento-summary__item ${resumoQuantidadeClass}`
          }
        >
          <span className="novo-recebimento-summary__label">
            Quantidade informada
          </span>

          <span className="novo-recebimento-summary__value">
            {formatarNumero(
              quantidadeInformada
            )}
          </span>
        </div>


        <div
          className={
            `novo-recebimento-summary__item ${resumoQuantidadeClass}`
          }
        >
          <span className="novo-recebimento-summary__label">
            Quantidade capturada
          </span>

          <span className="novo-recebimento-summary__value">
            {formatarNumero(
              quantidadeBipada
            )}
          </span>
        </div>


        <div
          className={
            `novo-recebimento-summary__item ${
              possuiDivergenciaQuantidade
                ? "novo-recebimento-summary__item--danger"
                : "novo-recebimento-summary__item--success"
            }`
          }
        >
          <span className="novo-recebimento-summary__label">
            Diferença
          </span>

          <span className="novo-recebimento-summary__value">
            {resumoDivergencia}
          </span>
        </div>


        <div
          className={
            `novo-recebimento-summary__item ${
              quantidadeAvarias > 0
                ? "novo-recebimento-summary__item--warning"
                : ""
            }`
          }
        >
          <span className="novo-recebimento-summary__label">
            Avarias
          </span>

          <span className="novo-recebimento-summary__value">
            {quantidadeAvarias}
          </span>
        </div>
      </div>


      {/* ====================================================
          ENTREGADOR / TRANSPORTADORA
      ==================================================== */}

      <div className="novo-recebimento-grid">
        <div className="novo-recebimento-summary__item">
          <span className="novo-recebimento-summary__label">
            Entregador
          </span>

          <span className="novo-recebimento-summary__value">
            {entregadorNome || "—"}
          </span>
        </div>


        <div className="novo-recebimento-summary__item">
          <span className="novo-recebimento-summary__label">
            Transportadora
          </span>

          <span className="novo-recebimento-summary__value">
            {transportadoraNome || "—"}
          </span>
        </div>
      </div>


      {/* ====================================================
          DIVERGÊNCIA
      ==================================================== */}

      {possuiDivergenciaQuantidade && (
        <div className="novo-recebimento-observations">
          <div
            className="
              novo-recebimento-feedback
              novo-recebimento-feedback--warning
            "
            role="alert"
          >
            <div>
              <strong>
                Divergência de quantidade
              </strong>

              <p>
                O total capturado é diferente da
                quantidade informada pelo entregador.
              </p>
            </div>
          </div>


          <label className="novo-recebimento-field">
            <span className="novo-recebimento-field__label">
              Justificativa da divergência
            </span>

            <textarea
              className="novo-recebimento-textarea"
              value={
                justificativaDivergencia
              }
              onChange={(event) => {
                if (
                  typeof onChangeJustificativaDivergencia ===
                  "function"
                ) {
                  onChangeJustificativaDivergencia(
                    event.target.value
                  );
                }
              }}
              placeholder="Registre a justificativa operacional."
            />
          </label>
        </div>
      )}


      {/* ====================================================
          OBSERVAÇÕES
      ==================================================== */}

      <div className="novo-recebimento-observations">
        <label className="novo-recebimento-field">
          <span className="novo-recebimento-field__label">
            Observações do Recebimento
          </span>

          <textarea
            className="novo-recebimento-textarea"
            value={observacoes}
            onChange={(event) => {
              if (
                typeof onChangeObservacoes ===
                "function"
              ) {
                onChangeObservacoes(
                  event.target.value
                );
              }
            }}
            placeholder="Registre observações operacionais quando necessário."
          />
        </label>


        <div className="novo-recebimento-observations__hint">
          Quando este recebimento for uma continuação de
          outro lote já concluído, a referência poderá ser
          registrada aqui, por exemplo: “Continuação do lote
          LOTE-000123”.
        </div>
      </div>


      {/* ====================================================
          ASSINATURA
      ==================================================== */}

      <div className="novo-recebimento-signature">
        <div className="novo-recebimento-signature__header">
          <div>
            <h4 className="novo-recebimento-signature__title">
              Assinatura do Entregador
            </h4>

            <p className="novo-recebimento-signature__description">
              Em dispositivos compatíveis, a área de
              assinatura poderá utilizar a orientação
              horizontal para ampliar o espaço disponível.
            </p>
          </div>
        </div>


        {assinatura ? (
          <div
            className="
              novo-recebimento-feedback
              novo-recebimento-feedback--success
            "
            role="status"
          >
            <div>
              <strong>
                Assinatura registrada
              </strong>

              <p>
                A assinatura será vinculada ao
                Pré-Recebimento na conclusão.
              </p>
            </div>

            <button
              type="button"
              className="
                novo-recebimento-button
                novo-recebimento-button--secondary
              "
              onClick={() => {
                if (
                  typeof onChangeAssinatura ===
                  "function"
                ) {
                  onChangeAssinatura(
                    null
                  );
                }
              }}
            >
              Refazer
            </button>
          </div>
        ) : (
          <div className="novo-recebimento-signature__area">
            <div>
              <p>
                A assinatura ainda não foi coletada.
              </p>

              <button
                type="button"
                className="
                  novo-recebimento-button
                  novo-recebimento-button--primary
                "
                onClick={abrirAssinatura}
              >
                Assinar
              </button>
            </div>
          </div>
        )}
      </div>


      {/* ====================================================
          PAINEL ESTRUTURAL DE ASSINATURA
      ==================================================== */}

      {assinaturaAberta && (
        <div className="novo-recebimento-signature">
          <div className="novo-recebimento-signature__header">
            <div>
              <h4 className="novo-recebimento-signature__title">
                Área de assinatura
              </h4>

              <p className="novo-recebimento-signature__description">
                O dispositivo tentará utilizar a orientação
                horizontal quando o navegador permitir.
              </p>
            </div>
          </div>


          <div className="novo-recebimento-signature__area">
            Área preparada para o componente oficial de
            assinatura por toque.
          </div>


          <div className="novo-recebimento-navigation">
            <div className="novo-recebimento-navigation__left">
              <button
                type="button"
                className="
                  novo-recebimento-button
                  novo-recebimento-button--secondary
                "
                onClick={fecharAssinatura}
              >
                Voltar
              </button>
            </div>


            <div className="novo-recebimento-navigation__right">
              <button
                type="button"
                className="
                  novo-recebimento-button
                  novo-recebimento-button--primary
                "
                onClick={
                  registrarAssinaturaEstrutural
                }
              >
                Confirmar assinatura
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}