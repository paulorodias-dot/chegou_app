import { CheckCircle2, X } from "lucide-react";

import verifiedIcon from "../../assets/notifications/verified.png";

import NotificationEmptyState from "./NotificationEmptyState";
import NotificationErrorState from "./NotificationErrorState";
import NotificationItem from "./NotificationItem";
import NotificationSkeleton from "./NotificationSkeleton";

export default function NotificationPopover({
  open = false,
  notifications = [],
  loading = false,
  error = null,
  onClose,
  onRetry,
  onRead,
  onReadAll,
}) {
  if (!open) {
    return null;
  }

  const possuiNotificacoes =
    Array.isArray(notifications) && notifications.length > 0;

  const possuiNaoLidas =
    possuiNotificacoes &&
    notifications.some((notification) => !notification.isRead);

  return (
    <section
      className="central-notifications-popover"
      role="dialog"
      aria-modal="false"
      aria-label="Central de Notificações"
    >
      <header className="central-notifications-popover-header">
        <div className="central-notifications-popover-title">
          <strong>Notificações</strong>
          <span>Central de Notificações</span>
        </div>

        <button
          type="button"
          className="central-notifications-close"
          onClick={onClose}
          aria-label="Fechar notificações"
          title="Fechar"
        >
          <X size={22} />
        </button>
      </header>

      {!loading && !error && possuiNaoLidas ? (
        <div className="central-notifications-actions">
          <button
            type="button"
            onClick={onReadAll}
          >
            <CheckCircle2 size={16} />
            Marcar todas como lidas
          </button>
        </div>
      ) : null}

      <div className="central-notifications-popover-body">
        {loading ? (
          <NotificationSkeleton />
        ) : error ? (
          <NotificationErrorState onRetry={onRetry} />
        ) : !possuiNotificacoes ? (
          <NotificationEmptyState />
        ) : (
          <div className="central-notifications-list">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={onRead}
              />
            ))}
          </div>
        )}
      </div>

      <footer className="central-notifications-popover-footer">
        <div className="central-notifications-trust">
          <img
            src={verifiedIcon}
            alt=""
            aria-hidden="true"
            draggable="false"
          />

          <span>
            Seu canal oficial de alertas do{" "}
            <strong>Sistema Chegou!</strong>
          </span>
        </div>

        <button
          type="button"
          className="central-notifications-view-all"
          disabled
          aria-disabled="true"
          title="A Central completa será integrada em etapa própria"
        >
          Ver todas as notificações
          <ChevronRightPlaceholder />
        </button>
      </footer>
    </section>
  );
}

function ChevronRightPlaceholder() {
  return (
    <span
      className="central-notifications-view-all-arrow"
      aria-hidden="true"
    >
      →
    </span>
  );
}