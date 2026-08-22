import {
  useMemo,
  useState,
} from "react";

import {
  RastreioCardsGrid,
  RastreioEmptyState,
  RastreioFilters,
  RastreioHeader,
} from "./components";

import {
  RastreioSidebar,
} from "./sidebar";

import NovoRastreioModal from "./modals/NovoRastreioModal";
import EditarRastreioModal from "./modals/EditarRastreioModal";
import ExcluirRastreioModal from "./modals/ExcluirRastreioModal";

import RastreioAcompanhamentoDrawer from "./drawer/RastreioAcompanhamentoDrawer";

import useMoradorRastreios from "./hooks/useMoradorRastreios";

import {
  mapMoradorRastreios,
} from "./mappers/moradorRastreio.mapper";

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

const ACTIVE_TRACKING_STATUSES =
  new Set([
    "AGUARDANDO_RECEBIMENTO",
    "ENCONTRADO_NO_LOTE",
    "AGUARDANDO_ENTRADA",
    "DIVERGENTE",
  ]);

const COMPLETED_TRACKING_STATUSES =
  new Set([
    "VINCULADO_ENCOMENDA",
  ]);

export default function MoradorRastreio({
  perfil,
  usuario,
  onNavigate,
}) {
  const usuarioAtual =
    usuario || perfil || null;

  /*
   * Tenant ativo.
   *
   * A identidade do usuário NÃO é definida
   * pelo frontend.
   *
   * O backend utiliza auth.uid() como
   * identidade autoritativa.
   */
  const condominioId =
    usuarioAtual
      ?.condominio_id ||
    null;

  const [
    activeView,
    setActiveView,
  ] = useState(
    "acompanhamento",
  );

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

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

  const {
    rastreios:
      rastreiosBackend,

    transportadoras,

    unidades,

    total,

    loading,

    loadingTransportadoras,

    loadingUnidades,

    saving,

    error,

    realtimeStatus,

    realtimeConnected,

    realtimeError,

    refresh,

    carregarTransportadoras,

    carregarUnidades,

    criar,

    atualizar,

    cancelar,
  } = useMoradorRastreios({
    condominioId,

    enabled:
      Boolean(
        condominioId,
      ),
  });

  /*
   * Backend → contrato visual.
   */
  const rastreios =
    useMemo(
      () =>
        mapMoradorRastreios(
          rastreiosBackend,
        ),
      [
        rastreiosBackend,
      ],
    );

  const possuiRastreios =
    rastreios.length > 0;

  /*
   * Agrupamento visual.
   *
   * Não modifica o status oficial
   * retornado pelo backend.
   */
  const rastreiosDaView =
    useMemo(() => {
      if (
        activeView ===
        "todos"
      ) {
        return rastreios;
      }

      if (
        activeView ===
        "entregues"
      ) {
        return rastreios.filter(
          (item) =>
            COMPLETED_TRACKING_STATUSES.has(
              item.status,
            ),
        );
      }

      return rastreios.filter(
        (item) =>
          ACTIVE_TRACKING_STATUSES.has(
            item.status,
          ),
      );
    }, [
      activeView,
      rastreios,
    ]);

  /*
   * Pesquisa local somente sobre
   * registros já autorizados pelo backend.
   */
  const filteredRastreios =
    useMemo(() => {
      const normalizedSearch =
        searchTerm
          .trim()
          .toLowerCase();

      if (!normalizedSearch) {
        return rastreiosDaView;
      }

      return rastreiosDaView.filter(
        (item) => {
          const searchableValues = [
            item?.codigo,
            item?.descricao,
            item?.transportadora,
            item?.situacao,
            item?.torre,
            item?.bloco,
            item?.unidade,
          ];

          return searchableValues.some(
            (value) =>
              String(
                value ?? "",
              )
                .toLowerCase()
                .includes(
                  normalizedSearch,
                ),
          );
        },
      );
    }, [
      rastreiosDaView,
      searchTerm,
    ]);

  function handleOpenAcompanhamento(
    rastreio,
  ) {
    setSelectedRastreio(
      rastreio,
    );

    setAcompanhamentoOpen(
      true,
    );
  }

  function handleOpenEditar(
    rastreio,
  ) {
    if (
      rastreio?.podeEditar !==
      true
    ) {
      return;
    }

    setSelectedRastreio(
      rastreio,
    );

    setEditarRastreioOpen(
      true,
    );
  }

  function handleOpenExcluir(
    rastreio,
  ) {
    if (
      rastreio
        ?.podeCancelar !== true
    ) {
      return;
    }

    setSelectedRastreio(
      rastreio,
    );

    setExcluirRastreioOpen(
      true,
    );
  }

  function handleOpenNovo() {
    setNovoRastreioOpen(
      true,
    );
  }

  function handleCloseNovo() {
    setNovoRastreioOpen(
      false,
    );
  }

  function handleCloseEditar() {
    setEditarRastreioOpen(
      false,
    );

    setSelectedRastreio(
      null,
    );
  }

  function handleCloseExcluir() {
    setExcluirRastreioOpen(
      false,
    );

    setSelectedRastreio(
      null,
    );
  }

  function handleCloseAcompanhamento() {
    setAcompanhamentoOpen(
      false,
    );

    setSelectedRastreio(
      null,
    );
  }

  const inicializando =
    loading;

  const hasSearch =
    possuiRastreios &&
    Boolean(
      searchTerm.trim(),
    );

  return (
    <>
      <main className="morador-rastreio">
        <div className="morador-rastreio__container">
          <RastreioHeader
            onNovoRastreio={
              handleOpenNovo
            }
          />

          <div className="morador-rastreio__page-grid">
            <section
              className="morador-rastreio__workspace"
              aria-label="Seus rastreios"
              aria-busy={
                inicializando
                  ? "true"
                  : "false"
              }
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

              {inicializando ? (
                <section
                  className="rastreio-empty"
                  aria-live="polite"
                >
                  <div className="rastreio-empty__content">
                    <h2>
                      Carregando seus rastreios
                    </h2>

                    <p>
                      Aguarde enquanto
                      buscamos suas
                      informações.
                    </p>
                  </div>
                </section>
              ) : error ? (
                <section
                  className="rastreio-empty"
                  role="alert"
                >
                  <div className="rastreio-empty__content">
                    <h2>
                      Não foi possível carregar seus rastreios
                    </h2>

                    <p>
                      {
                        error.message
                      }
                    </p>

                    <button
                      type="button"
                      className="rastreio-secondary-button"
                      onClick={() =>
                        refresh()
                      }
                    >
                      Tentar novamente
                    </button>
                  </div>
                </section>
              ) : filteredRastreios.length >
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
                    hasSearch
                  }
                  onNovoRastreio={
                    handleOpenNovo
                  }
                />
              )}
            </section>

            <RastreioSidebar
              perfil={
                usuarioAtual
              }
              onNavigate={
                onNavigate
              }
            />
          </div>
        </div>
      </main>

      <NovoRastreioModal
        open={
          novoRastreioOpen
        }

        unidades={
          unidades
        }

        loadingUnidades={
          loadingUnidades
        }

        transportadoras={
          transportadoras
        }

        loadingTransportadoras={
          loadingTransportadoras
        }

        saving={
          saving
        }

        onLoadUnidades={
          carregarUnidades
        }

        onLoadTransportadoras={
          carregarTransportadoras
        }

        onSave={
          criar
        }

        onClose={
          handleCloseNovo
        }
      />

      <EditarRastreioModal
        open={
          editarRastreioOpen
        }

        rastreio={
          selectedRastreio
        }

        transportadoras={
          transportadoras
        }

        loadingTransportadoras={
          loadingTransportadoras
        }

        saving={
          saving
        }

        onLoadTransportadoras={
          carregarTransportadoras
        }

        onSave={
          atualizar
        }

        onClose={
          handleCloseEditar
        }
      />

      <ExcluirRastreioModal
        open={
          excluirRastreioOpen
        }

        rastreio={
          selectedRastreio
        }

        saving={
          saving
        }

        onConfirm={
          cancelar
        }

        onClose={
          handleCloseExcluir
        }
      />

      <RastreioAcompanhamentoDrawer
        open={
          acompanhamentoOpen
        }

        rastreio={
          selectedRastreio
        }

        onClose={
          handleCloseAcompanhamento
        }
      />

      <span
        hidden
        data-rastreios-total={
          total
        }
        data-rastreios-realtime={
          realtimeConnected
            ? "connected"
            : realtimeStatus
        }
        data-rastreios-realtime-error={
          realtimeError
            ? "true"
            : "false"
        }
      />
    </>
  );
}