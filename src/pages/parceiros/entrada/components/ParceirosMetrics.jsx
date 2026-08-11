import {
  Building2,
  UsersRound,
  Megaphone,
  MousePointerClick,
} from "lucide-react";

import "./ParceirosMetrics.css";

const PREVIEW_METRICS = [
  {
    icon: Building2,
    value: "342",
    label: "Condomínios",
    description:
      "Condomínios representados neste Preview.",
  },
  {
    icon: UsersRound,
    value: "118.560",
    label: "Usuários alcançáveis",
    description:
      "Base demonstrativa de usuários do ecossistema.",
  },
  {
    icon: Megaphone,
    value: "1.940",
    label: "Campanhas",
    description:
      "Campanhas consideradas apenas para demonstração.",
  },
  {
    icon: MousePointerClick,
    value: "54.320",
    label: "Interações",
    description:
      "Interações simuladas para visualização da experiência.",
  },
];

export default function ParceirosMetrics() {
  return (
    <section
      className="parceiros-metrics"
      aria-labelledby="parceiros-metrics-title"
    >
      <div className="parceiros-metrics__inner">
        <header className="parceiros-metrics__header">
          <div>
            <span className="parceiros-metrics__eyebrow">
              Ecossistema Chegou!
            </span>

            <h2
              id="parceiros-metrics-title"
              className="parceiros-metrics__title"
            >
              Um ecossistema que cresce junto com
              nossos parceiros.
            </h2>
          </div>

          <span className="parceiros-metrics__preview">
            Dados de Preview
          </span>
        </header>

        <div className="parceiros-metrics__grid">
          {PREVIEW_METRICS.map(
            ({
              icon: Icon,
              value,
              label,
              description,
            }) => (
              <article
                key={label}
                className="parceiros-metrics__card"
              >
                <div className="parceiros-metrics__icon">
                  <Icon
                    size={22}
                    strokeWidth={1.7}
                    aria-hidden="true"
                  />
                </div>

                <div className="parceiros-metrics__content">
                  <strong className="parceiros-metrics__value">
                    {value}
                  </strong>

                  <span className="parceiros-metrics__label">
                    {label}
                  </span>

                  <p className="parceiros-metrics__description">
                    {description}
                  </p>
                </div>
              </article>
            ),
          )}
        </div>

        <p className="parceiros-metrics__footnote">
          Os números apresentados nesta etapa são
          exclusivamente demonstrativos. Na publicação,
          somente indicadores provenientes de dados reais
          e autorizados serão exibidos.
        </p>
      </div>
    </section>
  );
}