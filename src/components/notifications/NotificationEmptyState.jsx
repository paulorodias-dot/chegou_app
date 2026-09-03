import { Bell } from "lucide-react";

export default function NotificationEmptyState() {
  return (
    <div className="central-notifications-empty" role="status">
      <span
        className="central-notifications-empty-icon"
        aria-hidden="true"
      >
        <Bell size={22} />
      </span>

      <strong>Nenhuma notificação</strong>

      <p>
        Suas notificações aparecerão aqui quando houver novidades.
      </p>
    </div>
  );
}