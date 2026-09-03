import { AlertCircle, RefreshCw } from "lucide-react";

export default function NotificationErrorState({ onRetry }) {
  return (
    <div className="central-notifications-error" role="alert">
      <span
        className="central-notifications-error-icon"
        aria-hidden="true"
      >
        <AlertCircle size={22} />
      </span>

      <strong>Não foi possível carregar</strong>

      <p>
        Ocorreu um problema ao consultar suas notificações.
      </p>

      {typeof onRetry === "function" ? (
        <button
          type="button"
          className="central-notifications-retry"
          onClick={onRetry}
        >
          <RefreshCw size={15} />
          Tentar novamente
        </button>
      ) : null}
    </div>
  );
}