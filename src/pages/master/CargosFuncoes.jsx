import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Layers3,
  Megaphone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";

import { supabase } from "../../services/supabase";
import "./CargosFuncoes.css";

function CargosFuncoes({ perfil }) {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [kpis, setKpis] = useState(null);
  const [cargos, setCargos] = useState([]);
  const [solicitacoes, setSolicitacoes] = useState([]);

  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("TODAS");
  const [filtroStatus, setFiltroStatus] = useState("TODOS");

  const [paginaAtual, setPaginaAtual] = useState(1);
  const [linhasPorPagina, setLinhasPorPagina] = useState(5);

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setBuscaAplicada(busca.trim().toLowerCase());
      setPaginaAtual(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [busca]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [filtroCategoria, filtroStatus, linhasPorPagina]);

  async function carregarDados() {
    setCarregando(true);
    setErro("");

    try {
      const [kpisResp, cargosResp, solicitacoesResp] = await Promise.all([
        supabase.rpc("rpc_master_cargos_funcoes_kpis"),
        supabase.rpc("rpc_master_cargos_funcoes_listar"),
        supabase.rpc("rpc_master_solicitacoes_cargos_listar"),
      ]);

      if (kpisResp.error) throw kpisResp.error;
      if (cargosResp.error) throw cargosResp.error;
      if (solicitacoesResp.error) throw solicitacoesResp.error;

      setKpis(kpisResp.data?.[0] || null);
      setCargos(cargosResp.data || []);
      setSolicitacoes(solicitacoesResp.data || []);
    } catch (error) {
      console.error("Erro ao carregar Cargos e Funções:", error);
      setErro(
        error?.message ||
          "Não foi possível carregar a tela de Cargos e Funções."
      );
    } finally {
      setCarregando(false);
    }
  }

  const categorias = useMemo(() => {
    const lista = cargos.map((item) => item.categoria_nome).filter(Boolean);
    return ["TODAS", ...Array.from(new Set(lista)).sort()];
  }, [cargos]);

  const legendaCategorias = useMemo(() => {
    const mapa = new Map();

    cargos.forEach((item) => {
      if (!item.categoria_nome) return;

      if (!mapa.has(item.categoria_nome)) {
        mapa.set(item.categoria_nome, {
          nome: item.categoria_nome,
          cor: item.categoria_cor || item.cor || "#64748b",
        });
      }
    });

    return Array.from(mapa.values()).sort((a, b) =>
      a.nome.localeCompare(b.nome)
    );
  }, [cargos]);

  const cargosFiltrados = useMemo(() => {
    return cargos.filter((item) => {
      const texto = [
        item.cargo_nome,
        item.cargo_codigo,
        item.funcao_nome,
        item.categoria_nome,
        item.cargo_descricao,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const passaBusca = !buscaAplicada || texto.includes(buscaAplicada);

      const passaCategoria =
        filtroCategoria === "TODAS" || item.categoria_nome === filtroCategoria;

      const passaStatus =
        filtroStatus === "TODOS" ||
        (filtroStatus === "ATIVOS" && item.ativo) ||
        (filtroStatus === "INATIVOS" && !item.ativo) ||
        (filtroStatus === "CRITICOS" && item.critico);

      return passaBusca && passaCategoria && passaStatus;
    });
  }, [cargos, buscaAplicada, filtroCategoria, filtroStatus]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(cargosFiltrados.length / linhasPorPagina)
  );

  const paginaSegura = Math.min(paginaAtual, totalPaginas);
  const indiceInicial = (paginaSegura - 1) * linhasPorPagina;
  const indiceFinal = indiceInicial + linhasPorPagina;

  const cargosPaginados = cargosFiltrados.slice(indiceInicial, indiceFinal);

  const exibindoInicio =
    cargosFiltrados.length === 0 ? 0 : indiceInicial + 1;

  const exibindoFim = Math.min(indiceFinal, cargosFiltrados.length);

  function irParaPagina(novaPagina) {
    const pagina = Math.min(Math.max(novaPagina, 1), totalPaginas);
    setPaginaAtual(pagina);
  }

  function badgeCargo(item) {
    if (!item.ativo || item.status === "INATIVO") {
      return <span className="cf-badge cf-badge-cinza">Inativo</span>;
    }

    if (item.critico) {
      return <span className="cf-badge cf-badge-vermelho">Crítico</span>;
    }

    if (item.personalizado) {
      return <span className="cf-badge cf-badge-roxo">Personalizado</span>;
    }

    return <span className="cf-badge cf-badge-azul">Padrão Chegou!</span>;
  }

  return (
    <div className="cargos-funcoes-page">
      <section className="cf-main">
        <header className="cf-header">
          <div>
            <span className="cf-eyebrow">Módulo Master</span>
            <h1>Cargos e Funções</h1>
            <p>
              Gerencie o catálogo global de categorias, funções e cargos usados
              pelos condomínios no Sistema Chegou!.
            </p>
          </div>

          <div className="cf-header-actions">
            <button
              type="button"
              className="cf-btn-secondary"
              onClick={carregarDados}
            >
              <RefreshCw size={16} />
              Atualizar
            </button>

            <button type="button" className="cf-btn-primary">
              <Plus size={16} />
              Novo Cargo
            </button>
          </div>
        </header>

        {erro && (
          <div className="cf-alert-error">
            <AlertTriangle size={18} />
            <span>{erro}</span>
          </div>
        )}

        <section className="cf-kpis">
          <article className="cf-kpi-card">
            <span>
              <BriefcaseBusiness size={20} />
            </span>
            <small>Total de Cargos</small>
            <strong>{kpis?.total_cargos ?? 0}</strong>
          </article>

          <article className="cf-kpi-card">
            <span>
              <Layers3 size={20} />
            </span>
            <small>Categorias Ativas</small>
            <strong>{kpis?.categorias_ativas ?? 0}</strong>
          </article>

          <article className="cf-kpi-card">
            <span>
              <BadgeCheck size={20} />
            </span>
            <small>Cargos Padrão</small>
            <strong>{kpis?.cargos_padrao ?? 0}</strong>
          </article>

          <article className="cf-kpi-card">
            <span>
              <Users size={20} />
            </span>
            <small>Personalizados</small>
            <strong>{kpis?.cargos_personalizados ?? 0}</strong>
          </article>

          <article className="cf-kpi-card">
            <span>
              <Clock size={20} />
            </span>
            <small>Inativos</small>
            <strong>{kpis?.cargos_inativos ?? 0}</strong>
          </article>
        </section>

        <section className="cf-toolbar">
          <div className="cf-search">
            <Search size={17} />
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar cargo, função, categoria ou código..."
            />

            {busca && (
              <button
                type="button"
                className="cf-search-clear"
                onClick={() => setBusca("")}
                aria-label="Limpar busca"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <select
            value={filtroCategoria}
            onChange={(event) => setFiltroCategoria(event.target.value)}
          >
            {categorias.map((categoria) => (
              <option key={categoria} value={categoria}>
                {categoria === "TODAS" ? "Todas as categorias" : categoria}
              </option>
            ))}
          </select>

          <select
            value={filtroStatus}
            onChange={(event) => setFiltroStatus(event.target.value)}
          >
            <option value="TODOS">Todos os status</option>
            <option value="ATIVOS">Ativos</option>
            <option value="INATIVOS">Inativos</option>
            <option value="CRITICOS">Críticos</option>
          </select>

          <button type="button" className="cf-btn-filter">
            <SlidersHorizontal size={16} />
            Filtros
          </button>
        </section>

        <section className="cf-table-card">
          <div className="cf-table-header">
            <div>
              <h2>Catálogo Global Chegou!</h2>
              <p>{cargosFiltrados.length} cargos encontrados</p>
            </div>
          </div>

          {carregando ? (
            <div className="cf-loading">Carregando cargos e funções...</div>
          ) : (
            <>
              <div className="cf-table-wrap">
                <table className="cf-table">
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      <th>Função</th>
                      <th>Cargo</th>
                      <th>Código</th>
                      <th>Nível</th>
                      <th>Status</th>
                      <th>Acesso</th>
                      <th>Ações</th>
                    </tr>
                  </thead>

                  <tbody>
                    {cargosPaginados.map((item) => (
                      <tr key={item.cargo_id}>
                        <td>
                          <span
                            className="cf-category-dot"
                            style={{
                              background: item.categoria_cor || item.cor,
                            }}
                          />
                          {item.categoria_nome}
                        </td>

                        <td>{item.funcao_nome}</td>

                        <td>
                          <strong>{item.cargo_nome}</strong>
                          <small>{item.cargo_descricao}</small>
                        </td>

                        <td>
                          <code>{item.cargo_codigo}</code>
                        </td>

                        <td>Nível {item.nivel_hierarquico || "-"}</td>

                        <td>{badgeCargo(item)}</td>

                        <td>
                          {item.permite_acesso_sistema ? (
                            <span className="cf-access-ok">
                              <CheckCircle2 size={14} />
                              Pode ter Auth
                            </span>
                          ) : (
                            <span className="cf-access-muted">
                              Sem acesso padrão
                            </span>
                          )}
                        </td>

                        <td>
                          <button type="button" className="cf-row-action">
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}

                    {cargosPaginados.length === 0 && (
                      <tr>
                        <td colSpan="8">
                          <div className="cf-empty">
                            Nenhum cargo encontrado para os filtros
                            selecionados.
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <footer className="cf-table-footer">
                <div className="cf-pagination-info">
                  Exibindo <strong>{exibindoInicio}</strong>–
                  <strong>{exibindoFim}</strong> de{" "}
                  <strong>{cargosFiltrados.length}</strong>
                </div>

                <div className="cf-pagination-controls">
                  <select
                    value={linhasPorPagina}
                    onChange={(event) =>
                      setLinhasPorPagina(Number(event.target.value))
                    }
                  >
                    <option value={5}>5 por página</option>
                    <option value={15}>15 por página</option>
                    <option value={30}>30 por página</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => irParaPagina(1)}
                    disabled={paginaSegura === 1}
                  >
                    <ChevronsLeft size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => irParaPagina(paginaSegura - 1)}
                    disabled={paginaSegura === 1}
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <span>
                    Página <strong>{paginaSegura}</strong> de{" "}
                    <strong>{totalPaginas}</strong>
                  </span>

                  <button
                    type="button"
                    onClick={() => irParaPagina(paginaSegura + 1)}
                    disabled={paginaSegura === totalPaginas}
                  >
                    <ChevronRight size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => irParaPagina(totalPaginas)}
                    disabled={paginaSegura === totalPaginas}
                  >
                    <ChevronsRight size={16} />
                  </button>
                </div>
              </footer>
            </>
          )}
        </section>
      </section>

      <aside className="cf-right-sidebar">
        <article className="cf-side-card">
          <h3>Como funciona</h3>
          <p>
            A estrutura segue a ordem Nível → Categoria → Função → Cargo. O
            nível controla acesso principal; os cargos organizam a operação dos
            condomínios.
          </p>
        </article>

        <article className="cf-side-card cf-communication-card">
          <div className="cf-communication-label">Comunicação Chegou!</div>

          <div className="cf-communication-icon">
            <Megaphone size={22} />
          </div>

          <h3>Catálogo governado</h3>
          <p>
            Novos cargos sugeridos por condomínios passam por auditoria da
            Equipe Chegou! antes de entrarem no catálogo global.
          </p>

          <button type="button" className="cf-communication-button">
            Ver comunicações
          </button>
        </article>

        <article className="cf-side-card">
          <h3>Legenda de Categorias</h3>

          <div className="cf-category-legend">
            {legendaCategorias.map((categoria) => (
              <div key={categoria.nome} className="cf-category-legend-item">
                <span style={{ background: categoria.cor }} />
                <small>{categoria.nome}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="cf-side-card">
          <h3>Estrutura hierárquica</h3>
          <ol className="cf-level-list">
            <li>Nível 1 — Síndico</li>
            <li>Nível 2 — Subsíndico / Conselho</li>
            <li>Nível 3 — Administrativo / Gerência</li>
            <li>Nível 4 — Coordenação</li>
            <li>Nível 5 — Supervisão</li>
            <li>Nível 6 — Operacional com acesso</li>
            <li>Nível 7 — Operacional sem acesso</li>
            <li>Nível 8 — Terceirizado / Apoio</li>
            <li>Nível 9 — Temporário / Eventual</li>
          </ol>
        </article>

        <article className="cf-side-card">
          <h3>Auditoria</h3>
          <p>
            Solicitações de novos cargos terão observação do condomínio, análise
            da Equipe Chegou!, logs e notificações ponta a ponta.
          </p>
          <strong>{solicitacoes.length}</strong>
          <small>solicitações registradas</small>
        </article>

        <article className="cf-side-card">
          <h3>Segurança</h3>
          <p>
            Contas Auth e permissões serão ativadas no Módulo Administrativo com
            chaves de acesso, logs e preparação CSIC.
          </p>
        </article>
      </aside>
    </div>
  );
}

export default CargosFuncoes;