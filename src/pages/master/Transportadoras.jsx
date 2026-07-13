import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useToast from "../../hooks/useToast";
import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Truck,
} from "lucide-react";

import {
  listarTransportadorasMaster,
  obterKpisTransportadorasMaster,
  obterLogoPublicoTransportadora,
} from "../../services/transportadorasService";

import logoPadraoLocal from "../../assets/logo-padrao-transportadora.png";

import "./Transportadoras.css";
import TransportadoraModal from "./transportadoras/TransportadoraModal";
import TransportadoraDrawer from "./transportadoras/TransportadoraDrawer";
import TransportadoraAcoesMenu from "./transportadoras/TransportadoraAcoesMenu";
import TransportadoraStatusModal from "./transportadoras/TransportadoraStatusModal";

const LIMITE_TABELA = 5;

const FILTROS_INICIAIS = Object.freeze({
  busca: "",
  status: "",
  tipo: "",
  limite: LIMITE_TABELA,
  offset: 0,
});

const STATUS_LABELS = Object.freeze({
  ATIVA: "Ativa",
  EM_OBSERVACAO: "Em observação",
  INSTAVEL: "Instável",
  BLOQUEADA: "Bloqueada",
  INATIVA: "Inativa",
});

const TIPOS_LABELS = Object.freeze({
  CORREIOS: "Correios",
  MARKETPLACE: "Marketplace",
  TRANSPORTADORA_PRIVADA: "Transportadora privada",
  FARMACIA: "Farmácia",
  ENTREGA_SOB_DEMANDA: "Entrega sob demanda",
  MOTOBOY: "Motoboy",
  ENTREGA_DIRETA: "Entrega direta",
  CARGA_EXPRESSA: "Carga expressa",
  OUTROS: "Outros",
});

function normalizarFiltros(filtros = {}) {
  return {
    busca: String(filtros.busca || "").trim(),
    status: String(filtros.status || "").trim(),
    tipo: String(filtros.tipo || "").trim(),
    limite: LIMITE_TABELA,
    offset: Math.max(0, Number(filtros.offset || 0)),
  };
}

function formatarData(data) {
  if (!data) return "—";

  const valor = new Date(data);

  if (Number.isNaN(valor.getTime())) return "—";

  return valor.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function obterClasseStatus(status) {
  return `status-${String(status || "desconhecido")
    .trim()
    .toLowerCase()
    .replaceAll("_", "-")}`;
}

function CelulaAcoesTransportadora({
  item,
  menuAcoes,
  onAbrirMenu,
  onFecharMenu,
  onVisualizar,
  onEditar,
  onAliases,
  onAlterarStatus,
  onAuditoria,
}) {
  const anchorRef = useRef(null);

  const menuAberto =
    menuAcoes.aberto &&
    menuAcoes.transportadora?.id === item.id;

  return (
    <div className="transportadoras-actions-wrapper">
      <button
        ref={anchorRef}
        type="button"
        className="transportadoras-row-action"
        onClick={(event) => onAbrirMenu(event, item)}
        aria-label={`Abrir ações de ${item.nome_fantasia}`}
        aria-haspopup="menu"
        aria-expanded={menuAberto}
      >
        <MoreVertical size={18} />
      </button>

      <TransportadoraAcoesMenu
        aberto={menuAberto}
        transportadora={item}
        anchorRef={anchorRef}
        onClose={onFecharMenu}
        onVisualizar={onVisualizar}
        onEditar={onEditar}
        onAliases={onAliases}
        onAlterarStatus={onAlterarStatus}
        onAuditoria={onAuditoria}
      />
    </div>
  );
}

function Transportadoras({ perfil }) {
  const toast = useToast();
  const [transportadoras, setTransportadoras] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [paginacao, setPaginacao] = useState(null);

  const [filtrosFormulario, setFiltrosFormulario] = useState({
    ...FILTROS_INICIAIS,
  });

  const [filtrosAplicados, setFiltrosAplicados] = useState({
    ...FILTROS_INICIAIS,
  });

  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState("");

  const [logoPadraoUrl, setLogoPadraoUrl] = useState(logoPadraoLocal);

  const [modalTransportadora, setModalTransportadora] =
    useState({
      aberto: false,
      modo: "criar",
      transportadora: null,
    });

  const [drawerTransportadora, setDrawerTransportadora] =
    useState({
      aberto: false,
      transportadoraId: null,
      refreshKey: 0,
      abaInicial: "visao-geral",
    });

  const [menuAcoes, setMenuAcoes] = useState({
    aberto: false,
    transportadora: null,
  });

  const [modalStatus, setModalStatus] = useState({
    aberto: false,
    transportadora: null,
  });

  const rankingTop3 = useMemo(() => {
    const ranking = Array.isArray(kpis?.ranking_top3)
      ? kpis.ranking_top3
      : Array.isArray(kpis?.ranking_transportadoras)
        ? kpis.ranking_transportadoras.slice(0, 3)
        : [];

    return ranking
      .map((item, index) => ({
        id:
          item.id ||
          item.transportadora_id ||
          item.business_id ||
          `ranking-${index}`,
        nome:
          item.nome_fantasia ||
          item.nome ||
          item.transportadora ||
          "Transportadora",
        volume: Number(
          item.volume_global ??
            item.volume ??
            item.quantidade_encomendas ??
            item.total ??
            0
        ),
      }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 3);
  }, [kpis]);

  const maiorVolumeRanking = useMemo(() => {
    return Math.max(
      1,
      ...rankingTop3.map((item) => Number(item.volume || 0))
    );
  }, [rankingTop3]);

  const carregarDados = useCallback(
    async ({
      filtros = filtrosAplicados,
      silencioso = false,
      notificarErro = false,
    } = {}) => {
      const filtrosNormalizados =
        normalizarFiltros(filtros);

      if (silencioso) {
        setAtualizando(true);
      } else {
        setCarregando(true);
      }

      setErro("");

      try {
        const [resultadoLista, resultadoKpis] =
          await Promise.all([
            listarTransportadorasMaster({
              busca: filtrosNormalizados.busca,
              status: filtrosNormalizados.status,
              tipo: filtrosNormalizados.tipo,
              limite: LIMITE_TABELA,
              offset: filtrosNormalizados.offset,
            }),
            obterKpisTransportadorasMaster(),
          ]);

        setTransportadoras(resultadoLista?.itens || []);
        setPaginacao(resultadoLista?.paginacao || null);
        setKpis(resultadoKpis?.kpis || null);
      } catch (error) {
        console.error(
          "Erro ao carregar transportadoras:",
          error
        );

        const mensagemErro =
          error?.message ||
          "Não foi possível carregar a Base Oficial de Transportadoras.";

        setErro(mensagemErro);

        if (notificarErro) {
          toast.erro(
            "Não foi possível atualizar",
            mensagemErro
          );
        }
      } finally {
        setCarregando(false);
        setAtualizando(false);
      }
    },
    [filtrosAplicados, toast]
  );

  useEffect(() => {
    const urlPublica = obterLogoPublicoTransportadora(
      "logo-padrao-transportadora.png"
    );

    if (urlPublica) {
      setLogoPadraoUrl(urlPublica);
    }
  }, []);

  useEffect(() => {
    carregarDados({
      filtros: filtrosAplicados,
    });
  }, [filtrosAplicados, carregarDados]);

  function pesquisar(event) {
    event.preventDefault();

    setFiltrosAplicados(
      normalizarFiltros({
        ...filtrosFormulario,
        offset: 0,
      })
    );
  }

  function limparFiltros() {
    const filtrosLimpos = {
      ...FILTROS_INICIAIS,
    };

    setFiltrosFormulario(filtrosLimpos);
    setFiltrosAplicados(filtrosLimpos);
  }

  function atualizarFiltroFormulario(campo, valor) {
    setFiltrosFormulario((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  function alterarPagina(direcao) {
    if (!paginacao) return;

    const offsetAtual = Number(filtrosAplicados.offset || 0);
    const total = Number(paginacao.total || 0);

    let novoOffset = offsetAtual;

    if (direcao === "proxima") {
      novoOffset = Math.min(
        offsetAtual + LIMITE_TABELA,
        Math.max(0, total - LIMITE_TABELA)
      );
    }

    if (direcao === "anterior") {
      novoOffset = Math.max(0, offsetAtual - LIMITE_TABELA);
    }

    setFiltrosFormulario((atual) => ({
      ...atual,
      offset: novoOffset,
    }));

    setFiltrosAplicados((atual) => ({
      ...atual,
      offset: novoOffset,
    }));
  }

  function obterLogo(item) {
    if (item?.logo_url) {
      return item.logo_url;
    }

    if (item?.logo_storage_path) {
      return (
        obterLogoPublicoTransportadora(item.logo_storage_path) ||
        logoPadraoUrl
      );
    }

    return logoPadraoUrl;
  }

  function abrirNovaTransportadora() {
    setModalTransportadora({
      aberto: true,
      modo: "criar",
      transportadora: null,
    });
  }

  function abrirEdicaoTransportadora(item) {
    setModalTransportadora({
      aberto: true,
      modo: "editar",
      transportadora: item,
    });
  }

  function fecharModalTransportadora() {
    setModalTransportadora({
      aberto: false,
      modo: "criar",
      transportadora: null,
    });
  }

  async function concluirOperacaoTransportadora({
    tipo,
    mensagem,
  } = {}) {
    await carregarDados({
      filtros: filtrosAplicados,
      silencioso: true,
    });

    setDrawerTransportadora((atual) => {
      if (!atual.aberto) return atual;

      return {
        ...atual,
        refreshKey: Date.now(),
      };
    });

    if (tipo === "criada") {
      toast.sucesso(
        "Transportadora cadastrada",
        mensagem ||
          "A Base Oficial foi atualizada com sucesso."
      );

      return;
    }

    if (tipo === "editada") {
      toast.sucesso(
        "Transportadora atualizada",
        mensagem ||
          "As alterações foram salvas com sucesso."
      );

      return;
    }

    if (tipo === "logo_restaurado") {
      toast.sucesso(
        "Logo padrão restaurado",
        mensagem ||
          "O logotipo padrão voltou a ser utilizado."
      );

      return;
    }

    if (mensagem) {
      toast.sucesso(
        "Operação concluída",
        mensagem
      );
    }
  }

  function abrirDetalhesTransportadora(item) {
    setDrawerTransportadora({
      aberto: true,
      transportadoraId: item.id,
      refreshKey: Date.now(),
      abaInicial: "visao-geral",
    });
  }

  function fecharDrawerTransportadora() {
    setDrawerTransportadora({
      aberto: false,
      transportadoraId: null,
      refreshKey: 0,
      abaInicial: "visao-geral",
    });
  }

  function editarTransportadoraPeloDrawer(transportadora) {
    if (!transportadora) return;

    setModalTransportadora({
      aberto: true,
      modo: "editar",
      transportadora,
      origem: "drawer",
    });
  }

  function abrirMenuAcoes(event, transportadora) {
    event.stopPropagation();

    setMenuAcoes((atual) => {
      const mesmaTransportadora =
        atual.aberto &&
        atual.transportadora?.id === transportadora.id;

      if (mesmaTransportadora) {
        return {
          aberto: false,
          transportadora: null,
        };
      }

      return {
        aberto: true,
        transportadora,
      };
    });
  }

  function fecharMenuAcoes() {
    setMenuAcoes({
      aberto: false,
      transportadora: null,
    });
  }

  function abrirAliasesPeloMenu(transportadora) {
    setDrawerTransportadora({
      aberto: true,
      transportadoraId: transportadora.id,
      refreshKey: Date.now(),
      abaInicial: "aliases",
    });
  }

  function abrirAuditoriaPeloMenu(transportadora) {
    setDrawerTransportadora({
      aberto: true,
      transportadoraId: transportadora.id,
      refreshKey: Date.now(),
      abaInicial: "auditoria",
    });
  }

  function abrirAlteracaoStatusTransportadora(
    transportadora
  ) {
    if (!transportadora) return;

    setModalStatus({
      aberto: true,
      transportadora,
    });
  }

  function fecharModalStatus() {
    setModalStatus({
      aberto: false,
      transportadora: null,
    });
  }

  async function concluirAlteracaoStatus({
    mensagem,
  } = {}) {
    await carregarDados({
      filtros: filtrosAplicados,
      silencioso: true,
    });

    setDrawerTransportadora((atual) => {
      if (!atual.aberto) return atual;

      return {
        ...atual,
        refreshKey: Date.now(),
      };
    });

    toast.sucesso(
      "Status atualizado",
      mensagem ||
        "A situação operacional da transportadora foi atualizada."
    );
  }

  const paginaAtual = Number(paginacao?.pagina_atual || 1);
  const totalPaginas = Math.max(
    1,
    Number(paginacao?.total_paginas || 1)
  );

  const podeVoltar =
    Number(filtrosAplicados.offset || 0) > 0;

  const podeAvancar =
    Number(filtrosAplicados.offset || 0) + LIMITE_TABELA <
    Number(paginacao?.total || 0);

  return (
    <div className="transportadoras-page">
      <div className="transportadoras-page-grid">
        <main className="transportadoras-content">
          <header className="transportadoras-header">
            <div className="transportadoras-header-copy">
              <span className="transportadoras-eyebrow">
                Módulo Master
              </span>

              <h1>Transportadoras</h1>

              <p>
                Gerencie a Base Oficial de Transportadoras, padronize
                informações e mantenha a governança logística global do
                Sistema Chegou!.
              </p>
            </div>

            <div className="transportadoras-header-actions">
              <button
                type="button"
                className="transportadoras-secondary-button"
                onClick={() =>
                  carregarDados({
                    filtros: filtrosAplicados,
                    silencioso: true,
                    notificarErro: true,
                  })
                }
                disabled={atualizando}
              >
                <RefreshCw
                  size={17}
                  className={atualizando ? "girando" : ""}
                />

                <span>
                  {atualizando ? "Atualizando..." : "Atualizar"}
                </span>
              </button>

              <button
                type="button"
                className="transportadoras-primary-button"
                onClick={abrirNovaTransportadora}
              >
                <Plus size={18} />
                Nova Transportadora
              </button>
            </div>
          </header>

          <section
            className="transportadoras-kpis"
            aria-label="Indicadores de transportadoras"
          >
            <article className="transportadoras-kpi-card">
              <div className="transportadoras-kpi-icon">
                <Truck size={21} />
              </div>

              <div className="transportadoras-kpi-content">
                <span>Total cadastradas</span>
                <strong>{kpis?.total ?? 0}</strong>
                <small>Base global oficial</small>
              </div>
            </article>

            <article className="transportadoras-kpi-card">
              <div className="transportadoras-kpi-icon">
                <CheckCircle2 size={21} />
              </div>

              <div className="transportadoras-kpi-content">
                <span>Transportadoras ativas</span>
                <strong>{kpis?.ativas ?? 0}</strong>
                <small>Disponíveis para utilização</small>
              </div>
            </article>

            <article className="transportadoras-kpi-card">
              <div className="transportadoras-kpi-icon">
                <Activity size={21} />
              </div>

              <div className="transportadoras-kpi-content">
                <span>Aceitam rastreamento</span>
                <strong>{kpis?.aceitam_rastreio ?? 0}</strong>
                <small>Preparadas para evolução futura</small>
              </div>
            </article>

            <article className="transportadoras-kpi-card transportadoras-ranking-kpi">
              <div className="transportadoras-ranking-header">
                <div>
                  <span>Ranking global</span>
                  <strong>Top 3</strong>
                </div>

                <BarChart3 size={21} />
              </div>

              {rankingTop3.length > 0 ? (
                <div className="transportadoras-mini-ranking">
                  {rankingTop3.map((item, index) => {
                    const percentual = Math.max(
                      5,
                      Math.round(
                        (Number(item.volume || 0) /
                          maiorVolumeRanking) *
                          100
                      )
                    );

                    return (
                      <div
                        className="transportadoras-mini-ranking-item"
                        key={item.id}
                      >
                        <div className="transportadoras-mini-ranking-label">
                          <span>
                            {index + 1}. {item.nome}
                          </span>

                          <strong>
                            {item.volume.toLocaleString("pt-BR")}
                          </strong>
                        </div>

                        <div className="transportadoras-mini-ranking-track">
                          <span
                            style={{
                              width: `${percentual}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="transportadoras-ranking-empty">
                  <span>
                    Aguardando dados reais da Central de Encomendas.
                  </span>
                </div>
              )}
            </article>
          </section>

          <section className="transportadoras-filter-card">
            <form
              onSubmit={pesquisar}
              autoComplete="off"
            >
              <div className="transportadoras-search-field">
                <label htmlFor="transportadoras-busca">
                  Busca
                </label>

                <div className="transportadoras-input-with-icon">
                  <Search size={17} aria-hidden="true" />

                  <input
                    id="transportadoras-busca"
                    name="transportadoras_busca_operacional"
                    type="search"
                    value={filtrosFormulario.busca}
                    onChange={(event) =>
                      atualizarFiltroFormulario(
                        "busca",
                        event.target.value
                      )
                    }
                    placeholder="Nome, código ou alias"
                    autoComplete="off"
                    enterKeyHint="search"
                  />
                </div>
              </div>

              <div className="transportadoras-filter-field">
                <label htmlFor="transportadoras-status">
                  Status
                </label>

                <select
                  id="transportadoras-status"
                  value={filtrosFormulario.status}
                  onChange={(event) =>
                    atualizarFiltroFormulario(
                      "status",
                      event.target.value
                    )
                  }
                >
                  <option value="">Todos</option>
                  <option value="ATIVA">Ativa</option>
                  <option value="EM_OBSERVACAO">
                    Em observação
                  </option>
                  <option value="INSTAVEL">Instável</option>
                  <option value="BLOQUEADA">Bloqueada</option>
                  <option value="INATIVA">Inativa</option>
                </select>
              </div>

              <div className="transportadoras-filter-field">
                <label htmlFor="transportadoras-tipo">
                  Tipo
                </label>

                <select
                  id="transportadoras-tipo"
                  value={filtrosFormulario.tipo}
                  onChange={(event) =>
                    atualizarFiltroFormulario(
                      "tipo",
                      event.target.value
                    )
                  }
                >
                  <option value="">Todos</option>
                  <option value="CORREIOS">Correios</option>
                  <option value="MARKETPLACE">Marketplace</option>
                  <option value="TRANSPORTADORA_PRIVADA">
                    Transportadora privada
                  </option>
                  <option value="FARMACIA">Farmácia</option>
                  <option value="ENTREGA_SOB_DEMANDA">
                    Entrega sob demanda
                  </option>
                  <option value="MOTOBOY">Motoboy</option>
                  <option value="ENTREGA_DIRETA">
                    Entrega direta
                  </option>
                  <option value="CARGA_EXPRESSA">
                    Carga expressa
                  </option>
                  <option value="OUTROS">Outros</option>
                </select>
              </div>

              <div className="transportadoras-filter-actions">
                <button
                  type="button"
                  className="transportadoras-clear-button"
                  onClick={limparFiltros}
                >
                  Limpar
                </button>

                <button
                  type="submit"
                  className="transportadoras-search-button"
                >
                  Pesquisar
                </button>
              </div>
            </form>
          </section>

          {erro ? (
            <section className="transportadoras-error-state">
              <AlertCircle size={22} />

              <div>
                <strong>
                  Não foi possível carregar a base.
                </strong>

                <p>{erro}</p>
              </div>

              <button
                type="button"
                onClick={() =>
                  carregarDados({
                    filtros: filtrosAplicados,
                  })
                }
              >
                Tentar novamente
              </button>
            </section>
          ) : null}

          <section className="transportadoras-table-card">
            <div className="transportadoras-table-header">
              <div>
                <h2>Base Oficial</h2>

                <p>
                  {Number(paginacao?.total || 0).toLocaleString(
                    "pt-BR"
                  )}{" "}
                  transportadoras encontradas.
                </p>
              </div>

              <span className="transportadoras-table-limit">
                5 registros por página
              </span>
            </div>

            <div className="transportadoras-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Transportadora</th>
                    <th>Código</th>
                    <th>Tipo</th>
                    <th>Status</th>
                    <th>Rastreio</th>
                    <th>Logo</th>
                    <th>Atualização</th>
                    <th aria-label="Ações" />
                  </tr>
                </thead>

                <tbody>
                  {carregando
                    ? Array.from({ length: LIMITE_TABELA }).map(
                        (_, index) => (
                          <tr key={`skeleton-${index}`}>
                            <td colSpan={8}>
                              <div className="transportadoras-skeleton-row" />
                            </td>
                          </tr>
                        )
                      )
                    : null}

                  {!carregando &&
                  transportadoras.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <div className="transportadoras-empty-state">
                          <Truck size={30} />

                          <strong>
                            Nenhuma transportadora encontrada.
                          </strong>

                          <p>
                            Limpe os filtros ou cadastre uma nova
                            transportadora oficial.
                          </p>

                          <button
                            type="button"
                            onClick={limparFiltros}
                          >
                            Exibir todas
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : null}

                  {!carregando
                    ? transportadoras.map((item) => (
                        <tr key={item.id}>
                          <td data-label="Transportadora">
                            <button
                              type="button"
                              className="transportadoras-name-cell"
                              onClick={() =>
                                abrirDetalhesTransportadora(item)
                              }
                            >
                              <img
                                src={obterLogo(item)}
                                alt={`Logo ${item.nome_fantasia}`}
                                onError={(event) => {
                                  event.currentTarget.onerror =
                                    null;
                                  event.currentTarget.src =
                                    logoPadraoLocal;
                                }}
                              />

                              <span>
                                <strong>
                                  {item.nome_fantasia}
                                </strong>

                                <small>
                                  {Number(
                                    item.quantidade_aliases || 0
                                  )}{" "}
                                  {Number(
                                    item.quantidade_aliases || 0
                                  ) === 1
                                    ? "alias"
                                    : "aliases"}
                                </small>
                              </span>
                            </button>
                          </td>

                          <td data-label="Código">
                            <span className="transportadoras-code">
                              {item.business_id}
                            </span>
                          </td>

                          <td data-label="Tipo">
                            {TIPOS_LABELS[item.tipo] ||
                              item.tipo ||
                              "—"}
                          </td>

                          <td data-label="Status">
                            <span
                              className={`transportadoras-status ${obterClasseStatus(
                                item.status
                              )}`}
                            >
                              {STATUS_LABELS[item.status] ||
                                item.status}
                            </span>
                          </td>

                          <td data-label="Rastreio">
                            {item.aceita_rastreio ? "Sim" : "Não"}
                          </td>

                          <td data-label="Logo">
                            {item.usa_logo_padrao
                              ? "Padrão"
                              : "Oficial"}
                          </td>

                          <td data-label="Atualização">
                            {formatarData(item.atualizado_em)}
                          </td>

                          <td
                            className="transportadoras-actions-cell"
                            data-label="Ações"
                          >
                            <CelulaAcoesTransportadora
                              item={item}
                              menuAcoes={menuAcoes}
                              onAbrirMenu={abrirMenuAcoes}
                              onFecharMenu={fecharMenuAcoes}
                              onVisualizar={abrirDetalhesTransportadora}
                              onEditar={abrirEdicaoTransportadora}
                              onAliases={abrirAliasesPeloMenu}
                              onAlterarStatus={
                                abrirAlteracaoStatusTransportadora
                              }
                              onAuditoria={abrirAuditoriaPeloMenu}
                            />
                          </td>
                        </tr>
                      ))
                    : null}
                </tbody>
              </table>
            </div>

            <footer className="transportadoras-pagination">
              <span>
                Página {paginaAtual} de {totalPaginas}
              </span>

              <div className="transportadoras-pagination-actions">
                <button
                  type="button"
                  onClick={() => alterarPagina("anterior")}
                  disabled={!podeVoltar || carregando}
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={17} />
                  Anterior
                </button>

                <button
                  type="button"
                  onClick={() => alterarPagina("proxima")}
                  disabled={!podeAvancar || carregando}
                  aria-label="Próxima página"
                >
                  Próxima
                  <ChevronRight size={17} />
                </button>
              </div>
            </footer>
          </section>
        </main>

        <aside className="transportadoras-sidebar">
          <section className="transportadoras-sidebar-card">
            <span className="transportadoras-sidebar-icon">
              <Truck size={20} />
            </span>

            <h2>Inteligência Logística</h2>

            <p>
              Rankings, tendências, qualidade das integrações e
              ocorrências globais serão consolidados nesta área.
            </p>
          </section>

          <section className="transportadoras-communication-card">
            <div className="transportadoras-communication-top">
              <span>Comunicação Chegou!</span>

              <div>
                <Megaphone size={19} />
              </div>
            </div>

            <h2>Catálogo governado</h2>

            <p>
              Atualizações, orientações jurídicas e comunicados
              oficiais sobre transportadoras serão apresentados
              neste espaço.
            </p>

            <button type="button">
              Ver comunicações
            </button>
          </section>

          <section className="transportadoras-sidebar-card">
            <h3>Situação atual</h3>

            <ul className="transportadoras-sidebar-metrics">
              <li>
                <strong>{kpis?.ativas ?? 0}</strong>
                <span>transportadoras ativas</span>
              </li>

              <li>
                <strong>
                  {kpis?.com_integracao_api ?? 0}
                </strong>
                <span>integrações por API</span>
              </li>

              <li>
                <strong>
                  {kpis?.usando_logo_padrao ?? 0}
                </strong>
                <span>logos aguardando autorização</span>
              </li>
            </ul>
          </section>

          <section className="transportadoras-sidebar-alert">
            <AlertCircle size={19} />

            <div>
              <strong>Central de Encomendas</strong>

              <p>
                O ranking global, o SLA e as ocorrências serão
                ativados somente com dados operacionais reais.
              </p>
            </div>
          </section>

          <section className="transportadoras-sidebar-card transportadoras-user-context">
            <span>Responsável pela governança</span>

            <strong>
              {perfil?.nome || "Equipe Chegou!"}
            </strong>

            <small>Módulo Master</small>
          </section>
        </aside>
      </div>

      <TransportadoraModal
        aberto={modalTransportadora.aberto}
        modo={modalTransportadora.modo}
        transportadora={modalTransportadora.transportadora}
        onClose={fecharModalTransportadora}
        onConcluido={concluirOperacaoTransportadora}
      />

      <TransportadoraDrawer
        aberto={drawerTransportadora.aberto}
        transportadoraId={drawerTransportadora.transportadoraId}
        refreshKey={drawerTransportadora.refreshKey}
        abaInicial={drawerTransportadora.abaInicial}
        onClose={fecharDrawerTransportadora}
        onEditar={editarTransportadoraPeloDrawer}
        onAlterarStatus={abrirAlteracaoStatusTransportadora}
        onAtualizado={() => {
          setDrawerTransportadora((atual) => ({
            ...atual,
            refreshKey: Date.now(),
          }));

          return carregarDados({
            filtros: filtrosAplicados,
            silencioso: true,
          });
        }}
      />

      <TransportadoraStatusModal
        aberto={modalStatus.aberto}
        transportadora={modalStatus.transportadora}
        onClose={fecharModalStatus}
        onConcluido={concluirAlteracaoStatus}
      />

    </div>
  );
}

export default Transportadoras;