import { useEffect } from "react";
import { X } from "lucide-react";

export default function RastreioModalShell({
  open,
  title,
  description,
  children,
  footer,
  onClose,
  size = "medium",
}) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="rastreio-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <section
        className={`rastreio-modal rastreio-modal--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rastreio-modal-title"
        aria-describedby={
          description
            ? "rastreio-modal-description"
            : undefined
        }
      >
        <header className="rastreio-modal__header">
          <div>
            <h2 id="rastreio-modal-title">
              {title}
            </h2>

            {description && (
              <p id="rastreio-modal-description">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            className="rastreio-icon-button"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="rastreio-modal__body">
          {children}
        </div>

        {footer && (
          <footer className="rastreio-modal__footer">
            {footer}
          </footer>
        )}
      </section>
    </div>
  );
}