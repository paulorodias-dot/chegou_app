import {
  ArrowRight,
  CirclePlay,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

import heroBackground from "../assets/hero/hero-parceiros-background.webp";
import mascoteParceiros from "../assets/hero/mascote-parceiros.png";

import seloNivel1 from "../../assets/selos/parceiro-nivel-1.png";

import "./ParceirosHero.css";

const HERO_HIGHLIGHTS = [
  {
    icon: Users,
    title: "Público qualificado",
    description:
      "Moradores com alto potencial de interesse e contratação.",
  },
  {
    icon: Target,
    title: "Segmentação inteligente",
    description:
      "Apareça para quem realmente importa, na sua região.",
  },
  {
    icon: TrendingUp,
    title: "Resultados acompanhados",
    description:
      "Mais visibilidade, contatos e oportunidades para sua empresa.",
  },
];

export default function ParceirosHero() {
  return (
    <section
      id="inicio"
      className="parceiros-hero"
      aria-labelledby="parceiros-hero-title"
      style={{
        "--partner-hero-background":
          `url("${heroBackground}")`,
      }}
    >
      <div
        className="parceiros-hero__background"
        aria-hidden="true"
      />

      <div className="parceiros-hero__inner">
        <div className="parceiros-hero__content">
          <h1
            id="parceiros-hero-title"
            className="parceiros-hero__title"
          >
            Conecte sua empresa a{" "}
            <strong>
              novos clientes em condomínios
            </strong>
            .
          </h1>

          <p className="parceiros-hero__description">
            Divulgue seus produtos e serviços para uma
            audiência qualificada, com segurança,
            credibilidade e resultados reais.
          </p>

          <div className="parceiros-hero__actions">
            <a
              className="parceiros-hero__cta parceiros-hero__cta--primary"
              href="#quero-ser-parceiro"
            >
              Quero ser Parceiro

              <ArrowRight
                size={17}
                strokeWidth={1.9}
              />
            </a>

            <a
              className="parceiros-hero__cta parceiros-hero__cta--secondary"
              href="#como-funciona"
            >
              <CirclePlay
                size={18}
                strokeWidth={1.8}
              />

              Ver como funciona
            </a>
          </div>

          <div className="parceiros-hero__highlights">
            {HERO_HIGHLIGHTS.map(
              ({
                icon: Icon,
                title,
                description,
              }) => (
                <article
                  key={title}
                  className="parceiros-hero__highlight"
                >
                  <div className="parceiros-hero__highlight-icon">
                    <Icon
                      size={24}
                      strokeWidth={1.65}
                    />
                  </div>

                  <div className="parceiros-hero__highlight-copy">
                    <h2>
                      {title}
                    </h2>

                    <p>
                      {description}
                    </p>
                  </div>
                </article>
              ),
            )}
          </div>
        </div>

        <div
          className="parceiros-hero__visual"
          aria-hidden="true"
        >
          <div className="parceiros-hero__mascot-glow" />

          <img
            className="parceiros-hero__mascot"
            src={mascoteParceiros}
            alt=""
          />

          <div className="parceiros-hero__program-card">
            <img
              className="parceiros-hero__program-seal"
              src={seloNivel1}
              alt=""
            />

            <div className="parceiros-hero__program-content">
              <span className="parceiros-hero__program-label">
                Programa Parceiros
              </span>

              <strong>
                Chegou!
              </strong>

              <p>
                Evolua no programa,
                conquiste níveis e amplie
                seus benefícios.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}