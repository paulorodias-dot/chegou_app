export default function NotificationSkeleton({ count = 3 }) {
  const total = Math.max(1, Math.min(5, Math.trunc(Number(count) || 3)));

  return (
    <div
      className="central-notifications-skeleton"
      aria-label="Carregando notificações"
      aria-busy="true"
    >
      {Array.from({ length: total }, (_, index) => (
        <div
          className="central-notifications-skeleton-item"
          key={index}
          aria-hidden="true"
        >
          <span className="central-notifications-skeleton-icon" />

          <span className="central-notifications-skeleton-content">
            <span className="central-notifications-skeleton-line central-notifications-skeleton-line-title" />
            <span className="central-notifications-skeleton-line" />
            <span className="central-notifications-skeleton-line central-notifications-skeleton-line-short" />
          </span>
        </div>
      ))}
    </div>
  );
}