import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  DatabaseZap,
  Download,
  Eye,
  Filter,
  Info,
  Mail,
  MoreVertical,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import toast from "react-hot-toast";

import "./AuditoriaMoradoresConvite.css";
import * as XLSX from "xlsx";
import {
  buscarTorresAuditoriaMoradores,
  copiarLinkConviteMorador,
  listarAuditoriaConvitesMoradores,
  obterResumoAuditoriaConvitesMoradores,
  obterLimiteEnvioDiario,
} from "../../services/auditoriaMoradoresConvitesService";

const STATUS_FILTROS = [
  { value: "TODOS", label: "Todos" },
  { value: "AGUARDANDO_ENVIO", label: "Aguardando Envio" },
  { value: "CONVITE_ENVIADO", label: "Convite Enviado" },
  { value: "EM_PREENCHIMENTO", label: "Em Preenchimento" },
  { value: "AGUARDANDO_AUDITORIA", label: "Aguardando Auditoria" },
  { value: "CORRECAO_SOLICITADA", label: "Correção Solicitada" },
  { value: "APROVADO", label: "Aprovado" },
  { value: "REPROVADO", label: "Reprovado" },
  { value: "BLOQUEADO", label: "Bloqueado" },
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

function formatarData(valor) {
  if (!valor) return "—";

  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(valor));
  } catch {
    return "—";
  }
}

function formatarUltimaAtividade(valor) {
  if (!valor) return "—";

  const agora = new Date();
  const data = new Date(valor);
  const diffMs = agora.getTime() - data.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHoras = Math.floor(diffMin / 60);

  if (diffMin < 1) return "Agora";
  if (diffMin < 60) return `Há ${diffMin} min`;
  if (diffHoras < 24) return `Há ${diffHoras} h`;

  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);

  const mesmoDia =
    data.getDate() === ontem.getDate() &&
    data.getMonth() === ontem.getMonth() &&
    data.getFullYear() === ontem.getFullYear();

  if (mesmoDia) {
    return `Ontem ${new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(data)}`;
  }

  return formatarDataHora(valor);
}

function calcularDiasRestantes(valor) {
  if (!valor) return "—";

  const agora = new Date();
  const data = new Date(valor);
  const diffMs = data.getTime() - agora.getTime();
  const dias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (dias < 0) return "Expirado";
  if (dias === 0) return "Expira hoje";
  if (dias === 1) return "1 dia";
  return `${dias} dias`;
}

function formatarStatusTela(status) {
  if (!status) return "Aguardando Envio";

  const mapa = {
    AGUARDANDO_ENVIO: "Aguardando Envio",
    CONVITE_ENVIADO: "E-mail Enviado",
    EM_PREENCHIMENTO: "Em Preenchimento",
    AGUARDANDO_AUDITORIA: "Aguardando Auditoria",
    CORRECAO_SOLICITADA: "Correção Solicitada",
    APROVADO: "Aprovado",
    REPROVADO: "Reprovado",
    BLOQUEADO: "Bloqueado",
  };

  return mapa[status] || String(status).replaceAll("_", " ");
}

function formatarCanalEnvio(item) {
  return (
    item?.canal_envio ||
    item?.tipo_envio ||
    item?.convite?.canal_envio ||
    item?.convite?.tipo_envio ||
    "—"
  );
}

function classeStatus(status) {
  const mapa = {
    AGUARDANDO_ENVIO: "aguardando",
    CONVITE_ENVIADO: "enviado",
    EM_PREENCHIMENTO: "preenchimento",
    AGUARDANDO_AUDITORIA: "auditoria",
    CORRECAO_SOLICITADA: "correcao",
    APROVADO: "aprovado",
    REPROVADO: "reprovado",
    BLOQUEADO: "bloqueado",
  };

  return mapa[status] || "aguardando";
}

function obterSubStatus(item) {
  if (!item) return "—";

  if (item.status_sistema === "CONVITE_ENVIADO") {
    if (item.convite_aberto) return "Aberto";
    return "Enviado";
  }

  if (item.status_sistema === "EM_PREENCHIMENTO") {
    return item.percentual_preenchimento
      ? `${item.percentual_preenchimento}% preenchido`
      : "Wizard iniciado";
  }

  if (item.status_sistema === "AGUARDANDO_AUDITORIA") return "Wizard finalizado";
  if (item.status_sistema === "APROVADO") return "Aguardando 1º acesso";
  if (item.status_sistema === "REPROVADO") return "Auditoria encerrada";
  if (item.status_sistema === "BLOQUEADO") return "Suspeita de fraude";
  if (item.status_sistema === "CORRECAO_SOLICITADA") return "Pendente de ajuste";

  return "Aguardando envio";
}

function obterIniciais(nome = "") {
  const partes = String(nome).trim().split(" ").filter(Boolean);

  if (!partes.length) return "CH";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();

  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

function obterLinkConvite(item) {
  return item?.convite?.payload_envio?.link_wizard || item?.convite?.link_wizard || "";
}

function KpiCard({ icon: Icon, titulo, valor, detalhe, tendencia, variante = "azul" }) {
  return (
    <div className="amc-kpi-card">
      <div className={`amc-kpi-icon amc-kpi-icon-${variante}`}>
        <Icon size={22} strokeWidth={2.1} />
      </div>

      <div className="amc-kpi-content">
        <span>{titulo}</span>
        <strong>{valor}</strong>

        <div className="amc-kpi-footer">
          <small>{detalhe}</small>
          {tendencia ? <em>{tendencia}</em> : null}
        </div>
      </div>
    </div>
  );
}
function AcaoLinhaMenu({
  item,
  aberto,
  onToggle,
  onAcao,
}) {
  const [posicao, setPosicao] = useState({ top: 0, left: 0 });

  const opcoesPorStatus = {
    AGUARDANDO_ENVIO: [
      "Enviar Convite",
      "Editar Dados",
      "Visualizar Cadastro",
      "Cancelar Pré-Cadastro",
    ],
    CONVITE_ENVIADO: [
      "Visualizar Convite",
      "Copiar Link",
      "Reenviar Convite",
      "Revogar Convite",
      "Visualizar Cadastro",
    ],
    EM_PREENCHIMENTO: [
      "Visualizar Andamento",
      "Copiar Link",
      "Reenviar Convite",
      "Visualizar Cadastro",
    ],
    AGUARDANDO_AUDITORIA: [
      "Visualizar Cadastro Completo",
      "Aprovar",
      "Solicitar Correção",
      "Reprovar",
    ],
    CORRECAO_SOLICITADA: [
      "Visualizar Pendências",
      "Reenviar Aviso",
      "Copiar Link",
      "Visualizar Cadastro",
    ],
    APROVADO: [
      "Visualizar Usuário Criado",
      "Reenviar Orientação",
      "Visualizar Histórico",
    ],
    REPROVADO: ["Visualizar Motivo", "Visualizar Histórico", "Reabrir Auditoria"],
    BLOQUEADO: ["Visualizar Risco", "Visualizar Logs", "Desbloquear", "Reabrir Auditoria"],
  };

  const opcoes = opcoesPorStatus[item.status_sistema] || ["Visualizar Cadastro"];

  function abrirMenu(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const larguraMenu = 196;
    const alturaMenu = Math.min(320, opcoes.length * 34 + 14);

    let left = rect.right - larguraMenu - 25;
    let top = rect.top - alturaMenu + 28;

    if (left < 12) left = 12;
    if (left + larguraMenu > window.innerWidth - 12) {
      left = window.innerWidth - larguraMenu - 12;
    }

    if (top < 12) {
      top = rect.bottom + 8;
    }

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
    <div className="amc-row-actions">
      <button
        type="button"
        className="amc-icon-action amc-row-menu-btn"
        onClick={abrirMenu}
        aria-label="Abrir ações"
      >
        <MoreVertical size={18} />
      </button>

      {aberto ? (
        <>
          <button
            type="button"
            className="amc-menu-overlay"
            onClick={() => onToggle(null)}
            aria-label="Fechar menu"
          />

          <div
            className="amc-row-menu amc-row-menu-fixed"
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

function DrawerAndamentoConvite({ item, onClose }) {
  if (!item) return null;

  const eventos = [
    {
      titulo: "Convite enviado",
      data: item.enviado_em,
      ativo: Boolean(item.enviado_em),
    },
    {
      titulo: "Convite aberto",
      data: item.convite_aberto_em,
      ativo: Boolean(item.convite_aberto || item.convite_aberto_em),
    },
    {
      titulo: "Wizard em preenchimento",
      data: item.ultima_atividade_em,
      ativo: item.status_sistema === "EM_PREENCHIMENTO" || item.percentual_preenchimento > 0,
    },
    {
      titulo: "Wizard finalizado",
      data: item.wizard_finalizado_em,
      ativo: Boolean(item.wizard_finalizado || item.wizard_finalizado_em),
    },
    {
      titulo: "Aguardando auditoria",
      data: item.wizard_finalizado_em,
      ativo: item.status_sistema === "AGUARDANDO_AUDITORIA",
    },
    {
      titulo: "Aprovado",
      data: item.auditoria?.aprovado_em,
      ativo: item.status_sistema === "APROVADO",
    },
    {
      titulo: "Reprovado",
      data: item.auditoria?.rejeitado_em,
      ativo: item.status_sistema === "REPROVADO",
    },
    {
      titulo: "Bloqueado",
      data: item.convite?.atualizado_em || item.ultima_atividade_em,
      ativo: item.status_sistema === "BLOQUEADO",
    },
  ];

  return (
    <>
      <button
        type="button"
        className="amc-drawer-backdrop"
        onClick={onClose}
        aria-label="Fechar andamento"
      />

      <aside className="amc-drawer">
        <div className="amc-drawer-header">
          <div>
            <span>Andamento do Convite</span>
            <h2>{item.nome}</h2>
          </div>

          <button type="button" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        <div className="amc-drawer-grid">
          <div>
            <small>Status atual</small>
            <strong>{formatarStatusTela(item.status_sistema)}</strong>
          </div>

          <div>
            <small>Preenchimento</small>
            <strong>{item.percentual_preenchimento || 0}%</strong>
          </div>

          <div>
            <small>Unidade</small>
            <strong>Apto {item.unidade}</strong>
          </div>

          <div>
            <small>Torre</small>
            <strong>{item.torre}</strong>
          </div>

          <div>
            <small>E-mail</small>
            <strong>{item.email}</strong>
          </div>

          <div>
            <small>Telefone</small>
            <strong>{item.telefone || "—"}</strong>
          </div>

          <div>
            <small>Último envio</small>
            <td>
              <strong>{formatarDataHora(item.enviado_em)}</strong>
              <span>{formatarCanalEnvio(item)}</span>
            </td>
          </div>

          <div>
            <small>Expira em</small>
            <td>
              <strong>{formatarData(item.token_expira_em)}</strong>
              <span>{calcularDiasRestantes(item.token_expira_em)}</span>
            </td>
          </div>
        </div>

        <div className="amc-drawer-section">
          <h3>Linha do tempo</h3>

          <div className="amc-timeline">
            {eventos.map((evento) => (
              <div
                key={evento.titulo}
                className={evento.ativo ? "amc-timeline-item active" : "amc-timeline-item"}
              >
                <span />
                <div>
                  <strong>{evento.titulo}</strong>
                  <small>{evento.data ? formatarDataHora(evento.data) : "Ainda não registrado"}</small>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="amc-drawer-section">
          <h3>Auditoria</h3>

          <p>
            {item.auditoria?.observacao_auditor ||
              item.auditoria?.mensagem_para_morador ||
              "Ainda não há observações de auditoria para este convite."}
          </p>
        </div>
      </aside>
    </>
  );
}

function DrawerConvite({ item, onClose, onCopiarLink }) {
  if (!item) return null;

  const link = obterLinkConvite(item);

  return (
    <>
      <button
        type="button"
        className="amc-drawer-backdrop"
        onClick={onClose}
        aria-label="Fechar convite"
      />

      <aside className="amc-drawer">
        <div className="amc-drawer-header">
          <div>
            <span>Detalhes do Convite</span>
            <h2>{item.nome}</h2>
          </div>

          <button type="button" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        <div className="amc-drawer-grid">
          <div>
            <small>Status do convite</small>
            <strong>{formatarStatusTela(item.status_sistema)}</strong>
          </div>

          <div>
            <small>Status de entrega</small>
            <strong>{item.status_entrega || "—"}</strong>
          </div>

          <div>
            <small>E-mail destino</small>
            <strong>{item.email}</strong>
          </div>

          <div>
            <small>Canal</small>
            <strong>{item.convite?.canal_envio || "E-mail"}</strong>
          </div>

          <div>
            <small>Enviado em</small>
            <strong>{formatarDataHora(item.enviado_em)}</strong>
          </div>

          <div>
            <small>Aberto em</small>
            <strong>{formatarDataHora(item.convite_aberto_em)}</strong>
          </div>

          <div>
            <small>Reenvios</small>
            <strong>{item.quantidade_reenvios || 0}</strong>
          </div>

          <div>
            <small>Expira em</small>
            <strong>{formatarData(item.token_expira_em)}</strong>
          </div>
        </div>

        <div className="amc-drawer-section">
          <h3>Link do Wizard</h3>
          <p>{link || "Link não encontrado no payload do convite."}</p>

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button
              type="button"
              className="amc-btn amc-btn-primary"
              onClick={() => onCopiarLink(item)}
              disabled={!link}
            >
              Copiar Link
            </button>
          </div>
        </div>

        <div className="amc-drawer-section">
          <h3>Observações</h3>
          <p>
            {item.convite?.observacoes ||
              "Convite carregado com os dados reais registrados no Supabase."}
          </p>
        </div>
      </aside>
    </>
  );
}

function DrawerCadastro({ item, onClose }) {
  if (!item) return null;

  return (
    <>
      <button
        type="button"
        className="amc-drawer-backdrop"
        onClick={onClose}
        aria-label="Fechar cadastro"
      />

      <aside className="amc-drawer">
        <div className="amc-drawer-header">
          <div>
            <span>Cadastro do Morador</span>
            <h2>{item.nome}</h2>
          </div>

          <button type="button" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        <div className="amc-drawer-grid">
          <div>
            <small>ID Business</small>
            <strong>{item.business_id || "—"}</strong>
          </div>

          <div>
            <small>Status</small>
            <strong>{formatarStatusTela(item.status_sistema)}</strong>
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
            <small>Telefone</small>
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
            <strong>{item.pre_cadastro?.origem_cadastro || item.convite?.origem_envio || "—"}</strong>
          </div>
        </div>

        <div className="amc-drawer-section">
          <h3>Dados do pré-cadastro</h3>
          <p>
            Percentual preenchido: <strong>{item.percentual_preenchimento || 0}%</strong>
            <br />
            Status de auditoria: <strong>{item.status_auditoria || "—"}</strong>
            <br />
            Última atividade: <strong>{formatarDataHora(item.ultima_atividade_em)}</strong>
          </p>
        </div>

        <div className="amc-drawer-section">
          <h3>Observações</h3>
          <p>
            {item.pre_cadastro?.observacoes ||
              item.auditoria?.observacao_auditor ||
              "Nenhuma observação registrada até o momento."}
          </p>
        </div>
      </aside>
    </>
  );
}
function DrawerAcaoPendente({ acao, item, onClose }) {
  if (!acao || !item) return null;

  const dependeEdge = [
    "Enviar Convite",
    "Reenviar Convite",
    "Revogar Convite",
    "Cancelar Pré-Cadastro",
    "Reenviar Aviso",
    "Reenviar Orientação",
    "Aprovar",
    "Solicitar Correção",
    "Reprovar",
    "Reabrir Auditoria",
    "Desbloquear",
    "Editar Dados",
  ].includes(acao);

  return (
    <>
      <button
        type="button"
        className="amc-drawer-backdrop"
        onClick={onClose}
        aria-label="Fechar ação"
      />

      <aside className="amc-drawer">
        <div className="amc-drawer-header">
          <div>
            <span>Ação Selecionada</span>
            <h2>{acao}</h2>
          </div>

          <button type="button" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        <div className="amc-drawer-grid">
          <div>
            <small>Morador</small>
            <strong>{item.nome}</strong>
          </div>

          <div>
            <small>Unidade</small>
            <strong>Apto {item.unidade}</strong>
          </div>

          <div>
            <small>Status atual</small>
            <strong>{formatarStatusTela(item.status_sistema)}</strong>
          </div>

          <div>
            <small>E-mail</small>
            <strong>{item.email}</strong>
          </div>
        </div>

        <div className="amc-drawer-section">
          <h3>{dependeEdge ? "Próxima etapa técnica" : "Informação"}</h3>

          <p>
            {dependeEdge
              ? "Esta ação depende de Edge Function, fila Brevo, atualização de status, logs sistêmicos ou fluxo de auditoria. Ela já está prevista no menu, mas será conectada na próxima etapa para evitar alteração incompleta no banco."
              : "Esta ação foi preparada para consulta local com os dados já carregados na tela."}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button type="button" className="amc-btn amc-btn-primary" onClick={onClose}>
            Entendi
          </button>
        </div>
      </aside>
    </>
  );
}

function ModalConfirmarReenvio({ item, onClose, onConfirmar }) {
  if (!item) return null;

  return (
    <>
      <button
        type="button"
        className="amc-drawer-backdrop"
        onClick={onClose}
        aria-label="Cancelar reenvio"
      />

      <aside className="amc-drawer">
        <div className="amc-drawer-header">
          <div>
            <span>Confirmação de Reenvio</span>
            <h2>Reenviar Convite</h2>
          </div>

          <button type="button" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        <div className="amc-drawer-section">
          <h3>Morador</h3>
          <p>
            <strong>{item.nome}</strong>
            <br />
            {item.email}
            <br />
            Apto {item.unidade} — {item.torre}
          </p>
        </div>

        <div className="amc-drawer-section">
          <h3>Como funcionará o reenvio</h3>
          <p>
            Ao confirmar, o reenvio será colocado na fila de e-mails do
            Chegou<span className="amc-orange">!</span>. O sistema respeitará
            automaticamente a janela comercial de 08h às 20h, horário de
            Brasília, e a regra de não enviar dois e-mails no mesmo minuto.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button type="button" className="amc-btn amc-btn-outline" onClick={onClose}>
            Cancelar
          </button>

          <button type="button" className="amc-btn amc-btn-primary" onClick={onConfirmar}>
            Confirmar Reenvio
          </button>
        </div>
      </aside>
    </>
  );
}

function gerarNomeArquivoConvites() {
  const agora = new Date();

  const data = agora.toISOString().slice(0, 10);
  const hora = String(agora.getHours()).padStart(2, "0");
  const minuto = String(agora.getMinutes()).padStart(2, "0");

  return `auditoria_convites_moradores_${data}_${hora}${minuto}.xlsx`;
}

export default function AuditoriaMoradoresConvite({ perfil }) {
  const condominioId =
    perfil?.condominio_id ||
    perfil?.condominio_atual_id ||
    perfil?.usuario_condominio?.condominio_id ||
    null;

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [registros, setRegistros] = useState([]);
  const [resumo, setResumo] = useState({
    convitesEnviados: 0,
    aguardandoAbertura: 0,
    emPreenchimento: 0,
    aguardandoAuditoria: 0,
    aprovados: 0,
    reprovadosBloqueados: 0,
  });

  const [limiteEnvio, setLimiteEnvio] = useState({
    convites: { usados: 0, limite: 40 },
    confirmacoes: { usados: 0, limite: 20 },
  });
  const [infoAberta, setInfoAberta] = useState(false);

  const [torres, setTorres] = useState([]);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("TODOS");
  const [torre, setTorre] = useState("TODAS");
  const [unidade, setUnidade] = useState("TODAS");
  const [menuAberto, setMenuAberto] = useState(null);
  const [andamentoSelecionado, setAndamentoSelecionado] = useState(null);
  const [conviteSelecionado, setConviteSelecionado] = useState(null);
  const [cadastroSelecionado, setCadastroSelecionado] = useState(null);
  const [acaoPendente, setAcaoPendente] = useState(null);
  const [reenvioSelecionado, setReenvioSelecionado] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [linhasPorPagina, setLinhasPorPagina] = useState(10);

  async function carregarDados() {
    if (!condominioId) {
      setErro("Condomínio autenticado não encontrado.");
      setCarregando(false);
      return;
    }

    try {
      setCarregando(true);
      setErro("");

      const [lista, resumoAtual, torresAtual, limiteAtual] = await Promise.all([
        listarAuditoriaConvitesMoradores({
          condominioId,
          busca,
          status,
          torre,
          unidade,
          limite: 500,
        }),
        obterResumoAuditoriaConvitesMoradores({ condominioId }),
        buscarTorresAuditoriaMoradores({ condominioId }),
        obterLimiteEnvioDiario({ condominioId }),
      ]);

      setRegistros(lista);
      setResumo(resumoAtual);
      setTorres(torresAtual);
      setLimiteEnvio(limiteAtual);
      setPagina(1);
    } catch (error) {
      console.error(error);
      setErro(error?.message || "Erro ao carregar auditoria de convites.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [condominioId, status, torre, unidade]);

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

        setAndamentoSelecionado(null);
        setConviteSelecionado(null);
        setCadastroSelecionado(null);

        setReenvioSelecionado(null);

        setAcaoPendente(null);
      }
    }

    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const unidades = useMemo(() => {
    const lista = registros
      .map((item) => item.unidade)
      .filter(Boolean)
      .filter((valor) => valor !== "-");

    return [...new Set(lista)].sort((a, b) => String(a).localeCompare(String(b)));
  }, [registros]);

  const totalPaginas = Math.max(1, Math.ceil(registros.length / linhasPorPagina));

  const registrosPagina = useMemo(() => {
    const inicio = (pagina - 1) * linhasPorPagina;
    return registros.slice(inicio, inicio + linhasPorPagina);
  }, [pagina, registros, linhasPorPagina]);

  function calcularPercentual(usados, limite) {
    if (!limite) return 0;
    return Math.min(100, Math.round((Number(usados || 0) / Number(limite)) * 100));
  }

  async function handleCopiarLink(item) {
    try {
      await copiarLinkConviteMorador(item.convite);
      toast.success("Link do convite copiado.");
    } catch (error) {
      toast.error(error?.message || "Não foi possível copiar o link.");
    }
  }

  async function handleAcaoLinha(acao, item) {
    if (acao === "Visualizar Andamento") {
      setAndamentoSelecionado(item);
      return;
    }

    if (acao === "Visualizar Convite") {
      setConviteSelecionado(item);
      return;
    }

    if (
      acao === "Visualizar Cadastro" ||
      acao === "Visualizar Cadastro Completo" ||
      acao === "Visualizar Usuário Criado" ||
      acao === "Visualizar Histórico" ||
      acao === "Visualizar Motivo" ||
      acao === "Visualizar Pendências" ||
      acao === "Visualizar Risco" ||
      acao === "Visualizar Logs"
    ) {
      setCadastroSelecionado(item);
      return;
    }

    if (acao === "Copiar Link") {
      await handleCopiarLink(item);
      return;
    }

    if (acao === "Reenviar Convite") {
      setReenvioSelecionado(item);
      return;
    }

    setAcaoPendente({ acao, item });
  }

  function handleAcaoTopo(acao) {
    toast(`${acao} será conectado na próxima etapa.`, {
      icon: "⚙️",
    });
  }

  function confirmarReenvioConvite() {
    if (!reenvioSelecionado) return;

    toast.success(
      "Reenvio validado. Na próxima etapa será conectado à fila Brevo."
    );

    setReenvioSelecionado(null);
  }

  function exportarListaConvites() {
    if (!registros.length) {
      toast.error("Não há dados para exportar com os filtros atuais.");
      return;
    }

    const dados = registros.map((item) => ({
      "ID Business": item.business_id || "—",
      "Nome": item.nome || "—",
      "Torre": item.torre || "—",
      "Unidade": item.unidade || "—",
      "E-mail": item.email || "—",
      "Telefone": item.telefone || "—",
      "Status do Convite": formatarStatusTela(item.status_sistema),
      "Substatus": obterSubStatus(item),
      "Percentual Preenchimento": `${item.percentual_preenchimento || 0}%`,
      "Última Atualização": formatarDataHora(item.ultima_atividade_em),
      "Enviado em": formatarDataHora(item.enviado_em),
      "Canal de Envio": formatarCanalEnvio(item),
      "Expiração do Token": formatarData(item.token_expira_em),
      "Tempo Restante": calcularDiasRestantes(item.token_expira_em),
      "Convite Aberto": item.convite_aberto ? "Sim" : "Não",
      "Wizard Finalizado": item.wizard_finalizado ? "Sim" : "Não",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dados);

    worksheet["!cols"] = [
      { wch: 26 },
      { wch: 28 },
      { wch: 16 },
      { wch: 12 },
      { wch: 30 },
      { wch: 18 },
      { wch: 22 },
      { wch: 22 },
      { wch: 22 },
      { wch: 20 },
      { wch: 20 },
      { wch: 16 },
      { wch: 20 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Convites");

    XLSX.writeFile(workbook, gerarNomeArquivoConvites());

    toast.success("Lista exportada com sucesso.");
  }

  return (
    <div className="amc-page">
      <div className="amc-main">
        <div className="amc-breadcrumb">
          <span>Auditoria</span>
          <ChevronRight size={14} />
          <span>Moradores</span>
          <ChevronRight size={14} />
          <strong>Convite</strong>
        </div>

        <div className="amc-header">
          <div>
            <h1>
              Auditoria / Convite do Morador
              <button
                type="button"
                className="amc-title-info"
                onClick={() => setInfoAberta(true)}
                aria-label="Informações sobre a tela"
              >
                <Info size={17} />
              </button>
            </h1>
          </div>

          <div className="amc-header-actions">
            <button
              type="button"
              className="amc-btn amc-btn-outline"
              onClick={() => handleAcaoTopo("Enviar Convite")}
            >
              <Send size={17} />
              Enviar Convite
            </button>

            <button
              type="button"
              className="amc-btn amc-btn-primary"
              onClick={() => handleAcaoTopo("Enviar em Lote")}
            >
              <DatabaseZap size={17} />
              Enviar em Lote
            </button>
          </div>
        </div>

        <div className="amc-tabs">
          <button type="button" className="active">Convite</button>
          <button type="button" onClick={() => handleAcaoTopo("Pré-Cadastro")}>Pré-Cadastro</button>
          <button type="button" onClick={() => handleAcaoTopo("Auditoria")}>Auditoria</button>
          <button type="button" onClick={() => handleAcaoTopo("Histórico")}>Histórico</button>
        </div>

        <section className="amc-kpis">
          <KpiCard
            icon={Send}
            titulo="Convites Enviados"
            valor={resumo.convitesEnviados}
            detalhe="Últimos 30 dias"
            variante="azul"
          />
        </section>

        <section className="amc-table-card">
          <div className="amc-filters">
            <div className="amc-search">
              <Search size={18} />
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar por nome, e-mail, unidade ou ID do morador..."
              />
            </div>

            <label>
              <span>Status do Convite</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                {STATUS_FILTROS.map((opcao) => (
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
              <span>Período</span>
              <button type="button" className="amc-filter-button">
                <CalendarDays size={16} />
                Últimos 30 dias
                <ChevronDown size={15} />
              </button>
            </label>

            <button type="button" className="amc-filter-extra">
              <Filter size={16} />
              Mais filtros
            </button>
          </div>

          {erro ? <div className="amc-error">{erro}</div> : null}

          <div className="amc-table-wrap">
            <table className="amc-table">
              <thead>
                <tr>
                  <th>Morador</th>
                  <th>Unidade</th>
                  <th>E-mail</th>
                  <th>Status do Convite</th>
                  <th>Última Atualização</th>
                  <th>Enviado em</th>
                  <th>Expiração do Token</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {carregando ? (
                  <tr>
                    <td colSpan="8">
                      <div className="amc-loading">
                        <RefreshCw size={18} className="amc-spin" />
                        Carregando convites...
                      </div>
                    </td>
                  </tr>
                ) : registrosPagina.length ? (
                  registrosPagina.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="amc-person">
                          <div className="amc-avatar">{obterIniciais(item.nome)}</div>
                          <div>
                            <strong>{item.nome}</strong>
                            <span>ID: {item.business_id || "—"}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <strong>Apto {item.unidade}</strong>
                        <span>{item.torre}</span>
                      </td>

                      <td>{item.email}</td>

                      <td>
                        <div className="amc-status-cell">
                          <span className={`amc-status amc-status-${classeStatus(item.status_sistema)}`}>
                            {formatarStatusTela(item.status_sistema)}
                          </span>
                          <small>{obterSubStatus(item)}</small>
                        </div>
                      </td>

                      <td>{formatarUltimaAtividade(item.ultima_atividade_em)}</td>

                      <td>
                        <strong>{formatarDataHora(item.enviado_em)}</strong>
                        <span>{formatarCanalEnvio(item)}</span>
                      </td>

                      <td>
                        <strong>{formatarData(item.token_expira_em)}</strong>
                        <span>{calcularDiasRestantes(item.token_expira_em)}</span>
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
                    <td colSpan="8">
                      <div className="amc-empty">
                        <strong>Nenhum registro encontrado</strong>

                        <p>
                          Não há convites pendentes ou registros compatíveis com os filtros
                          aplicados no momento.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="amc-table-footer">
            <span>
              Mostrando {registrosPagina.length ? (pagina - 1) * linhasPorPagina + 1 : 0} a{" "}
              {Math.min(pagina * linhasPorPagina, registros.length)} de {registros.length} registros
            </span>

            <div className="amc-pagination">
              <button type="button" disabled={pagina === 1} onClick={() => setPagina((atual) => Math.max(1, atual - 1))}>
                <ChevronLeft size={16} />
              </button>

              <strong>{pagina}</strong>

              <button type="button" disabled={pagina === totalPaginas} onClick={() => setPagina((atual) => Math.min(totalPaginas, atual + 1))}>
                <ChevronRight size={16} />
              </button>
            </div>

            <label className="amc-per-page">
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

      <aside className="amc-rightbar">
        <section className="amc-side-card">
          <div className="amc-side-title">
            <Sparkles size={17} />
            <strong>Operações</strong>
          </div>

          <button type="button" className="amc-side-action" onClick={() => handleAcaoTopo("Enviar Convite")}>
            <Send size={17} />
            <span><strong>Enviar Convite</strong><small>Enviar convite por e-mail</small></span>
          </button>

          <button type="button" className="amc-side-action" onClick={() => handleAcaoTopo("Enviar em Lote")}>
            <DatabaseZap size={17} />
            <span><strong>Enviar em Lote</strong><small>Enviar convites em lote</small></span>
          </button>

          <button type="button" className="amc-side-action" onClick={exportarListaConvites}>
            <Download size={17} />
            <span><strong>Exportar Lista</strong><small>Exportar dados para planilha</small></span>
          </button>

          <button type="button" className="amc-side-action" onClick={() => handleAcaoTopo("Logs de Auditoria")}>
            <Eye size={17} />
            <span><strong>Logs de Auditoria</strong><small>Ver histórico de ações</small></span>
          </button>
        </section>

        <section className="amc-side-card amc-side-card-orange">
          <div className="amc-side-title">
            <Info size={17} />
            <strong>Comunicados e Orientações</strong>
          </div>

          <p>Comunicados e orientações deste módulo.</p>
          <p>Este espaço será utilizado futuramente para:</p>

          <ul>
            <li>Avisos operacionais</li>
            <li>Atualizações do sistema</li>
            <li>Comunicados da administração</li>
            <li>Orientações de uso</li>
          </ul>

          <Bell className="amc-watermark-icon" size={72} />
        </section>

        <section className="amc-side-card">
          <h3>Limite de Envio (Diário)</h3>

          <div className="amc-limit-row">
            <div>
              <span>Convites de cadastro</span>
              <strong>
                {limiteEnvio.convites.usados} / {limiteEnvio.convites.limite}
              </strong>
            </div>
            <div className="amc-progress">
              <span
                style={{
                  width: `${calcularPercentual(
                    limiteEnvio.convites.usados,
                    limiteEnvio.convites.limite
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="amc-limit-row">
            <div>
              <span>Confirmações de cadastro</span>
              <strong>
                {limiteEnvio.confirmacoes.usados} / {limiteEnvio.confirmacoes.limite}
              </strong>
            </div>
            <div className="amc-progress">
              <span
                style={{
                  width: `${calcularPercentual(
                    limiteEnvio.confirmacoes.usados,
                    limiteEnvio.confirmacoes.limite
                  )}%`,
                }}
              />
            </div>
          </div>

          <small>Período de Envio: 08h às 20h (Brasília)</small>
        </section>
      </aside>

      <DrawerAndamentoConvite item={andamentoSelecionado} onClose={() => setAndamentoSelecionado(null)} />

      <DrawerConvite
        item={conviteSelecionado}
        onClose={() => setConviteSelecionado(null)}
        onCopiarLink={handleCopiarLink}
      />

      <DrawerCadastro item={cadastroSelecionado} onClose={() => setCadastroSelecionado(null)} />

      <ModalConfirmarReenvio
        item={reenvioSelecionado}
        onClose={() => setReenvioSelecionado(null)}
        onConfirmar={confirmarReenvioConvite}
      />

      <DrawerAcaoPendente
        acao={acaoPendente?.acao}
        item={acaoPendente?.item}
        onClose={() => setAcaoPendente(null)}
      />

      {infoAberta && (
        <>
          <button
            type="button"
            className="amc-drawer-backdrop"
            onClick={() => setInfoAberta(false)}
            aria-label="Fechar informações"
          />

          <aside className="amc-drawer">
            <div className="amc-drawer-header">
              <div>
                <span>Orientações da Tela</span>
                <h2>Auditoria / Convite do Morador</h2>
              </div>

              <button type="button" onClick={() => setInfoAberta(false)}>
                ×
              </button>
            </div>

            <div className="amc-drawer-section">
              <h3>Objetivo</h3>
              <p>
                Esta tela acompanha o ciclo do convite do morador, desde o envio do
                link do WizardMorador até o preenchimento, auditoria e aprovação.
              </p>
            </div>

            <div className="amc-drawer-section">
              <h3>Regras principais</h3>
              <p>
                O morador acessa o Wizard pelo token do convite, sem precisar fazer
                login. O token continua válido durante o preenchimento e acompanhamento
                da aprovação. Após o primeiro acesso definitivo, o token deve ser
                invalidado.
              </p>
            </div>

            <div className="amc-drawer-section">
              <h3>Envios de Email: Chegou<span className="amc-orange">!</span> + Brevo</h3>

              <p>
                Ao enviar convites individualmente ou em lote, o Sistema
                Chegou<span className="amc-orange">!</span> organiza os e-mails
                automaticamente na fila de envio. A fila respeita a janela comercial de
                08h às 20h, horário de Brasília, e distribui os disparos para evitar dois
                e-mails no mesmo minuto.
              </p>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}