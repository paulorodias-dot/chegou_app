import {
  ArrowLeftRight,
  RefreshCw,
} from "lucide-react";

import "./EntradaHeader.css";

export default function EntradaHeader({
  onRefresh,
  refreshing = false,
}) {
  return (
    <header className="entrada-header">
      <div className="entrada-header__identity">
        <div
          className="entrada-header__icon"
          aria-hidden="true"
        >
          <ArrowLeftRight size={24} />
        </div>

        <div className="entrada-header__content">
          <span className="entrada-header__context">
            Central de Encomendas
          </span>

          <h1 id="entrada-page-title">
            Entrada de Encomendas
          </h1>

          <p>
            Identifique e processe os volumes recebidos que aguardam
            Entrada Oficial.
          </p>
        </div>
      </div>

      <div className="entrada-header__actions">
        <button
          type="button"
          className="entrada-header__refresh"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label={
            refreshing
              ? "Atualizando Entrada"
              : "Atualizar Entrada"
          }
        >
          <RefreshCw
            size={17}
            className={
              refreshing
                ? "entrada-header__refresh-icon--spinning"
                : ""
            }
          />

          <span>
            {refreshing ? "Atualizando..." : "Atualizar"}
          </span>
        </button>
      </div>
    </header>
  );
}