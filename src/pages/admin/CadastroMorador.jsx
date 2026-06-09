import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  Mail,
  Plus,
  RefreshCcw,
  Search,
  Upload,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { supabase } from "../../services/supabase";
import {
  atualizarPreCadastroMorador,
  cancelarPreCadastroMorador,
} from "../../services/cadastroMoradorService";

import ModalNovoMorador from "../../components/cadastroMorador/ModalNovoMorador";
import ModalVisualizarMorador from "../../components/cadastroMorador/ModalVisualizarMorador";
import ModalEditarMorador from "../../components/cadastroMorador/ModalEditarMorador";
import ModalImportacaoMorador from "../../components/modals/ModalImportacaoMorador";
import ModalImportacaoMoradorPDF from "../../components/modals/ModalImportacaoMoradorPDF";

import "./CadastroMorador.css";

const PAGE_SIZE = 10;

const STATUS_OCULTOS_NO_TODOS = [
  "CANCELADO",
  "cancelado",
  "APROVADO",
  "aprovado",
  "ativo",
  "conta_ativa",
];

const STATUS_FILTRO_CADASTRO = [
  { value: "todos", label: "Todos Status" },
  { value: "RASCUNHO", label: "Rascunho" },
  { value: "AGUARDANDO_ENVIO", label: "Aguardando envio" },
  { value: "EM_PREENCHIMENTO", label: "Em preenchimento" },
  { value: "AGUARDANDO_AUDITORIA", label: "Aguardando auditoria" },
  { value: "EM_AUDITORIA", label: "Em auditoria" },
  { value: "CORRECAO_SOLICITADA", label: "Correção solicitada" },
  { value: "TOKEN_EXPIRADO", label: "Token expirado" },
  { value: "REPROVADO", label: "Reprovado" },
  { value: "CANCELADO", label: "Cancelado" },
];

const STATUS_LABELS = {
  RASCUNHO: "Rascunho",
  IMPORTADO: "Importado",
  PRE_CADASTRO: "Pré-cadastro",
  NAO_ENVIADO: "Não enviado",
  NÃO_ENVIADO: "Não enviado",
  AGUARDANDO_ENVIO: "Aguardando envio",
  PRONTO_CONVITE: "Pronto para convite",
  EM_PREENCHIMENTO: "Em preenchimento",
  ENVIADO_AUDITORIA: "Enviado para auditoria",
  APROVADO: "Aprovado",
  CANCELADO: "Cancelado",
  PENDENTE: "Pendente",
  pendente: "Pendente",
  enviado: "Enviado",
  erro_envio: "Erro no envio",
  reenviado: "Reenviado",
  aberto: "Aberto",
  cancelado: "Cancelado",
};

function somenteNumeros(valor = "") {
  return String(valor).replace(/\D/g, "");
}

function normalizarTexto(valor = "") {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizarEmail(valor = "") {
  return String(valor || "").trim().toLowerCase();
}

function formatarTelefoneTabela(telefone = "") {
  const numero = somenteNumeros(telefone);

  if (!numero) return "—";

  if (numero.startsWith("55") && numero.length >= 12) {
    const local = numero.slice(2);
    return `+55 (${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7, 11)}`;
  }

  return telefone;
}

function labelStatus(status) {
  return STATUS_LABELS[status] || status || "—";
}

function normalizarStatus(valor = "") {
  return String(valor || "").trim().toUpperCase();
}

function podeEditarMoradorCadastro(item = {}) {
  const statusCadastro = normalizarStatus(
    item.status_principal ||
      item.raw?.status_cadastro ||
      item.status_cadastro
  );

  const possuiConviteCriado = Boolean(
    item.convite?.id ||
      item.raw?.convite?.id
  );

  const statusCadastroEditavel = [
    "RASCUNHO",
    "PRE_CADASTRO",
    "PRÉ-CADASTRO",
  ].includes(statusCadastro);

  return statusCadastroEditavel && !possuiConviteCriado;
}

function formatarTorreTabela(item = {}, torreEstrutura = null) {
  const nome =
    torreEstrutura?.nome ||
    item.torre ||
    item.dados_importados?.torre_nome ||
    "";

  const identificador =
    torreEstrutura?.identificador ||
    item.bloco ||
    item.dados_importados?.torre_identificador ||
    "";

  const partes = [nome, identificador].filter(Boolean);

  return partes.length ? partes.join(" - ") : "—";
}

function baixarModeloXLSX() {
  const dados = [
    {
      "Torre/Bloco": "A ou 1",
      "Nome Torre/Bloco": "Torre Sol",
      Unidade: "101",
      "Nome Completo do Responsável": "João da Silva",
      DDI: "+55",
      "DDD + Número": "(11) 99999-9999",
      "E-mail": "joao@email.com",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(dados);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, "Moradores");
  XLSX.writeFile(wb, "modelo_importacao_moradores_chegou.xlsx");
}

export default function CadastroMorador({ perfil }) {
  const inputArquivoRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(false);

  const [condominio, setCondominio] = useState(null);
  const [torres, setTorres] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [preCadastros, setPreCadastros] = useState([]);
  const [convites, setConvites] = useState([]);

  const [busca, setBusca] = useState("");
  const [filtroTorre, setFiltroTorre] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("RASCUNHO");
  const [pagina, setPagina] = useState(1);

  const [modalNovoMorador, setModalNovoMorador] = useState(false);

  const [modalImportacaoMorador, setModalImportacaoMorador] = useState(false);
  const [modalImportacaoMoradorPDF, setModalImportacaoMoradorPDF] = useState(false);

  const [modalVisualizar, setModalVisualizar] = useState(false);
  const [moradorSelecionado, setMoradorSelecionado] = useState(null);
  const [auditoriaSelecionada, setAuditoriaSelecionada] = useState(null);

  const [modalEditar, setModalEditar] = useState(false);
  const [moradorEdicao, setMoradorEdicao] = useState(null);

  const [modalCancelar, setModalCancelar] = useState(false);
  const [moradorCancelamento, setMoradorCancelamento] = useState(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [erroMotivoCancelamento, setErroMotivoCancelamento] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  const condominioId = perfil?.condominio_id;

  useEffect(() => {
    carregarDados();
  }, [condominioId]);

  async function carregarDados() {
    if (!condominioId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [
        condominioResult,
        torresResult,
        unidadesResult,
        preCadastroResult,
        convitesResult,
      ] = await Promise.all([
        supabase
          .from("condominios")
          .select("*")
          .eq("id", condominioId)
          .maybeSingle(),

        supabase
          .from("torres")
          .select("id, business_id, condominio_id, nome, identificador, created_at")
          .eq("condominio_id", condominioId)
          .order("nome", { ascending: true }),

        supabase
          .from("unidades")
          .select("id, business_id, condominio_id, torre_id, numero, created_at")
          .eq("condominio_id", condominioId)
          .order("numero", { ascending: true }),

        supabase
          .from("pre_cadastro_moradores")
          .select("*")
          .eq("condominio_id", condominioId)
          .order("atualizado_em", { ascending: false, nullsFirst: false })
          .order("criado_em", { ascending: false }),

        supabase
          .from("convites_morador")
          .select("*")
          .eq("condominio_id", condominioId)
          .order("criado_em", { ascending: false }),
      ]);

      if (condominioResult.error) throw condominioResult.error;
      if (torresResult.error) throw torresResult.error;
      if (unidadesResult.error) throw unidadesResult.error;
      if (preCadastroResult.error) throw preCadastroResult.error;
      if (convitesResult.error) throw convitesResult.error;

      setCondominio(condominioResult.data || null);
      setTorres(torresResult.data || []);
      setUnidades(unidadesResult.data || []);
      setPreCadastros(preCadastroResult.data || []);
      setConvites(convitesResult.data || []);
    } catch (error) {
      console.error("Erro ao carregar CadastroMorador:", error);
      toast.error("Não foi possível carregar o cadastro de moradores.");
    } finally {
      setLoading(false);
    }
  }

  const mapaTorres = useMemo(() => {
    return new Map(torres.map((torre) => [torre.id, torre]));
  }, [torres]);

  const listaUnificada = useMemo(() => {
    return preCadastros.map((item) => {
      const convite = convites.find((c) => c.pre_cadastro_id === item.id);

      const unidadeEstrutura = item.unidade_id
        ? unidades.find((u) => u.id === item.unidade_id)
        : null;

      const torreEstrutura = unidadeEstrutura?.torre_id
        ? mapaTorres.get(unidadeEstrutura.torre_id)
        : null;

      const torreNome = formatarTorreTabela(item, torreEstrutura);

      const unidadeNome =
        item.unidade ||
        unidadeEstrutura?.numero ||
        "—";

      const statusPrincipal =
        item.status_cadastro ||
        item.status_convite ||
        item.status_auditoria ||
        "RASCUNHO";

      return {
        id: item.id,
        business_id: item.business_id,
        pre_cadastro_id: item.id,
        nome: item.nome || "Não informado",
        email: item.email || "—",
        telefone: item.telefone || "",
        whatsappFormatado: formatarTelefoneTabela(item.telefone),
        torre_nome: torreNome,
        unidade_nome: unidadeNome,
        unidade_id: item.unidade_id || unidadeEstrutura?.id || null,
        status_principal: statusPrincipal,
        status_convite: convite?.status_envio || item.status_convite || "—",
        origem_cadastro: item.origem_cadastro || "manual",
        percentual_preenchimento: item.percentual_preenchimento || 0,
        possui_divergencia: item.possui_divergencia,
        criado_em: item.criado_em,
        atualizado_em: item.atualizado_em,
        convite,
        raw: item,
      };
    });
  }, [preCadastros, convites, unidades, mapaTorres]);

  const listaFiltrada = useMemo(() => {
    const termo = normalizarTexto(busca);

    return listaUnificada.filter((item) => {
      const texto = normalizarTexto(
        [
          item.nome,
          item.email,
          item.telefone,
          item.torre_nome,
          item.unidade_nome,
          item.status_principal,
          item.status_convite,
          item.origem_cadastro,
        ]
          .filter(Boolean)
          .join(" ")
      );

      const buscaOk = !termo || texto.includes(termo);

      const torreFiltroNormalizada = normalizarTexto(filtroTorre);
      const torreItemNormalizada = normalizarTexto(item.torre_nome);
      const torreRawNormalizada = normalizarTexto(item.raw?.torre);
      const blocoRawNormalizado = normalizarTexto(item.raw?.bloco);

      const torreOk =
        filtroTorre === "todos" ||
        torreItemNormalizada === torreFiltroNormalizada ||
        torreRawNormalizada === torreFiltroNormalizada ||
        blocoRawNormalizado === torreFiltroNormalizada ||
        torreItemNormalizada.includes(torreFiltroNormalizada) ||
        torreFiltroNormalizada.includes(torreRawNormalizada) ||
        torreFiltroNormalizada.includes(blocoRawNormalizado);

      const statusPrincipal = item.status_principal;
      const statusConvite = item.status_convite;
      const statusConta = item.raw?.status_conta;
      const statusAcompanhamento = item.raw?.status_acompanhamento;

      const possuiConviteCriado = Boolean(item.convite?.id);

      if (possuiConviteCriado) {
        return false;
      }

      const statusOculto =
        possuiConviteCriado ||
        STATUS_OCULTOS_NO_TODOS.includes(statusPrincipal) ||
        STATUS_OCULTOS_NO_TODOS.includes(statusConvite) ||
        STATUS_OCULTOS_NO_TODOS.includes(statusConta) ||
        STATUS_OCULTOS_NO_TODOS.includes(statusAcompanhamento);

      const cadastroCancelado =
        statusPrincipal === "CANCELADO" ||
        statusPrincipal === "cancelado";

      const cadastroAprovado =
        statusPrincipal === "APROVADO" ||
        statusPrincipal === "aprovado" ||
        statusPrincipal === "ativo" ||
        statusConta === "conta_ativa";

      const statusOk =
        filtroStatus === "todos"
          ? !statusOculto
          : filtroStatus === "CANCELADO"
            ? cadastroCancelado
            : !cadastroCancelado &&
              !cadastroAprovado &&
              (
                statusPrincipal === filtroStatus ||
                statusConvite === filtroStatus ||
                statusConta === filtroStatus ||
                statusAcompanhamento === filtroStatus
              );

      return buscaOk && torreOk && statusOk;
    });
  }, [listaUnificada, busca, filtroTorre, filtroStatus]);

  const totalPaginas = Math.max(1, Math.ceil(listaFiltrada.length / PAGE_SIZE));

  const listaPaginada = listaFiltrada.slice(
    (pagina - 1) * PAGE_SIZE,
    pagina * PAGE_SIZE
  );

  const indicadores = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10);

    const preCadastrosAtivos = preCadastros.filter((item) => {
      const conviteCriado = convites.some(
        (convite) => convite.pre_cadastro_id === item.id
      );

      if (conviteCriado) {
        return false;
      }

      const statusCadastro = item.status_cadastro;
      const statusConta = item.status_conta;
      const statusAcompanhamento = item.status_acompanhamento;

    const cancelado =
      statusCadastro === "CANCELADO" ||
      statusCadastro === "cancelado";

    const aprovadoOuAtivo =
      statusCadastro === "APROVADO" ||
      statusCadastro === "aprovado" ||
      statusCadastro === "ativo" ||
      statusConta === "conta_ativa" ||
      statusAcompanhamento === "conta_ativa" ||
      statusAcompanhamento === "aprovado";

    return !cancelado && !aprovadoOuAtivo;
  });

    const prontos = preCadastros.filter((item) => {
      const conviteCriado = convites.some(
        (convite) => convite.pre_cadastro_id === item.id
      );

      if (conviteCriado) {
        return false;
      }

      const status = item.status_cadastro || item.status_convite;

      return ["PRONTO_CONVITE", "IMPORTADO", "RASCUNHO", "PRE_CADASTRO"].includes(
        status
      );
    });

    const pendencias = preCadastros.filter((item) => {
      const conviteCriado = convites.some(
        (convite) => convite.pre_cadastro_id === item.id
      );

      if (conviteCriado) {
        return false;
      }

      return (
        item.possui_divergencia ||
        !item.email ||
        !item.telefone ||
        !item.nome ||
        !item.torre ||
        !item.unidade
      );
    });

    const importadosHoje = preCadastros.filter((item) => {
      const conviteCriado = convites.some(
        (convite) => convite.pre_cadastro_id === item.id
      );

      if (conviteCriado) {
        return false;
      }

      return (
        item.origem_cadastro === "xlsx" &&
        String(item.criado_em || "").slice(0, 10) === hoje
      );
    });

    return {
      total: preCadastrosAtivos.length,
      prontos: prontos.length,
      pendencias: pendencias.length,
      importadosHoje: importadosHoje.length,
      semTelefone: preCadastrosAtivos.filter((i) => !i.telefone).length,
      semEmail: preCadastrosAtivos.filter((i) => !i.email).length,
    };
  }, [preCadastros, convites]);

  function limparFiltros() {
    setBusca("");
    setFiltroTorre("todos");
    setFiltroStatus("RASCUNHO");
    setPagina(1);
  }

  function abrirNovoMorador() {
    setModalNovoMorador(true);
  }

  async function abrirVisualizacaoMorador(item) {
    try {
      setMoradorSelecionado(item);
      setAuditoriaSelecionada(null);

      const { data, error } = await supabase
        .from("auditorias_morador")
        .select("*")
        .eq("pre_cadastro_id", item.pre_cadastro_id)
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      setAuditoriaSelecionada(data || null);
      setModalVisualizar(true);
    } catch (error) {
      console.error("Erro ao buscar auditoria do morador:", error);

      setAuditoriaSelecionada(null);
      setModalVisualizar(true);
      toast.error("Não foi possível carregar a auditoria. Exibindo dados básicos.");
    }
  }

  function fecharVisualizacaoMorador() {
    setModalVisualizar(false);
    setMoradorSelecionado(null);
    setAuditoriaSelecionada(null);
  }

  function solicitarEdicaoMorador(registro) {
    setModalVisualizar(false);

    const itemCompleto =
      moradorSelecionado ||
      listaUnificada.find((item) => item.pre_cadastro_id === registro?.id) ||
      listaUnificada.find((item) => item.id === registro?.id) ||
      registro;

    if (!podeEditarMoradorCadastro(itemCompleto)) {
      toast.error(
        "Edição bloqueada. Após a criação do convite, os dados só podem ser alterados pelo morador no Wizard."
      );
      return;
    }

    setMoradorEdicao(itemCompleto);
    setModalEditar(true);

  }

  async function salvarEdicaoMorador(payload) {
    await atualizarPreCadastroMorador({
      perfil,
      condominio,
      preCadastroId: payload.id,
      dadosAntes: payload.dados_antes,
      dadosDepois: payload.dados_depois,
      metadadosEdicao: payload.metadados_edicao,
    });

    setModalEditar(false);
    setMoradorEdicao(null);
    setMoradorSelecionado(null);
    setAuditoriaSelecionada(null);

    await carregarDados();
  }

  function abrirCancelamentoMorador(item) {
    if (!podeEditarMoradorCadastro(item)) {
      toast.error(
        "Cancelamento bloqueado. Após a criação do convite, este cadastro passa para o fluxo de Auditoria e Convite."
      );
      return;
    }

    setMoradorCancelamento(item);
    setMotivoCancelamento("");
    setModalCancelar(true);
  }

  function fecharCancelamentoMorador() {
    if (cancelando) return;

    setModalCancelar(false);
    setMoradorCancelamento(null);
    setMotivoCancelamento("");
  }

  useEffect(() => {
    if (!modalCancelar) return;

    function handleEsc(event) {
      if (event.key === "Escape") {
        fecharCancelamentoMorador();
      }
    }

    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [modalCancelar, cancelando]);

  async function confirmarCancelamentoMorador() {
    if (!podeEditarMoradorCadastro(moradorCancelamento)) {
      toast.error(
        "Cancelamento bloqueado. Este cadastro já possui convite criado ou enviado."
      );

      setModalCancelar(false);
      return;
    }
    const motivo = motivoCancelamento.trim();

    if (!motivo) {
      setErroMotivoCancelamento(true);

      const campo = document.getElementById(
        "cadmor-motivo-cancelamento"
      );

      campo?.focus();

      return;
    }

    try {
      setCancelando(true);

      await cancelarPreCadastroMorador({
        perfil,
        condominio,
        preCadastro: moradorCancelamento,
        motivo,
      });

      toast.success("Pré-cadastro cancelado com sucesso.");

      fecharCancelamentoMorador();
      await carregarDados();
    } catch (error) {
      console.error("Erro ao cancelar pré-cadastro:", error);
      toast.error(error.message || "Erro ao cancelar pré-cadastro.");
    } finally {
      setCancelando(false);
    }
  }

  function abrirImportacaoXLSX() {
    setModalImportacaoMorador(true);
  }

  function abrirImportacaoPDF() {
    setModalImportacaoMoradorPDF(true);
  }

  async function lerArquivoXLSX(file) {
    if (!file) return;

    toast("Modal de importação em lote será codado no próximo bloco.");
    if (inputArquivoRef.current) inputArquivoRef.current.value = "";
  }

  return (
    <div className="cadmor-page">
      <input
        ref={inputArquivoRef}
        type="file"
        accept=".xlsx"
        hidden
        onChange={(event) => lerArquivoXLSX(event.target.files?.[0])}
      />

      <div className="cadmor-shell">
        <main className="cadmor-main">
          <div className="cadmor-breadcrumb">
            <span>Início</span>
            <span>›</span>
            <span>Cadastro</span>
            <span>›</span>
            <strong>Moradores</strong>
          </div>

          <section className="cadmor-hero">
            <div>
              <span className="cadmor-kicker">Cadastro Administrativo</span>
              <h1>Cadastro de Moradores</h1>
              <p>
                Prepare os pré-cadastros dos responsáveis de unidade antes do envio
                dos convites para o Wizard Morador.
              </p>

              {condominio ? (
                <strong>
                  {condominio.nome_fantasia || condominio.razao_social}
                </strong>
              ) : null}
            </div>

            <div className="cadmor-hero-actions">
              <button type="button" className="cadmor-btn primary" onClick={abrirNovoMorador}>
                <Plus size={17} />
                Novo Morador
              </button>

              <button type="button" className="cadmor-btn secondary" onClick={abrirImportacaoXLSX}>
                <Upload size={17} />
                Importar XLSX
              </button>

              <button type="button" className="cadmor-btn secondary" onClick={abrirImportacaoPDF}>
                <FileSpreadsheet size={17} />
                Importar PDF
              </button>
            </div>
          </section>

          <section className="cadmor-kpis">
            <article className="cadmor-kpi blue">
              <UsersIcon />
              <div>
                <span>Pré-cadastros</span>
                <strong>{indicadores.total}</strong>
              </div>
            </article>

            <article className="cadmor-kpi green">
              <CheckCircle2 size={22} />
              <div>
                <span>Prontos para convite</span>
                <strong>{indicadores.prontos}</strong>
              </div>
            </article>

            <article className="cadmor-kpi orange">
              <AlertCircle size={22} />
              <div>
                <span>Pendências</span>
                <strong>{indicadores.pendencias}</strong>
              </div>
            </article>

            <article className="cadmor-kpi purple">
              <Clock size={22} />
              <div>
                <span>Importados hoje</span>
                <strong>{indicadores.importadosHoje}</strong>
              </div>
            </article>
          </section>

          <section className="cadmor-card cadmor-actions-card">
            <div>
              <h2>Ações rápidas</h2>
              <p>Cadastre individualmente, importe listas e prepare os dados para convite.</p>
            </div>

            <div className="cadmor-actions-grid">
              <button type="button" onClick={abrirNovoMorador}>
                <Plus size={18} />
                Novo Morador
              </button>

              <button type="button" onClick={abrirImportacaoXLSX}>
                <Upload size={18} />
                Importar XLSX
              </button>

              <button type="button" onClick={abrirImportacaoPDF}>
                <FileSpreadsheet size={18} />
                Importar PDF
              </button>

              <button type="button" onClick={baixarModeloXLSX}>
                <Download size={18} />
                Baixar Modelo
              </button>

              <button type="button" onClick={carregarDados} disabled={loading || processando}>
                <RefreshCcw size={18} />
                Atualizar
              </button>
            </div>
          </section>

          <section className="cadmor-card">
            <div className="cadmor-card-head">
              <div>
                <h2>Pré-cadastros de Moradores</h2>
                <p>Lista de responsáveis de unidade cadastrados ou importados.</p>
              </div>
            </div>

            <div className="cadmor-filters">
              <label className="cadmor-search">
                <Search size={16} />
                <input
                  value={busca}
                  onChange={(event) => {
                    setBusca(event.target.value);
                    setPagina(1);
                  }}
                  placeholder="Buscar por nome, e-mail, WhatsApp, torre ou unidade..."
                />
              </label>

              <select
                value={filtroTorre}
                onChange={(event) => {
                  setFiltroTorre(event.target.value);
                  setPagina(1);
                }}
              >
                <option value="todos">Todas as torres</option>

                {torres.map((torre) => (
                  <option key={torre.id} value={torre.nome}>
                    {torre.identificador
                      ? `${torre.nome} (${torre.identificador})`
                      : torre.nome}
                  </option>
                ))}
              </select>

              <select
                value={filtroStatus}
                onChange={(event) => {
                  setFiltroStatus(event.target.value);
                  setPagina(1);
                }}
              >
                {STATUS_FILTRO_CADASTRO.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>

              <button type="button" onClick={limparFiltros}>
                <Filter size={15} />
                Limpar
              </button>
            </div>

            <div className="cadmor-table-wrap">
              <table className="cadmor-table">
                <thead>
                  <tr>
                    <th>AP</th>
                    <th>Torre</th>
                    <th>Responsável</th>
                    <th>WhatsApp</th>
                    <th>E-mail</th>
                    <th>Status</th>
                    <th>Origem</th>
                    <th>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8">Carregando dados...</td>
                    </tr>
                  ) : listaPaginada.length === 0 ? (
                    <tr>
                      <td colSpan="8">Nenhum pré-cadastro encontrado.</td>
                    </tr>
                  ) : (
                    listaPaginada.map((item) => (
                      <tr key={item.id}>
                        <td data-label="Unidade">
                          <strong>{item.unidade_nome}</strong>
                        </td>

                        <td data-label="Torre">
                          {item.torre_nome}
                        </td>

                        <td data-label="Responsável">
                          <div className="cadmor-person">
                            <strong>{item.nome}</strong>
                            <small>{item.business_id || item.pre_cadastro_id}</small>
                          </div>
                        </td>

                        <td data-label="WhatsApp">
                          {item.whatsappFormatado}
                        </td>

                        <td data-label="E-mail">
                          {item.email}
                        </td>

                        <td data-label="Status">
                          <span className={`cadmor-status ${String(item.status_principal).toLowerCase()}`}>
                            {labelStatus(item.status_principal)}
                          </span>
                        </td>

                        <td data-label="Origem">
                          <span className="cadmor-origin">
                            {item.origem_cadastro || "manual"}
                          </span>
                        </td>

                        <td data-label="Ações">
                          <div className="cadmor-row-actions">
                            <button
                              type="button"
                              title="Visualizar cadastro"
                              onClick={() => abrirVisualizacaoMorador(item)}
                            >
                              <Eye size={15} />
                            </button>

                            {podeEditarMoradorCadastro(item) ? (
                              <button
                                type="button"
                                title="Cancelar pré-cadastro"
                                onClick={() => abrirCancelamentoMorador(item)}
                              >
                                <XCircle size={15} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                title="Cancelamento bloqueado após criação ou envio do convite"
                                disabled
                                className="cadmor-action-disabled"
                              >
                                <XCircle size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="cadmor-pagination">
              <span>
                Página {pagina} de {totalPaginas} • {listaFiltrada.length} registro(s)
              </span>

              <div>
                <button
                  type="button"
                  disabled={pagina <= 1}
                  onClick={() => setPagina((old) => Math.max(1, old - 1))}
                >
                  Anterior
                </button>

                <button
                  type="button"
                  disabled={pagina >= totalPaginas}
                  onClick={() => setPagina((old) => Math.min(totalPaginas, old + 1))}
                >
                  Próxima
                </button>
              </div>
            </div>
          </section>
        </main>

        <aside className="cadmor-aside">
          <section className="cadmor-side-card highlight">
            <span>Cadastro de Moradores</span>
            <h3>Pré-cadastro administrativo</h3>
            <p>
              Esta tela prepara os responsáveis de unidade para receberem convite
              e iniciarem o Wizard Morador.
            </p>
          </section>

          <section className="cadmor-side-card">
            <h3>Indicadores</h3>

            <div className="cadmor-side-metrics">
              <p>
                Prontos para convite <strong>{indicadores.prontos}</strong>
              </p>
              <p>
                Com pendência <strong>{indicadores.pendencias}</strong>
              </p>
              <p>
                Sem telefone <strong>{indicadores.semTelefone}</strong>
              </p>
              <p>
                Sem e-mail <strong>{indicadores.semEmail}</strong>
              </p>
            </div>
          </section>

          <section className="cadmor-side-card">
            <h3>Fluxo do processo</h3>

            <ol>
              <li>Cadastro</li>
              <li>Convite</li>
              <li>Wizard Morador</li>
              <li>Auditoria</li>
              <li>Liberação</li>
            </ol>
          </section>

          <section className="cadmor-side-card">
            <h3>Boas práticas</h3>

            <ul>
              <li>Use Torre/Bloco da estrutura oficial.</li>
              <li>Confira WhatsApp e e-mail antes do convite.</li>
              <li>Trocas de morador devem ir para Gestão de Vínculos.</li>
              <li>Não exclua registros com histórico ou logs.</li>
            </ul>
          </section>

          <section className="cadmor-side-card faq">
            <h3>Dúvidas frequentes</h3>

            <details>
              <summary>O perfil é definido aqui?</summary>
              <p>Não. O perfil será definido pelo morador no Wizard Morador.</p>
            </details>

            <details>
              <summary>Posso enviar convite por esta tela?</summary>
              <p>
                Esta tela prepara o cadastro. O envio será tratado na tela
                Cadastro &gt; Convites de Moradores.
              </p>
            </details>

            <details>
              <summary>Posso trocar morador por aqui?</summary>
              <p>
                Não. Trocas de inquilino, proprietário ou responsável devem ser
                feitas em Gestão &gt; Unidades e Vínculos.
              </p>
            </details>
          </section>
        </aside>
      </div>

      <ModalNovoMorador
        aberto={modalNovoMorador}
        onClose={() => setModalNovoMorador(false)}
        onSuccess={carregarDados}
        perfil={perfil}
        condominio={condominio}
        torres={torres}
        preCadastros={preCadastros}
      />

      <ModalVisualizarMorador
        aberto={modalVisualizar}
        morador={moradorSelecionado}
        auditoria={auditoriaSelecionada}
        onClose={fecharVisualizacaoMorador}
        onEditar={solicitarEdicaoMorador}
      />

      <ModalEditarMorador
        aberto={modalEditar}
        morador={moradorEdicao}
        torres={torres}
        preCadastros={preCadastros}
        onClose={() => {
          setModalEditar(false);
          setMoradorEdicao(null);
        }}
        onSalvar={salvarEdicaoMorador}
      />

      <ModalImportacaoMorador
        aberto={modalImportacaoMorador}
        onClose={() => setModalImportacaoMorador(false)}
        perfil={perfil}
        condominio={condominio}
        torres={torres}
        preCadastros={preCadastros}
        onImportacaoConcluida={async () => {
          await carregarDados();
        }}
      />

      <ModalImportacaoMoradorPDF
        aberto={modalImportacaoMoradorPDF}
        onClose={() => setModalImportacaoMoradorPDF(false)}
        perfil={perfil}
        condominio={condominio}
        torres={torres}
        unidades={unidades}
        preCadastros={preCadastros}
        onImportacaoConcluida={async () => {
          await carregarDados();
        }}
      />

      {modalCancelar ? (
        <div className="cadmor-confirm-overlay" role="dialog" aria-modal="true">
          <div className="cadmor-confirm-box">
            <button
              type="button"
              className="cadmor-confirm-close"
              onClick={fecharCancelamentoMorador}
              disabled={cancelando}
              aria-label="Fechar modal"
            >
              ×
            </button>

            <div className="cadmor-confirm-header">
              <div className="cadmor-confirm-icon danger">
                <XCircle size={22} />
              </div>

              <div>
                <span>Cancelamento de pré-cadastro</span>
                <h3>Cancelar este pré-cadastro?</h3>
              </div>
            </div>

            <div className="cadmor-confirm-content">
              <p>
                Esta ação não exclui o registro. O pré-cadastro será marcado como
                cancelado, ficará registrado na auditoria e a Torre/Unidade será
                liberada para um novo pré-cadastro.
              </p>

              <div className="cadmor-confirm-change">
                <div>
                  <small>Morador</small>
                  <strong>{moradorCancelamento?.nome || "—"}</strong>
                </div>

                <div>
                  <small>Unidade</small>
                  <strong>
                    {moradorCancelamento?.torre_nome || moradorCancelamento?.raw?.torre || "—"}
                    {" • Unidade "}
                    {moradorCancelamento?.unidade_nome || moradorCancelamento?.raw?.unidade || "—"}
                  </strong>
                </div>
              </div>

              <label className="cadmor-field cadmor-confirm-reason">
                <span>Motivo do cancelamento *</span>
                <textarea
                  id="cadmor-motivo-cancelamento"
                  className={
                    erroMotivoCancelamento
                      ? "cadmor-textarea-error"
                      : ""
                  }
                  value={motivoCancelamento}
                  onChange={(event) => {
                    setMotivoCancelamento(event.target.value);
                    setErroMotivoCancelamento(false);
                  }}
                  rows={4}
                  placeholder="Ex.: cadastro criado por engano, duplicidade, teste ou dados incorretos."
                />

                {erroMotivoCancelamento && (
                  <span className="cadmor-field-error">
                    Informe o motivo do cancelamento.
                  </span>
                )}

              </label>
            </div>

            <div className="cadmor-confirm-actions">
              <button
                type="button"
                className="cadmor-btn secondary"
                onClick={fecharCancelamentoMorador}
                disabled={cancelando}
              >
                Voltar
              </button>

              <button
                type="button"
                className="cadmor-btn danger"
                onClick={confirmarCancelamentoMorador}
                disabled={cancelando}
              >
                {cancelando ? "Cancelando..." : "Confirmar Cancelamento"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}

function UsersIcon() {
  return <Mail size={22} />;
}