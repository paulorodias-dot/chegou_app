import {
  useState,
} from "react";

import {
  CalendarWorkspace,
} from "../../../components/premium/calendar";

import DashboardMoradorHeader from "./components/DashboardMoradorHeader";

import DashboardMoradorMainContent from "./components/DashboardMoradorMainContent";

import DashboardMoradorRightSidebar from "./components/DashboardMoradorRightSidebar";

import {
  DASHBOARD_MORADOR_VIEW,
} from "./config/dashboardMorador.constants";

import useDashboardMorador from "./hooks/useDashboardMorador";

import "./DashboardMorador.css";

function scrollDashboardToTop() {
  window.requestAnimationFrame(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  });
}

export default function DashboardMorador({
  usuario,
  perfil,
  onNavigate,
}) {
  const usuarioAtual =
    usuario || perfil || null;

  const [
    dashboardView,
    setDashboardView,
  ] = useState(
    DASHBOARD_MORADOR_VIEW.DASHBOARD
  );

  const {
    primeiroNome,

    perfilDescricao,

    resumo,

    indicadores,

    eventos,

    carregando,

    erroResumo,

    erroAgenda,
  } = useDashboardMorador({
    usuario: usuarioAtual,
  });

  function handleOpenCalendar() {
    setDashboardView(
      DASHBOARD_MORADOR_VIEW.CALENDAR
    );

    scrollDashboardToTop();
  }

  function handleCloseCalendar() {
    setDashboardView(
      DASHBOARD_MORADOR_VIEW.DASHBOARD
    );

    scrollDashboardToTop();
  }

  return (
    <section className="dashboard-morador-page">
      <div className="dashboard-morador-grid">
        <main className="dashboard-morador-main">
          {dashboardView ===
          DASHBOARD_MORADOR_VIEW.DASHBOARD ? (
            <>
              <DashboardMoradorHeader
                primeiroNome={
                  primeiroNome
                }
              />

              <DashboardMoradorMainContent
                indicadores={
                  indicadores
                }
                carregando={
                  carregando
                }
                onNavigate={
                  onNavigate
                }
              />
            </>
          ) : (
            <CalendarWorkspace
              events={eventos}
              onBack={
                handleCloseCalendar
              }
            />
          )}
        </main>

        <aside className="dashboard-morador-sidebar">
          <DashboardMoradorRightSidebar
            perfilDescricao={
              perfilDescricao
            }
            resumo={resumo}
            calendarEvents={eventos}
            erroResumo={
              erroResumo
            }
            erroAgenda={
              erroAgenda
            }
            onOpenCalendar={
              handleOpenCalendar
            }
          />
        </aside>
      </div>
    </section>
  );
}