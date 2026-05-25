import { useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Download,
  GraduationCap,
  RefreshCcw,
  Sparkles,
  Star,
  Target,
  Trophy,
  Wifi,
} from 'lucide-react';
import type { AppliedFilters, RecommendResponse } from '../types';
import CalendarView from './CalendarView';
import OlympiadCard from './OlympiadCard';

interface Props {
  data: RecommendResponse;
  onReset: () => void;
}

type Tab = 'recommendations' | 'calendar' | 'stats';

const SUBJECT_MARKS: Record<string, string> = {
  математика: 'M',
  физика: 'P',
  информатика: 'CS',
  химия: 'CH',
  биология: 'BIO',
  история: 'H',
  литература: 'LIT',
  обществознание: 'SOC',
  экономика: 'EC',
  география: 'GEO',
  'английский язык': 'ENG',
  'русский язык': 'RU',
  астрономия: 'AST',
  экология: 'ECO',
  лингвистика: 'LING',
  право: 'LAW',
  'немецкий язык': 'DE',
  'французский язык': 'FR',
};

function getSubjectMark(subject: string) {
  return SUBJECT_MARKS[subject.toLowerCase()] ?? subject.slice(0, 2).toUpperCase();
}

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ────────────────────────────────────────────
// Рекомендательные метки на основе профиля
// ────────────────────────────────────────────
function getRecommendLabel(score: number): { label: string; className: string } {
  if (score >= 0.8) return { label: '⭐ Точное совпадение', className: 'rec-label--perfect' };
  if (score >= 0.6) return { label: '✓ Хорошо подходит', className: 'rec-label--good' };
  if (score >= 0.4) return { label: 'Частичное совпадение', className: 'rec-label--partial' };
  return { label: 'Общий интерес', className: 'rec-label--neutral' };
}

// ────────────────────────────────────────────
// Иконки для авто-фильтр бейджей
// ────────────────────────────────────────────
function FilterBadgeIcon({ icon }: { icon: string }) {
  if (icon === 'grade') return <GraduationCap size={13} />;
  if (icon === 'subjects') return <BookOpen size={13} />;
  if (icon === 'goal') return <Target size={13} />;
  if (icon === 'online') return <Wifi size={13} />;
  return null;
}

function AutoFilterBadges({ filters }: { filters: AppliedFilters }) {
  return (
    <div className="auto-filter-bar">
      <span className="auto-filter-bar__label">Автофильтр:</span>
      <div className="auto-filter-badges">
        {filters.badges.map((badge, i) => (
          <span
            key={i}
            className={`auto-filter-badge auto-filter-badge--${badge.icon}`}
            title={badge.reason}
          >
            <FilterBadgeIcon icon={badge.icon} />
            {badge.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard({ data, onReset }: Props) {
  const [tab, setTab] = useState<Tab>('recommendations');

  const { profile, recommendations, calendar, applied_filters, total_found } = data;

  // ── Статистика шапки ─────────────────────────────────────────
  const highLevelCount = useMemo(() => recommendations.filter((r) => r.level === 1).length, [recommendations]);
  const onlineCount = useMemo(() => recommendations.filter((r) => r.online).length, [recommendations]);
  const topMatch = useMemo(
    () => (recommendations.length > 0 ? Math.round((recommendations[0].recommendation_score ?? 0) * 100) : 0),
    [recommendations],
  );

  // ── Экспорт ──────────────────────────────────────────────────
  const downloadCSV = () => {
    const headers = [
      '№', 'Название', 'Организатор', 'Тип', 'Уровень', 'Сложность',
      'Предметы', 'Классы', 'Онлайн', 'Совпадение%', 'Этапов', 'Призы', 'Сайт',
    ];
    const rows = recommendations.map((o, i) => [
      i + 1,
      escapeCsvCell(o.name),
      escapeCsvCell(o.organizer ?? ''),
      escapeCsvCell(o.type),
      o.level ? `${o.level} уровень РСОШ` : 'другой формат',
      escapeCsvCell(o.difficulty ?? ''),
      escapeCsvCell((o.subjects ?? []).join('; ')),
      escapeCsvCell((o.grades ?? []).join('; ')),
      o.online ? 'да' : 'нет',
      Math.round((o.recommendation_score ?? 0) * 100),
      (o.stages ?? []).length,
      escapeCsvCell(o.prize ?? ''),
      escapeCsvCell(o.url),
    ]);
    const csv = '﻿' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `olympiads_${profile.name}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadJSON = () => {
    const payload = {
      profile,
      exported_at: new Date().toISOString(),
      recommendations: recommendations.map((o) => ({
        id: o.id, name: o.name, organizer: o.organizer, type: o.type,
        level: o.level, difficulty: o.difficulty, subjects: o.subjects,
        grades: o.grades, online: o.online, recommendation_score: o.recommendation_score,
        match_reasons: o.match_reasons, url: o.url, stages: o.stages,
        prize: o.prize, description: o.description,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `olympiads_${profile.name}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'recommendations', label: 'Подборка', count: recommendations.length, icon: Trophy },
    { id: 'calendar', label: 'Календарь', count: calendar.length, icon: CalendarDays },
    { id: 'stats', label: 'Срез', count: null, icon: BarChart3 },
  ] as const;

  return (
    <main className="app-shell">
      {/* ── Шапка дашборда ───────────────────────────────────── */}
      <section className="dashboard-hero">
        <div className="dashboard-hero__topline">
          <div className="entry-hero__eyebrow">
            <span className="entry-hero__season">личный кабинет ученика</span>
          </div>
          <button type="button" className="button-secondary" onClick={onReset}>
            <RefreshCcw size={16} />
            Изменить профиль
          </button>
        </div>

        <div className="dashboard-hero__grid">
          <div className="dashboard-hero__copy">
            <p className="kicker">Сезонный профиль</p>
            <h1>{profile.name}, вот кабинет под твой олимпиадный ритм</h1>
            <p>
              Мы собрали рекомендации и календарь так, чтобы они выглядели как продуманная
              траектория.
            </p>
          </div>

          <aside className="profile-ribbon">
            <div className="profile-ribbon__avatar">{profile.name.slice(0, 1).toUpperCase()}</div>
            <div className="profile-ribbon__meta">
              <strong>
                {profile.name}, {profile.grade} класс
              </strong>
              <span>{profile.region}</span>
            </div>
            <div className="profile-ribbon__subjects">
              {profile.subjects.map((subject) => (
                <span key={subject} title={subject}>{getSubjectMark(subject)}</span>
              ))}
            </div>
          </aside>
        </div>

        <div className="stat-row">
          <article className="stat-card">
            <span>I уровень РСОШ</span>
            <strong>{highLevelCount}</strong>
            <small>топ-олимпиады</small>
          </article>
          <article className="stat-card">
            <span>Онлайн-этапы</span>
            <strong>{onlineCount}</strong>
            <small>удобны под регион</small>
          </article>
          <article className="stat-card stat-card--accent">
            <span>Лучшее совпадение</span>
            <strong>{topMatch}%</strong>
            <small>топ-результат подборки</small>
          </article>
        </div>
      </section>

      {/* ── Вкладки и контент ────────────────────────────────── */}
      <section className="dashboard-panel">
        <div className="tabbar">
          {tabs.map(({ id, label, count, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`tabbar__item ${tab === id ? 'is-active' : ''}`}
              onClick={() => setTab(id)}
            >
              <Icon size={16} />
              <span>{label}</span>
              {count !== null && <small>{count}</small>}
            </button>
          ))}
        </div>

        {/* ── РЕКОМЕНДАЦИИ ─────────────────────────────────── */}
        {tab === 'recommendations' && (
          <section className="panel-section">
            <div className="panel-section__head">
              <div>
                <p className="kicker">Кураторская подборка</p>
                <h2>Что стоит взять в работу прямо сейчас</h2>
              </div>
              <div className="download-group">
                <button
                  type="button"
                  className="button-secondary button-secondary--sm"
                  onClick={downloadCSV}
                  title="Скачать CSV"
                >
                  <Download size={15} />
                  CSV
                </button>
                <button
                  type="button"
                  className="button-secondary button-secondary--sm"
                  onClick={downloadJSON}
                  title="Скачать JSON"
                >
                  <Download size={15} />
                  JSON
                </button>
              </div>
            </div>

            {/* Авто-фильтры — что было применено */}
            {applied_filters && <AutoFilterBadges filters={applied_filters} />}

            {/* Рекомендательная плашка */}
            <div className="rec-hint">
              <Sparkles size={14} />
              <span>
                Показаны только олимпиады, которые подходят твоему профилю.
                Внутри подборки — ранжировка по совпадению предметов, сложности и уровня РСОШ.
              </span>
            </div>

            <p className="panel-desc">
              Найдено <strong>{total_found ?? recommendations.length}</strong> олимпиад по твоему профилю
            </p>

            <div className="recommendation-list">
              {recommendations.length > 0 ? (
                recommendations.map((olympiad, index) => (
                  <OlympiadCard
                    key={olympiad.id}
                    olympiad={olympiad}
                    profile={profile}
                    rank={index + 1}
                    recLabel={getRecommendLabel(olympiad.recommendation_score ?? 0)}
                  />
                ))
              ) : (
                <div className="empty-state">
                  <Sparkles size={18} />
                  <p>По твоему профилю не нашлось подходящих олимпиад. Попробуй изменить предметы или цель.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── КАЛЕНДАРЬ ────────────────────────────────────── */}
        {tab === 'calendar' && (
          <section className="panel-section">
            <div className="panel-section__head">
              <div>
                <p className="kicker">Ритм сезона</p>
                <h2>Промежутки участия — от старта до дедлайна</h2>
              </div>
              <p>
                Каждый этап показан в виде диапазона: начало → дедлайн. Так видно, когда
                можно успеть подготовиться и сдать.
              </p>
            </div>
            <CalendarView events={calendar} />
          </section>
        )}

        {/* ── СТАТИСТИКА ───────────────────────────────────── */}
        {tab === 'stats' && (
          <section className="panel-section">
            <div className="panel-section__head">
              <div>
                <p className="kicker">Аналитический срез</p>
                <h2>Как выглядит твой сезон в цифрах</h2>
              </div>
              <p>Небольшая аналитика, чтобы понимать баланс предметов, уровней и месяцев.</p>
            </div>

            <div className="insight-grid">
              <article className="insight-card">
                <div className="insight-card__title">
                  <Star size={16} />
                  <h3>Предметный баланс</h3>
                </div>
                <div className="meter-stack">
                  {profile.subjects.map((subject) => {
                    const count = recommendations.filter((r) =>
                      (r.subjects ?? []).includes(subject),
                    ).length;
                    const width =
                      recommendations.length > 0
                        ? Math.max(8, Math.round((count / recommendations.length) * 100))
                        : 8;
                    return (
                      <div key={subject} className="meter-row">
                        <div className="meter-row__label">
                          <span>{subject}</span>
                          <small>{count}</small>
                        </div>
                        <div className="meter">
                          <div className="meter__fill" style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className="insight-card">
                <div className="insight-card__title">
                  <Trophy size={16} />
                  <h3>Уровень событий</h3>
                </div>
                <div className="meter-stack">
                  {[
                    { label: 'I уровень РСОШ', count: recommendations.filter((r) => r.level === 1).length },
                    { label: 'II уровень РСОШ', count: recommendations.filter((r) => r.level === 2).length },
                    { label: 'III уровень РСОШ', count: recommendations.filter((r) => r.level === 3).length },
                    { label: 'Другие форматы', count: recommendations.filter((r) => !r.level).length },
                  ].map((item) => {
                    const width =
                      recommendations.length > 0
                        ? Math.max(8, Math.round((item.count / recommendations.length) * 100))
                        : 8;
                    return (
                      <div key={item.label} className="meter-row">
                        <div className="meter-row__label">
                          <span>{item.label}</span>
                          <small>{item.count}</small>
                        </div>
                        <div className="meter meter--soft">
                          <div className="meter__fill meter__fill--plum" style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className="insight-card insight-card--wide">
                <div className="insight-card__title">
                  <CalendarDays size={16} />
                  <h3>Месячная плотность</h3>
                </div>
                <div className="month-bars">
                  {Array.from({ length: 12 }, (_, index) => {
                    const month = index + 1;
                    const count = calendar.filter((e) => e.month === month).length;
                    const height = count > 0 ? Math.max(14, Math.min(88, count * 14)) : 8;
                    const labels = ['Я', 'Ф', 'М', 'А', 'М', 'И', 'И', 'А', 'С', 'О', 'Н', 'Д'];
                    return (
                      <div key={month} className="month-bars__item">
                        <div className="month-bars__track">
                          <div className="month-bars__fill" style={{ height: `${height}px` }} />
                        </div>
                        <span>{labels[index]}</span>
                        <small>{count}</small>
                      </div>
                    );
                  })}
                </div>
              </article>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
