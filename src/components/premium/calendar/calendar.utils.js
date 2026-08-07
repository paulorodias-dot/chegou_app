import {
  CALENDAR_EVENT_CATEGORY_LABELS,
  CALENDAR_EVENT_PRIORITY_LABELS,
  CALENDAR_EVENT_STATUS_LABELS,
  CALENDAR_MONTHS,
} from './calendar.constants'

export function startOfDay(date) {
  if (!date) return null

  const normalized = new Date(date)
  normalized.setHours(0, 0, 0, 0)

  return normalized
}

export function isSameDay(firstDate, secondDate) {
  if (!firstDate || !secondDate) return false

  const first = startOfDay(firstDate)
  const second = startOfDay(secondDate)

  return first.getTime() === second.getTime()
}

export function addMonths(date, amount) {
  return new Date(
    date.getFullYear(),
    date.getMonth() + amount,
    1,
  )
}

export function getMonthLabel(date) {
  return `${CALENDAR_MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

export function getCalendarDays(monthDate) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const previousMonthLastDay = new Date(year, month, 0)

  const leadingDays = firstDay.getDay()
  const days = []

  for (
    let index = leadingDays - 1;
    index >= 0;
    index -= 1
  ) {
    days.push({
      date: new Date(
        year,
        month - 1,
        previousMonthLastDay.getDate() - index,
      ),
      isCurrentMonth: false,
    })
  }

  for (
    let day = 1;
    day <= lastDay.getDate();
    day += 1
  ) {
    days.push({
      date: new Date(year, month, day),
      isCurrentMonth: true,
    })
  }

  let nextMonthDay = 1

  while (days.length < 42) {
    days.push({
      date: new Date(
        year,
        month + 1,
        nextMonthDay,
      ),
      isCurrentMonth: false,
    })

    nextMonthDay += 1
  }

  return days
}

export function formatDateISO(date) {
  if (!date) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function formatDateBR(date) {
  if (!date) return ''

  return new Intl.DateTimeFormat('pt-BR').format(date)
}

export function formatLongDateBR(date) {
  if (!date) return ''

  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatEventTime(dateValue) {
  if (!dateValue) return 'Todo o dia'

  const date = new Date(dateValue)

  if (Number.isNaN(date.getTime())) {
    return 'Horário não informado'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function getEventsForDate(events, date) {
  if (!Array.isArray(events) || !date) {
    return []
  }

  return events
    .filter((event) =>
      isSameDay(new Date(event.startAt), date),
    )
    .sort(
      (firstEvent, secondEvent) =>
        new Date(firstEvent.startAt).getTime() -
        new Date(secondEvent.startAt).getTime(),
    )
}

export function hasEventsForDate(events, date) {
  return getEventsForDate(events, date).length > 0
}

export function getEventCategoryLabel(category) {
  return (
    CALENDAR_EVENT_CATEGORY_LABELS[category] ||
    'Evento'
  )
}

export function getEventPriorityLabel(priority) {
  return (
    CALENDAR_EVENT_PRIORITY_LABELS[priority] ||
    'Não definida'
  )
}

export function getEventStatusLabel(status) {
  return (
    CALENDAR_EVENT_STATUS_LABELS[status] ||
    'Não informado'
  )
}