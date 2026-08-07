import {
  CalendarSidebarCard,
} from '../../../../components/premium/calendar'

import {
  PartnerAdCard,
  TEMPORARY_PARTNER_AD_SLIDES,
} from '../../../parceiros/publicidade/card'

import './DashboardRightSidebar.css'

function DashboardRightSidebar({
  calendarEvents = [],
  onOpenCalendar,
}) {
  return (
    <div className="dashboard-right-sidebar-content">
      <article className="dashboard-sidebar-priority-card">
        <div className="dashboard-sidebar-priority-header">
          <span>Comunicação Chegou!</span>
          <strong>Novidade</strong>
        </div>

        <h2>
          Central de comunicação institucional
        </h2>

        <p>
          Atualizações, orientações e novidades
          relevantes para a gestão estratégica da
          plataforma serão apresentadas neste espaço.
        </p>

        <button type="button">
          Ver comunicações
        </button>
      </article>

      <PartnerAdCard
        slides={TEMPORARY_PARTNER_AD_SLIDES}
        variant="sidebar"
        autoPlay
        interval={7000}
        showIndicators
        moduleContext="MASTER"
        placement="DASHBOARD_RIGHT_SIDEBAR"
      />

      <CalendarSidebarCard
        events={calendarEvents}
        onOpenCalendar={onOpenCalendar}
      />
    </div>
  )
}

export default DashboardRightSidebar