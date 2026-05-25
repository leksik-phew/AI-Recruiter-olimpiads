"""
Vercel serverless entry point.

Vercel видит этот файл как ASGI-функцию и вызывает `app`.
Все запросы /api/* перенаправляются сюда через vercel.json.
"""

import sys
import os

# Добавляем папку backend в путь Python, чтобы импорты main.py работали
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from main import app  # noqa: F401  ← Vercel ищет переменную `app`
