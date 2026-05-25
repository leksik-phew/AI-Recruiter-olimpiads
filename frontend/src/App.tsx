import { useEffect, useState } from 'react';
import type { MetaData, RecommendResponse, StudentProfile } from './types';
import { getMeta, getRecommendations } from './api';
import ProfileForm from './components/ProfileForm';
import Dashboard from './components/Dashboard';

type AppState = 'form' | 'loading' | 'dashboard' | 'error';

export default function App() {
  const [state, setState] = useState<AppState>('form');
  const [meta, setMeta] = useState<MetaData | null>(null);
  const [result, setResult] = useState<RecommendResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getMeta()
      .then(setMeta)
      .catch(() => {
        setError(
          'Не удалось подключиться к серверу. Проверьте, что backend запущен на порту 8000.',
        );
      });
  }, []);

  const handleSubmit = async (profile: StudentProfile) => {
    setState('loading');

    try {
      const data = await getRecommendations(profile);
      setResult(data);
      setState('dashboard');
      setError('');
    } catch {
      setError(
        'Не получилось загрузить рекомендации. Проверьте backend и попробуйте еще раз.',
      );
      setState('error');
    }
  };

  if (error && !meta) {
    return (
      <main className="app-shell app-shell--center">
        <section className="status-card status-card--error">
          <div className="status-card__badge">Связь с сервером</div>
          <h1>Фронт готов, но API пока не отвечает</h1>
          <p>{error}</p>
          <div className="status-card__console">
            <span>backend</span>
            <code>cd backend</code>
            <code>pip install -r requirements.txt</code>
            <code>python main.py</code>
          </div>
        </section>
      </main>
    );
  }

  if (state === 'error') {
    return (
      <main className="app-shell app-shell--center">
        <section className="status-card">
          <div className="status-card__badge">Что-то сбилось</div>
          <h1>Рекомендации не загрузились</h1>
          <p>{error}</p>
          <button
            type="button"
            className="button-primary"
            onClick={() => {
              setState('form');
              setError('');
            }}
          >
            Вернуться к анкете
          </button>
        </section>
      </main>
    );
  }

  if (!meta) {
    return (
      <main className="app-shell app-shell--center">
        <section className="status-card">
          <div className="orb-loader" />
          <div className="status-card__badge">Olymp Dossier</div>
          <h1>Собираем сезонный профиль</h1>
          <p>Подгружаем предметы, регионы и параметры для персональной траектории.</p>
        </section>
      </main>
    );
  }

  if (state === 'dashboard' && result) {
    return (
      <Dashboard
        data={result}
        onReset={() => {
          setState('form');
          setResult(null);
        }}
      />
    );
  }

  return (
    <ProfileForm
      meta={meta}
      onSubmit={handleSubmit}
      loading={state === 'loading'}
    />
  );
}
