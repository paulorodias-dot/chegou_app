import {
  Building2,
  CarFront,
  Home,
  MapPin,
  UserRound,
  UsersRound,
} from "lucide-react";

import {
  PartnerAdCard,
  TEMPORARY_PARTNER_AD_SLIDES,
} from "../../../parceiros/publicidade/card";

import {
  CalendarSidebarCard,
} from "../../../../components/premium/calendar";

import {
  DASHBOARD_MORADOR_EMPTY_VALUE,
  DASHBOARD_MORADOR_MODULE_CONTEXT,
  DASHBOARD_MORADOR_PARTNER_PLACEMENT,
} from "../config/dashboardMorador.constants";

import "./DashboardMoradorRightSidebar.css";

function exibir(valor) {
  if (
    valor === undefined ||
    valor === null ||
    String(valor).trim() === ""
  ) {
    return DASHBOARD_MORADOR_EMPTY_VALUE;
  }

  return valor;
}

export default function DashboardMoradorRightSidebar({
  perfilDescricao,

  resumo,

  calendarEvents = [],

  erroResumo,

  erroAgenda,

  onOpenCalendar,
}) {
  return (
    <div className="dashboard-morador-right-sidebar">
      <article className="dashboard-morador-summary-card">
        <header className="dashboard-morador-summary-card__header">
          <div
            className="dashboard-morador-summary-card__icon"
            aria-hidden="true"
          >
            <UserRound size={18} />
          </div>

          <div>
            <span>
              Sua unidade
            </span>

            <h2>
              Resumo do Morador
            </h2>
          </div>
        </header>

        {erroResumo ? (
          <div className="dashboard-morador-summary-card__error">
            Não foi possível carregar o
            resumo neste momento.
          </div>
        ) : (
          <div className="dashboard-morador-summary-card__metrics">
            <div>
              <span>
                <UserRound
                  size={15}
                  aria-hidden="true"
                />

                Perfil
              </span>

              <strong>
                {exibir(
                  perfilDescricao
                )}
              </strong>
            </div>

            <div>
              <span>
                <Building2
                  size={15}
                  aria-hidden="true"
                />

                Torre
              </span>

              <strong>
                {exibir(
                  resumo?.torre
                )}
              </strong>
            </div>

            <div>
              <span>
                <Home
                  size={15}
                  aria-hidden="true"
                />

                Unidade
              </span>

              <strong>
                {exibir(
                  resumo?.unidade
                )}
              </strong>
            </div>

            <div>
              <span>
                <CarFront
                  size={15}
                  aria-hidden="true"
                />

                Garagem
              </span>

              <strong>
                {exibir(
                  resumo?.garagem
                )}
              </strong>
            </div>

            <div>
              <span>
                <MapPin
                  size={15}
                  aria-hidden="true"
                />

                Local
              </span>

              <strong>
                {exibir(
                  resumo?.localGaragem
                )}
              </strong>
            </div>

            <div>
              <span>
                <UsersRound
                  size={15}
                  aria-hidden="true"
                />

                Dependentes
              </span>

              <strong>
                {exibir(
                  resumo?.dependentes
                )}
              </strong>
            </div>
          </div>
        )}
      </article>

      {/*
        COMPONENTE GLOBAL.

        Nenhum layout interno do card
        é configurado neste Dashboard.
      */}

      <PartnerAdCard
        slides={
          TEMPORARY_PARTNER_AD_SLIDES
        }
        variant="sidebar"
        autoPlay
        interval={7000}
        showIndicators
        moduleContext={
          DASHBOARD_MORADOR_MODULE_CONTEXT
        }
        placement={
          DASHBOARD_MORADOR_PARTNER_PLACEMENT
        }
      />

      {/*
        COMPONENTE GLOBAL.

        Nenhuma estrutura interna do calendário
        pertence ao Dashboard Morador.
      */}

      {erroAgenda ? (
        <div className="dashboard-morador-calendar-error">
          <strong>
            Calendário indisponível
          </strong>

          <span>
            Não foi possível carregar sua
            agenda neste momento.
          </span>
        </div>
      ) : (
        <CalendarSidebarCard
          events={calendarEvents}
          onOpenCalendar={
            onOpenCalendar
          }
        />
      )}
    </div>
  );
}