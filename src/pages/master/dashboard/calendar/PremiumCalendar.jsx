import {
  useMemo,
  useState,
} from 'react'

import './PremiumCalendar.css'

const WEEKDAYS = [
  'D',
  'S',
  'T',
  'Q',
  'Q',
  'S',
  'S',
]

function criarInicioDoMes(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1,
  )
}

function adicionarMeses(date, quantidade) {
  return new Date(
    date.getFullYear(),
    date.getMonth() + quantidade,
    1,
  )
}

function mesmoDia(dateA, dateB) {
  return (
    dateA.getFullYear() ===
      dateB.getFullYear() &&
    dateA.getMonth() ===
      dateB.getMonth() &&
    dateA.getDate() ===
      dateB.getDate()
  )
}

function obterTituloMes(date) {
  const titulo =
    new Intl.DateTimeFormat('pt-BR', {
      month: 'long',
      year: 'numeric',
    }).format(date)

  return (
    titulo.charAt(0).toUpperCase() +
    titulo.slice(1)
  )
}

function obterDiasCalendario(monthDate) {
  const ano = monthDate.getFullYear()
  const mes = monthDate.getMonth()

  const primeiroDia = new Date(
    ano,
    mes,
    1,
  )

  const ultimoDia = new Date(
    ano,
    mes + 1,
    0,
  )

  const quantidadeDias =
    ultimoDia.getDate()

  const deslocamentoInicial =
    primeiroDia.getDay()

  const dias = []

  for (
    let index = 0;
    index < deslocamentoInicial;
    index += 1
  ) {
    dias.push(null)
  }

  for (
    let dia = 1;
    dia <= quantidadeDias;
    dia += 1
  ) {
    dias.push(
      new Date(
        ano,
        mes,
        dia,
      ),
    )
  }

  /*
   * Completa a última semana para manter
   * a estrutura visual estável.
   */
  while (dias.length % 7 !== 0) {
    dias.push(null)
  }

  return dias
}

function PremiumCalendar({
  eyebrow = 'Agenda Master',
}) {
  const hoje = new Date()

  const [
    visibleMonth,
    setVisibleMonth,
  ] = useState(() =>
    criarInicioDoMes(hoje),
  )

  const calendarDays = useMemo(
    () =>
      obterDiasCalendario(
        visibleMonth,
      ),
    [visibleMonth],
  )

  const tituloMes = useMemo(
    () =>
      obterTituloMes(
        visibleMonth,
      ),
    [visibleMonth],
  )

  function voltarMes() {
    setVisibleMonth((current) =>
      adicionarMeses(
        current,
        -1,
      ),
    )
  }

  function avancarMes() {
    setVisibleMonth((current) =>
      adicionarMeses(
        current,
        1,
      ),
    )
  }

  /*
   * Mantemos temporariamente os pontos
   * demonstrativos já existentes.
   *
   * Eles aparecem somente em agosto/2026
   * para não criar eventos fictícios em
   * outros meses.
   */
  function possuiEventoDemonstrativo(
    date,
  ) {
    if (!date) {
      return false
    }

    return (
      date.getFullYear() === 2026 &&
      date.getMonth() === 7 &&
      [12, 19].includes(
        date.getDate(),
      )
    )
  }

  return (
    <article className="premium-calendar">
      <header className="premium-calendar-header">
        <div>
          <span>
            {eyebrow}
          </span>

          <h2>
            {tituloMes}
          </h2>
        </div>

        <div className="premium-calendar-actions">
          <button
            type="button"
            onClick={voltarMes}
            aria-label="Mês anterior"
          >
            ‹
          </button>

          <button
            type="button"
            onClick={avancarMes}
            aria-label="Próximo mês"
          >
            ›
          </button>
        </div>
      </header>

      <div className="premium-calendar-weekdays">
        {WEEKDAYS.map(
          (day, index) => (
            <span
              key={`${day}-${index}`}
            >
              {day}
            </span>
          ),
        )}
      </div>

      <div className="premium-calendar-grid">
        {calendarDays.map(
          (date, index) => {
            const isToday =
              date
                ? mesmoDia(
                    date,
                    hoje,
                  )
                : false

            const hasEvent =
              possuiEventoDemonstrativo(
                date,
              )

            return (
              <button
                key={
                  date
                    ? date.toISOString()
                    : `empty-${index}`
                }
                type="button"
                disabled={!date}
                className={[
                  isToday
                    ? 'is-today'
                    : '',
                  hasEvent
                    ? 'has-event'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {date
                  ? date.getDate()
                  : ''}
              </button>
            )
          },
        )}
      </div>

      <div className="premium-calendar-next-event">
        <span className="premium-calendar-event-dot" />

        <div>
          <small>
            Próximo acompanhamento
          </small>

          <strong>
            Revisão semanal do ecossistema
          </strong>

          <p>
            12 de agosto · Evento demonstrativo
          </p>
        </div>
      </div>
    </article>
  )
}

export default PremiumCalendar