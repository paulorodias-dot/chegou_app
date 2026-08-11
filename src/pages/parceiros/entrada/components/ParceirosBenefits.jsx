import {
  Building2,
  Users,
  Star,
  ChartNoAxesCombined,
  CircleDollarSign,
  ShieldCheck,
} from "lucide-react";

import "./ParceirosBenefits.css";

const BENEFITS = [
  {
    icon: Building2,
    title: "Acesso a condomínios",
    description:
      "Divulgue sua empresa em condomínios da sua região.",
  },
  {
    icon: Users,
    title: "Público qualificado",
    description:
      "Apresente seu negócio para pessoas realmente relevantes para sua atuação.",
  },
  {
    icon: Star,
    title: "Avaliações que geram confiança",
    description:
      "Construa reputação transparente e fortaleça a confiança no seu negócio.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Resultados reais",
    description:
      "Acompanhe alcance, interações, contatos e desempenho das suas campanhas.",
  },
  {
    icon: CircleDollarSign,
    title: "Créditos CHG",
    description:
      "Utilize seus créditos conforme as regras vigentes e sempre com sua autorização.",
  },
  {
    icon: ShieldCheck,
    title: "Programa de níveis",
    description:
      "Evolua no Programa Parceiros e conquiste novos benefícios e destaque.",
  },
];

export default function ParceirosBenefits() {
  return (
    <section
      id="vantagens"
      className="parceiros-benefits"
      aria-labelledby="parceiros-benefits-title"
    >
      <div className="parceiros-benefits__inner">
        <header className="parceiros-benefits__header">
          <h2
            id="parceiros-benefits-title"
            className="parceiros-benefits__title"
          >
            Por que ser parceiro do Sistema Chegou!?
          </h2>

          <p className="parceiros-benefits__subtitle">
            Mais presença, confiança e oportunidades dentro do
            ecossistema Chegou!.
          </p>
        </header>

        <div className="parceiros-benefits__grid">
          {BENEFITS.map(
            ({
              icon: Icon,
              title,
              description,
            }) => (
              <article
                key={title}
                className="parceiros-benefits__item"
              >
                <div className="parceiros-benefits__icon-box">
                  <Icon
                    size={25}
                    strokeWidth={1.7}
                    aria-hidden="true"
                  />
                </div>

                <h3 className="parceiros-benefits__item-title">
                  {title}
                </h3>

                <p className="parceiros-benefits__item-description">
                  {description}
                </p>
              </article>
            ),
          )}
        </div>
      </div>
    </section>
  );
}