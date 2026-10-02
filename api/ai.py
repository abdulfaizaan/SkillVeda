"""Optional AI explanation endpoints. They never block the core product."""
from __future__ import annotations

import sqlite3
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from api.deps import student_id_header
from shared.ai import service
from shared.ai.provider import provider_status
from shared.services.taxonomy import get_skill

router = APIRouter(prefix="/api/ai", tags=["ai"])


class ExplainRequest(BaseModel):
    skill_id: Optional[str] = None
    topic: Literal["gap", "roadmap", "readiness"] = "gap"


class QuestionRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=service.MAX_QUESTION_CHARS)
    skill_id: Optional[str] = None


def _check_skill(skill_id: Optional[str]) -> None:
    if skill_id and not get_skill(skill_id):
        raise HTTPException(status_code=404, detail="Skill not found in the SkillVeda taxonomy.")


@router.get("/status")
def ai_status():
    return provider_status()


@router.post("/explain")
def ai_explain(body: ExplainRequest, student_id: str = Depends(student_id_header)):
    _check_skill(body.skill_id)
    try:
        return service.explain(student_id, body.skill_id, body.topic)
    except sqlite3.Error as exc:
        raise HTTPException(status_code=503, detail="SkillVeda could not reach its local database.") from exc


@router.post("/career-question")
def ai_career_question(body: QuestionRequest, student_id: str = Depends(student_id_header)):
    _check_skill(body.skill_id)
    try:
        return service.career_question(student_id, body.question, body.skill_id)
    except sqlite3.Error as exc:
        raise HTTPException(status_code=503, detail="SkillVeda could not reach its local database.") from exc
