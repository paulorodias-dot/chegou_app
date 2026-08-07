import {
  PARTNER_AD_ALLOWED_PROTOCOLS,
  PARTNER_AD_CARD_STATUS,
  PARTNER_AD_INTERNAL_PATH_PREFIXES,
} from './partnerAdCard.constants'

/**
 * Verifica se o destino é uma rota interna ou uma âncora.
 */
export function isInternalPartnerAdUrl(value) {
  if (typeof value !== 'string') {
    return false
  }

  const normalizedValue = value.trim()

  return PARTNER_AD_INTERNAL_PATH_PREFIXES.some((prefix) =>
    normalizedValue.startsWith(prefix),
  )
}

/**
 * Valida destinos externos e impede protocolos inseguros,
 * como javascript:, data: e outros não autorizados.
 */
export function isSafePartnerAdUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return false
  }

  const normalizedValue = value.trim()

  if (isInternalPartnerAdUrl(normalizedValue)) {
    return true
  }

  try {
    const parsedUrl = new URL(normalizedValue)

    return PARTNER_AD_ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)
  } catch {
    return false
  }
}

/**
 * Retorna o destino somente quando ele for seguro.
 */
export function normalizePartnerAdUrl(value) {
  if (!isSafePartnerAdUrl(value)) {
    return null
  }

  return value.trim()
}

/**
 * Define se o link deve abrir em uma nova aba.
 */
export function shouldOpenPartnerAdInNewTab(value) {
  const safeUrl = normalizePartnerAdUrl(value)

  if (!safeUrl) {
    return false
  }

  return !isInternalPartnerAdUrl(safeUrl)
}

/**
 * Verifica se a campanha pode ser apresentada.
 *
 * Nesta primeira versão, somente campanhas com status ativo
 * podem ser renderizadas.
 */
export function isPartnerAdRenderable({
  status,
  imageSrc,
}) {
  return Boolean(
    status === PARTNER_AD_CARD_STATUS.ACTIVE &&
      typeof imageSrc === 'string' &&
      imageSrc.trim(),
  )
}

/**
 * Formata a vigência para apresentação simples na interface.
 */
export function formatPartnerAdValidity({
  validFrom,
  validUntil,
  locale = 'pt-BR',
}) {
  if (!validFrom && !validUntil) {
    return ''
  }

  const formatter = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  function formatDate(value) {
    if (!value) {
      return null
    }

    const parsedDate = new Date(value)

    if (Number.isNaN(parsedDate.getTime())) {
      return null
    }

    return formatter.format(parsedDate)
  }

  const formattedStart = formatDate(validFrom)
  const formattedEnd = formatDate(validUntil)

  if (formattedStart && formattedEnd) {
    return `Vigência: ${formattedStart} até ${formattedEnd}`
  }

  if (formattedEnd) {
    return `Disponível até ${formattedEnd}`
  }

  if (formattedStart) {
    return `Disponível desde ${formattedStart}`
  }

  return ''
}