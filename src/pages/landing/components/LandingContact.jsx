import {
  ArrowRight,
  Mail,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";

import "./LandingContact.css";

export default function LandingContact() {
  function abrirWhatsapp() {
    window.open(
      "https://wa.me/SEUNUMERO",
      "_blank",
      "noopener,noreferrer"
    );
  }

  function abrirEmail() {
    window.location.href =
      "mailto:SEUEMAIL@DOMINIO.COM";
  }

  return (
    <section
      id="contato"
      className="landing-contact"
      aria-labelledby="landing-contact-title"
    >
      <div className="landing-contact__container">
        <div className="landing-contact__content">
          <span className="landing-contact__eyebrow">
            FALE COM A EQUIPE CHEGOU!
          </span>

          <h2 id="landing-contact-title">
            Quer conhecer melhor o Sistema Chegou! para o seu{" "}
            <span>condomínio?</span>
          </h2>

          <p>
            Entre em contato pelos nossos canais. Podemos entender
            a necessidade do seu condomínio e orientar sobre
            assinaturas, orçamento, módulos e implantação.
          </p>

          <div className="landing-contact__actions">
            <button
              type="button"
              className="landing-contact__primary-action"
              onClick={abrirWhatsapp}
            >
              <MessageCircle
                size={19}
                strokeWidth={2}
                aria-hidden="true"
              />

              Falar pelo WhatsApp

              <ArrowRight
                size={17}
                aria-hidden="true"
              />
            </button>

            <button
              type="button"
              className="landing-contact__secondary-action"
              onClick={abrirEmail}
            >
              <Mail
                size={18}
                strokeWidth={2}
                aria-hidden="true"
              />

              Enviar um e-mail
            </button>
          </div>

          <div className="landing-contact__note">
            <ShieldCheck
              size={18}
              strokeWidth={1.9}
              aria-hidden="true"
            />

            <span>
              Seus dados de contato serão utilizados apenas para
              atender sua solicitação.
            </span>
          </div>
        </div>

        <aside className="landing-contact__panel">
          <span className="landing-contact__panel-label">
            COMO PODEMOS AJUDAR?
          </span>

          <div className="landing-contact__panel-items">
            <article>
              <strong>Assinaturas</strong>
              <p>
                Conheça as opções disponíveis para o seu condomínio.
              </p>
            </article>

            <article>
              <strong>Orçamento</strong>
              <p>
                Solicite uma proposta de acordo com a necessidade
                da operação.
              </p>
            </article>

            <article>
              <strong>Módulos</strong>
              <p>
                Entenda quais recursos poderão complementar a
                solução escolhida.
              </p>
            </article>

            <article>
              <strong>Programa de Parceiros</strong>
              <p>
                Empresas e prestadores também poderão conhecer as
                oportunidades do ecossistema Chegou!.
              </p>
            </article>
          </div>
        </aside>
      </div>
    </section>
  );
}