import './SystemIntelligenceView.css'

const secondaryInsights = [
  {
    id: 'brevo',
    category: 'Comunicações',
    title: 'Consumo preventivo do Brevo',
    description:
      'O volume atual permanece dentro da capacidade planejada para o período.',
    status: 'Estável',
  },
  {
    id: 'users',
    category: 'Usuários',
    title: 'Crescimento de moradores',
    description:
      'A adesão apresentou evolução positiva em relação ao período anterior.',
    status: 'Oportunidade',
  },
  {
    id: 'security',
    category: 'Segurança',
    title: 'Nenhum incidente crítico',
    description:
      'Não existem incidentes críticos simulados em acompanhamento.',
    status: 'Protegido',
  },
]

function SystemIntelligenceView() {
  return (
    <section className="dashboard-analysis-section">
      <header className="dashboard-analysis-heading">
        <div>
          <h2>Inteligência do Sistema</h2>
          <p>
            Acontecimentos relevantes selecionados por impacto,
            prioridade, tendência e risco para o ecossistema.
          </p>
        </div>

        <span className="system-intelligence-source">
          Dados iniciais simulados
        </span>
      </header>

      <article className="priority-intelligence-card">
        <div className="priority-intelligence-icon" aria-hidden="true">
          !
        </div>

        <div className="priority-intelligence-content">
          <div className="priority-intelligence-meta">
            <span>Prioridade do momento</span>
            <strong>Atenção preventiva</strong>
          </div>

          <h3>Crescimento de usuários acima da média recente</h3>

          <p>
            O crescimento da base de moradores poderá aumentar o consumo
            de notificações e os fluxos de atendimento. Nesta fase, o
            indicador é demonstrativo e será substituído por dados reais.
          </p>

          <div className="priority-intelligence-evidence">
            <div>
              <small>Área relacionada</small>
              <strong>Usuários e notificações</strong>
            </div>

            <div>
              <small>Impacto estimado</small>
              <strong>Moderado</strong>
            </div>

            <div>
              <small>Ação recomendada</small>
              <strong>Acompanhar tendência</strong>
            </div>
          </div>

          <button type="button">
            Abrir análise de usuários
          </button>
        </div>
      </article>

      <div className="system-intelligence-grid">
        {secondaryInsights.map((insight) => (
          <article
            key={insight.id}
            className="system-intelligence-mini-card"
          >
            <div className="system-intelligence-mini-header">
              <span>{insight.category}</span>
              <strong>{insight.status}</strong>
            </div>

            <h3>{insight.title}</h3>
            <p>{insight.description}</p>

            <button type="button">
              Ver detalhes
            </button>
          </article>
        ))}
      </div>

      <article className="dashboard-placeholder-panel">
        <div>
          <span>Visão integrada</span>
          <h3>Mapa de saúde do ecossistema</h3>
          <p>
            Este espaço receberá os indicadores integrados de
            infraestrutura, segurança, operação, experiência e negócios.
          </p>
        </div>

        <div className="dashboard-placeholder-bars">
          <i style={{ width: '92%' }} />
          <i style={{ width: '84%' }} />
          <i style={{ width: '76%' }} />
          <i style={{ width: '88%' }} />
        </div>
      </article>
    </section>
  )
}

export default SystemIntelligenceView