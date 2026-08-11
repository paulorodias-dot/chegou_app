import {
  AlertTriangle,
  Trash2,
} from "lucide-react";

import RastreioModalShell from "./RastreioModalShell";

export default function ExcluirRastreioModal({
  open,
  rastreio,
  onClose,
}) {
  return (
    <RastreioModalShell
      open={open}
      onClose={onClose}
      title="Excluir Rastreio"
      description="Revise antes de continuar."
      footer={
        <>
          <button
            type="button"
            className="rastreio-secondary-button"
            onClick={onClose}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="rastreio-danger-button"
            disabled
          >
            <Trash2 size={17} aria-hidden="true" />
            Excluir
          </button>
        </>
      }
    >
      <div className="rastreio-delete-warning">
        <div className="rastreio-delete-warning__icon">
          <AlertTriangle size={24} aria-hidden="true" />
        </div>

        <div>
          <h3>Deseja remover este rastreio?</h3>

          {rastreio?.codigo && (
            <strong className="rastreio-delete-warning__code">
              {rastreio.codigo}
            </strong>
          )}

          <p>
            A regra definitiva de exclusão, histórico e
            auditoria será conectada posteriormente ao
            fluxo oficial.
          </p>
        </div>
      </div>
    </RastreioModalShell>
  );
}