"""
FastAPI backend для AI-рекрутера олимпиад.
"""

import os
import json
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv
from openai import OpenAI

from constants import REGIONS
from recommender import rank_olympiads, build_calendar

# ──────────────── PATH CONFIG ────────────────

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data" / "normalized.json"

def load_olympiads():
    if not DATA_PATH.exists():
        return []
    with open(DATA_PATH, encoding="utf-8") as f:
        return json.load(f)

OLYMPIADS = load_olympiads()

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
    subjects = sorted({s for o in OLYMPIADS for s in o.get("subjects", [])})
    return {
        "subjects": subjects,
        "regions": REGIONS,
        "preparation_levels": ["начальный", "средний", "продвинутый"],
        "grades": list(range(5, 12)),
    }


@app.get("/api/olympiads")
def get_all_olympiads():
    return {"olympiads": OLYMPIADS, "total": len(OLYMPIADS)}


@app.post("/api/recommend")
def recommend(profile: StudentProfile):
    profile_dict = profile.model_dump()
    ranked = rank_olympiads(profile_dict, top_n=12)
    calendar = build_calendar(ranked)

    return {
        "profile": profile_dict,
        "recommendations": ranked,
        "calendar": calendar,
        "total_found": len(ranked),
    }


@app.post("/api/justify")
def justify(req: JustificationRequest):
    olympiad = next((o for o in OLYMPIADS if o["id"] == req.olympiad_id), None)

    if not olympiad:
        raise HTTPException(status_code=404, detail="Олимпиада не найдена")

    profile = req.profile

    if USE_AI:
        justification = _generate_ai_justification(olympiad, profile)
    else:
        justification = _generate_fallback_justification(olympiad, profile)

    return {"justification": justification, "olympiad_id": req.olympiad_id}


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
- Организатор: {olympiad.get('organizer')}
- Уровень: {olympiad.get('level')}
- Сложность: {olympiad.get('difficulty')}
- Тип: {olympiad.get('type')}
- Предметы: {', '.join(olympiad.get('subjects', []))}
- Онлайн: {'да' if olympiad.get('online') else 'нет/частично'}
- Награды: {olympiad.get('prize')}
- Описание: {olympiad.get('description')}

Напиши короткое (3-4 предложения) персонализированное обоснование.
"""

    try:
        response = ai_client.chat.completions.create(
            model=OPENROUTER_MODEL,
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content or _generate_fallback_justification(olympiad, profile)
    except Exception:
        return _generate_fallback_justification(olympiad, profile)


def _generate_fallback_justification(olympiad: dict, profile: StudentProfile) -> str:
    name = profile.name
    subjects = ", ".join(profile.subjects)
    olympiad_name = olympiad.get("name", "эта олимпиада")
    prize = olympiad.get("prize", "дипломы и преимущества при поступлении")

    return (
        f"{name}, олимпиада «{olympiad_name}» отлично подойдёт тебе, "
        f"если тебе интересны предметы: {subjects}. "
        f"Победители получают: {prize}."
    )


# ──────────────── RUN ────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)