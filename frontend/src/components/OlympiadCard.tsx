import { useState } from 'react';
import type { Olympiad, StudentProfile } from '../types';
import { getJustification } from '../api';
import { ExternalLink, Sparkles, ChevronDown, ChevronUp, Trophy, BookOpen, Calendar, Wifi } from 'lucide-react';

interface Props {
  olympiad: Olympiad;
  profile: StudentProfile;
  rank: number;
}

const LEVEL_COLORS: Record<number, string> = {
  1: 'bg-amber-100 text-amber-800 border-amber-200',
  2: 'bg-sky-100 text-sky-800 border-sky-200',
  3: 'bg-gray-100 text-gray-600 border-gray-200',
};

const TYPE_ICONS: Record<string, string> = {
  олимпиада: '🏆',
  конкурс: '🎯',
  конференция: '📚',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  низкий: 'text-green-600 bg-green-50',
  средний: 'text-amber-600 bg-amber-50',
  высокий: 'text-red-600 bg-red-50',
};

const MONTHS = ['', 'янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

export default function OlympiadCard({ olympiad, profile, rank }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [justification, setJustification] = useState<string | null>(null);
  const [loadingJustification, setLoadingJustification] = useState(false);

  const score = olympiad.recommendation_score ?? 0;
  const pct = Math.round(score * 100);

  const loadJustification = async () => {
    if (justification) return;
    setLoadingJustification(true);
    try {
      const text = await getJustification(profile, olympiad.id);
      setJustification(text);
    } catch {
      setJustification('Не удалось загрузить обоснование. Попробуйте позже.');
    } finally {
      setLoadingJustification(false);
    }
  };

  const handleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) loadJustification();
  };

  return (
    <div
      className={`bg-white rounded-2xl border transition-all duration-200 ${
        expanded ? 'shadow-lg border-indigo-200' : 'shadow-sm border-gray-100 hover:shadow-md hover:border-gray-200'
      }`}
    >
      {/* Top bar */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Rank + Score */}
          <div className="flex-shrink-0 flex flex-col items-center gap-1">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                rank === 1
                  ? 'bg-amber-400 text-white'
                  : rank === 2
                  ? 'bg-gray-300 text-gray-700'
                  : rank === 3
                  ? 'bg-amber-700 text-white'
                  : 'bg-indigo-50 text-indigo-600'
              }`}
            >
              #{rank}
            </div>
            <div className="text-xs text-gray-400 font-medium">{pct}%</div>
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 flex-wrap mb-1">
              <span className="text-lg">{TYPE_ICONS[olympiad.type] ?? '📋'}</span>
              <h3 className="font-semibold text-gray-900 text-base leading-tight">{olympiad.name}</h3>
            </div>
            <p className="text-sm text-gray-500 mb-3">{olympiad.organizer}</p>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                  LEVEL_COLORS[olympiad.level] ?? LEVEL_COLORS[3]
                }`}
              >
                {olympiad.level === 1 ? '⭐ I уровень РСОШ' : olympiad.level === 2 ? 'II уровень РСОШ' : 'Конкурс'}
              </span>

              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DIFFICULTY_COLORS[olympiad.difficulty]}`}>
                {olympiad.difficulty === 'высокий' ? '🔥' : olympiad.difficulty === 'средний' ? '📈' : '🌱'}{' '}
                {olympiad.difficulty}
              </span>

              {olympiad.online && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-600 flex items-center gap-1">
                  <Wifi size={10} /> Онлайн
                </span>
              )}

              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-600">
                {olympiad.source.split('/')[0].trim()}
              </span>
            </div>
          </div>

          {/* Score bar */}
          <div className="flex-shrink-0 hidden sm:flex flex-col items-end gap-1">
            <div className="text-xs text-gray-400 mb-1">совпадение</div>
            <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="text-xs font-bold text-indigo-600">{pct}%</div>
          </div>
        </div>

        {/* Quick info row */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar size={12} className="text-gray-400" />
            {olympiad.stages.length} этап{olympiad.stages.length === 1 ? '' : olympiad.stages.length < 5 ? 'а' : 'ов'}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <BookOpen size={12} className="text-gray-400" />
            Подготовка: {olympiad.preparation_time_months} мес.
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 col-span-2">
            <Trophy size={12} className="text-gray-400" />
            <span className="truncate">{olympiad.prize}</span>
          </div>
        </div>

        {/* Stages preview */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {olympiad.stages.map((stage, i) => (
            <div
              key={i}
              className="flex-shrink-0 flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100"
            >
              <div className="text-xs font-bold text-indigo-600">
                {stage.day} {MONTHS[stage.month]}
              </div>
              <div className="text-xs text-gray-500">{stage.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Expandable section */}
      <div className="border-t border-gray-100">
        <button
          onClick={handleExpand}
          className="w-full flex items-center justify-between px-5 py-3 text-sm text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all rounded-b-2xl"
        >
          <span className="flex items-center gap-2">
            <Sparkles size={14} className={expanded ? 'text-indigo-500' : ''} />
            {expanded ? 'Скрыть детали' : 'AI-обоснование и детали'}
          </span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {expanded && (
          <div className="px-5 pb-5 space-y-4">
            {/* Description */}
            <p className="text-sm text-gray-600 leading-relaxed">{olympiad.description}</p>

            {/* Match reasons */}
            {olympiad.match_reasons && olympiad.match_reasons.length > 0 && (
              <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">
                  Почему подходит
                </div>
                <ul className="space-y-1">
                  {olympiad.match_reasons.map((reason, i) => (
                    <li key={i} className="text-sm text-indigo-700 flex items-start gap-2">
                      <span className="text-indigo-400 mt-0.5">✓</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI Justification */}
            <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-xl p-4 border border-violet-100">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-violet-500" />
                <span className="text-xs font-semibold text-violet-600 uppercase tracking-wide">
                  AI-анализ для {profile.name}
                </span>
              </div>
              {loadingJustification ? (
                <div className="flex items-center gap-2 text-sm text-violet-500">
                  <div className="w-4 h-4 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
                  Генерирую персональное обоснование...
                </div>
              ) : (
                <p className="text-sm text-violet-800 leading-relaxed">{justification}</p>
              )}
            </div>

            {/* All stages */}
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Все этапы
              </div>
              <div className="space-y-2">
                {olympiad.stages.map((stage, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <div className="flex-shrink-0 w-16 text-xs font-bold text-indigo-600 pt-0.5">
                      {stage.day} {MONTHS[stage.month]}
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">{stage.name}</div>
                      <div className="text-xs text-gray-400">{stage.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Link */}
            <a
              href={olympiad.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              <ExternalLink size={14} />
              Официальный сайт
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
