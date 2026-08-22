/*
 * SISTEMA CHEGOU!
 * Módulo Morador — Encomendas > Rastreio
 *
 * Mapper do contrato backend → contrato visual.
 *
 * Regras:
 * - não cria fatos;
 * - não altera autoridade operacional;
 * - não cria status inexistentes;
 * - apenas adapta nomes/formatação para a UI.
 */

const STATUS_LABELS = {
  AGUARDANDO_RECEBIMENTO:
    "Aguardando recebimento",

  ENCONTRADO_NO_LOTE:
    "Reconhecida na Portaria",

  AGUARDANDO_ENTRADA:
    "Aguardando entrada",

  VINCULADO_ENCOMENDA:
    "Vinculada à encomenda",

  CANCELADO:
    "Cancelado",

  EXPIRADO:
    "Expirado",

  DIVERGENTE:
    "Requer análise",
};

function normalizeNullableText(value) {
  const normalized =
    String(value ?? "").trim();

  return normalized || null;
}

function formatDateTime(value) {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat(
      "pt-BR",
      {
        dateStyle: "short",
        timeStyle: "short",
      },
    ).format(date);
  } catch {
    return null;
  }
}

function resolveTransportadora(item) {
  const confirmada =
    item
      ?.transportadora_confirmada
      ?.nome;

  const informada =
    item
      ?.transportadora_informada
      ?.nome;

  return (
    normalizeNullableText(
      confirmada,
    ) ||
    normalizeNullableText(
      informada,
    ) ||
    null
  );
}

function resolveUltimaAtualizacao(item) {
  const timestamp =
    item?.confirmado_em ||
    item?.aguardando_entrada_em ||
    item?.encontrado_em ||
    item?.atualizado_em ||
    item?.criado_em;

  return formatDateTime(
    timestamp,
  );
}

function resolveLocalAtual(item) {
  switch (item?.status) {
    case "ENCONTRADO_NO_LOTE":
      return "Recebimento do condomínio";

    case "AGUARDANDO_ENTRADA":
      return "Portaria do condomínio";

    case "VINCULADO_ENCOMENDA":
      return "Sistema Chegou!";

    default:
      return null;
  }
}

export function mapMoradorRastreioItem(
  item,
) {
  if (
    !item ||
    typeof item !== "object"
  ) {
    return null;
  }

  const status =
    normalizeNullableText(
      item.status,
    );

  const transportadoraInformada =
    item
      ?.transportadora_informada ??
    null;

  const transportadoraConfirmada =
    item
      ?.transportadora_confirmada ??
    null;

  return {
    /*
     * Identidade
     */
    id:
      item.id ?? null,

    codigo:
      normalizeNullableText(
        item.codigo_rastreio,
      ),

    descricao:
      normalizeNullableText(
        item.descricao_compra,
      ),

    /*
     * Estado visual
     */
    situacao:
      STATUS_LABELS[status] ||
      status ||
      "Situação indisponível",

    status,

    transportadora:
      resolveTransportadora(
        item,
      ),

    ultimaAtualizacao:
      resolveUltimaAtualizacao(
        item,
      ),

    localAtual:
      resolveLocalAtual(
        item,
      ),

    /*
     * Autoridade de transportadora.
     *
     * A Portaria prevalece quando houver confirmação.
     */
    transportadoraInformada,

    transportadoraConfirmada,

    transportadoraDivergente:
      transportadoraConfirmada
        ?.divergente === true,

    /*
     * Permissões entregues pelo backend.
     */
    podeEditar:
      item?.pode_editar === true,

    podeCancelar:
      item?.pode_cancelar === true,

    motivoBloqueio:
      normalizeNullableText(
        item?.motivo_bloqueio,
      ),

    /*
     * Contexto operacional.
     */
    encontradoEm:
      item?.encontrado_em ??
      null,

    aguardandoEntradaEm:
      item
        ?.aguardando_entrada_em ??
      null,

    confirmadoEm:
      item?.confirmado_em ??
      null,

    previstoPara:
      item?.previsto_para ??
      null,

    unidadeId:
      item?.unidade_id ??
      null,

    torre:
      normalizeNullableText(
        item?.torre,
      ),

    bloco:
      normalizeNullableText(
        item?.bloco,
      ),

    unidade:
      normalizeNullableText(
        item?.unidade,
      ),

    /*
     * Mantemos o contrato bruto disponível para
     * operações específicas, sem obrigar componentes
     * visuais a conhecer nomes SQL.
     */
    raw: item,
  };
}

export function mapMoradorRastreios(
  items,
) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map(
      mapMoradorRastreioItem,
    )
    .filter(Boolean);
}

export function getMoradorRastreioStatusLabel(
  status,
) {
  return (
    STATUS_LABELS[status] ||
    status ||
    "Situação indisponível"
  );
}