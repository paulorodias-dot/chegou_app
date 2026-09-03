import {
  AlertTriangle,
  LoaderCircle,
  MapPin,
  PackageCheck,
  UserRound,
  X,
} from "lucide-react";

import {
  useEffect,
} from "react";

import "./DisponibilizacaoConfirmModal.css";

export default function DisponibilizacaoConfirmModal({
  open,
  processando = false,
  erro = null,
  numeroEncomenda = "—",
  destinatarioNome = "Destinatário identificado",
  unidadeLabel = "Unidade identificada",
  localizacaoLabel = "Localização registrada",
  onClose,
  onConfirm,
}) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const overflowAnterior =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const handleKeyDown = (
      event
    ) => {
      if (
        event.key === "Escape" &&
        !processando
      ) {
        onClose?.();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        overflowAnterior;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    open,
    processando,
    onClose,
  ]);

  if (!open) {
    return null;
  }

  const handleBackdropClick = (
    event
  ) => {
    if (
      event.target ===
        event.currentTarget &&
      !processando
    ) {
      onClose?.();
    }
  };

  return (
    <div
      className="disponibilizacao-confirm-modal"
      role="presentation"
      onMouseDown={handleBackdropClick}
    >
      <section
        className="disponibilizacao-confirm-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="disponibilizacao-confirm-modal-title"
        aria-describedby="disponibilizacao-confirm-modal-description"
      >
        <header className="disponibilizacao-confirm-modal__header">
          <div>
            <span className="disponibilizacao-confirm-modal__eyebrow">
              Disponibilização
            </span>

            <h2 id="disponibilizacao-confirm-modal-title">
              Disponibilizar para retirada
            </h2>
          </div>

          <button
            type="button"
            className="disponibilizacao-confirm-modal__close"
            onClick={onClose}
            disabled={processando}
            aria-label="Fechar confirmação"
          >
            <X size={20} />
          </button>
        </header>

        <div className="disponibilizacao-confirm-modal__body">
          <div
            className="disponibilizacao-confirm-modal__warning"
            id="disponibilizacao-confirm-modal-description"
          >
            <AlertTriangle
              size={21}
              aria-hidden="true"
            />

            <div>
              <strong>
                Atenção antes de disponibilizar
              </strong>

              <p>
                Confira se a encomenda, o destinatário e a unidade abaixo
                correspondem fisicamente ao volume que será disponibilizado.
                Após a confirmação, a encomenda ficará disponível para retirada
                e será iniciado o processo de notificação ao destinatário
                aplicável, conforme as regras de vínculo e autorização. O
                volume permanecerá armazenado na localização atual até a
                retirada.
              </p>
            </div>
          </div>

          <div className="disponibilizacao-confirm-modal__summary">
            <div className="disponibilizacao-confirm-modal__summary-item">
              <span className="disponibilizacao-confirm-modal__summary-icon">
                <PackageCheck size={18} />
              </span>

              <div>
                <span>Encomenda</span>
                <strong>
                  {numeroEncomenda}
                </strong>
              </div>
            </div>

            <div className="disponibilizacao-confirm-modal__summary-item">
              <span className="disponibilizacao-confirm-modal__summary-icon">
                <UserRound size={18} />
              </span>

              <div>
                <span>Destinatário</span>
                <strong>
                  {destinatarioNome}
                </strong>
              </div>
            </div>

            <div className="disponibilizacao-confirm-modal__summary-item">
              <span className="disponibilizacao-confirm-modal__summary-icon">
                <PackageCheck size={18} />
              </span>

              <div>
                <span>Torre / Unidade</span>
                <strong>
                  {unidadeLabel}
                </strong>
              </div>
            </div>

            <div className="disponibilizacao-confirm-modal__summary-item">
              <span className="disponibilizacao-confirm-modal__summary-icon">
                <MapPin size={18} />
              </span>

              <div>
                <span>
                  Localização física atual
                </span>

                <strong>
                  {localizacaoLabel}
                </strong>
              </div>
            </div>
          </div>

          {erro ? (
            <div
              className="disponibilizacao-confirm-modal__error"
              role="alert"
            >
              <AlertTriangle size={18} />

              <span>
                {erro}
              </span>
            </div>
          ) : null}
        </div>

        <footer className="disponibilizacao-confirm-modal__footer">
          <button
            type="button"
            className="disponibilizacao-confirm-modal__button disponibilizacao-confirm-modal__button--secondary"
            onClick={onClose}
            disabled={processando}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="disponibilizacao-confirm-modal__button disponibilizacao-confirm-modal__button--primary"
            onClick={onConfirm}
            disabled={processando}
          >
            {processando ? (
              <>
                <LoaderCircle
                  size={17}
                  className="disponibilizacao-confirm-modal__spin"
                />

                <span>
                  Disponibilizando...
                </span>
              </>
            ) : (
              <>
                <PackageCheck size={17} />

                <span>
                  Confirmar disponibilização
                </span>
              </>
            )}
          </button>
        </footer>
      </section>
    </div>
  );
}