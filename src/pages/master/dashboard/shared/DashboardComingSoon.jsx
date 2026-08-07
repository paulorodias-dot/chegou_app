import './DashboardComingSoon.css'

function DashboardComingSoon({ title, description }) {
  return (
    <section className="dashboard-coming-soon">
      <div
        className="dashboard-coming-soon-icon"
        aria-hidden="true"
      >
        +
      </div>

      <span>Categoria preparada</span>
      <h2>{title}</h2>
      <p>{description}</p>

      <div className="dashboard-coming-soon-status">
        <strong>Arquitetura disponível</strong>
        <small>
          Os indicadores e integrações serão adicionados gradualmente.
        </small>
      </div>
    </section>
  )
}

export default DashboardComingSoon