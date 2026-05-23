import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  Link2,
  Mail,
  MoreVertical,
  Plus,
  Search,
  Send,
  Upload,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { supabase } from "../../services/supabase";
import "./CadastroMorador.css";

const PAGE_SIZE = 8;

const STATUS_LABELS = {
  pre_cadastro: "Pré-cadastro",
  aguardando_preenchimento: "Aguardando preenchimento",
  cadastro_finalizado: "Cadastro finalizado",
  aguardando_auditoria: "Aguardando auditoria",
  pendente: "Pendente",
  em_analise: "Em análise",
  correcao_enviada: "Correção enviada",
  aprovado: "Aprovado",
  ativo: "Ativo",
  inativo: "Inativo",
  rejeitado: "Rejeitado",
  aguardando_envio: "Aguardando envio",
  em_fila: "Em fila",
  processando: "Processando",
  enviado: "Enviado",
  erro_envio: "Erro no envio",
  reenviado: "Reenviado",
  aberto: "Aberto",
  token_utilizado: "Token utilizado",
  expirado: "Expirado",
  cancelado: "Cancelado",
  pausado: "Pausado",
  nao_enviado: "Não enviado",
};

const FORM_INICIAL = {
  nome: "",
  email: "",
  ddi: "+55",
  telefone: "",
  torre_bloco: "",
  unidade: "",
};

function normalizarTexto(valor = "") {
  return String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizarEmail(valor = "") {
  return String(valor).trim().toLowerCase();
}

function somenteNumeros(valor = "") {
  return String(valor).replace(/\D/g, "");
}

function formatarDDI(valor = "") {
  let limpo = String(valor).replace(/[^\d+]/g, "");

  if (!limpo) return "+55";

  if (!limpo.startsWith("+")) {
    limpo = `+${limpo}`;
  }

  return limpo.slice(0, 4);
}

function formatarTelefone(valor = "") {
  const numeros = somenteNumeros(valor).slice(0, 11);

  if (numeros.length <= 2) {
    return numeros ? `(${numeros}` : "";
  }

  if (numeros.length <= 6) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  }

  if (numeros.length <= 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  }

  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

function formatarNomeProprio(valor = "") {
  return String(valor)
    .replace(/\s+/g, " ")
    .trimStart()
    .toLocaleLowerCase("pt-BR")
    .split(" ")
    .map((parte) => {
      const minusculas = ["da", "de", "do", "das", "dos", "e"];
      if (minusculas.includes(parte)) return parte;
      return parte.charAt(0).toLocaleUpperCase("pt-BR") + parte.slice(1);
    })
    .join(" ");
}

function montarTelefone({ ddi, telefone }) {
  const ddiLimpo = somenteNumeros(ddi);
  const numeroLimpo = somenteNumeros(telefone);

  if (!numeroLimpo) return "";

  return `+${ddiLimpo || "55"}${numeroLimpo}`;
}

function labelStatus(status) {
  return STATUS_LABELS[status] || status || "-";
}

function obterValorLinha(linha, nomes) {
  for (const nome of nomes) {
    if (linha[nome] !== undefined && linha[nome] !== null) return linha[nome];
  }

  return "";
}

function baixarModeloXLSX() {
  const dados = [
    {
      "Torre/Bloco": "",
      Unidade: "",
      "Nome Completo": "",
      Email: "",
      DDI: "+55",
      "Telefone/WhatsApp": "",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(dados);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, "Moradores");
  XLSX.writeFile(wb, "modelo_importacao_moradores.xlsx");
}
export default function CadastroMorador({ perfil }) {
  const inputArquivoRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(false);

  const [usuarios, setUsuarios] = useState([]);
  const [preCadastros, setPreCadastros] = useState([]);
  const [convites, setConvites] = useState([]);
  const [auditorias, setAuditorias] = useState([]);
  const [filaEmails, setFilaEmails] = useState([]);
  const [torres, setTorres] = useState([]);

  const [busca, setBusca] = useState("");
  const [filtroTorre, setFiltroTorre] = useState("todos");
  const [filtroUnidade, setFiltroUnidade] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [pagina, setPagina] = useState(1);

  const [modalNovo, setModalNovo] = useState(false);
  const [modalImportacao, setModalImportacao] = useState(false);
  const [resultadoImportacao, setResultadoImportacao] = useState([]);

  const [novoMorador, setNovoMorador] = useState(FORM_INICIAL);

  const condominioId = perfil?.condominio_id;
  const usuarioLogadoId = perfil?.id;

  useEffect(() => {
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [condominioId]);

  async function carregarDados() {
    if (!condominioId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [
        usuariosResult,
        preCadastroResult,
        convitesResult,
        auditoriasResult,
        filaResult,
        unidadesResult,
      ] = await Promise.all([
        supabase
          .from("usuarios")
          .select("*")
          .eq("condominio_id", condominioId)
          .in("nivel_id", [6, 7])
          .order("created_at", { ascending: false }),

        supabase
          .from("pre_cadastro_moradores")
          .select("*")
          .eq("condominio_id", condominioId)
          .order("criado_em", { ascending: false }),

        supabase
          .from("convites_morador")
          .select("*")
          .eq("condominio_id", condominioId)
          .order("criado_em", { ascending: false }),

        supabase
          .from("auditorias_morador")
          .select("*")
          .eq("condominio_id", condominioId)
          .order("criado_em", { ascending: false }),

        supabase
          .from("fila_emails")
          .select("*")
          .eq("condominio_id", condominioId)
          .order("criado_em", { ascending: false }),

        supabase
          .from("torres")
          .select("*")
          .eq("condominio_id", condominioId)
          .order("nome", { ascending: true }),
      ]);

      if (usuariosResult.error) throw usuariosResult.error;
      if (preCadastroResult.error) throw preCadastroResult.error;
      if (convitesResult.error) throw convitesResult.error;
      if (auditoriasResult.error) throw auditoriasResult.error;
      if (filaResult.error) throw filaResult.error;
      if (unidadesResult.error) throw unidadesResult.error;

      setUsuarios(usuariosResult.data || []);
      setPreCadastros(preCadastroResult.data || []);
      setConvites(convitesResult.data || []);
      setAuditorias(auditoriasResult.data || []);
      setFilaEmails(filaResult.data || []);
      setTorres(unidadesResult.data || []);
    } catch (error) {
      console.error("Erro ao carregar moradores:", error);
      toast.error("Não foi possível carregar os dados dos moradores.");
    } finally {
      setLoading(false);
    }
  }
  const listaUnificada = useMemo(() => {
    const ativos = usuarios.map((usuario) => ({
      origem_registro: "usuario",
      id: usuario.id,
      usuario_id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      telefone: usuario.telefone,
      torre_nome: "-",
      unidade_nome: "-",
      tipo_morador: usuario.nivel_id === 7 ? "dependente" : "morador",
      status_principal: usuario.ativo ? "ativo" : "inativo",
      status_convite: "-",
      status_auditoria: usuario.status_cadastro || "-",
      percentual_preenchimento: 100,
      criado_em: usuario.created_at,
      ativo: usuario.ativo,
    }));

    const pre = preCadastros.map((item) => {
      const convite = convites.find((c) => c.pre_cadastro_id === item.id);
      const auditoria = auditorias.find((a) => a.pre_cadastro_id === item.id);

      return {
        origem_registro: "pre_cadastro",
        id: item.id,
        pre_cadastro_id: item.id,
        usuario_id: item.usuario_existente_id,
        nome: item.nome,
        email: item.email,
        telefone: item.telefone,
        torre_nome: item.torre || item.bloco || "-",
        unidade_nome: item.unidade || "-",
        tipo_morador: item.tipo_morador || "morador",
        status_principal:
          auditoria?.status_auditoria ||
          item.status_auditoria ||
          item.status_cadastro ||
          item.status_convite,
        status_convite: convite?.status_envio || item.status_convite,
        status_auditoria: auditoria?.status_auditoria || item.status_auditoria,
        percentual_preenchimento: item.percentual_preenchimento || 0,
        possui_divergencia: item.possui_divergencia,
        divergencias: item.divergencias || {},
        criado_em: item.criado_em,
        atualizado_em: item.atualizado_em,
        convite,
        auditoria,
        ativo: item.status_cadastro === "ativo",
      };
    });

    const idsUsuariosComPre = new Set(pre.map((item) => item.usuario_id).filter(Boolean));
    const ativosSemDuplicar = ativos.filter((item) => !idsUsuariosComPre.has(item.usuario_id));

    return [...pre, ...ativosSemDuplicar].sort((a, b) => {
      const dataA = new Date(a.atualizado_em || a.criado_em || 0).getTime();
      const dataB = new Date(b.atualizado_em || b.criado_em || 0).getTime();
      return dataB - dataA;
    });
  }, [usuarios, preCadastros, convites, auditorias]);

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
          item.status_auditoria,
        ]
          .filter(Boolean)
          .join(" ")
      );

      const buscaOk = !termo || texto.includes(termo);
      const torreOk = filtroTorre === "todos" || item.torre_nome === filtroTorre;
      const unidadeOk = filtroUnidade === "todos" || String(item.unidade_nome) === filtroUnidade;
      const statusOk =
        filtroStatus === "todos" ||
        item.status_principal === filtroStatus ||
        item.status_convite === filtroStatus ||
        item.status_auditoria === filtroStatus;

      return buscaOk && torreOk && unidadeOk && statusOk;
    });
  }, [listaUnificada, busca, filtroTorre, filtroUnidade, filtroStatus]);

  const totalPaginas = Math.max(1, Math.ceil(listaFiltrada.length / PAGE_SIZE));
  const listaPaginada = listaFiltrada.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);

  const indicadores = useMemo(() => {
    return {
      convitesPendentes: preCadastros.filter((i) =>
        ["aguardando_envio", "em_fila", "erro_envio"].includes(i.status_convite)
      ).length,
      auditoriasPendentes: auditorias.filter((i) =>
        ["pendente", "em_analise", "correcao_enviada"].includes(i.status_auditoria)
      ).length,
      moradoresAtivos: usuarios.filter((i) => i.ativo && i.nivel_id === 6).length,
      dependentes: usuarios.filter((i) => i.ativo && i.nivel_id === 7).length,
      errosEnvio: filaEmails.filter((i) => i.status_envio === "erro_envio").length,
      cadastrosIncompletos: preCadastros.filter(
        (i) => Number(i.percentual_preenchimento || 0) < 100
      ).length,
    };
  }, [preCadastros, auditorias, usuarios, filaEmails]);

  const torresDisponiveis = useMemo(() => {
    return torres.map((torre) => ({
      value: torre.nome,
      label: torre.identificador
        ? `${torre.nome} (${torre.identificador})`
        : torre.nome,
    }));
  }, [torres]);

  function limparFiltros() {
    setBusca("");
    setFiltroTorre("todos");
    setFiltroUnidade("todos");
    setFiltroStatus("todos");
    setPagina(1);
  }

  function atualizarNovoMorador(campo, valor) {
    setNovoMorador((old) => ({
      ...old,
      [campo]: valor,
    }));
  }

  function limparFormularioNovo() {
    setNovoMorador(FORM_INICIAL);
  }

  function validarNovoMorador() {
    if (!novoMorador.nome.trim()) return "Informe o nome completo.";
    if (!novoMorador.email.trim()) return "Informe o e-mail.";
    if (!novoMorador.email.includes("@")) return "Informe um e-mail válido.";
    if (!novoMorador.ddi.trim()) return "Informe o DDI.";
    if (!novoMorador.telefone.trim()) return "Informe o telefone / WhatsApp.";
    if (somenteNumeros(novoMorador.telefone).length < 10) return "Telefone inválido.";
    if (!novoMorador.torre_bloco.trim()) return "Informe a torre/bloco.";
    if (
      torresDisponiveis.length > 0 &&
      !torresDisponiveis.some((t) => t.value === novoMorador.torre_bloco)
    ) {
      return "Selecione uma torre válida.";
    }
    if (!novoMorador.unidade.trim()) return "Informe a unidade.";

    return null;
  }
  async function enviarConviteIndividual(enviarAgora = false) {
    const erroValidacao = validarNovoMorador();

    if (erroValidacao) {
      toast.error(erroValidacao);
      return;
    }

    try {
      setProcessando(true);

      const nomeFormatado = formatarNomeProprio(novoMorador.nome);
      const telefoneCompleto = montarTelefone(novoMorador);

      const { data, error } = await supabase.functions.invoke("enviar-convite-morador", {
        body: {
          condominio_id: condominioId,
          nome: nomeFormatado,
          email: normalizarEmail(novoMorador.email),
          telefone: telefoneCompleto,
          cpf: null,
          torre: novoMorador.torre_bloco.trim(),
          bloco: null,
          unidade: novoMorador.unidade.trim(),
          tipo_morador: "morador",
          tipo_envio: "individual",
          origem_cadastro: "administrativo",
          enviado_por: usuarioLogadoId,
          enviar_agora: enviarAgora,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(enviarAgora ? "Convite enviado ao morador." : "Convite salvo na fila.");

      setModalNovo(false);
      limparFormularioNovo();
      await carregarDados();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Erro ao preparar convite.");
    } finally {
      setProcessando(false);
    }
  }

  async function reenviarConvite(item) {
    if (!item.email) {
      toast.error("Morador sem e-mail cadastrado.");
      return;
    }

    try {
      setProcessando(true);

      const { data, error } = await supabase.functions.invoke("enviar-convite-morador", {
        body: {
          condominio_id: condominioId,
          pre_cadastro_id: item.pre_cadastro_id || item.id,
          nome: item.nome,
          email: item.email,
          telefone: item.telefone,
          cpf: null,
          torre: item.torre_nome,
          bloco: null,
          unidade: item.unidade_nome,
          tipo_morador: "morador",
          tipo_envio: "reenvio",
          origem_cadastro: "administrativo",
          enviado_por: usuarioLogadoId,
          enviar_agora: false,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Reenvio adicionado à fila.");
      await carregarDados();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Erro ao reenviar convite.");
    } finally {
      setProcessando(false);
    }
  }

  async function processarFila() {
    try {
      setProcessando(true);

      const { data, error } = await supabase.functions.invoke("processar-fila-emails", {
        body: {},
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Fila processada. Itens: ${data?.processados || 0}`);
      await carregarDados();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Erro ao processar fila.");
    } finally {
      setProcessando(false);
    }
  }

  async function aprovarMorador(item) {
    if (!item.auditoria?.id) {
      toast.error("Este morador ainda não possui auditoria pendente.");
      return;
    }

    if (Number(item.percentual_preenchimento || 0) < 100) {
      toast.error("Aprovação rápida só é permitida com 100% de preenchimento.");
      return;
    }

    try {
      setProcessando(true);

      const { data, error } = await supabase.functions.invoke("aprovar-morador", {
        body: {
          auditoria_id: item.auditoria.id,
          aprovado_por: usuarioLogadoId,
          aprovado_por_nome: perfil?.nome,
          aprovado_por_email: perfil?.email,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Morador aprovado com sucesso.");
      await carregarDados();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Erro ao aprovar morador.");
    } finally {
      setProcessando(false);
    }
  }
  async function lerArquivoXLSX(file) {
    if (!file) return;

    const extensao = file.name.split(".").pop()?.toLowerCase();

    if (extensao !== "xlsx") {
      toast.error("Envie apenas arquivo .xlsx.");
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      const linhas = rows.map((linha, index) => {
        const ddi = formatarDDI(obterValorLinha(linha, ["DDI", "ddi"]) || "+55");
        const telefone = formatarTelefone(
          obterValorLinha(linha, [
            "Telefone/WhatsApp",
            "Telefone",
            "telefone",
            "WhatsApp",
            "whatsapp",
          ])
        );

        return {
          linha: index + 2,
          torre: String(
            obterValorLinha(linha, ["Torre/Bloco", "Torre", "Bloco", "torre", "bloco"])
          ).trim(),
          bloco: null,
          unidade: String(obterValorLinha(linha, ["Unidade", "unidade"])).trim(),
          nome: formatarNomeProprio(
            obterValorLinha(linha, ["Nome Completo", "Nome", "nome"])
          ),
          email: normalizarEmail(obterValorLinha(linha, ["Email", "E-mail", "email"])),
          telefone: montarTelefone({ ddi, telefone }),
          cpf: null,
          tipo_morador: "morador",
        };
      });

      const analisadas = analisarDuplicidades(linhas);
      setResultadoImportacao(analisadas);
      setModalImportacao(true);

      toast.success(`${linhas.length} linha(s) carregada(s).`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao ler arquivo XLSX.");
    } finally {
      if (inputArquivoRef.current) inputArquivoRef.current.value = "";
    }
  }

  function analisarDuplicidades(linhas) {
    const mapaArquivo = new Map();

    return linhas.map((linha) => {
      const chave = `${linha.email}|${linha.torre}|${linha.unidade}`;
      const duplicadaArquivo = mapaArquivo.has(chave);
      mapaArquivo.set(chave, true);

      const existente = preCadastros.find(
        (item) =>
          normalizarEmail(item.email) === normalizarEmail(linha.email) &&
          normalizarTexto(item.torre) === normalizarTexto(linha.torre) &&
          normalizarTexto(item.unidade) === normalizarTexto(linha.unidade)
      );

      const divergencias = {};

      if (existente) {
        ["nome", "email", "telefone", "torre", "unidade"].forEach((campo) => {
          if (normalizarTexto(existente[campo] || "") !== normalizarTexto(linha[campo] || "")) {
            divergencias[campo] = {
              anterior: existente[campo] || "",
              novo: linha[campo] || "",
            };
          }
        });
      }

      let status = "novo";

      if (duplicadaArquivo) status = "duplicado_no_arquivo";
      else if (existente && Object.keys(divergencias).length === 0) status = "igual_existente";
      else if (existente && Object.keys(divergencias).length > 0) status = "alterado";

      return {
        ...linha,
        status_importacao: status,
        existente,
        divergencias,
        selecionado: status !== "igual_existente" && status !== "duplicado_no_arquivo",
      };
    });
  }

  async function importarSelecionados() {
    const selecionados = resultadoImportacao.filter((item) => item.selecionado);

    if (selecionados.length === 0) {
      toast.error("Nenhuma linha selecionada para importar.");
      return;
    }

    try {
      setProcessando(true);

      for (const item of selecionados) {
        const { data, error } = await supabase.functions.invoke("enviar-convite-morador", {
          body: {
            condominio_id: condominioId,
            pre_cadastro_id: item.existente?.id || null,
            nome: item.nome,
            email: item.email,
            telefone: item.telefone,
            cpf: null,
            torre: item.torre,
            bloco: null,
            unidade: item.unidade,
            tipo_morador: "morador",
            tipo_envio: "lote",
            origem_cadastro: "xlsx",
            enviado_por: usuarioLogadoId,
            enviar_agora: false,
            observacoes:
              item.status_importacao === "alterado"
                ? "Dados alterados por importação XLSX autorizada pelo administrador."
                : null,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      }

      toast.success("Importação concluída. Convites adicionados à fila.");
      setModalImportacao(false);
      setResultadoImportacao([]);
      await carregarDados();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Erro ao importar moradores.");
    } finally {
      setProcessando(false);
    }
  }
  return (
    <div className="moradores-page">
      <input
        ref={inputArquivoRef}
        type="file"
        accept=".xlsx"
        hidden
        onChange={(e) => lerArquivoXLSX(e.target.files?.[0])}
      />

      <div className="moradores-shell">
        <main className="moradores-main">
          <div className="moradores-breadcrumb">
            <span>Início</span>
            <span>›</span>
            <span>Cadastro</span>
            <span>›</span>
            <strong>Moradores</strong>
          </div>

          <section className="moradores-header">
            <div>
              <h1>Moradores</h1>
              <p>Gerencie pré-cadastros, convites, auditorias e liberações de acesso.</p>
            </div>

            <div className="moradores-actions">
              <button type="button" className="btn-primary" onClick={() => setModalNovo(true)}>
                <Plus size={17} />
                Novo Morador
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => inputArquivoRef.current?.click()}
              >
                <Upload size={17} />
                Importar XLSX
              </button>

              <small>Somente Síndico, Subsíndico ou usuários autorizados</small>
            </div>
          </section>

          <section className="moradores-kpis">
            <article className="morador-kpi warning">
              <AlertCircle size={22} />
              <div>
                <span>Convites Pendentes</span>
                <strong>{indicadores.convitesPendentes}</strong>
              </div>
            </article>

            <article className="morador-kpi blue">
              <Clock size={22} />
              <div>
                <span>Auditorias Pendentes</span>
                <strong>{indicadores.auditoriasPendentes}</strong>
              </div>
            </article>

            <article className="morador-kpi green">
              <UserCheck size={22} />
              <div>
                <span>Moradores Ativos</span>
                <strong>{indicadores.moradoresAtivos}</strong>
              </div>
            </article>

            <article className="morador-kpi purple">
              <Users size={22} />
              <div>
                <span>Dependentes</span>
                <strong>{indicadores.dependentes}</strong>
              </div>
            </article>
          </section>

          <section className="moradores-card central-pendencias">
            <div className="section-title-row">
              <div>
                <h2>Central de Pendências</h2>
                <p>Resumo operacional de convites, auditorias e cadastros.</p>
              </div>

              <button
                type="button"
                className="btn-resolver"
                onClick={processarFila}
                disabled={processando}
              >
                <Send size={15} />
                Processar fila
              </button>
            </div>
          </section>

          <section className="moradores-card todos-card">
            <div className="moradores-filters">
              <label className="search-field">
                <Search size={16} />
                <input
                  value={busca}
                  onChange={(e) => {
                    setBusca(e.target.value);
                    setPagina(1);
                  }}
                  placeholder="Buscar..."
                />
              </label>

              <button type="button" className="btn-limpar" onClick={limparFiltros}>
                <Filter size={15} />
                Limpar
              </button>
            </div>

            <div className="moradores-table desktop-table">
              <table>
                <thead>
                  <tr>
                    <th>Morador</th>
                    <th>Unidade</th>
                    <th>Torre</th>
                    <th>Status</th>
                    <th>Convite</th>
                    <th>Saúde</th>
                    <th>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7">Carregando...</td>
                    </tr>
                  ) : listaPaginada.length === 0 ? (
                    <tr>
                      <td colSpan="7">Nenhum registro encontrado.</td>
                    </tr>
                  ) : (
                    listaPaginada.map((item) => (
                      <tr key={`${item.origem_registro}-${item.id}`}>
                        <td>{item.nome}</td>
                        <td>{item.unidade_nome}</td>
                        <td>{item.torre_nome}</td>
                        <td>{labelStatus(item.status_principal)}</td>
                        <td>{labelStatus(item.status_convite)}</td>
                        <td>{item.percentual_preenchimento || 0}%</td>
                        <td>
                          <div className="table-actions">
                            <button type="button">
                              <Eye size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => aprovarMorador(item)}
                              disabled={processando}
                            >
                              <CheckCircle size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => reenviarConvite(item)}
                              disabled={processando}
                            >
                              <Send size={15} />
                            </button>

                            <button type="button">
                              <MoreVertical size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>

        <aside className="moradores-aside">
          <section className="aside-card atalhos">
            <h2>Atalhos rápidos</h2>

            <button type="button" onClick={() => setModalNovo(true)}>
              <Mail size={15} />
              Enviar convite individual
            </button>

            <button type="button" onClick={() => inputArquivoRef.current?.click()}>
              <Upload size={15} />
              Importar XLSX
            </button>

            <button type="button" onClick={baixarModeloXLSX}>
              <Download size={15} />
              Baixar modelo
            </button>
          </section>
        </aside>
      </div>

      {modalNovo && (
        <div className="modal-overlay">
          <div className="modal-card modal-morador-premium">
            <div className="modal-header-premium">
              <div>
                <h2>Novo Morador</h2>
                <p>Pré-cadastro do morador responsável.</p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => {
                  setModalNovo(false);
                  limparFormularioNovo();
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-grid modal-grid-premium">
              <label className="span-2">
                Nome completo *
                <input
                  value={novoMorador.nome}
                  onChange={(e) =>
                    atualizarNovoMorador("nome", formatarNomeProprio(e.target.value))
                  }
                  placeholder="Ex: Fernanda Lima"
                />
              </label>

              <label className="span-2">
                E-mail *
                <input
                  type="email"
                  value={novoMorador.email}
                  onChange={(e) =>
                    atualizarNovoMorador("email", normalizarEmail(e.target.value))
                  }
                />
              </label>

              <div className="telefone-grid span-2">
                <label>
                  DDI *
                  <input
                    value={novoMorador.ddi}
                    onChange={(e) =>
                      atualizarNovoMorador("ddi", formatarDDI(e.target.value))
                    }
                    placeholder="+55"
                  />
                </label>

                <label className="span-2">
                  Telefone / WhatsApp *
                  <input
                    inputMode="numeric"
                    value={novoMorador.telefone}
                    onChange={(e) =>
                      atualizarNovoMorador(
                        "telefone",
                        formatarTelefone(e.target.value)
                      )
                    }
                    placeholder="(11) 99999-9999"
                  />
                </label>
              </div>

              <label>
                Torre *
                <select
                  value={novoMorador.torre_bloco}
                  onChange={(e) =>
                    atualizarNovoMorador("torre_bloco", e.target.value)
                  }
                >
                  <option value="">Selecione</option>

                  {torresDisponiveis.map((torre) => (
                    <option key={torre.value} value={torre.value}>
                      {torre.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Unidade *
                <input
                  value={novoMorador.unidade}
                  onChange={(e) =>
                    atualizarNovoMorador("unidade", e.target.value)
                  }
                />
              </label>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setModalNovo(false);
                  limparFormularioNovo();
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => enviarConviteIndividual(false)}
                disabled={processando}
              >
                Salvar fila
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={() => enviarConviteIndividual(true)}
                disabled={processando}
              >
                Enviar agora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}