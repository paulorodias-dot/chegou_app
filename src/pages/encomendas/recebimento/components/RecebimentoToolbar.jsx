import { Plus } from "lucide-react";

export default function RecebimentoToolbar({
  onNovoRecebimento,
}) {
  return (
    <section className="recebimento-toolbar">
      <div className="recebimento-toolbar__content">
        <h2 className="recebimento-toolbar__title">
          Operação de Recebimento
        </h2>

        <p className="recebimento-toolbar__description">
          Inicie um novo atendimento ou consulte os
          recebimentos já registrados.
        </p>
      </div>

      <div className="recebimento-toolbar__actions">
        <button
          type="button"
          className="recebimento-toolbar__button"
          onClick={onNovoRecebimento}
        >
          <Plus
            size={18}
            strokeWidth={2}
            aria-hidden="true"
          />

          Novo Recebimento
        </button>
      </div>
    </section>
  );
}