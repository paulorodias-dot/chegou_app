import {
  useMemo,
} from "react";

import AssinaturaRecebimentoPad
  from "../components/AssinaturaRecebimentoPad";


// ============================================================
// SISTEMA CHEGOU!
// STEP — FINALIZAÇÃO
//
// Responsabilidades:
// - resumo do recebimento;
// - diferença de quantidade;
// - resumo de avarias;
// - resumo de evidências;
// - justificativa operacional;
// - observações;
// - assinatura real do Entregador.
//
// NÃO:
// - acessa Supabase diretamente;
// - grava Pré-Recebimento;
// - promove Encomenda Oficial;
// - decide retenção;
// - decide obrigatoriedade de assinatura;
// - decide obrigatoriedade de foto.
//
// A assinatura:
// - usa AssinaturaRecebimentoPad;
// - faz upload pelo service oficial;
// - ausência nunca bloqueia o recebimento.
//
// Avaria:
// - pode possuir foto agora ou depois;
// - foto pendente não bloqueia Concluir Recebimento;
// - poderá bloquear Entrada Oficial conforme backend.
// ============================================================


// ============================================================
// FORMATADORES
// ============================================================

function formatarNumero(
  valor
) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return "—";
  }

  return String(valor);
}


// ============================================================
// CONTAGENS DE AVARIA / EVIDÊNCIA
// ============================================================

function volumePossuiFotoAvaria(
  volume
) {
  return (
    volume?.evidencias ||
    []
  ).some(
    (evidencia) =>
      evidencia
        ?.tipoEvidencia ===
        "FOTO_AVARIA" &&
      Boolean(
        evidencia?.bucket &&
        evidencia?.storagePath
      )
  );
}


function volumePossuiFotoPendente(
  volume
) {
  if (!volume?.avaria) {
    return false;
  }


  /*
   * Se não existe foto válida no volume
   * e a avaria foi marcada para DEPOIS,
   * existe pendência operacional.
   *
   * Mesmo que fotoMomento ainda não exista
   * em recebimentos locais antigos, a ausência
   * de evidência continua sendo mostrada como pendência.
   */
  return !volumePossuiFotoAvaria(
    volume
  );
}


// ============================================================
// COMPONENTE
// ============================================================

export default function StepFinalizacao({
  condominioId,
  clientReceiptId,

  operadorNome,
  entregadorNome,
  transportadoraNome,

  quantidadeInformada,
  quantidadeBipada,
  diferencaQuantidade,

  volumes = [],
  assinatura,

  observacoes,
  justificativaDivergencia,
  possuiDivergenciaQuantidade,

  onChangeAssinatura,
  onChangeObservacoes,
  onChangeJustificativaDivergencia,
}) {

  // ==========================================================
  // AVARIAS
  // ==========================================================

  const volumesComAvaria =
    useMemo(
      () =>
        (
          volumes ||
          []
        ).filter(
          (volume) =>
            Boolean(
              volume?.avaria
            )
        ),
      [
        volumes,
      ]
    );


  const quantidadeAvarias =
    volumesComAvaria.length;


  const quantidadeFotosAvaria =
    useMemo(
      () =>
        volumesComAvaria.filter(
          volumePossuiFotoAvaria
        ).length,
      [
        volumesComAvaria,
      ]
    );


  const quantidadeFotosPendentes =
    useMemo(
      () =>
        volumesComAvaria.filter(
          volumePossuiFotoPendente
        ).length,
      [
        volumesComAvaria,
      ]
    );


  // ==========================================================
  // DIVERGÊNCIA
  // ==========================================================

  const resumoDivergencia =
    useMemo(
      () => {
        if (
          diferencaQuantidade ===
            null ||
          diferencaQuantidade ===
            undefined
        ) {
          return "—";
        }


        if (
          diferencaQuantidade ===
          0
        ) {
          return "Sem divergência";
        }


        if (
          diferencaQuantidade >
          0
        ) {
          return (
            `+${diferencaQuantidade}`
          );
        }


        return String(
          diferencaQuantidade
        );
      },
      [
        diferencaQuantidade,
      ]
    );


  const resumoQuantidadeClass =
    possuiDivergenciaQuantidade
      ? "novo-recebimento-summary__item--danger"
      : "novo-recebimento-summary__item--success";


  // ==========================================================
  // ASSINATURA
  // ==========================================================

  const assinaturaColetada =
    Boolean(
      assinatura?.bucket &&
      assinatura?.storagePath
    );


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <section className="novo-recebimento-section">

      {/* ====================================================
          HEADER
      ==================================================== */}

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
          RESUMO PRINCIPAL
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


        <div
          className={
            `novo-recebimento-summary__item ${
              quantidadeFotosPendentes > 0
                ? "novo-recebimento-summary__item--warning"
                : quantidadeAvarias > 0
                  ? "novo-recebimento-summary__item--success"
                  : ""
            }`
          }
        >
          <span className="novo-recebimento-summary__label">
            Fotos de avaria
          </span>

          <span className="novo-recebimento-summary__value">
            {quantidadeAvarias === 0
              ? "Não aplicável"
              : `${quantidadeFotosAvaria}/${quantidadeAvarias}`}
          </span>
        </div>


        <div
          className={
            `novo-recebimento-summary__item ${
              assinaturaColetada
                ? "novo-recebimento-summary__item--success"
                : ""
            }`
          }
        >
          <span className="novo-recebimento-summary__label">
            Assinatura
          </span>

          <span className="novo-recebimento-summary__value">
            {assinaturaColetada
              ? "Coletada"
              : "Não coletada"}
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
          AVARIAS
      ==================================================== */}

      {quantidadeAvarias > 0 && (
        <div className="novo-recebimento-observations">

          <div
            className={
              `
                novo-recebimento-feedback
                ${
                  quantidadeFotosPendentes > 0
                    ? "novo-recebimento-feedback--warning"
                    : "novo-recebimento-feedback--success"
                }
              `
            }
            role="status"
          >
            <div>
              <strong>
                {quantidadeAvarias === 1
                  ? "1 volume com avaria"
                  : `${quantidadeAvarias} volumes com avaria`}
              </strong>

              <p>
                {quantidadeFotosPendentes > 0
                  ? (
                    quantidadeFotosPendentes === 1
                      ? "Existe 1 fotografia de avaria pendente. O recebimento poderá ser concluído; a pendência será tratada antes da Entrada Oficial quando exigida."
                      : `Existem ${quantidadeFotosPendentes} fotografias de avaria pendentes. O recebimento poderá ser concluído; as pendências serão tratadas antes da Entrada Oficial quando exigidas.`
                  )
                  : "Todas as avarias possuem fotografia anexada."}
              </p>
            </div>
          </div>


          <div className="novo-recebimento-summary">

            {volumesComAvaria.map(
              (
                volume,
                index
              ) => {
                const avaria =
                  volume.avaria;

                const possuiFoto =
                  volumePossuiFotoAvaria(
                    volume
                  );


                return (
                  <div
                    key={
                      volume.clientVolumeId ||
                      `avaria-${index}`
                    }
                    className={
                      `novo-recebimento-summary__item ${
                        possuiFoto
                          ? "novo-recebimento-summary__item--success"
                          : "novo-recebimento-summary__item--warning"
                      }`
                    }
                  >
                    <span className="novo-recebimento-summary__label">
                      Volume{" "}
                      {volume.numeroVolume ||
                        index + 1}
                    </span>

                    <span className="novo-recebimento-summary__value">
                      {avaria?.tipoOcorrencia ||
                        "Avaria registrada"}
                    </span>

                    <small className="novo-recebimento-field__helper">
                      {possuiFoto
                        ? "Foto anexada"
                        : "Foto pendente"}
                    </small>
                  </div>
                );
              }
            )}

          </div>

        </div>
      )}


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
            value={
              observacoes
            }
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
          ASSINATURA REAL
      ==================================================== */}

      <AssinaturaRecebimentoPad
        condominioId={
          condominioId
        }

        clientReceiptId={
          clientReceiptId
        }

        entregadorNome={
          entregadorNome
        }

        assinatura={
          assinatura
        }

        onChange={
          onChangeAssinatura
        }
      />


      {/* ====================================================
          ORIENTAÇÃO OPERACIONAL FINAL
      ==================================================== */}

      <div
        className="
          novo-recebimento-feedback
          novo-recebimento-feedback--info
        "
        role="status"
      >
        <div>
          <strong>
            Após concluir
          </strong>

          <p>
            O lote ficará concluído no Recebimento. A Entrada
            Oficial dos volumes será realizada na etapa
            operacional seguinte.
          </p>
        </div>
      </div>

    </section>
  );
}