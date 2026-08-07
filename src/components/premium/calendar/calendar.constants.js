export const CALENDAR_WEEKDAYS = Object.freeze([
  'DOM',
  'SEG',
  'TER',
  'QUA',
  'QUI',
  'SEX',
  'SÁB',
])

export const CALENDAR_MONTHS = Object.freeze([
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
])

export const CALENDAR_EVENT_CATEGORIES = Object.freeze({
  INSTITUTIONAL: 'institutional',
  MAINTENANCE: 'maintenance',
  INTEGRATION: 'integration',
  CONTRACT: 'contract',
  SECURITY: 'security',
  UPDATE: 'update',
  MEETING: 'meeting',
  CAMPAIGN: 'campaign',
  AUDIT: 'audit',
  RELEASE: 'release',
})

export const CALENDAR_EVENT_CATEGORY_LABELS = Object.freeze({
  institutional: 'Institucional',
  maintenance: 'Manutenção',
  integration: 'Integração',
  contract: 'Contrato',
  security: 'Segurança',
  update: 'Atualização',
  meeting: 'Reunião',
  campaign: 'Campanha',
  audit: 'Auditoria',
  release: 'Lançamento',
})

export const CALENDAR_EVENT_PRIORITY_LABELS = Object.freeze({
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
})

export const CALENDAR_EVENT_STATUS_LABELS = Object.freeze({
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  pending: 'Pendente',
})