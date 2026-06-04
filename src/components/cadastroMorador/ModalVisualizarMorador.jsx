import {
  CalendarDays,
  Clock,
  Edit3,
  Mail,
  ShieldCheck,
  User,
  X,
} from "lucide-react";

import { FaWhatsapp } from "react-icons/fa";

function formatarDataHoraBR(data) {
  if (!data) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(data));
}

function formatarTelefoneBR(telefone = "") {
  const numero = String(telefone || "").replace(/\D/g, "");

  if (!numero) return "—";

  if (numero.startsWith("55") && numero.length >= 12) {
    const local = numero.slice(2);
    return `+55 (${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7, 11)}`;
  }

  return telefone;
}

function valor(valor) {
  return valor || "—";
}

function gerarCodigoCurtoMorador(morador) {
  const raw = morador?.raw || morador || {};
  const unidade = raw.unidade || morador?.unidade_nome || "";
  const base = raw.business_id || raw.id || morador?.pre_cadastro_id || "";

  if (!base && !unidade) return "—";

  const sufixo = String(base).replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();

  if (unidade && sufixo) return `MOR-${unidade}-${sufixo}`;
  if (sufixo) return `MOR-${sufixo}`;

  return `MOR-${unidade}`;
}

function copiarTexto(texto) {
  if (!texto) return;

  navigator.clipboard?.writeText(String(texto));
}

function statusLabel(status) {
  const labels = {
    RASCUNHO: "Rascunho",
    AGUARDANDO_ENVIO: "Aguardando envio",
    NAO_ENVIADO: "Não enviado",
    PENDENTE_APROVACAO: "Pendente aprovação",
    EM_PREENCHIMENTO: "Em preenchimento",
    AGUARDANDO_AUDITORIA: "Aguardando auditoria",
    EM_AUDITORIA: "Em auditoria",
    APROVADO: "Aprovado",
    REPROVADO: "Reprovado",
    CANCELADO: "Cancelado",
    TOKEN_EXPIRADO: "Token expirado",
    fila_auditoria: "Fila de auditoria",
    auditoria_iniciada: "Auditoria iniciada",
    em_analise: "Em análise",
    aprovado: "Aprovado",
    recusado: "Recusado",
    conta_ativa: "Conta ativa",
  };

  return labels[status] || status || "—";
}

function InfoItem({ label, value, icon: Icon, destaqueWhatsapp = false }) {
  return (
    <div className="cadmor-view-item">
      <span className={destaqueWhatsapp ? "cadmor-whatsapp-label" : ""}>
        {destaqueWhatsapp ? (
          <FaWhatsapp className="cadmor-whatsapp-icon" />
        ) : Icon ? (
          <Icon size={14} />
        ) : null}

        {label}
      </span>
      <strong>{valor(value)}</strong>
    </div>
  );
}

function StatusPill({ label, status }) {
  return (
    <div className="cadmor-view-status-pill">
      <span>{label}</span>
      <strong>{statusLabel(status)}</strong>
    </div>
  );
}

export default function ModalVisualizarMorador({
  aberto,
  morador,
  auditoria,
  onClose,
  onEditar,
}) {
  if (!aberto || !morador) return null;

  const raw = morador.raw || morador;

  const nome = raw.nome || morador.nome;
  const email = raw.email || morador.email;
  const telefone = raw.telefone || morador.telefone;
  const torre = morador.torre_nome || raw.torre || raw.bloco;
  const unidade = morador.unidade_nome || raw.unidade;
  const origem = raw.origem_cadastro || morador.origem_cadastro;
  const observacoes = raw.observacoes;

  return (
    <div className="cadmor-modal-overlay" role="dialog" aria-modal="true">
      <div className="cadmor-modal cadmor-modal-view">
        <header className="cadmor-modal-head cadmor-view-head">
          <div>
            <span>
              <User size={17} />
              Visualizar Morador
            </span>
            <h2>{valor(nome)}</h2>
            <p>
              Consulta em modo somente leitura dos dados do pré-cadastro do
              morador.
            </p>
          </div>

          <button type="button" className="cadmor-modal-close" onClick={onClose}>
            <X size={19} />
          </button>
        </header>

        <div className="cadmor-view-body">
          <section className="cadmor-view-main">
            <div className="cadmor-view-section">
              <div className="cadmor-view-section-head">
                <h3>Dados principais</h3>
                <p>Identificação básica do responsável da unidade.</p>
              </div>

              <div className="cadmor-view-grid">
                <InfoItem label="Nome" value={nome} icon={User} />
                <InfoItem label="Torre/Bloco" value={torre} />
                <InfoItem label="Unidade" value={unidade} />
                <InfoItem label="Origem" value={origem} />
              </div>
            </div>

            <div className="cadmor-view-section">
              <div className="cadmor-view-section-head">
                <h3>Contato</h3>
                <p>Dados utilizados para comunicação e envio de convite.</p>
              </div>

              <div className="cadmor-view-grid">
                <InfoItem label="E-mail" value={email} icon={Mail} />
                <InfoItem
                  label="WhatsApp"
                  value={formatarTelefoneBR(telefone)}
                  destaqueWhatsapp
                />
              </div>
            </div>

            <div className="cadmor-view-section">
              <div className="cadmor-view-section-head">
                <h3>Status do cadastro</h3>
                <p>Situação atual do pré-cadastro, convite, auditoria e conta.</p>
              </div>

              <div className="cadmor-view-status-grid">
                <StatusPill label="Cadastro" status={raw.status_cadastro} />
                <StatusPill label="Convite" status={raw.status_convite} />
                <StatusPill label="Auditoria" status={raw.status_auditoria} />
                <StatusPill label="Conta" status={raw.status_conta} />
              </div>
            </div>

            <div className="cadmor-view-section">
              <div className="cadmor-view-section-head">
                <h3>Observações</h3>
                <p>Informações complementares registradas no cadastro.</p>
              </div>

              <div className="cadmor-view-note">
                {observacoes ? observacoes : "Nenhuma observação registrada."}
              </div>
            </div>
          </section>

          <aside className="cadmor-view-aside">
            <div className="cadmor-view-card">
              <span className="cadmor-view-card-kicker">Identificador do pré-cadastro</span>

              <button
                type="button"
                className="cadmor-view-code-short"
                onClick={() => copiarTexto(gerarCodigoCurtoMorador(morador))}
                title="Copiar código curto"
              >
                {gerarCodigoCurtoMorador(morador)}
              </button>

              <span className="cadmor-view-code-full">
                UUID: {raw.id || morador.pre_cadastro_id || "—"}
              </span>

              <p>Código curto para conferência rápida. O UUID completo permanece disponível abaixo.</p>
            </div>

            <div className="cadmor-view-card">
              <span className="cadmor-view-card-kicker">Datas</span>

              <div className="cadmor-view-mini-list">
                <div>
                  <CalendarDays size={14} />
                  <span>Criado em</span>
                  <strong>{formatarDataHoraBR(raw.criado_em)}</strong>
                </div>

                <div>
                  <Clock size={14} />
                  <span>Atualizado em</span>
                  <strong>{formatarDataHoraBR(raw.atualizado_em)}</strong>
                </div>
              </div>
            </div>

            <div className="cadmor-view-card">
              <span className="cadmor-view-card-kicker">Auditoria</span>

              <div className="cadmor-view-audit">
                <ShieldCheck size={18} />
                <div>
                  <strong>
                    {auditoria?.status_auditoria
                      ? statusLabel(auditoria.status_auditoria)
                      : "Sem auditoria recente"}
                  </strong>
                  <p>
                    {auditoria?.tipo_auditoria
                      ? `${auditoria.tipo_auditoria} • ${formatarDataHoraBR(
                          auditoria.criado_em
                        )}`
                      : "O histórico completo será exibido na etapa Auditoria > Moradores."}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <footer className="cadmor-modal-footer cadmor-view-footer">
          <button type="button" className="cadmor-btn secondary" onClick={onClose}>
            Fechar
          </button>

          <button
            type="button"
            className="cadmor-btn primary"
            onClick={() => onEditar?.(raw)}
          >
            <Edit3 size={16} />
            Editar Dados
          </button>
        </footer>
      </div>
    </div>
  );
}