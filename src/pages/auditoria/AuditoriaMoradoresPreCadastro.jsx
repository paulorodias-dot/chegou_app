import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  Filter,
  Info,
  MoreVertical,
  Search,
  UserRound,
} from "lucide-react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";

import ModalEditarMorador from "../../components/cadastroMorador/ModalEditarMorador";
import {
  atualizarPreCadastroMorador,
  cancelarPreCadastroMorador,
} from "../../services/cadastroMoradorService";

import "./AuditoriaMoradoresPreCadastro.css";
import {
  buscarTorresPreCadastro,
  listarPreCadastrosMoradores,
  obterPreCadastroMoradorDetalhe,
  obterResumoPreCadastro,
} from "../../services/auditoriaMoradoresPreCadastroService";

const STATUS_FILTROS = [
  { value: "TODOS", label: "Todos" },
  { value: "RASCUNHO", label: "Rascunho" },
  { value: "PRE_CADASTRO", label: "Pré-Cadastro" },
  { value: "IMPORTADO", label: "Importado" },
  { value: "NAO_ENVIADO", label: "Não Enviado" },
  { value: "REVOGADO", label: "Revogado" },
];

const ORIGEM_FILTROS = [
  { value: "TODAS", label: "Todas" },
  { value: "MANUAL", label: "Manual" },
  { value: "XLSX", label: "XLSX" },
  { value: "PDF", label: "PDF" },
];

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

function formatarUltimaAtualizacao(valor) {
  if (!valor) return "—";

  const agora = new Date();
  const data = new Date(valor);
  const diffMs = agora.getTime() - data.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHoras = Math.floor(diffMin / 60);

  if (diffMin < 1) return "Agora";
  if (diffMin < 60) return `Há ${diffMin} min`;
  if (diffHoras < 24) return `Há ${diffHoras} h`;

  return formatarDataHora(valor);
}

function normalizarStatus(valor = "") {
  return String(valor || "").trim().toUpperCase();
}

function formatarStatus(status) {
  const mapa = {
    RASCUNHO: "Rascunho",
    PRE_CADASTRO: "Pré-Cadastro",
    IMPORTADO: "Importado",
    NAO_ENVIADO: "Não Enviado",
    "NÃO_ENVIADO": "Não Enviado",
    PRONTO_CONVITE: "Pronto para Convite",
    REVOGADO: "Revogado",
    CANCELADO: "Cancelado",
    EXPIRADO: "Expirado",
    TOKEN_EXPIRADO: "Token Expirado",
  };

  return mapa[normalizarStatus(status)] || String(status || "—").replaceAll("_", " ");
}

function classeStatus(status) {
  const valor = normalizarStatus(status);

  if (valor === "RASCUNHO") return "rascunho";
  if (["PRE_CADASTRO", "PRONTO_CONVITE"].includes(valor)) return "pre-cadastro";
  if (valor === "IMPORTADO") return "importado";

  if (["REVOGADO", "CANCELADO", "EXPIRADO", "TOKEN_EXPIRADO"].includes(valor)) {
    return "alerta";
  }

  return "neutro";
}

function formatarOrigem(origem = "") {
  const valor = normalizarStatus(origem);

  const mapa = {
    MANUAL: "Manual",
    XLSX: "Importação XLSX",
    PDF: "Importação PDF",
    ADMINISTRATIVO: "Administrativo",
  };

  return mapa[valor] || origem || "—";
}

function classeOrigem(origem = "") {
  const valor = normalizarStatus(origem);

  if (valor === "XLSX") return "xlsx";
  if (valor === "PDF") return "pdf";
  if (valor === "MANUAL") return "manual";

  return "neutro";
}

function obterIniciais(nome = "") {
  const partes = String(nome).trim().split(" ").filter(Boolean);

  if (!partes.length) return "CH";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();

  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

function textoCompletude(item) {
  if (item.percentual === 100) return "Pronto para convite";

  const total = item.pendencias?.length || 0;

  if (!total) return "Pendências não identificadas";
  if (total === 1) return "1 pendência";

  return `${total} pendências`;
}

function gerarNomeArquivoPreCadastro() {
  const agora = new Date();

  const data = agora.toISOString().slice(0, 10);
  const hora = String(agora.getHours()).padStart(2, "0");
  const minuto = String(agora.getMinutes()).padStart(2, "0");

  return `pre_cadastro_moradores_${data}_${hora}${minuto}.xlsx`;
}

function KpiCard({ icon: Icon, titulo, valor, detalhe, variante = "azul" }) {
  return (
    <div className="amp-kpi-card">
      <div className={`amp-kpi-icon amp-kpi-icon-${variante}`}>
        <Icon size={22} strokeWidth={2.1} />
      </div>

      <div className="amp-kpi-content">
        <span>{titulo}</span>
        <strong>{valor}</strong>
        <small>{detalhe}</small>
      </div>
    </div>
  );
}

function AcaoLinhaMenu({ item, aberto, onToggle, onAcao }) {
  const [posicao, setPosicao] = useState({ top: 0, left: 0 });

  const opcoes = [
    "Visualizar Cadastro",
    "Editar Dados",
    "Cancelar Pré-Cadastro",
  ];

  function abrirMenu(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const larguraMenu = 210;
    const alturaMenu = Math.min(240, opcoes.length * 36 + 14);

    let left = rect.right - larguraMenu - 18;
    let top = rect.top - alturaMenu + 30;

    if (left < 12) left = 12;
    if (left + larguraMenu > window.innerWidth - 12) {
      left = window.innerWidth - larguraMenu - 12;
    }

    if (top < 12) top = rect.bottom + 8;

    if (top + alturaMenu > window.innerHeight - 12) {
      top = window.innerHeight - alturaMenu - 12;
    }

    setPosicao({ top, left });
    onToggle(aberto ? null : item.id);
  }

  function executarOpcao(opcao) {
    onToggle(null);
    onAcao(opcao, item);
  }

  return (
    <div className="amp-row-actions">
      <button
        type="button"
        className="amp-icon-action"
        onClick={abrirMenu}
        aria-label="Abrir ações"
      >
        <MoreVertical size={18} />
      </button>

      {aberto ? (
        <>
          <button
            type="button"
            className="amp-menu-overlay"
            onClick={() => onToggle(null)}
            aria-label="Fechar menu"
          />

          <div
            className="amp-row-menu amp-row-menu-fixed"
            style={{
              top: `${posicao.top}px`,
              left: `${posicao.left}px`,
            }}
          >
            {opcoes.map((opcao) => (
              <button key={opcao} type="button" onClick={() => executarOpcao(opcao)}>
                {opcao}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function DrawerCadastro({ item, onClose }) {
  if (!item) return null;

  return (
    <>
      <button
        type="button"
        className="amp-drawer-backdrop"
        onClick={onClose}
        aria-label="Fechar cadastro"
      />

      <aside className="amp-drawer">
        <div className="amp-drawer-header">
          <div>
            <span>Pré-Cadastro</span>
            <h2>{item.nome}</h2>
          </div>

          <button type="button" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        <div className="amp-drawer-grid">
          <div>
            <small>ID Business</small>
            <strong>{item.business_id || "—"}</strong>
          </div>

          <div>
            <small>Status</small>
            <strong>{formatarStatus(item.status)}</strong>
          </div>

          <div>
            <small>Nome</small>
            <strong>{item.nome}</strong>
          </div>

          <div>
            <small>E-mail</small>
            <strong>{item.email}</strong>
          </div>

          <div>
            <small>WhatsApp</small>
            <strong>{item.telefone || "—"}</strong>
          </div>

          <div>
            <small>Torre</small>
            <strong>{item.torre}</strong>
          </div>

          <div>
            <small>Unidade</small>
            <strong>Apto {item.unidade}</strong>
          </div>

          <div>
            <small>Origem</small>
            <strong>{formatarOrigem(item.origem)}</strong>
          </div>
        </div>

        <div className="amp-drawer-section">
          <h3>Completude</h3>
          <p>
            Este pré-cadastro está com <strong>{item.percentual}%</strong> de
            completude. {textoCompletude(item)}.
          </p>

          {item.pendencias?.length ? (
            <ul>
              {item.pendencias.map((pendencia) => (
                <li key={pendencia}>{pendencia}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="amp-drawer-section">
          <h3>Regra operacional</h3>
          <p>
            Enquanto estiver nesta etapa, o Administrativo ainda pode ajustar o
            cadastro. Após a criação do convite, os dados passam a ser alterados
            somente pelo morador no Wizard.
          </p>
        </div>
      </aside>
    </>
  );
}

export default function AuditoriaMoradoresPreCadastro({ perfil, onNavigate }) {
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
    prontos: 0,
    pendencias: 0,
    importadosHoje: 0,
  });

  const [torres, setTorres] = useState([]);

  // Busca digitada e busca aplicada são separadas para evitar double-fetch.
  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");

  const [status, setStatus] = useState("TODOS");
  const [origem, setOrigem] = useState("TODAS");
  const [torre, setTorre] = useState("TODAS");
  const [dataInicio, setDataInicio] = useState(obterDataInicioPadrao());
  const [dataFim, setDataFim] = useState(obterDataFimPadrao());
  const dataHoje = obterDataFimPadrao();

  const [menuAberto, setMenuAberto] = useState(null);
  const [cadastroSelecionado, setCadastroSelecionado] = useState(null);
  const [moradorEdicao, setMoradorEdicao] = useState(null);
  const [cancelamentoSelecionado, setCancelamentoSelecionado] = useState(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [cancelando, setCancelando] = useState(false);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);

  const [pagina, setPagina] = useState(1);
  const [linhasPorPagina, setLinhasPorPagina] = useState(10);
  const [possuiProxima, setPossuiProxima] = useState(false);
  const [totalReferencia, setTotalReferencia] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setBuscaAplicada(busca.trim());
      setPagina(1);
    }, 450);

    return () => clearTimeout(timeout);
  }, [busca]);

  useEffect(() => {
    if (!condominioId) {
      setTorres([]);
      return;
    }

    let ativo = true;

    async function carregarTorres() {
      try {
        const dados = await buscarTorresPreCadastro({ condominioId });

        if (ativo) setTorres(dados);
      } catch (error) {
        console.error("Erro ao carregar torres do pré-cadastro:", error);
      }
    }

    carregarTorres();

    return () => {
      ativo = false;
    };
  }, [condominioId]);

  useEffect(() => {
    if (!condominioId) {
      setErro("Condomínio autenticado não encontrado.");
      setCarregando(false);
      return;
    }

    let ativo = true;

    async function carregarDados() {
      try {
        setCarregando(true);
        setErro("");

        const [listaAtual, resumoAtual] = await Promise.all([
          listarPreCadastrosMoradores({
            condominioId,
            busca: buscaAplicada,
            status,
            origem,
            torre,
            dataInicio,
            dataFim,
            pagina,
            limite: linhasPorPagina,
          }),
          obterResumoPreCadastro({
            condominioId,
            dataInicio,
            dataFim,
          }),
        ]);

        if (!ativo) return;

        setRegistros(listaAtual.registros || []);
        setResumo(resumoAtual);
        setPossuiProxima(Boolean(listaAtual.possuiProxima));
        setTotalReferencia(Number(listaAtual.total || 0));
      } catch (error) {
        if (!ativo) return;

        console.error(error);
        setErro(error?.message || "Erro ao carregar pré-cadastros.");
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregarDados();

    return () => {
      ativo = false;
    };
  }, [
    condominioId,
    buscaAplicada,
    status,
    origem,
    torre,
    dataInicio,
    dataFim,
    pagina,
    linhasPorPagina,
    reloadToken,
  ]);

  useEffect(() => {
    function handleEsc(event) {
      if (event.key !== "Escape") return;

      setMenuAberto(null);
      setCadastroSelecionado(null);

      if (!carregandoDetalhe && !cancelando) {
        setMoradorEdicao(null);
        setCancelamentoSelecionado(null);
      }
    }

    window.addEventListener("keydown", handleEsc);

    return () => window.removeEventListener("keydown", handleEsc);
  }, [carregandoDetalhe, cancelando]);

  const numeroInicial = registros.length
    ? (pagina - 1) * linhasPorPagina + 1
    : 0;

  const numeroFinal = registros.length
    ? numeroInicial + registros.length - 1
    : 0;

  const totalExibicao = useMemo(() => {
    // totalReferencia é o conjunto-base informado pelo PostgREST.
    // O total autoritativo virá futuramente do contrato backend consolidado.
    return Math.max(totalReferencia, numeroFinal);
  }, [totalReferencia, numeroFinal]);

  function limparFiltros() {
    setBusca("");
    setBuscaAplicada("");
    setStatus("TODOS");
    setOrigem("TODAS");
    setTorre("TODAS");
    setDataInicio(obterDataInicioPadrao());
    setDataFim(obterDataFimPadrao());
    setPagina(1);
  }

  async function carregarDetalhe(item) {
    setCarregandoDetalhe(true);

    try {
      return await obterPreCadastroMoradorDetalhe({
        condominioId,
        preCadastroId: item.pre_cadastro_id || item.id,
      });
    } finally {
      setCarregandoDetalhe(false);
    }
  }

  async function handleAcaoLinha(acao, item) {
    try {
      if (acao === "Visualizar Cadastro") {
        // A visualização simples usa os dados leves já carregados.
        setCadastroSelecionado(item);
        return;
      }

      if (acao === "Editar Dados") {
        const detalhe = await carregarDetalhe(item);

        setMoradorEdicao({
          ...item,
          ...detalhe,
          raw: detalhe,
        });

        return;
      }

      if (acao === "Cancelar Pré-Cadastro") {
        const detalhe = await carregarDetalhe(item);

        setCancelamentoSelecionado({
          ...item,
          ...detalhe,
          raw: detalhe,
        });

        setMotivoCancelamento("");
      }
    } catch (error) {
      toast.error(
        error?.message || "Não foi possível carregar os dados do pré-cadastro."
      );
    }
  }

  function handleDuploCliqueLinha(item) {
    if (window.innerWidth <= 900) return;
    setCadastroSelecionado(item);
  }

  function exportarListaPreCadastro() {
    if (!registros.length) {
      toast.error("Não há dados na página atual para exportar.");
      return;
    }

    const dados = registros.map((item) => ({
      "ID Business": item.business_id || "—",
      Nome: item.nome || "—",
      Torre: item.torre || "—",
      Unidade: item.unidade || "—",
      "E-mail": item.email || "—",
      WhatsApp: item.telefone || "—",
      Completude: `${item.percentual || 0}%`,
      Pendências: item.pendencias?.length
        ? item.pendencias.join(", ")
        : "Sem pendências",
      Origem: formatarOrigem(item.origem),
      Status: formatarStatus(item.status),
      "Criado em": formatarDataHora(item.criado_em),
      "Última Atualização": formatarDataHora(item.atualizado_em),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dados);

    worksheet["!cols"] = [
      { wch: 26 },
      { wch: 28 },
      { wch: 18 },
      { wch: 12 },
      { wch: 30 },
      { wch: 18 },
      { wch: 14 },
      { wch: 34 },
      { wch: 20 },
      { wch: 18 },
      { wch: 20 },
      { wch: 20 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pre-Cadastro");

    XLSX.writeFile(workbook, gerarNomeArquivoPreCadastro());

    toast.success("Página atual exportada com sucesso.");
  }

  function fecharEdicaoMorador() {
    setMoradorEdicao(null);
  }

  async function salvarEdicaoMorador(payload) {
    await atualizarPreCadastroMorador({
      perfil,
      condominio: null,
      preCadastroId: payload.id,
      dadosAntes: payload.dados_antes,
      dadosDepois: payload.dados_depois,
      metadadosEdicao: payload.metadados_edicao,
    });

    toast.success("Pré-cadastro atualizado com sucesso.");
    setMoradorEdicao(null);

    // Recarrega somente ao voltar para a primeira página ou via pequena mudança controlada.
    // Como etapa transitória, voltamos para página 1 para garantir consistência.
    setPagina(1);
    setReloadToken((atual) => atual + 1);
  }

  async function confirmarCancelamentoPreCadastro() {
    if (!cancelamentoSelecionado) return;

    try {
      setCancelando(true);

      await cancelarPreCadastroMorador({
        perfil,
        condominio: null,
        preCadastro: cancelamentoSelecionado,
        motivo: motivoCancelamento,
      });

      toast.success("Pré-cadastro cancelado com sucesso.");

      const idCancelado =
        cancelamentoSelecionado.pre_cadastro_id ||
        cancelamentoSelecionado.id;

      setRegistros((atuais) =>
        atuais.filter(
          (item) => (item.pre_cadastro_id || item.id) !== idCancelado
        )
      );

      setResumo((atual) => ({
        ...atual,
        total: Math.max(0, Number(atual.total || 0) - 1),
      }));

      setCancelamentoSelecionado(null);
      setMotivoCancelamento("");
    } catch (error) {
      toast.error(error?.message || "Não foi possível cancelar o pré-cadastro.");
    } finally {
      setCancelando(false);
    }
  }

  return (
    <div className="amp-page">
      <div className="amp-main">
        <div className="amp-breadcrumb">
          <span>Auditoria</span>
          <ChevronRight size={14} />
          <span>Moradores</span>
          <ChevronRight size={14} />
          <strong>Pré-Cadastro</strong>
        </div>

        <div className="amp-header">
          <div>
            <h1>
              Pré-Cadastro de Moradores
              <Info size={17} />
            </h1>

            <p>
              Gerencie os moradores que ainda não receberam convite para acesso ao Sistema
              Chegou<span className="amp-orange">!</span>.
            </p>
          </div>

          <div className="amp-header-actions">
            <button
              type="button"
              className="amp-btn amp-btn-outline"
              onClick={exportarListaPreCadastro}
            >
              <Download size={17} />
              Exportar Página
            </button>
          </div>
        </div>

        <div className="amp-tabs">
          <button type="button" className="active">
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

          <button
            type="button"
            onClick={() => onNavigate?.("admin-auditoria-moradores-historico")}
          >
            Histórico
          </button>
        </div>

        <section className="amp-kpis">
          <KpiCard
            icon={UserRound}
            titulo="Total Pré-Cadastros"
            valor={resumo.total}
            detalhe="Cadastros ainda sem convite ativo"
            variante="azul"
          />

          <KpiCard
            icon={CheckCircle2}
            titulo="Prontos para Convite"
            valor={resumo.prontos}
            detalhe="Completude 100%"
            variante="verde"
          />

          <KpiCard
            icon={AlertTriangle}
            titulo="Com Pendências"
            valor={resumo.pendencias}
            detalhe="Completude abaixo de 100%"
            variante="laranja"
          />

          <KpiCard
            icon={FileSpreadsheet}
            titulo="Importados Hoje"
            valor={resumo.importadosHoje}
            detalhe="XLSX ou PDF"
            variante="roxo"
          />
        </section>

        <section className="amp-table-card">
          <div className="amp-filters amp-filters-pre-cadastro">
            <div className="amp-search">
              <Search size={18} />
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar por nome, e-mail, unidade ou ID do morador..."
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                name="amp-pre-cadastro-busca"
              />
            </div>

            <label>
              <span>Status</span>
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPagina(1);
                }}
              >
                {STATUS_FILTROS.map((opcao) => (
                  <option key={opcao.value} value={opcao.value}>
                    {opcao.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Origem</span>
              <select
                value={origem}
                onChange={(event) => {
                  setOrigem(event.target.value);
                  setPagina(1);
                }}
              >
                {ORIGEM_FILTROS.map((opcao) => (
                  <option key={opcao.value} value={opcao.value}>
                    {opcao.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Torre</span>
              <select
                value={torre}
                onChange={(event) => {
                  setTorre(event.target.value);
                  setPagina(1);
                }}
              >
                <option value="TODAS">Todas</option>
                {torres.map((item) => (
                  <option key={item.id} value={item.nome}>
                    {item.nome}
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
                  setPagina(1);

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
                onChange={(event) => {
                  setDataFim(event.target.value);
                  setPagina(1);
                }}
              />
            </label>

            <button
              type="button"
              className="amp-filter-extra amp-filter-clear"
              onClick={limparFiltros}
            >
              <Filter size={16} />
              Limpar
            </button>
          </div>

          <div className="amp-hint">
            <Info size={15} />
            <span>
              A lista carrega somente a página necessária. Dados completos são buscados
              apenas ao editar ou cancelar um pré-cadastro.
            </span>
          </div>

          {erro ? <div className="amp-error">{erro}</div> : null}

          <div className="amp-table-wrap">
            <table className="amp-table">
              <thead>
                <tr>
                  <th>Morador</th>
                  <th>Unidade</th>
                  <th>Contato</th>
                  <th>Completude</th>
                  <th>Origem</th>
                  <th>Última Atualização</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {carregando ? (
                  <tr>
                    <td colSpan="8">
                      <div className="amp-loading">Carregando pré-cadastros...</div>
                    </td>
                  </tr>
                ) : registros.length ? (
                  registros.map((item) => (
                    <tr
                      key={item.id}
                      onDoubleClick={() => handleDuploCliqueLinha(item)}
                    >
                      <td data-label="Morador">
                        <div className="amp-person">
                          <div className="amp-avatar">{obterIniciais(item.nome)}</div>
                          <div>
                            <strong>{item.nome}</strong>
                            <span>ID: {item.business_id || "—"}</span>
                          </div>
                        </div>
                      </td>

                      <td data-label="Unidade">
                        <strong>Apto {item.unidade}</strong>
                        <span>{item.torre}</span>
                      </td>

                      <td data-label="Contato">
                        <strong>{item.email}</strong>
                        <span>{item.telefone || "—"}</span>
                      </td>

                      <td data-label="Completude">
                        <div className="amp-completude">
                          <strong className={item.percentual === 100 ? "ok" : "pendente"}>
                            {item.percentual}%
                          </strong>
                          <span>{textoCompletude(item)}</span>
                        </div>
                      </td>

                      <td data-label="Origem">
                        <span className={`amp-origin amp-origin-${classeOrigem(item.origem)}`}>
                          {formatarOrigem(item.origem)}
                        </span>
                      </td>

                      <td data-label="Última Atualização">
                        <strong>{formatarDataHora(item.atualizado_em)}</strong>
                        <span>{formatarUltimaAtualizacao(item.atualizado_em)}</span>
                      </td>

                      <td data-label="Status">
                        <span className={`amp-status amp-status-${classeStatus(item.status)}`}>
                          {formatarStatus(item.status)}
                        </span>
                      </td>

                      <td data-label="Ações">
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
                    <td colSpan="8">
                      <div className="amp-empty">
                        <strong>Nenhum registro encontrado</strong>
                        <p>
                          Não há pré-cadastros compatíveis com os filtros aplicados no momento.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="amp-table-footer">
            <span>
              Mostrando {numeroInicial} a {numeroFinal} de até {totalExibicao} registros
            </span>

            <div className="amp-pagination">
              <button
                type="button"
                disabled={pagina === 1 || carregando}
                onClick={() => setPagina((atual) => Math.max(1, atual - 1))}
              >
                <ChevronLeft size={16} />
              </button>

              <strong>{pagina}</strong>

              <button
                type="button"
                disabled={!possuiProxima || carregando}
                onClick={() => setPagina((atual) => atual + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <label className="amp-per-page">
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

      <aside className="amp-rightbar">
        <section className="amp-side-card">
          <div className="amp-side-title">
            <ClipboardCheck size={17} />
            <strong>Resumo Operacional</strong>
          </div>

          <div className="amp-side-metrics">
            <div>
              <span>Total em pré-cadastro</span>
              <strong>{resumo.total}</strong>
            </div>

            <div>
              <span>Prontos para convite</span>
              <strong>{resumo.prontos}</strong>
            </div>

            <div>
              <span>Com pendências</span>
              <strong>{resumo.pendencias}</strong>
            </div>
          </div>
        </section>

        <section className="amp-side-card amp-side-card-orange">
          <div className="amp-side-title">
            <Info size={17} />
            <strong>
              Painel de Comunicados Chegou<span className="amp-orange">!</span>
            </strong>
          </div>

          <div className="amp-communication-placeholder">
            <div>
              <strong>Comunicados do Módulo</strong>
              <span>Espaço reservado para avisos do Master ou Administrativo.</span>
            </div>
          </div>

          <p>
            Este espaço será usado para comunicados operacionais, orientações,
            novidades do sistema e avisos importantes.
          </p>
        </section>

        <section className="amp-side-card">
          <h3>Orientações e Boas Práticas</h3>

          <ul className="amp-orientation-list">
            <li>Cadastros 100% completos podem participar de envio em lote futuramente.</li>
            <li>Cadastros incompletos devem ser revisados antes da criação do convite.</li>
            <li>Após criar o convite, a edição administrativa será bloqueada.</li>
            <li>Alterações posteriores serão feitas pelo morador no Wizard.</li>
          </ul>
        </section>
      </aside>

      <DrawerCadastro
        item={cadastroSelecionado}
        onClose={() => setCadastroSelecionado(null)}
      />

      <ModalEditarMorador
        aberto={Boolean(moradorEdicao)}
        morador={moradorEdicao}
        torres={torres}
        preCadastros={registros}
        onClose={fecharEdicaoMorador}
        onSalvar={salvarEdicaoMorador}
      />

      {cancelamentoSelecionado ? (
        <>
          <button
            type="button"
            className="amp-drawer-backdrop"
            onClick={() => {
              if (!cancelando) {
                setCancelamentoSelecionado(null);
                setMotivoCancelamento("");
              }
            }}
            aria-label="Fechar cancelamento"
          />

          <aside className="amp-cancel-modal">
            <div className="amp-cancel-header">
              <div>
                <span>Cancelar Pré-Cadastro</span>
                <h2>{cancelamentoSelecionado.nome}</h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!cancelando) {
                    setCancelamentoSelecionado(null);
                    setMotivoCancelamento("");
                  }
                }}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div className="amp-cancel-section">
              <h3>Confirmação</h3>
              <p>
                Esta ação cancelará o pré-cadastro do morador e bloqueará a edição
                administrativa deste registro. O histórico será mantido.
              </p>
            </div>

            <div className="amp-cancel-section">
              <h3>Motivo do cancelamento</h3>

              <textarea
                value={motivoCancelamento}
                onChange={(event) => setMotivoCancelamento(event.target.value)}
                placeholder="Informe o motivo do cancelamento..."
                rows={5}
              />

              <p className="amp-cancel-help">
                Este motivo será registrado no histórico do pré-cadastro.
              </p>
            </div>

            <div className="amp-cancel-actions">
              <button
                type="button"
                className="amp-btn amp-btn-outline"
                disabled={cancelando}
                onClick={() => {
                  setCancelamentoSelecionado(null);
                  setMotivoCancelamento("");
                }}
              >
                Voltar
              </button>

              <button
                type="button"
                className="amp-btn amp-btn-primary"
                disabled={cancelando}
                onClick={confirmarCancelamentoPreCadastro}
              >
                {cancelando ? "Cancelando..." : "Confirmar Cancelamento"}
              </button>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}