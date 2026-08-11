import {
  ArrowRight,
  BadgeDollarSign,
  Boxes,
  Check,
  CreditCard,
  FileText,
  Sparkles,
} from "lucide-react";

import "./LandingCommercial.css";

export default function LandingCommercial() {
  function rolarPara(id) {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  return (
    <section
      id="assinaturas"
      className="landing-commercial"
      aria-labelledby="landing-commercial-title"
    >
      <div className="landing-commercial__container">
        <header className="landing-commercial__heading">
          <span className="landing-commercial__eyebrow">
            ASSINATURAS CHEGOU!
          </span>

          <h2 id="landing-commercial-title">
            Escolha uma solução que acompanhe{" "}
            <span>a realidade do seu condomínio</span>
          </h2>

          <p>
            Assinaturas mensais, recursos que podem evoluir com a sua
            operação e opções de módulos conforme as necessidades do
            condomínio.
          </p>
        </header>

        <div className="landing-commercial__grid">
          {/* PLANOS */}
          <article className="landing-commercial__card landing-commercial__card--featured">
            <div className="landing-commercial__card-top">
              <div
                className="landing-commercial__icon landing-commercial__icon--featured"
                aria-hidden="true"
              >
                <CreditCard size={25} strokeWidth={1.9} />
              </div>

              <span className="landing-commercial__badge">
                Contratação mensal
              </span>
            </div>

            <h3>Planos que cabem no seu orçamento</h3>

            <p>
              Escolha uma configuração compatível com o porte, a rotina e
              os recursos que fazem sentido para o seu condomínio.
            </p>

            <ul>
              <li>
                <Check size={17} aria-hidden="true" />
                Assinaturas exclusivamente mensais
              </li>

              <li>
                <Check size={17} aria-hidden="true" />
                Opções para diferentes necessidades
              </li>

              <li>
                <Check size={17} aria-hidden="true" />
                Estrutura preparada para crescer com o condomínio
              </li>
            </ul>

            <button
              type="button"
              className="landing-commercial__link"
              onClick={() => rolarPara("orcamento")}
            >
              Conhecer as opções
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </article>

          {/* ORÇAMENTO */}
          <article
            id="orcamento"
            className="landing-commercial__card"
          >
            <div
              className="landing-commercial__icon"
              aria-hidden="true"
            >
              <FileText size={25} strokeWidth={1.9} />
            </div>

            <h3>Orçamento para o seu condomínio</h3>

            <p>
              A proposta poderá considerar a estrutura do condomínio, os
              recursos desejados e as necessidades da operação.
            </p>

            <ul>
              <li>
                <Check size={17} aria-hidden="true" />
                Análise das necessidades
              </li>

              <li>
                <Check size={17} aria-hidden="true" />
                Proposta de acordo com a solução escolhida
              </li>

              <li>
                <BadgeDollarSign size={17} aria-hidden="true" />
                Preparado para cupom de indicação
              </li>
            </ul>

            <button
              type="button"
              className="landing-commercial__link"
              onClick={() => rolarPara("contato")}
            >
              Solicitar orçamento
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </article>

          {/* MÓDULOS */}
          <article
            id="modulos"
            className="landing-commercial__card"
          >
            <div
              className="landing-commercial__icon"
              aria-hidden="true"
            >
              <Boxes size={25} strokeWidth={1.9} />
            </div>

            <h3>Módulos para ampliar a plataforma</h3>

            <p>
              Alguns recursos poderão fazer parte da assinatura escolhida
              e outros poderão ser contratados conforme a necessidade.
            </p>

            <ul>
              <li>
                <Check size={17} aria-hidden="true" />
                Ative apenas o que fizer sentido
              </li>

              <li>
                <Check size={17} aria-hidden="true" />
                Amplie a solução conforme a operação evoluir
              </li>

              <li>
                <Sparkles size={17} aria-hidden="true" />
                Novos recursos poderão ser incorporados ao ecossistema
              </li>
            </ul>

            <button
              type="button"
              className="landing-commercial__link"
              onClick={() => rolarPara("recursos")}
            >
              Ver recursos da plataforma
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </article>
        </div>

        <div className="landing-commercial__note">
          <Sparkles size={20} aria-hidden="true" />

          <p>
            A composição das assinaturas e dos módulos será apresentada
            com clareza antes da contratação, sem planos anuais ou
            compromissos de longo prazo nesta fase.
          </p>
        </div>
      </div>
    </section>
  );
}