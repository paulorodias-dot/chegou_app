import {
  Building2,
  CarFront,
  ChevronDown,
  Home,
  MapPin,
  UserRound,
  UsersRound,
} from "lucide-react";

import {
  useState,
} from "react";

import {
  PartnerAdCard,
  TEMPORARY_PARTNER_AD_SLIDES,
} from "../../../parceiros/publicidade/card";

import {
  CalendarSidebarCard,
} from "../../../../components/premium/calendar";

import {
  DASHBOARD_MORADOR_MODULE_CONTEXT,
  DASHBOARD_MORADOR_PARTNER_PLACEMENT,
} from "../config/dashboardMorador.constants";

import "./DashboardMoradorRightSidebar.css";

function possuiValor(valor) {
  return !(
    valor === undefined ||
    valor === null ||
    String(valor).trim() === ""
  );
}

function formatarTextoTecnico(valor) {
  if (!possuiValor(valor)) {
    return null;
  }

  return String(valor)
    .trim()
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letra) =>
      letra.toUpperCase()
    );
}

function formatarTipoMorador(valor) {
  if (!possuiValor(valor)) {
    return null;
  }

  const chave = String(valor)
    .trim()
    .toLowerCase();

  const mapa = {
    proprietario:
      "Proprietário",

    proprietário:
      "Proprietário",

    inquilino:
      "Inquilino",

    residente:
      "Residente",

    proprietario_residente:
      "Proprietário Residente",

    proprietário_residente:
      "Proprietário Residente",

    proprietario_nao_residente:
      "Proprietário Não Residente",

    "proprietário_não_residente":
      "Proprietário Não Residente",
  };

  return (
    mapa[chave] ||
    formatarTextoTecnico(chave)
  );
}

function formatarUsoGaragem(garagem) {
  const candidatos = [
    garagem?.modoUso,
    garagem?.tipo,
    garagem?.statusVaga,
    garagem?.status,
  ];

  const valor = candidatos.find(
    possuiValor
  );

  if (!valor) {
    if (
      garagem?.pertenceUnidade ===
      true
    ) {
      return "Vaga da unidade";
    }

    return null;
  }

  const chave = String(valor)
    .trim()
    .toLowerCase();

  const mapa = {
    propria: "Própria",
    proprio: "Própria",
    próprio: "Própria",

    uso_proprio: "Uso próprio",
    uso_próprio: "Uso próprio",

    alugada: "Alugada",
    aluguel: "Alugada",

    emprestada: "Emprestada",
    emprestimo: "Emprestada",
    empréstimo: "Emprestada",

    cedida: "Cedida",

    rotativa: "Rotativa",
    rotativo: "Rotativa",

    vaga_rotativa: "Vaga rotativa",

    nao_utilizada:
      "Não utilizada",

    não_utilizada:
      "Não utilizada",

    nao_utilizado:
      "Não utilizada",

    não_utilizado:
      "Não utilizada",

    compartilhada:
      "Compartilhada",
  };

  return (
    mapa[chave] ||
    formatarTextoTecnico(chave)
  );
}

function formatarParentesco(valor) {
  if (!possuiValor(valor)) {
    return "Dependente";
  }

  return (
    formatarTextoTecnico(valor) ||
    "Dependente"
  );
}

function SummaryMetric({
  icon: Icon,
  label,
  value,
}) {
  if (!possuiValor(value)) {
    return null;
  }

  return (
    <div className="dashboard-morador-summary-metric">
      <span>
        <Icon
          size={15}
          aria-hidden="true"
        />

        {label}
      </span>

      <strong
        title={String(value)}
      >
        {value}
      </strong>
    </div>
  );
}

function GaragemAccordion({
  garagens,
}) {
  const [aberto, setAberto] =
    useState(false);

  if (!garagens.length) {
    return null;
  }

  return (
    <div
      className={[
        "dashboard-morador-summary-accordion",
        aberto ? "is-open" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className="dashboard-morador-summary-accordion__trigger"
        onClick={() =>
          setAberto(
            (atual) => !atual
          )
        }
        aria-expanded={aberto}
      >
        <span>
          <CarFront
            size={15}
            aria-hidden="true"
          />

          Garagens
        </span>

        <span className="dashboard-morador-summary-accordion__summary">
          <strong>
            {garagens.length}
          </strong>

          <ChevronDown
            size={16}
            aria-hidden="true"
          />
        </span>
      </button>

      {aberto && (
        <div className="dashboard-morador-summary-accordion__content">
          {garagens.map(
            (garagem, index) => {
              const uso =
                formatarUsoGaragem(
                  garagem
                );

              return (
                <article
                  key={
                    garagem.id ||
                    `garagem-${index}`
                  }
                  className="dashboard-morador-garage-item"
                >
                  <header>
                    <div>
                      <CarFront
                        size={16}
                        aria-hidden="true"
                      />

                      <strong>
                        {garagem.numero
                          ? `Vaga ${garagem.numero}`
                          : `Vaga ${index + 1}`}
                      </strong>
                    </div>

                    {uso && (
                      <span>
                        {uso}
                      </span>
                    )}
                  </header>

                  {possuiValor(
                    garagem.local
                  ) && (
                    <div className="dashboard-morador-garage-item__detail">
                      <span>
                        <MapPin
                          size={14}
                          aria-hidden="true"
                        />

                        Local
                      </span>

                      <strong>
                        {garagem.local}
                      </strong>
                    </div>
                  )}

                  {possuiValor(
                    garagem.tipoFisico
                  ) && (
                    <div className="dashboard-morador-garage-item__detail">
                      <span>
                        Tipo
                      </span>

                      <strong>
                        {formatarTextoTecnico(
                          garagem.tipoFisico
                        )}
                      </strong>
                    </div>
                  )}
                </article>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}

function DependentesAccordion({
  dependentes,
}) {
  const [aberto, setAberto] =
    useState(false);

  /*
   * Nenhum Dependente:
   * não ocupa espaço no resumo.
   */
  if (!dependentes.length) {
    return null;
  }

  return (
    <div
      className={[
        "dashboard-morador-summary-accordion",
        aberto ? "is-open" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className="dashboard-morador-summary-accordion__trigger"
        onClick={() =>
          setAberto(
            (atual) => !atual
          )
        }
        aria-expanded={aberto}
      >
        <span>
          <UsersRound
            size={15}
            aria-hidden="true"
          />

          Dependentes
        </span>

        <span className="dashboard-morador-summary-accordion__summary">
          <strong>
            {dependentes.length}
          </strong>

          <ChevronDown
            size={16}
            aria-hidden="true"
          />
        </span>
      </button>

      {aberto && (
        <div className="dashboard-morador-summary-accordion__content">
          {dependentes.map(
            (dependente, index) => (
              <article
                className="dashboard-morador-dependent-item"
                key={
                  dependente.id ||
                  `dependente-${index}`
                }
              >
                <span className="dashboard-morador-dependent-item__avatar">
                  <UserRound
                    size={15}
                    aria-hidden="true"
                  />
                </span>

                <div>
                  <strong>
                    {dependente.nome ||
                      "Dependente"}
                  </strong>

                  <span>
                    {formatarParentesco(
                      dependente.tipoVinculo
                    )}
                  </span>
                </div>
              </article>
            )
          )}
        </div>
      )}
    </div>
  );
}

export default function DashboardMoradorRightSidebar({
  perfilDescricao,

  resumo,

  calendarEvents = [],

  erroResumo,

  erroAgenda,

  onOpenCalendar,
}) {
  const garagens =
    Array.isArray(
      resumo?.garagens
    )
      ? resumo.garagens
      : [];

  const dependentes =
    Array.isArray(
      resumo?.dependentes
    )
      ? resumo.dependentes
      : [];

  const garagemUnica =
    garagens.length === 1
      ? garagens[0]
      : null;

  const usoGaragemUnica =
    garagemUnica
      ? formatarUsoGaragem(
          garagemUnica
        )
      : null;

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
            <SummaryMetric
              icon={UserRound}
              label="Nome"
              value={
                resumo?.nomeMorador
              }
            />

            <SummaryMetric
              icon={UserRound}
              label="Perfil"
              value={
                perfilDescricao
              }
            />

            <SummaryMetric
              icon={Home}
              label="Vínculo"
              value={
                formatarTipoMorador(
                  resumo?.tipoMorador
                )
              }
            />

            <SummaryMetric
              icon={Building2}
              label="Condomínio"
              value={
                resumo?.condominioNome
              }
            />

            <SummaryMetric
              icon={Building2}
              label="Torre"
              value={
                resumo?.torreExibicao
              }
            />

            <SummaryMetric
              icon={Home}
              label="Unidade"
              value={
                resumo?.unidade
              }
            />

            {garagens.length === 1 && (
              <>
                <SummaryMetric
                  icon={CarFront}
                  label="Garagem"
                  value={
                    garagemUnica?.numero ||
                    usoGaragemUnica
                  }
                />

                <SummaryMetric
                  icon={MapPin}
                  label="Local"
                  value={
                    garagemUnica?.local
                  }
                />

                <SummaryMetric
                  icon={CarFront}
                  label="Uso"
                  value={
                    usoGaragemUnica
                  }
                />
              </>
            )}

            {garagens.length > 1 && (
              <GaragemAccordion
                garagens={garagens}
              />
            )}

            <DependentesAccordion
              dependentes={
                dependentes
              }
            />
          </div>
        )}
      </article>

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
          events={
            calendarEvents
          }
          onOpenCalendar={
            onOpenCalendar
          }
        />
      )}
    </div>
  );
}