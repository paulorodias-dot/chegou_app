import {
  ArrowRight,
  Sparkles,
} from "lucide-react";

import mascoteParceiros from "../assets/hero/mascote-parceiros.png";

import "./ParceirosFinalCta.css";

export default function ParceirosFinalCta() {
  return (
    <section
      id="quero-ser-parceiro"
      className="parceiros-final-cta"
      aria-labelledby="parceiros-final-cta-title"
    >
      <div className="parceiros-final-cta__inner">
        <div className="parceiros-final-cta__panel">
          <div className="parceiros-final-cta__content">
            <span className="parceiros-final-cta__eyebrow">
              <Sparkles
                size={15}
                strokeWidth={1.8}
                aria-hidden="true"
              />

              Programa Parceiros
            </span>

            <h2
              id="parceiros-final-cta-title"
              className="parceiros-final-cta__title"
            >
              Pronto para crescer com o Sistema Chegou!?
            </h2>

            <p className="parceiros-final-cta__description">
              Solicite sua participação no Programa Parceiros
              e prepare sua empresa para fazer parte de um
              ecossistema conectado a condomínios e novos clientes.
            </p>

            <div className="parceiros-final-cta__actions">
              <a
                href="#cadastro-parceiro"
                className="parceiros-final-cta__button parceiros-final-cta__button--primary"
              >
                Quero ser Parceiro

                <ArrowRight
                  size={16}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </a>

              <a
                href="#como-funciona"
                className="parceiros-final-cta__button parceiros-final-cta__button--secondary"
              >
                Rever como funciona
              </a>
            </div>

            <p className="parceiros-final-cta__notice">
              Participação sujeita à análise e às regras vigentes
              do Programa Parceiros.
            </p>
          </div>

          <div
            className="parceiros-final-cta__visual"
            aria-hidden="true"
          >
            <div className="parceiros-final-cta__glow" />

            <img
              className="parceiros-final-cta__mascot"
              src={mascoteParceiros}
              alt=""
            />
          </div>
        </div>
      </div>
    </section>
  );
}