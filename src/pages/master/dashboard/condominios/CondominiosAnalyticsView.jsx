import './CondominiosAnalyticsView.css'

const condominiumKpis = [
  {
    id: 'total',
    label: 'Condomínios oficiais',
    value: '—',
    helper: 'Aguardando integração real',
  },
  {
    id: 'active',
    label: 'Condomínios ativos',
    value: '—',
    helper: 'Produção, sem ambientes de teste',
  },
  {
    id: 'month',
    label: 'Novos no período',
    value: '—',
    helper: 'Período atual selecionado',
  },
  {
    id: 'attention',
    label: 'Precisam de atenção',
    value: '—',
    helper: 'Riscos e pendências',
  },
]

function CondominiosAnalyticsView() {
  return (
    <section className="dashboard-analysis-section">
      <header className="dashboard-analysis-heading">
        <div>
          <h2>Análise de Condomínios</h2>
          <p>
            Visão macro de crescimento, situação, atividade,
            desempenho e oportunidades dos clientes.
          </p>
        </div>
      </header>

      <div className="condominios-kpi-grid">
        {condominiumKpis.map((kpi) => (
          <article
            key={kpi.id}
            className="condominios-kpi-card"
          >
            <span>{kpi.label}</span>
            <strong>{kpi.value}</strong>
            <small>{kpi.helper}</small>
          </article>
        ))}
      </div>

      <div className="condominios-panels-grid">
        <article className="condominios-panel condominios-panel-large">
          <header>
            <div>
              <span>Evolução</span>
              <h3>Crescimento de condomínios</h3>
            </div>

            <button type="button">Ver detalhes</button>
          </header>

          <div className="condominios-chart-placeholder">
            <div style={{ height: '34%' }} />
            <div style={{ height: '48%' }} />
            <div style={{ height: '43%' }} />
            <div style={{ height: '59%' }} />
            <div style={{ height: '68%' }} />
            <div style={{ height: '79%' }} />
            <div style={{ height: '88%' }} />
          </div>

          <p>
            O gráfico será alimentado pela evolução real dos
            condomínios de produção.
          </p>
        </article>

        <article className="condominios-panel">
          <header>
            <div>
              <span>Distribuição</span>
              <h3>Situação dos clientes</h3>
            </div>
          </header>

          <div className="condominios-status-placeholder">
            <div>
              <strong>—</strong>
              <span>Total oficial</span>
            </div>
          </div>

          <ul>
            <li>
              <span>Ativos</span>
              <strong>—</strong>
            </li>
            <li>
              <span>Em avaliação</span>
              <strong>—</strong>
            </li>
            <li>
              <span>Pendentes</span>
              <strong>—</strong>
            </li>
          </ul>
        </article>
      </div>
    </section>
  )
}

export default CondominiosAnalyticsView