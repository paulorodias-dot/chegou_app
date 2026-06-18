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
  listarAuditoriaConvitesMoradores,
  obterResumoAuditoriaConvitesMoradores,
  obterLimiteEnvioDiario,
  enviarConviteMoradorAuditoria,
} from "../../services/auditoriaMoradoresConvitesService";

const STATUS_FILTROS = [
  { value: "TODOS", label: "Todos" },
  { value: "RASCUNHO", label: "Rascunho" },
  { value: "AGUARDANDO_ENVIO", label: "Na fila de envio" },
  { value: "PROCESSANDO", label: "Enviando e-mail" },
  { value: "ERRO_ENVIO", label: "Erro no envio" },
  { value: "CONVITE_ENVIADO", label: "E-mail enviado" },
  { value: "ABERTO", label: "E-mail aberto" },
  { value: "EM_PREENCHIMENTO", label: "Em preenchimento" },
  { value: "AGUARDANDO_AUDITORIA", label: "Aguardando auditoria" },
  { value: "APROVADO", label: "Aprovado" },
  { value: "REPROVADO", label: "Reprovado" },
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
    RASCUNHO: "Rascunho",
    AGUARDANDO_ENVIO: "Na fila de envio",
    PROCESSANDO: "Enviando e-mail",
    ERRO_ENVIO: "Erro no envio",
    CONVITE_ENVIADO: "E-mail enviado",
    ABERTO: "E-mail aberto",
    EM_PREENCHIMENTO: "Em Preenchimento",
    WIZARD_FINALIZADO: "Wizard Finalizado",
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

function formatarCanalEnvioTela(item) {
  const canal = formatarCanalEnvio(item);

  if (!canal || canal === "—") return "—";

  const valor = String(canal).trim().toLowerCase();

  if (valor === "email" || valor === "e-mail") return "E-mail";
  if (valor === "whatsapp") return "WhatsApp";

  return canal;
}

function formatarStatusEntregaTela(status = "") {
  const valor = String(status || "").trim().toUpperCase();

  const mapa = {
    AGUARDANDO: "Aguardando abertura",
    ENTREGUE: "Entregue",
    ABERTO: "Aberto",
    ERRO: "Erro",
    ERRO_ENVIO: "Erro no envio",
  };

  return mapa[valor] || formatarStatusTela(valor);
}

function classeStatusEntrega(status = "") {
  const valor = String(status || "").trim().toUpperCase();

  if (["ENTREGUE", "ABERTO"].includes(valor)) return "enviado";
  if (["ERRO", "ERRO_ENVIO"].includes(valor)) return "erro";

  return "aguardando";
}

function formatarAbertoEm(valor) {
  if (!valor) return "Convite não aberto";
  return formatarDataHora(valor);
}

function formatarReenvios(valor) {
  const total = Number(valor || 0);

  if (total === 0) return "Nenhum reenvio";
  if (total === 1) return "1 reenvio";

  return `${total} reenvios`;
}

function obterStatusToken(item) {
  const status = String(item?.convite?.status_token || "").trim().toUpperCase();

  if (item?.convite?.token_revogado) return "Revogado";
  if (status === "REVOGADO") return "Revogado";

  const expiraEm = item?.token_expira_em;

  if (expiraEm && new Date(expiraEm) < new Date()) return "Expirado";

  return "Ativo";
}

function classeStatusToken(item) {
  const status = obterStatusToken(item);

  if (status === "Ativo") return "enviado";
  if (status === "Expirado") return "aguardando";
  if (status === "Revogado") return "erro";

  return "aguardando";
}

function formatarOrigemConvite(item) {
  const origem =
    item?.convite?.origem_envio ||
    item?.convite?.origem ||
    item?.pre_cadastro?.origem_cadastro ||
    "Administrativo";

  const valor = String(origem).trim().toLowerCase();

  const mapa = {
    manual: "Administrativo",
    administrativo: "Administrativo",
    lote: "Envio em lote",
    envio_lote: "Envio em lote",
    reenvio_manual: "Reenvio manual",
    xlsx: "Importação XLSX",
    pdf: "Importação PDF",
  };

  return mapa[valor] || origem;
}

function classeStatus(status) {
  const mapa = {
    RASCUNHO: "aguardando",
    AGUARDANDO_ENVIO: "aguardando",
    PROCESSANDO: "processando",
    ERRO_ENVIO: "erro",
    CONVITE_ENVIADO: "enviado",
    ABERTO: "enviado",
    EM_PREENCHIMENTO: "preenchimento",
    WIZARD_FINALIZADO: "auditoria",
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

  if (item.status_sistema === "RASCUNHO") {
    return "Ainda não enviado";
  }

  if (item.status_sistema === "AGUARDANDO_ENVIO") {
    return "Aguardando envio pelo sistema";
  }

  if (item.status_sistema === "PROCESSANDO") {
    return "Envio em andamento";
  }

  if (item.status_sistema === "ERRO_ENVIO") {
    return "Necessário revisar e-mail";
  }

  if (item.status_sistema === "CONVITE_ENVIADO") {
    return "E-mail enviado";
  }

  if (item.status_sistema === "ABERTO") {
    return "Morador abriu o e-mail/link";
  }

  if (item.status_sistema === "EM_PREENCHIMENTO") {
    return item.percentual_preenchimento
      ? `${item.percentual_preenchimento}% preenchido`
      : "Wizard iniciado";
  }

  if (item.status_sistema === "WIZARD_FINALIZADO") {
    return "Wizard concluído pelo morador";
  }

  if (item.status_sistema === "AGUARDANDO_AUDITORIA") {
    return "Aguardando análise administrativa";
  }

  if (item.status_sistema === "APROVADO") {
    return "Aguardando 1º acesso";
  }

  if (item.status_sistema === "REPROVADO") {
    return "Auditoria encerrada";
  }

  if (item.status_sistema === "BLOQUEADO") {
    return "Suspeita de fraude";
  }

  if (item.status_sistema === "CORRECAO_SOLICITADA") {
    return "Pendente de ajuste";
  }

  return "Acompanhamento do convite";
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
    RASCUNHO: [
      "Enviar Convite",
      "Editar Dados",
      "Visualizar Cadastro",
      "Cancelar Pré-Cadastro",
    ],

    AGUARDANDO_ENVIO: [
      "Visualizar Convite",
      "Cancelar Envio",
      "Visualizar Cadastro",
    ],

    PROCESSANDO: [
      "Visualizar Convite",
      "Visualizar Cadastro",
    ],

    ERRO_ENVIO: [
      "Corrigir e Enviar",
      "Visualizar Cadastro",
      "Visualizar Histórico",
    ],

    CONVITE_ENVIADO: [
      "Visualizar Convite",
      "Reenviar Convite",
      "Revogar Convite",
      "Visualizar Cadastro",
    ],

    ABERTO: [
      "Visualizar Andamento",
      "Reenviar Convite",
      "Visualizar Cadastro",
    ],

    EM_PREENCHIMENTO: [
      "Visualizar Andamento",
      "Reenviar Convite",
      "Visualizar Cadastro",
    ],

    WIZARD_FINALIZADO: [
      "Visualizar Cadastro Completo",
      "Abrir Auditoria",
    ],

    AGUARDANDO_AUDITORIA: [
      "Visualizar Cadastro Completo",
      "Abrir Auditoria",
    ],

    CORRECAO_SOLICITADA: [
      "Visualizar Pendências",
      "Reenviar Aviso",
      "Visualizar Cadastro",
    ],

    APROVADO: [
      "Visualizar Usuário Criado",
      "Visualizar Histórico",
    ],

    REPROVADO: [
      "Visualizar Motivo",
      "Visualizar Histórico",
      "Reabrir Auditoria",
    ],

    BLOQUEADO: [
      "Visualizar Risco",
      "Visualizar Logs",
      "Desbloquear",
      "Reabrir Auditoria",
    ],
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
            <strong>{formatarDataHora(item.enviado_em)}</strong>
            <span>{formatarCanalEnvio(item)}</span>
          </div>

          <div>
            <small>Expira em</small>
            <strong>{formatarData(item.token_expira_em)}</strong>
            <span>{calcularDiasRestantes(item.token_expira_em)}</span>
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

function DrawerConvite({ item, onClose }) {
  if (!item) return null;

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
            <strong>
              <span className={`amc-status amc-status-${classeStatus(item.status_sistema)}`}>
                {formatarStatusTela(item.status_sistema)}
              </span>
            </strong>
          </div>

          <div>
            <small>Status de acompanhamento</small>
            <strong>
              <span className={`amc-status amc-status-${classeStatusEntrega(item.status_entrega)}`}>
                {formatarStatusEntregaTela(item.status_entrega)}
              </span>
            </strong>
          </div>

          <div>
            <small>E-mail destino</small>
            <strong>{item.email}</strong>
          </div>

          <div>
            <small>Canal</small>
            <strong>{formatarCanalEnvioTela(item)}</strong>
          </div>

          <div>
            <small>Enviado em</small>
            <strong>{formatarDataHora(item.enviado_em)}</strong>
          </div>

          <div>
            <small>Aberto em</small>
            <strong>{formatarAbertoEm(item.convite_aberto_em)}</strong>
          </div>

          <div>
            <small>Reenvios realizados</small>
            <strong>{formatarReenvios(item.quantidade_reenvios)}</strong>
          </div>

          <div>
            <small>Expira em</small>
            <strong>{formatarData(item.token_expira_em)}</strong>
            <span>{calcularDiasRestantes(item.token_expira_em)}</span>
          </div>

          <div>
            <small>Token do convite</small>
            <strong>
              <span className={`amc-status amc-status-${classeStatusToken(item)}`}>
                {obterStatusToken(item)}
              </span>
            </strong>
          </div>

          <div>
            <small>Origem</small>
            <strong>{formatarOrigemConvite(item)}</strong>
          </div>
        </div>

        <div className="amc-drawer-section">
          <h3>Observações</h3>
          <p>
            {item.convite?.observacoes ||
              "Convite enviado para o endereço cadastrado do morador. O acompanhamento de abertura e preenchimento será atualizado automaticamente."}
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

      <aside className="amc-confirm-modal">
        <div className="amc-confirm-header">
          <div>
            <span>Confirmação de Reenvio</span>
            <h2>Reenviar Convite</h2>
          </div>

          <button type="button" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        <div className="amc-confirm-section">
          <h3>Morador</h3>
          <p>
            <strong>{item.nome}</strong>
            <br />
            {item.email}
            <br />
            Apto {item.unidade} — {item.torre}
          </p>
        </div>

        <div className="amc-confirm-section">
          <h3>Como funcionará o reenvio</h3>
          <p>
            Ao confirmar, o reenvio será colocado na fila de e-mails do
            Chegou<span className="amc-orange">!</span>. O sistema respeitará
            automaticamente a janela comercial de 08h às 20h, horário de
            Brasília, e a regra de não enviar dois e-mails no mesmo minuto.
          </p>
        </div>

        <div className="amc-confirm-actions">
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

export default function AuditoriaMoradoresConvite({ perfil, onNavigate }) {
  const condominioId =
    perfil?.condominio_id ||
    perfil?.condominio_atual_id ||
    perfil?.usuario_condominio?.condominio_id ||
    null;

  const [carregando, setCarregando] = useState(true);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null);
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

  const [processandoAcao, setProcessandoAcao] = useState(false);

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
  const hojeISO = new Date().toISOString().slice(0, 10);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState(hojeISO);
  const [menuAberto, setMenuAberto] = useState(null);
  const [andamentoSelecionado, setAndamentoSelecionado] = useState(null);
  const [conviteSelecionado, setConviteSelecionado] = useState(null);
  const [cadastroSelecionado, setCadastroSelecionado] = useState(null);
  const [acaoPendente, setAcaoPendente] = useState(null);
  const [reenvioSelecionado, setReenvioSelecionado] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [linhasPorPagina, setLinhasPorPagina] = useState(10);
  const [modoSelecao, setModoSelecao] = useState(null); 
  const [selecionados, setSelecionados] = useState([]);
  const [progressoEnvio, setProgressoEnvio] = useState(null);

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
          dataInicio,
          dataFim,
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
      setUltimaAtualizacao(new Date());
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

  function limparSelecao() {
    setModoSelecao(null);
    setSelecionados([]);
  }

  function fecharProgressoEnvio() {
    if (progressoEnvio?.bloqueado) return;
    setProgressoEnvio(null);
  }

  function podeSelecionar(item) {
    return ["RASCUNHO", "ERRO_ENVIO"].includes(item.status_sistema);
  }

  function alternarSelecionado(item) {
    if (!podeSelecionar(item)) {
      toast("Este registro não está disponível para envio.", {
        icon: "⚠️",
      });
      return;
    }

    setSelecionados((atuais) => {
      const jaExiste = atuais.some((id) => id === item.pre_cadastro_id);

      if (jaExiste) {
        return atuais.filter((id) => id !== item.pre_cadastro_id);
      }

      if (modoSelecao === "individual" && atuais.length >= 1) {
        toast.dismiss();

        toast("Para enviar mais de um convite, use o botão Enviar em Lote.", {
          icon: "📦",
        });

        return atuais;
      }

      return [...atuais, item.pre_cadastro_id];
    });
  }

  function selecionarRascunhosPagina() {
    const elegiveis = registrosPagina.filter(podeSelecionar);

    if (!elegiveis.length) {
      toast("Não há registros disponíveis para envio nesta página.", {
        icon: "⚠️",
      });
      return;
    }

    if (modoSelecao === "individual") {
      toast("Envio individual permite selecionar apenas um morador.", {
        icon: "✉️",
      });
      return;
    }

    setSelecionados((atuais) => {
      const novos = elegiveis
        .map((item) => item.pre_cadastro_id)
        .filter((id) => !atuais.includes(id));

      return [...atuais, ...novos];
    });
  }

  function validarSelecaoParaEnvio() {
    if (modoSelecao === "individual") {
      if (selecionados.length !== 1) {
        toast("Selecione exatamente um morador para Enviar Convite.", {
          icon: "✉️",
        });
        return false;
      }

      return true;
    }

    if (modoSelecao === "lote") {
      if (selecionados.length < 2) {
        toast("Para Enviar em Lote, selecione pelo menos dois moradores.", {
          icon: "📦",
        });
        return false;
      }

      if (selecionados.length > 30) {
        toast("O envio em lote permite no máximo 30 convites por vez.", {
          icon: "⚠️",
        });
        return false;
      }

      return true;
    }

    return false;
  }

  async function confirmarEnvioSelecionados() {
    if (!validarSelecaoParaEnvio()) return;

    const registrosSelecionados = registros.filter((item) =>
      selecionados.includes(item.pre_cadastro_id)
    );

    if (modoSelecao === "individual" && registrosSelecionados.length !== 1) {
      toast("Selecione exatamente um morador para Enviar Convite.", {
        icon: "✉️",
      });
      return;
    }

    if (modoSelecao === "lote" && registrosSelecionados.length < 2) {
      toast("Para Enviar em Lote, selecione pelo menos dois moradores.", {
        icon: "📦",
      });
      return;
    }

    try {
      setProcessandoAcao(true);

      setProgressoEnvio({
        aberto: true,
        bloqueado: true,
        titulo:
          modoSelecao === "individual"
            ? "Enviando convite"
            : "Enviando convites em lote",
        mensagem:
          "Não feche esta janela até a confirmação final. Os convites já processados permanecerão registrados.",
        total: registrosSelecionados.length,
        processados: 0,
        sucesso: 0,
        erro: 0,
        finalizado: false,
      });

      let sucesso = 0;
      let erro = 0;

      for (let index = 0; index < registrosSelecionados.length; index += 1) {
        const registro = registrosSelecionados[index];

        setProgressoEnvio((atual) => ({
          ...atual,
          processados: index,
          sucesso,
          erro,
          mensagem: `Processando ${index + 1} de ${registrosSelecionados.length}: ${registro.nome}`,
        }));

        try {
          await enviarConviteMoradorAuditoria({
            perfil,
            registro,
            enviarAgora: false,
            tipoEnvio: modoSelecao === "individual" ? "individual" : "lote",
          });

          sucesso += 1;
        } catch (error) {
          console.error("Erro ao enviar convite:", registro, error);
          erro += 1;
        }

        setProgressoEnvio((atual) => ({
          ...atual,
          processados: index + 1,
          sucesso,
          erro,
        }));
      }

      setProgressoEnvio((atual) => ({
        ...atual,
        bloqueado: false,
        finalizado: true,
        processados: registrosSelecionados.length,
        sucesso,
        erro,
        titulo:
          erro === 0
            ? "Envio concluído com sucesso"
            : "Envio concluído com atenção",
        mensagem:
          erro === 0
            ? `${sucesso} convite(s) adicionados à fila de envio.`
            : `${sucesso} convite(s) adicionados à fila. ${erro} registro(s) tiveram erro.`,
      }));

      limparSelecao();
      await carregarDados();

      setTimeout(() => {
        setProgressoEnvio((atual) => {
          if (!atual?.finalizado) return atual;
          return null;
        });
      }, 7000);
    } catch (error) {
      console.error(error);

      setProgressoEnvio((atual) => ({
        ...atual,
        bloqueado: false,
        finalizado: true,
        titulo: "Falha no processamento",
        mensagem:
          error?.message ||
          "Não foi possível concluir o processamento. Verifique os registros e tente novamente.",
      }));

      toast.error(error?.message || "Erro ao processar envio.");
    } finally {
      setProcessandoAcao(false);
    }
  }

  function alterarDataInicio(valor) {
    if (valor && valor > hojeISO) {
      toast("A data inicial não pode ser futura.", { icon: "📅" });
      return;
    }

    setDataInicio(valor);

    if (dataFim && valor && dataFim < valor) {
      setDataFim(valor);
    }
  }

  function alterarDataFim(valor) {
    if (valor && valor > hojeISO) {
      toast("A data final não pode ser futura.", { icon: "📅" });
      return;
    }

    if (dataInicio && valor && valor < dataInicio) {
      toast("A data final não pode ser anterior à data inicial.", { icon: "📅" });
      return;
    }

    setDataFim(valor);
  }

  function limparPeriodo() {
    setDataInicio("");
    setDataFim(hojeISO);
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

    if (acao === "Enviar Convite") {
      if (processandoAcao) return;

      try {
        setProcessandoAcao(true);

        await enviarConviteMoradorAuditoria({
          perfil,
          registro: item,
          enviarAgora: false,
          tipoEnvio: "individual",
        });

        toast.success("Convite adicionado à fila de envio.");

        await carregarDados();
      } catch (error) {
        console.error(error);
        toast.error(error?.message || "Erro ao adicionar convite à fila.");
      } finally {
        setProcessandoAcao(false);
      }

      return;
    }

    if (acao === "Reenviar Convite") {
      setReenvioSelecionado(item);
      return;
    }

    if (acao === "Corrigir e Enviar") {
      setCadastroSelecionado(item);
      toast("Revise o e-mail do morador antes de reenviar.", {
        icon: "✉️",
      });
      return;
    }

    setAcaoPendente({ acao, item });
  }

    function handleAcaoTopo(acao) {
      if (acao === "Enviar Convite") {
        setStatus("RASCUNHO");
        setModoSelecao("individual");
        setSelecionados([]);

        toast("Selecione um único morador em Rascunho para enviar o convite.", {
          icon: "✉️",
        });

        return;
      }

      if (acao === "Enviar em Lote") {
        setStatus("RASCUNHO");
        setModoSelecao("lote");
        setSelecionados([]);

        toast("Selecione dois ou mais moradores em Rascunho para envio em lote.", {
          icon: "📦",
        });

        return;
      }

      if (acao === "Logs de Auditoria") {
        onNavigate?.("admin-auditoria-moradores-historico");
        return;
      }

      toast(`${acao} será conectado na próxima etapa.`, {
        icon: "⚙️",
      });
    }

  async function confirmarReenvioConvite() {
    if (!reenvioSelecionado) return;

    toast("Reenvio será conectado com manutenção do mesmo token na próxima etapa.", {
      icon: "🔐",
    });

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
            <p>
              Acompanhe o envio, abertura e andamento dos convites enviados aos moradores pelo Sistema
              Chegou<span className="amc-orange">!</span>.
            </p>
          </div>

          <div className="amc-header-actions">
            <button
              type="button"
              className="amc-btn amc-btn-outline"
              onClick={carregarDados}
              disabled={carregando}
            >
              <RefreshCw size={17} className={carregando ? "amc-spin" : ""} />
              Atualizar
            </button>
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
          <button
            type="button"
            onClick={() => onNavigate?.("admin-auditoria-moradores-pre-cadastro")}
          >
            Pré-Cadastro
          </button>

          <button type="button" className="active">
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
              <span>De</span>
              <input
                type="date"
                className="amc-date-input"
                value={dataInicio}
                max={hojeISO}
                onChange={(event) => alterarDataInicio(event.target.value)}
              />
            </label>

            <label>
              <span>Até</span>
              <input
                type="date"
                className="amc-date-input"
                value={dataFim}
                min={dataInicio || undefined}
                max={hojeISO}
                onChange={(event) => alterarDataFim(event.target.value)}
              />
            </label>

            <button
              type="button"
              className="amc-filter-extra"
              onClick={limparPeriodo}
            >
              Limpar
            </button>

          </div>

          {erro ? <div className="amc-error">{erro}</div> : null}

          {modoSelecao && (
            <div className="amc-selection-bar">
              <div>
                <strong>
                  {modoSelecao === "individual"
                    ? "Envio individual"
                    : "Envio em lote"}
                </strong>
                <span>
                  {selecionados.length} selecionado(s)
                </span>
              </div>

              <div className="amc-selection-actions">
                {modoSelecao === "lote" && (
                  <button
                    type="button"
                    className="amc-btn amc-btn-outline"
                    onClick={selecionarRascunhosPagina}
                  >
                    Selecionar página
                  </button>
                )}

                <button
                  type="button"
                  className="amc-btn amc-btn-outline"
                  onClick={limparSelecao}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="amc-btn amc-btn-primary"
                  disabled={processandoAcao}
                  onClick={confirmarEnvioSelecionados}
                >
                  {processandoAcao ? "Processando..." : "Confirmar Envio"}
                </button>
              </div>
            </div>
          )}

          <div className="amc-table-wrap">
            <table className="amc-table">
              <thead>
                <tr>
                  {modoSelecao && <th>Sel.</th>}
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
                    <td colSpan={modoSelecao ? 9 : 8}>
                      <div className="amc-loading">
                        <RefreshCw size={18} className="amc-spin" />
                        Carregando convites...
                      </div>
                    </td>
                  </tr>
                ) : registrosPagina.length ? (
                  registrosPagina.map((item) => (
                    <tr key={item.id}>
                      {modoSelecao && (
                        <td>
                          <input
                            type="checkbox"
                            checked={selecionados.includes(item.pre_cadastro_id)}
                            disabled={!podeSelecionar(item)}
                            onChange={() => alternarSelecionado(item)}
                            aria-label={`Selecionar ${item.nome}`}
                          />
                        </td>
                      )}

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
                    <td colSpan={modoSelecao ? 9 : 8}>
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

        <section className="amc-side-card amc-side-card-orange amc-communication-premium">
          <div className="amc-side-title">
            <Info size={17} />
            <strong>
              Painel de Comunicados Chegou<span className="amc-orange">!</span>
            </strong>
          </div>

          <div className="amc-communication-box">
            <div className="amc-communication-orb" />

            <div>
              <strong>Comunicados do Módulo</strong>
              <p>Espaço reservado para avisos do Master ou Administrativo.</p>
            </div>
          </div>

          <p className="amc-communication-footer">
            Este espaço será usado para comunicados operacionais, orientações,
            novidades do sistema e avisos importantes.
          </p>
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

          <small>
            Período de Envio: 08h às 20h (Brasília)
            <br />
            Use o botão Atualizar para consultar o status mais recente.
            {ultimaAtualizacao ? (
              <>
                <br />
                Última atualização:{" "}
                {new Intl.DateTimeFormat("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(ultimaAtualizacao)}
              </>
            ) : null}
          </small>
        </section>
      </aside>

      <DrawerAndamentoConvite item={andamentoSelecionado} onClose={() => setAndamentoSelecionado(null)} />

      <DrawerConvite
        item={conviteSelecionado}
        onClose={() => setConviteSelecionado(null)}
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

      {progressoEnvio?.aberto && (
        <>
          <div className="amc-progress-backdrop" />

          <div className="amc-progress-modal" role="dialog" aria-modal="true">
            <button
              type="button"
              className="amc-progress-close"
              onClick={fecharProgressoEnvio}
              disabled={progressoEnvio.bloqueado}
              aria-label="Fechar progresso"
            >
              ×
            </button>

            <div className="amc-progress-modal-header">
              <strong>{progressoEnvio.titulo}</strong>
              <span>{progressoEnvio.mensagem}</span>
            </div>

            <div className="amc-progress-large">
              <span
                style={{
                  width: `${
                    progressoEnvio.total
                      ? Math.round(
                          (progressoEnvio.processados / progressoEnvio.total) * 100
                        )
                      : 0
                  }%`,
                }}
              />
            </div>

            <div className="amc-progress-numbers">
              <strong>
                {progressoEnvio.total
                  ? Math.round(
                      (progressoEnvio.processados / progressoEnvio.total) * 100
                    )
                  : 0}
                %
              </strong>

              <span>
                {progressoEnvio.processados} de {progressoEnvio.total} processado(s)
              </span>
            </div>

            <div className="amc-progress-summary">
              <span>Sucesso: {progressoEnvio.sucesso}</span>
              <span>Erros: {progressoEnvio.erro}</span>
            </div>

            {!progressoEnvio.finalizado && (
              <p>
                Caso a internet caia ou o computador seja desligado, os convites já
                adicionados à fila permanecerão salvos. Ao retornar, confira a lista
                para continuar apenas os pendentes.
              </p>
            )}
          </div>
        </>
      )}

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
