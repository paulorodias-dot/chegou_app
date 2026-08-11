export default function RecebimentoStatusDot({
  tone = "neutral",
  label = "Situação",
}) {
  return (
    <span
      className={`recebimento-status-dot recebimento-status-dot--${tone}`}
      title={label}
      aria-label={label}
    />
  );
}