/**
 * Retorna uma referência segura para apresentação visual.
 *
 * Não cria, calcula ou reserva referencia_lote.
 * A referência oficial sempre deverá vir do backend.
 */
export function getEntradaDisplayReference(context) {
  return (
    context?.referenciaLote ??
    context?.referencia ??
    null
  );
}

/**
 * Garante um array somente para consumo visual.
 *
 * Não altera granularidade e não interpreta estado operacional.
 */
export function normalizeEntradaCollection(value) {
  return Array.isArray(value) ? value : [];
}