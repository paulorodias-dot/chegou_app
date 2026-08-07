import './DashboardHeader.css'

function DashboardHeader({
  onRefresh,
  isRefreshing = false,
  lastUpdatedAt = null,
}) {
  function handleRefresh() {
    if (typeof onRefresh === 'function') {
      onRefresh()
      return
    }

    window.location.reload()
  }

  return (
    <header className="dashboard-header">
      <div className="dashboard-header-copy">
        <nav
          className="dashboard-breadcrumb"
          aria-label="Navegação estrutural"
        >
          <span>Início</span>
          <span aria-hidden="true">›</span>
          <strong>Dashboard Master</strong>
        </nav>

        <span className="dashboard-header-eyebrow">
          Módulo Master
        </span>

        <h1>Visão Geral da Plataforma</h1>

        <p>
          Acompanhe desempenho, estabilidade, crescimento, consumo
          de provedores e indicadores estratégicos do ecossistema
          Chegou!.
        </p>

        {lastUpdatedAt && (
          <span className="dashboard-header-updated">
            Última atualização: {lastUpdatedAt}
          </span>
        )}
      </div>

      <div className="dashboard-header-actions">
        <button
          type="button"
          className="dashboard-refresh-button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-busy={isRefreshing}
        >
          <span
            className={
              isRefreshing
                ? 'dashboard-refresh-icon is-spinning'
                : 'dashboard-refresh-icon'
            }
            aria-hidden="true"
          >
            ↻
          </span>

          {isRefreshing ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>
    </header>
  )
}

export default DashboardHeader