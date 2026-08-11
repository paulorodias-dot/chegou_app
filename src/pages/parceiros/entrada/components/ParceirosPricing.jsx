import { useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Info,
  ArrowRight,
} from "lucide-react";

import "./ParceirosPricing.css";

const PREVIEW_PRICES = {
  cidade: {
    "7": 89.9,
    "14": 139.9,
    "30": 249.9,
  },
  regiao: {
    "7": 119.9,
    "14": 189.9,
    "30": 329.9,
  },
  estadual: {
    "7": 179.9,
    "14": 279.9,
    "30": 469.9,
  },
};

const BENEFITS = [
  "Você saberá quanto investir antes de confirmar.",
  "Valores conforme período, abrangência e posicionamento.",
  "Use Créditos CHG se desejar, sempre com sua autorização.",
  "Pagamento e saldo diretamente no Portal Parceiro.",
  "Sem fidelidade e com total transparência.",
];

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function ParceirosPricing() {
  const [abrangencia, setAbrangencia] =
    useState("cidade");

  const [periodo, setPeriodo] =
    useState("30");

  const [posicionamento, setPosicionamento] =
    useState("sidebar-direita");

  const valorEstimado = useMemo(() => {
    const base =
      PREVIEW_PRICES[abrangencia]?.[periodo] ??
      249.9;

    const fatorPosicionamento =
      posicionamento === "sidebar-direita"
        ? 1
        : posicionamento === "destaque"
          ? 1.25
          : 0.9;

    return base * fatorPosicionamento;
  }, [
    abrangencia,
    periodo,
    posicionamento,
  ]);

  return (
    <section
      className="parceiros-pricing"
      aria-labelledby="parceiros-pricing-title"
    >
      <div className="parceiros-pricing__inner">
        <div className="parceiros-pricing__panel">
          <div className="parceiros-pricing__content">
            <div className="parceiros-pricing__intro">
              <h2
                id="parceiros-pricing-title"
                className="parceiros-pricing__title"
              >
                Valores e cobranças
              </h2>

              <p className="parceiros-pricing__lead">
                Transparência em cada detalhe.
              </p>

              <ul className="parceiros-pricing__benefits">
                {BENEFITS.map((benefit) => (
                  <li
                    key={benefit}
                    className="parceiros-pricing__benefit"
                  >
                    <span className="parceiros-pricing__check">
                      <Check
                        size={15}
                        strokeWidth={2.5}
                        aria-hidden="true"
                      />
                    </span>

                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="parceiros-pricing__simulator">
              <div className="parceiros-pricing__simulator-header">
                <div>
                  <h3>
                    Simulador de Campanha
                  </h3>

                  <p>
                    Configure um cenário para
                    visualizar uma estimativa.
                  </p>
                </div>

                <span className="parceiros-pricing__preview-badge">
                  Dados de Preview
                </span>
              </div>

              <div className="parceiros-pricing__simulator-grid">
                <label className="parceiros-pricing__field">
                  <span>Abrangência</span>

                  <div className="parceiros-pricing__select-wrap">
                    <select
                      value={abrangencia}
                      onChange={(event) =>
                        setAbrangencia(
                          event.target.value,
                        )
                      }
                    >
                      <option value="cidade">
                        Cidade
                      </option>

                      <option value="regiao">
                        Região
                      </option>

                      <option value="estadual">
                        Estado
                      </option>
                    </select>

                    <ChevronDown
                      size={14}
                      aria-hidden="true"
                    />
                  </div>
                </label>

                <label className="parceiros-pricing__field">
                  <span>Período</span>

                  <div className="parceiros-pricing__select-wrap">
                    <select
                      value={periodo}
                      onChange={(event) =>
                        setPeriodo(
                          event.target.value,
                        )
                      }
                    >
                      <option value="7">
                        7 dias
                      </option>

                      <option value="14">
                        14 dias
                      </option>

                      <option value="30">
                        30 dias
                      </option>
                    </select>

                    <ChevronDown
                      size={14}
                      aria-hidden="true"
                    />
                  </div>
                </label>

                <label className="parceiros-pricing__field">
                  <span>Posicionamento</span>

                  <div className="parceiros-pricing__select-wrap">
                    <select
                      value={posicionamento}
                      onChange={(event) =>
                        setPosicionamento(
                          event.target.value,
                        )
                      }
                    >
                      <option value="sidebar-direita">
                        Sidebar Direita
                      </option>

                      <option value="destaque">
                        Destaque
                      </option>

                      <option value="padrao">
                        Padrão
                      </option>
                    </select>

                    <ChevronDown
                      size={14}
                      aria-hidden="true"
                    />
                  </div>
                </label>

                <div className="parceiros-pricing__result">
                  <span className="parceiros-pricing__result-label">
                    Valor estimado
                  </span>

                  <strong>
                    {formatCurrency(
                      valorEstimado,
                    )}
                  </strong>

                  <small>
                    Simulação para preview
                  </small>
                </div>
              </div>

              <div className="parceiros-pricing__simulator-footer">
                <p>
                  O valor apresentado nesta
                  demonstração é ilustrativo.
                </p>

                <button
                  type="button"
                  className="parceiros-pricing__simulate-button"
                >
                  Simular valores

                  <ArrowRight
                    size={15}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="parceiros-pricing__commercial-notice">
            <Info
              size={17}
              strokeWidth={1.9}
              aria-hidden="true"
            />

            <p>
              O Sistema Chegou! não participa da
              negociação entre parceiro e cliente.
              As vendas são realizadas diretamente
              entre sua empresa e o cliente. O
              Sistema Chegou! não cobra comissão
              sobre vendas.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}