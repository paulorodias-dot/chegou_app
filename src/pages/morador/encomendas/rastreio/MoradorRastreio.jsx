import { useMemo, useState } from "react";

import {
  RastreioCardsGrid,
  RastreioEmptyState,
  RastreioFilters,
  RastreioHeader,
} from "./components";

import { RastreioSidebar } from "./sidebar";

import NovoRastreioModal from "./modals/NovoRastreioModal";
import EditarRastreioModal from "./modals/EditarRastreioModal";
import ExcluirRastreioModal from "./modals/ExcluirRastreioModal";

import RastreioAcompanhamentoDrawer from "./drawer/RastreioAcompanhamentoDrawer";

import "./MoradorRastreio.css";

const VIEW_OPTIONS = [
  {
    id: "acompanhamento",
    label: "Em acompanhamento",
  },
  {
    id: "entregues",
    label: "Entregues",
  },
  {
    id: "todos",
    label: "Todos",
  },
];

/*
 * Fase inicial de layout.
 *
 * Nenhum dado operacional deverá ser inserido aqui.
 * A ausência de registros é intencional até que exista
 * contrato oficial com o backend.
 */
const RASTREIOS_INICIAIS = [];

export default function MoradorRastreio({
  perfil,
  onNavigate,
}) {
  const [activeView, setActiveView] =
    useState("acompanhamento");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [
    novoRastreioOpen,
    setNovoRastreioOpen,
  ] = useState(false);

  const [
    editarRastreioOpen,
    setEditarRastreioOpen,
  ] = useState(false);

  const [
    excluirRastreioOpen,
    setExcluirRastreioOpen,
  ] = useState(false);

  const [
    acompanhamentoOpen,
    setAcompanhamentoOpen,
  ] = useState(false);

  const [
    selectedRastreio,
    setSelectedRastreio,
  ] = useState(null);

  /*
   * Nesta etapa a tela não consulta:
   *
   * - Supabase;
   * - RPC;
   * - API externa;
   * - Transportadora;
   * - mocks;
   * - dados simulados.
   */
  const rastreios = RASTREIOS_INICIAIS;

  const possuiRastreios =
    rastreios.length > 0;

  const filteredRastreios =
    useMemo(() => {
      if (!searchTerm.trim()) {
        return rastreios;
      }

      const normalizedSearch =
        searchTerm
          .trim()
          .toLowerCase();

      return rastreios.filter(
        (item) => {
          const searchableValues = [
            item?.codigo,
            item?.descricao,
            item?.transportadora,
            item?.situacao,
          ];

          return searchableValues.some(
            (value) =>
              String(value ?? "")
                .toLowerCase()
                .includes(
                  normalizedSearch,
                ),
          );
        },
      );
    }, [rastreios, searchTerm]);

  function handleOpenAcompanhamento(
    rastreio,
  ) {
    setSelectedRastreio(rastreio);

    setAcompanhamentoOpen(true);
  }

  function handleOpenEditar(
    rastreio,
  ) {
    setSelectedRastreio(rastreio);

    setEditarRastreioOpen(true);
  }

  function handleOpenExcluir(
    rastreio,
  ) {
    setSelectedRastreio(rastreio);

    setExcluirRastreioOpen(true);
  }

  function handleCloseEditar() {
    setEditarRastreioOpen(false);

    setSelectedRastreio(null);
  }

  function handleCloseExcluir() {
    setExcluirRastreioOpen(false);

    setSelectedRastreio(null);
  }

  function handleCloseAcompanhamento() {
    setAcompanhamentoOpen(false);

    setSelectedRastreio(null);
  }

  return (
    <>
      <main className="morador-rastreio">
        <div className="morador-rastreio__container">
          <RastreioHeader
            onNovoRastreio={() =>
              setNovoRastreioOpen(true)
            }
          />

          <div className="morador-rastreio__page-grid">
            <section
              className="morador-rastreio__workspace"
              aria-label="Seus rastreios"
            >
              {possuiRastreios && (
                <>
                  <div className="morador-rastreio__views">
                    <div
                      className="morador-rastreio__view-tabs"
                      role="tablist"
                      aria-label="Visualização dos rastreios"
                    >
                      {VIEW_OPTIONS.map(
                        (view) => {
                          const isActive =
                            activeView ===
                            view.id;

                          return (
                            <button
                              key={
                                view.id
                              }
                              type="button"
                              role="tab"
                              aria-selected={
                                isActive
                              }
                              className={`morador-rastreio__view-tab ${
                                isActive
                                  ? "morador-rastreio__view-tab--active"
                                  : ""
                              }`}
                              onClick={() =>
                                setActiveView(
                                  view.id,
                                )
                              }
                            >
                              {
                                view.label
                              }
                            </button>
                          );
                        },
                      )}
                    </div>
                  </div>

                  <RastreioFilters
                    searchTerm={
                      searchTerm
                    }
                    onSearchChange={
                      setSearchTerm
                    }
                  />
                </>
              )}

              {filteredRastreios.length >
              0 ? (
                <RastreioCardsGrid
                  items={
                    filteredRastreios
                  }
                  onAcompanhar={
                    handleOpenAcompanhamento
                  }
                  onEditar={
                    handleOpenEditar
                  }
                  onExcluir={
                    handleOpenExcluir
                  }
                />
              ) : (
                <RastreioEmptyState
                  view={
                    activeView
                  }
                  hasSearch={
                    possuiRastreios &&
                    Boolean(
                      searchTerm.trim(),
                    )
                  }
                  onNovoRastreio={() =>
                    setNovoRastreioOpen(
                      true,
                    )
                  }
                />
              )}
            </section>

            <RastreioSidebar
              perfil={perfil}
              onNavigate={onNavigate}
            />
          </div>
        </div>
      </main>

      <NovoRastreioModal
        open={novoRastreioOpen}
        onClose={() =>
          setNovoRastreioOpen(false)
        }
      />

      <EditarRastreioModal
        open={editarRastreioOpen}
        rastreio={selectedRastreio}
        onClose={handleCloseEditar}
      />

      <ExcluirRastreioModal
        open={excluirRastreioOpen}
        rastreio={selectedRastreio}
        onClose={handleCloseExcluir}
      />

      <RastreioAcompanhamentoDrawer
        open={acompanhamentoOpen}
        rastreio={selectedRastreio}
        onClose={
          handleCloseAcompanhamento
        }
      />
    </>
  );
}