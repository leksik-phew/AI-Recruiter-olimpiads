import { useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  RefreshCcw,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react';
import type { RecommendResponse } from '../types';
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
};

function getSubjectMark(subject: string) {
  return SUBJECT_MARKS[subject.toLowerCase()] ?? subject.slice(0, 2).toUpperCase();
}

function getTypeLabel(type: string) {
  const normalized = type.toLowerCase();

  if (normalized.includes('олим')) {
    return 'Олимпиады';
  }

  if (normalized.includes('конкур')) {
    return 'Конкурсы';
  }

  if (normalized.includes('конфер')) {
    return 'Конференции';
  }

  return type;
}

export default function Dashboard({ data, onReset }: Props) {
  const [tab, setTab] = useState<Tab>('recommendations');
  const [filter, setFilter] = useState('all');

  const { profile, recommendations, calendar } = data;

  const typeFilters = useMemo(
    () => ['all', ...Array.from(new Set(recommendations.map((item) => item.type)))],
    [recommendations],
  );

  const filteredRecommendations =
    filter === 'all'
      ? recommendations
      : recommendations.filter((item) => item.type === filter);

  const highLevelCount = recommendations.filter((item) => item.level === 1).length;
  const onlineCount = recommendations.filter((item) => item.online).length;
  const averageMatch =
    recommendations.length > 0
      ? Math.round(
          (recommendations.reduce(
            (sum, item) => sum + (item.recommendation_score ?? 0),
            0,
          ) /
            recommendations.length) *
            100,
        )
      : 0;

  const tabs = [
    { id: 'recommendations', label: 'Подборка', count: recommendations.length, icon: Trophy },
    { id: 'calendar', label: 'Календарь', count: calendar.length, icon: CalendarDays },
    { id: 'stats', label: 'Срез', count: null, icon: BarChart3 },
  ] as const;

  return (
    <main className="app-shell">
      <section className="dashboard-hero">
        <div className="dashboard-hero__topline">
          <div className="entry-hero__eyebrow">
            <span className="entry-hero__stamp">Olymp Dossier</span>
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
              траектория, а не случайный каталог мероприятий.
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
                <span key={subject}>{getSubjectMark(subject)}</span>
              ))}
            </div>
          </aside>
        </div>

        <div className="stat-row">
          <article className="stat-card">
            <span>Сильные олимпиады</span>
            <strong>{highLevelCount}</strong>
            <small>уровень РСОШ I</small>
          </article>
          <article className="stat-card">
            <span>Онлайн-этапы</span>
            <strong>{onlineCount}</strong>
            <small>удобны под регион</small>
          </article>
          <article className="stat-card stat-card--accent">
            <span>Совпадение профиля</span>
            <strong>{averageMatch}%</strong>
            <small>средний матч рекомендаций</small>
          </article>
        </div>
      </section>

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

        {tab === 'recommendations' && (
          <section className="panel-section">
            <div className="panel-section__head">
              <div>
                <p className="kicker">Кураторская подборка</p>
                <h2>Что стоит взять в работу прямо сейчас</h2>
              </div>
              <p>
                Рекомендации сгруппированы по твоему профилю, предметам и уровню подготовки.
              </p>
            </div>

            <div className="filter-row">
              {typeFilters.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`filter-pill ${filter === item ? 'is-active' : ''}`}
                  onClick={() => setFilter(item)}
                >
                  {item === 'all' ? 'Все форматы' : getTypeLabel(item)}
                </button>
              ))}
            </div>

            <div className="recommendation-list">
              {filteredRecommendations.length > 0 ? (
                filteredRecommendations.map((olympiad, index) => (
                  <OlympiadCard
                    key={olympiad.id}
                    olympiad={olympiad}
                    profile={profile}
                    rank={index + 1}
                  />
                ))
              ) : (
                <div className="empty-state">
                  <Sparkles size={18} />
                  <p>В этой категории пока нет карточек под выбранный профиль.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {tab === 'calendar' && (
          <section className="panel-section">
            <div className="panel-section__head">
              <div>
                <p className="kicker">Ритм сезона</p>
                <h2>Дедлайны и этапы без визуального шума</h2>
              </div>
              <p>Лента событий и месячный срез помогают быстро понять, где сезон начинает сгущаться.</p>
            </div>
            <CalendarView events={calendar} />
          </section>
        )}

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
                    const count = recommendations.filter((item) =>
                      item.subjects.includes(subject),
                    ).length;
                    const width =
                      recommendations.length > 0
                        ? Math.max(8, Math.round((count / recommendations.length) * 100))
                        : 0;

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
                    {
                      label: 'I уровень РСОШ',
                      count: recommendations.filter((item) => item.level === 1).length,
                    },
                    {
                      label: 'II уровень РСОШ',
                      count: recommendations.filter((item) => item.level === 2).length,
                    },
                    {
                      label: 'Другие форматы',
                      count: recommendations.filter((item) => item.level > 2).length,
                    },
                  ].map((item) => {
                    const width =
                      recommendations.length > 0
                        ? Math.max(8, Math.round((item.count / recommendations.length) * 100))
                        : 0;

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
                    const count = calendar.filter((event) => event.month === month).length;
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
