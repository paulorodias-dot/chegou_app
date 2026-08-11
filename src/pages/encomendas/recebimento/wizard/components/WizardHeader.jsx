function formatarDataHora(dataHora) {
  if (!dataHora) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(dataHora);
}

export default function WizardHeader({
  operadorNome,
  dataHora,
}) {
  return (
    <header className="novo-recebimento-header">
      <div className="novo-recebimento-header__top">
        <div>
          <span className="novo-recebimento-header__eyebrow">
            Recebimento
          </span>

          <h2
            id="novo-recebimento-title"
            className="novo-recebimento-header__title"
          >
            Novo Recebimento
          </h2>

          <p className="novo-recebimento-header__lot">
            Lote temporário: será atribuído na
            finalização.
          </p>
        </div>
      </div>

      <div className="novo-recebimento-header__meta">
        <div className="novo-recebimento-header__meta-item">
          <span className="novo-recebimento-header__meta-label">
            Operador
          </span>

          <span className="novo-recebimento-header__meta-value">
            {operadorNome || "—"}
          </span>
        </div>

        <div className="novo-recebimento-header__meta-item">
          <span className="novo-recebimento-header__meta-label">
            Data e hora
          </span>

          <span className="novo-recebimento-header__meta-value">
            {formatarDataHora(dataHora)}
          </span>
        </div>
      </div>
    </header>
  );
}