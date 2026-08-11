import {
  Building2,
  UserRound,
} from "lucide-react";

import "./DashboardPortariaHeader.css";

function obterPrimeiroNome(nome) {
  const nomeNormalizado = String(nome || "")
    .trim()
    .replace(/\s+/g, " ");

  if (!nomeNormalizado) {
    return "";
  }

  return nomeNormalizado.split(" ")[0];
}

function DashboardPortariaHeader({
  condominioNome,
  operadorNome,
  turno,
}) {
  const primeiroNome =
    obterPrimeiroNome(operadorNome);

  return (
    <header className="dashboard-portaria-header">
      <div className="dashboard-portaria-header-copy">
        <span className="dashboard-portaria-eyebrow">
          Módulo Portaria
        </span>

        <h1>Operação da Portaria</h1>

        <p>
          {primeiroNome
            ? `Olá ${primeiroNome}, acompanhe as encomendas do dia, pendências e principais ações operacionais do condomínio.`
            : "Acompanhe as encomendas do dia, pendências e principais ações operacionais do condomínio."}
        </p>

        <div className="dashboard-portaria-context">
          <span>
            <Building2
              size={15}
              aria-hidden="true"
            />

            {condominioNome ||
              "Condomínio"}
          </span>

          <span>
            <UserRound
              size={15}
              aria-hidden="true"
            />

            {operadorNome ||
              "Operador"}
          </span>

          {turno ? (
            <span>{turno}</span>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default DashboardPortariaHeader;