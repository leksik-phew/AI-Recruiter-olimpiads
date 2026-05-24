"""
FastAPI backend для AI-рекрутера олимпиад.
"""
import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv
import anthropic

from olympiad_data import OLYMPIADS, REGIONS
from recommender import rank_olympiads, build_calendar

load_dotenv()

app = FastAPI(title="AI-Рекрутер олимпиад", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Anthropic client
try:
    ai_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
    USE_AI = bool(os.getenv("ANTHROPIC_API_KEY"))
except Exception:
    USE_AI = False


class StudentProfile(BaseModel):
    name: str
    grade: int  # Класс 5-11
    subjects: List[str]  # Предметы
    region: str
    preparation_level: str  # начальный / средний / продвинутый
    prefer_online: bool = False
    goals: Optional[str] = ""  # Цели: поступление в вуз, самореализация и т.д.


class JustificationRequest(BaseModel):
    profile: StudentProfile
    olympiad_id: str


# ──────────────── ENDPOINTS ────────────────

@app.get("/api/meta")
def get_meta():
    """Возвращает справочные данные для форм."""
    subjects = sorted({s for o in OLYMPIADS for s in o["subjects"]})
    return {
        "subjects": subjects,
        "regions": REGIONS,
        "preparation_levels": ["начальный", "средний", "продвинутый"],
        "grades": list(range(5, 12)),
    }


@app.get("/api/olympiads")
def get_all_olympiads():
    """Возвращает все олимпиады."""
    return {"olympiads": OLYMPIADS, "total": len(OLYMPIADS)}


@app.post("/api/recommend")
def recommend(profile: StudentProfile):
    """Возвращает топ рекомендаций по профилю."""
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
    """Генерирует AI-обоснование выбора олимпиады для данного школьника."""
    # Найдём олимпиаду
    olympiad = next((o for o in OLYMPIADS if o["id"] == req.olympiad_id), None)
    if not olympiad:
        raise HTTPException(status_code=404, detail="Олимпиада не найдена")

    profile = req.profile

    if USE_AI:
        justification = _generate_ai_justification(olympiad, profile)
    else:
        justification = _generate_fallback_justification(olympiad, profile)

    return {"justification": justification, "olympiad_id": req.olympiad_id}


def _generate_ai_justification(olympiad: dict, profile: StudentProfile) -> str:
    """Генерирует обоснование через Claude API."""
    prompt = f"""Ты — персональный образовательный советник для школьников России.

Профиль школьника:
- Имя: {profile.name}
- Класс: {profile.grade}
- Предметы: {', '.join(profile.subjects)}
- Регион: {profile.region}
- Уровень подготовки: {profile.preparation_level}
- Цели: {profile.goals or 'не указаны'}

Олимпиада / конкурс:
- Название: {olympiad['name']}
- Организатор: {olympiad['organizer']}
- Уровень: {olympiad['level']} (1 — высший)
- Сложность: {olympiad['difficulty']}
- Тип: {olympiad['type']}
- Предметы: {', '.join(olympiad['subjects'])}
- Онлайн: {'да' if olympiad['online'] else 'нет/частично'}
- Награды: {olympiad['prize']}
- Описание: {olympiad['description']}

Напиши короткое (3-4 предложения) персонализированное обоснование: почему именно эта олимпиада подходит данному школьнику, какие конкретные преимущества она даёт, на что обратить внимание при подготовке. Пиши дружелюбно, конкретно, без воды. Обращайся к школьнику по имени."""

    try:
        message = ai_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text
    except Exception as e:
        return _generate_fallback_justification(olympiad, profile)


def _generate_fallback_justification(olympiad: dict, profile: StudentProfile) -> str:
    """Генерирует обоснование без API (fallback)."""
    name = profile.name
    subjects = ", ".join(profile.subjects)
    olympiad_name = olympiad["name"]
    prize = olympiad["prize"]
    difficulty = olympiad["difficulty"]
    prep = profile.preparation_level

    level_comment = {
        ("продвинутый", "высокий"): f"Твой продвинутый уровень подготовки — именно то, что нужно для этой олимпиады.",
        ("средний", "средний"): f"Твой уровень подготовки хорошо соответствует сложности этой олимпиады.",
        ("начальный", "средний"): f"Это отличный следующий шаг в твоём развитии — не слишком просто, но вполне реально.",
        ("начальный", "низкий"): f"Это отличный старт — задания доступны для твоего уровня.",
    }.get((prep, difficulty), f"Эта олимпиада хорошо соответствует твоему профилю.")

    online_note = " Можно участвовать онлайн — удобно из любого региона." if olympiad.get("online") else ""

    return (
        f"{name}, олимпиада «{olympiad_name}» — отличный выбор для школьника с интересом к {subjects}. "
        f"{level_comment}"
        f"{online_note} "
        f"Победители получают: {prize}, что даёт реальные преимущества при поступлении в ведущие вузы страны."
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
