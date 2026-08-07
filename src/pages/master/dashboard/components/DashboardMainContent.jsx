import CondominiosAnalyticsView from '../condominios/CondominiosAnalyticsView'
import SystemIntelligenceView from '../intelligence/SystemIntelligenceView'
import UsuariosAnalyticsView from '../usuarios/UsuariosAnalyticsView'
import DashboardComingSoon from '../shared/DashboardComingSoon'

import { findAnalyticsOption } from '../navigation/analyticsCatalog'

import './DashboardMainContent.css'

const AVAILABLE_ANALYTICS = {
  'system-intelligence': SystemIntelligenceView,
  condominiums: CondominiosAnalyticsView,
  users: UsuariosAnalyticsView,
}

function DashboardMainContent({ analysisId }) {
  const AnalyticsComponent = AVAILABLE_ANALYTICS[analysisId]

  if (AnalyticsComponent) {
    return (
      <div className="dashboard-main-content">
        <AnalyticsComponent />
      </div>
    )
  }

  const analysis = findAnalyticsOption(analysisId)

  return (
    <div className="dashboard-main-content">
      <DashboardComingSoon
        title={analysis?.label || 'Análise em preparação'}
        description={
          analysis?.description ||
          'Esta área será integrada gradualmente ao Dashboard Master.'
        }
      />
    </div>
  )
}

export default DashboardMainContent