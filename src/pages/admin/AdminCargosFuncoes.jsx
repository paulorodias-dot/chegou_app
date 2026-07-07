import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  HelpCircle,
  Info,
  Layers3,
  ListChecks,
  Loader2,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

import {
  carregarKpisAdminCargosFuncoes,
  criarSolicitacaoAdminCargo,
  reenviarSolicitacaoAdminCargo,
  listarCatalogoAdminCargosFuncoes,
  listarSolicitacoesAdminCargosFuncoes,
} from "../../services/adminCargosFuncoesService";

import "./AdminCargosFuncoes.css";

const FILTROS_INICIAIS = {
  busca: "",
  categoriaId: "",
  funcaoId: "",
  status: "",
};

const FORM_INICIAL = {
  categoriaId: "",
  funcaoId: "",
  cargoSolicitado: "",
  codigoSugerido: "",
  observacao: "",
};

const STATUS_FINALIZADOS = [
  "APROVADO_GLOBAL",
  "APROVADO_LOCAL",
  "PROMOVIDO_GLOBAL",
  "REPROVADO",
  "INATIVO",
];

const STATUS_EM_ANDAMENTO = ["PENDENTE_AUDITORIA", "EM_ANALISE"];

const FILTRO_SOLICITACOES = {
  TODOS: "todos",
  ANDAMENTO: "andamento",
  AJUSTE: "ajuste",
  FINALIZADOS: "finalizados",
};

function formatarStatus(status) {
  const valor = status || "PENDENTE_AUDITORIA";

  const mapa = {
    ATIVO: "Ativo",
    INATIVO: "Inativo",
    PENDENTE_AUDITORIA: "Pendente de auditoria",
    EM_ANALISE: "Em análise",
    AJUSTE_SOLICITADO: "Ajuste solicitado",
    APROVADO_GLOBAL: "Aprovado global",
    APROVADO_LOCAL: "Aprovado local",
    PROMOVIDO_GLOBAL: "Promovido global",
    REPROVADO: "Reprovado",
    CANCELADO: "Cancelado",
  };

  return mapa[valor] || valor.replaceAll("_", " ");
}

function formatarData(data) {
  if (!data) return "—";

  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(data));
  } catch {
    return "—";
  }
}

function montarTimelineSolicitacao(solicitacao) {
  const status = solicitacao?.status_auditoria || "PENDENTE_AUDITORIA";

  const timeline = [
    {
      titulo: "Solicitação enviada",
      data: solicitacao?.criado_em,
    },
  ];

  if (status === "EM_ANALISE") {
    timeline.push({
      titulo: "Em análise pela Equipe Chegou!",
      data: solicitacao?.em_analise_em || solicitacao?.editado_em,
    });
  }

  if (status === "AJUSTE_SOLICITADO") {
    timeline.push({
      titulo: "Ajuste solicitado",
      data: solicitacao?.editado_em,
    });
  }

  if (status === "APROVADO_GLOBAL") {
    timeline.push({
      titulo: "Aprovado para o Catálogo Global",
      data: solicitacao?.aprovado_em || solicitacao?.editado_em,
    });
  }

  if (status === "APROVADO_LOCAL") {
    timeline.push({
      titulo: "Aprovado para este condomínio",
      data: solicitacao?.aprovado_em || solicitacao?.editado_em,
    });
  }

  if (status === "PROMOVIDO_GLOBAL") {
    timeline.push({
      titulo: "Promovido para o Catálogo Global",
      data: solicitacao?.promovido_em || solicitacao?.editado_em,
    });
  }

  if (status === "REPROVADO") {
    timeline.push({
      titulo: "Solicitação reprovada",
      data: solicitacao?.reprovado_em || solicitacao?.editado_em,
    });
  }

  return timeline;
}

export default function AdminCargosFuncoes({ perfil }) {
  const [abaAtiva, setAbaAtiva] = useState("catalogo");
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const [catalogo, setCatalogo] = useState([]);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [kpis, setKpis] = useState({
    cargosAtivos: 0,
    funcoesDisponiveis: 0,
    categorias: 0,
    solicitacoesPendentes: 0,
  });

  const [paginaCatalogo, setPaginaCatalogo] = useState(1);
  const [linhasCatalogo, setLinhasCatalogo] = useState(5);
  const [paginaSolicitacoes, setPaginaSolicitacoes] = useState(1);
  const [linhasSolicitacoes, setLinhasSolicitacoes] = useState(5);

  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState(null);

  const [cargoSelecionado, setCargoSelecionado] = useState(null);
  const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState(null);

  const [modalSolicitacaoAberto, setModalSolicitacaoAberto] = useState(false);
  const [modalManualAberto, setModalManualAberto] = useState(false);
  const [buscaManual, setBuscaManual] = useState("");

  const [formulario, setFormulario] = useState(FORM_INICIAL);
  const [solicitacaoEmEdicao, setSolicitacaoEmEdicao] = useState(null);
  const [enviandoSolicitacao, setEnviandoSolicitacao] = useState(false);
  const [solicitacaoEnviada, setSolicitacaoEnviada] = useState(false);

  const [filtroSolicitacoes, setFiltroSolicitacoes] = useState(
    FILTRO_SOLICITACOES.TODOS
  );

  const categorias = useMemo(() => {
    const mapa = new Map();

    [...catalogo, ...solicitacoes].forEach((item) => {
      if (item.categoria_id && item.categoria_nome) {
        mapa.set(item.categoria_id, item.categoria_nome);
      }
    });

    return Array.from(mapa.entries()).map(([id, nome]) => ({ id, nome }));
  }, [catalogo, solicitacoes]);

  const funcoes = useMemo(() => {
    const mapa = new Map();

    [...catalogo, ...solicitacoes].forEach((item) => {
      if (item.funcao_id && item.funcao_nome) {
        mapa.set(item.funcao_id, item.funcao_nome);
      }
    });

    return Array.from(mapa.entries()).map(([id, nome]) => ({ id, nome }));
  }, [catalogo, solicitacoes]);

  const sugestoesBusca = useMemo(() => {
    const busca = filtros.busca.trim().toLowerCase();

    if (busca.length < 2) return [];

    return catalogo
      .filter((item) => {
        const texto = `${item.cargo_nome || ""} ${item.funcao_nome || ""} ${
          item.categoria_nome || ""
        }`.toLowerCase();

        return texto.includes(busca);
      })
      .slice(0, 5);
  }, [catalogo, filtros.busca]);

  const contadoresSolicitacoes = useMemo(() => {
    const total = solicitacoes.length;

    const emAndamento = solicitacoes.filter((item) =>
      STATUS_EM_ANDAMENTO.includes(item.status_auditoria)
    ).length;

    const ajusteSolicitado = solicitacoes.filter(
      (item) => item.status_auditoria === "AJUSTE_SOLICITADO"
    ).length;

    const finalizados = solicitacoes.filter((item) =>
      STATUS_FINALIZADOS.includes(item.status_auditoria)
    ).length;

    return {
      total,
      emAndamento,
      ajusteSolicitado,
      finalizados,
    };
  }, [solicitacoes]);

  const solicitacoesFiltradas = useMemo(() => {
    if (filtroSolicitacoes === FILTRO_SOLICITACOES.ANDAMENTO) {
      return solicitacoes.filter((item) =>
        STATUS_EM_ANDAMENTO.includes(item.status_auditoria)
      );
    }

    if (filtroSolicitacoes === FILTRO_SOLICITACOES.AJUSTE) {
      return solicitacoes.filter(
        (item) => item.status_auditoria === "AJUSTE_SOLICITADO"
      );
    }

    if (filtroSolicitacoes === FILTRO_SOLICITACOES.FINALIZADOS) {
      return solicitacoes.filter((item) =>
        STATUS_FINALIZADOS.includes(item.status_auditoria)
      );
    }

    return solicitacoes;
  }, [solicitacoes, filtroSolicitacoes]);

  const totalPaginasSolicitacoesFiltradas = Math.max(
    1,
    Math.ceil(solicitacoesFiltradas.length / linhasSolicitacoes)
  );

  const ultimaAtualizacao = useMemo(() => {
    const datas = [
      ...catalogo.map((item) => item.editado_em || item.criado_em),
      ...solicitacoes.map((item) => item.editado_em || item.criado_em),
    ].filter(Boolean);

    if (!datas.length) return "Atualizado agora";

    const maisRecente = datas
      .map((data) => new Date(data))
      .sort((a, b) => b.getTime() - a.getTime())[0];

    return `Atualizado em ${formatarData(maisRecente)}`;
  }, [catalogo, solicitacoes]);

  const totalPaginasCatalogo = Math.max(
    1,
    Math.ceil(catalogo.length / linhasCatalogo)
  );

  const totalPaginasSolicitacoes = totalPaginasSolicitacoesFiltradas;

  const catalogoPaginado = useMemo(() => {
    const inicio = (paginaCatalogo - 1) * linhasCatalogo;
    return catalogo.slice(inicio, inicio + linhasCatalogo);
  }, [catalogo, paginaCatalogo, linhasCatalogo]);

  const solicitacoesPaginadas = useMemo(() => {
    const inicio = (paginaSolicitacoes - 1) * linhasSolicitacoes;
    return solicitacoesFiltradas.slice(inicio, inicio + linhasSolicitacoes);
  }, [solicitacoesFiltradas, paginaSolicitacoes, linhasSolicitacoes]);

  const justificativaTamanho = formulario.observacao.length;
  const justificativaValida =
    justificativaTamanho >= 10 && justificativaTamanho <= 100;

  useEffect(() => {
    carregarTudo();
  }, []);

  useEffect(() => {
    function fecharComEsc(event) {
      if (event.key !== "Escape") return;

      if (
        modalSolicitacaoAberto ||
        cargoSelecionado ||
        solicitacaoSelecionada ||
        modalManualAberto
      ) {
        event.preventDefault();
        document.activeElement?.blur?.();
      }

      if (modalSolicitacaoAberto) fecharSolicitacao();
      if (cargoSelecionado) fecharDrawer();
      if (solicitacaoSelecionada) fecharDetalheSolicitacao();
      if (modalManualAberto) setModalManualAberto(false);
    }

    window.addEventListener("keydown", fecharComEsc);

    return () => {
      window.removeEventListener("keydown", fecharComEsc);
    };
  }, [
    modalSolicitacaoAberto,
    cargoSelecionado,
    solicitacaoSelecionada,
    modalManualAberto,
  ]);

  useEffect(() => {
    setPaginaCatalogo(1);
  }, [catalogo.length, linhasCatalogo]);

  useEffect(() => {
    setPaginaSolicitacoes(1);
  }, [solicitacoesFiltradas.length, linhasSolicitacoes, filtroSolicitacoes]);

  async function carregarTudo() {
    setCarregando(true);
    setMensagem(null);

    try {
      const [dadosKpis, dadosCatalogo, dadosSolicitacoes] = await Promise.all([
        carregarKpisAdminCargosFuncoes({ perfil }),
        listarCatalogoAdminCargosFuncoes({ perfil, filtros: FILTROS_INICIAIS }),
        listarSolicitacoesAdminCargosFuncoes({ perfil }),
      ]);

      setKpis(dadosKpis);
      setCatalogo(dadosCatalogo);
      setSolicitacoes(dadosSolicitacoes);
    } catch (error) {
      console.error(error);
      setMensagem({
        tipo: "erro",
        texto: "Não foi possível carregar as informações agora. Tente novamente ou informe o suporte.",
      });
    } finally {
      setCarregando(false);
    }
  }

  async function recarregarSolicitacoes() {
    const [novosKpis, novasSolicitacoes] = await Promise.all([
      carregarKpisAdminCargosFuncoes({ perfil }),
      listarSolicitacoesAdminCargosFuncoes({ perfil }),
    ]);

    setKpis(novosKpis);
    setSolicitacoes(novasSolicitacoes);
  }

  async function aplicarFiltros(event) {
    event?.preventDefault?.();

    setMensagem(null);
    setCarregando(true);

    try {
      const dados = await listarCatalogoAdminCargosFuncoes({ perfil, filtros });
      setCatalogo(dados);
      setPaginaCatalogo(1);
    } catch (error) {
      console.error(error);
      setMensagem({
        tipo: "erro",
        texto: "Não foi possível atualizar a busca agora. Tente novamente.",
      });
    } finally {
      setCarregando(false);
    }
  }

  function limparFiltros() {
    setFiltros(FILTROS_INICIAIS);
    setMensagem(null);
    setCarregando(true);

    listarCatalogoAdminCargosFuncoes({
      perfil,
      filtros: FILTROS_INICIAIS,
    })
      .then((dados) => {
        setCatalogo(dados);
        setPaginaCatalogo(1);
      })
      .catch((error) => {
        console.error(error);
        setMensagem({
          tipo: "erro",
          texto: "Não foi possível limpar os filtros agora.",
        });
      })
      .finally(() => {
        setCarregando(false);
      });
  }

  function abrirSolicitacao() {
    setFormulario(FORM_INICIAL);
    setSolicitacaoEmEdicao(null);
    setSolicitacaoEnviada(false);
    setModalSolicitacaoAberto(true);
    setMensagem(null);
  }

  function abrirEdicaoSolicitacao(solicitacao) {
    setSolicitacaoSelecionada(null);
    setSolicitacaoEmEdicao(solicitacao);

    setFormulario({
      categoriaId: solicitacao?.categoria_id || "",
      funcaoId: solicitacao?.funcao_id || "",
      cargoSolicitado: solicitacao?.cargo_solicitado || "",
      codigoSugerido: solicitacao?.codigo_sugerido || "",
      observacao: solicitacao?.observacao_solicitante || "",
    });

    setSolicitacaoEnviada(false);
    setModalSolicitacaoAberto(true);
    setMensagem(null);
  }

  function fecharSolicitacao() {
    document.activeElement?.blur?.();
    setModalSolicitacaoAberto(false);
    setSolicitacaoEnviada(false);
    setSolicitacaoEmEdicao(null);
  }

  function fecharDrawer() {
    document.activeElement?.blur?.();
    setCargoSelecionado(null);
  }

  function abrirDetalheSolicitacao(solicitacao) {
    setSolicitacaoSelecionada(solicitacao);
    setMensagem(null);
  }

  function fecharDetalheSolicitacao() {
    document.activeElement?.blur?.();
    setSolicitacaoSelecionada(null);
  }

  function podeEditarSolicitacao(solicitacao) {
    return solicitacao?.status_auditoria === "AJUSTE_SOLICITADO";
  }

  function statusFinalizado(solicitacao) {
    return STATUS_FINALIZADOS.includes(solicitacao?.status_auditoria);
  }

  async function enviarSolicitacao(event) {
    event.preventDefault();

    if (!formulario.cargoSolicitado.trim()) {
      setMensagem({
        tipo: "alerta",
        texto: "Informe o nome do cargo que deseja solicitar.",
      });
      return;
    }

    if (!justificativaValida) {
      setMensagem({
        tipo: "alerta",
        texto: "A justificativa precisa ter entre 10 e 100 caracteres.",
      });
      return;
    }

    setEnviandoSolicitacao(true);
    setSolicitacaoEnviada(false);
    setMensagem(null);

    try {
      if (solicitacaoEmEdicao?.id) {
        await reenviarSolicitacaoAdminCargo({
          perfil,
          solicitacaoId: solicitacaoEmEdicao.id,
          formulario,
        });
      } else {
        await criarSolicitacaoAdminCargo({ perfil, formulario });
      }

      setSolicitacaoEnviada(true);

      setMensagem({
        tipo: "sucesso",
        texto: solicitacaoEmEdicao?.id
          ? "Solicitação reenviada para análise da Equipe Chegou!."
          : "Solicitação enviada para análise da Equipe Chegou!.",
      });

      await recarregarSolicitacoes();

      setAbaAtiva("solicitacoes");

      window.setTimeout(() => {
        fecharSolicitacao();
        setFormulario(FORM_INICIAL);
      }, 700);
    } catch (error) {
      console.error(error);
      setMensagem({
        tipo: "erro",
        texto:
          "Não foi possível enviar a solicitação agora. Tente novamente ou informe o suporte.",
      });
    } finally {
      setEnviandoSolicitacao(false);
    }
  }

  function mudarLinhasCatalogo(valor) {
    setLinhasCatalogo(Number(valor));
    setPaginaCatalogo(1);
  }

  function mudarLinhasSolicitacoes(valor) {
    setLinhasSolicitacoes(Number(valor));
    setPaginaSolicitacoes(1);
  }

  return (
    <section className="admin-cargos-page">
      <div className="admin-cargos-main">
        <header className="admin-cargos-header">
          <div>
            <span className="admin-cargos-eyebrow">Cadastro</span>
            <h1>Cargos e Funções</h1>
            <p>
              Consulte o catálogo oficial, acompanhe solicitações e solicite
              novos cargos quando necessário.
            </p>
            <small className="admin-cargos-updated">{ultimaAtualizacao}</small>
          </div>

          <button
            type="button"
            className="admin-cargos-primary"
            onClick={abrirSolicitacao}
          >
            <Send size={17} />
            Solicitar novo cargo
          </button>
        </header>

        {mensagem ? (
          <div className={`admin-cargos-message ${mensagem.tipo}`}>
            {mensagem.texto}
          </div>
        ) : null}

        <div className="admin-cargos-kpis">
          <article>
            <span>
              <BriefcaseBusiness size={18} />
            </span>
            <div>
              <strong>{kpis.cargosAtivos}</strong>
              <p>Cargos ativos</p>
            </div>
          </article>

          <article>
            <span>
              <ListChecks size={18} />
            </span>
            <div>
              <strong>{kpis.funcoesDisponiveis}</strong>
              <p>Funções disponíveis</p>
            </div>
          </article>

          <article>
            <span>
              <Layers3 size={18} />
            </span>
            <div>
              <strong>{kpis.categorias}</strong>
              <p>Categorias</p>
            </div>
          </article>

          <article>
            <span>
              <Clock size={18} />
            </span>
            <div>
              <strong>{kpis.solicitacoesPendentes}</strong>
              <p>Solicitações pendentes</p>
            </div>
          </article>
        </div>

        <div className="admin-cargos-tabs">
          <button
            type="button"
            className={abaAtiva === "catalogo" ? "active" : ""}
            onClick={() => setAbaAtiva("catalogo")}
          >
            Catálogo Global
          </button>

          <button
            type="button"
            className={abaAtiva === "solicitacoes" ? "active" : ""}
            onClick={() => setAbaAtiva("solicitacoes")}
          >
            Minhas Solicitações
          </button>
        </div>

        {abaAtiva === "catalogo" ? (
          <>
            <form className="admin-cargos-filters" onSubmit={aplicarFiltros}>
              <label>
                <span>Buscar</span>
                <div className="admin-cargos-search">
                  <Search size={16} />
                  <input
                    type="search"
                    value={filtros.busca}
                    placeholder="Busque cargo ou descreva o que procura"
                    enterKeyHint="search"
                    onChange={(event) =>
                      setFiltros((atual) => ({
                        ...atual,
                        busca: event.target.value,
                      }))
                    }
                  />
                </div>

                {sugestoesBusca.length > 0 ? (
                  <div className="admin-cargos-suggestions">
                    <strong>Sugestões próximas</strong>

                    {sugestoesBusca.map((item) => (
                      <button
                        type="button"
                        key={item.cargo_id}
                        onClick={() => setCargoSelecionado(item)}
                      >
                        {item.cargo_nome}
                        <small>
                          {item.funcao_nome ||
                            item.categoria_nome ||
                            "Ver detalhes"}
                        </small>
                      </button>
                    ))}
                  </div>
                ) : null}
              </label>

              <label>
                <span>Categoria</span>
                <select
                  value={filtros.categoriaId}
                  onChange={(event) =>
                    setFiltros((atual) => ({
                      ...atual,
                      categoriaId: event.target.value,
                    }))
                  }
                >
                  <option value="">Todas</option>
                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Função</span>
                <select
                  value={filtros.funcaoId}
                  onChange={(event) =>
                    setFiltros((atual) => ({
                      ...atual,
                      funcaoId: event.target.value,
                    }))
                  }
                >
                  <option value="">Todas</option>
                  {funcoes.map((funcao) => (
                    <option key={funcao.id} value={funcao.id}>
                      {funcao.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Status</span>
                <select
                  value={filtros.status}
                  onChange={(event) =>
                    setFiltros((atual) => ({
                      ...atual,
                      status: event.target.value,
                    }))
                  }
                >
                  <option value="">Todos</option>
                  <option value="ATIVO">Ativo</option>
                  <option value="INATIVO">Inativo</option>
                </select>
              </label>

              <div className="admin-cargos-filter-actions">
                <button type="submit">Buscar</button>
                <button type="button" onClick={limparFiltros}>
                  Limpar
                </button>
              </div>
            </form>

            <div className="admin-cargos-card">
              <div className="admin-cargos-card-head">
                <div>
                  <h2>Catálogo oficial</h2>
                  <p>Cargos e funções disponíveis para consulta.</p>
                </div>
              </div>

              {carregando ? (
                <div className="admin-cargos-empty">
                  Carregando informações...
                </div>
              ) : catalogo.length === 0 ? (
                <div className="admin-cargos-empty">
                  Nenhum cargo encontrado com os filtros selecionados.
                </div>
              ) : (
                <>
                  <div className="admin-cargos-table-wrap">
                    <table className="admin-cargos-table">
                      <thead>
                        <tr>
                          <th>Categoria</th>
                          <th>Função</th>
                          <th>Cargo</th>
                          <th>Status</th>
                          <th>Padrão</th>
                          <th>Ação</th>
                        </tr>
                      </thead>

                      <tbody>
                        {catalogoPaginado.map((item) => (
                          <tr key={item.cargo_id}>
                            <td>{item.categoria_nome || "—"}</td>
                            <td>{item.funcao_nome || "—"}</td>
                            <td>
                              <strong>{item.cargo_nome}</strong>
                              <small>
                                {item.cargo_descricao ||
                                  "Sem descrição cadastrada"}
                              </small>
                            </td>
                            <td>
                              <span
                                className={`admin-cargos-status ${item.cargo_status}`}
                              >
                                {formatarStatus(item.cargo_status)}
                              </span>
                            </td>
                            <td>{item.sistema_padrao ? "Sim" : "Não"}</td>
                            <td>
                              <button
                                type="button"
                                className="admin-cargos-link"
                                onClick={() => setCargoSelecionado(item)}
                              >
                                Visualizar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <footer className="admin-cargos-table-footer">
                    <label>
                      Linhas
                      <select
                        value={linhasCatalogo}
                        onChange={(event) =>
                          mudarLinhasCatalogo(event.target.value)
                        }
                      >
                        <option value={5}>5</option>
                        <option value={15}>15</option>
                        <option value={30}>30</option>
                      </select>
                    </label>

                    <div className="admin-cargos-pagination">
                      <span>
                        Página {paginaCatalogo} de {totalPaginasCatalogo}
                      </span>

                      <button
                        type="button"
                        disabled={paginaCatalogo <= 1}
                        onClick={() =>
                          setPaginaCatalogo((atual) => Math.max(1, atual - 1))
                        }
                      >
                        <ChevronLeft size={15} />
                      </button>

                      <button
                        type="button"
                        disabled={paginaCatalogo >= totalPaginasCatalogo}
                        onClick={() =>
                          setPaginaCatalogo((atual) =>
                            Math.min(totalPaginasCatalogo, atual + 1)
                          )
                        }
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  </footer>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="admin-cargos-card">
            <div className="admin-cargos-card-head">
              <div>
                <h2>Minhas solicitações</h2>
                <p>Acompanhe pedidos enviados, retornos e ajustes solicitados.</p>
              </div>
            </div>

            <div className="admin-cargos-request-filters">
              <button
                type="button"
                className={
                  filtroSolicitacoes === FILTRO_SOLICITACOES.TODOS ? "active" : ""
                }
                onClick={() => setFiltroSolicitacoes(FILTRO_SOLICITACOES.TODOS)}
              >
                Todos <strong>{contadoresSolicitacoes.total}</strong>
              </button>

              <button
                type="button"
                className={
                  filtroSolicitacoes === FILTRO_SOLICITACOES.ANDAMENTO ? "active" : ""
                }
                onClick={() => setFiltroSolicitacoes(FILTRO_SOLICITACOES.ANDAMENTO)}
              >
                Em andamento <strong>{contadoresSolicitacoes.emAndamento}</strong>
              </button>

              <button
                type="button"
                className={
                  filtroSolicitacoes === FILTRO_SOLICITACOES.AJUSTE
                    ? "active warning"
                    : contadoresSolicitacoes.ajusteSolicitado > 0
                    ? "warning"
                    : ""
                }
                onClick={() => setFiltroSolicitacoes(FILTRO_SOLICITACOES.AJUSTE)}
              >
                Ajuste solicitado{" "}
                <strong>{contadoresSolicitacoes.ajusteSolicitado}</strong>
              </button>

              <button
                type="button"
                className={
                  filtroSolicitacoes === FILTRO_SOLICITACOES.FINALIZADOS ? "active" : ""
                }
                onClick={() => setFiltroSolicitacoes(FILTRO_SOLICITACOES.FINALIZADOS)}
              >
                Finalizados <strong>{contadoresSolicitacoes.finalizados}</strong>
              </button>
            </div>

            {contadoresSolicitacoes.ajusteSolicitado > 0 ? (
              <div className="admin-cargos-adjust-alert">
                <div>
                  <strong>
                    Você possui {contadoresSolicitacoes.ajusteSolicitado} solicitação
                    {contadoresSolicitacoes.ajusteSolicitado > 1 ? "ões" : ""} aguardando
                    ajuste da Equipe Chegou!.
                  </strong>
                  <p>Abra o retorno, revise os dados e reenvie para nova análise.</p>
                </div>

                <button
                  type="button"
                  onClick={() => setFiltroSolicitacoes(FILTRO_SOLICITACOES.AJUSTE)}
                >
                  Ver ajustes
                </button>
              </div>
            ) : null}

            {solicitacoesFiltradas.length === 0 ? (
              <div className="admin-cargos-empty">
                Nenhuma solicitação encontrada neste filtro.
              </div>
            ) : (
              <>
                <div className="admin-cargos-requests">
                  {solicitacoesPaginadas.map((solicitacao) => (
                    <article
                      key={solicitacao.id}
                      className={statusFinalizado(solicitacao) ? "finalizada" : ""}
                      onClick={() => abrirDetalheSolicitacao(solicitacao)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          abrirDetalheSolicitacao(solicitacao);
                        }
                      }}
                    >
                      <div>
                        <strong>{solicitacao.cargo_solicitado}</strong>
                        <p>
                          {solicitacao.categoria_nome || "Categoria não informada"} •{" "}
                          {solicitacao.funcao_nome || "Função não informada"}
                        </p>

                        {solicitacao.observacao_auditoria ? (
                          <small className="admin-cargos-return">
                            Retorno da Equipe Chegou!:{" "}
                            {solicitacao.observacao_auditoria}
                          </small>
                        ) : solicitacao.observacao_solicitante ? (
                          <small>{solicitacao.observacao_solicitante}</small>
                        ) : null}
                      </div>

                      <div>
                        <span
                          className={`admin-cargos-status ${solicitacao.status_auditoria}`}
                        >
                          {formatarStatus(solicitacao.status_auditoria)}
                        </span>

                        <small>{formatarData(solicitacao.criado_em)}</small>

                        {podeEditarSolicitacao(solicitacao) ? (
                          <button
                            type="button"
                            className="admin-cargos-request-action"
                            onClick={(event) => {
                              event.stopPropagation();
                              abrirEdicaoSolicitacao(solicitacao);
                            }}
                          >
                            Ajustar
                          </button>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>

                <footer className="admin-cargos-table-footer">
                  <label>
                    Linhas
                    <select
                      value={linhasSolicitacoes}
                      onChange={(event) => mudarLinhasSolicitacoes(event.target.value)}
                    >
                      <option value={5}>5</option>
                      <option value={15}>15</option>
                      <option value={30}>30</option>
                    </select>
                  </label>

                  <div className="admin-cargos-pagination">
                    <span>
                      Página {paginaSolicitacoes} de {totalPaginasSolicitacoes}
                    </span>

                    <button
                      type="button"
                      disabled={paginaSolicitacoes <= 1}
                      onClick={() =>
                        setPaginaSolicitacoes((atual) => Math.max(1, atual - 1))
                      }
                    >
                      <ChevronLeft size={15} />
                    </button>

                    <button
                      type="button"
                      disabled={paginaSolicitacoes >= totalPaginasSolicitacoes}
                      onClick={() =>
                        setPaginaSolicitacoes((atual) =>
                          Math.min(totalPaginasSolicitacoes, atual + 1)
                        )
                      }
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </footer>
              </>
            )}
          </div>
        )}
      </div>

      <aside className="admin-cargos-side">
        <article className="admin-cargos-side-card destaque">
          <div className="admin-cargos-side-title">
            <Info size={19} />
            <h3>Como funciona</h3>
          </div>
          <p>
            O catálogo é administrado pela Equipe Chegou!. O condomínio pode
            consultar, acompanhar retornos e solicitar novos cargos quando
            necessário.
          </p>
        </article>

        <article className="admin-cargos-comunicado-card">
          <div className="admin-cargos-comunicado-head">
            <Info size={18} />
            <h3>Painel de Comunicados Chegou</h3>
          </div>

          <div className="admin-cargos-comunicado-box">
            <div>
              <strong>Comunicados do Módulo</strong>
              <p>Espaço reservado para avisos do Sistema ou Administrativo.</p>
            </div>
          </div>
          
        </article>

        <article className="admin-cargos-side-card">
          <div className="admin-cargos-side-title">
            <HelpCircle size={19} />
            <h3>Ajuda e Manual</h3>
          </div>
          <p>
            Consulte instruções, dúvidas comuns e orientações de uso deste menu.
          </p>
          <button type="button" onClick={() => setModalManualAberto(true)}>
            Abrir manual
          </button>
        </article>

        <article className="admin-cargos-side-card">
          <div className="admin-cargos-side-title">
            <ShieldCheck size={19} />
            <h3>Governança</h3>
          </div>
          <p>
            O Administrativo não altera o catálogo global. Toda solicitação passa
            por análise da Equipe Chegou!.
          </p>
        </article>
      </aside>

      {cargoSelecionado ? (
        <div className="admin-cargos-drawer-backdrop">
          <aside className="admin-cargos-drawer" role="dialog" aria-modal="true">
            <header>
              <div className="admin-cargos-drawer-title">
                <span className="admin-cargos-drawer-icon">
                  <BriefcaseBusiness size={22} />
                </span>

                <div>
                  <small>Detalhes do cargo</small>
                  <h2>{cargoSelecionado.cargo_nome}</h2>
                </div>
              </div>

              <button type="button" onClick={fecharDrawer} aria-label="Fechar">
                <X size={18} />
              </button>
            </header>

            <div className="admin-cargos-drawer-body">
              <section className="admin-cargos-drawer-highlight">
                <div>
                  <Sparkles size={18} />
                  <strong>{cargoSelecionado.funcao_nome || "Função"}</strong>
                </div>
                <p>
                  {cargoSelecionado.cargo_descricao ||
                    "Sem descrição cadastrada para este cargo."}
                </p>
              </section>

              <section>
                <h3>Informações principais</h3>
                <dl>
                  <div>
                    <dt>Categoria</dt>
                    <dd>{cargoSelecionado.categoria_nome || "—"}</dd>
                  </div>
                  <div>
                    <dt>Função</dt>
                    <dd>{cargoSelecionado.funcao_nome || "—"}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{formatarStatus(cargoSelecionado.cargo_status)}</dd>
                  </div>
                  <div>
                    <dt>Cargo padrão</dt>
                    <dd>{cargoSelecionado.sistema_padrao ? "Sim" : "Não"}</dd>
                  </div>
                  <div>
                    <dt>Permite acesso ao sistema</dt>
                    <dd>
                      {cargoSelecionado.permite_acesso_sistema ? "Sim" : "Não"}
                    </dd>
                  </div>
                  <div>
                    <dt>Atualizado em</dt>
                    <dd>{formatarData(cargoSelecionado.editado_em)}</dd>
                  </div>
                </dl>
              </section>
            </div>

            <footer className="admin-cargos-drawer-footer">
              <button type="button" onClick={fecharDrawer}>
                Fechar
              </button>
            </footer>
          </aside>
        </div>
      ) : null}

      {solicitacaoSelecionada ? (
        <div className="admin-cargos-modal-backdrop">
          <aside
            className="admin-cargos-modal admin-cargos-request-modal"
            role="dialog"
            aria-modal="true"
          >
            <header>
              <div>
                <span>Minha solicitação</span>
                <h2>{solicitacaoSelecionada.cargo_solicitado}</h2>
              </div>

              <button type="button" onClick={fecharDetalheSolicitacao}>
                <X size={18} />
              </button>
            </header>

            <div className="admin-cargos-request-detail">
              <section className="admin-cargos-request-status">
                <span
                  className={`admin-cargos-status ${solicitacaoSelecionada.status_auditoria}`}
                >
                  {formatarStatus(solicitacaoSelecionada.status_auditoria)}
                </span>

                <p>Criada em {formatarData(solicitacaoSelecionada.criado_em)}</p>
              </section>

              {solicitacaoSelecionada.observacao_auditoria ? (
                <section className="admin-cargos-return-box">
                  <strong>Retorno da Equipe Chegou!</strong>
                  <p>{solicitacaoSelecionada.observacao_auditoria}</p>
                </section>
              ) : null}

              <section>
                <h3>Dados enviados</h3>
                <dl>
                  <div>
                    <dt>Categoria</dt>
                    <dd>{solicitacaoSelecionada.categoria_nome || "—"}</dd>
                  </div>
                  <div>
                    <dt>Função</dt>
                    <dd>{solicitacaoSelecionada.funcao_nome || "—"}</dd>
                  </div>
                  <div>
                    <dt>Código sugerido</dt>
                    <dd>{solicitacaoSelecionada.codigo_sugerido || "—"}</dd>
                  </div>
                  <div>
                    <dt>Justificativa</dt>
                    <dd>
                      {solicitacaoSelecionada.observacao_solicitante || "—"}
                    </dd>
                  </div>
                </dl>
              </section>

              <section>
                <h3>Timeline</h3>
                <div className="admin-cargos-timeline">
                  {montarTimelineSolicitacao(solicitacaoSelecionada).map(
                    (item, index) => (
                      <div key={`${item.titulo}-${index}`}>
                        <span />
                        <div>
                          <strong>{item.titulo}</strong>
                          <small>{formatarData(item.data)}</small>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </section>
            </div>

            <footer>
              <button type="button" onClick={fecharDetalheSolicitacao}>
                Fechar
              </button>

              {podeEditarSolicitacao(solicitacaoSelecionada) ? (
                <button
                  type="button"
                  className="admin-cargos-primary"
                  onClick={() => abrirEdicaoSolicitacao(solicitacaoSelecionada)}
                >
                  <Edit3 size={16} />
                  Editar e reenviar
                </button>
              ) : null}
            </footer>
          </aside>
        </div>
      ) : null}

      {modalManualAberto ? (
        <div className="admin-cargos-modal-backdrop">
          <aside
            className="admin-cargos-manual-modal"
            role="dialog"
            aria-modal="true"
          >
            <header>
              <div>
                <span>Manual de uso</span>
                <h2>Cargos e Funções</h2>
              </div>

              <button type="button" onClick={() => setModalManualAberto(false)}>
                <X size={18} />
              </button>
            </header>

            <div className="admin-cargos-manual-search">
              <Search size={17} />
              <input
                type="search"
                value={buscaManual}
                placeholder="Pesquise no manual ou descreva sua dúvida"
                onChange={(event) => setBuscaManual(event.target.value)}
              />
            </div>

            <div className="admin-cargos-manual-body">
              <section>
                <BookOpen size={20} />
                <h3>Como consultar cargos</h3>
                <p>
                  Use a aba Catálogo Global para consultar cargos e funções
                  oficiais disponíveis para o condomínio.
                </p>
              </section>

              <section>
                <Send size={20} />
                <h3>Como solicitar um novo cargo</h3>
                <p>
                  Clique em Solicitar novo cargo, informe o nome e descreva a
                  necessidade. A Equipe Chegou! fará a análise.
                </p>
              </section>

              <section>
                <Edit3 size={20} />
                <h3>Quando houver ajuste solicitado</h3>
                <p>
                  Abra a aba Minhas Solicitações, clique na solicitação
                  devolvida, veja o retorno, edite as informações e reenvie para
                  análise.
                </p>
              </section>

              <aside className="admin-cargos-manual-also">
                <strong>Conheça também</strong>
                <button type="button">Solicitações e auditoria</button>
                <button type="button">Notificações do condomínio</button>
                <button type="button">Cadastro de funcionários</button>
              </aside>
            </div>

            <footer>
              <button type="button" onClick={() => setModalManualAberto(false)}>
                Fechar
              </button>
            </footer>
          </aside>
        </div>
      ) : null}

      {modalSolicitacaoAberto ? (
        <div className="admin-cargos-modal-backdrop">
          <form
            className="admin-cargos-modal"
            onSubmit={enviarSolicitacao}
            role="dialog"
            aria-modal="true"
          >
            <header>
              <div>
                <span>
                  {solicitacaoEmEdicao
                    ? "Ajustar solicitação"
                    : "Nova solicitação"}
                </span>
                <h2>
                  {solicitacaoEmEdicao
                    ? "Editar e reenviar"
                    : "Solicitar novo cargo"}
                </h2>
              </div>

              <button type="button" onClick={fecharSolicitacao}>
                <X size={18} />
              </button>
            </header>

            <div className="admin-cargos-modal-intro">
              <div>
                <BriefcaseBusiness size={20} />
              </div>
              <p>
                {solicitacaoEmEdicao
                  ? "Revise as informações solicitadas pela Equipe Chegou! e reenvie para nova análise."
                  : "Envie uma sugestão para análise da Equipe Chegou!. Após a auditoria, o condomínio receberá o retorno pelas notificações."}
              </p>
            </div>

            <div className="admin-cargos-modal-body">
              <label>
                <span>Categoria</span>
                <select
                  value={formulario.categoriaId}
                  onChange={(event) =>
                    setFormulario((atual) => ({
                      ...atual,
                      categoriaId: event.target.value,
                    }))
                  }
                >
                  <option value="">Selecione, se souber</option>
                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Função</span>
                <select
                  value={formulario.funcaoId}
                  onChange={(event) =>
                    setFormulario((atual) => ({
                      ...atual,
                      funcaoId: event.target.value,
                    }))
                  }
                >
                  <option value="">Selecione, se souber</option>
                  {funcoes.map((funcao) => (
                    <option key={funcao.id} value={funcao.id}>
                      {funcao.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Nome do cargo</span>
                <input
                  type="text"
                  value={formulario.cargoSolicitado}
                  placeholder="Ex.: Auxiliar de portaria"
                  enterKeyHint="send"
                  onChange={(event) =>
                    setFormulario((atual) => ({
                      ...atual,
                      cargoSolicitado: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>Código sugerido</span>
                <input
                  type="text"
                  value={formulario.codigoSugerido}
                  placeholder="Opcional"
                  onChange={(event) =>
                    setFormulario((atual) => ({
                      ...atual,
                      codigoSugerido: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="full">
                <span>Justificativa</span>
                <textarea
                  value={formulario.observacao}
                  placeholder="Explique em até 100 caracteres por que este cargo é necessário."
                  rows={4}
                  minLength={10}
                  maxLength={100}
                  onChange={(event) =>
                    setFormulario((atual) => ({
                      ...atual,
                      observacao: event.target.value,
                    }))
                  }
                />
                <small
                  className={
                    justificativaTamanho > 0 && !justificativaValida
                      ? "invalid"
                      : ""
                  }
                >
                  {justificativaTamanho}/100 caracteres — mínimo de 10.
                </small>
              </label>
            </div>

            <footer>
              <button type="button" onClick={fecharSolicitacao}>
                Cancelar
              </button>

              <button
                type="submit"
                className={
                  enviandoSolicitacao || solicitacaoEnviada ? "sending" : ""
                }
                disabled={enviandoSolicitacao}
              >
                {enviandoSolicitacao ? (
                  <Loader2 size={16} className="admin-cargos-spin" />
                ) : solicitacaoEnviada ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <CheckCircle2 size={16} />
                )}

                {enviandoSolicitacao
                  ? "Enviando..."
                  : solicitacaoEnviada
                  ? "Enviado"
                  : solicitacaoEmEdicao
                  ? "Reenviar solicitação"
                  : "Enviar solicitação"}
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </section>
  );
}