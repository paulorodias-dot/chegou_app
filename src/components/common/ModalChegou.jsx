import { AlertTriangle, CheckCircle, Info, X } from "lucide-react";
import "./ModalChegou.css";

const icons = {
  info: <Info size={24} />,
  success: <CheckCircle size={24} />,
  warning: <AlertTriangle size={24} />,
  danger: <AlertTriangle size={24} />,
};

export default function ModalChegou({
  open,
  type = "info",
  title,
  description,
  children,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  onConfirm,
  onCancel,
  loading = false,
  showCancel = true,
}) {
  if (!open) return null;

  return (
    <div className="modal-chegou-overlay">
      <div className={`modal-chegou modal-${type}`}>
        <button
          type="button"
          className="modal-chegou-close"
          onClick={onCancel}
          aria-label="Fechar"
          disabled={loading}
        >
          <X size={18} />
        </button>

        <div className="modal-chegou-icon">{icons[type] || icons.info}</div>

        <div className="modal-chegou-content">
          {title && <h2>{title}</h2>}
          {description && <p>{description}</p>}
          {children && <div className="modal-chegou-body">{children}</div>}
        </div>

        <div className="modal-chegou-actions">
          {showCancel && (
            <button
              type="button"
              className="modal-btn modal-btn-ghost"
              onClick={onCancel}
              disabled={loading}
            >
              {cancelText}
            </button>
          )}

          <button
            type="button"
            className="modal-btn modal-btn-primary"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Processando..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}