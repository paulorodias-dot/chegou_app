import { useEffect } from "react";
import {
  Clock3,
  Info,
  Map,
  MapPin,
  PackageCheck,
  Route,
  Truck,
  X,
} from "lucide-react";

export default function RastreioAcompanhamentoDrawer({
  open,
  rastreio,
  onClose,
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
      className="rastreio-drawer-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <aside
        className="rastreio-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rastreio-drawer-title"
      >
        <header className="rastreio-drawer__header">
          <div>
            <span className="rastreio-drawer__eyebrow">
              Acompanhamento
            </span>

            <h2 id="rastreio-drawer-title">
              {rastreio?.descricao ||
                "Sua entrega"}
            </h2>

            {rastreio?.codigo && (
              <strong className="rastreio-drawer__code">
                {rastreio.codigo}
              </strong>
            )}
          </div>

          <button
            type="button"
            className="rastreio-icon-button"
            onClick={onClose}
            aria-label="Fechar acompanhamento"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="rastreio-drawer__body">
          <section className="rastreio-drawer__summary">
            <div className="rastreio-drawer__summary-item">
              <Truck size={18} aria-hidden="true" />

              <div>
                <span>Transportadora</span>
                <strong>
                  {rastreio?.transportadora || "—"}
                </strong>
              </div>
            </div>

            <div className="rastreio-drawer__summary-item">
              <Clock3 size={18} aria-hidden="true" />

              <div>
                <span>Última atualização</span>
                <strong>
                  {rastreio?.ultimaAtualizacao || "—"}
                </strong>
              </div>
            </div>
          </section>

          <section className="rastreio-drawer__tracking">
            <div className="rastreio-section-heading">
              <div>
                <span>Acompanhamento</span>
                <h3>Trajeto da entrega</h3>
              </div>

              <Route size={21} aria-hidden="true" />
            </div>

            <div className="rastreio-tracking-placeholder">
              <div className="rastreio-tracking-placeholder__visual">
                <Map size={34} aria-hidden="true" />
              </div>

              <div>
                <h4>
                  O acompanhamento aparecerá aqui
                </h4>

                <p>
                  Conforme a transportadora, esta área
                  poderá apresentar mapa, localização,
                  linha do tempo ou outras informações
                  disponíveis para sua entrega.
                </p>
              </div>
            </div>

            <div className="rastreio-tracking-options">
              <div className="rastreio-tracking-option">
                <MapPin size={18} aria-hidden="true" />

                <div>
                  <strong>Localização</strong>
                  <span>
                    Exibida quando estiver disponível.
                  </span>
                </div>
              </div>

              <div className="rastreio-tracking-option">
                <PackageCheck
                  size={18}
                  aria-hidden="true"
                />

                <div>
                  <strong>Linha do tempo</strong>
                  <span>
                    Eventos serão apresentados conforme
                    o acompanhamento da transportadora.
                  </span>
                </div>
              </div>
            </div>
          </section>

          <aside className="rastreio-portaria-guidance">
            <Info size={19} aria-hidden="true" />

            <div>
              <strong>
                Quando sua entrega chegar ao condomínio
              </strong>

              <p>
                Aguarde a entrada pela Portaria. Assim que
                o processo estiver concluído, você poderá
                acompanhar a encomenda pelo Sistema
                Chegou!.
              </p>
            </div>
          </aside>
        </div>
      </aside>
    </div>
  );
}