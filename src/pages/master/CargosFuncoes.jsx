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

const ACOES_AUDITORIA = {
  EM_ANALISE: {
    titulo: "Marcar solicitação em análise",
    descricao: "A solicitação ficará sinalizada como em análise pela Equipe Chegou!.",
    exigeObservacao: false,
  },
  APROVADO_GLOBAL: {
    titulo: "Aprovar para Catálogo Global",
    descricao: "O cargo será aprovado e passará a fazer parte do Catálogo Global Chegou!.",
    exigeObservacao: false,
  },
  APROVADO_LOCAL: {
    titulo: "Aprovar somente para este condomínio",
    descricao: "O cargo será aprovado apenas para uso deste condomínio.",
    exigeObservacao: false,
  },
  AJUSTE_SOLICITADO: {
    titulo: "Solicitar ajuste",
    descricao: "Informe claramente o que o condomínio precisa ajustar.",
    exigeObservacao: true,
  },
  REPROVADO: {
    titulo: "Reprovar solicitação",
    descricao: "Informe a justificativa da reprovação para registro e notificação.",
    exigeObservacao: true,
  },
};

const FILTROS_HISTORICO = [
  { id: "TODOS", label: "Todos" },
  { id: "APROVADOS", label: "Aprovados" },
  { id: "REPROVADO", label: "Reprovados" },
  { id: "AJUSTE_SOLICITADO", label: "Ajustes" },
  { id: "EM_ANALISE", label: "Em análise" },
  { id: "PROMOVIDO_GLOBAL", label: "Promovidos" },
];

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

  const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState(null);
  const [acaoAuditoria, setAcaoAuditoria] = useState(null);
  const [observacaoAuditoria, setObservacaoAuditoria] = useState("");
  const [motivoAuditoria, setMotivoAuditoria] = useState("");
  const [salvandoAuditoria, setSalvandoAuditoria] = useState(false);

  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [filtroHistorico, setFiltroHistorico] = useState("TODOS");
  const [paginaHistorico, setPaginaHistorico] = useState(1);

  const [cargoSelecionado, setCargoSelecionado] = useState(null);
  const [modalPromocaoAberto, setModalPromocaoAberto] = useState(false);
  const [observacaoPromocao, setObservacaoPromocao] = useState("");
  const [motivoPromocao, setMotivoPromocao] = useState("");
  const [salvandoPromocao, setSalvandoPromocao] = useState(false);

  const linhasHistorico = 10;

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

  useEffect(() => {
    setPaginaHistorico(1);
  }, [filtroHistorico]);

  useEffect(() => {
    function fecharComEsc(event) {
      if (event.key !== "Escape") return;

      event.preventDefault();
      event.stopPropagation();
      document.activeElement?.blur?.();

      if (salvandoAuditoria || salvandoPromocao) return;

      if (modalPromocaoAberto) {
        fecharModalPromocao();
        return;
      }

      if (acaoAuditoria) {
        fecharModalAuditoria();
        return;
      }

      if (cargoSelecionado) {
        fecharDrawerCargo();
        return;
      }

      if (solicitacaoSelecionada) {
        fecharDrawerSolicitacao();
        return;
      }

      if (historicoAberto) {
        fecharHistorico();
      }
    }

    document.addEventListener("keydown", fecharComEsc, true);
    return () => document.removeEventListener("keydown", fecharComEsc, true);
  }, [
    acaoAuditoria,
    cargoSelecionado,
    historicoAberto,
    modalPromocaoAberto,
    salvandoAuditoria,
    salvandoPromocao,
    solicitacaoSelecionada,
  ]);

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
      setErro(error?.message || "Não foi possível carregar a tela de Cargos e Funções.");
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

    return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [cargos]);

  const solicitacoesPendentes = useMemo(() => {
    return solicitacoes.filter((item) =>
      ["PENDENTE_AUDITORIA", "EM_ANALISE", "AJUSTE_SOLICITADO"].includes(
        item.status_auditoria
      )
    );
  }, [solicitacoes]);

  const solicitacoesHistorico = useMemo(() => {
    return solicitacoes.filter((item) => {
      if (filtroHistorico === "TODOS") return true;

      if (filtroHistorico === "APROVADOS") {
        return ["APROVADO_GLOBAL", "APROVADO_LOCAL"].includes(item.status_auditoria);
      }

      return item.status_auditoria === filtroHistorico;
    });
  }, [filtroHistorico, solicitacoes]);

  const totalPaginasHistorico = Math.max(
    1,
    Math.ceil(solicitacoesHistorico.length / linhasHistorico)
  );

  const paginaHistoricoSegura = Math.min(paginaHistorico, totalPaginasHistorico);
  const historicoInicio = (paginaHistoricoSegura - 1) * linhasHistorico;
  const historicoFim = historicoInicio + linhasHistorico;

  const solicitacoesHistoricoPaginadas = solicitacoesHistorico.slice(
    historicoInicio,
    historicoFim
  );

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

  const cargosSemelhantes = useMemo(() => {
    if (!solicitacaoSelecionada?.cargo_solicitado) return [];

    const termo = solicitacaoSelecionada.cargo_solicitado.trim().toLowerCase();

    if (!termo) return [];

    return cargos
      .filter((cargo) => {
        const texto = [
          cargo.cargo_nome,
          cargo.cargo_codigo,
          cargo.funcao_nome,
          cargo.categoria_nome,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return (
          texto.includes(termo) ||
          termo.includes(String(cargo.cargo_nome || "").toLowerCase())
        );
      })
      .slice(0, 6);
  }, [cargos, solicitacaoSelecionada]);

  const totalPaginas = Math.max(1, Math.ceil(cargosFiltrados.length / linhasPorPagina));
  const paginaSegura = Math.min(paginaAtual, totalPaginas);
  const indiceInicial = (paginaSegura - 1) * linhasPorPagina;
  const indiceFinal = indiceInicial + linhasPorPagina;

  const cargosPaginados = cargosFiltrados.slice(indiceInicial, indiceFinal);
  const exibindoInicio = cargosFiltrados.length === 0 ? 0 : indiceInicial + 1;
  const exibindoFim = Math.min(indiceFinal, cargosFiltrados.length);

  function irParaPagina(novaPagina) {
    const pagina = Math.min(Math.max(novaPagina, 1), totalPaginas);
    setPaginaAtual(pagina);
  }

  function irParaPaginaHistorico(novaPagina) {
    const pagina = Math.min(Math.max(novaPagina, 1), totalPaginasHistorico);
    setPaginaHistorico(pagina);
  }

  function formatarData(data) {
    if (!data) return "Sem data";
    return new Date(data).toLocaleString("pt-BR");
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

  function badgeSolicitacao(status) {
    const statusNormalizado = String(status || "").toUpperCase();

    if (statusNormalizado === "PENDENTE_AUDITORIA") {
      return <span className="cf-badge cf-badge-laranja">Pendente</span>;
    }

    if (statusNormalizado === "EM_ANALISE") {
      return <span className="cf-badge cf-badge-azul">Em análise</span>;
    }

    if (statusNormalizado === "APROVADO_GLOBAL") {
      return <span className="cf-badge cf-badge-verde">Aprovado global</span>;
    }

    if (statusNormalizado === "APROVADO_LOCAL") {
      return <span className="cf-badge cf-badge-roxo">Aprovado local</span>;
    }

    if (statusNormalizado === "AJUSTE_SOLICITADO") {
      return <span className="cf-badge cf-badge-amarelo">Ajuste solicitado</span>;
    }

    if (statusNormalizado === "REPROVADO") {
      return <span className="cf-badge cf-badge-vermelho">Reprovado</span>;
    }

    if (statusNormalizado === "PROMOVIDO_GLOBAL") {
      return <span className="cf-badge cf-badge-verde">Promovido global</span>;
    }

    return <span className="cf-badge cf-badge-cinza">{status || "Sem status"}</span>;
  }

  function podePromoverCargo(cargo) {
    return (
      cargo?.personalizado === true &&
      cargo?.sistema_padrao === false &&
      cargo?.ativo === true &&
      Boolean(cargo?.condominio_id)
    );
  }

  function abrirModalAuditoria(status) {
    setAcaoAuditoria(status);
    setObservacaoAuditoria("");
    setMotivoAuditoria("");
    document.activeElement?.blur?.();
  }

  function fecharModalAuditoria() {
    if (salvandoAuditoria) return;

    setAcaoAuditoria(null);
    setObservacaoAuditoria("");
    setMotivoAuditoria("");
    document.activeElement?.blur?.();
  }

  function fecharDrawerSolicitacao() {
    setSolicitacaoSelecionada(null);
    document.activeElement?.blur?.();
  }

  function abrirDrawerCargo(cargo) {
    setCargoSelecionado(cargo);
    document.activeElement?.blur?.();
  }

  function fecharDrawerCargo() {
    if (modalPromocaoAberto || salvandoPromocao) return;

    setCargoSelecionado(null);
    document.activeElement?.blur?.();
  }

  function abrirHistorico() {
    setHistoricoAberto(true);
    document.activeElement?.blur?.();
  }

  function fecharHistorico() {
    setHistoricoAberto(false);
    document.activeElement?.blur?.();
  }

  function abrirModalPromocao() {
    setModalPromocaoAberto(true);
    setObservacaoPromocao("");
    setMotivoPromocao("");
    document.activeElement?.blur?.();
  }

  function fecharModalPromocao() {
    if (salvandoPromocao) return;

    setModalPromocaoAberto(false);
    setObservacaoPromocao("");
    setMotivoPromocao("");
    document.activeElement?.blur?.();
  }

  async function confirmarAuditoria() {
    if (!solicitacaoSelecionada || !acaoAuditoria) return;

    const config = ACOES_AUDITORIA[acaoAuditoria];

    if (config?.exigeObservacao && !observacaoAuditoria.trim()) {
      setErro("Informe uma observação para concluir esta auditoria.");
      return;
    }

    setSalvandoAuditoria(true);
    setErro("");

    try {
      const { error } = await supabase.rpc("rpc_master_auditar_solicitacao_cargo", {
        p_solicitacao_id: solicitacaoSelecionada.solicitacao_id,
        p_novo_status: acaoAuditoria,
        p_observacao: observacaoAuditoria.trim() || null,
        p_motivo: motivoAuditoria.trim() || null,
      });

      if (error) throw error;

      fecharModalAuditoria();
      fecharDrawerSolicitacao();
      await carregarDados();
    } catch (error) {
      console.error("Erro ao auditar solicitação:", error);
      setErro(error?.message || "Não foi possível concluir a auditoria.");
    } finally {
      setSalvandoAuditoria(false);
    }
  }

  async function confirmarPromocaoGlobal() {
    if (!cargoSelecionado?.cargo_id) return;

    setSalvandoPromocao(true);
    setErro("");

    try {
      const { error } = await supabase.rpc("rpc_master_promover_cargo_global", {
        p_cargo_id: cargoSelecionado.cargo_id,
        p_observacao: observacaoPromocao.trim() || null,
        p_motivo: motivoPromocao.trim() || null,
      });

      if (error) throw error;

      fecharModalPromocao();
      fecharDrawerCargo();
      await carregarDados();
    } catch (error) {
      console.error("Erro ao promover cargo:", error);
      setErro(error?.message || "Não foi possível promover o cargo.");
    } finally {
      setSalvandoPromocao(false);
    }
  }

  return (
    <div className="cargos-funcoes-page">
      <section className="cf-main">
        <header className="cf-header">
          <div>
            <span className="cf-eyebrow">Módulo Master</span>
            <h1>Cargos e Funções</h1>
            <p>
              Gerencie o catálogo global, acompanhe solicitações dos condomínios
              e finalize auditorias com rastreabilidade.
            </p>
          </div>

          <div className="cf-header-actions">
            <button type="button" className="cf-btn-secondary" onClick={carregarDados}>
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

          <article className="cf-kpi-card cf-kpi-alert">
            <span>
              <ShieldCheck size={20} />
            </span>
            <small>Solicitações Pendentes</small>
            <strong>{solicitacoesPendentes.length}</strong>
          </article>
        </section>

        <section className="cf-auditoria-card">
          <div className="cf-table-header">
            <div>
              <h2>Auditoria de Solicitações</h2>
              <p>
                Solicitações enviadas pelos condomínios para análise da Equipe Chegou!.
              </p>
            </div>

            <button type="button" className="cf-btn-primary" onClick={abrirHistorico}>
              Ver histórico
            </button>
          </div>

          <div className="cf-solicitacoes-list">
            {solicitacoesPendentes.length === 0 && (
              <div className="cf-empty">Nenhuma solicitação pendente de auditoria.</div>
            )}

            {solicitacoesPendentes.slice(0, 5).map((item) => (
              <button
                type="button"
                key={item.solicitacao_id}
                className="cf-solicitacao-item"
                onClick={() => {
                  setSolicitacaoSelecionada(item);
                  document.activeElement?.blur?.();
                }}
              >
                <div>
                  <strong>{item.cargo_solicitado}</strong>
                  <small>
                    {item.nome_condominio || "Condomínio não informado"} •{" "}
                    {item.nome_solicitante || "Solicitante não informado"}
                  </small>
                </div>

                <div>
                  {badgeSolicitacao(item.status_auditoria)}
                  <small>{formatarData(item.criado_em)}</small>
                </div>
              </button>
            ))}
          </div>
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
                            style={{ background: item.categoria_cor || item.cor }}
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
                            <span className="cf-access-muted">Sem acesso padrão</span>
                          )}
                        </td>

                        <td>
                          <button
                            type="button"
                            className="cf-row-action"
                            onClick={() => abrirDrawerCargo(item)}
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}

                    {cargosPaginados.length === 0 && (
                      <tr>
                        <td colSpan="8">
                          <div className="cf-empty">
                            Nenhum cargo encontrado para os filtros selecionados.
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <footer className="cf-table-footer">
                <div className="cf-pagination-info">
                  Exibindo <strong>{exibindoInicio}</strong>–<strong>{exibindoFim}</strong>{" "}
                  de <strong>{cargosFiltrados.length}</strong>
                </div>

                <div className="cf-pagination-controls">
                  <select
                    value={linhasPorPagina}
                    onChange={(event) => setLinhasPorPagina(Number(event.target.value))}
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
                    Página <strong>{paginaSegura}</strong> de <strong>{totalPaginas}</strong>
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
            A estrutura segue a ordem Nível → Categoria → Função → Cargo. O nível
            controla acesso principal; os cargos organizam a operação dos condomínios.
          </p>
        </article>

        <article className="cf-side-card cf-communication-card">
          <div className="cf-communication-label">Comunicação Chegou!</div>

          <div className="cf-communication-icon">
            <Megaphone size={22} />
          </div>

          <h3>Catálogo governado</h3>
          <p>
            Novos cargos sugeridos por condomínios passam por auditoria da Equipe Chegou!
            antes de entrarem no catálogo global.
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
          <h3>Auditoria</h3>
          <p>
            Solicitações são tratadas pelo Master/Equipe Chegou! com logs, auditoria,
            notificação e evento preparado para CSIC.
          </p>
          <strong>{solicitacoesPendentes.length}</strong>
          <small>pendentes ou em análise</small>
        </article>

        <article className="cf-side-card">
          <h3>Segurança</h3>
          <p>
            Contas Auth e permissões serão ativadas no Módulo Administrativo com chaves
            de acesso, logs e preparação CSIC.
          </p>
        </article>
      </aside>

      {solicitacaoSelecionada && (
        <div className="cf-drawer-overlay">
          <aside className="cf-drawer">
            <header className="cf-drawer-header">
              <div>
                <span>Auditoria Master</span>
                <h2>{solicitacaoSelecionada.cargo_solicitado}</h2>
                <p>{solicitacaoSelecionada.nome_condominio}</p>
              </div>

              <button
                type="button"
                onClick={fecharDrawerSolicitacao}
                aria-label="Fechar auditoria"
              >
                <X size={20} />
              </button>
            </header>

            <div className="cf-drawer-body">
              <section className="cf-drawer-section">
                <h3>Dados da solicitação</h3>

                <div className="cf-detail-grid">
                  <div>
                    <small>Status</small>
                    {badgeSolicitacao(solicitacaoSelecionada.status_auditoria)}
                  </div>

                  <div>
                    <small>Condomínio</small>
                    <strong>{solicitacaoSelecionada.nome_condominio || "-"}</strong>
                  </div>

                  <div>
                    <small>Solicitante</small>
                    <strong>{solicitacaoSelecionada.nome_solicitante || "-"}</strong>
                  </div>

                  <div>
                    <small>Business ID</small>
                    <strong>{solicitacaoSelecionada.business_id_condominio || "-"}</strong>
                  </div>

                  <div>
                    <small>Categoria</small>
                    <strong>{solicitacaoSelecionada.categoria_nome || "-"}</strong>
                  </div>

                  <div>
                    <small>Função</small>
                    <strong>{solicitacaoSelecionada.funcao_nome || "-"}</strong>
                  </div>
                </div>
              </section>

              <section className="cf-drawer-section">
                <h3>Observação do condomínio</h3>
                <p className="cf-drawer-note">
                  {solicitacaoSelecionada.observacao_solicitante ||
                    "Sem observação informada."}
                </p>
              </section>

              <section className="cf-drawer-section">
                <h3>Comparação com catálogo</h3>

                <div className="cf-comparison-box">
                  <div>
                    <small>Cargo global existente</small>
                    <strong>
                      {solicitacaoSelecionada.cargo_global_existente ||
                        "Nenhum vínculo global informado"}
                    </strong>
                  </div>

                  <div>
                    <small>Cargo equivalente</small>
                    <strong>
                      {solicitacaoSelecionada.cargo_equivalente ||
                        "Nenhum equivalente informado"}
                    </strong>
                  </div>

                  <div>
                    <small>Solicitações equivalentes</small>
                    <strong>
                      {solicitacaoSelecionada.quantidade_solicitacoes_equivalentes || 1}
                    </strong>
                  </div>
                </div>

                {cargosSemelhantes.length > 0 && (
                  <div className="cf-similar-list">
                    <small>Possíveis cargos semelhantes</small>

                    {cargosSemelhantes.map((cargo) => (
                      <div key={cargo.cargo_id}>
                        <span
                          className="cf-category-dot"
                          style={{ background: cargo.categoria_cor || cargo.cor }}
                        />
                        <strong>{cargo.cargo_nome}</strong>
                        <em>{cargo.categoria_nome}</em>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <footer className="cf-drawer-actions">
              <button
                type="button"
                className="cf-btn-secondary"
                onClick={() => abrirModalAuditoria("EM_ANALISE")}
              >
                Em análise
              </button>

              <button
                type="button"
                className="cf-btn-secondary"
                onClick={() => abrirModalAuditoria("APROVADO_LOCAL")}
              >
                Aprovar local
              </button>

              <button
                type="button"
                className="cf-btn-primary"
                onClick={() => abrirModalAuditoria("APROVADO_GLOBAL")}
              >
                Aprovar global
              </button>

              <button
                type="button"
                className="cf-btn-secondary"
                onClick={() => abrirModalAuditoria("AJUSTE_SOLICITADO")}
              >
                Solicitar ajuste
              </button>

              <button
                type="button"
                className="cf-btn-danger"
                onClick={() => abrirModalAuditoria("REPROVADO")}
              >
                Reprovar
              </button>
            </footer>
          </aside>
        </div>
      )}

      {cargoSelecionado && (
        <div className="cf-drawer-overlay">
          <aside className="cf-drawer">
            <header className="cf-drawer-header">
              <div>
                <span>Dados do Cargo</span>
                <h2>{cargoSelecionado.cargo_nome}</h2>
                <p>{cargoSelecionado.categoria_nome}</p>
              </div>

              <button type="button" onClick={fecharDrawerCargo} aria-label="Fechar cargo">
                <X size={20} />
              </button>
            </header>

            <div className="cf-drawer-body">
              <section className="cf-drawer-section">
                <h3>Informações principais</h3>

                <div className="cf-detail-grid">
                  <div>
                    <small>Status</small>
                    {badgeCargo(cargoSelecionado)}
                  </div>

                  <div>
                    <small>Código</small>
                    <strong>{cargoSelecionado.cargo_codigo || "-"}</strong>
                  </div>

                  <div>
                    <small>Categoria</small>
                    <strong>{cargoSelecionado.categoria_nome || "-"}</strong>
                  </div>

                  <div>
                    <small>Função</small>
                    <strong>{cargoSelecionado.funcao_nome || "-"}</strong>
                  </div>

                  <div>
                    <small>Condomínio</small>
                    <strong>
                      {cargoSelecionado.nome_condominio ||
                        cargoSelecionado.condominio_nome ||
                        "Catálogo Global"}
                    </strong>
                  </div>

                  <div>
                    <small>Tipo</small>
                    <strong>
                      {cargoSelecionado.personalizado
                        ? "Personalizado / Local"
                        : "Padrão Chegou!"}
                    </strong>
                  </div>
                </div>
              </section>

              <section className="cf-drawer-section">
                <h3>Descrição</h3>
                <p className="cf-drawer-note">
                  {cargoSelecionado.cargo_descricao || "Sem descrição cadastrada."}
                </p>
              </section>

              <section className="cf-drawer-section">
                <h3>Regras</h3>
                <div className="cf-comparison-box">
                  <div>
                    <small>Acesso ao sistema</small>
                    <strong>
                      {cargoSelecionado.permite_acesso_sistema
                        ? "Pode ter conta Auth"
                        : "Sem acesso padrão"}
                    </strong>
                  </div>

                  <div>
                    <small>Sistema padrão</small>
                    <strong>{cargoSelecionado.sistema_padrao ? "Sim" : "Não"}</strong>
                  </div>

                  <div>
                    <small>Personalizado</small>
                    <strong>{cargoSelecionado.personalizado ? "Sim" : "Não"}</strong>
                  </div>
                </div>
              </section>
            </div>

            <footer className="cf-drawer-actions">
              {podePromoverCargo(cargoSelecionado) && (
                <button type="button" className="cf-btn-primary" onClick={abrirModalPromocao}>
                  Promover para Catálogo Global
                </button>
              )}

              <button type="button" className="cf-btn-secondary" onClick={fecharDrawerCargo}>
                Fechar
              </button>
            </footer>
          </aside>
        </div>
      )}

      {historicoAberto && (
        <div className="cf-modal-overlay">
          <section className="cf-modal cf-history-modal">
            <header className="cf-modal-header">
              <div>
                <span>Histórico</span>
                <h2>Histórico de Solicitações</h2>
              </div>

              <button type="button" onClick={fecharHistorico} aria-label="Fechar histórico">
                <X size={20} />
              </button>
            </header>

            <div className="cf-modal-body">
              <div className="cf-history-filters">
                {FILTROS_HISTORICO.map((filtro) => (
                  <button
                    type="button"
                    key={filtro.id}
                    className={filtroHistorico === filtro.id ? "active" : ""}
                    onClick={() => setFiltroHistorico(filtro.id)}
                  >
                    {filtro.label}
                  </button>
                ))}
              </div>

              <div className="cf-history-table-wrap">
                <table className="cf-history-table">
                  <thead>
                    <tr>
                      <th>Cargo</th>
                      <th>Condomínio</th>
                      <th>Status</th>
                      <th>Data</th>
                    </tr>
                  </thead>

                  <tbody>
                    {solicitacoesHistoricoPaginadas.map((item) => (
                      <tr key={item.solicitacao_id}>
                        <td>
                          <strong>{item.cargo_solicitado}</strong>
                          <small>{item.nome_solicitante || "Solicitante não informado"}</small>
                        </td>

                        <td>{item.nome_condominio || "-"}</td>
                        <td>{badgeSolicitacao(item.status_auditoria)}</td>
                        <td>{formatarData(item.editado_em || item.criado_em)}</td>
                      </tr>
                    ))}

                    {solicitacoesHistoricoPaginadas.length === 0 && (
                      <tr>
                        <td colSpan="4">
                          <div className="cf-empty">Nenhum histórico encontrado.</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <footer className="cf-modal-actions cf-history-footer">
              <span>
                Página <strong>{paginaHistoricoSegura}</strong> de{" "}
                <strong>{totalPaginasHistorico}</strong>
              </span>

              <div>
                <button
                  type="button"
                  className="cf-btn-secondary"
                  onClick={() => irParaPaginaHistorico(paginaHistoricoSegura - 1)}
                  disabled={paginaHistoricoSegura === 1}
                >
                  Anterior
                </button>

                <button
                  type="button"
                  className="cf-btn-secondary"
                  onClick={() => irParaPaginaHistorico(paginaHistoricoSegura + 1)}
                  disabled={paginaHistoricoSegura === totalPaginasHistorico}
                >
                  Próxima
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}

      {modalPromocaoAberto && cargoSelecionado && (
        <div className="cf-modal-overlay">
          <section className="cf-modal">
            <header className="cf-modal-header">
              <div>
                <span>Promoção Global</span>
                <h2>Promover para Catálogo Global</h2>
              </div>

              <button
                type="button"
                onClick={fecharModalPromocao}
                aria-label="Fechar promoção"
              >
                <X size={20} />
              </button>
            </header>

            <div className="cf-modal-body">
              <p>
                O cargo <strong>{cargoSelecionado.cargo_nome}</strong> deixará de ser
                exclusivo deste condomínio e passará a integrar o Catálogo Global do
                Sistema Chegou!.
              </p>

              <label>
                Motivo da promoção
                <textarea
                  value={motivoPromocao}
                  onChange={(event) => setMotivoPromocao(event.target.value)}
                  placeholder="Informe o motivo da promoção para o catálogo global..."
                />
              </label>

              <label>
                Observação interna
                <textarea
                  value={observacaoPromocao}
                  onChange={(event) => setObservacaoPromocao(event.target.value)}
                  placeholder="Informe uma observação interna, se necessário..."
                />
              </label>
            </div>

            <footer className="cf-modal-actions">
              <button
                type="button"
                className="cf-btn-secondary"
                onClick={fecharModalPromocao}
                disabled={salvandoPromocao}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="cf-btn-primary"
                onClick={confirmarPromocaoGlobal}
                disabled={salvandoPromocao}
              >
                {salvandoPromocao ? "Promovendo..." : "Promover"}
              </button>
            </footer>
          </section>
        </div>
      )}

      {acaoAuditoria && (
        <div className="cf-modal-overlay">
          <section className="cf-modal">
            <header className="cf-modal-header">
              <div>
                <span>Confirmar auditoria</span>
                <h2>{ACOES_AUDITORIA[acaoAuditoria]?.titulo}</h2>
              </div>

              <button
                type="button"
                onClick={fecharModalAuditoria}
                aria-label="Fechar confirmação"
              >
                <X size={20} />
              </button>
            </header>

            <div className="cf-modal-body">
              <p>{ACOES_AUDITORIA[acaoAuditoria]?.descricao}</p>

              <label>
                Observação para registro
                <textarea
                  value={observacaoAuditoria}
                  onChange={(event) => setObservacaoAuditoria(event.target.value)}
                  placeholder="Informe a observação da auditoria..."
                />
              </label>

              <label>
                Motivo / justificativa complementar
                <textarea
                  value={motivoAuditoria}
                  onChange={(event) => setMotivoAuditoria(event.target.value)}
                  placeholder="Informe o motivo, se necessário..."
                />
              </label>
            </div>

            <footer className="cf-modal-actions">
              <button
                type="button"
                className="cf-btn-secondary"
                onClick={fecharModalAuditoria}
                disabled={salvandoAuditoria}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="cf-btn-primary"
                onClick={confirmarAuditoria}
                disabled={salvandoAuditoria}
              >
                {salvandoAuditoria ? "Salvando..." : "Confirmar"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

export default CargosFuncoes;