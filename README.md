# 🎓 AI-Рекрутер олимпиад

> Персональный AI-помощник для подбора российских олимпиад, конкурсов и научных конференций для школьников

## 🚀 Быстрый старт

### 1. Бэкенд (Python FastAPI)

```bash
cd backend
pip install -r requirements.txt

# Опционально: добавь ключ Anthropic для AI-обоснований
cp .env.example .env
# Отредактируй .env: ANTHROPIC_API_KEY=sk-...

python main.py
# → http://localhost:8000
```

### 2. Фронтенд (React + Vite)

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## 🏗️ Архитектура

```
┌─────────────────────────────┐
│     React SPA (Vite)        │  ← Фронтенд
│  ProfileForm → Dashboard    │
│  OlympiadCard + Calendar    │
└────────────┬────────────────┘
             │ HTTP API
┌────────────▼────────────────┐
│    FastAPI Backend          │  ← Бэкенд
│  /api/meta                  │
│  /api/recommend             │
│  /api/justify               │
└────────────┬────────────────┘
             │
┌────────────▼────────────────┐
│    Recommendation Engine    │  ← Алгоритм
│  Content-based filtering    │
│  Tag similarity scoring     │
│  Grade & level matching     │
└────────────┬────────────────┘
             │
┌────────────▼────────────────┐
│    Olympiad Database        │  ← Данные
│  20+ олимпиад               │
│  РСОШ + Минпросвещения      │
│  + региональные             │
└────────────┬────────────────┘
             │ (если есть ключ)
┌────────────▼────────────────┐
│    Anthropic Claude API     │  ← LLM
│  Персональные обоснования   │
└─────────────────────────────┘
```

## ✨ Возможности

- **Профиль школьника** — 4-шаговая анкета: имя/класс, предметы, регион, цели
- **Рекомендации** — content-based алгоритм по тегам, предметам, уровню
- **AI-обоснования** — Claude генерирует персональный текст "почему эта олимпиада подходит"
- **Календарь дедлайнов** — все этапы на учебный год по месяцам
- **Статистика** — по предметам, уровням, временной шкале
- **Умный fallback** — работает без API-ключа

## 📊 Источники данных

| Источник | Описание |
|---------|----------|
| РСОШ | Реестр олимпиад школьников |
| Перечень Минпросвещения | Официальный перечень олимпиад |
| Региональные | Конференции и конкурсы |

## 🛠️ Технологии

| Слой | Технологии |
|------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS v4, Vite |
| Backend | Python 3.11+, FastAPI, Uvicorn |
| AI | Anthropic Claude (claude-haiku-4-5) |
| Алгоритм | Content-based filtering, Tag similarity |

## 📁 Структура проекта

```
kodikterpils/
├── backend/
│   ├── main.py              # FastAPI приложение
│   ├── olympiad_data.py     # База данных олимпиад
│   ├── recommender.py       # Движок рекомендаций
│   └── requirements.txt
└── frontend/
    └── src/
        ├── App.tsx
        ├── api.ts
        ├── types/index.ts
        └── components/
            ├── ProfileForm.tsx    # 4-шаговая анкета
            ├── Dashboard.tsx      # Главный экран
            ├── OlympiadCard.tsx   # Карточка олимпиады
            └── CalendarView.tsx   # Календарь дедлайнов
```
