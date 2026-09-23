import {
  PackageCheck,
  RefreshCw,
} from "lucide-react";

import "./MoradorRetiradasHeader.css";

export default function MoradorRetiradasHeader({
  carregando,
  onRefresh,
}) {
  return (
    <header className="morador-retiradas-header">
      <div className="morador-retiradas-header__copy">
        <span className="morador-retiradas-header__eyebrow">
          Módulo Morador
        </span>

        <div className="morador-retiradas-header__title-row">
          <span className="morador-retiradas-header__icon" aria-hidden="true">
            <PackageCheck size={21} />
          </span>

          <div>
            <h1>Retiradas de encomendas</h1>
            <p>
              Acompanhe o que está disponível para você e para seus
              dependentes vinculados.
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="morador-retiradas-header__refresh"
        onClick={onRefresh}
        disabled={carregando}
      >
        <RefreshCw
          size={17}
          className={carregando ? "is-spinning" : undefined}
        />
        <span>Atualizar</span>
      </button>
    </header>
  );
}