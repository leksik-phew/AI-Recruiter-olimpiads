"""
FastAPI backend — AI-рекрутер олимпиад.

Источники данных:
  - карточки олимпиад  → backend/data/normalized.json  (через olympiad_data)
  - мета формы профиля → backend/constants.py          (SUBJECTS, REGIONS, …)
"""

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv
from openai import OpenAI

from constants import REGIONS, SUBJECTS, GRADES, PREPARATION_LEVELS

try:
    from recommender import rank_olympiads, build_calendar
except Exception:
    from backend.recommender import rank_olympiads, build_calendar

try:
    import olympiad_data
except Exception:
    from backend import olympiad_data

# ──────────────── ENV ────────────────

load_dotenv()

_api_key = os.getenv("OPENROUTER_API_KEY", "")
USE_AI = bool(_api_key)

ai_client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=_api_key or "no-key",
)

OPENROUTER_MODEL = "nvidia/nemotron-3-super-120b-a12b:free"

# ──────────────── APP ────────────────

app = FastAPI(title="AI-Рекрутер олимпиад", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────── MODELS ────────────────

class StudentProfile(BaseModel):
    name: str
    grade: int
    subjects: List[str]
    region: str
    preparation_level: str
    prefer_online: bool = False
    goals: Optional[str] = ""


class JustificationRequest(BaseModel):
    profile: StudentProfile
    olympiad_id: str


# ──────────────── ENDPOINTS ────────────────

@app.get("/api/meta")
def get_meta():
    """Справочники для формы профиля — из constants.py."""
    return {
        "subjects":           SUBJECTS,
        "regions":            REGIONS,
        "preparation_levels": PREPARATION_LEVELS,
        "grades":             GRADES,
    }


@app.get("/api/olympiads")
def get_all_olympiads():
    """Все олимпиады из normalized.json без фильтрации."""
    return {
        "olympiads": olympiad_data.OLYMPIADS,
        "total":     len(olympiad_data.OLYMPIADS),
    }


@app.post("/api/recommend")
def recommend(profile: StudentProfile):
    """Персональные рекомендации — все подходящие олимпиады из normalized.json,
    отсортированные по релевантности профилю."""
    profile_dict = profile.model_dump()
    ranked = rank_olympiads(profile_dict, top_n=len(olympiad_data.OLYMPIADS))
    calendar = build_calendar(ranked)

    return {
        "profile":         profile_dict,
        "recommendations": ranked,
        "calendar":        calendar,
        "total_found":     len(ranked),
    }


@app.post("/api/justify")
def justify(req: JustificationRequest):
    olympiad = next(
        (o for o in olympiad_data.OLYMPIADS if o["id"] == req.olympiad_id), None
    )

    if not olympiad:
        raise HTTPException(status_code=404, detail="Олимпиада не найдена")

    if USE_AI:
        justification = _generate_ai_justification(olympiad, req.profile)
    else:
        justification = _generate_fallback_justification(olympiad, req.profile)

    return {"justification": justification, "olympiad_id": req.olympiad_id}


@app.post("/api/reload-data")
def api_reload_data():
    """Перезагрузить normalized.json в память без перезапуска сервера."""
    try:
        count = olympiad_data.reload()
        return {"status": "ok", "count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────── AI LOGIC ────────────────

def _generate_ai_justification(olympiad: dict, profile: StudentProfile) -> str:
    prompt = f"""Ты — персональный образовательный советник для школьников России.

Профиль школьника:
- Имя: {profile.name}
- Класс: {profile.grade}
- Предметы: {', '.join(profile.subjects)}
- Регион: {profile.region}
- Уровень подготовки: {profile.preparation_level}
- Цели: {profile.goals or 'не указаны'}

Олимпиада:
- Название: {olympiad.get('name')}
- Организатор: {olympiad.get('organizer') or 'не указан'}
- Уровень: {olympiad.get('level') or 'не указан'}
- Сложность: {olympiad.get('difficulty') or 'не указана'}
- Тип: {olympiad.get('type')}
- Предметы: {', '.join(olympiad.get('subjects') or [])}
- Онлайн: {'да' if olympiad.get('online') else 'нет/частично'}
- Награды: {olympiad.get('prize') or 'не указаны'}
- Описание: {olympiad.get('description') or 'не указано'}

Напиши короткое (3-4 предложения) персонализированное обоснование.
"""

    try:
        response = ai_client.chat.completions.create(
            model=OPENROUTER_MODEL,
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}],
        )
        return (
            response.choices[0].message.content
            or _generate_fallback_justification(olympiad, profile)
        )
    except Exception:
        return _generate_fallback_justification(olympiad, profile)


def _generate_fallback_justification(olympiad: dict, profile: StudentProfile) -> str:
    subjects_str = ", ".join(profile.subjects) if profile.subjects else "выбранным предметам"
    olympiad_name = olympiad.get("name") or "эта олимпиада"
    return (
        f"{profile.name}, олимпиада «{olympiad_name}» может подойти тебе "
        f"по {subjects_str}. Переходи на сайт, чтобы узнать условия участия."
    )


# ──────────────── RUN ────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
