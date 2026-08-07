import './PremiumCalendar.css'

const calendarDays = [
  null,
  null,
  null,
  null,
  null,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  21,
  22,
  23,
  24,
  25,
  26,
  27,
  28,
  29,
  30,
  31,
]

function PremiumCalendar() {
  return (
    <article className="premium-calendar-card">
      <header className="premium-calendar-header">
        <div>
          <span>Agenda Master</span>
          <h2>Agosto de 2026</h2>
        </div>

        <div className="premium-calendar-actions">
          <button type="button" aria-label="Mês anterior">
            ‹
          </button>

          <button type="button" aria-label="Próximo mês">
            ›
          </button>
        </div>
      </header>

      <div className="premium-calendar-weekdays">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => (
          <span key={`${day}-${index}`}>
            {day}
          </span>
        ))}
      </div>

      <div className="premium-calendar-grid">
        {calendarDays.map((day, index) => (
          <button
            key={`${day || 'empty'}-${index}`}
            type="button"
            disabled={!day}
            className={[
              day === 6 ? 'is-today' : '',
              day === 12 || day === 19 ? 'has-event' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {day}
          </button>
        ))}
      </div>

      <div className="premium-calendar-next-event">
        <span className="premium-calendar-event-dot" />

        <div>
          <small>Próximo acompanhamento</small>
          <strong>Revisão semanal do ecossistema</strong>
          <p>12 de agosto · Evento demonstrativo</p>
        </div>
      </div>
    </article>
  )
}

export default PremiumCalendar