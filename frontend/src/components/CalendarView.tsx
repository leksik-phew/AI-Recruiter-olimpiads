import { useState } from 'react';
import { AlertCircle, ArrowRight, Clock3, X } from 'lucide-react';
import type { CalendarEvent } from '../types';

interface Props {
  events: CalendarEvent[];
}

const MONTHS_FULL = [
  '',
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
const MONTHS_SHORT = [
  '', 'янв', 'фев', 'мар', 'апр', 'май', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
];
const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function buildDate(event: CalendarEvent) {
  return new Date(event.year, event.month - 1, event.day);
}

function getTypeClass(type: string) {
  const n = type.toLowerCase();
  if (n.includes('олим')) return 'lavender';
  if (n.includes('конкур')) return 'powder';
  return 'taupe';
}

function getLevelBadge(level: number | null | undefined): string | null {
  if (level === 1) return 'I';
  if (level === 2) return 'II';
  if (level === 3) return 'III';
  return null;
}

function getPriorityLabel(priority: CalendarEvent['priority']) {
  if (priority === 'high') return 'важно';
  if (priority === 'medium') return 'в ритме';
  return 'спокойно';
}

/** Строим сетку: массив недель, каждая неделя — 7 ячеек (null = пусто) */
function buildMonthGrid(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();

  // JS: 0=вс, 1=пн … → переводим в 0=пн … 6=вс
  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;

  const grid: (number | null)[][] = [];
  let week: (number | null)[] = Array(startDow).fill(null);

  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      grid.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    grid.push(week);
  }
  return grid;
}

export default function CalendarView({ events }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Группируем по месяцу
  const grouped: Record<string, CalendarEvent[]> = {};
  for (const event of events) {
    const key = `${event.year}-${String(event.month).padStart(2, '0')}`;
    grouped[key] = grouped[key] ? [...grouped[key], event] : [event];
  }
  const sortedKeys = Object.keys(grouped).sort();

  const defaultKey = sortedKeys.find((key) => {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1, 28) >= today;
  }) ?? sortedKeys[0];

  const [activeKey, setActiveKey] = useState<string>(defaultKey ?? '');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const [activeYear, activeMonth] = activeKey
    ? activeKey.split('-').map(Number)
    : [0, 0];

  const monthGrid = activeYear ? buildMonthGrid(activeYear, activeMonth) : [];

  // Индекс событий по дню: { day -> events[] }
  const eventsByDay: Record<number, CalendarEvent[]> = {};
  for (const ev of grouped[activeKey] ?? []) {
    eventsByDay[ev.day] = eventsByDay[ev.day]
      ? [...eventsByDay[ev.day], ev]
      : [ev];
  }

  // Сайдбар: ближайшие 4 события
  const upcoming = events
    .slice()
    .sort((a, b) => buildDate(a).getTime() - buildDate(b).getTime())
    .filter((e) => {
      const end =
        e.end_month && e.end_day && e.end_year
          ? new Date(e.end_year, e.end_month - 1, e.end_day)
          : buildDate(e);
      return end.getTime() >= today.getTime();
    })
    .slice(0, 4);

  const sidebarEvents =
    upcoming.length > 0
      ? upcoming
      : events
          .slice()
          .sort((a, b) => buildDate(a).getTime() - buildDate(b).getTime())
          .slice(0, 4);

  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] ?? []) : [];

  if (sortedKeys.length === 0) {
    return (
      <div className="empty-state">
        <p>Нет данных по этапам. Попробуйте обновить базу олимпиад.</p>
      </div>
    );
  }

  return (
    <div className="calendar-layout">
      {/* ── Сайдбар ──────────────────────────────────────────── */}
      <aside className="calendar-sidecard">
        <div className="calendar-sidecard__title">
          <AlertCircle size={16} />
          <h3>Ближайшие</h3>
        </div>
        <div className="calendar-alerts">
          {sidebarEvents.map((ev) => (
            <article
              key={`${ev.olympiad_id}-${ev.stage_name}`}
              className="alert-card"
            >
              <div className={`event-type event-type--${getTypeClass(ev.type)}`}>
                {ev.type}
              </div>
              <strong>{ev.olympiad_name}</strong>
              <p>{ev.stage_name}</p>
              <div className="alert-card__range">
                <span>{ev.day} {MONTHS_FULL[ev.month]}</span>
                {ev.end_month && ev.end_day && (
                  <>
                    <ArrowRight size={12} />
                    <span>{ev.end_day} {MONTHS_FULL[ev.end_month]}</span>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      </aside>

      {/* ── Основная часть ───────────────────────────────────── */}
      <div className="calendar-timeline">

        {/* Вкладки месяцев */}
        <div className="calendar-month-tabs">
          {sortedKeys.map((key) => {
            const [y, m] = key.split('-').map(Number);
            const count = grouped[key].length;
            const isActive = key === activeKey;
            return (
              <button
                key={key}
                type="button"
                className={`calendar-tab${isActive ? ' calendar-tab--active' : ''}`}
                onClick={() => { setActiveKey(key); setSelectedDay(null); }}
              >
                <span className="calendar-tab__month">{MONTHS_FULL[m]}</span>
                <span className="calendar-tab__year">{y}</span>
                <span className="calendar-tab__count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Сетка календаря */}
        <section className="calendar-month">
          <header className="calendar-month__head">
            <div>
              <p className="kicker">Календарь</p>
              <h3>{MONTHS_FULL[activeMonth]} {activeYear}</h3>
            </div>
            <span>{(grouped[activeKey] ?? []).length} этапов</span>
          </header>

          {/* Шапка дней недели */}
          <div className="cal-grid">
            {WEEK_DAYS.map((d) => (
              <div key={d} className="cal-weekday">{d}</div>
            ))}

            {/* Ячейки дней */}
            {monthGrid.map((week, wi) =>
              week.map((day, di) => {
                if (day === null) {
                  return <div key={`e-${wi}-${di}`} className="cal-cell cal-cell--empty" />;
                }

                const dayEvents = eventsByDay[day] ?? [];
                const isToday =
                  today.getFullYear() === activeYear &&
                  today.getMonth() + 1 === activeMonth &&
                  today.getDate() === day;
                const isSelected = selectedDay === day;
                const hasEvents = dayEvents.length > 0;
                const visible = dayEvents.slice(0, 2);
                const overflow = dayEvents.length - visible.length;

                return (
                  <div
                    key={`d-${wi}-${di}`}
                    className={[
                      'cal-cell',
                      isToday ? 'cal-cell--today' : '',
                      isSelected ? 'cal-cell--selected' : '',
                      hasEvents ? 'cal-cell--has-events' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() =>
                      hasEvents
                        ? setSelectedDay(isSelected ? null : day)
                        : undefined
                    }
                  >
                    <span className="cal-cell__num">{day}</span>
                    <div className="cal-cell__chips">
                      {visible.map((ev) => (
                        <span
                          key={`${ev.olympiad_id}-${ev.stage_name}`}
                          className={`cal-chip cal-chip--${getTypeClass(ev.type)}`}
                          title={`${ev.olympiad_name} — ${ev.stage_name}`}
                        >
                          {ev.olympiad_name.length > 18
                            ? ev.olympiad_name.slice(0, 16) + '…'
                            : ev.olympiad_name}
                        </span>
                      ))}
                      {overflow > 0 && (
                        <span className="cal-chip cal-chip--more">+{overflow}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Детали выбранного дня */}
          {selectedDay !== null && selectedEvents.length > 0 && (
            <div className="cal-detail">
              <div className="cal-detail__header">
                <h4>
                  {selectedDay} {MONTHS_FULL[activeMonth]} — {selectedEvents.length}{' '}
                  {selectedEvents.length === 1 ? 'этап' : 'этапа'}
                </h4>
                <button
                  type="button"
                  className="cal-detail__close"
                  onClick={() => setSelectedDay(null)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="cal-detail__list">
                {selectedEvents.map((ev) => {
                  const levelBadge = getLevelBadge(ev.level);
                  return (
                    <article
                      key={`${ev.olympiad_id}-${ev.stage_name}`}
                      className="cal-detail-card"
                    >
                      <div className="cal-detail-card__top">
                        <span className={`event-type event-type--${getTypeClass(ev.type)}`}>
                          {ev.type}
                        </span>
                        <span className="event-priority">
                          {getPriorityLabel(ev.priority)}
                        </span>
                        {levelBadge && (
                          <span className="detail-pill" style={{ fontSize: '11px' }}>
                            {levelBadge} РСОШ
                          </span>
                        )}
                        <span className="cal-detail-card__score">
                          <Clock3 size={12} />
                          {Math.round(ev.recommendation_score * 100)}%
                        </span>
                      </div>
                      <strong>{ev.olympiad_name}</strong>
                      <p>{ev.stage_name}</p>
                      {ev.end_month && ev.end_day && (
                        <div className="alert-card__range" style={{ marginTop: 6 }}>
                          <span>{ev.day} {MONTHS_SHORT[ev.month]}</span>
                          <ArrowRight size={11} />
                          <span>
                            {ev.end_day} {MONTHS_SHORT[ev.end_month]}
                            {ev.end_year && ev.end_year !== ev.year ? ` ${ev.end_year}` : ''}
                          </span>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
