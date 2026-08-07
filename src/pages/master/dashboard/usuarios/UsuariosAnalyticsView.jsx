import './UsuariosAnalyticsView.css'

function UsuariosAnalyticsView() {
  return (
    <section className="dashboard-analysis-section">
      <header className="dashboard-analysis-heading">
        <div>
          <h2>Análise de Usuários</h2>
          <p>
            Crescimento da base, distribuição por perfil,
            ativação, vínculos e comportamento dos usuários.
          </p>
        </div>
      </header>

      <div className="usuarios-summary-card">
        <div>
          <span>Usuários oficiais no ecossistema</span>
          <strong>—</strong>
          <p>
            Os dados reais serão conectados na próxima etapa,
            excluindo usuários e condomínios de teste.
          </p>
        </div>

        <div className="usuarios-summary-status">
          <span>Integração</span>
          <strong>Pendente</strong>
        </div>
      </div>

      <div className="usuarios-profile-grid">
        {[
          'Moradores',
          'Dependentes',
          'Funcionários',
          'Administrativos',
        ].map((profile) => (
          <article key={profile}>
            <span>{profile}</span>
            <strong>—</strong>
            <small>Aguardando dados reais</small>
          </article>
        ))}
      </div>

      <article className="usuarios-funnel-panel">
        <header>
          <div>
            <span>Jornada</span>
            <h3>Funil de ativação dos usuários</h3>
          </div>
        </header>

        <div className="usuarios-funnel">
          <div style={{ width: '100%' }}>
            <span>Cadastros iniciados</span>
            <strong>—</strong>
          </div>

          <div style={{ width: '84%' }}>
            <span>Cadastros enviados</span>
            <strong>—</strong>
          </div>

          <div style={{ width: '68%' }}>
            <span>Aprovados</span>
            <strong>—</strong>
          </div>

          <div style={{ width: '56%' }}>
            <span>Contas ativas</span>
            <strong>—</strong>
          </div>
        </div>
      </article>
    </section>
  )
}

export default UsuariosAnalyticsView