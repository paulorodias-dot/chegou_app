import {
  useEffect,
  useState,
} from "react";

import {
  CalendarWorkspace,
} from "../../../components/premium/calendar";

import DashboardPortariaHeader from "./components/DashboardPortariaHeader";
import PortariaWorkActions from "./components/PortariaWorkActions";
import PortariaOperationalSummary from "./components/PortariaOperationalSummary";
import PortariaAlerts from "./components/PortariaAlerts";
import DashboardPortariaRightSidebar from "./components/DashboardPortariaRightSidebar";

import PortariaEncomendasSummary from "./encomendas/PortariaEncomendasSummary";
import PortariaIntelligenceSummary from "./intelligence/PortariaIntelligenceSummary";

import useDashboardPortaria from "./hooks/useDashboardPortaria";

import "./DashboardPortaria.css";

function DashboardPortaria({
  perfil,
  onNavigate,
}) {
  const [
    dashboardView,
    setDashboardView,
  ] = useState("dashboard");

  /*
   * Enquanto o domínio Serviços/Agenda ainda não estiver
   * conectado ao Supabase, a Portaria não inventa eventos.
   *
   * Posteriormente este array virá do hook/service oficial,
   * já filtrado e autorizado pelo backend/RLS.
   */
  const calendarEvents = [];

  const {
    somenteMeusProcessos,
    setSomenteMeusProcessos,

    resumo,
    encomendas,
    alertas,
    inteligencia,

    carregandoResumo,
    carregandoEncomendas,
    carregandoAlertas,
    carregandoInteligencia,

    erros,
  } = useDashboardPortaria({
    perfil,
  });

  function scrollDashboardToTop() {
    window.requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });
    });
  }

  function handleOpenCalendar() {
    setDashboardView("calendar");
    scrollDashboardToTop();
  }

  function handleCloseCalendar() {
    setDashboardView("dashboard");
    scrollDashboardToTop();
  }

  function executarAcao(acaoId) {
    if (typeof onNavigate === "function") {
      onNavigate(acaoId);
      return;
    }

    console.info(
      `[Dashboard Portaria] Rota ainda não implementada: ${acaoId}`
    );
  }

  function abrirKpi(kpiId) {
    console.info(
      `[Dashboard Portaria] Detalhamento ainda não implementado: ${kpiId}`
    );
  }

  useEffect(() => {
    function handleShortcut(event) {
      const elementoAtivo = event.target;

      const digitando =
        elementoAtivo instanceof HTMLInputElement ||
        elementoAtivo instanceof HTMLTextAreaElement ||
        elementoAtivo instanceof HTMLSelectElement ||
        elementoAtivo?.isContentEditable;

      if (digitando) {
        return;
      }

      const atalhos = {
        F2: "receber-encomenda",
        F3: "encomenda-rapida",
        F4: "cadastrar-encomenda",
        F5: "entregar-encomenda",
        F6: "painel-encomendas",
        F7: "whatsapp-pendentes",
      };

      const acao = atalhos[event.key];

      if (!acao) {
        return;
      }

      event.preventDefault();

      executarAcao(acao);
    }

    window.addEventListener(
      "keydown",
      handleShortcut
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleShortcut
      );
    };
  }, [onNavigate]);

  return (
    <div className="dashboard-portaria-page">
      <div className="dashboard-portaria-grid">
        <main className="dashboard-portaria-content">
          {dashboardView === "dashboard" ? (
            <>
              <DashboardPortariaHeader
                condominioNome={
                  perfil?.nome_condominio ||
                  perfil?.condominio_nome ||
                  "Condomínio"
                }
                operadorNome={
                  perfil?.nome ||
                  perfil?.nome_completo ||
                  "Operador"
                }
                turno={
                  perfil?.turno_nome ||
                  perfil?.turno ||
                  null
                }
              />

              <PortariaWorkActions
                onAction={executarAcao}
              />

              <PortariaOperationalSummary
                resumo={resumo}
                carregando={carregandoResumo}
                somenteMeusProcessos={
                  somenteMeusProcessos
                }
                onToggleMeusProcessos={
                  setSomenteMeusProcessos
                }
                onOpenKpi={abrirKpi}
              />

              <div className="dashboard-portaria-operational-grid">
                <PortariaAlerts
                  alertas={alertas}
                  carregando={
                    carregandoAlertas
                  }
                  erro={erros.alertas}
                />

                <PortariaEncomendasSummary
                  dados={encomendas}
                  carregando={
                    carregandoEncomendas
                  }
                />
              </div>

              <PortariaIntelligenceSummary
                itens={inteligencia}
                carregando={
                  carregandoInteligencia
                }
              />
            </>
          ) : (
            <CalendarWorkspace
              events={calendarEvents}
              onBack={handleCloseCalendar}
            />
          )}
        </main>

        <DashboardPortariaRightSidebar
          calendarEvents={calendarEvents}
          onOpenCalendar={
            handleOpenCalendar
          }
        />
      </div>
    </div>
  );
}

export default DashboardPortaria;