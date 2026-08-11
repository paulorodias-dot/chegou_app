import { Info } from "lucide-react";
import RastreioModalShell from "./RastreioModalShell";

export default function EditarRastreioModal({
  open,
  rastreio,
  onClose,
}) {
  return (
    <RastreioModalShell
      open={open}
      onClose={onClose}
      title="Editar Rastreio"
      description="Atualize somente as informações que você adicionou."
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
            className="rastreio-primary-button"
            disabled
          >
            Salvar alterações
          </button>
        </>
      }
    >
      <div className="rastreio-form-section">
        <label className="rastreio-field">
          <span>Código de rastreio</span>

          <input
            type="text"
            value={rastreio?.codigo ?? ""}
            readOnly
          />
        </label>

        <label className="rastreio-field">
          <span>Nome ou apelido da compra</span>

          <input
            type="text"
            value={rastreio?.descricao ?? ""}
            readOnly
          />
        </label>

        <aside className="rastreio-good-practice">
          <Info size={18} aria-hidden="true" />

          <div>
            <strong>Boa prática</strong>

            <p>
              Informações reconhecidas automaticamente pela
              transportadora não devem ser alteradas
              manualmente nesta tela.
            </p>
          </div>
        </aside>
      </div>
    </RastreioModalShell>
  );
}