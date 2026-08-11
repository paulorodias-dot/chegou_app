export default function WizardNavigation({
  etapaAtual,
  primeiraEtapa,
  ultimaEtapa,

  canNext = true,
  canFinish = false,

  isProcessing = false,
  conclusaoPendente = false,

  onCancel,
  onDiscard,
  onBack,
  onNext,
  onFinish,
}) {
  const primeira =
    etapaAtual === primeiraEtapa;

  const ultima =
    etapaAtual === ultimaEtapa;


  const bloquearNavegacao =
    isProcessing ||
    conclusaoPendente;


  function handleCancelar() {
    if (bloquearNavegacao) {
      return;
    }

    if (
      typeof onCancel ===
      "function"
    ) {
      onCancel();
    }
  }


  function handleVoltar() {
    if (bloquearNavegacao) {
      return;
    }

    if (
      typeof onBack ===
      "function"
    ) {
      onBack();
    }
  }


  function handleProximo() {
    if (
      bloquearNavegacao ||
      !canNext
    ) {
      return;
    }

    if (
      typeof onNext ===
      "function"
    ) {
      onNext();
    }
  }


  function handleConcluir() {
    if (
      bloquearNavegacao ||
      !canFinish
    ) {
      return;
    }

    if (
      typeof onFinish ===
      "function"
    ) {
      onFinish();
    }
  }


  return (
    <div className="novo-recebimento-navigation">
      <div className="novo-recebimento-navigation__left">
        <button
          type="button"
          className="
            novo-recebimento-button
            novo-recebimento-button--danger
          "
          onClick={handleCancelar}
          disabled={bloquearNavegacao}
        >
          Cancelar
        </button>
      </div>


      <div className="novo-recebimento-navigation__right">
        {!primeira && (
          <button
            type="button"
            className="
              novo-recebimento-button
              novo-recebimento-button--secondary
            "
            onClick={handleVoltar}
            disabled={bloquearNavegacao}
          >
            Voltar
          </button>
        )}


        {!ultima && (
          <button
            type="button"
            className="
              novo-recebimento-button
              novo-recebimento-button--primary
            "
            onClick={handleProximo}
            disabled={
              bloquearNavegacao ||
              !canNext
            }
          >
            Próximo
          </button>
        )}


        {ultima && (
          <button
            type="button"
            className="
              novo-recebimento-button
              novo-recebimento-button--primary
            "
            onClick={handleConcluir}
            disabled={
              bloquearNavegacao ||
              !canFinish
            }
          >
            {isProcessing
              ? "Concluindo..."
              : "Concluir Recebimento"}
          </button>
        )}
      </div>
    </div>
  );
}