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

import "./DashboardAdminRightSidebar.css";


/* =========================================================
   COMUNICAÇÃO — ESTADO ATUAL
   =========================================================
   
   Comunicação ainda não possui o componente global
   definitivo.
   
   Quando existir, esta implementação local será
   substituída pelo componente público correspondente.
   ========================================================= */

function AdminCommunicationCard({
  content = null,
}) {
  if (content) {
    return (
      <div className="dashboard-admin-sidebar-slot">
        {content}
      </div>
    );
  }

  return (
    <section className="dashboard-admin-sidebar-integration">
      <div className="dashboard-admin-sidebar-integration__header">

        <span className="dashboard-admin-sidebar-integration__icon">
          <Megaphone
            size={18}
            strokeWidth={2}
            aria-hidden="true"
          />
        </span>

        <div className="dashboard-admin-sidebar-integration__identity">

          <span className="dashboard-admin-sidebar-integration__eyebrow">
            COMUNICAÇÃO
          </span>

          <h3>
            Comunicação Premium
          </h3>

        </div>
      </div>

      <div className="dashboard-admin-sidebar-integration__body">

        <span className="dashboard-admin-sidebar-integration__status">
          Integração em preparação
        </span>

        <p>
          Os comunicados reais e autorizados do condomínio
          serão exibidos nesta área quando o domínio oficial
          de comunicação estiver conectado.
        </p>

      </div>
    </section>
  );
}


/* =========================================================
   SIDEBAR DIREITA PREMIUM
   =========================================================
   
   Ordem oficial:
   
   1. Comunicação Premium
   2. PartnerAdCard
   3. CalendarSidebarCard
   
   Este arquivo apenas compõe.
   
   Não possui:
   
   - regra comercial;
   - seleção de campanha;
   - persistência de calendário;
   - autorização de eventos;
   - dados operacionais próprios.
   ========================================================= */

function DashboardAdminRightSidebar({
  communicationContent = null,
  calendarEvents = [],
  onOpenCalendar,
}) {
  return (
    <div className="dashboard-admin-right-sidebar">

      {/* ===================================================
          1. COMUNICAÇÃO
          =================================================== */}

      <AdminCommunicationCard
        content={
          communicationContent
        }
      />


      {/* ===================================================
          2. PARCEIROS
          ===================================================
          
          Preview temporário institucional já centralizado
          no domínio Parceiros/Publicidade.
          
          Não existe campanha hardcoded neste Dashboard.
          
          Quando o resolvedor real existir:
          
          módulo Parceiros/Publicidade
                    ↓
          contrato autorizado
                    ↓
              PartnerAdCard
          
          Este componente continua o mesmo.
          =================================================== */}

      <div
        className="
          dashboard-admin-sidebar-slot
          dashboard-admin-sidebar-slot--partner
        "
        aria-label="Publicidade de parceiros"
      >
        <PartnerAdCard
          slides={
            TEMPORARY_PARTNER_AD_SLIDES
          }
          variant="sidebar"
          autoPlay
          interval={7000}
          showIndicators
          moduleContext="ADMIN"
          placement="DASHBOARD_RIGHT_SIDEBAR"
        />
      </div>


      {/* ===================================================
          3. CALENDÁRIO PREMIUM
          ===================================================
          
          CalendarSidebarCard é global.
          
          O Dashboard fornece apenas:
          
          - events;
          - callback para abrir calendário.
          
          Nenhum layout interno do calendário será alterado
          para atender exclusivamente ao Dashboard Admin.
          =================================================== */}

      <div
        className="
          dashboard-admin-sidebar-slot
          dashboard-admin-sidebar-slot--calendar
        "
        aria-label="Calendário do condomínio"
      >
        <CalendarSidebarCard
          events={
            calendarEvents
          }
          onOpenCalendar={
            onOpenCalendar
          }
        />
      </div>

    </div>
  );
}


export default DashboardAdminRightSidebar;