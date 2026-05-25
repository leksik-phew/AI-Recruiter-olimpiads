import { useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  MapPin,
  Sparkles,
  Target,
  UserRound,
} from 'lucide-react';
import type { MetaData, StudentProfile } from '../types';

interface Props {
  meta: MetaData;
  onSubmit: (profile: StudentProfile) => void;
  loading: boolean;
  initialProfile?: StudentProfile;
}

// Резервный список предметов, если сервер вернул пустой список
const FALLBACK_SUBJECTS = [
  'математика',
  'физика',
  'информатика',
  'химия',
  'биология',
  'история',
  'литература',
  'экономика',
  'география',
  'английский язык',
  'русский язык',
  'обществознание',
];

const STEPS = [
  { icon: UserRound, label: 'Знакомство', caption: 'Имя и класс' },
  { icon: BookOpen, label: 'Профиль', caption: 'Предметы и уровень' },
  { icon: MapPin, label: 'Регион', caption: 'География участия' },
  { icon: Target, label: 'Фокус', caption: 'Зачем тебе сезон' },
];

const GOAL_OPTIONS = [
  {
    value: 'Поступление в сильный вуз',
    title: 'Поступление в сильный вуз',
    subtitle: 'Дипломы, БВИ и понятная траектория по сильным олимпиадам.',
  },
  {
    value: 'Рост в любимом предмете',
    title: 'Рост в любимом предмете',
    subtitle: 'Нужен сезон, где интересно думать и накапливать реальный опыт.',
  },
  {
    value: 'Портфолио и достижения',
    title: 'Портфолио и достижения',
    subtitle: 'Важно собрать видимые результаты и не терять ритм по дедлайнам.',
  },
  {
    value: 'Стипендии и бонусы',
    title: 'Стипендии и бонусы',
    subtitle: 'Ищу олимпиады, где достижения дают практическую отдачу.',
  },
];

function getLevelLabel(level: string) {
  const normalized = level.toLowerCase();

  if (normalized.includes('нач')) {
    return 'Начинаю';
  }

  if (normalized.includes('сред')) {
    return 'Уже в процессе';
  }

  if (normalized.includes('прод') || normalized.includes('силь')) {
    return 'Иду уверенно';
  }

  return level;
}

export default function ProfileForm({ meta, onSubmit, loading, initialProfile }: Props) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<StudentProfile>(
    initialProfile ?? {
      name: '',
      grade: 9,
      subjects: [],
      region: '',
      preparation_level: meta.preparation_levels[1] ?? meta.preparation_levels[0] ?? '',
      prefer_online: false,
      goals: GOAL_OPTIONS[0].value,
    },
  );

  const update = <K extends keyof StudentProfile>(field: K, value: StudentProfile[K]) => {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const toggleSubject = (subject: string) => {
    const active = profile.subjects.includes(subject);
    update(
      'subjects',
      active
        ? profile.subjects.filter((item) => item !== subject)
        : [...profile.subjects, subject],
    );
  };

  const canProceed = () => {
    if (step === 0) {
      return profile.name.trim().length > 0;
    }

    if (step === 1) {
      return profile.subjects.length > 0;
    }

    if (step === 2) {
      return profile.region.trim().length > 0;
    }

    return true;
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep((current) => current + 1);
      return;
    }

    onSubmit(profile);
  };

  return (
    <main className="app-shell">
      <section className="entry-hero">
        <div className="entry-hero__grid">
          <div className="entry-hero__copy">
            <p className="kicker">Персональная навигация по олимпиадам</p>
            <h1>Собери кабинет, который ощущается как твоя интеллектуальная траектория</h1>
            <p className="entry-hero__lead">
              Анкета не просто фильтрует список, а собирает профиль школьника, чтобы дальше
              показывать живые рекомендации и календарь сезона.
            </p>
          </div>
        </div>
      </section>

      <section className="form-frame">
        <div className="stepper">
          {STEPS.map(({ icon: Icon, label, caption }, index) => {
            const state =
              index === step ? 'active' : index < step ? 'done' : 'idle';

            return (
              <button
                key={label}
                type="button"
                className={`stepper__item stepper__item--${state}`}
                onClick={() => {
                  if (index <= step) {
                    setStep(index);
                  }
                }}
              >
                <span className="stepper__dot">
                  <Icon size={16} />
                </span>
                <span className="stepper__text">
                  <strong>{label}</strong>
                  <small>{caption}</small>
                </span>
              </button>
            );
          })}
        </div>

        <div className="dossier-card">
          {step === 0 && (
            <section className="form-stage">
              <div className="section-heading">
                <div className="section-heading__icon">
                  <UserRound size={18} />
                </div>
                <div>
                  <p className="kicker">Личное дело</p>
                  <h2>С кого начинается этот кабинет</h2>
                </div>
              </div>

              <div className="field-grid field-grid--two">
                <label className="field">
                  <span>Имя</span>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(event) => update('name', event.target.value)}
                    placeholder="Твоё имя"
                  />
                </label>

                <div className="field">
                  <span>Класс</span>
                  <div className="grade-grid">
                    {meta.grades.map((grade) => (
                      <button
                        key={grade}
                        type="button"
                        className={`grade-chip ${profile.grade === grade ? 'is-active' : ''}`}
                        onClick={() => update('grade', grade)}
                      >
                        {grade}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="form-stage">
              <div className="section-heading">
                <div className="section-heading__icon">
                  <BookOpen size={18} />
                </div>
                <div>
                  <p className="kicker">Предметный фокус</p>
                  <h2>Какие направления должны определять твой сезон</h2>
                </div>
              </div>

              <div className="subject-cloud">
                {(meta.subjects.length > 0 ? meta.subjects : FALLBACK_SUBJECTS).map((subject) => (
                  <button
                    key={subject}
                    type="button"
                    className={`subject-chip ${profile.subjects.includes(subject) ? 'is-active' : ''}`}
                    onClick={() => toggleSubject(subject)}
                  >
                    {subject}
                  </button>
                ))}
              </div>

              <div className="field-grid field-grid--three">
                {meta.preparation_levels.map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={`level-card ${profile.preparation_level === level ? 'is-active' : ''}`}
                    onClick={() => update('preparation_level', level)}
                  >
                    <span>{getLevelLabel(level)}</span>
                    <small>{level}</small>
                  </button>
                ))}
              </div>

              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={profile.prefer_online}
                  onChange={(event) => update('prefer_online', event.target.checked)}
                />
                <span>
                  Предпочитаю онлайн-этапы, чтобы сезон лучше совпадал с логистикой моего региона
                </span>
              </label>
            </section>
          )}

          {step === 2 && (
            <section className="form-stage">
              <div className="section-heading">
                <div className="section-heading__icon">
                  <MapPin size={18} />
                </div>
                <div>
                  <p className="kicker">География</p>
                  <h2>Откуда строится маршрут на очные туры и региональные этапы</h2>
                </div>
              </div>

              <div className="field-grid">
                <label className="field">
                  <span>Регион</span>
                  <select
                    value={profile.region}
                    onChange={(event) => update('region', event.target.value)}
                  >
                    <option value="">Выбери регион</option>
                    {meta.regions.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="ambient-note">
                <Sparkles size={16} />
                <p>
                  Регион влияет не только на доступность очных туров, но и на то, какие дедлайны
                  стоит подсветить выше остальных.
                </p>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="form-stage">
              <div className="section-heading">
                <div className="section-heading__icon">
                  <GraduationCap size={18} />
                </div>
                <div>
                  <p className="kicker">Мотивация сезона</p>
                  <h2>Что должно стоять за этой подборкой</h2>
                </div>
              </div>

              <div className="goal-stack">
                {GOAL_OPTIONS.map((goal) => (
                  <button
                    key={goal.value}
                    type="button"
                    className={`goal-card ${profile.goals === goal.value ? 'is-active' : ''}`}
                    onClick={() => update('goals', goal.value)}
                  >
                    <strong>{goal.title}</strong>
                    <p>{goal.subtitle}</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          <footer className="form-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              disabled={step === 0}
            >
              <ChevronLeft size={16} />
              Назад
            </button>

            <button
              type="button"
              className="button-primary"
              onClick={handleNext}
              disabled={!canProceed() || loading}
            >
              {loading ? 'Собираем рекомендации...' : step === STEPS.length - 1 ? 'Открыть кабинет' : 'Дальше'}
              {!loading && <ChevronRight size={16} />}
            </button>
          </footer>
        </div>
      </section>
    </main>
  );
}
