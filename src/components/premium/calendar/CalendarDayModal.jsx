import { useEffect } from 'react'

import {
  formatEventTime,
  formatLongDateBR,
  getEventCategoryLabel,
  getEventPriorityLabel,
  getEventStatusLabel,
} from './calendar.utils'

import './CalendarDayModal.css'

function CalendarDayModal({
  date,
  events = [],
  onClose,
  onRequestCreate,
}) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.classList.add(
      'calendar-day-modal-body-locked',
    )

    return () => {
      document.removeEventListener(
        'keydown',
        handleKeyDown,
      )

      document.body.classList.remove(
        'calendar-day-modal-body-locked',
      )
    }
  }, [onClose])

  return (
    <div
      className="calendar-day-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section
        className="calendar-day-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-day-modal-title"
      >
        <header className="calendar-day-modal__header">
          <div>
            <span>Agenda do dia</span>

            <h2 id="calendar-day-modal-title">
              {formatLongDateBR(date)}
            </h2>

            <p>
              {events.length === 0
                ? 'Nenhum compromisso cadastrado para esta data.'
                : `${events.length} ${
                    events.length === 1
                      ? 'compromisso encontrado'
                      : 'compromissos encontrados'
                  }.`}
            </p>
          </div>

          <button
            type="button"
            className="calendar-day-modal__close"
            onClick={onClose}
            aria-label="Fechar agenda"
          >
            ×
          </button>
        </header>

        <div className="calendar-day-modal__content">
          {events.length === 0 ? (
            <div className="calendar-day-modal__empty">
              <span aria-hidden="true">📅</span>

              <strong>Nenhum evento próximo</strong>

              <p>
                Os compromissos e serviços desta data
                aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="calendar-day-modal__events">
              {events.map((event) => (
                <article
                  key={event.id}
                  className="calendar-day-modal__event"
                >
                  <div className="calendar-day-modal__event-time">
                    {formatEventTime(event.startAt)}
                  </div>

                  <div className="calendar-day-modal__event-content">
                    <div className="calendar-day-modal__event-badges">
                      <span>
                        {getEventCategoryLabel(
                          event.category,
                        )}
                      </span>

                      <span>
                        {getEventPriorityLabel(
                          event.priority,
                        )}
                      </span>

                      <span>
                        {getEventStatusLabel(
                          event.status,
                        )}
                      </span>
                    </div>

                    <h3>{event.title}</h3>

                    {event.description && (
                      <p>{event.description}</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <footer className="calendar-day-modal__footer">
          <span>
            Os dados exibidos nesta etapa são
            demonstrativos.
          </span>

          <button
            type="button"
            onClick={() =>
              onRequestCreate?.(date)
            }
            disabled={
              typeof onRequestCreate !== 'function'
            }
          >
            Novo serviço
          </button>
        </footer>
      </section>
    </div>
  )
}

export default CalendarDayModal