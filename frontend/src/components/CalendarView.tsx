import type { CalendarEvent } from '../types';
import { Calendar, Clock, AlertCircle } from 'lucide-react';

interface Props {
  events: CalendarEvent[];
}

const MONTHS_RU = [
  '', 'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const TYPE_COLORS: Record<string, string> = {
  олимпиада: 'bg-indigo-500',
  конкурс: 'bg-amber-500',
  конференция: 'bg-emerald-500',
};

const TYPE_ICONS: Record<string, string> = {
  олимпиада: '🏆',
  конкурс: '🎯',
  конференция: '📚',
};

export default function CalendarView({ events }: Props) {
  // Группируем по месяцу
  const byMonth: Record<string, CalendarEvent[]> = {};
  for (const e of events) {
    const key = `${e.year}-${e.month}`;
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(e);
  }

  const months = Object.keys(byMonth).sort((a, b) => {
    const [ya, ma] = a.split('-').map(Number);
    const [yb, mb] = b.split('-').map(Number);
    return ya !== yb ? ya - yb : ma - mb;
  });

  // Ближайшие дедлайны (30 дней)
  const today = new Date(2025, 8, 1); // Сентябрь 2025
  const upcoming = events.filter(e => {
    const d = new Date(e.year, e.month - 1, e.day);
    const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000);
    return diffDays >= 0 && diffDays <= 60;
  }).slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Upcoming alert */}
      {upcoming.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={16} className="text-amber-600" />
            <span className="font-semibold text-amber-800 text-sm">Ближайшие дедлайны (60 дней)</span>
          </div>
          <div className="space-y-2">
            {upcoming.map((e, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div className="w-14 text-center py-1 bg-amber-600 text-white rounded-lg font-bold text-xs">
                  {e.day}.{String(e.month).padStart(2, '0')}
                </div>
                <div className="flex-1">
                  <span className="font-medium text-gray-800">{e.olympiad_name}</span>
                  <span className="text-gray-500"> — {e.stage_name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        {[['олимпиада', '🏆'], ['конкурс', '🎯'], ['конференция', '📚']].map(([type, icon]) => (
          <div key={type} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${TYPE_COLORS[type]}`} />
            <span className="text-gray-500">{icon} {type}</span>
          </div>
        ))}
      </div>

      {/* Monthly timeline */}
      {months.map(key => {
        const [year, month] = key.split('-').map(Number);
        const monthEvents = byMonth[key].sort((a, b) => a.day - b.day);

        return (
          <div key={key} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Month header */}
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 flex items-center gap-2">
              <Calendar size={14} className="text-indigo-200" />
              <h3 className="text-white font-semibold text-sm">
                {MONTHS_RU[month]} {year}
              </h3>
              <span className="ml-auto text-indigo-200 text-xs">
                {monthEvents.length} событ{monthEvents.length === 1 ? 'ие' : monthEvents.length < 5 ? 'ия' : 'ий'}
              </span>
            </div>

            {/* Events list */}
            <div className="divide-y divide-gray-50">
              {monthEvents.map((event, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors ${
                    event.priority === 'high' ? 'border-l-4 border-indigo-500' : ''
                  }`}
                >
                  {/* Day */}
                  <div className="flex-shrink-0 flex flex-col items-center w-10">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white ${
                        TYPE_COLORS[event.type] ?? 'bg-gray-400'
                      }`}
                    >
                      {event.day}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{MONTHS_RU[month].slice(0, 3)}</div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <span>{TYPE_ICONS[event.type] ?? '📋'}</span>
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">
                          {event.stage_name}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{event.olympiad_name}</div>
                        {event.desc && (
                          <div className="text-xs text-gray-400 mt-0.5">{event.desc}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Priority badge */}
                  <div className="flex-shrink-0 flex flex-col items-end gap-1">
                    {event.priority === 'high' && (
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                        приоритет
                      </span>
                    )}
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock size={10} />
                      {Math.round(event.recommendation_score * 100)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
