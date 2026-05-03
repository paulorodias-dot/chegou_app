import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  Check,
  CheckCircle,
  ClipboardCheck,
  Clock,
  Download,
  Eye,
  FileCheck2,
  FileText,
  ListChecks,
  RefreshCcw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { supabase } from "../../services/supabase";
import ModalChegou from "../../components/common/ModalChegou";
import "./AuditoriaCondominios.css";

const PAGE_SIZE = 5;

const statusLabel = {
  pendente: "Pendente",
  em_validacao: "Em validação",
  em_correcao: "Em correção",
  ativo: "Aprovado",
  rejeitado: "Rejeitado",
};

const tipoLabel = {
  residencial: "Residencial",
  comercial: "Comercial",
  misto: "Misto",
};

export default function AuditoriaCondominios() {
  const [loading, setLoading] = useState(true);
  const [condominios, setCondominios] = useState([]);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("pendente");
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [pagina, setPagina] = useState(1);
  const [modalDetalhes, setModalDetalhes] = useState(null);
  const [modalAcao, setModalAcao] = useState(null);
  const [modalRejeicao, setModalRejeicao] = useState(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState("");
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    carregarCondominios();
  }, []);

  async function carregarCondominios() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("condominios")
        .select(`
          id,
          cnpj,
          codigo_condominio,
          razao_social,
          nome_fantasia,
          email_condominio,
          telefone_condominio,
          tipo_condominio,
          quantidade_unidades,
          quantidade_blocos,
          status_cadastro,
          motivo_rejeicao,
          rejeitado_em,
          aprovado_em,
          auditoria_observacao,
          criado_em,
          atualizado_em,
          enderecos (
            cidade,
            estado
          ),
          responsavel_logistica (
            nome,
            email,
            telefone,
            funcao
          ),
          aceites_termos (
            versao_termos,
            versao_privacidade,
            aceito_em,
            user_agent
          )
        `)
        .order("atualizado_em", { ascending: false });

      if (error) throw error;

      setCondominios(data || []);
    } catch (error) {
      console.error("Erro ao carregar auditoria:", error);
      toast.error("Não foi possível carregar a auditoria.");
    } finally {
      setLoading(false);
    }
  }

  const listaFiltrada = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return condominios.filter((item) => {
      const statusOk = filtro === "todos" || item.status_cadastro === filtro;
      const tipoOk = tipoFiltro === "todos" || item.tipo_condominio === tipoFiltro;

      const dataBase = item.atualizado_em || item.criado_em;
      const dataSomente = dataBase ? dataBase.slice(0, 10) : "";

      const inicioOk = !dataInicio || dataSomente >= dataInicio;
      const fimOk = !dataFim || dataSomente <= dataFim;

      const texto = [
        item.nome_fantasia,
        item.razao_social,
        item.cnpj,
        item.codigo_condominio,
        item.email_condominio,
        item.responsavel_logistica?.[0]?.nome,
        item.responsavel_logistica?.[0]?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return statusOk && tipoOk && inicioOk && fimOk && (!termo || texto.includes(termo));
    });
  }, [condominios, busca, filtro, tipoFiltro, dataInicio, dataFim]);

  const totalPaginas = Math.max(1, Math.ceil(listaFiltrada.length / PAGE_SIZE));

  const listaPaginada = listaFiltrada.slice(
    (pagina - 1) * PAGE_SIZE,
    pagina * PAGE_SIZE
  );

  const indicadores = useMemo(() => {
    return {
      pendentes: condominios.filter((c) => c.status_cadastro === "pendente").length,
      validacao: condominios.filter((c) => c.status_cadastro === "em_validacao").length,
      correcao: condominios.filter((c) => c.status_cadastro === "em_correcao").length,
      aprovados: condominios.filter((c) => c.status_cadastro === "ativo").length,
      rejeitados: condominios.filter((c) => c.status_cadastro === "rejeitado").length,
      total: condominios.length,
      comAceite: condominios.filter((c) => c.aceites_termos?.length > 0).length,
    };
  }, [condominios]);

  const taxaConformidade = useMemo(() => {
    if (!condominios.length) return 0;
    return Math.round((indicadores.comAceite / condominios.length) * 100);
  }, [condominios.length, indicadores.comAceite]);

  const atividadesRecentes = useMemo(() => {
    return condominios
      .slice()
      .sort(
        (a, b) =>
          new Date(b.atualizado_em || b.criado_em).getTime() -
          new Date(a.atualizado_em || a.criado_em).getTime()
      )
      .slice(0, 3);
  }, [condominios]);

  function trocarFiltro(status) {
    setFiltro(status);
    setPagina(1);
  }

  function formatarData(data) {
    if (!data) return "-";

    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(data));
  }

  function responsavelPrincipal(item) {
    return item.responsavel_logistica?.[0] || null;
  }

  function aceitePrincipal(item) {
    return item.aceites_termos?.[0] || null;
  }

  function abrirAcao(item, acao) {
    if (acao === "rejeitar") {
      setMotivoRejeicao(item.motivo_rejeicao || "");
      setModalRejeicao(item);
      return;
    }

    setModalAcao({ item, acao });
  }

  function exportarCSV() {
    if (!listaFiltrada.length) {
      toast("Não há dados para exportar.", { icon: "⚠️" });
      return;
    }

    const linhas = listaFiltrada.map((item) => {
      const responsavel = responsavelPrincipal(item);
      const aceite = aceitePrincipal(item);

      return {
        condominio: item.nome_fantasia || item.razao_social || "",
        cnpj: item.cnpj || "",
        codigo: item.codigo_condominio || "",
        responsavel: responsavel?.nome || "",
        email_responsavel: responsavel?.email || item.email_condominio || "",
        tipo: tipoLabel[item.tipo_condominio] || item.tipo_condominio || "",
        status: statusLabel[item.status_cadastro] || item.status_cadastro || "",
        aceite: aceite?.versao_termos ? `v${aceite.versao_termos}` : "Pendente",
        motivo_rejeicao: item.motivo_rejeicao || "",
        atualizado_em: formatarData(item.atualizado_em || item.criado_em),
      };
    });

    const header = Object.keys(linhas[0]).join(";");
    const body = linhas.map((linha) => Object.values(linha).join(";")).join("\n");
    const csv = `${header}\n${body}`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "auditoria-condominios.csv";
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Arquivo de auditoria exportado.");
  }

async function confirmarAcao() {
  if (!modalAcao?.item) return;

  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  const cnpjLimpo = String(modalAcao.item.cnpj || "").replace(/\D/g, "");

  if (isLocalhost && cnpjLimpo !== "123456") {
    toast.error("No localhost, somente o CNPJ de teste 123456 pode ser aprovado.");
    setModalAcao(null);
    return;
  }

  try {
    setProcessando(true);

    const { data, error } = await supabase.functions.invoke("aprovar-condominio", {
      body: {
        condominio_id: modalAcao.item.id,
      },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    toast.success("Condomínio aprovado e acesso do responsável liberado.");

    setModalAcao(null);
    await carregarCondominios();
  } catch (error) {
    console.error("Erro ao aprovar condomínio:", error);
    toast.error(error.message || "Não foi possível aprovar o condomínio.");
  } finally {
    setProcessando(false);
  }
}

  async function confirmarRejeicao() {
    if (!modalRejeicao) return;

    if (!motivoRejeicao.trim()) {
      toast.error("Informe o motivo da rejeição/correção.");
      return;
    }

    try {
      setProcessando(true);

      const agora = new Date().toISOString();

      const { error } = await supabase
        .from("condominios")
        .update({
          status_cadastro: "em_correcao",
          motivo_rejeicao: motivoRejeicao.trim(),
          rejeitado_em: agora,
          atualizado_em: agora,
        })
        .eq("id", modalRejeicao.id);

      if (error) throw error;

      toast.success("Condomínio enviado para correção.");

      setModalRejeicao(null);
      setMotivoRejeicao("");
      await carregarCondominios();
    } catch (error) {
      console.error("Erro ao rejeitar condomínio:", error);
      toast.error("Não foi possível enviar para correção.");
    } finally {
      setProcessando(false);
    }
  }

  function reenviarConviteCorrecao(item) {
    toast("Reenvio de convite de correção será ligado ao Brevo no próximo passo.", {
      icon: "📩",
    });
    console.log("Preparar reenvio de convite de correção para:", item);
  }

  return (
    <div className="auditoria-page">
      <div className="auditoria-shell">
        <main className="auditoria-content">
          <div className="auditoria-breadcrumb">
            <span>Início</span>
            <span>›</span>
            <span>Condomínios</span>
            <span>›</span>
            <strong>Aprovações e Auditoria</strong>
          </div>

          <div className="auditoria-header">
            <div>
              <h1>Aprovações e Auditoria de Condomínios</h1>
              <p>
                Gerencie todo o processo de análise, aprovação e auditoria dos
                condomínios cadastrados na plataforma.
              </p>
            </div>

            <button type="button" className="auditoria-refresh" onClick={carregarCondominios}>
              Atualizar
            </button>
          </div>

          <div className="auditoria-kpis">
            <div className="auditoria-kpi">
              <Clock size={24} />
              <div>
                <strong>{indicadores.pendentes}</strong>
                <span>Pendentes</span>
                <small>Aguardando análise</small>
              </div>
            </div>

            <div className="auditoria-kpi green">
              <CheckCircle size={24} />
              <div>
                <strong>{indicadores.aprovados}</strong>
                <span>Aprovados</span>
                <small>Cadastros liberados</small>
              </div>
            </div>

            <div className="auditoria-kpi red">
              <XCircle size={24} />
              <div>
                <strong>{indicadores.correcao}</strong>
                <span>Em correção</span>
                <small>Necessitam ajuste</small>
              </div>
            </div>

            <div className="auditoria-kpi purple">
              <ShieldCheck size={24} />
              <div>
                <strong>{indicadores.total}</strong>
                <span>Total Condomínios</span>
                <small>Cadastrados</small>
              </div>
            </div>
          </div>

          <div className="auditoria-panel">
            <div className="auditoria-tabs">
              {[
                ["pendente", "Pendentes"],
                ["em_validacao", "Em validação"],
                ["em_correcao", "Em correção"],
                ["ativo", "Aprovados"],
                ["todos", "Todos"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={filtro === value ? "active" : ""}
                  onClick={() => trocarFiltro(value)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="auditoria-filters auditoria-filters-periodo">
              <label>
                Buscar
                <div className="auditoria-search">
                  <Search size={16} />
                  <input
                    value={busca}
                    onChange={(e) => {
                      setBusca(e.target.value);
                      setPagina(1);
                    }}
                    placeholder="Nome, CNPJ ou responsável..."
                  />
                </div>
              </label>

              <label>
                Status
                <select value={filtro} onChange={(e) => trocarFiltro(e.target.value)}>
                  <option value="todos">Todos</option>
                  <option value="pendente">Pendentes</option>
                  <option value="em_validacao">Em validação</option>
                  <option value="em_correcao">Em correção</option>
                  <option value="ativo">Aprovados</option>
                  <option value="rejeitado">Rejeitados</option>
                </select>
              </label>

              <label>
                Tipo
                <select
                  value={tipoFiltro}
                  onChange={(e) => {
                    setTipoFiltro(e.target.value);
                    setPagina(1);
                  }}
                >
                  <option value="todos">Todos</option>
                  <option value="residencial">Residencial</option>
                  <option value="comercial">Comercial</option>
                  <option value="misto">Misto</option>
                </select>
              </label>

              <label>
                De
                <div className="auditoria-date">
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => {
                      setDataInicio(e.target.value);
                      setPagina(1);
                    }}
                  />
                  <CalendarDays size={16} />
                </div>
              </label>

              <label>
                Até
                <div className="auditoria-date">
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => {
                      setDataFim(e.target.value);
                      setPagina(1);
                    }}
                  />
                  <CalendarDays size={16} />
                </div>
              </label>

              <button type="button" className="btn-exportar" onClick={exportarCSV}>
                <Download size={16} />
                Exportar
              </button>
            </div>

            <div className="auditoria-table-wrap">
              <table className="auditoria-table">
                <thead>
                  <tr>
                    <th>Condomínio</th>
                    <th>Responsável</th>
                    <th>Tipo</th>
                    <th>Data da Solicitação</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="auditoria-empty">
                        Carregando auditoria...
                      </td>
                    </tr>
                  ) : listaPaginada.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="auditoria-empty">
                        Nenhum condomínio encontrado.
                      </td>
                    </tr>
                  ) : (
                    listaPaginada.map((item) => {
                      const responsavel = responsavelPrincipal(item);

                      return (
                        <tr key={item.id}>
                          <td>
                            <div className="condominio-cell">
                              <Building2 size={18} />
                              <div>
                                <strong>{item.nome_fantasia || item.razao_social || "-"}</strong>
                                <span>CNPJ: {item.cnpj || "-"}</span>
                                <small>Código: {item.codigo_condominio || "-"}</small>
                              </div>
                            </div>
                          </td>

                          <td>
                            <strong>{responsavel?.nome || "-"}</strong>
                            <span>{responsavel?.email || item.email_condominio || "-"}</span>
                            <small>{responsavel?.telefone || item.telefone_condominio || "-"}</small>
                          </td>

                          <td>{tipoLabel[item.tipo_condominio] || item.tipo_condominio || "-"}</td>

                          <td>{formatarData(item.atualizado_em || item.criado_em)}</td>

                          <td>
                            <span className={`status-pill status-${item.status_cadastro}`}>
                              {statusLabel[item.status_cadastro] || item.status_cadastro}
                            </span>
                          </td>

                          <td>
                            <div className="auditoria-actions">
                              <button type="button" title="Ver detalhes" onClick={() => setModalDetalhes(item)}>
                                <Eye size={15} />
                              </button>

                              <button
                                type="button"
                                title="Aprovar"
                                onClick={() => abrirAcao(item, "aprovar")}
                                disabled={item.status_cadastro === "ativo"}
                              >
                                <ClipboardCheck size={15} />
                              </button>

                              <button
                                type="button"
                                title="Enviar para correção"
                                onClick={() => abrirAcao(item, "rejeitar")}
                                disabled={item.status_cadastro === "ativo"}
                              >
                                <XCircle size={15} />
                              </button>

                              <button
                                type="button"
                                title="Reenviar convite de correção"
                                onClick={() => reenviarConviteCorrecao(item)}
                                disabled={item.status_cadastro !== "em_correcao"}
                              >
                                <RefreshCcw size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="auditoria-pagination">
              <span>
                Mostrando {listaPaginada.length ? (pagina - 1) * PAGE_SIZE + 1 : 0} a{" "}
                {Math.min(pagina * PAGE_SIZE, listaFiltrada.length)} de{" "}
                {listaFiltrada.length} resultado(s)
              </span>

              <div>
                <button type="button" disabled={pagina <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))}>
                  ‹
                </button>

                <strong>{pagina}</strong>

                <button
                  type="button"
                  disabled={pagina >= totalPaginas}
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                >
                  ›
                </button>
              </div>
            </div>
          </div>

          <div className="auditoria-bottom">
            <div className="auditoria-history-card">
              <div>
                <h2>Auditoria e Histórico</h2>
                <p>Acompanhe todas as ações realizadas no processo de aprovação e auditoria.</p>
              </div>

              <div className="history-kpis">
                <div>
                  <ClipboardCheck size={24} />
                  <strong>{indicadores.total}</strong>
                  <span>Auditorias Realizadas</span>
                </div>

                <div>
                  <FileText size={24} />
                  <strong>{indicadores.validacao}</strong>
                  <span>Documentos Solicitados</span>
                </div>

                <div>
                  <ShieldCheck size={24} />
                  <strong>{indicadores.aprovados}</strong>
                  <span>Pendências Resolvidas</span>
                </div>

                <div>
                  <BarChart3 size={24} />
                  <strong>{taxaConformidade}%</strong>
                  <span>Taxa de Conformidade</span>
                </div>
              </div>
            </div>

            <div className="atividades-card">
              <h2>Atividades Recentes</h2>

              {atividadesRecentes.length === 0 ? (
                <p className="atividade-empty">Nenhuma atividade recente.</p>
              ) : (
                atividadesRecentes.map((item) => (
                  <div className="atividade-item" key={item.id}>
                    <CheckCircle size={16} />
                    <div>
                      <strong>
                        {statusLabel[item.status_cadastro] || item.status_cadastro} ·{" "}
                        {item.nome_fantasia || item.razao_social || "-"}
                      </strong>
                      <span>{formatarData(item.atualizado_em || item.criado_em)} · Master</span>
                    </div>
                  </div>
                ))
              )}

              <button type="button" className="ver-atividades">
                Ver todas as atividades <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </main>

        <aside className="auditoria-aside">
          <div className="aside-card processo-card">
            <h2>Etapas do Processo</h2>

            {[
              ["1", "Solicitação", "Condomínio realiza cadastro e envia documentos"],
              ["2", "Análise", "Equipe Master analisa os dados e documentos"],
              ["3", "Aprovação", "Condomínio é aprovado e liberado na plataforma"],
              ["4", "Auditoria", "Monitoramento contínuo e auditorias periódicas"],
            ].map(([num, title, desc]) => (
              <div className="processo-item" key={num}>
                <span>{num}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="aside-card dicas-card">
            <h2>
              <ListChecks size={20} />
              Dicas para Análise
            </h2>

            {[
              "Verifique se todos os documentos obrigatórios foram anexados.",
              "Confirme a validade do CNPJ e situação cadastral na Receita Federal.",
              "Analise o contrato social e ata de eleição do síndico.",
              "Valide endereço e dados do responsável pelo condomínio.",
              "Em caso de dúvida, solicite documentos complementares pelo sistema.",
            ].map((dica) => (
              <div className="dica-item" key={dica}>
                <Check size={15} />
                <p>{dica}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <ModalChegou
        open={Boolean(modalDetalhes)}
        type="info"
        title="Detalhes da auditoria"
        description="Resumo do condomínio, responsável e aceite registrado."
        confirmText="Fechar"
        showCancel={false}
        onCancel={() => setModalDetalhes(null)}
        onConfirm={() => setModalDetalhes(null)}
      >
        {modalDetalhes && (
          <div className="auditoria-detail">
            <p><strong>Condomínio:</strong> {modalDetalhes.nome_fantasia || modalDetalhes.razao_social}</p>
            <p><strong>CNPJ:</strong> {modalDetalhes.cnpj}</p>
            <p><strong>Código:</strong> {modalDetalhes.codigo_condominio}</p>
            <p><strong>Tipo:</strong> {tipoLabel[modalDetalhes.tipo_condominio] || "-"}</p>
            <p><strong>Status:</strong> {statusLabel[modalDetalhes.status_cadastro]}</p>
            <p><strong>Responsável:</strong> {responsavelPrincipal(modalDetalhes)?.nome || "-"}</p>
            <p><strong>E-mail:</strong> {responsavelPrincipal(modalDetalhes)?.email || modalDetalhes.email_condominio || "-"}</p>
            <p><strong>Aceite:</strong> {aceitePrincipal(modalDetalhes)?.aceito_em ? formatarData(aceitePrincipal(modalDetalhes)?.aceito_em) : "Não registrado"}</p>
            <p><strong>Motivo correção:</strong> {modalDetalhes.motivo_rejeicao || "-"}</p>
          </div>
        )}
      </ModalChegou>

      <ModalChegou
        open={Boolean(modalAcao)}
        type="success"
        title="Aprovar condomínio?"
        description="Após aprovar, o condomínio ficará ativo para sequência de liberação operacional."
        confirmText="Aprovar"
        cancelText="Cancelar"
        loading={processando}
        onCancel={() => setModalAcao(null)}
        onConfirm={confirmarAcao}
      />

      <ModalChegou
        open={Boolean(modalRejeicao)}
        type="danger"
        title="Enviar cadastro para correção?"
        description="Informe o motivo. O responsável poderá receber um convite de correção sem duplicar o CNPJ."
        confirmText="Enviar para correção"
        cancelText="Cancelar"
        loading={processando}
        onCancel={() => {
          setModalRejeicao(null);
          setMotivoRejeicao("");
        }}
        onConfirm={confirmarRejeicao}
      >
        <div className="auditoria-rejeicao-box">
          <label>
            Motivo da correção/rejeição
            <textarea
              value={motivoRejeicao}
              onChange={(e) => setMotivoRejeicao(e.target.value)}
              placeholder="Ex: Dados do responsável incompletos, endereço divergente, documentação pendente..."
              rows={5}
            />
          </label>
        </div>
      </ModalChegou>
    </div>
  );
}