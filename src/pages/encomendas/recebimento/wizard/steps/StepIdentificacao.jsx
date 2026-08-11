export default function StepIdentificacao({
  identificacao,
  transportadoras = [],
  carregandoTransportadoras = false,
  erroTransportadoras = null,
  documentoObrigatorio = false,
  onChange,
}) {
  const entregadorNome =
    identificacao?.entregadorNome || "";

  const entregadorDocumento =
    identificacao?.entregadorDocumento || "";

  const transportadoraId =
    identificacao?.transportadoraId || "";

  const transportadoraNomeInformado =
    identificacao?.transportadoraNomeInformado || "";

  const transportadoraSelecionada =
    transportadoras.find(
      (item) => item?.id === transportadoraId
    ) || null;

  const selecionouOutras =
    Boolean(
      transportadoraSelecionada?.ehOutras ||
      transportadoraSelecionada?.isOutras ||
      transportadoraSelecionada?.codigo === "TRP-00022" ||
      transportadoraSelecionada?.business_id === "TRP-00022"
    );


  function atualizarCampo(campo, valor) {
    if (typeof onChange === "function") {
      onChange(campo, valor);
    }
  }


  function handleTransportadoraChange(event) {
    const novoId = event.target.value;

    const selecionada =
      transportadoras.find(
        (item) => item?.id === novoId
      ) || null;


    atualizarCampo(
      "transportadoraId",
      novoId
    );


    atualizarCampo(
      "transportadoraNome",
      selecionada?.nomeFantasia ||
        selecionada?.nome_fantasia ||
        selecionada?.nome ||
        ""
    );


    /*
     * Ao sair de "Outras Transportadoras",
     * limpamos apenas o campo textual auxiliar.
     */
    const novaEhOutras =
      Boolean(
        selecionada?.ehOutras ||
        selecionada?.isOutras ||
        selecionada?.codigo === "TRP-00022" ||
        selecionada?.business_id === "TRP-00022"
      );


    if (!novaEhOutras) {
      atualizarCampo(
        "transportadoraNomeInformado",
        ""
      );
    }
  }


  return (
    <section className="novo-recebimento-section">
      <header className="novo-recebimento-section__header">
        <h3 className="novo-recebimento-section__title">
          Identificação da entrega
        </h3>

        <p className="novo-recebimento-section__description">
          Informe os dados do entregador e selecione a
          transportadora responsável pela entrega.
        </p>
      </header>


      <div className="novo-recebimento-grid">
        <label className="novo-recebimento-field">
          <span className="novo-recebimento-field__label">
            Nome do Entregador
          </span>

          <input
            type="text"
            className="novo-recebimento-input"
            autoComplete="off"
            value={entregadorNome}
            onChange={(event) =>
              atualizarCampo(
                "entregadorNome",
                event.target.value
              )
            }
            placeholder="Informe o nome"
          />
        </label>


        <label className="novo-recebimento-field">
          <span className="novo-recebimento-field__label">
            Documento
            {!documentoObrigatorio && (
              <span
                className="novo-recebimento-field__optional"
              >
                {" "}
                (opcional)
              </span>
            )}
          </span>

          <input
            type="text"
            inputMode="numeric"
            className="novo-recebimento-input"
            autoComplete="off"
            value={entregadorDocumento}
            onChange={(event) =>
              atualizarCampo(
                "entregadorDocumento",
                event.target.value
              )
            }
            placeholder="Identificação do documento"
          />

          <small className="novo-recebimento-field__helper">
            {documentoObrigatorio
              ? "Solicitado conforme configuração do condomínio. A recusa do entregador não bloqueará o recebimento."
              : "Preenchimento conforme a política operacional do condomínio."}
          </small>
        </label>


        <label
          className="
            novo-recebimento-field
            novo-recebimento-field--full
          "
        >
          <span className="novo-recebimento-field__label">
            Transportadora
          </span>

          <select
            className="novo-recebimento-select"
            value={transportadoraId}
            onChange={handleTransportadoraChange}
            disabled={carregandoTransportadoras}
          >
            <option value="">
              {carregandoTransportadoras
                ? "Carregando transportadoras..."
                : "Selecione a transportadora"}
            </option>

            {transportadoras.map(
              (transportadora) => {
                const id =
                  transportadora?.id;

                const nome =
                  transportadora?.nomeFantasia ||
                  transportadora?.nome_fantasia ||
                  transportadora?.nome ||
                  "Transportadora";

                if (!id) {
                  return null;
                }

                return (
                  <option
                    key={id}
                    value={id}
                  >
                    {nome}
                  </option>
                );
              }
            )}
          </select>

          {erroTransportadoras && (
            <small
              className="
                novo-recebimento-field__helper
                novo-recebimento-field__helper--danger
              "
            >
              {erroTransportadoras}
            </small>
          )}
        </label>


        {selecionouOutras && (
          <label
            className="
              novo-recebimento-field
              novo-recebimento-field--full
            "
          >
            <span className="novo-recebimento-field__label">
              Nome da Transportadora
            </span>

            <input
              type="text"
              className="novo-recebimento-input"
              autoComplete="off"
              value={transportadoraNomeInformado}
              onChange={(event) =>
                atualizarCampo(
                  "transportadoraNomeInformado",
                  event.target.value
                )
              }
              placeholder="Informe o nome da transportadora"
            />

            <small className="novo-recebimento-field__helper">
              Esta informação será registrada junto ao
              recebimento para análise operacional posterior.
            </small>
          </label>
        )}
      </div>
    </section>
  );
}