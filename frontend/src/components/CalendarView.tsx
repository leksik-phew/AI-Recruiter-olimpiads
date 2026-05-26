import { useState } from 'react';
import { AlertCircle, ArrowRight, Clock3 } from 'lucide-react';
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

function buildDate(event: CalendarEvent) {
  return new Date(event.year, event.month - 1, event.day);
}

function formatAccent(event: CalendarEvent): string {
  return `${event.day} ${MONTHS_FULL[event.month]}`;
}

function getPriorityLabel(priority: CalendarEvent['priority']) {
  if (priority === 'high') return 'важно';
  if (priority === 'medium') return 'в ритме';
  return 'спокойно';
}

function getTypeClass(type: string) {
  const n = type.toLowerCase();
  if (n.includes('олим')) return 'lavender';
  if (n.includes('конкур')) return 'powder';
  return 'taupe';
}

function getLevelBadge(level: number | null | undefined): string | null {
  if (level === 1) return 'I РСОШ';
  if (level === 2) return 'II РСОШ';
  if (level === 3) return 'III РСОШ';
  return null;
}

function getRangeWidth(event: CalendarEvent): number {
  if (!event.end_month || !event.end_day) return 0;
  const academicStart = new Date(
    event.month >= 9 ? event.year : event.year - 1,
    8,
    1
  );
  const academicEnd = new Date(
    event.month >= 9 ? event.year + 1 : event.year,
    7,
    31
  );
  const totalDays = (academicEnd.getTime() - academicStart.getTime()) / 86400000;
  const startDate = new Date(event.year, event.month - 1, event.day);
  const endDate = new Date(event.end_year ?? event.year, event.end_month - 1, event.end_day);
  const startOffset = Math.max(0, (startDate.getTime() - academicStart.getTime()) / 86400000);
  const duration = Math.max(1, (endDate.getTime() - startDate.getTime()) / 86400000);
  const startPct = Math.min(100, (startOffset / totalDays) * 100);
  const widthPct = Math.min(100 - startPct, (duration / totalDays) * 100);
  return Math.max(2, Math.round(widthPct));
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

  // Дефолтная вкладка — первый месяц с будущими событиями, иначе первый
  const defaultKey = sortedKeys.find((key) => {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1, 28) >= today;
  }) ?? sortedKeys[0];

  const [activeKey, setActiveKey] = useState<string>(defaultKey ?? '');

  // Ближайшие 4 события для сайдбара
  const upcoming = events
    .slice()
    .sort((a, b) => buildDate(a).getTime() - buildDate(b).getTime())
    .filter((e) => {
      const end = e.end_month && e.end_day && e.end_year
        ? new Date(e.end_year, e.end_month - 1, e.end_day)
        : buildDate(e);
      return end.getTime() >= today.getTime();
    })
    .slice(0, 4);

  const sidebarEvents = upcoming.length > 0
    ? upcoming
    : events.slice().sort((a, b) => buildDate(a).getTime() - buildDate(b).getTime()).slice(0, 4);

  const activeEvents = (grouped[activeKey] ?? [])
    .slice()
    .sort((a, b) => a.day - b.day);

  const [activeYear, activeMonth] = activeKey
    ? activeKey.split('-').map(Number)
    : [0, 0];

  if (sortedKeys.length === 0) {
    return (
      <div className="empty-state">
        <p>Нет данных по этапам. Попробуйте обновить базу олимпиад.</p>
      </div>
    );
  }

  return (
    <div className="calendar-layout">
      {/* ── Сайдбар ─────────────────────────────────────────── */}
      <aside className="calendar-sidecard">
        <div className="calendar-sidecard__title">
          <AlertCircle size={16} />
          <h3>Ближайшие акценты</h3>
        </div>
        <div className="calendar-alerts">
          {sidebarEvents.map((event) => (
            <article
              key={`${event.olympiad_id}-${event.stage_name}`}
              className="alert-card"
            >
              <div className={`event-type event-type--${getTypeClass(event.type)}`}>
                {event.type}
              </div>
              <strong>{event.olympiad_name}</strong>
              <p>{event.stage_name}</p>
              <div className="alert-card__range">
                <span>{formatAccent(event)}</span>
                {event.end_month && event.end_day && (
                  <>
                    <ArrowRight size={12} />
                    <span>{event.end_day} {MONTHS_FULL[event.end_month]}</span>
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
                onClick={() => setActiveKey(key)}
              >
                <span className="calendar-tab__month">{MONTHS_FULL[m]}</span>
                <span className="calendar-tab__year">{y}</span>
                <span className="calendar-tab__count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Список событий выбранного месяца */}
        <section className="calendar-month">
          <header className="calendar-month__head">
            <div>
              <p className="kicker">Календарный лист</p>
              <h3>{MONTHS_FULL[activeMonth]} {activeYear}</h3>
            </div>
            <span>{activeEvents.length} этапов</span>
          </header>

          <div className="calendar-month__list">
            {activeEvents.map((event) => {
              const hasRange = Boolean(event.end_month && event.end_day);
              const rangeWidth = hasRange ? getRangeWidth(event) : 0;
              const levelBadge = getLevelBadge(event.level);

              return (
                <article
                  key={`${event.olympiad_id}-${event.stage_name}-${event.day}`}
                  className={`timeline-card ${hasRange ? 'timeline-card--range' : ''}`}
                >
                  <div className="timeline-card__date">
                    <strong>{event.day}</strong>
                    <small>{MONTHS_SHORT[activeMonth]}</small>
                  </div>

                  <div className="timeline-card__body">
                    <div className="timeline-card__badges">
                      <span className={`event-type event-type--${getTypeClass(event.type)}`}>
                        {event.type}
                      </span>
                      <span className="event-priority">
                        {getPriorityLabel(event.priority)}
                      </span>
                      {levelBadge && (
                        <span className="detail-pill" style={{ fontSize: '11px' }}>
                          {levelBadge}
                        </span>
                      )}
                    </div>

                    <h4>{event.stage_name}</h4>
                    <p>{event.olympiad_name}</p>

                    <div className="timeline-card__period">
                      <span className="period-start">
                        {event.day} {MONTHS_SHORT[event.month]}
                      </span>
                      {hasRange && (
                        <>
                          <ArrowRight size={11} className="period-arrow" />
                          <span className="period-end period-end--deadline">
                            {event.end_day} {MONTHS_SHORT[event.end_month!]}
                            {event.end_year && event.end_year !== event.year
                              ? ` ${event.end_year}`
                              : ''}
                          </span>
                          {rangeWidth > 0 && (
                            <div className="period-bar">
                              <div
                                className="period-bar__fill"
                                style={{ width: `${rangeWidth}%` }}
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="timeline-card__score">
                    <Clock3 size={14} />
                    <span>{Math.round(event.recommendation_score * 100)}%</span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
