import { useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sparkles,
  Wifi,
} from 'lucide-react';
import { getJustification } from '../api';
import type { Olympiad, StudentProfile } from '../types';

interface Props {
  olympiad: Olympiad;
  profile: StudentProfile;
  rank: number;
}

const MONTHS = ['', 'янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function getTypeTone(type: string) {
  const normalized = type.toLowerCase();

  if (normalized.includes('олим')) {
    return 'lavender';
  }

  if (normalized.includes('конкур')) {
    return 'powder';
  }

  return 'taupe';
}

function getDifficultyTone(level: string) {
  const normalized = level.toLowerCase();

  if (normalized.includes('выс')) {
    return 'plum';
  }

  if (normalized.includes('сред')) {
    return 'taupe';
  }

  return 'sage';
}

function getLevelLabel(level: number) {
  if (level === 1) {
    return 'I уровень РСОШ';
  }

  if (level === 2) {
    return 'II уровень РСОШ';
  }

  return 'Другой формат';
}

export default function OlympiadCard({ olympiad, profile, rank }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [justification, setJustification] = useState<string | null>(null);
  const [loadingJustification, setLoadingJustification] = useState(false);

  const score = Math.round((olympiad.recommendation_score ?? 0) * 100);

  const loadJustification = async () => {
    if (justification) {
      return;
    }

    setLoadingJustification(true);

    try {
      const response = await getJustification(profile, olympiad.id);
      setJustification(response);
    } catch {
      setJustification('Не удалось получить персональное обоснование. Попробуйте открыть карточку позже.');
    } finally {
      setLoadingJustification(false);
    }
  };

  const handleExpand = () => {
    const next = !expanded;
    setExpanded(next);

    if (next) {
      loadJustification();
    }
  };

  return (
    <article className={`olympiad-card ${expanded ? 'is-expanded' : ''}`}>
      <div className="olympiad-card__top">
        <div className="rank-pill">#{rank}</div>

        <div className="olympiad-card__main">
          <div className="olympiad-card__eyebrow">
            <span className={`event-type event-type--${getTypeTone(olympiad.type)}`}>{olympiad.type}</span>
            <span className="source-pill">{olympiad.source.split('/')[0].trim()}</span>
          </div>

          <h3>{olympiad.name}</h3>
          <p className="olympiad-card__organizer">{olympiad.organizer}</p>

          <div className="detail-pills">
            <span className="detail-pill">{getLevelLabel(olympiad.level)}</span>
            <span className={`detail-pill detail-pill--${getDifficultyTone(olympiad.difficulty)}`}>
              {olympiad.difficulty}
            </span>
            {olympiad.online && (
              <span className="detail-pill detail-pill--powder">
                <Wifi size={12} />
                онлайн
              </span>
            )}
            <span className="detail-pill">
              {olympiad.preparation_time_months} мес. подготовки
            </span>
          </div>
        </div>

        <div className="match-badge">
          <span>совпадение</span>
          <strong>{score}%</strong>
        </div>
      </div>

      <div className="olympiad-card__meta">
        <span>
          <CalendarDays size={14} />
          {olympiad.stages.length} этапов
        </span>
        <span>
          <BookOpen size={14} />
          {olympiad.prize}
        </span>
      </div>

      <div className="stage-row">
        {olympiad.stages.map((stage, index) => (
          <div key={`${stage.name}-${index}`} className="stage-pill">
            <strong>
              {stage.day} {MONTHS[stage.month]}
            </strong>
            <span>{stage.name}</span>
          </div>
        ))}
      </div>

      <div className="olympiad-card__expander">
        <button type="button" className="expander-button" onClick={handleExpand}>
          <span>
            <Sparkles size={14} />
            {expanded ? 'Скрыть детали' : 'Открыть обоснование и детали'}
          </span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {expanded && (
          <div className="expanded-panel">
            <p className="expanded-panel__description">{olympiad.description}</p>

            {olympiad.match_reasons && olympiad.match_reasons.length > 0 && (
              <div className="reason-box">
                <span className="kicker">Почему это подходит</span>
                <ul>
                  {olympiad.match_reasons.map((reason, index) => (
                    <li key={`${reason}-${index}`}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="ai-box">
              <div className="ai-box__head">
                <Sparkles size={14} />
                <span>Персональное пояснение для {profile.name}</span>
              </div>
              {loadingJustification ? (
                <p>Собираем короткое персональное обоснование...</p>
              ) : (
                <p>{justification}</p>
              )}
            </div>

            <div className="stages-list">
              {olympiad.stages.map((stage, index) => (
                <div key={`${stage.name}-${index}-full`} className="stages-list__item">
                  <strong>
                    {stage.day} {MONTHS[stage.month]}
                  </strong>
                  <div>
                    <span>{stage.name}</span>
                    <small>{stage.desc}</small>
                  </div>
                </div>
              ))}
            </div>

            <a href={olympiad.url} target="_blank" rel="noreferrer" className="external-link">
              <ExternalLink size={14} />
              Перейти на официальный сайт
            </a>
          </div>
        )}
      </div>
    </article>
  );
}
