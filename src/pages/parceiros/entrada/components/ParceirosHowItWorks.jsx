import {
  BadgeCheck,
  ChartNoAxesCombined,
  Megaphone,
  Store,
  UserRoundCheck,
} from "lucide-react";

import "./ParceirosHowItWorks.css";

const STEPS = [
  {
    number: "1",
    icon: UserRoundCheck,
    title: "Solicite seu cadastro",
    description:
      "Preencha as informações da sua empresa e envie sua solicitação.",
  },
  {
    number: "2",
    icon: BadgeCheck,
    title: "Análise e aprovação",
    description:
      "Nossa equipe avalia sua empresa conforme as regras do Programa Parceiros.",
  },
  {
    number: "3",
    icon: Store,
    title: "Ative seu perfil",
    description:
      "Após a aprovação, configure seus dados, categorias e informações comerciais.",
  },
  {
    number: "4",
    icon: Megaphone,
    title: "Crie suas campanhas",
    description:
      "Escolha onde aparecer, defina público e período e envie sua campanha.",
  },
  {
    number: "5",
    icon: ChartNoAxesCombined,
    title: "Acompanhe e evolua",
    description:
      "Monitore seus resultados, receba avaliações e evolua dentro do programa.",
  },
];

export default function ParceirosHowItWorks() {
  return (
    <section
      id="como-funciona"
      className="parceiros-how"
      aria-labelledby="parceiros-how-title"
    >
      <div className="parceiros-how__inner">
        <header className="parceiros-how__header">
          <h2
            id="parceiros-how-title"
            className="parceiros-how__title"
          >
            Como funciona
          </h2>

          <p className="parceiros-how__subtitle">
            Simples, transparente e seguro.
          </p>
        </header>

        <div className="parceiros-how__flow">
          {STEPS.map(
            ({
              number,
              icon: Icon,
              title,
              description,
            }, index) => (
              <div
                className="parceiros-how__step-wrapper"
                key={number}
              >
                <article className="parceiros-how__step">
                  <div className="parceiros-how__step-top">
                    <span className="parceiros-how__number">
                      {number}
                    </span>

                    <div className="parceiros-how__icon">
                      <Icon
                        size={28}
                        strokeWidth={1.65}
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  <h3 className="parceiros-how__step-title">
                    {title}
                  </h3>

                  <p className="parceiros-how__step-description">
                    {description}
                  </p>
                </article>

                {index < STEPS.length - 1 && (
                  <div
                    className="parceiros-how__connector"
                    aria-hidden="true"
                  >
                    <span />
                    <b>›</b>
                  </div>
                )}
              </div>
            ),
          )}
        </div>
      </div>
    </section>
  );
}