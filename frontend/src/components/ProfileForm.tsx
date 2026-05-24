import { useState } from 'react';
import type { StudentProfile, MetaData } from '../types';
import { User, BookOpen, MapPin, Target, Zap, ChevronRight, GraduationCap } from 'lucide-react';

interface Props {
  meta: MetaData;
  onSubmit: (profile: StudentProfile) => void;
  loading: boolean;
}

const STEPS = [
  { icon: User, label: 'О тебе', desc: 'Имя и класс' },
  { icon: BookOpen, label: 'Предметы', desc: 'Что изучаешь' },
  { icon: MapPin, label: 'Регион', desc: 'Где живёшь' },
  { icon: Target, label: 'Цели', desc: 'Зачем олимпиады' },
];

export default function ProfileForm({ meta, onSubmit, loading }: Props) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<StudentProfile>({
    name: '',
    grade: 9,
    subjects: [],
    region: '',
    preparation_level: 'средний',
    prefer_online: false,
    goals: '',
  });

  const update = (field: keyof StudentProfile, value: unknown) =>
    setProfile(p => ({ ...p, [field]: value }));

  const toggleSubject = (s: string) => {
    const cur = profile.subjects;
    update('subjects', cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s]);
  };

  const canProceed = () => {
    if (step === 0) return profile.name.trim().length > 0;
    if (step === 1) return profile.subjects.length > 0;
    if (step === 2) return profile.region.length > 0;
    return true;
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else onSubmit(profile);
  };

  const difficultyColor: Record<string, string> = {
    начальный: 'bg-green-100 text-green-700 border-green-200',
    средний: 'bg-amber-100 text-amber-700 border-amber-200',
    продвинутый: 'bg-violet-100 text-violet-700 border-violet-200',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Zap size={14} />
            AI-Рекрутер олимпиад
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Твой личный план олимпиад
          </h1>
          <p className="text-gray-500">
            Расскажи о себе — AI подберёт лучшие олимпиады и составит календарь на учебный год
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className={`flex-1 flex flex-col items-center gap-1 cursor-pointer transition-all ${
                i === step ? 'opacity-100' : i < step ? 'opacity-60' : 'opacity-30'
              }`}
              onClick={() => i <= step && setStep(i)}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  i === step
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                    : i < step
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {i < step ? '✓' : i + 1}
              </div>
              <span className="text-xs text-gray-500 hidden sm:block">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {/* Step 0: Name & Grade */}
          {step === 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <User className="text-indigo-600" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Расскажи о себе</h2>
                  <p className="text-sm text-gray-500">Имя и текущий класс</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Твоё имя</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={e => update('name', e.target.value)}
                  placeholder="Например, Алексей"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent text-gray-900 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Текущий класс</label>
                <div className="grid grid-cols-7 gap-2">
                  {meta.grades.map(g => (
                    <button
                      key={g}
                      onClick={() => update('grade', g)}
                      className={`py-3 rounded-xl font-semibold text-sm transition-all ${
                        profile.grade === g
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                          : 'bg-gray-50 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-100'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Subjects */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                  <BookOpen className="text-violet-600" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Любимые предметы</h2>
                  <p className="text-sm text-gray-500">Выбери все, которые нравятся или хорошо даются</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {meta.subjects.map(s => (
                  <button
                    key={s}
                    onClick={() => toggleSubject(s)}
                    className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                      profile.subjects.includes(s)
                        ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-100'
                        : 'bg-gray-50 text-gray-600 border-gray-100 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Уровень подготовки
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {meta.preparation_levels.map(level => (
                    <button
                      key={level}
                      onClick={() => update('preparation_level', level)}
                      className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all ${
                        profile.preparation_level === level
                          ? difficultyColor[level] + ' border-current shadow-sm'
                          : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'
                      }`}
                    >
                      {level === 'начальный' ? '🌱 Начинаю' : level === 'средний' ? '📈 Развиваюсь' : '🚀 Продвинутый'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <input
                  id="online"
                  type="checkbox"
                  checked={profile.prefer_online}
                  onChange={e => update('prefer_online', e.target.checked)}
                  className="w-4 h-4 accent-indigo-600"
                />
                <label htmlFor="online" className="text-sm text-gray-700 cursor-pointer">
                  Предпочитаю онлайн-олимпиады (удобнее из моего региона)
                </label>
              </div>
            </div>
          )}

          {/* Step 2: Region */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                  <MapPin className="text-rose-600" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Регион</h2>
                  <p className="text-sm text-gray-500">Откуда ты?</p>
                </div>
              </div>

              <div>
                <select
                  value={profile.region}
                  onChange={e => update('region', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent text-gray-900 bg-white"
                >
                  <option value="">— Выбери регион —</option>
                  {meta.regions.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl text-sm text-blue-700 border border-blue-100">
                💡 Регион важен для расчёта доступности очных туров и региональных этапов
              </div>
            </div>
          )}

          {/* Step 3: Goals */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <GraduationCap className="text-emerald-600" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Твои цели</h2>
                  <p className="text-sm text-gray-500">Зачем тебе олимпиады?</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {[
                  { value: 'Поступление в топ-вуз', emoji: '🎓', desc: 'БВИ или 100 баллов за диплом' },
                  { value: 'Развитие знаний и навыков', emoji: '🧠', desc: 'Учиться, решать интересные задачи' },
                  { value: 'Самореализация и портфолио', emoji: '🏆', desc: 'Достижения и опыт' },
                  { value: 'Стипендии и денежные призы', emoji: '💰', desc: 'Финансовые возможности' },
                ].map(({ value, emoji, desc }) => (
                  <button
                    key={value}
                    onClick={() => update('goals', value)}
                    className={`flex items-center gap-4 px-4 py-3.5 rounded-xl border text-left transition-all ${
                      profile.goals === value
                        ? 'bg-emerald-50 border-emerald-300 shadow-sm'
                        : 'bg-gray-50 border-gray-100 hover:bg-emerald-50 hover:border-emerald-200'
                    }`}
                  >
                    <span className="text-2xl">{emoji}</span>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{value}</div>
                      <div className="text-xs text-gray-500">{desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            {step > 0 ? (
              <button
                onClick={() => setStep(s => s - 1)}
                className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
              >
                ← Назад
              </button>
            ) : <div />}

            <button
              onClick={handleNext}
              disabled={!canProceed() || loading}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                canProceed() && !loading
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-95'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Анализируем...
                </>
              ) : step === STEPS.length - 1 ? (
                <>
                  <Zap size={16} />
                  Получить план
                </>
              ) : (
                <>
                  Далее
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
