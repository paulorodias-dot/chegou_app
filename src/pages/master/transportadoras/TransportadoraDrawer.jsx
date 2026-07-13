import { useCallback, useEffect, useMemo, useState } from "react";
import useToast from "../../../hooks/useToast";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Building2,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  CircleGauge,
  Clock3,
  Code2,
  Edit3,
  FileClock,
  Gauge,
  History,
  LoaderCircle,
  Network,
  Package,
  Plus,
  RefreshCw,
  Route,
  ShieldCheck,
  Tag,
  TrendingUp,
  Truck,
  X,
} from "lucide-react";

import {
  alterarStatusAliasTransportadoraMaster,
  criarAliasTransportadoraMaster,
  listarAuditoriasTransportadoraMaster,
  obterDetalhesTransportadoraMaster,
  obterLogoPublicoTransportadora,
} from "../../../services/transportadorasService";

import logoPadraoLocal from "../../../assets/logo-padrao-transportadora.png";

import "./TransportadoraDrawer.css";

const ABAS = [
  {
    id: "visao-geral",
    label: "Visão Geral",
    icon: Truck,
  },
  {
    id: "indicadores",
    label: "Indicadores",
    icon: BarChart3,
  },
  {
    id: "aliases",
    label: "Aliases",
    icon: Tag,
  },
  {
    id: "integracao",
    label: "Integração",
    icon: Network,
  },
  {
    id: "auditoria",
    label: "Auditoria",
    icon: History,
  },
];

const STATUS_LABELS = {
  ATIVA: "Ativa",
  EM_OBSERVACAO: "Em observação",
  INSTAVEL: "Instável",
  BLOQUEADA: "Bloqueada",
  INATIVA: "Inativa",
};

const TIPOS_LABELS = {
  CORREIOS: "Correios",
  MARKETPLACE: "Marketplace",
  TRANSPORTADORA_PRIVADA: "Transportadora privada",
  FARMACIA: "Farmácia",
  ENTREGA_SOB_DEMANDA: "Entrega sob demanda",
  MOTOBOY: "Motoboy",
  ENTREGA_DIRETA: "Entrega direta",
  CARGA_EXPRESSA: "Carga expressa",
  OUTROS: "Outros",
};

function formatarData(data) {
  if (!data) return "Não informado";

  const valor = new Date(data);

  if (Number.isNaN(valor.getTime())) {
    return "Não informado";
  }

  return valor.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function obterClasseStatus(status) {
  return `tr-drawer-status-${String(status || "")
    .toLowerCase()
    .replaceAll("_", "-")}`;
}

function obterMensagemEvento(acao) {
  const mapa = {
    TRANSPORTADORA_CRIADA: "Transportadora cadastrada",
    TRANSPORTADORA_EDITADA: "Cadastro atualizado",
    TRANSPORTADORA_ATIVADA: "Transportadora ativada",
    TRANSPORTADORA_EM_OBSERVACAO: "Colocada em observação",
    TRANSPORTADORA_MARCADA_INSTAVEL: "Marcada como instável",
    TRANSPORTADORA_BLOQUEADA: "Transportadora bloqueada",
    TRANSPORTADORA_INATIVADA: "Transportadora inativada",
    LOGO_TRANSPORTADORA_ALTERADO: "Logotipo atualizado",
    TRANSPORTADORA_ALIAS_CRIADO: "Alias adicionado",
    TRANSPORTADORA_ALIAS_INATIVADO: "Alias inativado",
    TRANSPORTADORA_ALIAS_REATIVADO: "Alias reativado",
  };

  return mapa[acao] || acao || "Evento registrado";
}

function MiniCard({
  icon: Icon,
  label,
  valor,
  auxiliar,
  indisponivel = false,
}) {
  return (
    <article
      className={[
        "tr-drawer-mini-card",
        indisponivel ? "indisponivel" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="tr-drawer-mini-icon">
        <Icon size={18} />
      </div>

      <div>
        <span>{label}</span>
        <strong>{indisponivel ? "—" : valor}</strong>
        <small>{auxiliar}</small>
      </div>
    </article>
  );
}

function GraficoVazio({ icon: Icon, titulo, descricao }) {
  return (
    <div className="tr-drawer-chart-empty">
      <span>
        <Icon size={22} />
      </span>

      <strong>{titulo}</strong>
      <p>{descricao}</p>
    </div>
  );
}

function TransportadoraDrawer({
  aberto,
  transportadoraId,
  refreshKey = 0,
  abaInicial = "visao-geral",
  onClose,
  onEditar,
  onAlterarStatus,
  onAtualizado,
}) {

  const toast = useToast();

  const [abaAtiva, setAbaAtiva] = useState("visao-geral");

  const [detalhes, setDetalhes] = useState(null);
  const [auditorias, setAuditorias] = useState([]);

  const [carregando, setCarregando] = useState(false);
  const [carregandoAuditoria, setCarregandoAuditoria] =
    useState(false);
  const [processandoAliasId, setProcessandoAliasId] =
    useState(null);

  const [novoAlias, setNovoAlias] = useState("");
  const [salvandoAlias, setSalvandoAlias] = useState(false);

  const [erro, setErro] = useState("");
  

  const transportadora = detalhes?.transportadora || null;
  const aliases = detalhes?.aliases || [];

  const logo = useMemo(() => {
    if (!transportadora) return logoPadraoLocal;

    if (transportadora.logo_url) {
      return transportadora.logo_url;
    }

    if (transportadora.logo_storage_path) {
      return (
        obterLogoPublicoTransportadora(
          transportadora.logo_storage_path
        ) || logoPadraoLocal
      );
    }

    return logoPadraoLocal;
  }, [transportadora]);

  const carregarDetalhes = useCallback(
    async ({ silencioso = false } = {}) => {
      if (!transportadoraId) return;

      if (!silencioso) {
        setCarregando(true);
      }

      setErro("");

      try {
        const resultado =
          await obterDetalhesTransportadoraMaster(
            transportadoraId
          );

        setDetalhes(resultado);

        if (Array.isArray(resultado?.ultimas_auditorias)) {
          setAuditorias(resultado.ultimas_auditorias);
        }
      } catch (error) {
        setErro(
          error?.message ||
            "Não foi possível carregar os detalhes da transportadora."
        );
      } finally {
        setCarregando(false);
      }
    },
    [transportadoraId]
  );

  const carregarAuditorias = useCallback(async () => {
    if (!transportadoraId) return;

    setCarregandoAuditoria(true);
    setErro("");

    try {
      const resultado =
        await listarAuditoriasTransportadoraMaster({
          transportadoraId,
          limite: 50,
          offset: 0,
        });

      setAuditorias(resultado?.itens || []);
    } catch (error) {
      setErro(
        error?.message ||
          "Não foi possível carregar o histórico de auditoria."
      );
    } finally {
      setCarregandoAuditoria(false);
    }
  }, [transportadoraId]);

    useEffect(() => {
      if (!aberto || !transportadoraId) return;

      setAbaAtiva(abaInicial || "visao-geral");
      setDetalhes(null);
      setAuditorias([]);
      setNovoAlias("");
      setErro("");

      carregarDetalhes();
    }, [
      aberto,
      transportadoraId,
      abaInicial,
      carregarDetalhes,
    ]);

    useEffect(() => {
      if (
        !aberto ||
        !transportadoraId ||
        !refreshKey
      ) {
        return;
      }

      carregarDetalhes({
        silencioso: true,
      });
    }, [
      refreshKey,
      aberto,
      transportadoraId,
      carregarDetalhes,
    ]);

    useEffect(() => {
      if (!aberto) return;

      function fecharComEsc(event) {
        if (event.key !== "Escape") return;

        const existeModalAberto = document.querySelector(
          "[data-modal-open='true']"
        );

        if (existeModalAberto) return;

        onClose();
      }

      window.addEventListener("keydown", fecharComEsc);

      return () => {
        window.removeEventListener(
          "keydown",
          fecharComEsc
        );
      };
    }, [
      aberto,
      onClose,
    ]);

    useEffect(() => {
      if (
        abaAtiva === "auditoria" &&
        transportadoraId
      ) {
        carregarAuditorias();
      }
    }, [
      abaAtiva,
      transportadoraId,
      carregarAuditorias,
    ]);

    if (!aberto) return null;

  async function adicionarAlias(event) {
    event.preventDefault();

    const valor = novoAlias.trim();

    if (!valor) {
      setErro("Informe o nome alternativo.");

      toast.atencao(
        "Nome alternativo não informado",
        "Digite um nome alternativo antes de adicionar."
      );

      return;
    }

    setSalvandoAlias(true);
    setErro("");
    

    try {
      await criarAliasTransportadoraMaster({
        transportadoraId,
        alias: valor,
      });

      setNovoAlias("");
      

      await carregarDetalhes({ silencioso: true });
      await onAtualizado?.();

      toast.sucesso(
        "Nome alternativo adicionado",
        "O alias foi vinculado à transportadora e já pode ser utilizado nas buscas."
      );
    } catch (error) {
      const mensagemErro =
        error?.message ||
        "Não foi possível adicionar o nome alternativo.";

      setErro(mensagemErro);

      toast.erro(
        "Não foi possível adicionar",
        mensagemErro
      );
    } finally {
      setSalvandoAlias(false);
    }
  }

  async function alternarAlias(alias) {
    setProcessandoAliasId(alias.id);
    setErro("");
    

    try {
      await alterarStatusAliasTransportadoraMaster({
        aliasId: alias.id,
        ativo: !alias.ativo,
        justificativa: alias.ativo
          ? "Alias inativado pelo Módulo Master."
          : "Alias reativado pelo Módulo Master.",
      });

      await carregarDetalhes({ silencioso: true });
      await onAtualizado?.();

      if (alias.ativo) {
        toast.atencao(
          "Nome alternativo inativado",
          "O alias deixou de ser utilizado nas buscas, mas permanece preservado no histórico."
        );
      } else {
        toast.sucesso(
          "Nome alternativo reativado",
          "O alias voltou a ser utilizado nas buscas da Base Oficial."
        );
      }
    } catch (error) {
      const mensagemErro =
        error?.message ||
        "Não foi possível atualizar o nome alternativo.";

      setErro(mensagemErro);

      toast.erro(
        "Não foi possível atualizar",
        mensagemErro
      );
    } finally {
      setProcessandoAliasId(null);
    }
  }

  function renderizarVisaoGeral() {
    return (
      <div className="tr-drawer-tab-content">
        <section className="tr-drawer-card">
          <div className="tr-drawer-card-title">
            <div>
              <h3>Identificação oficial</h3>
              <p>
                Informações compartilhadas pelos módulos da plataforma.
              </p>
            </div>

            <ShieldCheck size={20} />
          </div>

          <div className="tr-drawer-data-grid">
            <div>
              <span>Código</span>
              <strong>{transportadora?.business_id || "—"}</strong>
            </div>

            <div>
              <span>Nome fantasia</span>
              <strong>
                {transportadora?.nome_fantasia || "—"}
              </strong>
            </div>

            <div>
              <span>Tipo</span>
              <strong>
                {TIPOS_LABELS[transportadora?.tipo] ||
                  transportadora?.tipo ||
                  "—"}
              </strong>
            </div>

            <div>
              <span>Status</span>
              <strong>
                {STATUS_LABELS[transportadora?.status] ||
                  transportadora?.status ||
                  "—"}
              </strong>
            </div>

            <div>
              <span>Transportadora oficial</span>
              <strong>
                {transportadora?.transportadora_oficial
                  ? "Sim"
                  : "Não"}
              </strong>
            </div>

            <div>
              <span>Aceita rastreamento</span>
              <strong>
                {transportadora?.aceita_rastreio
                  ? "Sim"
                  : "Não"}
              </strong>
            </div>

            <div>
              <span>Integração por API</span>
              <strong>
                {transportadora?.possui_integracao_api
                  ? "Configurada"
                  : "Não configurada"}
              </strong>
            </div>

            <div>
              <span>Logotipo</span>
              <strong>
                {transportadora?.usa_logo_padrao
                  ? "Logo padrão"
                  : "Logo personalizado"}
              </strong>
            </div>
          </div>
        </section>

        <section className="tr-drawer-card">
          <div className="tr-drawer-card-title">
            <div>
              <h3>Histórico do cadastro</h3>
              <p>Datas e origem da informação oficial.</p>
            </div>

            <CalendarDays size={20} />
          </div>

          <div className="tr-drawer-timeline-summary">
            <div>
              <span>Criada em</span>
              <strong>
                {formatarData(transportadora?.criado_em)}
              </strong>
            </div>

            <div>
              <span>Última atualização</span>
              <strong>
                {formatarData(transportadora?.atualizado_em)}
              </strong>
            </div>

            <div>
              <span>Origem</span>
              <strong>
                {transportadora?.origem || "MODULO_MASTER"}
              </strong>
            </div>
          </div>
        </section>

        <section className="tr-drawer-card">
          <div className="tr-drawer-card-title">
            <div>
              <h3>Observações internas</h3>
              <p>
                Informações visíveis somente para a Equipe Chegou!.
              </p>
            </div>

            <FileClock size={20} />
          </div>

          <div className="tr-drawer-observation">
            {transportadora?.observacoes ||
              "Nenhuma observação registrada."}
          </div>
        </section>

        {transportadora?.status === "INSTAVEL" ? (
          <section className="tr-drawer-instability-notice">
            <AlertCircle size={20} />

            <div>
              <strong>Monitoramento de estabilidade</strong>
              <p>
                O cálculo automático de estabilidade será ativado
                quando as integrações de rastreamento estiverem
                disponíveis. O processamento será leve, periódico e
                consolidado pelo CSIC.
              </p>
            </div>
          </section>
        ) : null}
      </div>
    );
  }

  function renderizarIndicadores() {
    return (
      <div className="tr-drawer-tab-content">
        <section className="tr-drawer-indicator-group">
          <div className="tr-drawer-group-header">
            <div>
              <h3>Utilização</h3>
              <p>Resumo operacional da transportadora.</p>
            </div>

            <Package size={20} />
          </div>

          <div className="tr-drawer-mini-grid">
            <MiniCard
              icon={Package}
              label="Total de encomendas"
              valor="0"
              auxiliar="Aguardando Central de Encomendas"
              indisponivel
            />

            <MiniCard
              icon={Activity}
              label="Média diária"
              valor="0"
              auxiliar="Aguardando dados operacionais"
              indisponivel
            />

            <MiniCard
              icon={CalendarDays}
              label="Média mensal"
              valor="0"
              auxiliar="Aguardando dados operacionais"
              indisponivel
            />

            <MiniCard
              icon={Clock3}
              label="Última utilização"
              valor="—"
              auxiliar="Ainda sem histórico"
              indisponivel
            />
          </div>
        </section>

        <section className="tr-drawer-indicator-group">
          <div className="tr-drawer-group-header">
            <div>
              <h3>Participação global</h3>
              <p>Posição resumida na operação da plataforma.</p>
            </div>

            <TrendingUp size={20} />
          </div>

          <div className="tr-drawer-mini-grid">
            <MiniCard
              icon={ChartNoAxesColumnIncreasing}
              label="Posição no ranking"
              valor="—"
              auxiliar="Aguardando volume global"
              indisponivel
            />

            <MiniCard
              icon={CircleGauge}
              label="Participação global"
              valor="—"
              auxiliar="Aguardando volume global"
              indisponivel
            />

            <MiniCard
              icon={Building2}
              label="Condomínio que mais usa"
              valor="—"
              auxiliar="Aguardando dados agregados"
              indisponivel
            />

            <MiniCard
              icon={Building2}
              label="Condomínios atendidos"
              valor="—"
              auxiliar="Aguardando Central de Encomendas"
              indisponivel
            />
          </div>
        </section>

        <section className="tr-drawer-indicator-group">
          <div className="tr-drawer-group-header">
            <div>
              <h3>Qualidade operacional</h3>
              <p>
                Indicadores futuros consolidados pelo sistema.
              </p>
            </div>

            <Gauge size={20} />
          </div>

          <div className="tr-drawer-mini-grid">
            <MiniCard
              icon={Gauge}
              label="SLA médio"
              valor="—"
              auxiliar="Aguardando integração"
              indisponivel
            />

            <MiniCard
              icon={AlertCircle}
              label="Ocorrências"
              valor="—"
              auxiliar="Aguardando operação"
              indisponivel
            />

            <MiniCard
              icon={ShieldCheck}
              label="Índice de confiança"
              valor="—"
              auxiliar="Futuro cálculo CSIC"
              indisponivel
            />

            <MiniCard
              icon={Network}
              label="Status da integração"
              valor={
                transportadora?.possui_integracao_api
                  ? "Configurada"
                  : "Não configurada"
              }
              auxiliar="API futura por transportadora"
            />
          </div>
        </section>

        <section className="tr-drawer-card">
          <div className="tr-drawer-card-title">
            <div>
              <h3>Gráficos resumidos</h3>
              <p>
                Indicadores compactos, sem substituir Relatórios e
                Análises.
              </p>
            </div>

            <BarChart3 size={20} />
          </div>

          <div className="tr-drawer-charts-grid">
            <GraficoVazio
              icon={ChartNoAxesColumnIncreasing}
              titulo="Volume dos últimos 7 dias"
              descricao="O gráfico será ativado quando houver encomendas vinculadas."
            />

            <GraficoVazio
              icon={TrendingUp}
              titulo="Evolução mensal"
              descricao="A tendência será calculada com dados operacionais reais."
            />

            <GraficoVazio
              icon={CircleGauge}
              titulo="Participação global"
              descricao="A participação será exibida após o início da operação."
            />

            <GraficoVazio
              icon={Building2}
              titulo="Principais condomínios"
              descricao="Serão exibidos somente dados agregados e apropriados ao Master."
            />
          </div>
        </section>
      </div>
    );
  }

  function renderizarAliases() {
    return (
      <div className="tr-drawer-tab-content">
        <section className="tr-drawer-card">
          <div className="tr-drawer-card-title">
            <div>
              <h3>Nomes alternativos</h3>
              <p>
                Use aliases para reconhecer variações sem duplicar o
                cadastro oficial.
              </p>
            </div>

            <Tag size={20} />
          </div>

          <form
            className="tr-drawer-alias-form"
            onSubmit={adicionarAlias}
            autoComplete="off"
            data-form-type="other"
          >
            <label>
              <span>Novo alias</span>

              <input
                type="text"
                name="transportadora_alias_oficial"
                value={novoAlias}
                onChange={(event) =>
                  setNovoAlias(event.target.value)
                }
                placeholder="Ex.: Mercado Envios"
                maxLength={120}
                autoComplete="off"
              />
            </label>

            <button
              type="submit"
              disabled={salvandoAlias}
            >
              {salvandoAlias ? (
                <LoaderCircle
                  size={17}
                  className="tr-drawer-spinning"
                />
              ) : (
                <Plus size={17} />
              )}

              {salvandoAlias ? "Adicionando..." : "Adicionar"}
            </button>
          </form>
        </section>

        <section className="tr-drawer-card">
          <div className="tr-drawer-alias-list">
            {aliases.length === 0 ? (
              <div className="tr-drawer-empty">
                <Tag size={24} />
                <strong>Nenhum alias cadastrado.</strong>
                <p>
                  Adicione nomes alternativos para melhorar buscas e
                  identificação.
                </p>
              </div>
            ) : (
              aliases.map((alias) => (
                <article
                  className="tr-drawer-alias-item"
                  key={alias.id}
                >
                  <div>
                    <strong>{alias.alias}</strong>

                    <small>
                      {alias.ativo
                        ? "Alias ativo"
                        : "Alias inativo"}
                    </small>
                  </div>

                  <button
                    type="button"
                    className={
                      alias.ativo
                        ? "tr-drawer-alias-disable"
                        : "tr-drawer-alias-enable"
                    }
                    onClick={() => alternarAlias(alias)}
                    disabled={
                      processandoAliasId === alias.id
                    }
                  >
                    {processandoAliasId === alias.id ? (
                      <LoaderCircle
                        size={16}
                        className="tr-drawer-spinning"
                      />
                    ) : alias.ativo ? (
                      "Inativar"
                    ) : (
                      "Reativar"
                    )}
                  </button>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    );
  }

  function renderizarIntegracao() {
    return (
      <div className="tr-drawer-tab-content">
        <section className="tr-drawer-integration-hero">
          <span>
            <Code2 size={24} />
          </span>

          <div>
            <strong>Integração de Rastreamento</strong>

            <p>
              O Módulo Master será responsável apenas pela
              configuração e governança da API. O mapa operacional
              será exibido exclusivamente no Módulo Morador.
            </p>
          </div>

          <b>Planejada</b>
        </section>

        <section className="tr-drawer-card">
          <div className="tr-drawer-card-title">
            <div>
              <h3>Recursos preparados</h3>
              <p>
                Campos e comportamentos previstos para a integração.
              </p>
            </div>

            <Network size={20} />
          </div>

          <div className="tr-drawer-integration-list">
            <div>
              <span>Integração configurada</span>
              <strong>
                {transportadora?.possui_integracao_api
                  ? "Sim"
                  : "Não"}
              </strong>
            </div>

            <div>
              <span>Rastreamento permitido</span>
              <strong>
                {transportadora?.aceita_rastreio
                  ? "Sim"
                  : "Não"}
              </strong>
            </div>

            <div>
              <span>Provider key</span>
              <strong>Não configurado</strong>
            </div>

            <div>
              <span>Previsão de entrega</span>
              <strong>Indisponível</strong>
            </div>

            <div>
              <span>Mapa para moradores</span>
              <strong>Indisponível</strong>
            </div>

            <div>
              <span>Webhooks</span>
              <strong>Indisponível</strong>
            </div>

            <div>
              <span>Status da integração</span>
              <strong>Não configurada</strong>
            </div>

            <div>
              <span>Última sincronização</span>
              <strong>Sem sincronização</strong>
            </div>
          </div>
        </section>

        <section className="tr-drawer-security-note">
          <ShieldCheck size={20} />

          <div>
            <strong>Credenciais protegidas</strong>
            <p>
              Tokens, chaves e segredos não serão armazenados no
              frontend. A implementação usará Supabase Secrets, Edge
              Functions e controle de auditoria.
            </p>
          </div>
        </section>

        <section className="tr-drawer-card">
          <div className="tr-drawer-card-title">
            <div>
              <h3>Status automático de estabilidade</h3>
              <p>
                Processamento leve, periódico e desacoplado.
              </p>
            </div>

            <Route size={20} />
          </div>

          <div className="tr-drawer-integration-copy">
            <p>
              Futuramente, o sistema analisará disponibilidade, tempo
              de resposta, falhas consecutivas, erros recentes e
              degradação operacional.
            </p>

            <p>
              O resultado será consolidado sem consultas pesadas ao
              abrir a tela. Toda mudança automática de status terá
              auditoria, identificação do agente sistêmico e revisão
              possível pelo Master.
            </p>
          </div>
        </section>
      </div>
    );
  }

  function renderizarAuditoria() {
    return (
      <div className="tr-drawer-tab-content">
        <section className="tr-drawer-card">
          <div className="tr-drawer-card-title">
            <div>
              <h3>Histórico de auditoria</h3>
              <p>
                Alterações, responsáveis e eventos CSIC da
                transportadora.
              </p>
            </div>

            <button
              type="button"
              className="tr-drawer-refresh"
              onClick={carregarAuditorias}
              disabled={carregandoAuditoria}
              aria-label="Atualizar auditoria"
            >
              <RefreshCw
                size={18}
                className={
                  carregandoAuditoria
                    ? "tr-drawer-spinning"
                    : ""
                }
              />
            </button>
          </div>

          {carregandoAuditoria ? (
            <div className="tr-drawer-loading-inline">
              <LoaderCircle
                size={22}
                className="tr-drawer-spinning"
              />
              Carregando auditoria...
            </div>
          ) : null}

          {!carregandoAuditoria &&
          auditorias.length === 0 ? (
            <div className="tr-drawer-empty">
              <History size={24} />
              <strong>Nenhum evento encontrado.</strong>
              <p>
                As próximas alterações aparecerão neste histórico.
              </p>
            </div>
          ) : null}

          {!carregandoAuditoria &&
          auditorias.length > 0 ? (
            <div className="tr-drawer-audit-timeline">
              {auditorias.map((auditoria) => (
                <article
                  className="tr-drawer-audit-item"
                  key={auditoria.id}
                >
                  <span className="tr-drawer-audit-marker" />

                  <div>
                    <div className="tr-drawer-audit-header">
                      <strong>
                        {obterMensagemEvento(auditoria.acao)}
                      </strong>

                      <time>
                        {formatarData(auditoria.criado_em)}
                      </time>
                    </div>

                    <p>
                      Responsável:{" "}
                      {auditoria.nome_usuario ||
                        "Agente sistêmico"}
                    </p>

                    {auditoria.status_anterior ||
                    auditoria.status_novo ? (
                      <div className="tr-drawer-audit-status">
                        <span>
                          {STATUS_LABELS[
                            auditoria.status_anterior
                          ] ||
                            auditoria.status_anterior ||
                            "—"}
                        </span>

                        <b>→</b>

                        <span>
                          {STATUS_LABELS[
                            auditoria.status_novo
                          ] ||
                            auditoria.status_novo ||
                            "—"}
                        </span>
                      </div>
                    ) : null}

                    {auditoria?.detalhes?.justificativa ? (
                      <small>
                        Justificativa:{" "}
                        {auditoria.detalhes.justificativa}
                      </small>
                    ) : null}

                    <small>
                      Evento CSIC:{" "}
                      {auditoria.evento_csic_leve ||
                        auditoria.acao}
                    </small>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    );
  }

  function renderizarConteudo() {
    if (abaAtiva === "indicadores") {
      return renderizarIndicadores();
    }

    if (abaAtiva === "aliases") {
      return renderizarAliases();
    }

    if (abaAtiva === "integracao") {
      return renderizarIntegracao();
    }

    if (abaAtiva === "auditoria") {
      return renderizarAuditoria();
    }

    return renderizarVisaoGeral();
  }

  return (
    <div
      className="tr-drawer-overlay"
      data-drawer-open="true"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <aside
        className="tr-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tr-drawer-title"
      >
        <header className="tr-drawer-topbar">
          <div className="tr-drawer-identity">
            <img
              src={logo}
              alt={
                transportadora?.nome_fantasia
                  ? `Logo ${transportadora.nome_fantasia}`
                  : "Logo da transportadora"
              }
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = logoPadraoLocal;
              }}
            />

            <div>
              <span>Base Oficial</span>

              <h2 id="tr-drawer-title">
                {transportadora?.nome_fantasia ||
                  "Detalhes da Transportadora"}
              </h2>

              {transportadora ? (
                <span className="tr-drawer-business-id">
                    {transportadora.business_id}
                </span>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes"
          >
            <X size={20} />
          </button>
        </header>

        {transportadora ? (
          <div className="tr-drawer-status-row">
            <span
              className={`tr-drawer-status ${obterClasseStatus(
                transportadora.status
              )}`}
            >
              {STATUS_LABELS[transportadora.status] ||
                transportadora.status}
            </span>

            <span>
              {TIPOS_LABELS[transportadora.tipo] ||
                transportadora.tipo}
            </span>
          </div>
        ) : null}

        <nav
          className="tr-drawer-tabs"
          aria-label="Seções da transportadora"
        >
          {ABAS.map((aba) => {
            const Icon = aba.icon;

            return (
              <button
                type="button"
                key={aba.id}
                className={
                  abaAtiva === aba.id ? "active" : ""
                }
                onClick={() => setAbaAtiva(aba.id)}
              >
                <Icon size={17} />
                <span>{aba.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="tr-drawer-body">
          {erro ? (
            <div className="tr-drawer-error">
              <AlertCircle size={19} />
              <span>{erro}</span>
            </div>
          ) : null}
          

          {carregando ? (
            <div className="tr-drawer-loading">
              <LoaderCircle
                size={30}
                className="tr-drawer-spinning"
              />

              <strong>Carregando detalhes...</strong>
            </div>
          ) : (
            renderizarConteudo()
          )}
        </div>

        <footer className="tr-drawer-footer">
          <button
            type="button"
            className="tr-drawer-footer-secondary"
            onClick={() =>
              onAlterarStatus?.(transportadora)
            }
            disabled={!transportadora}
          >
            <Activity size={17} />
            Alterar status
          </button>

          <button
            type="button"
            className="tr-drawer-footer-primary"
            onClick={() => onEditar?.(transportadora)}
            disabled={!transportadora}
          >
            <Edit3 size={17} />
            Editar cadastro
          </button>
        </footer>
      </aside>
    </div>
  );
}

export default TransportadoraDrawer;