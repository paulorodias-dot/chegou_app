import {
  ArrowRight,
  Building2,
  HeartHandshake,
  MapPin,
  Store,
  UsersRound,
} from "lucide-react";

import parceirosImage from "../../../assets/landing/partners/landing-parceiros.png";

import "./LandingPartners.css";

export default function LandingPartners() {
  function rolarParaContato() {
    document
      .getElementById("contato")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  return (
    <section
      id="parceiros"
      className="landing-partners"
      aria-labelledby="landing-partners-title"
    >
      <div className="landing-partners__container">
        <div className="landing-partners__visual">
          <div className="landing-partners__image-shell">
            <img
              src={parceirosImage}
              alt=""
              className="landing-partners__image"
              loading="lazy"
            />
          </div>
        </div>

        <div className="landing-partners__content">
          <span className="landing-partners__eyebrow">
            PROGRAMA DE PARCEIROS
          </span>

          <h2 id="landing-partners-title">
            Mais conveniência para os moradores e{" "}
            <span>mais valor para o condomínio</span>
          </h2>

          <p className="landing-partners__description">
            O Programa de Parceiros Chegou! aproxima o condomínio de
            empresas, profissionais e pequenos negócios que podem oferecer
            produtos, serviços e oportunidades relevantes para a comunidade.
          </p>

          <div className="landing-partners__benefits">
            <article>
              <div
                className="landing-partners__benefit-icon"
                aria-hidden="true"
              >
                <Store size={21} strokeWidth={1.9} />
              </div>

              <div>
                <h3>Comércio e serviços mais próximos</h3>

                <p>
                  Empresas e profissionais podem apresentar soluções úteis
                  para a rotina dos moradores.
                </p>
              </div>
            </article>

            <article>
              <div
                className="landing-partners__benefit-icon"
                aria-hidden="true"
              >
                <MapPin size={21} strokeWidth={1.9} />
              </div>

              <div>
                <h3>Oportunidades locais</h3>

                <p>
                  A plataforma pode aproximar moradores de negócios do
                  bairro, da região e de serviços online.
                </p>
              </div>
            </article>

            <article>
              <div
                className="landing-partners__benefit-icon"
                aria-hidden="true"
              >
                <UsersRound size={21} strokeWidth={1.9} />
              </div>

              <div>
                <h3>Experiência pensada para a comunidade</h3>

                <p>
                  A proposta é agregar conveniência sem transformar a
                  experiência do condomínio em publicidade invasiva.
                </p>
              </div>
            </article>
          </div>

          <div className="landing-partners__actions">
            <button
              type="button"
              className="landing-partners__primary-action"
              onClick={rolarParaContato}
            >
              Conhecer o Programa de Parceiros

              <ArrowRight
                size={17}
                aria-hidden="true"
              />
            </button>
          </div>

          <div className="landing-partners__business-callout">
            <HeartHandshake
              size={22}
              strokeWidth={1.9}
              aria-hidden="true"
            />

            <div>
              <strong>
                Possui uma empresa ou presta serviços?
              </strong>

              <p>
                O Sistema Chegou! também está preparando oportunidades para
                quem deseja apresentar seu produto ou serviço dentro do
                ecossistema da plataforma.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        className="landing-partners__footer-note"
        aria-hidden="true"
      >
        <Building2 size={18} />
        <span>
          Condomínio, moradores e parceiros conectados em um mesmo
          ecossistema.
        </span>
      </div>
    </section>
  );
}