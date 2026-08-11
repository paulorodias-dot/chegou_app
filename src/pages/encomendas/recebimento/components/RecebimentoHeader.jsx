export default function RecebimentoHeader() {
  return (
    <header className="recebimento-header">
      <nav
        className="recebimento-header__breadcrumb"
        aria-label="Navegação estrutural"
      >
        <span>Módulo Portaria</span>

        <span
          className="recebimento-header__separator"
          aria-hidden="true"
        >
          /
        </span>

        <span className="recebimento-header__current">
          Recebimento
        </span>
      </nav>

      <span className="recebimento-header__eyebrow">
        Central de Encomendas
      </span>

      <h1 className="recebimento-header__title">
        Recebimento de Encomendas
      </h1>

      <p className="recebimento-header__description">
        Registre novos recebimentos e acompanhe os lotes
        recebidos pela Portaria.
      </p>
    </header>
  );
}