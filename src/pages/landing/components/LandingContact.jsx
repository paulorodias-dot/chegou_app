import {
  ArrowRight,
  Mail,
  ShieldCheck,
} from "lucide-react";

import "./LandingContact.css";

const WHATSAPP_NUMERO = "5511922106522";

const WHATSAPP_MENSAGEM =
  "Olá! Conheci o Sistema Chegou! pelo site e gostaria de receber informações sobre o Plano Básico para o meu condomínio.";

const WHATSAPP_URL =
  `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(
    WHATSAPP_MENSAGEM
  )}`;

const WHATSAPP_ICONE =
  `${import.meta.env.BASE_URL}shared/brands/whatsapp.png`;

const EMAIL_COMERCIAL =
  "comercial@sistemachegou.com.br";

export default function LandingContact() {
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
            <a
              className="landing-contact__primary-action"
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Falar com a equipe do Sistema Chegou! pelo WhatsApp"
            >
              <img
                src={WHATSAPP_ICONE}
                alt=""
                width="19"
                height="19"
                aria-hidden="true"
                style={{
                  width: 19,
                  height: 19,
                  objectFit: "contain",
                  flexShrink: 0,
                }}
              />

              Falar pelo WhatsApp

              <ArrowRight
                size={17}
                aria-hidden="true"
              />
            </a>

            <a
              className="landing-contact__secondary-action"
              href={`mailto:${EMAIL_COMERCIAL}`}
              aria-label={`Enviar um e-mail para ${EMAIL_COMERCIAL}`}
            >
              <Mail
                size={18}
                strokeWidth={2}
                aria-hidden="true"
              />

              Enviar um e-mail
            </a>
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

            {/*
              PROGRAMA DE PARCEIROS

              Conteúdo temporariamente oculto.
              Reativar após a publicação oficial do programa.
            */}
          </div>
        </aside>
      </div>
    </section>
  );
}