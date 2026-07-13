import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Info,
  TriangleAlert,
  X,
} from "lucide-react";

import "./ToastPremium.css";

const ICONES = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: TriangleAlert,
  info: Info,
  notification: Bell,
};

function ToastItem({
  toast,
  onClose,
  onPause,
  onResume,
}) {
  const Icon = ICONES[toast.tipo] || Info;

  function executarAcao() {
    toast.acao?.onClick?.();

    if (toast.acao?.fecharAoExecutar !== false) {
      onClose(toast.id);
    }
  }

  return (
    <article
      className={`toast-premium toast-${toast.tipo}`}
      role={
        toast.tipo === "error" ? "alert" : "status"
      }
      aria-live={
        toast.tipo === "error" ? "assertive" : "polite"
      }
      onMouseEnter={() => onPause(toast.id)}
      onMouseLeave={() => onResume(toast)}
      onFocus={() => onPause(toast.id)}
      onBlur={() => onResume(toast)}
    >
      <div className="toast-premium-icon">
        <Icon size={21} />
      </div>

      <div className="toast-premium-content">
        <strong>{toast.titulo}</strong>

        {toast.mensagem ? (
          <p>{toast.mensagem}</p>
        ) : null}

        {toast.acao?.label ? (
          <button
            type="button"
            className="toast-premium-action"
            onClick={executarAcao}
          >
            {toast.acao.label}
          </button>
        ) : null}
      </div>

      <button
        type="button"
        className="toast-premium-close"
        onClick={() => onClose(toast.id)}
        aria-label="Fechar mensagem"
      >
        <X size={17} />
      </button>

      {!toast.persistente && toast.duracao !== 0 ? (
        <span
          className="toast-premium-progress"
          style={{
            animationDuration: `${toast.duracao}ms`,
          }}
        />
      ) : null}
    </article>
  );
}

export default function ToastContainer({
  toasts,
  onClose,
  onPause,
  onResume,
}) {
  if (!toasts.length) return null;

  return (
    <section
      className="toast-premium-container"
      aria-label="Mensagens do sistema"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={onClose}
          onPause={onPause}
          onResume={onResume}
        />
      ))}
    </section>
  );
}