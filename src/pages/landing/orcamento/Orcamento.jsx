import { Clock3 } from "lucide-react";

import logoAzulRoyal from "../../../assets/logo_azulroyal.png";

import "./Orcamento.css";

export default function Orcamento() {
  return (
    <main className="orcamento-construcao">
      <section
        className="orcamento-construcao__card"
        aria-labelledby="orcamento-construcao-titulo"
      >
        <img
          src={logoAzulRoyal}
          alt="Sistema Chegou!"
          className="orcamento-construcao__logo"
        />

        <div
          className="orcamento-construcao__icon"
          aria-hidden="true"
        >
          <Clock3 size={28} strokeWidth={2} />
        </div>

        <span className="orcamento-construcao__eyebrow">
          ORÇAMENTO
        </span>

        <h1 id="orcamento-construcao-titulo">
          Estamos preparando esta experiência.
        </h1>

        <p>
          A tela de orçamento do{" "}
          <strong className="orcamento-construcao__brand">
            Sistema Chegou
            <span>!</span>
          </strong>{" "}
          estará disponível em breve.
        </p>
      </section>
    </main>
  );
}