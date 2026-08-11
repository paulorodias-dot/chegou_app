import {
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  CALENDAR_WEEKDAYS,
} from './calendar.constants'

import {
  addMonths,
  formatDateBR,
  formatDateISO,
  formatEventTime,
  getCalendarDays,
  getEventCategoryLabel,
  getEventsForDate,
  getMonthLabel,
  hasEventsForDate,
  isSameDay,
} from './calendar.utils'

import CalendarDayModal from './CalendarDayModal'

import './CalendarWorkspace.css'

function CalendarWorkspace({
  events = [],
  initialDate = new Date(),
  onBack,
  onRequestCreate,
}) {
  const [selectedDate, setSelectedDate] =
    useState(initialDate)

  const [visibleMonth, setVisibleMonth] =
    useState(
      new Date(
        initialDate.getFullYear(),
        initialDate.getMonth(),
        1,
      ),
    )

  const [modalDate, setModalDate] =
    useState(null)

  const clickTimerRef = useRef(null)

  const calendarDays = useMemo(
    () => getCalendarDays(visibleMonth),
    [visibleMonth],
  )

  const selectedEvents = useMemo(
    () =>
      getEventsForDate(
        events,
        selectedDate,
      ),
    [events, selectedDate],
  )

  function handleSingleClick(date) {
    window.clearTimeout(clickTimerRef.current)

    clickTimerRef.current =
      window.setTimeout(() => {
        setSelectedDate(date)
      }, 240)
  }

  function handleDoubleClick(date) {
    window.clearTimeout(clickTimerRef.current)

    setSelectedDate(date)
    setModalDate(date)
  }

  return (
    <>
      <section className="calendar-workspace">
        <header className="calendar-workspace__header">
          <div>
            <span>{eyebrow}</span>
            <h1>Calendário Premium</h1>

            <p>
              Acompanhe compromissos, marcos,
              auditorias e eventos estratégicos.
            </p>
          </div>

          <button
            type="button"
            onClick={onBack}
          >
            ← Voltar ao Dashboard
          </button>
        </header>

        <div className="calendar-workspace__layout">
          <article className="calendar-workspace__calendar">
            <header className="calendar-workspace__month-header">
              <button
                type="button"
                onClick={() =>
                  setVisibleMonth((current) =>
                    addMonths(current, -1),
                  )
                }
                aria-label="Mês anterior"
              >
                ‹
              </button>

              <strong>
                {getMonthLabel(visibleMonth)}
              </strong>

              <button
                type="button"
                onClick={() =>
                  setVisibleMonth((current) =>
                    addMonths(current, 1),
                  )
                }
                aria-label="Próximo mês"
              >
                ›
              </button>
            </header>

            <div className="calendar-workspace__weekdays">
              {CALENDAR_WEEKDAYS.map(
                (weekday) => (
                  <span key={weekday}>
                    {weekday}
                  </span>
                ),
              )}
            </div>

            <div className="calendar-workspace__grid">
              {calendarDays.map(
                ({
                  date,
                  isCurrentMonth,
                }) => {
                  const isSelected =
                    isSameDay(
                      date,
                      selectedDate,
                    )

                  const isToday =
                    isSameDay(
                      date,
                      new Date(),
                    )

                  const hasEvents =
                    hasEventsForDate(
                      events,
                      date,
                    )

                  const className = [
                    'calendar-workspace__day',
                    !isCurrentMonth
                      ? 'is-outside-month'
                      : '',
                    isSelected
                      ? 'is-selected'
                      : '',
                    isToday
                      ? 'is-today'
                      : '',
                    hasEvents
                      ? 'has-events'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')

                  return (
                    <button
                      key={formatDateISO(
                        date,
                      )}
                      type="button"
                      className={className}
                      onClick={() =>
                        handleSingleClick(
                          date,
                        )
                      }
                      onDoubleClick={() =>
                        handleDoubleClick(
                          date,
                        )
                      }
                    >
                      <span>
                        {date.getDate()}
                      </span>

                      {hasEvents && (
                        <small>
                          {
                            getEventsForDate(
                              events,
                              date,
                            ).length
                          }{' '}
                          eventos
                        </small>
                      )}
                    </button>
                  )
                },
              )}
            </div>
          </article>

          <aside className="calendar-workspace__agenda">
            <header>
              <span>Agenda selecionada</span>

              <h2>
                {formatDateBR(selectedDate)}
              </h2>

              <p>
                {selectedEvents.length}{' '}
                {selectedEvents.length === 1
                  ? 'compromisso'
                  : 'compromissos'}
              </p>
            </header>

            {selectedEvents.length === 0 ? (
              <div className="calendar-workspace__empty">
                <strong>
                  Nenhum compromisso
                </strong>

                <p>
                  Os eventos desta data aparecerão
                  aqui.
                </p>
              </div>
            ) : (
              <div className="calendar-workspace__events">
                {selectedEvents.map(
                  (event) => (
                    <article
                      key={event.id}
                      className="calendar-workspace__event"
                    >
                      <time>
                        {formatEventTime(
                          event.startAt,
                        )}
                      </time>

                      <span>
                        {getEventCategoryLabel(
                          event.category,
                        )}
                      </span>

                      <h3>
                        {event.title}
                      </h3>

                      {event.description && (
                        <p>
                          {event.description}
                        </p>
                      )}
                    </article>
                  ),
                )}
              </div>
            )}
          </aside>
        </div>
      </section>

      {modalDate && (
        <CalendarDayModal
          date={modalDate}
          events={getEventsForDate(
            events,
            modalDate,
          )}
          onClose={() =>
            setModalDate(null)
          }
          onRequestCreate={
            onRequestCreate
          }
        />
      )}
    </>
  )
}

export default CalendarWorkspace