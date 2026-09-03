import { ChevronRight, Clock } from "lucide-react";

import caixaEncomenda from "../../assets/notifications/caixa_notificacao_enc.png";

function formatarDataHora(valor) {
  if (!valor) return "";

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

function ehNotificacaoDisponibilidadeEncomenda(notification) {
  return (
    typeof notification?.category === "string" &&
    notification.category === "ENCOMENDA_DISPONIVEL_RETIRADA"
  );
}

export default function NotificationItem({
  notification,
  onRead,
}) {
  if (!notification) {
    return null;
  }

  const dataHora = formatarDataHora(notification.createdAt);

  const disponibilidadeEncomenda =
    ehNotificacaoDisponibilidadeEncomenda(notification);

  async function handleClick() {
    if (!notification.isRead && typeof onRead === "function") {
      await onRead(notification.id);
    }
  }

  return (
    <button
      type="button"
      className={[
        "central-notifications-item",
        disponibilidadeEncomenda
          ? "central-notifications-item-package"
          : "",
        notification.isRead
          ? "central-notifications-item-read"
          : "central-notifications-item-unread",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={handleClick}
    >
      <span className="central-notifications-item-visual">
        {disponibilidadeEncomenda ? (
          <span
            className={[
              "central-notifications-package-stage",
              !notification.isRead
                ? "central-notifications-package-stage-pulse"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-hidden="true"
          >
            <img
              src={caixaEncomenda}
              alt=""
              className="central-notifications-package-image"
              draggable="false"
            />
          </span>
        ) : (
          <span
            className="central-notifications-generic-icon"
            aria-hidden="true"
          />
        )}
      </span>

      <span className="central-notifications-item-content">
        <span className="central-notifications-item-heading">
          <strong>{notification.title}</strong>

          {!notification.isRead ? (
            <span
              className="central-notifications-unread-dot"
              aria-label="Não lida"
            />
          ) : null}
        </span>

        {notification.summary ? (
          <span className="central-notifications-item-summary">
            {notification.summary}
          </span>
        ) : null}

        {dataHora ? (
          <span className="central-notifications-item-time-pill">
            <Clock size={14} aria-hidden="true" />

            <time dateTime={notification.createdAt}>
              {dataHora}
            </time>
          </span>
        ) : null}
      </span>

      <span
        className="central-notifications-item-chevron"
        aria-hidden="true"
      >
        <ChevronRight size={22} />
      </span>
    </button>
  );
}