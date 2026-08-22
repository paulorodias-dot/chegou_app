import { useCallback, useState } from "react";
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

import { useEntradaEncomendas } from "./hooks/useEntradaEncomendas";

import "./EntradaEncomendas.css";

export default function EntradaEncomendas() {
  const {
    items,
    loading,
    error,
    hasContract,
    refresh,
  } = useEntradaEncomendas();

  const [filters, setFilters] = useState({
    search: "",
    situation: "TODOS",
    carrier: "TODAS",
    period: "TODOS",
  });

  const [selectedContext, setSelectedContext] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleFilterChange = useCallback((field, value) => {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({
      search: "",
      situation: "TODOS",
      carrier: "TODAS",
      period: "TODOS",
    });
  }, []);

  const handleOpenContext = useCallback((context) => {
    setSelectedContext(context ?? null);
    setDrawerOpen(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
    setSelectedContext(null);
  }, []);

  return (
    <main
      className="entrada-page"
      aria-labelledby="entrada-page-title"
    >
      <EntradaHeader
        onRefresh={refresh}
        refreshing={loading}
      />

      <EntradaSummary
        available={hasContract}
      />

      <EntradaFilters
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        disabled={!hasContract || loading}
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
              Recebimentos elegíveis aparecerão aqui para processamento.
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
            title="Não foi possível carregar a fila de Entrada"
            description="Tente novamente. Se o problema continuar, o diagnóstico técnico poderá ser consultado pela equipe responsável."
            onRetry={refresh}
          />
        ) : (
          <EntradaQueue
            items={items}
            loading={loading}
            hasContract={hasContract}
            onOpenContext={handleOpenContext}
          />
        )}
      </section>

      <section
        className="entrada-page__principles"
        aria-label="Princípios operacionais da Entrada"
      >
        <article className="entrada-page__principle-card">
          <div className="entrada-page__principle-icon">
            <PackageCheck size={20} />
          </div>

          <div>
            <strong>Recebimento preservado</strong>
            <p>
              A Entrada consome os fatos já registrados sem alterar o
              Recebimento original.
            </p>
          </div>
        </article>

        <article className="entrada-page__principle-card">
          <div className="entrada-page__principle-icon">
            <AlertTriangle size={20} />
          </div>

          <div>
            <strong>Etapas independentes</strong>
            <p>
              Entrada não significa disponibilização para retirada.
            </p>
          </div>
        </article>

        <article className="entrada-page__principle-card">
          <div className="entrada-page__principle-icon">
            <RefreshCw size={20} />
          </div>

          <div>
            <strong>Estado autoritativo</strong>
            <p>
              A operação funcional será conectada somente aos contratos
              oficiais homologados.
            </p>
          </div>
        </article>
      </section>

      <EntradaDrawer
        open={drawerOpen}
        context={selectedContext}
        onClose={handleCloseDrawer}
      />
    </main>
  );
}