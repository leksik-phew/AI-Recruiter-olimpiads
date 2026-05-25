import { AlertCircle, Clock3 } from 'lucide-react';
import type { CalendarEvent } from '../types';

interface Props {
  events: CalendarEvent[];
}

const MONTHS = [
  '',
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

function buildDate(event: CalendarEvent) {
  return new Date(event.year, event.month - 1, event.day);
}

function formatDate(event: CalendarEvent) {
  return `${event.day} ${MONTHS[event.month]}`;
}

function getPriorityLabel(priority: CalendarEvent['priority']) {
  if (priority === 'high') {
    return 'важно';
  }

  if (priority === 'medium') {
    return 'в ритме';
  }

  return 'спокойно';
}

function getTypeClass(type: string) {
  const normalized = type.toLowerCase();

  if (normalized.includes('олим')) {
    return 'lavender';
  }

  if (normalized.includes('конкур')) {
    return 'powder';
  }

  return 'taupe';
}

export default function CalendarView({ events }: Props) {
  const grouped: Record<string, CalendarEvent[]> = {};

  for (const event of events) {
    const key = `${event.year}-${event.month}`;
    grouped[key] = grouped[key] ? [...grouped[key], event] : [event];
  }

  const sortedKeys = Object.keys(grouped).sort((left, right) => {
    const [leftYear, leftMonth] = left.split('-').map(Number);
    const [rightYear, rightMonth] = right.split('-').map(Number);

    if (leftYear !== rightYear) {
      return leftYear - rightYear;
    }

    return leftMonth - rightMonth;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = events
    .slice()
    .sort((left, right) => buildDate(left).getTime() - buildDate(right).getTime())
    .filter((event) => buildDate(event).getTime() >= today.getTime())
    .slice(0, 4);

  const fallbackUpcoming =
    upcoming.length > 0
      ? upcoming
      : events
          .slice()
          .sort((left, right) => buildDate(left).getTime() - buildDate(right).getTime())
          .slice(0, 4);

  return (
    <div className="calendar-layout">
      <aside className="calendar-sidecard">
        <div className="calendar-sidecard__title">
          <AlertCircle size={16} />
          <h3>Ближайшие акценты</h3>
        </div>

        <div className="calendar-alerts">
          {fallbackUpcoming.map((event) => (
            <article key={`${event.olympiad_id}-${event.stage_name}`} className="alert-card">
              <div className={`event-type event-type--${getTypeClass(event.type)}`}>{event.type}</div>
              <strong>{event.olympiad_name}</strong>
              <p>{event.stage_name}</p>
              <span>{formatDate(event)}</span>
            </article>
          ))}
        </div>
      </aside>

      <div className="calendar-timeline">
        {sortedKeys.map((key) => {
          const [year, month] = key.split('-').map(Number);
          const monthEvents = grouped[key].slice().sort((left, right) => left.day - right.day);

          return (
            <section key={key} className="calendar-month">
              <header className="calendar-month__head">
                <div>
                  <p className="kicker">Календарный лист</p>
                  <h3>
                    {MONTHS[month]} {year}
                  </h3>
                </div>
                <span>{monthEvents.length} событий</span>
              </header>

              <div className="calendar-month__list">
                {monthEvents.map((event) => (
                  <article
                    key={`${event.olympiad_id}-${event.stage_name}-${event.day}`}
                    className="timeline-card"
                  >
                    <div className="timeline-card__date">
                      <strong>{event.day}</strong>
                      <small>{MONTHS[month].slice(0, 3)}</small>
                    </div>

                    <div className="timeline-card__body">
                      <div className="timeline-card__badges">
                        <span className={`event-type event-type--${getTypeClass(event.type)}`}>
                          {event.type}
                        </span>
                        <span className="event-priority">{getPriorityLabel(event.priority)}</span>
                      </div>
                      <h4>{event.stage_name}</h4>
                      <p>{event.olympiad_name}</p>
                      {event.desc && <small>{event.desc}</small>}
                    </div>

                    <div className="timeline-card__score">
                      <Clock3 size={14} />
                      <span>{Math.round(event.recommendation_score * 100)}%</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
