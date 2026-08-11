import {
  Megaphone,
} from "lucide-react";

import {
  PartnerAdCard,
  TEMPORARY_PARTNER_AD_SLIDES,
} from "../../../parceiros/publicidade/card";

import {
  CalendarSidebarCard,
} from "../../../../components/premium/calendar";

import "./DashboardPortariaRightSidebar.css";

function DashboardPortariaRightSidebar({
  calendarEvents = [],
  onOpenCalendar,
}) {
  return (
    <aside
      className="dashboard-portaria-sidebar"
      aria-label="Informações complementares da Portaria"
    >
      <section className="dashboard-portaria-communication-card">
        <div className="dashboard-portaria-sidebar-card-top">
          <span>
            Comunicação Chegou!
          </span>

          <div>
            <Megaphone
              size={19}
              aria-hidden="true"
            />
          </div>
        </div>

        <h2>
          Comunicação operacional
        </h2>

        <p>
          Comunicados relevantes para a operação da
          Portaria serão apresentados neste espaço.
        </p>

        <small>
          Aguardando atualização
        </small>
      </section>

      <div className="dashboard-portaria-partner-slot">
        <PartnerAdCard
          slides={TEMPORARY_PARTNER_AD_SLIDES}
          variant="sidebar"
          autoPlay
          interval={7000}
          showIndicators
          moduleContext="PORTARIA"
          placement="DASHBOARD_RIGHT_SIDEBAR"
        />
      </div>

      <div className="dashboard-portaria-calendar-slot">
        <CalendarSidebarCard
          events={calendarEvents}
          eyebrow="Agenda Operacional"
          title="Calendário"
          onOpenCalendar={onOpenCalendar}
        />
      </div>
    </aside>
  );
}

export default DashboardPortariaRightSidebar;