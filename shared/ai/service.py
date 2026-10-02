"""
SkillVeda career assistant.

The deterministic engine calculates; this layer only explains. It sends a
small structured context (target role, levels, gaps, roadmap) and never raw
resumes or the database. If the LLM is unavailable, the deterministic
explanation is returned instead so the product keeps working.
"""
from __future__ import annotations

import hashlib
import json
import logging
from typing import Any, Callable, Optional

from shared.ai.provider import LLMUnavailable, get_provider
from shared.services import student_intelligence as intel
from shared.store import db

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are the SkillVeda career assistant for a student. Use ONLY the SkillVeda context provided. "
    "The numbers (skill levels, required levels, gaps, readiness, roadmap order and durations) come from "
    "SkillVeda's deterministic engine: repeat them exactly and never invent new scores, skills, jobs or courses. "
    "If the context does not contain the answer, say so briefly. Be concise, concrete and encouraging, "
    "at most 180 words, in plain text without markdown headings."
)
MAX_QUESTION_CHARS = 500

ProviderFactory = Callable[[], Any]


def _cache_key(student_id: str, kind: str, payload: dict[str, Any], model: str) -> str:
    raw = json.dumps({"s": student_id, "k": kind, "p": payload, "m": model}, sort_keys=True)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _fallback_explanation(student_id: str, skill_id: Optional[str]) -> str:
    if skill_id:
        detail = intel.skill_detail(student_id, skill_id)
        if detail and detail["target_requirement"]:
            return detail["target_requirement"]["reason"]
        if detail:
            roles = ", ".join(r["role_title"] for r in detail["required_by_roles"][:3])
            base = f"{detail['skill_name']} is not required by your current target role."
            return base + (f" It is required by {roles}." if roles else "")
    return "Choose a skill or a target role to get an explanation from your SkillVeda data."


def _run(
    student_id: str,
    kind: str,
    context: dict[str, Any],
    prompt: str,
    fallback: str,
    provider_factory: ProviderFactory = get_provider,
    use_cache: bool = True,
) -> dict[str, Any]:
    try:
        provider = provider_factory()
    except LLMUnavailable as exc:
        return {"answer": fallback, "source": "skillveda_engine", "llm_used": False, "notice": str(exc), "context": context}

    key = _cache_key(student_id, kind, {"ctx": context, "prompt": prompt}, getattr(provider, "model", ""))
    if use_cache:
        cached = db.get_ai_cache(key)
        if cached:
            return {**cached, "cached": True}

    user_message = "SkillVeda context (JSON):\n" + json.dumps(context, ensure_ascii=False) + "\n\n" + prompt
    try:
        answer = provider.complete(SYSTEM_PROMPT, user_message)
    except LLMUnavailable as exc:
        logger.warning("LLM unavailable, using deterministic explanation: %s", exc)
        return {
            "answer": fallback, "source": "skillveda_engine", "llm_used": False,
            "notice": "The AI assistant is unavailable right now, so this is SkillVeda's built-in explanation.",
            "context": context,
        }

    result = {"answer": answer, "source": "llm", "llm_used": True, "provider": provider.name, "model": provider.model, "context": context}
    if use_cache:
        db.set_ai_cache(key, student_id, result)
    return {**result, "cached": False}


EXPLAIN_PROMPTS = {
    "gap": "Explain why this skill matters for my target role and how big my gap is.",
    "roadmap": "Explain why my roadmap is ordered this way and what I should focus on first.",
    "readiness": "Summarize where I stand for my target role and the most important next steps.",
}


def explain(student_id: str, skill_id: Optional[str], topic: str = "gap", provider_factory: ProviderFactory = get_provider) -> dict[str, Any]:
    context = intel.ai_context(student_id, skill_id)
    fallback = _fallback_explanation(student_id, skill_id)
    prompt = EXPLAIN_PROMPTS.get(topic, EXPLAIN_PROMPTS["gap"])
    return _run(student_id, f"explain:{topic}", context, prompt, fallback, provider_factory)


def career_question(student_id: str, question: str, skill_id: Optional[str] = None, provider_factory: ProviderFactory = get_provider) -> dict[str, Any]:
    question = question.strip()[:MAX_QUESTION_CHARS]
    context = intel.ai_context(student_id, skill_id)
    fallback = (
        _fallback_explanation(student_id, skill_id)
        if skill_id
        else "The AI assistant is not configured, so free-form questions are unavailable. "
             "Your gaps, roadmap and explanations on each page still come from SkillVeda's engine."
    )
    return _run(student_id, "question", context, "Question: " + question, fallback, provider_factory)
