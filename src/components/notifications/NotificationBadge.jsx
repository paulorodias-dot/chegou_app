export default function NotificationBadge({ count = 0 }) {
  const total = Math.max(0, Math.trunc(Number(count) || 0));

  if (total <= 0) {
    return null;
  }

  const label = total > 99 ? "99+" : String(total);

  return (
    <span
      className="central-notifications-badge"
      aria-label={`${total} ${
        total === 1 ? "notificação não lida" : "notificações não lidas"
      }`}
    >
      {label}
    </span>
  );
}