import {
  ArrowRight,
  CalendarDays,
  CarFront,
  Package,
  Radar,
  UsersRound,
} from "lucide-react";

import {
  DASHBOARD_MORADOR_EMPTY_VALUE,
  DASHBOARD_MORADOR_ROUTES,
} from "../config/dashboardMorador.constants";

import "./DashboardMoradorMainContent.css";

function exibirIndicador(valor) {
  if (
    valor === undefined ||
    valor === null
  ) {
    return DASHBOARD_MORADOR_EMPTY_VALUE;
  }

  return valor;
}

function DashboardPrimaryCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  value,
  variant,
  onClick,
}) {
  return (
    <button
      type="button"
      className={[
        "dashboard-morador-primary-card",
        `dashboard-morador-primary-card--${variant}`,
      ].join(" ")}
      onClick={onClick}
    >
      <div className="dashboard-morador-primary-card__top">
        <span
          className="dashboard-morador-primary-card__icon"
          aria-hidden="true"
        >
          <Icon size={20} />
        </span>

        <ArrowRight
          size={17}
          aria-hidden="true"
        />
      </div>

      <div className="dashboard-morador-primary-card__body">
        <span>
          {eyebrow}
        </span>

        <strong>
          {title}
        </strong>

        <p>
          {description}
        </p>
      </div>

      <footer className="dashboard-morador-primary-card__footer">
        <strong>
          {exibirIndicador(value)}
        </strong>

        <span>
          Ver detalhes
        </span>
      </footer>
    </button>
  );
}

export default function DashboardMoradorMainContent({
  indicadores,
  carregando,
  onNavigate,
}) {
  function navegar(destino) {
    if (
      typeof onNavigate ===
      "function"
    ) {
      onNavigate(destino);
    }
  }

  return (
    <div className="dashboard-morador-main-content">
      <section
        className="dashboard-morador-primary-grid"
        aria-label="Principais serviços"
      >
        <DashboardPrimaryCard
          icon={Package}
          eyebrow="Encomendas"
          title="Minhas encomendas"
          description="Recebimentos e retiradas."
          value={
            indicadores
              ?.encomendasAguardando
          }
          variant="orange"
          onClick={() =>
            navegar(
              DASHBOARD_MORADOR_ROUTES
                .encomendas
            )
          }
        />

        <DashboardPrimaryCard
          icon={Radar}
          eyebrow="Rastreio"
          title="Rastrear encomenda"
          description="Acompanhe seus rastreios."
          value={
            indicadores
              ?.rastreiosAtivos
          }
          variant="purple"
          onClick={() =>
            navegar(
              DASHBOARD_MORADOR_ROUTES
                .rastreio
            )
          }
        />

        <DashboardPrimaryCard
          icon={CarFront}
          eyebrow="Garagem"
          title="Empréstimo de garagem"
          description="Vagas, usos e autorizações."
          value={
            indicadores
              ?.emprestimosGaragem
          }
          variant="blue"
          onClick={() =>
            navegar(
              DASHBOARD_MORADOR_ROUTES
                .emprestimoGaragem
            )
          }
        />

        <DashboardPrimaryCard
          icon={CalendarDays}
          eyebrow="Serviços"
          title="Serviços"
          description="Agenda e solicitações."
          value={
            indicadores
              ?.servicosAgendados
          }
          variant="green"
          onClick={() =>
            navegar(
              DASHBOARD_MORADOR_ROUTES
                .servicos
            )
          }
        />
      </section>

      <section className="dashboard-morador-section-card">
        <header className="dashboard-morador-section-card__header">
          <div>
            <span>
              Encomendas
            </span>

            <h2>
              Acompanhe suas encomendas
            </h2>

            <p>
              Recebimentos e retiradas da sua
              unidade serão apresentados aqui.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              navegar(
                DASHBOARD_MORADOR_ROUTES
                  .encomendas
              )
            }
          >
            Ver encomendas

            <ArrowRight
              size={16}
              aria-hidden="true"
            />
          </button>
        </header>

        {carregando ? (
          <div
            className="dashboard-morador-skeleton"
            aria-label="Carregando informações"
          >
            <span />
            <span />
            <span />
          </div>
        ) : (
          <div className="dashboard-morador-empty-state">
            <div>
              <Package
                size={22}
                aria-hidden="true"
              />
            </div>

            <strong>
              Nenhuma informação disponível
            </strong>

            <p>
              Quando houver encomendas
              autorizadas para sua unidade,
              elas aparecerão neste espaço.
            </p>
          </div>
        )}
      </section>

      <section className="dashboard-morador-quick-access">
        <header>
          <span>
            Acesso rápido
          </span>

          <h2>
            Sua área
          </h2>
        </header>

        <div className="dashboard-morador-quick-access__grid">
          <button
            type="button"
            onClick={() =>
              navegar(
                DASHBOARD_MORADOR_ROUTES
                  .encomendas
              )
            }
          >
            <Package
              size={19}
              aria-hidden="true"
            />

            <div>
              <strong>
                Encomendas
              </strong>

              <span>
                Histórico e retiradas
              </span>
            </div>

            <ArrowRight
              size={15}
              aria-hidden="true"
            />
          </button>

          <button
            type="button"
            onClick={() =>
              navegar(
                DASHBOARD_MORADOR_ROUTES
                  .rastreio
              )
            }
          >
            <Radar
              size={19}
              aria-hidden="true"
            />

            <div>
              <strong>
                Rastreio
              </strong>

              <span>
                Acompanhar entregas
              </span>
            </div>

            <ArrowRight
              size={15}
              aria-hidden="true"
            />
          </button>

          <button
            type="button"
            onClick={() =>
              navegar(
                DASHBOARD_MORADOR_ROUTES
                  .emprestimoGaragem
              )
            }
          >
            <CarFront
              size={19}
              aria-hidden="true"
            />

            <div>
              <strong>
                Garagem
              </strong>

              <span>
                Perfil e empréstimos
              </span>
            </div>

            <ArrowRight
              size={15}
              aria-hidden="true"
            />
          </button>

          <button
            type="button"
            onClick={() =>
              navegar(
                DASHBOARD_MORADOR_ROUTES
                  .servicos
              )
            }
          >
            <CalendarDays
              size={19}
              aria-hidden="true"
            />

            <div>
              <strong>
                Serviços
              </strong>

              <span>
                Agenda e solicitações
              </span>
            </div>

            <ArrowRight
              size={15}
              aria-hidden="true"
            />
          </button>

          <button
            type="button"
            onClick={() =>
              navegar(
                DASHBOARD_MORADOR_ROUTES
                  .dependentes
              )
            }
          >
            <UsersRound
              size={19}
              aria-hidden="true"
            />

            <div>
              <strong>
                Dependentes
              </strong>

              <span>
                Acessos autorizados
              </span>
            </div>

            <ArrowRight
              size={15}
              aria-hidden="true"
            />
          </button>
        </div>
      </section>
    </div>
  );
}