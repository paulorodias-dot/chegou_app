import EntradaEmptyState from "./EntradaEmptyState";
import EntradaQueueRow from "./EntradaQueueRow";

import "./EntradaQueue.css";

export default function EntradaQueue({
  items = [],
  loading = false,
  hasContract = false,
  onOpenContext,
}) {
  if (loading) {
    return (
      <div
        className="entrada-queue__loading"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="entrada-queue__loading-line" />
        <div className="entrada-queue__loading-line" />
        <div className="entrada-queue__loading-line" />

        <span>Atualizando fila...</span>
      </div>
    );
  }

  if (!items.length) {
    return (
      <EntradaEmptyState
        hasContract={hasContract}
      />
    );
  }

  return (
    <div className="entrada-queue">
      <div
        className="entrada-queue__table"
        role="table"
        aria-label="Fila operacional de Entrada"
      >
        <div
          className="entrada-queue__header"
          role="row"
        >
          <span role="columnheader">
            Lote
          </span>

          <span role="columnheader">
            Transportadora
          </span>

          <span role="columnheader">
            Volumes
          </span>

          <span role="columnheader">
            Recebimento
          </span>

          <span role="columnheader">
            Situação
          </span>

          <span
            role="columnheader"
            aria-label="Ações"
          />
        </div>

        <div
          className="entrada-queue__body"
          role="rowgroup"
        >
          {items.map((item) => (
            <EntradaQueueRow
              key={item.id}
              item={item}
              onOpenContext={onOpenContext}
            />
          ))}
        </div>
      </div>
    </div>
  );
}