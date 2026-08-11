import { PackageSearch, Plus } from "lucide-react";

export default function RastreioHeader({ onNovoRastreio }) {
  return (
    <header className="rastreio-header">
      <div className="rastreio-header__content">
        <div className="rastreio-header__eyebrow">
          <PackageSearch size={16} aria-hidden="true" />
          <span>Encomendas</span>
          <span aria-hidden="true">•</span>
          <span>Rastreio</span>
        </div>

        <h1>Rastreie suas compras</h1>

        <p>
          Acompanhe suas entregas e mantenha o Sistema Chegou!
          preparado para reconhecê-las quando chegarem ao condomínio.
        </p>
      </div>

      <div className="rastreio-header__action">
        <button
          type="button"
          className="rastreio-primary-button"
          onClick={onNovoRastreio}
        >
          <Plus size={18} aria-hidden="true" />
          <span>Novo Rastreio</span>
        </button>
      </div>
    </header>
  );
}