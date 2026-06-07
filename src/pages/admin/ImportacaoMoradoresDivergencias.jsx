import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Filter,
  RefreshCcw,
  Search,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import { supabase } from "../../services/supabase";
import { atualizarPreCadastroMorador } from "../../services/cadastroMoradorService";

import {
  listarDivergenciasMoradores,
  resolverDivergenciaMorador,
  ignorarDivergenciaMorador,
  cancelarDivergenciaMorador,
} from "../../services/importacaoMoradoresDivergenciasService";

import ModalEditarMorador from "../../components/cadastroMorador/ModalEditarMorador";

import "./ImportacaoMoradoresDivergencias.css";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "pendente", label: "Pendentes" },
  { value: "resolvida", label: "Resolvidas" },
  { value: "ignorada", label: "Ignoradas" },
  { value: "cancelada", label: "Canceladas" },
  { value: "todos", label: "Todos" },
];

const SEVERIDADE_OPTIONS = [
  { value: "todos", label: "Todas severidades" },
  { value: "critica", label: "Crítica" },
  { value: "alta", label: "Alta" },
  { value: "media", label: "Média" },
  { value: "baixa", label: "Baixa" },
];

const MOTIVOS_OPTIONS = [
  { value: "todos", label: "Todos motivos" },
  { value: "TORRE_NAO_ENCONTRADA", label: "Torre não encontrada" },
  { value: "UNIDADE_NAO_ENCONTRADA", label: "Unidade não encontrada" },
  { value: "UNIDADE_COM_NOME_DIFERENTE", label: "Nome diferente na unidade" },
  { value: "UNIDADE_COM_MORADOR_APROVADO", label: "Morador aprovado na unidade" },
  { value: "EMAIL_INVALIDO", label: "E-mail inválido" },
  { value: "WHATSAPP_INVALIDO", label: "WhatsApp inválido" },
  { value: "EMAIL_NAO_IDENTIFICADO", label: "E-mail não identificado" },
  { value: "TELEFONE_NAO_IDENTIFICADO", label: "Telefone não identificado" },
  { value: "ERRO_PROCESSAMENTO_LINHA", label: "Erro no processamento" },
];

function formatarDataBR(data) {
  if (!data) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(data));
}

function labelStatus(status = "") {
  const mapa = {
    pendente: "Pendente",
    resolvida: "Resolvida",
    ignorada: "Ignorada",
    cancelada: "Cancelada",
  };

  return mapa[status] || status || "—";
}

function labelSeveridade(severidade = "") {
  const mapa = {
    critica: "Crítica",
    alta: "Alta",
    media: "Média",
    baixa: "Baixa",
  };

  return mapa[severidade] || severidade || "—";
}

function formatarMotivoVisual(motivo = "") {
  return String(motivo || "—").replaceAll("_", " ");
}

function formatarTelefoneVisual(valor = "") {
  const numero = String(valor || "").replace(/\D/g, "");

  if (!numero) return "—";

  if (numero.startsWith("55") && numero.length >= 12) {
    const local = numero.slice(2);
    const ddd = local.slice(0, 2);
    const parte1 = local.length === 11 ? local.slice(2, 7) : local.slice(2, 6);
    const parte2 = local.length === 11 ? local.slice(7, 11) : local.slice(6, 10);

    return `+55 (${ddd}) ${parte1}-${parte2}`;
  }

  if (numero.length > 10) {
    return `+${numero}`;
  }

  return valor || "—";
}

function obterCadastroAtual(divergencia = {}) {
  return divergencia.registro_existente || {};
}

export default function ImportacaoMoradoresDivergencias({ perfil }) {
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(false);

  const [divergencias, setDivergencias] = useState([]);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("pendente");
  const [motivo, setMotivo] = useState("todos");
  const [severidade, setSeveridade] = useState("todos");
  const [pagina, setPagina] = useState(1);

  const [modalDetalhes, setModalDetalhes] = useState(false);
  const [divergenciaSelecionada, setDivergenciaSelecionada] = useState(null);

  const [modalAcao, setModalAcao] = useState(false);
  const [tipoAcao, setTipoAcao] = useState(null);
  const [observacao, setObservacao] = useState("");

  const [painelRevisaoAberto, setPainelRevisaoAberto] = useState(false);
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [moradorEdicao, setMoradorEdicao] = useState(null);
  const [condominio, setCondominio] = useState(null);
  const [torres, setTorres] = useState([]);
  const [preCadastros, setPreCadastros] = useState([]);

  const condominioId = perfil?.condominio_id;

  useEffect(() => {
    carregarDivergencias();
  }, [condominioId, status, motivo, severidade]);

  useEffect(() => {
    carregarDadosAuxiliares();
  }, [condominioId]);

  async function carregarDadosAuxiliares() {
    if (!condominioId) return;

    const [condominioResult, torresResult, preCadastrosResult] =
      await Promise.all([
        supabase
          .from("condominios")
          .select("*")
          .eq("id", condominioId)
          .maybeSingle(),

        supabase
          .from("torres")
          .select("id, business_id, condominio_id, nome, identificador")
          .eq("condominio_id", condominioId)
          .order("nome", { ascending: true }),

        supabase
          .from("pre_cadastro_moradores")
          .select("*")
          .eq("condominio_id", condominioId)
          .order("criado_em", { ascending: false }),
      ]);

    if (condominioResult.error) throw condominioResult.error;
    if (torresResult.error) throw torresResult.error;
    if (preCadastrosResult.error) throw preCadastrosResult.error;

    setCondominio(condominioResult.data || null);
    setTorres(torresResult.data || []);
    setPreCadastros(preCadastrosResult.data || []);
  }

  useEffect(() => {
    if (!modalDetalhes && !modalAcao) return;

    function handleEsc(event) {
      if (event.key !== "Escape") return;

      if (modalDetalhes) {
        fecharDetalhes();
        return;
      }

      if (modalAcao) {
        fecharAcao();
      }
    }

    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [modalDetalhes, modalAcao, processando]);

  async function carregarDivergencias() {
    if (!condominioId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const data = await listarDivergenciasMoradores({
        condominioId,
        status,
        motivo,
        severidade,
        termo: busca,
      });

      setDivergencias(data || []);
      setPagina(1);
    } catch (error) {
      console.error("Erro ao carregar divergências:", error);
      toast.error("Não foi possível carregar as divergências.");
    } finally {
      setLoading(false);
    }
  }

  function limparFiltros() {
    setBusca("");
    setStatus("pendente");
    setMotivo("todos");
    setSeveridade("todos");
    setPagina(1);
  }

  const listaFiltrada = useMemo(() => {
    const termo = String(busca || "").toLowerCase().trim();

    if (!termo) return divergencias;

    return divergencias.filter((item) => {
      const texto = [
        item.lote_id,
        item.nome_informado,
        item.email_informado,
        item.telefone_informado,
        item.torre_informada,
        item.unidade_informada,
        item.motivo,
        item.orientacao,
        item.severidade,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return texto.includes(termo);
    });
  }, [divergencias, busca]);

  const indicadores = useMemo(() => {
    return {
      total: divergencias.length,
      pendentes: divergencias.filter((item) => item.status_divergencia === "pendente").length,
      criticas: divergencias.filter(
        (item) => item.severidade === "critica" || item.severidade === "alta"
      ).length,
      resolvidas: divergencias.filter((item) => item.status_divergencia === "resolvida").length,
    };
  }, [divergencias]);

  const totalPaginas = Math.max(1, Math.ceil(listaFiltrada.length / PAGE_SIZE));

  const listaPaginada = listaFiltrada.slice(
    (pagina - 1) * PAGE_SIZE,
    pagina * PAGE_SIZE
  );
    function abrirDetalhes(item) {
    setDivergenciaSelecionada(item);
    setModalDetalhes(true);
  }

  function fecharDetalhes() {
    setModalDetalhes(false);
    setDivergenciaSelecionada(null);
    setPainelRevisaoAberto(false);
  }

  function abrirAcao(tipo, item) {
    setTipoAcao(tipo);
    setDivergenciaSelecionada(item);
    setObservacao("");
    setModalAcao(true);
  }

  function fecharAcao() {
    if (processando) return;

    setModalAcao(false);
    setTipoAcao(null);
    setDivergenciaSelecionada(null);
    setObservacao("");
  }

  function abrirPainelRevisao() {
    setPainelRevisaoAberto(true);
  }

  function fecharPainelRevisao() {
    setPainelRevisaoAberto(false);
  }

  function abrirEdicaoPorDivergencia() {
    const registroAtual = obterCadastroAtual(divergenciaSelecionada);

    if (!registroAtual?.id) {
      toast.error("Não foi possível localizar o pré-cadastro atual para edição.");
      return;
    }

    const moradorFormatado = {
      id: registroAtual.id,
      pre_cadastro_id: registroAtual.id,
      nome: registroAtual.nome || "",
      email: registroAtual.email || "",
      telefone: registroAtual.telefone || "",
      torre_nome: registroAtual.torre || "",
      unidade_nome: registroAtual.unidade || "",
      unidade_id: registroAtual.unidade_id || null,
      raw: registroAtual,
    };

    setMoradorEdicao(moradorFormatado);
    setModalEditarAberto(true);
  }

  function fecharModalEditar() {
    setModalEditarAberto(false);
    setMoradorEdicao(null);
  }

  async function confirmarAcao() {
    if (!divergenciaSelecionada) return;

    try {
      setProcessando(true);

      if (tipoAcao === "resolver") {
        await resolverDivergenciaMorador({
          divergencia: divergenciaSelecionada,
          perfil,
          observacao:
            observacao || "Divergência analisada e marcada como resolvida.",
        });

        toast.success("Divergência marcada como resolvida.");
      }

      if (tipoAcao === "ignorar") {
        await ignorarDivergenciaMorador({
          divergencia: divergenciaSelecionada,
          perfil,
          observacao,
        });

        toast.success("Divergência ignorada com justificativa.");
      }

      if (tipoAcao === "cancelar") {
        await cancelarDivergenciaMorador({
          divergencia: divergenciaSelecionada,
          perfil,
          observacao,
        });

        toast.success("Divergência cancelada.");
      }

      fecharAcao();
      await carregarDivergencias();
    } catch (error) {
      console.error("Erro ao executar ação da divergência:", error);
      toast.error(error.message || "Não foi possível executar a ação.");
    } finally {
      setProcessando(false);
    }
  }

  const tituloAcao = {
    resolver: "Resolver divergência",
    ignorar: "Ignorar divergência",
    cancelar: "Cancelar divergência",
  }[tipoAcao];

  const descricaoAcao = {
    resolver:
      "Use esta opção quando a divergência já foi analisada e não precisa mais aparecer como pendente.",
    ignorar:
      "Use esta opção quando a divergência não deve ser tratada, mas precisa manter histórico.",
    cancelar:
      "Use esta opção quando a divergência foi criada por teste, duplicidade ou erro operacional.",
  }[tipoAcao];

  async function salvarEdicaoMorador(payload) {
    await atualizarPreCadastroMorador({
      perfil,
      condominio,
      preCadastroId: payload.id,
      dadosAntes: payload.dados_antes,
      dadosDepois: payload.dados_depois,
      metadadosEdicao: payload.metadados_edicao,
    });

    fecharModalEditar();

    toast.success(
      "Pré-cadastro ajustado. Revise a divergência antes de marcar como resolvida."
    );

    await carregarDadosAuxiliares();
    await carregarDivergencias();
  }

  return (
    <div className="divmor-page">
      <div className="divmor-shell">
        <main className="divmor-main">
          <div className="divmor-breadcrumb">
            <span>Início</span>
            <span>›</span>
            <span>Cadastro</span>
            <span>›</span>
            <span>Moradores</span>
            <span>›</span>
            <strong>Divergências</strong>
          </div>

          <section className="divmor-hero">
            <div>
              <span className="divmor-kicker">Importação de Moradores</span>
              <h1>Divergências de Importação</h1>
              <p>
                Acompanhe inconsistências encontradas em importações XLSX/PDF,
                sem bloquear os registros válidos.
              </p>
            </div>

            <button
              type="button"
              className="divmor-btn secondary"
              onClick={carregarDivergencias}
              disabled={loading || processando}
            >
              <RefreshCcw size={17} />
              Atualizar
            </button>
          </section>

          <section className="divmor-kpis">
            <article className="divmor-kpi blue">
              <ShieldAlert size={22} />
              <div>
                <span>Total filtrado</span>
                <strong>{indicadores.total}</strong>
              </div>
            </article>

            <article className="divmor-kpi orange">
              <AlertTriangle size={22} />
              <div>
                <span>Pendentes</span>
                <strong>{indicadores.pendentes}</strong>
              </div>
            </article>

            <article className="divmor-kpi red">
              <XCircle size={22} />
              <div>
                <span>Críticas/Altas</span>
                <strong>{indicadores.criticas}</strong>
              </div>
            </article>

            <article className="divmor-kpi green">
              <CheckCircle2 size={22} />
              <div>
                <span>Resolvidas</span>
                <strong>{indicadores.resolvidas}</strong>
              </div>
            </article>
          </section>

          <section className="divmor-card">
            <div className="divmor-card-head">
              <div>
                <h2>Lista de divergências</h2>
                <p>
                  Trate divergências sem perder o lote original da importação.
                </p>
              </div>
            </div>

            <div className="divmor-filters">
              <label className="divmor-search">
                <Search size={16} />
                <input
                  value={busca}
                  onChange={(event) => {
                    setBusca(event.target.value);
                    setPagina(1);
                  }}
                  placeholder="Buscar por lote, nome, e-mail, telefone, torre, unidade..."
                />
              </label>

              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPagina(1);
                }}
              >
                {STATUS_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <select
                value={motivo}
                onChange={(event) => {
                  setMotivo(event.target.value);
                  setPagina(1);
                }}
              >
                {MOTIVOS_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <select
                value={severidade}
                onChange={(event) => {
                  setSeveridade(event.target.value);
                  setPagina(1);
                }}
              >
                {SEVERIDADE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <button type="button" onClick={limparFiltros}>
                <Filter size={15} />
                Limpar
              </button>
            </div>

            <div className="divmor-table-wrap">
              <table className="divmor-table">
                <thead>
                  <tr>
                    <th>Lote</th>
                    <th>Linha</th>
                    <th>Torre/AP</th>
                    <th>Nome informado</th>
                    <th>Motivo</th>
                    <th>Severidade</th>
                    <th>Status</th>
                    <th>Data</th>
                    <th>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="9">Carregando divergências...</td>
                    </tr>
                  ) : listaPaginada.length === 0 ? (
                    <tr>
                      <td colSpan="9">Nenhuma divergência encontrada.</td>
                    </tr>
                  ) : (
                    listaPaginada.map((item) => (
                      <tr key={item.id}>
                        <td data-label="Lote">
                          <span className="divmor-lote">{item.lote_id}</span>
                        </td>

                        <td data-label="Linha">
                          {item.linha_planilha || "—"}
                        </td>

                        <td data-label="Torre/AP">
                          <strong>
                            {item.torre_informada || "—"} /{" "}
                            {item.unidade_informada || "—"}
                          </strong>
                        </td>

                        <td data-label="Nome">
                          <div className="divmor-person">
                            <strong>{item.nome_informado || "—"}</strong>
                            <small>{item.email_informado || "Sem e-mail"}</small>
                          </div>
                        </td>

                        <td data-label="Motivo">
                          <span className="divmor-motivo">
                            {formatarMotivoVisual(item.motivo)}
                          </span>
                        </td>

                        <td data-label="Severidade">
                          <span
                            className={`divmor-severity ${String(
                              item.severidade || "media"
                            ).toLowerCase()}`}
                          >
                            {labelSeveridade(item.severidade)}
                          </span>
                        </td>

                        <td data-label="Status">
                          <span
                            className={`divmor-status ${String(
                              item.status_divergencia || "pendente"
                            ).toLowerCase()}`}
                          >
                            {labelStatus(item.status_divergencia)}
                          </span>
                        </td>

                        <td data-label="Data">
                          {formatarDataBR(item.criado_em)}
                        </td>

                        <td data-label="Ações">
                          <div className="divmor-row-actions">
                            <button
                              type="button"
                              title="Visualizar detalhes"
                              onClick={() => abrirDetalhes(item)}
                            >
                              <Eye size={15} />
                            </button>

                            {item.status_divergencia === "pendente" ? (
                              <>
                                <button
                                  type="button"
                                  title="Resolver"
                                  onClick={() => abrirAcao("resolver", item)}
                                >
                                  <CheckCircle2 size={15} />
                                </button>

                                <button
                                  type="button"
                                  title="Ignorar"
                                  onClick={() => abrirAcao("ignorar", item)}
                                >
                                  <ShieldAlert size={15} />
                                </button>

                                <button
                                  type="button"
                                  title="Cancelar"
                                  onClick={() => abrirAcao("cancelar", item)}
                                >
                                  <XCircle size={15} />
                                </button>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="divmor-pagination">
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
                  onClick={() =>
                    setPagina((old) => Math.min(totalPaginas, old + 1))
                  }
                >
                  Próxima
                </button>
              </div>
            </div>
          </section>
        </main>

        <aside className="divmor-aside">
          <section className="divmor-side-card highlight">
            <span>Controle operacional</span>
            <h3>Divergências sem travar importação</h3>
            <p>
              O Sistema Chegou! processa registros válidos e separa conflitos
              para análise posterior.
            </p>
          </section>

          <section className="divmor-side-card">
            <h3>Boas práticas</h3>

            <ul>
              <li>Resolva divergências após confirmar a origem da informação.</li>
              <li>Não ignore divergência crítica sem justificativa.</li>
              <li>Use o lote para rastrear a importação original.</li>
              <li>Reprocessamento será tratado em etapa futura.</li>
            </ul>
          </section>
        </aside>
      </div>
            {modalDetalhes && divergenciaSelecionada ? (
        <div className="divmor-modal-overlay" role="dialog" aria-modal="true">
          <div className="divmor-modal">
            <button
              type="button"
              className="divmor-modal-close"
              onClick={fecharDetalhes}
              aria-label="Fechar modal"
            >
              ×
            </button>

            <div className="divmor-modal-header">
              <div className="divmor-modal-icon">
                <AlertTriangle size={22} />
              </div>

              <div>
                <span>Divergência de importação</span>
                <h3>Existe conflito nesta unidade</h3>
              </div>
            </div>

            <div
              className={
                painelRevisaoAberto
                  ? "divmor-modal-body divmor-review-layout"
                  : "divmor-modal-body"
              }
            >
              <div className="divmor-review-main">
                <div className="divmor-easy-alert">
                  <strong>O que aconteceu?</strong>
                  <p>
                    O arquivo importado trouxe um morador diferente para uma unidade
                    que já possui pré-cadastro no sistema. Antes de alterar qualquer
                    dado, revise as informações abaixo.
                  </p>
                </div>

                <div className="divmor-compare-grid">
                  <section className="divmor-compare-card atual">
                    <span>Cadastro atual no sistema</span>
                    <h4>{obterCadastroAtual(divergenciaSelecionada)?.nome || "—"}</h4>

                    <p>
                      <small>Torre/Bloco</small>
                      <strong>
                        {obterCadastroAtual(divergenciaSelecionada)?.torre || "—"} /{" "}
                        {obterCadastroAtual(divergenciaSelecionada)?.unidade || "—"}
                      </strong>
                    </p>

                    <p>
                      <small>E-mail</small>
                      <strong>{obterCadastroAtual(divergenciaSelecionada)?.email || "—"}</strong>
                    </p>

                    <p>
                      <small>WhatsApp</small>
                      <strong>
                        {formatarTelefoneVisual(
                          obterCadastroAtual(divergenciaSelecionada)?.telefone
                        )}
                      </strong>
                    </p>
                  </section>

                  <section className="divmor-compare-card importado">
                    <span>Dados vindos do arquivo</span>
                    <h4>{divergenciaSelecionada.nome_informado || "—"}</h4>

                    <p>
                      <small>Torre/Bloco</small>
                      <strong>
                        {divergenciaSelecionada.torre_informada || "—"} /{" "}
                        {divergenciaSelecionada.unidade_informada || "—"}
                      </strong>
                    </p>

                    <p>
                      <small>E-mail</small>
                      <strong>{divergenciaSelecionada.email_informado || "—"}</strong>
                    </p>

                    <p>
                      <small>WhatsApp</small>
                      <strong>
                        {formatarTelefoneVisual(divergenciaSelecionada.telefone_informado)}
                      </strong>
                    </p>
                  </section>
                </div>

                <div className="divmor-orientation-box">
                  <strong>Orientação para o administrativo</strong>
                  <p>
                    {divergenciaSelecionada.orientacao ||
                      "Revise os dados antes de continuar."}
                  </p>

                  <ul>
                    <li>
                      Se o cadastro atual estiver correto, mantenha o registro e ignore esta divergência.
                    </li>
                    <li>
                      Se o arquivo estiver correto, abra a edição do pré-cadastro para ajustar com segurança.
                    </li>
                    <li>
                      Se houver dúvida, mantenha pendente e encaminhe para análise interna.
                    </li>
                  </ul>
                </div>

                <div className="divmor-info-row">
                  <p>
                    <small>Motivo identificado</small>
                    <strong>{formatarMotivoVisual(divergenciaSelecionada.motivo)}</strong>
                  </p>

                  <p>
                    <small>Severidade</small>
                    <strong>{labelSeveridade(divergenciaSelecionada.severidade)}</strong>
                  </p>

                  <p>
                    <small>Criado em</small>
                    <strong>{formatarDataBR(divergenciaSelecionada.criado_em)}</strong>
                  </p>
                </div>

                {divergenciaSelecionada.status_divergencia !== "pendente" ? (
                  <div className="divmor-resolution-box">
                    <strong>Tratativa realizada</strong>

                    <div className="divmor-resolution-grid">
                      <p>
                        <small>Status</small>
                        <strong>{labelStatus(divergenciaSelecionada.status_divergencia)}</strong>
                      </p>

                      <p>
                        <small>Quando</small>
                        <strong>{formatarDataBR(divergenciaSelecionada.resolvida_em)}</strong>
                      </p>

                      <p>
                        <small>Responsável</small>
                        <strong>
                          {divergenciaSelecionada.usuario_resolucao?.nome ||
                            divergenciaSelecionada.criado_por_nome ||
                            divergenciaSelecionada.criado_por_email ||
                            "—"}
                        </strong>
                      </p>
                    </div>

                    <p className="divmor-resolution-note">
                      <small>Justificativa / observação</small>
                      <strong>{divergenciaSelecionada.observacao_resolucao || "—"}</strong>
                    </p>
                  </div>
                ) : null}
              </div>

              {painelRevisaoAberto ? (
                <aside className="divmor-review-panel">
                  <div className="divmor-review-panel-head">
                    <span>Revisão guiada</span>
                    <h4>O que deseja fazer?</h4>
                    <p>
                      Escolha a ação mais segura para esta divergência. Nenhuma alteração
                      será feita sem confirmação.
                    </p>
                  </div>

                  <div className="divmor-review-options">
                    <button
                      type="button"
                      className="divmor-review-option"
                      onClick={() => {
                        setModalDetalhes(false);
                        abrirAcao("ignorar", divergenciaSelecionada);
                      }}
                    >
                      <strong>Manter cadastro atual</strong>
                      <span>
                        Use quando o cadastro do sistema está correto e o arquivo trouxe
                        informação antiga ou errada.
                      </span>
                    </button>

                    <button
                      type="button"
                      className="divmor-review-option primary"
                      onClick={abrirEdicaoPorDivergencia}
                    >
                      <strong>Usar dados importados</strong>
                      <span>
                        Abre a edição do pré-cadastro atual para revisar e ajustar os dados
                        com segurança.
                      </span>
                    </button>

                    <button
                      type="button"
                      className="divmor-review-option"
                      onClick={fecharPainelRevisao}
                    >
                      <strong>Ainda preciso analisar</strong>
                      <span>
                        Fecha este painel e mantém a divergência pendente para análise
                        posterior.
                      </span>
                    </button>
                  </div>
                </aside>
              ) : null}
            </div>

            <div className="divmor-modal-actions">
              <button
                type="button"
                className="divmor-btn secondary"
                onClick={fecharDetalhes}
              >
                Fechar
              </button>

              {divergenciaSelecionada.status_divergencia === "pendente" ? (
                <>
                  <button
                    type="button"
                    className="divmor-btn primary"
                    onClick={abrirPainelRevisao}
                  >
                    Revisar e ajustar
                  </button>

                  <button
                    type="button"
                    className="divmor-btn secondary"
                    onClick={() => {
                      setModalDetalhes(false);
                      abrirAcao("resolver", divergenciaSelecionada);
                    }}
                  >
                    Marcar como resolvida
                  </button>

                  <button
                    type="button"
                    className="divmor-btn secondary"
                    onClick={() => {
                      setModalDetalhes(false);
                      abrirAcao("ignorar", divergenciaSelecionada);
                    }}
                  >
                    Ignorar com justificativa
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {modalAcao && divergenciaSelecionada ? (
        <div className="divmor-modal-overlay" role="dialog" aria-modal="true">
          <div className="divmor-modal small">
            <button
              type="button"
              className="divmor-modal-close"
              onClick={fecharAcao}
              disabled={processando}
              aria-label="Fechar modal"
            >
              ×
            </button>

            <div className="divmor-modal-header">
              <div className="divmor-modal-icon">
                <ShieldAlert size={22} />
              </div>

              <div>
                <span>Ação da divergência</span>
                <h3>{tituloAcao}</h3>
              </div>
            </div>

            <div className="divmor-modal-body">
              <p className="divmor-action-description">{descricaoAcao}</p>

              <div className="divmor-action-context">
                <p>
                  <small>Morador</small>
                  <strong>{divergenciaSelecionada.nome_informado || "—"}</strong>
                </p>

                <p>
                  <small>Unidade</small>
                  <strong>
                    {divergenciaSelecionada.torre_informada || "—"} /{" "}
                    {divergenciaSelecionada.unidade_informada || "—"}
                  </strong>
                </p>

                <p>
                  <small>Motivo</small>
                  <strong>
                    {formatarMotivoVisual(divergenciaSelecionada.motivo)}
                  </strong>
                </p>
              </div>

              <label className="divmor-field">
                <span>
                  {tipoAcao === "resolver"
                    ? "Observação da resolução"
                    : "Justificativa *"}
                </span>

                <textarea
                  value={observacao}
                  onChange={(event) => setObservacao(event.target.value)}
                  rows={4}
                  placeholder={
                    tipoAcao === "resolver"
                      ? "Ex.: conferido manualmente com a administradora."
                      : "Informe o motivo desta ação."
                  }
                />
              </label>
            </div>

            <div className="divmor-modal-actions">
              <button
                type="button"
                className="divmor-btn secondary"
                onClick={fecharAcao}
                disabled={processando}
              >
                Voltar
              </button>

              <button
                type="button"
                className={
                  tipoAcao === "cancelar"
                    ? "divmor-btn danger"
                    : "divmor-btn primary"
                }
                onClick={confirmarAcao}
                disabled={processando}
              >
                {processando ? "Processando..." : tituloAcao}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modalEditarAberto ? (
        <div className="divmor-edit-modal-layer">
          <ModalEditarMorador
            aberto={modalEditarAberto}
            morador={moradorEdicao}
            torres={torres}
            preCadastros={preCadastros}
            onClose={fecharModalEditar}
            onSalvar={salvarEdicaoMorador}
          />
        </div>
      ) : null}

    </div>
  );
}