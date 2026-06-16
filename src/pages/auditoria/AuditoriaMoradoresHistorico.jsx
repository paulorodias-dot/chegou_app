import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileText,
  Filter,
  Info,
  MoreVertical,
  RefreshCw,
  Search,
  X,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import "./AuditoriaMoradoresHistorico.css";
import {
  buscarTorresHistoricoMoradores,
  formatarStatusHistorico,
  listarHistoricoMoradores,
  listarStatusHistorico,
  montarTimelineHistorico,
  obterClasseStatusHistorico,
  obterResumoHistoricoMoradores,
} from "../../services/auditoriaMoradoresHistoricoService";

function formatarDataHora(valor) {
  if (!valor) return "—";

  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(valor));
  } catch {
    return "—";
  }
}

function formatarDataInput(data) {
  if (!data) return "";

  try {
    return new Date(data).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function obterDataInicioPadrao() {
  const data = new Date();
  data.setDate(data.getDate() - 30);
  return formatarDataInput(data);
}

function obterDataFimPadrao() {
  return formatarDataInput(new Date());
}

function obterIniciais(nome = "") {
  const partes = String(nome).trim().split(" ").filter(Boolean);

  if (!partes.length) return "CH";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();

  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

function KpiCard({ icon: Icon, titulo, valor, detalhe, variante = "azul" }) {
  return (
    <div className="amh-kpi-card">
      <div className={`amh-kpi-icon amh-kpi-icon-${variante}`}>
        <Icon size={22} strokeWidth={2.1} />
      </div>

      <div className="amh-kpi-content">
        <span>{titulo}</span>
        <strong>{valor}</strong>

        <div className="amh-kpi-footer">
          <small>{detalhe}</small>
        </div>
      </div>
    </div>
  );
}

function AcaoLinhaMenu({ item, aberto, onToggle, onAcao }) {
  const [posicao, setPosicao] = useState({ top: 0, left: 0 });

  function abrirMenu(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const larguraMenu = 196;
    const alturaMenu = 48;

    let left = rect.right - larguraMenu - 25;
    let top = rect.top - alturaMenu + 28;

    if (left < 12) left = 12;
    if (left + larguraMenu > window.innerWidth - 12) {
      left = window.innerWidth - larguraMenu - 12;
    }

    if (top < 12) top = rect.bottom + 8;

    setPosicao({ top, left });
    onToggle(aberto ? null : item.id);
  }

  function executar() {
    onToggle(null);
    onAcao("Visualizar Histórico", item);
  }

  return (
    <div className="amh-row-actions">
      <button
        type="button"
        className="amh-icon-action"
        onClick={abrirMenu}
        aria-label="Abrir ações"
      >
        <MoreVertical size={18} />
      </button>

      {aberto ? (
        <>
          <button
            type="button"
            className="amh-menu-overlay"
            onClick={() => onToggle(null)}
            aria-label="Fechar menu"
          />

          <div
            className="amh-row-menu amh-row-menu-fixed"
            style={{
              top: `${posicao.top}px`,
              left: `${posicao.left}px`,
            }}
          >
            <button type="button" onClick={executar}>
              Visualizar Histórico
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function CampoResumo({ label, value }) {
  return (
    <div className="amh-read-field">
      <span>{label}</span>
      <strong>{value || "Não informado"}</strong>
    </div>
  );
}

function DrawerHistorico({ item, onClose }) {
  if (!item) return null;

  const timeline = montarTimelineHistorico(item);

  return (
    <>
      <button
        type="button"
        className="amh-drawer-backdrop"
        onClick={onClose}
        aria-label="Fechar histórico"
      />

      <aside className="amh-history-drawer">
        <header className="amh-drawer-head">
          <div>
            <span>Histórico do Morador</span>
            <h2>{item.nome}</h2>
            <p>Consulta resumida do fluxo do cadastro.</p>
          </div>

          <button type="button" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>

        <section className="amh-history-profile">
          <div className="amh-avatar-large">{obterIniciais(item.nome)}</div>

          <div className="amh-profile-main">
            <h3>{item.nome}</h3>
            <p>
              Unidade {item.unidade} • Torre {item.torre}
            </p>

            <div className="amh-profile-grid">
              <CampoResumo
                label="Status atual"
                value={formatarStatusHistorico(item.status)}
              />
              <CampoResumo label="Responsável" value={item.responsavel} />
              <CampoResumo label="Origem" value={item.origem} />
              <CampoResumo
                label="Última atualização"
                value={formatarDataHora(item.data_evento)}
              />
            </div>
          </div>
        </section>

        <section className="amh-drawer-section">
          <h3>Timeline resumida</h3>

          <div className="amh-timeline">
            {timeline.map((evento) => (
              <div
                key={evento.chave}
                className={evento.ativo ? "amh-timeline-item active" : "amh-timeline-item"}
              >
                <span />
                <div>
                  <strong>{evento.titulo}</strong>
                  <p>{evento.status}</p>
                  <small>{formatarDataHora(evento.data)}</small>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="amh-drawer-section">
          <h3>Observação / Resultado</h3>
          <p>{item.observacao || "Nenhuma observação registrada neste histórico."}</p>
        </section>

        <section className="amh-drawer-warning">
          <Info size={17} />
          <div>
            <strong>Histórico é somente consulta.</strong>
            <span>Para rastreabilidade técnica completa, utilize o menu Logs do Sistema.</span>
          </div>
        </section>
      </aside>
    </>
  );
}
export default function AuditoriaMoradoresHistorico({ perfil, onNavigate }) {
  const condominioId =
    perfil?.condominio_id ||
    perfil?.condominio_atual_id ||
    perfil?.usuario_condominio?.condominio_id ||
    null;

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [registros, setRegistros] = useState([]);
  const [resumo, setResumo] = useState({
    total: 0,
    aprovados: 0,
    correcoes: 0,
    canceladosReprovados: 0,
  });

  const [torres, setTorres] = useState([]);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("TODOS");
  const [torre, setTorre] = useState("TODAS");
  const [unidade, setUnidade] = useState("TODAS");
  const [dataInicio, setDataInicio] = useState(obterDataInicioPadrao());
  const [dataFim, setDataFim] = useState(obterDataFimPadrao());
  const dataHoje = obterDataFimPadrao();

  const [menuAberto, setMenuAberto] = useState(null);
  const [historicoSelecionado, setHistoricoSelecionado] = useState(null);

  const [pagina, setPagina] = useState(1);
  const [linhasPorPagina, setLinhasPorPagina] = useState(10);

  const statusOptions = useMemo(() => listarStatusHistorico(), []);

  async function carregarDados() {
    if (!condominioId) {
      setErro("Condomínio autenticado não encontrado.");
      setCarregando(false);
      return;
    }

    try {
      setCarregando(true);
      setErro("");

      const [lista, resumoAtual, torresAtual] = await Promise.all([
        listarHistoricoMoradores({
          condominioId,
          busca,
          status,
          torre,
          unidade,
          dataInicio,
          dataFim,
          limite: 500,
        }),
        obterResumoHistoricoMoradores({
          condominioId,
          dataInicio,
          dataFim,
        }),
        buscarTorresHistoricoMoradores({ condominioId }),
      ]);

      setRegistros(lista);
      setResumo(resumoAtual);
      setTorres(torresAtual);
      setPagina(1);
    } catch (error) {
      console.error(error);
      setErro(error?.message || "Erro ao carregar histórico de moradores.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [condominioId, status, torre, unidade, dataInicio, dataFim]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      carregarDados();
    }, 450);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  useEffect(() => {
    function handleEsc(event) {
      if (event.key === "Escape") {
        setMenuAberto(null);
        setHistoricoSelecionado(null);
      }
    }

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const unidades = useMemo(() => {
    const lista = registros
      .map((item) => item.unidade)
      .filter(Boolean)
      .filter((valorUnidade) => valorUnidade !== "Não informado");

    return [...new Set(lista)].sort((a, b) => String(a).localeCompare(String(b)));
  }, [registros]);

  const totalPaginas = Math.max(1, Math.ceil(registros.length / linhasPorPagina));

  const registrosPagina = useMemo(() => {
    const inicio = (pagina - 1) * linhasPorPagina;
    return registros.slice(inicio, inicio + linhasPorPagina);
  }, [pagina, registros, linhasPorPagina]);

  function limparFiltros() {
    setBusca("");
    setStatus("TODOS");
    setTorre("TODAS");
    setUnidade("TODAS");
    setDataInicio(obterDataInicioPadrao());
    setDataFim(obterDataFimPadrao());
  }

  function abrirHistorico(item) {
    setHistoricoSelecionado(item);
  }

  function handleAcaoLinha(acao, item) {
    if (acao === "Visualizar Histórico") {
      abrirHistorico(item);
    }
  }

  function handleDuploCliqueLinha(item) {
    if (window.innerWidth <= 900) return;
    abrirHistorico(item);
  }

  function handleAcaoTopo(acao) {
    toast(`${acao} será conectado na próxima etapa.`, {
      icon: "⚙️",
    });
  }

  return (
    <div className="amh-page">
      <div className="amh-main">
        <div className="amh-breadcrumb">
          <span>Auditoria</span>
          <ChevronRight size={14} />
          <span>Moradores</span>
          <ChevronRight size={14} />
          <strong>Histórico</strong>
        </div>

        <div className="amh-header">
          <div>
            <h1>
              Histórico de Moradores
              <Info size={17} />
            </h1>
            <p>Consulte o histórico resumido do fluxo de cadastro dos moradores.</p>
          </div>
        </div>

        <div className="amh-tabs">
          <button
            type="button"
            onClick={() => onNavigate?.("admin-auditoria-moradores-pre-cadastro")}
          >
            Pré-Cadastro
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.("admin-auditoria-moradores-convite")}
          >
            Convite
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.("admin-auditoria-moradores-auditoria")}
          >
            Auditoria
          </button>

          <button type="button" className="active">
            Histórico
          </button>
        </div>

        <section className="amh-kpis">
          <KpiCard
            icon={FileText}
            titulo="Total de Registros"
            valor={resumo.total}
            detalhe="No período selecionado"
            variante="azul"
          />

          <KpiCard
            icon={CheckCircle2}
            titulo="Aprovados"
            valor={resumo.aprovados}
            detalhe="Cadastros aprovados"
            variante="verde"
          />

          <KpiCard
            icon={AlertTriangle}
            titulo="Correções Solicitadas"
            valor={resumo.correcoes}
            detalhe="Retornaram ao morador"
            variante="laranja"
          />

          <KpiCard
            icon={XCircle}
            titulo="Cancelados / Reprovados"
            valor={resumo.canceladosReprovados}
            detalhe="Encerrados negativamente"
            variante="vermelho"
          />
        </section>

        <section className="amh-table-card">
          <div className="amh-filters amh-filters-history">
            <div className="amh-search">
              <Search size={18} />
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Pesquisar por nome, unidade, torre, status ou responsável..."
              />
            </div>

            <label>
              <span>Status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                {statusOptions.map((opcao) => (
                  <option key={opcao.value} value={opcao.value}>
                    {opcao.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Torre</span>
              <select value={torre} onChange={(event) => setTorre(event.target.value)}>
                <option value="TODAS">Todas</option>
                {torres.map((item) => (
                  <option key={item.id} value={item.nome}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Unidade</span>
              <select value={unidade} onChange={(event) => setUnidade(event.target.value)}>
                <option value="TODAS">Todas</option>
                {unidades.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>De</span>
              <input
                type="date"
                value={dataInicio}
                max={dataHoje}
                onChange={(event) => {
                    const novaDataInicio = event.target.value;

                    setDataInicio(novaDataInicio);

                    if (dataFim && novaDataInicio && dataFim < novaDataInicio) {
                    setDataFim(novaDataInicio);
                    }
                }}
                />
            </label>

            <label>
              <span>Até</span>
              <input
                type="date"
                value={dataFim}
                min={dataInicio || undefined}
                max={dataHoje}
                onChange={(event) => setDataFim(event.target.value)}
                />
            </label>

            <button type="button" className="amh-filter-extra" onClick={limparFiltros}>
              <Filter size={16} />
              Limpar filtros
            </button>
          </div>

          {erro ? <div className="amh-error">{erro}</div> : null}

          <div className="amh-table-wrap">
            <table className="amh-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Morador</th>
                  <th>Unidade</th>
                  <th>Torre</th>
                  <th>Status</th>
                  <th>Responsável</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {carregando ? (
                  <tr>
                    <td colSpan="7">
                      <div className="amh-loading">
                        <RefreshCw size={18} className="amh-spin" />
                        Carregando histórico...
                      </div>
                    </td>
                  </tr>
                ) : registrosPagina.length ? (
                  registrosPagina.map((item) => (
                    <tr
                      key={item.id}
                      onDoubleClick={() => handleDuploCliqueLinha(item)}
                    >
                      <td>
                        <strong>{formatarDataHora(item.data_evento)}</strong>
                      </td>

                      <td>
                        <div className="amh-person">
                          <div className="amh-avatar">{obterIniciais(item.nome)}</div>
                          <div>
                            <strong>{item.nome}</strong>
                            <span>ID: {item.business_id || "—"}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <strong>Apto {item.unidade}</strong>
                      </td>

                      <td>
                        <strong>{item.torre}</strong>
                      </td>

                      <td>
                        <span className={`amh-status amh-status-${obterClasseStatusHistorico(item.status)}`}>
                          {formatarStatusHistorico(item.status)}
                        </span>
                      </td>

                      <td>
                        <strong>{item.responsavel}</strong>
                      </td>

                      <td>
                        <AcaoLinhaMenu
                          item={item}
                          aberto={menuAberto === item.id}
                          onToggle={setMenuAberto}
                          onAcao={handleAcaoLinha}
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7">
                      <div className="amh-empty">
                        <strong>Nenhum histórico encontrado</strong>
                        <p>
                          Ajuste os filtros de status ou período para ampliar a consulta.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
                    <div className="amh-table-footer">
            <span>
              Mostrando {registrosPagina.length ? (pagina - 1) * linhasPorPagina + 1 : 0} a{" "}
              {Math.min(pagina * linhasPorPagina, registros.length)} de {registros.length} registros
            </span>

            <div className="amh-pagination">
              <button
                type="button"
                disabled={pagina === 1}
                onClick={() => setPagina((atual) => Math.max(1, atual - 1))}
              >
                <ChevronLeft size={16} />
              </button>

              <strong>{pagina}</strong>

              <button
                type="button"
                disabled={pagina === totalPaginas}
                onClick={() => setPagina((atual) => Math.min(totalPaginas, atual + 1))}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <label className="amh-per-page">
              Linhas por página:
              <select
                value={linhasPorPagina}
                onChange={(event) => {
                  setLinhasPorPagina(Number(event.target.value));
                  setPagina(1);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
              </select>
            </label>
          </div>
        </section>
      </div>

      <aside className="amh-rightbar">
        <section className="amh-side-card">
          <div className="amh-side-title">
            <FileText size={17} />
            <strong>Resumo do Histórico</strong>
          </div>

          <div className="amh-side-metrics">
            <div>
              <span>Total no período</span>
              <strong>{resumo.total}</strong>
            </div>

            <div>
              <span>Aprovados</span>
              <strong>{resumo.aprovados}</strong>
            </div>

            <div>
              <span>Correções</span>
              <strong>{resumo.correcoes}</strong>
            </div>

            <div>
              <span>Cancelados/Reprovados</span>
              <strong>{resumo.canceladosReprovados}</strong>
            </div>
          </div>
        </section>

        <section className="amh-side-card amh-side-card-orange">
          <div className="amh-side-title">
            <Info size={17} />
            <strong>
              Painel de Comunicados Chegou<span className="amh-orange">!</span>
            </strong>
          </div>

          <div className="amh-communication-placeholder">
            <div>
              <strong>Comunicados do Módulo</strong>
              <span>Espaço reservado para avisos do Master ou Administrativo.</span>
            </div>
          </div>

          <p>
            Este espaço será padronizado futuramente no componente global de comunicados.
          </p>
        </section>

        <section className="amh-side-card">
          <h3>Orientações</h3>

          <ul className="amh-orientation-list">
            <li>Use o Histórico para consulta rápida.</li>
            <li>Use Logs do Sistema para rastreabilidade técnica completa.</li>
            <li>Histórico não permite alteração de dados.</li>
            <li>Todos os status, inclusive cancelados e reprovados, aparecem aqui.</li>
            <li>Status técnicos são exibidos em formato amigável.</li>
          </ul>
        </section>
      </aside>

      <DrawerHistorico
        item={historicoSelecionado}
        onClose={() => setHistoricoSelecionado(null)}
      />
    </div>
  );
}