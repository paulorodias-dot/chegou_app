import {
  AlertCircle,
  ArrowRight,
  Boxes,
  Clock3,
  LayoutGrid,
  List,
  Package,
  RefreshCw,
  Truck,
  UserRound,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import "./DashboardMoradorEncomendasCard.css";

const VISUALIZACAO = {
  MINI_CARDS: "mini-cards",
  LISTA: "lista",
};

const STORAGE_KEY =
  "chegou:dashboard-morador:encomendas:visualizacao";

function carregarVisualizacaoInicial() {
  if (typeof window === "undefined") {
    return VISUALIZACAO.MINI_CARDS;
  }

  try {
    const valor =
      window.localStorage.getItem(
        STORAGE_KEY
      );

    if (
      valor === VISUALIZACAO.LISTA ||
      valor === VISUALIZACAO.MINI_CARDS
    ) {
      return valor;
    }
  } catch (error) {
    console.warn(
      "[Dashboard Morador] Não foi possível recuperar a visualização das encomendas:",
      error
    );
  }

  return VISUALIZACAO.MINI_CARDS;
}

function numeroSeguro(valor) {
  const numero = Number(valor);

  return Number.isFinite(numero)
    ? numero
    : 0;
}

function formatarTempoAguardando(segundos) {
  const totalSegundos =
    Math.max(
      0,
      numeroSeguro(segundos)
    );

  const horas = Math.floor(
    totalSegundos / 3600
  );

  if (horas < 1) {
    return "Disponibilizada recentemente";
  }

  if (horas < 24) {
    return `Aguardando há ${horas} ${
      horas === 1 ? "hora" : "horas"
    }`;
  }

  const dias = Math.floor(
    horas / 24
  );

  return `Aguardando há ${dias} ${
    dias === 1 ? "dia" : "dias"
  }`;
}

function formatarStatus(status) {
  if (status === "EM_RETIRADA") {
    return {
      label: "Retirada em andamento",
      className: "is-progress",
    };
  }

  return {
    label: "Disponível para retirada",
    className: "is-available",
  };
}

function formatarDestino(item) {
  if (
    item?.escopoDestino ===
    "DEPENDENTE_VINCULADO"
  ) {
    return item?.destinatarioNome
      ? `Para ${item.destinatarioNome}`
      : "Para dependente vinculado";
  }

  return "Para você";
}

function EncomendaItem({
  item,
  onOpen,
}) {
  const status =
    formatarStatus(item?.status);

  const numero =
    item?.numeroEncomenda ?? "—";

  const volumes = Math.max(
    1,
    numeroSeguro(item?.totalVolumes)
  );

  return (
    <button
      type="button"
      className="dashboard-morador-encomendas-item"
      onClick={onOpen}
      aria-label={`Abrir encomenda ${numero}. ${status.label}.`}
    >
      <span className="dashboard-morador-encomendas-item__icon">
        <Package
          size={20}
          aria-hidden="true"
        />
      </span>

      <span className="dashboard-morador-encomendas-item__content">
        <span className="dashboard-morador-encomendas-item__heading">
          <strong>
            Encomenda #{numero}
          </strong>

          <span
            className={[
              "dashboard-morador-encomendas-item__status",
              status.className,
            ].join(" ")}
          >
            {status.label}
          </span>
        </span>

        <span className="dashboard-morador-encomendas-item__destination">
          <UserRound
            size={14}
            aria-hidden="true"
          />

          {formatarDestino(item)}
        </span>

        <span className="dashboard-morador-encomendas-item__meta">
          <span>
            <Truck
              size={14}
              aria-hidden="true"
            />

            {item?.transportadoraNome ||
              "Transportadora não informada"}
          </span>

          <span>
            <Boxes
              size={14}
              aria-hidden="true"
            />

            {volumes} {volumes === 1
              ? "volume"
              : "volumes"}
          </span>

          <span>
            <Clock3
              size={14}
              aria-hidden="true"
            />

            {formatarTempoAguardando(
              item?.tempoAguardandoSegundos
            )}
          </span>
        </span>
      </span>

      <ArrowRight
        className="dashboard-morador-encomendas-item__arrow"
        size={18}
        aria-hidden="true"
      />
    </button>
  );
}

function LoadingState() {
  return (
    <div
      className="dashboard-morador-encomendas-loading"
      aria-label="Carregando encomendas"
      role="status"
    >
      {Array.from({ length: 6 }).map(
        (_, index) => (
          <span key={index} />
        )
      )}
    </div>
  );
}

function EmptyState({ onOpenAll }) {
  return (
    <div className="dashboard-morador-encomendas-empty">
      <span aria-hidden="true">
        <Package size={24} />
      </span>

      <strong>
        Nenhuma encomenda aguardando retirada
      </strong>

      <p>
        Quando a Portaria disponibilizar uma
        encomenda para você ou para um dependente
        vinculado, ela aparecerá aqui.
      </p>

      <button
        type="button"
        onClick={onOpenAll}
      >
        Consultar histórico

        <ArrowRight
          size={16}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}

function ErrorState({ onRetry }) {
  return (
    <div
      className="dashboard-morador-encomendas-error"
      role="alert"
    >
      <span aria-hidden="true">
        <AlertCircle size={22} />
      </span>

      <div>
        <strong>
          Encomendas temporariamente indisponíveis
        </strong>

        <p>
          Não foi possível atualizar esta área.
          Tente novamente sem sair do Dashboard.
        </p>
      </div>

      {typeof onRetry === "function" && (
        <button
          type="button"
          onClick={onRetry}
        >
          <RefreshCw
            size={16}
            aria-hidden="true"
          />

          Tentar novamente
        </button>
      )}
    </div>
  );
}

export default function DashboardMoradorEncomendasCard({
  resumo,
  carregando = false,
  erro = null,
  onRetry,
  onOpenAll,
}) {
  const [visualizacao, setVisualizacao] =
    useState(
      carregarVisualizacaoInicial
    );

  const itens = useMemo(
    () =>
      Array.isArray(resumo?.itens)
        ? resumo.itens.slice(0, 6)
        : [],
    [resumo?.itens]
  );

  const total = Math.max(
    numeroSeguro(resumo?.total),
    itens.length
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        visualizacao
      );
    } catch (error) {
      console.warn(
        "[Dashboard Morador] Não foi possível salvar a visualização das encomendas:",
        error
      );
    }
  }, [visualizacao]);

  function abrirTodas() {
    if (
      typeof onOpenAll === "function"
    ) {
      onOpenAll();
    }
  }

  return (
    <section
      className="dashboard-morador-encomendas-card"
      aria-labelledby="dashboard-morador-encomendas-title"
      aria-busy={carregando}
    >
      <header className="dashboard-morador-encomendas-card__header">
        <div className="dashboard-morador-encomendas-card__title">
          <span>
            Encomendas
          </span>

          <h2 id="dashboard-morador-encomendas-title">
            Acompanhe suas encomendas
          </h2>

          <p>
            Disponíveis para retirada na Portaria
            e retiradas em andamento.
          </p>
        </div>

        <div className="dashboard-morador-encomendas-card__tools">
          {!carregando && !erro && (
            <span className="dashboard-morador-encomendas-card__total">
              <strong>{total}</strong>

              {total === 1
                ? "encomenda"
                : "encomendas"}
            </span>
          )}

          <div
            className="dashboard-morador-encomendas-view-toggle"
            role="group"
            aria-label="Modo de visualização das encomendas"
          >
            <button
              type="button"
              className={
                visualizacao ===
                VISUALIZACAO.MINI_CARDS
                  ? "is-active"
                  : ""
              }
              onClick={() =>
                setVisualizacao(
                  VISUALIZACAO.MINI_CARDS
                )
              }
              aria-pressed={
                visualizacao ===
                VISUALIZACAO.MINI_CARDS
              }
              aria-label="Visualizar como mini cards"
              title="Mini cards"
            >
              <LayoutGrid
                size={17}
                aria-hidden="true"
              />
            </button>

            <button
              type="button"
              className={
                visualizacao ===
                VISUALIZACAO.LISTA
                  ? "is-active"
                  : ""
              }
              onClick={() =>
                setVisualizacao(
                  VISUALIZACAO.LISTA
                )
              }
              aria-pressed={
                visualizacao ===
                VISUALIZACAO.LISTA
              }
              aria-label="Visualizar como lista"
              title="Lista"
            >
              <List
                size={18}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </header>

      {carregando ? (
        <LoadingState />
      ) : erro ? (
        <ErrorState
          onRetry={onRetry}
        />
      ) : itens.length === 0 ? (
        <EmptyState
          onOpenAll={abrirTodas}
        />
      ) : (
        <div
          className="dashboard-morador-encomendas-card__items"
          data-view={visualizacao}
        >
          {itens.map((item) => (
            <EncomendaItem
              key={item.id}
              item={item}
              onOpen={abrirTodas}
            />
          ))}
        </div>
      )}

      {!carregando && !erro && itens.length > 0 && (
        <footer className="dashboard-morador-encomendas-card__footer">
          <span>
            Exibindo uma seleção de até 6
            encomendas por prioridade operacional.
          </span>

          <button
            type="button"
            onClick={abrirTodas}
          >
            Ver todas as encomendas

            <ArrowRight
              size={17}
              aria-hidden="true"
            />
          </button>
        </footer>
      )}
    </section>
  );
}
