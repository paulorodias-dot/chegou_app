import {
  ArrowRight,
  Building2,
  Mail,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";

import "./ParceirosContact.css";

/*
 * PREVIEW:
 * Não inventamos contatos oficiais.
 *
 * Quando os canais forem homologados:
 *
 * email.value = "..."
 * email.enabled = true
 *
 * whatsapp.value = "55..."
 * whatsapp.enabled = true
 */
const CONTACT_CHANNELS = {
  email: {
    enabled: false,
    value: "",
  },

  whatsapp: {
    enabled: false,
    value: "",
  },
};

export default function ParceirosContact() {
  const emailHref =
    CONTACT_CHANNELS.email.enabled &&
    CONTACT_CHANNELS.email.value
      ? `mailto:${CONTACT_CHANNELS.email.value}`
      : null;

  const whatsappHref =
    CONTACT_CHANNELS.whatsapp.enabled &&
    CONTACT_CHANNELS.whatsapp.value
      ? `https://wa.me/${CONTACT_CHANNELS.whatsapp.value}`
      : null;

  return (
    <section
      id="contato"
      className="parceiros-contact"
      aria-labelledby="parceiros-contact-title"
    >
      <div className="parceiros-contact__inner">
        <div className="parceiros-contact__header">
          <span className="parceiros-contact__eyebrow">
            Fale com a gente
          </span>

          <h2
            id="parceiros-contact-title"
            className="parceiros-contact__title"
          >
            Quer saber mais sobre o Programa Parceiros?
          </h2>

          <p className="parceiros-contact__subtitle">
            Nossa equipe poderá orientar sua empresa sobre
            participação, campanhas, funcionamento e próximos
            passos.
          </p>
        </div>

        <div className="parceiros-contact__grid">
          <article className="parceiros-contact__card">
            <div className="parceiros-contact__icon">
              <Building2
                size={22}
                strokeWidth={1.7}
                aria-hidden="true"
              />
            </div>

            <div className="parceiros-contact__card-content">
              <h3>
                Quero ser Parceiro
              </h3>

              <p>
                Inicie sua solicitação de participação no
                Programa Parceiros do Sistema Chegou!.
              </p>

              <a
                href="#quero-ser-parceiro"
                className="parceiros-contact__action"
              >
                Solicitar participação

                <ArrowRight
                  size={15}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </a>
            </div>
          </article>

          <article className="parceiros-contact__card">
            <div className="parceiros-contact__icon">
              <Mail
                size={22}
                strokeWidth={1.7}
                aria-hidden="true"
              />
            </div>

            <div className="parceiros-contact__card-content">
              <h3>
                E-mail
              </h3>

              <p>
                Para dúvidas comerciais e informações sobre o
                Programa Parceiros.
              </p>

              {emailHref ? (
                <a
                  href={emailHref}
                  className="parceiros-contact__action"
                >
                  Enviar e-mail

                  <ArrowRight
                    size={15}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </a>
              ) : (
                <span className="parceiros-contact__pending">
                  Canal em configuração
                </span>
              )}
            </div>
          </article>

          <article className="parceiros-contact__card">
            <div className="parceiros-contact__icon">
              <MessageCircle
                size={22}
                strokeWidth={1.7}
                aria-hidden="true"
              />
            </div>

            <div className="parceiros-contact__card-content">
              <h3>
                WhatsApp
              </h3>

              <p>
                Canal rápido para orientações comerciais e
                dúvidas sobre participação.
              </p>

              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="parceiros-contact__action"
                >
                  Falar pelo WhatsApp

                  <ArrowRight
                    size={15}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </a>
              ) : (
                <span className="parceiros-contact__pending">
                  Canal em configuração
                </span>
              )}
            </div>
          </article>
        </div>

        <div className="parceiros-contact__security">
          <ShieldCheck
            size={20}
            strokeWidth={1.7}
            aria-hidden="true"
          />

          <div>
            <strong>
              Segurança e transparência
            </strong>

            <p>
              O Sistema Chegou! trabalha para proteger as
              informações do ecossistema e manter regras claras
              para participação, publicidade e relacionamento
              com parceiros.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}