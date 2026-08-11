import {
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  CalendarWorkspace,
} from "../../../components/premium/calendar";

import DashboardAdminHeader from "./components/DashboardAdminHeader";
import DashboardAdminMainContent from "./components/DashboardAdminMainContent";
import DashboardAdminRightSidebar from "./components/DashboardAdminRightSidebar";

import AdminAnalyticsSelector from "./navigation/AdminAnalyticsSelector";

import "./DashboardAdmin.css";


const DEFAULT_ANALYSIS = "inteligencia";

const DASHBOARD_VIEW = Object.freeze({
  ANALYTICS: "analytics",
  CALENDAR: "calendar",
});


function scrollDashboardToTop() {
  if (typeof window === "undefined") {
    return;
  }

  window.requestAnimationFrame(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  });
}


function DashboardAdmin({ perfil }) {
  /*
   * =========================================================
   * ANÁLISE ATIVA
   * =========================================================
   *
   * Esse estado é independente da visualização do calendário.
   *
   * Portanto:
   *
   * Inteligência
   * → abre calendário
   * → volta
   * → continua em Inteligência.
   */

  const [
    selectedAnalysis,
    setSelectedAnalysis,
  ] = useState(DEFAULT_ANALYSIS);


  /*
   * =========================================================
   * VISÃO CENTRAL
   * =========================================================
   *
   * analytics
   * → Dashboard Administrativo
   *
   * calendar
   * → CalendarWorkspace
   */

  const [
    dashboardView,
    setDashboardView,
  ] = useState(DASHBOARD_VIEW.ANALYTICS);


  /*
   * =========================================================
   * REFRESH
   * =========================================================
   */

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    lastUpdatedAt,
    setLastUpdatedAt,
  ] = useState(null);


  /*
   * =========================================================
   * PERÍODO ANALÍTICO
   * =========================================================
   *
   * Ainda é apenas o contrato visual.
   *
   * Posteriormente:
   *
   * PeriodFilterPremium
   * → Hook
   * → Service
   * → contratos analíticos.
   *
   * Não confundir com o Calendário Premium.
   */

  const selectedPeriod = useMemo(
    () => ({
      id: "30d",
      label: "Últimos 30 dias",
    }),
    []
  );


  /*
   * =========================================================
   * EVENTOS DO CALENDÁRIO ADMINISTRATIVO
   * =========================================================
   *
   * IMPORTANTE:
   *
   * O Admin NÃO utiliza:
   *
   * MASTER_CALENDAR_FAKE_EVENTS
   *
   * e não possuirá eventos simulados.
   *
   * Esta coleção vazia existe somente para permitir que
   * CalendarSidebarCard e CalendarWorkspace renderizem seus
   * estados vazios oficiais enquanto o domínio Serviços/Agenda
   * ainda não fornece o contrato real.
   *
   * Futuramente:
   *
   * useAdminCalendar()
   *       ↓
   * calendar.service.js
   *       ↓
   * Serviços / Agenda
   *       ↓
   * RLS / autorização
   *       ↓
   * eventos reais do condomínio
   */

  const calendarEvents = useMemo(
    () => [],
    []
  );


  /*
   * =========================================================
   * TROCA DE ANÁLISE
   * =========================================================
   */

  const handleSelectAnalysis = useCallback(
    (analysisId) => {
      setSelectedAnalysis(analysisId);
    },
    []
  );


  /*
   * =========================================================
   * ABRIR CALENDÁRIO
   * =========================================================
   *
   * Não abre modal.
   *
   * Substitui somente o conteúdo central do Dashboard.
   */

  const handleOpenCalendar = useCallback(() => {
    setDashboardView(
      DASHBOARD_VIEW.CALENDAR
    );

    scrollDashboardToTop();
  }, []);


  /*
   * =========================================================
   * VOLTAR AO DASHBOARD
   * =========================================================
   *
   * A análise anteriormente selecionada permanece preservada.
   */

  const handleCloseCalendar = useCallback(() => {
    setDashboardView(
      DASHBOARD_VIEW.ANALYTICS
    );

    scrollDashboardToTop();
  }, []);


  /*
   * =========================================================
   * REFRESH
   * =========================================================
   *
   * Não utiliza:
   *
   * window.location.reload()
   *
   * Quando os hooks reais existirem, cada domínio deverá
   * executar seu próprio refetch.
   */

  const handleRefresh = useCallback(
    async () => {
      if (isRefreshing) {
        return;
      }

      try {
        setIsRefreshing(true);

        /*
         * FUTURO:
         *
         * const results =
         *   await Promise.allSettled([
         *     refetchIntelligence(),
         *     refetchEncomendas(),
         *     refetchFuncionarios(),
         *     refetchCalendar(),
         *   ]);
         *
         * Cada domínio deve continuar independente.
         */

        setLastUpdatedAt(
          new Date()
        );
      } finally {
        setIsRefreshing(false);
      }
    },
    [isRefreshing]
  );


  return (
    <main className="dashboard-admin-page">
      <div className="dashboard-admin-grid">

        {/* ===================================================
            ÁREA PRINCIPAL
            =================================================== */}

        <div className="dashboard-admin-primary-column">

          {dashboardView ===
          DASHBOARD_VIEW.ANALYTICS ? (
            <>
              <DashboardAdminHeader
                perfil={perfil}
                selectedPeriod={selectedPeriod}
                isRefreshing={isRefreshing}
                lastUpdatedAt={lastUpdatedAt}
                onRefresh={handleRefresh}
              />

              <AdminAnalyticsSelector
                selectedAnalysis={
                  selectedAnalysis
                }
                onSelectAnalysis={
                  handleSelectAnalysis
                }
              />

              <section
                className="dashboard-admin-main-column"
                aria-label="Conteúdo analítico do condomínio"
              >
                <DashboardAdminMainContent
                  perfil={perfil}
                  selectedAnalysis={
                    selectedAnalysis
                  }
                  selectedPeriod={
                    selectedPeriod
                  }
                />
              </section>
            </>
          ) : (
            <section
              className="
                dashboard-admin-main-column
                dashboard-admin-main-column--calendar
              "
              aria-label="Calendário administrativo do condomínio"
            >
              <CalendarWorkspace
                events={calendarEvents}
                onBack={
                  handleCloseCalendar
                }
              />
            </section>
          )}

        </div>


        {/* ===================================================
            SIDEBAR DIREITA PREMIUM
            ===================================================
            
            A Sidebar permanece disponível tanto na visão
            analítica quanto na visão completa do calendário.
            
            Ela apenas consome:
            
            - PartnerAdCard global;
            - CalendarSidebarCard global.
            
            Nenhuma alteração de layout específica do Admin
            deve ser feita nesses componentes globais.
            =================================================== */}

        <aside
          className="dashboard-admin-sidebar-column"
          aria-label="Informações complementares do condomínio"
        >
          <DashboardAdminRightSidebar
            perfil={perfil}
            calendarEvents={
              calendarEvents
            }
            onOpenCalendar={
              handleOpenCalendar
            }
          />
        </aside>

      </div>
    </main>
  );
}


export default DashboardAdmin;