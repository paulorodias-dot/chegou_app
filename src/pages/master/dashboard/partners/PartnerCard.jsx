import './PartnerCard.css'

function PartnerCard() {
  return (
    <article className="dashboard-partner-card">
      <div className="dashboard-partner-card-label">
        Parceiros
      </div>

      <div className="dashboard-partner-visual" aria-hidden="true">
        <span>P</span>
      </div>

      <div className="dashboard-partner-content">
        <h2>Espaço estratégico de parceiros</h2>

        <p>
          Área preparada para campanhas, indicadores comerciais,
          oportunidades e desempenho das futuras parcerias.
        </p>

        <div className="dashboard-partner-status">
          <span>Status</span>
          <strong>Estrutura preparada</strong>
        </div>
      </div>
    </article>
  )
}

export default PartnerCard