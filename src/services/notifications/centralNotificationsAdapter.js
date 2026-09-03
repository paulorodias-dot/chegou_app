/**
 * CENTRAL DE NOTIFICAÇÕES — SISTEMA CHEGOU!
 *
 * Adapter oficial do contrato frontend da Central.
 *
 * Responsabilidades:
 * - receber o retorno bruto das RPCs oficiais;
 * - normalizar nomes e estados para consumo pelos componentes;
 * - impedir que componentes dependam diretamente do schema físico;
 * - preservar timestamps autoritativos do backend.
 *
 * Este arquivo:
 * - não acessa Supabase;
 * - não consulta tabelas;
 * - não decide destinatários;
 * - não decide canais;
 * - não altera preferências;
 * - não implementa regras de negócio de módulos consumidores.
 */

function normalizarTexto(valor) {
  if (typeof valor !== "string") {
    return null;
  }

  const texto = valor.trim();

  return texto || null;
}

function normalizarBoolean(valor) {
  return valor === true;
}

function normalizarTimestamp(valor) {
  if (!valor) {
    return null;
  }

  return String(valor);
}

/**
 * Normaliza uma notificação da Inbox para o contrato oficial
 * consumido pelos componentes da Central.
 */
export function adaptarNotificacaoSininho(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const inboxId = normalizarTexto(item.inbox_id);
  const notificationId = normalizarTexto(item.central_notificacao_id);

  if (!inboxId || !notificationId) {
    return null;
  }

  const viewedAt = normalizarTimestamp(item.visualizada_em);
  const readAt = normalizarTimestamp(item.lida_em);

  return Object.freeze({
    id: inboxId,

    notificationId,

    title: normalizarTexto(item.titulo) || "Notificação",

    summary: normalizarTexto(item.resumo),

    category: normalizarTexto(item.categoria_codigo),

    priority: normalizarTexto(item.prioridade),

    iconCode: normalizarTexto(item.icone_codigo),

    navigation: Object.freeze({
      route: normalizarTexto(item.rota_destino),
      anchor: normalizarTexto(item.ancora_destino),
      actionCode: normalizarTexto(item.acao_codigo),
      openIn: normalizarTexto(item.abrir_em),
    }),

    requiresAction: normalizarBoolean(item.requer_acao),

    status: normalizarTexto(item.status),

    viewedAt,

    readAt,

    createdAt: normalizarTimestamp(item.criado_em),

    isViewed: viewedAt !== null,

    isRead: readAt !== null,
  });
}

/**
 * Normaliza a coleção devolvida pela RPC oficial do sininho.
 */
export function adaptarNotificacoesSininho(itens) {
  if (!Array.isArray(itens)) {
    return [];
  }

  return itens
    .map(adaptarNotificacaoSininho)
    .filter(Boolean);
}

/**
 * Normaliza o contador oficial.
 */
export function adaptarContadorNaoLidas(valor) {
  const total = Number(valor);

  if (!Number.isFinite(total) || total < 0) {
    return 0;
  }

  return Math.trunc(total);
}

/**
 * Normaliza o retorno da operação "marcar visualizada".
 */
export function adaptarResultadoVisualizacao(resultado) {
  if (!resultado || typeof resultado !== "object") {
    return null;
  }

  const inboxId = normalizarTexto(resultado.inbox_id);

  if (!inboxId) {
    return null;
  }

  return Object.freeze({
    id: inboxId,
    viewedAt: normalizarTimestamp(resultado.visualizada_em),
  });
}

/**
 * Normaliza o retorno da operação "marcar lida".
 */
export function adaptarResultadoLeitura(resultado) {
  if (!resultado || typeof resultado !== "object") {
    return null;
  }

  const inboxId = normalizarTexto(resultado.inbox_id);

  if (!inboxId) {
    return null;
  }

  return Object.freeze({
    id: inboxId,
    viewedAt: normalizarTimestamp(resultado.visualizada_em),
    readAt: normalizarTimestamp(resultado.lida_em),
  });
}

/**
 * Normaliza o retorno da operação "marcar todas como lidas".
 */
export function adaptarResultadoLeituraEmMassa(resultado) {
  if (!resultado || typeof resultado !== "object") {
    return Object.freeze({
      updatedCount: 0,
      readAt: null,
    });
  }

  const total = Number(resultado.total_atualizado);

  return Object.freeze({
    updatedCount:
      Number.isFinite(total) && total >= 0
        ? Math.trunc(total)
        : 0,

    readAt: normalizarTimestamp(resultado.lida_em),
  });
}