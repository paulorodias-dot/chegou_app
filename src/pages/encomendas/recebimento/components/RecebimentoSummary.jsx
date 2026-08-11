import {
  AlertTriangle,
  Box,
  PackageCheck,
  ShieldAlert,
} from "lucide-react";

const SUMMARY_ITEMS = [
  {
    id: "recebimentos-hoje",
    label: "Recebimentos hoje",
    value: "—",
    helper: "Lotes finalizados no dia",
    icon: PackageCheck,
    tone: "blue",
  },
  {
    id: "aguardando-processamento",
    label: "Aguardando processamento",
    value: "—",
    helper: "Pré-recebimentos pendentes",
    icon: Box,
    tone: "green",
  },
  {
    id: "com-divergencia",
    label: "Com divergência",
    value: "—",
    helper: "Quantidade divergente",
    icon: AlertTriangle,
    tone: "orange",
  },
  {
    id: "com-avaria",
    label: "Com avaria",
    value: "—",
    helper: "Volumes com ocorrência",
    icon: ShieldAlert,
    tone: "red",
  },
];

export default function RecebimentoSummary() {
  return (
    <section
      className="recebimento-summary"
      aria-label="Resumo operacional"
    >
      {SUMMARY_ITEMS.map((item) => {
        const Icon = item.icon;

        return (
          <article
            key={item.id}
            className={`recebimento-summary-card recebimento-summary-card--${item.tone}`}
          >
            <div className="recebimento-summary-card__icon">
              <Icon
                size={18}
                strokeWidth={2}
                aria-hidden="true"
              />
            </div>

            <div className="recebimento-summary-card__content">
              <span className="recebimento-summary-card__value">
                {item.value}
              </span>

              <span className="recebimento-summary-card__label">
                {item.label}
              </span>

              <span className="recebimento-summary-card__helper">
                {item.helper}
              </span>
            </div>
          </article>
        );
      })}
    </section>
  );
}