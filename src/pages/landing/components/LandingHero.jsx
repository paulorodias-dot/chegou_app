import {
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";

import mascoteHero from "../../../assets/landing/hero/landing-hero-mascote.png";

import "./LandingHero.css";

export default function LandingHero() {
  function navegarParaSecao(id) {
    const elemento = document.getElementById(id);

    if (!elemento) {
      return;
    }

    elemento.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <section
      className="landing-hero"
      id="inicio"
      aria-labelledby="landing-hero-title"
    >
      <div className="landing-hero__background" aria-hidden="true" />

      <div className="landing-hero__container">
        <div className="landing-hero__content">
          <span className="landing-hero__eyebrow">
            TECNOLOGIA PARA O SEU CONDOMÍNIO
          </span>

          <h1
            id="landing-hero-title"
            className="landing-hero__title"
          >
            Gestão inteligente de encomendas para condomínios que querem{" "}
            <span>mais organização e segurança.</span>
          </h1>

          <p className="landing-hero__description">
            O Sistema Chegou! conecta administração, portaria e
            moradores em uma experiência simples, organizada e
            segura para o dia a dia do condomínio na gestão da sua encomenda.
          </p>

          <div className="landing-hero__actions">
            <button
              type="button"
              className="landing-hero__primary-action"
              onClick={() => navegarParaSecao("recursos")}
            >
              Conhecer o Sistema

              <ArrowRight
                size={18}
                strokeWidth={2.2}
                aria-hidden="true"
              />
            </button>

            <button
              type="button"
              className="landing-hero__secondary-action"
              onClick={() => navegarParaSecao("contato")}
            >
              <MessageCircle
                size={18}
                strokeWidth={2.1}
                aria-hidden="true"
              />

              Falar com a Equipe
            </button>
          </div>

          <div className="landing-hero__partners">
            <span>
              Conheça também o programa para empresas e prestadores de serviços:
            </span>

            <button
              type="button"
              className="landing-hero__partners-link"
              onClick={() => {
                document
                  .getElementById("parceiros")
                  ?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
              }}
            >
              Seja um Parceiro Chegou!
              <span aria-hidden="true">→</span>
            </button>
          </div>

          <div
            className="landing-hero__trust"
            aria-label="Diferenciais do Sistema Chegou!"
          >
            <span>
              <CheckCircle2
                size={17}
                aria-hidden="true"
              />
              Operação organizada
            </span>

            <span>
              <ShieldCheck
                size={17}
                aria-hidden="true"
              />
              Informações protegidas
            </span>
          </div>
        </div>

            <div className="landing-hero__visual">
                <div
                    className="landing-hero__image-shape"
                    aria-hidden="true"
                >
                    <img
                    src={mascoteHero}
                    alt=""
                    className="landing-hero__mascot"
                    width="900"
                    height="620"
                    fetchPriority="high"
                    />
                </div>
            </div>
      </div>
    </section>
  );
}