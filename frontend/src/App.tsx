import { useState, useEffect } from 'react';
import type { StudentProfile, RecommendResponse, MetaData } from './types';
import { getMeta, getRecommendations } from './api';
import ProfileForm from './components/ProfileForm';
import Dashboard from './components/Dashboard';
import './index.css';

type AppState = 'form' | 'loading' | 'dashboard' | 'error';

export default function App() {
  const [state, setState] = useState<AppState>('form');
  const [meta, setMeta] = useState<MetaData | null>(null);
  const [result, setResult] = useState<RecommendResponse | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    getMeta()
      .then(setMeta)
      .catch(() => setError('Не удалось подключиться к серверу. Убедитесь, что бэкенд запущен на порту 8000.'));
  }, []);

  const handleSubmit = async (profile: StudentProfile) => {
    setState('loading');
    try {
      const data = await getRecommendations(profile);
      setResult(data);
      setState('dashboard');
    } catch {
      setError('Ошибка при получении рекомендаций. Проверьте, что бэкенд запущен.');
      setState('error');
    }
  };

  if (error && !meta) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-red-100">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Ошибка подключения</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">{error}</p>
          <div className="bg-gray-50 rounded-xl p-4 text-left text-xs font-mono text-gray-600 border border-gray-200">
            <div className="text-gray-400 mb-1"># Запустите бэкенд:</div>
            <div>cd backend</div>
            <div>pip install -r requirements.txt</div>
            <div>python main.py</div>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">😔</div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Что-то пошло не так</h2>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <button
            onClick={() => { setState('form'); setError(''); }}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="flex flex-col items-center gap-4 text-gray-500">
          <div className="w-12 h-12 border-4 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm">Загружаем данные...</p>
        </div>
      </div>
    );
  }

  if (state === 'dashboard' && result) {
    return (
      <Dashboard
        data={result}
        onReset={() => { setState('form'); setResult(null); }}
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
