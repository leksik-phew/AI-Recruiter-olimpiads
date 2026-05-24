import { useState } from 'react';
import type { RecommendResponse } from '../types';
import OlympiadCard from './OlympiadCard';
import CalendarView from './CalendarView';
import { Trophy, Calendar, BarChart2, RotateCcw, Sparkles, BookOpen, Star } from 'lucide-react';

interface Props {
  data: RecommendResponse;
  onReset: () => void;
}

type Tab = 'recommendations' | 'calendar' | 'stats';

const SUBJECT_EMOJIS: Record<string, string> = {
  математика: '📐',
  физика: '⚡',
  информатика: '💻',
  химия: '🧪',
  биология: '🌿',
  история: '📜',
  литература: '📖',
  'английский язык': '🇬🇧',
  экономика: '💹',
  география: '🌍',
};

export default function Dashboard({ data, onReset }: Props) {
  const [tab, setTab] = useState<Tab>('recommendations');
  const [filter, setFilter] = useState<string>('all');

  const { profile, recommendations, calendar } = data;

  const tabs = [
    { id: 'recommendations', label: 'Рекомендации', icon: Trophy, count: recommendations.length },
    { id: 'calendar', label: 'Календарь', icon: Calendar, count: calendar.length },
    { id: 'stats', label: 'Статистика', icon: BarChart2, count: null },
  ] as const;

  const typeFilters = ['all', ...Array.from(new Set(recommendations.map(r => r.type)))];

  const filtered = filter === 'all'
    ? recommendations
    : recommendations.filter(r => r.type === filter);

  // Stats
  const level1Count = recommendations.filter(r => r.level === 1).length;
  const onlineCount = recommendations.filter(r => r.online).length;
  const avgScore = recommendations.length > 0
    ? Math.round(recommendations.reduce((a, r) => a + (r.recommendation_score ?? 0), 0) / recommendations.length * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 hidden sm:block">AI-Рекрутер</span>
          </div>

          <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-indigo-600">
              {profile.name[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <span className="font-medium text-gray-900 text-sm">{profile.name}</span>
              <span className="text-gray-400 text-sm">, {profile.grade} класс</span>
              <span className="text-gray-400 text-sm hidden sm:inline"> · {profile.region}</span>
            </div>
            <div className="ml-auto flex gap-1 flex-shrink-0">
              {profile.subjects.map(s => (
                <span key={s} title={s} className="text-base">{SUBJECT_EMOJIS[s] ?? '📘'}</span>
              ))}
            </div>
          </div>

          <button
            onClick={onReset}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors px-3 py-2 rounded-xl hover:bg-gray-100"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:block">Изменить</span>
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Hero summary */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 text-white mb-6 shadow-lg shadow-indigo-200">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="text-indigo-200 text-sm mb-1">Твой план на учебный год 2025/26</div>
              <h2 className="text-2xl font-bold mb-1">{profile.name}, привет! 👋</h2>
              <p className="text-indigo-200 text-sm">
                AI подобрал <strong className="text-white">{recommendations.length} олимпиад</strong>{' '}
                по твоим предметам · {calendar.length} дат в календаре
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/20 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold">{level1Count}</div>
                <div className="text-xs text-indigo-200">I уровень</div>
              </div>
              <div className="bg-white/20 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold">{onlineCount}</div>
                <div className="text-xs text-indigo-200">онлайн</div>
              </div>
              <div className="bg-white/20 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold">{avgScore}%</div>
                <div className="text-xs text-indigo-200">совпадение</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
          {tabs.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setTab(id as Tab)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === id
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{label}</span>
              {count !== null && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    tab === id ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Recommendations tab */}
        {tab === 'recommendations' && (
          <div className="space-y-4">
            {/* Type filter */}
            <div className="flex gap-2 flex-wrap">
              {typeFilters.map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    filter === f
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-500 border border-gray-200 hover:bg-indigo-50 hover:text-indigo-600'
                  }`}
                >
                  {f === 'all' ? '🔵 Все' : f === 'олимпиада' ? '🏆 Олимпиады' : f === 'конкурс' ? '🎯 Конкурсы' : '📚 Конференции'}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                Нет рекомендаций в этой категории
              </div>
            ) : (
              filtered.map((o, i) => (
                <OlympiadCard key={o.id} olympiad={o} profile={profile} rank={i + 1} />
              ))
            )}
          </div>
        )}

        {/* Calendar tab */}
        {tab === 'calendar' && <CalendarView events={calendar} />}

        {/* Stats tab */}
        {tab === 'stats' && (
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Subjects breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen size={16} className="text-indigo-500" />
                По предметам
              </h3>
              <div className="space-y-3">
                {profile.subjects.map(subj => {
                  const count = recommendations.filter(r => r.subjects.includes(subj)).length;
                  const pct = Math.round((count / recommendations.length) * 100);
                  return (
                    <div key={subj}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">
                          {SUBJECT_EMOJIS[subj] ?? '📘'} {subj}
                        </span>
                        <span className="text-gray-400">{count} олимпиад</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-400 to-violet-400 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Level distribution */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Star size={16} className="text-amber-500" />
                По уровню
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'I уровень РСОШ', color: 'bg-amber-400', count: recommendations.filter(r => r.level === 1).length },
                  { label: 'II уровень РСОШ', color: 'bg-sky-400', count: recommendations.filter(r => r.level === 2).length },
                  { label: 'Другие конкурсы', color: 'bg-gray-300', count: recommendations.filter(r => r.level === 3).length },
                ].map(({ label, color, count }) => (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{label}</span>
                      <span className="text-gray-400">{count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full`}
                        style={{ width: `${Math.round((count / recommendations.length) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline overview */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:col-span-2">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar size={16} className="text-emerald-500" />
                Распределение по месяцам
              </h3>
              <div className="grid grid-cols-12 gap-1">
                {Array.from({ length: 12 }, (_, i) => {
                  const m = i + 1;
                  const count = calendar.filter(e => e.month === m).length;
                  const height = count > 0 ? Math.max(20, Math.min(80, count * 15)) : 4;
                  const months = ['С', 'О', 'Н', 'Д', 'Я', 'Ф', 'М', 'А', 'М', 'И', 'И', 'А'];
                  const monthIdx = (m + 7) % 12; // Начинаем с сентября

                  return (
                    <div key={m} className="flex flex-col items-center gap-1">
                      <div className="flex items-end h-20">
                        <div
                          className="w-5 bg-indigo-400 rounded-t-lg transition-all"
                          style={{ height: `${height}px` }}
                          title={`${count} событий`}
                        />
                      </div>
                      <span className="text-xs text-gray-400">{months[monthIdx]}</span>
                      {count > 0 && <span className="text-xs text-indigo-600 font-bold">{count}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
