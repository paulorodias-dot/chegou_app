import {
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

import "./EntradaErrorState.css";

export default function EntradaErrorState({
  title = "Não foi possível carregar esta informação",
  description = "Tente novamente em alguns instantes.",
  onRetry,
}) {
  return (
    <div
      className="entrada-error-state"
      role="alert"
    >
      <div
        className="entrada-error-state__icon"
        aria-hidden="true"
      >
        <AlertTriangle size={26} />
      </div>

      <div className="entrada-error-state__content">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
        >
          <RefreshCw size={16} />
          Tentar novamente
        </button>
      ) : null}
    </div>
  );
}