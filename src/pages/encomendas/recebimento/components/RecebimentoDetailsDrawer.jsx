import {
  ArrowRight,
  Hash,
  Package,
  ScanLine,
  X,
} from "lucide-react";

export default function RecebimentoDetailsDrawer({
  open,
  recebimento,
  onClose,
  onContinuar,
}) {
  if (!open || !recebimento) {
    return null;
  }

  const podeContinuar =
    recebimento.podeContinuar === true;

  const rastreios =
    recebimento.rastreios || [];

  return (
    <div
      className="recebimento-drawer-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget
        ) {
          onClose?.();
        }
      }}
    >
      <aside
        className="recebimento-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recebimento-drawer-title"
      >
        <header className="recebimento-drawer__header">
          <div>
            <span className="recebimento-drawer__eyebrow">
              Pré-Recebimento
            </span>

            <h2
              id="recebimento-drawer-title"
              className="recebimento-drawer__title"
            >
              Lote{" "}
              {recebimento.numeroLote ||
                "—"}
            </h2>
          </div>

          <button
            type="button"
            className="recebimento-drawer__close"
            onClick={onClose}
            aria-label="Fechar detalhes"
          >
            <X
              size={19}
              aria-hidden="true"
            />
          </button>
        </header>

        <div className="recebimento-drawer__body">
          <section className="recebimento-drawer-section">
            <h3>Resumo</h3>

            <div className="recebimento-drawer-grid">
              <DetailItem
                label="Transportadora"
                value={
                  recebimento.transportadora
                }
              />

              <DetailItem
                label="Entregador"
                value={
                  recebimento.entregador
                }
              />

              <DetailItem
                label="Quantidade informada"
                value={
                  recebimento.quantidadeInformada
                }
              />

              <DetailItem
                label="Quantidade capturada"
                value={
                  recebimento.quantidadeCapturada
                }
              />

              <DetailItem
                label="Diferença"
                value={
                  recebimento.diferenca
                }
              />

              <DetailItem
                label="Avarias"
                value={
                  recebimento.quantidadeAvarias
                }
              />
            </div>
          </section>

          <section className="recebimento-drawer-section">
            <div className="recebimento-drawer-section__heading">
              <div>
                <h3>
                  Códigos de rastreio
                </h3>

                <p>
                  Confira os identificadores
                  capturados neste lote.
                </p>
              </div>

              <ScanLine
                size={18}
                aria-hidden="true"
              />
            </div>

            {rastreios.length > 0 ? (
              <div className="recebimento-tracking-list">
                {rastreios.map(
                  (rastreio, index) => (
                    <div
                      key={`${rastreio}-${index}`}
                      className="recebimento-tracking-item"
                    >
                      <Hash
                        size={14}
                        aria-hidden="true"
                      />

                      <span>{rastreio}</span>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="recebimento-drawer-empty">
                <Package
                  size={20}
                  aria-hidden="true"
                />

                <span>
                  Nenhum rastreio disponível.
                </span>
              </div>
            )}
          </section>
        </div>

        {podeContinuar && (
          <footer className="recebimento-drawer__footer">
            <button
              type="button"
              className="recebimento-drawer__continue"
              onClick={() =>
                onContinuar?.(recebimento)
              }
            >
              Continuar Recebimento

              <ArrowRight
                size={17}
                aria-hidden="true"
              />
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}

function DetailItem({
  label,
  value,
}) {
  return (
    <div className="recebimento-drawer-detail">
      <span className="recebimento-drawer-detail__label">
        {label}
      </span>

      <strong className="recebimento-drawer-detail__value">
        {value ?? "—"}
      </strong>
    </div>
  );
}