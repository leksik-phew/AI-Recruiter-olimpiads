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

load_dotenv()

_api_key = os.getenv("OPENROUTER_API_KEY", "")
USE_AI = bool(_api_key)

ai_client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=_api_key or "no-key",
)

OPENROUTER_MODELS = [
    "openai/gpt-oss-20b:free",
    "openai/gpt-oss-120b:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "google/gemma-4-26b-a4b-it:free",
]

app = FastAPI(title="AI-Рекрутер олимпиад", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    """Персональные рекомендации — только подходящие олимпиады из normalized.json,
    отсортированные по релевантности профилю. Фильтрация происходит автоматически
    по профилю (класс, предметы, цель, онлайн)."""
    profile_dict = profile.model_dump()
    ranked, applied_filters = rank_olympiads(profile_dict)
    calendar = build_calendar(ranked)

    return {
        "profile":          profile_dict,
        "recommendations":  ranked,
        "calendar":         calendar,
        "total_found":      len(ranked),
        "applied_filters":  applied_filters,
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

import logging
logger = logging.getLogger("uvicorn.error")

def _generate_ai_justification(olympiad: dict, profile: StudentProfile) -> str:
    prompt = (
        f"Ты — персональный образовательный советник для школьников России.\n\n"
        f"Профиль школьника:\n"
        f"- Имя: {profile.name}\n"
        f"- Класс: {profile.grade}\n"
        f"- Предметы: {', '.join(profile.subjects)}\n"
        f"- Регион: {profile.region}\n"
        f"- Уровень подготовки: {profile.preparation_level}\n"
        f"- Цели: {profile.goals or 'не указаны'}\n\n"
        f"Олимпиада:\n"
        f"- Название: {olympiad.get('name')}\n"
        f"- Организатор: {olympiad.get('organizer') or 'не указан'}\n"
        f"- Уровень: {olympiad.get('level') or 'не указан'}\n"
        f"- Сложность: {olympiad.get('difficulty') or 'не указана'}\n"
        f"- Тип: {olympiad.get('type')}\n"
        f"- Предметы: {', '.join(olympiad.get('subjects') or [])}\n"
        f"- Онлайн: {'да' if olympiad.get('online') else 'нет/частично'}\n"
        f"- Награды: {olympiad.get('prize') or 'не указаны'}\n"
        f"- Описание: {olympiad.get('description') or 'не указано'}\n\n"
        f"Напиши короткое (3-4 предложения) персонализированное обоснование. "
        f"Не используй markdown, звёздочки и заголовки — только живой текст."
    )

    last_err = None
    for model in OPENROUTER_MODELS:
        try:
            response = ai_client.chat.completions.create(
                model=model,
                max_tokens=400,
                messages=[{"role": "user", "content": prompt}],
                timeout=15,
            )
            text = (response.choices[0].message.content or "").strip()
            if text:
                logger.info("AI justify OK via %s", model)
                return text
        except Exception as e:
            last_err = e
            code = getattr(e, "status_code", None)
            logger.warning("AI justify failed (%s) model=%s: %s", code, model, str(e)[:120])

            continue

    logger.error("All AI models failed. Last error: %s", last_err)
    return _generate_fallback_justification(olympiad, profile)

def _generate_fallback_justification(olympiad: dict, profile: StudentProfile) -> str:
    subjects_str = ", ".join(profile.subjects) if profile.subjects else "выбранным предметам"
    olympiad_name = olympiad.get("name") or "эта олимпиада"
    return (
        f"{profile.name}, олимпиада «{olympiad_name}» может подойти тебе "
        f"по {subjects_str}. Переходи на сайт, чтобы узнать условия участия."
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
