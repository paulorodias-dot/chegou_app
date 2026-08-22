import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Package,
} from "lucide-react";
import { useState } from "react";

import EntradaVolumesList from "./EntradaVolumesList";

import "./EntradaQueueRow.css";

export default function EntradaQueueRow({
  item,
  onOpenContext,
}) {
  const [expanded, setExpanded] = useState(false);

  const volumes = Array.isArray(item?.volumes)
    ? item.volumes
    : [];

  const hasVolumes = volumes.length > 0;

  return (
    <div className="entrada-queue-row">
      <div
        className="entrada-queue-row__main"
        role="row"
      >
        <div
          className="entrada-queue-row__cell entrada-queue-row__cell--lot"
          role="cell"
        >
          <button
            type="button"
            className="entrada-queue-row__expand"
            onClick={() =>
              setExpanded((current) => !current)
            }
            disabled={!hasVolumes}
            aria-expanded={expanded}
            aria-label={
              expanded
                ? "Recolher volumes do lote"
                : "Expandir volumes do lote"
            }
          >
            {expanded ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>

          <div className="entrada-queue-row__lot-icon">
            <Package size={17} />
          </div>

          <strong>
            {item?.referenciaLote ?? "—"}
          </strong>
        </div>

        <div
          className="entrada-queue-row__cell"
          role="cell"
          data-label="Transportadora"
        >
          {item?.transportadora ?? "—"}
        </div>

        <div
          className="entrada-queue-row__cell"
          role="cell"
          data-label="Volumes"
        >
          {item?.totalVolumes ?? "—"}
        </div>

        <div
          className="entrada-queue-row__cell"
          role="cell"
          data-label="Recebimento"
        >
          {item?.recebidoEm ?? "—"}
        </div>

        <div
          className="entrada-queue-row__cell"
          role="cell"
          data-label="Situação"
        >
          {item?.situacaoLabel ?? "—"}
        </div>

        <div
          className="entrada-queue-row__actions"
          role="cell"
        >
          <button
            type="button"
            onClick={() => onOpenContext?.(item)}
            aria-label="Abrir contexto de Entrada"
          >
            <ExternalLink size={16} />
          </button>
        </div>
      </div>

      {expanded && hasVolumes ? (
        <EntradaVolumesList
          volumes={volumes}
          onOpenContext={onOpenContext}
        />
      ) : null}
    </div>
  );
}