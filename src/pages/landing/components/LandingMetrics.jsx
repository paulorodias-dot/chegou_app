import {
  BellRing,
  Building2,
  PackageCheck,
  ShieldCheck,
  Star,
  UsersRound,
} from "lucide-react";

import "./LandingMetrics.css";

const metricasPreview = [
  {
    id: "condominios",
    icon: Building2,
    value: "1.248",
    label: "Condomínios ativos",
  },
  {
    id: "usuarios",
    icon: UsersRound,
    value: "18.932",
    label: "Usuários na plataforma",
  },
  {
    id: "encomendas",
    icon: PackageCheck,
    value: "32.567",
    label: "Encomendas registradas",
  },
  {
    id: "avisos",
    icon: BellRing,
    value: "48.320",
    label: "Avisos enviados",
  },
  {
    id: "disponibilidade",
    icon: ShieldCheck,
    value: "99,9%",
    label: "Disponibilidade do sistema",
  },
];

export default function LandingMetrics() {
  return (
    <section
      className="landing-metrics"
      aria-label="Indicadores da plataforma"
    >
      <div className="landing-metrics__container">
        <p className="landing-metrics__title">
          O Chegou! já transforma a rotina de centenas de condomínios
        </p>

        <div className="landing-metrics__grid">
          {metricasPreview.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.id}
                className="landing-metrics__item"
              >
                <Icon
                  size={28}
                  strokeWidth={1.8}
                  aria-hidden="true"
                />

                <div className="landing-metrics__content">
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              </div>
            );
          })}

          <div className="landing-metrics__rating">
            <strong>4,8</strong>

            <div
              className="landing-metrics__stars"
              aria-label="Avaliação de preview"
            >
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  size={16}
                  fill="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              ))}
            </div>

            <span>Baseado em 126 avaliações</span>
          </div>
        </div>
      </div>
    </section>
  );
}