import {
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  Inbox,
  PackageCheck,
  RefreshCw,
} from "lucide-react";

import {
  EntradaDrawer,
  EntradaErrorState,
  EntradaFilters,
  EntradaHeader,
  EntradaQueue,
  EntradaSummary,
} from "./components";

import EntradaSidebar
  from "./components/EntradaSidebar";

import {
  useEntradaEncomendas,
} from "./hooks/useEntradaEncomendas";

import "./EntradaEncomendas.css";

function criarPeriodo(
  periodo
) {
  if (
    !periodo ||
    periodo === "TODOS"
  ) {
    return {
      dataInicio: null,
      dataFim: null,
    };
  }

  const agora =
    new Date();

  const inicio =
    new Date(agora);

  inicio.setHours(
    0,
    0,
    0,
    0
  );

  if (periodo === "ONTEM") {
    inicio.setDate(
      inicio.getDate() - 1
    );

    const fim =
      new Date(inicio);

    fim.setHours(
      23,
      59,
      59,
      999
    );

    return {
      dataInicio:
        inicio.toISOString(),

      dataFim:
        fim.toISOString(),
    };
  }

  if (periodo === "3_DIAS") {
    inicio.setDate(
      inicio.getDate() - 2
    );
  }

  if (periodo === "7_DIAS") {
    inicio.setDate(
      inicio.getDate() - 6
    );
  }

  return {
    dataInicio:
      inicio.toISOString(),

    dataFim:
      agora.toISOString(),
  };
}

export default function EntradaEncomendas({
  perfil,
}) {
  const [
    filters,
    setFilters,
  ] =
    useState({
      search: "",
      situation: "TODOS",
      carrier: "TODAS",
      period: "TODOS",
    });

  const condominioId =
    perfil?.condominio_id ||
    null;

  const condominioNome =
    perfil?.condominio_nome ||
    perfil?.nome_condominio ||
    perfil?.condominio?.nome ||
    "Condomínio";

  const periodo =
    useMemo(
      () =>
        criarPeriodo(
          filters.period
        ),
      [filters.period]
    );

  const [
    selectedContext,
    setSelectedContext,
  ] =
    useState(null);

  const [
    drawerOpen,
    setDrawerOpen,
  ] =
    useState(false);

  /*
   * Primeiro carregamento sem
   * transportadora selecionada.
   * Depois encontramos o UUID
   * oficial na lista retornada
   * pelo backend.
   */
  const filtrosBase =
    useMemo(
      () => ({
        busca:
          filters.search.trim() ||
          null,

        status:
          filters.situation ===
          "TODOS"
            ? null
            : filters.situation,

        transportadoraId:
          null,

        dataInicio:
          periodo.dataInicio,

        dataFim:
          periodo.dataFim,

        limite:
          30,

        offset:
          0,
      }),
      [
        filters.search,
        filters.situation,
        periodo.dataInicio,
        periodo.dataFim,
      ]
    );

  const leituraInicial =
    useEntradaEncomendas({
      condominioId,
      filtros:
        filtrosBase,
    });

  const transportadoraSelecionada =
    leituraInicial
      .transportadoras
      .find(
        (item) =>
          item.key ===
          filters.carrier
      ) ||
    null;

  const filtrosComTransportadora =
    useMemo(
      () => ({
        ...filtrosBase,

        transportadoraId:
          transportadoraSelecionada
            ?.transportadoraId ||
          null,
      }),
      [
        filtrosBase,
        transportadoraSelecionada,
      ]
    );

  const usarSegundaConsulta =
    Boolean(
      transportadoraSelecionada
    );

  const leituraFiltrada =
    useEntradaEncomendas({
      condominioId:
        usarSegundaConsulta
          ? condominioId
          : null,

      filtros:
        filtrosComTransportadora,
    });

  const leitura =
    usarSegundaConsulta
      ? {
          ...leituraFiltrada,
          transportadoras:
            leituraInicial
              .transportadoras,
        }
      : leituraInicial;

  const {
    items,
    resumo,
    transportadoras,
    total,
    loading,
    refreshing,
    error,
    hasContract,
    refresh,
  } =
    leitura;

  const handleFilterChange =
    useCallback(
      (field, value) => {
        setFilters(
          (current) => ({
            ...current,
            [field]: value,
          })
        );
      },
      []
    );

  const handleResetFilters =
    useCallback(() => {
      setFilters({
        search: "",
        situation: "TODOS",
        carrier: "TODAS",
        period: "TODOS",
      });
    }, []);

  const handleOpenContext =
    useCallback(
      (context) => {
        setSelectedContext(
          context ??
          null
        );

        setDrawerOpen(true);
      },
      []
    );

  const handleCloseDrawer =
    useCallback(() => {
      setDrawerOpen(false);
      setSelectedContext(null);
    }, []);

  return (
    <main
      className="entrada-page"
      aria-labelledby="entrada-page-title"
    >
      <div className="entrada-page__layout">
        <div className="entrada-page__main">
          <EntradaHeader
            onRefresh={refresh}
            refreshing={refreshing}
          />

          <EntradaSummary
            available={hasContract}
            loading={loading}
            resumo={resumo}
            totalLotes={total}
            condominioNome={
              condominioNome
            }
          />

          <EntradaFilters
            filters={filters}
            transportadoras={
              transportadoras
            }
            onChange={
              handleFilterChange
            }
            onReset={
              handleResetFilters
            }
            disabled={
              !hasContract ||
              loading
            }
          />

          <section
            className="entrada-page__queue-section"
            aria-labelledby="entrada-queue-title"
          >
            <div className="entrada-page__section-heading">
              <div>
                <span className="entrada-page__section-eyebrow">
                  Operação
                </span>

                <h2 id="entrada-queue-title">
                  Fila de Entrada
                </h2>

                <p>
                  {total > 0
                    ? `${total} ${
                        total === 1
                          ? "lote aguarda"
                          : "lotes aguardam"
                      } processamento.`
                    : "Não há lote pendente nesta consulta."}
                </p>
              </div>

              <div
                className="entrada-page__section-icon"
                aria-hidden="true"
              >
                <Inbox size={20} />
              </div>
            </div>

            {error ? (
              <EntradaErrorState
                title="Não foi possível carregar a Entrada"
                description={error}
                onRetry={refresh}
              />
            ) : (
              <EntradaQueue
                items={items}
                loading={loading}
                hasContract={
                  hasContract
                }
                onOpenContext={
                  handleOpenContext
                }
              />
            )}
          </section>

          <section
            className="entrada-page__principles"
            aria-label="Informações da operação"
          >
            <article className="entrada-page__principle-card">
              <div className="entrada-page__principle-icon">
                <PackageCheck
                  size={20}
                />
              </div>

              <div>
                <strong>
                  Recebimento preservado
                </strong>

                <p>
                  A Entrada usa os
                  dados já conferidos
                  na chegada da
                  encomenda.
                </p>
              </div>
            </article>

            <article className="entrada-page__principle-card">
              <div className="entrada-page__principle-icon">
                <AlertTriangle
                  size={20}
                />
              </div>

              <div>
                <strong>
                  Etapas independentes
                </strong>

                <p>
                  Confirmar a Entrada
                  não disponibiliza a
                  encomenda para
                  retirada.
                </p>
              </div>
            </article>

            <article className="entrada-page__principle-card">
              <div className="entrada-page__principle-icon">
                <RefreshCw
                  size={20}
                />
              </div>

              <div>
                <strong>
                  Informação atualizada
                </strong>

                <p>
                  Atualize a fila sempre
                  que precisar conferir
                  o estado mais recente.
                </p>
              </div>
            </article>
          </section>
        </div>

        <EntradaSidebar
          resumo={resumo}
          items={items}

          /*
           * Clima:
           * permanece null até
           * contrato meteorológico
           * real ser integrado.
           */
          clima={null}

          /*
           * Desempenho:
           * permanece null até
           * contrato agregado real
           * do condomínio.
           */
          desempenho={null}
        />
      </div>

      <EntradaDrawer
        open={drawerOpen}
        context={selectedContext}
        onClose={handleCloseDrawer}
        onEntradaConfirmada={refresh}
      />
    </main>
  );
}