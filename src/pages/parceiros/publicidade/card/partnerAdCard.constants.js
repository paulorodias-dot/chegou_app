export const PARTNER_AD_CARD_VARIANTS = Object.freeze({
  SIDEBAR: 'sidebar',
  HORIZONTAL: 'horizontal',
  COMPACT: 'compact',
})

export const PARTNER_AD_CARD_STATUS = Object.freeze({
  ACTIVE: 'active',
  SCHEDULED: 'scheduled',
  EXPIRED: 'expired',
  SUSPENDED: 'suspended',
  REJECTED: 'rejected',
  EMPTY: 'empty',
})

export const PARTNER_AD_CARD_LABELS = Object.freeze({
  PARTNER: 'Parceiro',
  SPONSORED: 'Conteúdo patrocinado',
  INSTITUTIONAL: 'Conteúdo institucional',
})

export const PARTNER_AD_CARD_DEFAULTS = Object.freeze({
  variant: PARTNER_AD_CARD_VARIANTS.SIDEBAR,
  status: PARTNER_AD_CARD_STATUS.ACTIVE,
  label: PARTNER_AD_CARD_LABELS.PARTNER,
  imageAlt: 'Conteúdo publicitário de parceiro do Sistema Chegou!',
  ctaLabel: 'Saiba mais',
})

export const PARTNER_AD_ALLOWED_PROTOCOLS = Object.freeze([
  'http:',
  'https:',
])

export const PARTNER_AD_INTERNAL_PATH_PREFIXES = Object.freeze([
  '/',
  '#',
])