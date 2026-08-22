import {
  Box,
  ExternalLink,
} from "lucide-react";

import "./EntradaVolumesList.css";

export default function EntradaVolumesList({
  volumes = [],
  onOpenContext,
}) {
  if (!volumes.length) {
    return null;
  }

  return (
    <div
      className="entrada-volumes-list"
      aria-label="Volumes do lote"
    >
      <div className="entrada-volumes-list__heading">
        <Box size={16} />
        <strong>Volumes</strong>
      </div>

      <div className="entrada-volumes-list__items">
        {volumes.map((volume) => (
          <article
            key={volume.id}
            className="entrada-volumes-list__item"
          >
            <div>
              <span>Volume</span>
              <strong>
                {volume.referencia ?? "—"}
              </strong>
            </div>

            <div>
              <span>Código capturado</span>
              <strong>
                {volume.codigoCapturado ?? "—"}
              </strong>
            </div>

            <div>
              <span>Situação</span>
              <strong>
                {volume.situacaoLabel ?? "—"}
              </strong>
            </div>

            <button
              type="button"
              onClick={() =>
                onOpenContext?.({
                  ...volume,
                  contextType: "volume",
                })
              }
              aria-label="Abrir volume"
            >
              <ExternalLink size={15} />
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}