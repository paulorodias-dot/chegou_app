import {
  CheckCircle2,
  Inbox,
} from "lucide-react";

import "./EntradaEmptyState.css";

export default function EntradaEmptyState({
  hasContract = false,
}) {
  return (
    <div
      className="entrada-empty-state"
      role="status"
    >
      <div
        className="entrada-empty-state__illustration"
        aria-hidden="true"
      >
        <Inbox size={34} />

        <span className="entrada-empty-state__check">
          <CheckCircle2 size={17} />
        </span>
      </div>

      <div className="entrada-empty-state__content">
        <h3>
          Nenhum volume aguardando Entrada
        </h3>

        <p>
          {hasContract
            ? "Novos recebimentos concluídos aparecerão aqui quando estiverem elegíveis para Entrada."
            : "A fila operacional será preenchida pelos contratos oficiais da Entrada quando essa integração for homologada."}
        </p>
      </div>
    </div>
  );
}