import {
  ADMIN_ANALYTICS_CATALOG,
} from "./adminAnalyticsCatalog";


/*
 * =========================================================
 * FALLBACK OFICIAL
 * =========================================================
 *
 * Utilizado quando:
 *
 * - ainda não existe telemetria;
 * - ainda não existe preferência persistida;
 * - preferência retornada está incompleta;
 * - algum analysisId deixou de existir;
 * - ocorreu falha na origem da personalização.
 */

export const ADMIN_ANALYTICS_DEFAULT_PRIORITY =
  Object.freeze([
    "inteligencia",
    "encomendas",
    "funcionarios",
    "unidades",
  ]);


/*
 * =========================================================
 * NORMALIZAÇÃO
 * =========================================================
 *
 * O frontend nunca confia cegamente na lista recebida.
 *
 * Apenas IDs que realmente existem no catálogo são aceitos.
 */

export function normalizeAdminAnalyticsPriority(
  preferredIds = []
) {
  if (!Array.isArray(preferredIds)) {
    return [];
  }

  const validIds =
    new Set(
      ADMIN_ANALYTICS_CATALOG.map(
        (item) => item.id
      )
    );

  return [
    ...new Set(
      preferredIds.filter(
        (id) =>
          typeof id === "string" &&
          validIds.has(id)
      )
    ),
  ];
}


/*
 * =========================================================
 * RESOLVEDOR DA PRIMEIRA LINHA
 * =========================================================
 *
 * preferredIds:
 * lista futura retornada pelo backend.
 *
 * limit:
 * quantidade de itens prioritários da primeira linha.
 */

export function resolveAdminAnalyticsPriority({
  preferredIds = [],
  limit = 4,
} = {}) {
  const normalizedPreferred =
    normalizeAdminAnalyticsPriority(
      preferredIds
    );

  const normalizedFallback =
    normalizeAdminAnalyticsPriority(
      ADMIN_ANALYTICS_DEFAULT_PRIORITY
    );

  const result = [];

  /*
   * Primeiro entram as preferências reais.
   */
  normalizedPreferred.forEach(
    (id) => {
      if (
        result.length < limit &&
        !result.includes(id)
      ) {
        result.push(id);
      }
    }
  );

  /*
   * Se ainda faltarem posições,
   * completamos com o fallback oficial.
   */
  normalizedFallback.forEach(
    (id) => {
      if (
        result.length < limit &&
        !result.includes(id)
      ) {
        result.push(id);
      }
    }
  );

  /*
   * Última proteção:
   * caso o catálogo mude futuramente.
   */
  ADMIN_ANALYTICS_CATALOG.forEach(
    (item) => {
      if (
        result.length < limit &&
        !result.includes(item.id)
      ) {
        result.push(item.id);
      }
    }
  );

  return result.slice(
    0,
    limit
  );
}


/*
 * =========================================================
 * ORDENAÇÃO DO CATÁLOGO
 * =========================================================
 */

export function splitAdminAnalyticsCatalog({
  preferredIds = [],
  limit = 4,
} = {}) {
  const featuredIds =
    resolveAdminAnalyticsPriority({
      preferredIds,
      limit,
    });

  const featured =
    featuredIds
      .map((id) =>
        ADMIN_ANALYTICS_CATALOG.find(
          (item) =>
            item.id === id
        )
      )
      .filter(Boolean);

  const secondary =
    ADMIN_ANALYTICS_CATALOG.filter(
      (item) =>
        !featuredIds.includes(
          item.id
        )
    );

  return {
    featuredIds,
    featured,
    secondary,
  };
}