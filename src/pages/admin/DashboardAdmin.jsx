import {
  useCallback,
  useMemo,
  useState,
} from "react";

import DashboardAdminHeader from "./components/DashboardAdminHeader";
import DashboardAdminMainContent from "./components/DashboardAdminMainContent";
import DashboardAdminRightSidebar from "./components/DashboardAdminRightSidebar";

import AdminAnalyticsSelector from "./navigation/AdminAnalyticsSelector";

import "./DashboardAdmin.css";

const DEFAULT_ANALYSIS = "inteligencia";

function DashboardAdmin({ perfil }) {
  const [selectedAnalysis, setSelectedAnalysis] =
    useState(DEFAULT_ANALYSIS);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [lastUpdatedAt, setLastUpdatedAt] =
    useState(null);

  /*
   * =========================================================
   * PERÍODO
   * =========================================================
   *
   * Nesta fundação representa apenas o contexto visual.
   *
   * Posteriormente será substituído pelo PeriodFilterPremium
   * oficial e passará a controlar os contratos analíticos.
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
   * CALENDÁRIO
   * =========================================================
   *
   * null:
   * integração ainda não resolvida/conectada.
   *
   * []:
   * integração real resolvida e nenhum evento autorizado.
   *
   * [...]&#58;    * eventos reais autorizados do condomínio.
   *
   * Não utilizar eventos fake no Dashboard Administrativo.
   */
  const calendarEvents = null;

  /*
   * =========================================================
   * SELEÇÃO DE ANÁLISE
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
   * REFRESH
   * =========================================================
   *
   * Nesta etapa não existem queries conectadas.
   *
   * Futuramente este método deverá coordenar refetches
   * independentes dos hooks dos domínios.
   *
   * Nunca utilizar window.location.reload().
   */
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) {
      return;
    }

    try {
      setIsRefreshing(true);

      /*
       * FUTURO:
       *
       * await Promise.allSettled([
       *   refetchIntelligence(),
       *   refetchEncomendas(),
       *   refetchSidebar(),
       * ]);
       */

      setLastUpdatedAt(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  /*
   * =========================================================
   * CALENDÁRIO COMPLETO
   * =========================================================
   *
   * Posteriormente poderá:
   *
   * - abrir CalendarWorkspace;
   * - trocar o conteúdo central;
   * - ou navegar para a rota oficial de Agenda.
   */
  const handleOpenCalendar = useCallback(() => {
    // Integração futura.
  }, []);

  return (
    <main className="dashboard-admin-page">
      <div className="dashboard-admin-grid">

        {/* ===================================================
            COLUNA PRINCIPAL
            =================================================== */}

        <div className="dashboard-admin-primary-column">

          <DashboardAdminHeader
            perfil={perfil}
            selectedPeriod={selectedPeriod}
            isRefreshing={isRefreshing}
            lastUpdatedAt={lastUpdatedAt}
            onRefresh={handleRefresh}
          />

          <AdminAnalyticsSelector
            selectedAnalysis={selectedAnalysis}
            onSelectAnalysis={handleSelectAnalysis}
          />

          <section
            className="dashboard-admin-main-column"
            aria-label="Conteúdo analítico do condomínio"
          >
            <DashboardAdminMainContent
              perfil={perfil}
              selectedAnalysis={selectedAnalysis}
              selectedPeriod={selectedPeriod}
            />
          </section>
        </div>

        {/* ===================================================
            SIDEBAR DIREITA PREMIUM
            ===================================================
            
            IMPORTANTE:
            
            O DashboardAdmin NÃO conhece publicidade.
            
            O DashboardAdminRightSidebar é responsável por
            consumir o PartnerAdCard oficial e o contrato
            temporário institucional já centralizado no
            domínio Parceiros/Publicidade.
            =================================================== */}

        <aside
          className="dashboard-admin-sidebar-column"
          aria-label="Informações complementares do condomínio"
        >
          <DashboardAdminRightSidebar
            perfil={perfil}
            calendarEvents={calendarEvents}
            onOpenCalendar={handleOpenCalendar}
          />
        </aside>

      </div>
    </main>
  );
}

export default DashboardAdmin;