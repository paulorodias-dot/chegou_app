import {
  Boxes,
  Info,
  PackageSearch,
  X,
} from "lucide-react";
import { useEffect, useRef } from "react";

import "./EntradaDrawer.css";

export default function EntradaDrawer({
  open,
  context,
  onClose,
}) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const contextLabel =
    context?.contextType === "volume"
      ? "Volume"
      : "Contexto de Entrada";

  return (
    <div
      className="entrada-drawer-root"
      data-hide-mobile-nav="true"
    >
      <button
        type="button"
        className="entrada-drawer__backdrop"
        onClick={onClose}
        aria-label="Fechar painel de Entrada"
      />

      <aside
        className="entrada-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="entrada-drawer-title"
      >
        <header className="entrada-drawer__header">
          <div className="entrada-drawer__identity">
            <div
              className="entrada-drawer__icon"
              aria-hidden="true"
            >
              <PackageSearch size={21} />
            </div>

            <div>
              <span>{contextLabel}</span>

              <h2 id="entrada-drawer-title">
                Processamento
              </h2>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            className="entrada-drawer__close"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={19} />
          </button>
        </header>

        <div className="entrada-drawer__body">
          <section className="entrada-drawer__context">
            <div className="entrada-drawer__section-title">
              <Boxes size={17} />

              <div>
                <span>Contexto operacional</span>
                <strong>
                  {context?.referenciaLote ??
                    context?.referencia ??
                    "Entrada Oficial"}
                </strong>
              </div>
            </div>

            <p>
              Este workspace está preparado para receber os fatos
              autorizados do Recebimento e as ações próprias da Entrada
              quando os contratos forem homologados.
            </p>
          </section>

          <section className="entrada-drawer__placeholder">
            <div>
              <Info size={19} />
            </div>

            <h3>
              Processamento ainda não conectado
            </h3>

            <p>
              Nenhuma identificação, matching, promoção, armazenamento ou
              criação de encomenda será executada pelo frontend nesta fase.
            </p>
          </section>
        </div>

        <footer className="entrada-drawer__footer">
          <button
            type="button"
            className="entrada-drawer__secondary"
            onClick={onClose}
          >
            Fechar
          </button>

          <button
            type="button"
            className="entrada-drawer__primary"
            disabled
            aria-disabled="true"
          >
            Processar Entrada
          </button>
        </footer>
      </aside>
    </div>
  );
}