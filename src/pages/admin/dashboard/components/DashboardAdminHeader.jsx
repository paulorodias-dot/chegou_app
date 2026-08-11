import {
  CalendarDays,
  RefreshCw,
  Settings2,
} from "lucide-react";

import "./DashboardAdminHeader.css";


function formatLastUpdated(date) {
  if (!date) {
    return "Ainda não atualizado nesta sessão";
  }

  try {
    return new Intl.DateTimeFormat(
      "pt-BR",
      {
        dateStyle: "short",
        timeStyle: "short",
      }
    ).format(date);
  } catch {
    return "Atualizado";
  }
}


function DashboardAdminHeader({
  selectedPeriod,
  isRefreshing = false,
  lastUpdatedAt = null,
  onRefresh,
}) {
  return (
    <header className="dashboard-admin-header">
      <div className="dashboard-admin-header__content">

        {/* ===================================================
            IDENTIDADE
            =================================================== */}

        <div className="dashboard-admin-header__identity">

          <span className="dashboard-admin-header__eyebrow">
            MÓDULO ADMINISTRATIVO
          </span>

          <h1 className="dashboard-admin-header__title">
            Visão Geral do Condomínio
          </h1>

          <p className="dashboard-admin-header__description">
            Acompanhe operação, encomendas, moradores,
            funcionários, serviços e indicadores estratégicos
            do condomínio.
          </p>

          <div
            className="dashboard-admin-header__metadata"
            aria-label="Contexto do Dashboard"
          >
            <span className="dashboard-admin-header__metadata-item">
              <CalendarDays
                size={14}
                aria-hidden="true"
              />

              {selectedPeriod?.label ||
                "Período não selecionado"}
            </span>

            <span
              className="dashboard-admin-header__metadata-separator"
              aria-hidden="true"
            />

            <span className="dashboard-admin-header__metadata-text">
              {formatLastUpdated(
                lastUpdatedAt
              )}
            </span>
          </div>

        </div>


        {/* ===================================================
            AÇÕES
            ===================================================
            
            O botão Alertas foi removido.
            
            A Central de Notificações já possui entrada global
            pelo sino da aplicação.
            =================================================== */}

        <div
          className="dashboard-admin-header__actions"
          aria-label="Ações do Dashboard"
        >
          <button
            type="button"
            className="
              dashboard-admin-header__action
              dashboard-admin-header__action--secondary
            "
            aria-label="Configurações do Dashboard"
            title="Configurações"
            disabled
          >
            <Settings2
              size={18}
              aria-hidden="true"
            />

            <span>
              Configurações
            </span>
          </button>

          <button
            type="button"
            className="
              dashboard-admin-header__action
              dashboard-admin-header__action--primary
            "
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-busy={isRefreshing}
          >
            <RefreshCw
              size={18}
              className={
                isRefreshing
                  ? "dashboard-admin-header__refresh-icon--spinning"
                  : ""
              }
              aria-hidden="true"
            />

            <span>
              {isRefreshing
                ? "Atualizando..."
                : "Atualizar"}
            </span>
          </button>
        </div>

      </div>
    </header>
  );
}


export default DashboardAdminHeader;