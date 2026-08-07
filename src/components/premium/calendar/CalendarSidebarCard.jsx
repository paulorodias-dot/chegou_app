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
  getEventsForDate,
  getMonthLabel,
  hasEventsForDate,
  isSameDay,
} from './calendar.utils'

import CalendarDayModal from './CalendarDayModal'

import './CalendarSidebarCard.css'

function CalendarSidebarCard({
  events = [],
  initialDate = new Date(),
  onOpenCalendar,
  onDateSelect,
  onDateDoubleClick,
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

  const visibleEvents =
    selectedEvents.slice(0, 2)

  function handleSingleClick(date) {
    window.clearTimeout(clickTimerRef.current)

    clickTimerRef.current =
      window.setTimeout(() => {
        setSelectedDate(date)

        setVisibleMonth(
          new Date(
            date.getFullYear(),
            date.getMonth(),
            1,
          ),
        )

        onDateSelect?.(date)
      }, 240)
  }

  function handleDoubleClick(date) {
    window.clearTimeout(clickTimerRef.current)

    setSelectedDate(date)
    setModalDate(date)

    onDateDoubleClick?.(date)
  }

  return (
    <>
      <article className="calendar-sidebar-card">
        <header className="calendar-sidebar-card__header">
          <div>
            <span>Agenda Master</span>
            <h2>Calendário</h2>
          </div>

          <button
            type="button"
            onClick={onOpenCalendar}
          >
            Abrir calendário
          </button>
        </header>

        <div className="calendar-sidebar-card__month-header">
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
        </div>

        <div className="calendar-sidebar-card__weekdays">
          {CALENDAR_WEEKDAYS.map(
            (weekday) => (
              <span key={weekday}>
                {weekday.charAt(0)}
              </span>
            ),
          )}
        </div>

        <div className="calendar-sidebar-card__grid">
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
                'calendar-sidebar-card__day',
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
                  key={formatDateISO(date)}
                  type="button"
                  className={className}
                  onClick={() =>
                    handleSingleClick(date)
                  }
                  onDoubleClick={() =>
                    handleDoubleClick(date)
                  }
                  aria-label={formatDateBR(
                    date,
                  )}
                >
                  {date.getDate()}
                </button>
              )
            },
          )}
        </div>

        <section className="calendar-sidebar-card__agenda">
          <header>
            <div>
              <span>Agenda selecionada</span>

              <strong>
                {formatDateBR(selectedDate)}
              </strong>
            </div>

            <small>
              {selectedEvents.length}{' '}
              {selectedEvents.length === 1
                ? 'evento'
                : 'eventos'}
            </small>
          </header>

          {visibleEvents.length === 0 ? (
            <div className="calendar-sidebar-card__empty">
              Nenhum compromisso para esta data.
            </div>
          ) : (
            <div className="calendar-sidebar-card__events">
              {visibleEvents.map(
                (event) => (
                  <article
                    key={event.id}
                    className="calendar-sidebar-card__event"
                  >
                    <time>
                      {formatEventTime(
                        event.startAt,
                      )}
                    </time>

                    <div>
                      <strong>
                        {event.title}
                      </strong>

                      <span>
                        {event.category}
                      </span>
                    </div>
                  </article>
                ),
              )}
            </div>
          )}

          {selectedEvents.length > 2 && (
            <button
              type="button"
              className="calendar-sidebar-card__more"
              onClick={() =>
                setModalDate(selectedDate)
              }
            >
              +{selectedEvents.length - 2}{' '}
              outros compromissos
            </button>
          )}
        </section>
      </article>

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

export default CalendarSidebarCard