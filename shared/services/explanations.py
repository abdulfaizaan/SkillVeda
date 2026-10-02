"""
Deterministic, data-backed explanations.

These sentences are built only from taxonomy and gap-engine numbers. They are
always available, and they are the facts the optional LLM layer elaborates on.
"""
from __future__ import annotations

from typing import Iterable

from shared.services.taxonomy import get_skill, skill_name


def importance_label(required_level: int) -> str:
    """How central a skill is to the role, from the role's required level."""
    if required_level >= 80:
        return "core"
    if required_level >= 70:
        return "important"
    return "supporting"


def confidence_label(confidence) -> str:
    """Label the NLP match confidence (how sure the match is, not skill level)."""
    if confidence is None:
        return "self-assessed"
    if confidence >= 0.9:
        return "high"
    if confidence >= 0.75:
        return "medium"
    return "low"


def _join(names: list[str]) -> str:
    if len(names) <= 1:
        return "".join(names)
    return ", ".join(names[:-1]) + " and " + names[-1]


def gap_reason(
    skill_id: str,
    role_title: str,
    user_level: int,
    required_level: int,
    demand_weight: float,
    user_levels: dict[str, int],
    unlocks_in_plan: Iterable[str] = (),
) -> str:
    name = skill_name(skill_id)
    gap = max(required_level - user_level, 0)
    parts: list[str] = []

    if user_level >= required_level * 0.8:
        parts.append(
            f"{role_title} expects {name} at {required_level}%. Your profile shows {user_level}%, "
            "which meets SkillVeda's strong threshold."
        )
    elif user_level <= 0:
        parts.append(f"{role_title} requires {name} at {required_level}%, and it is not in your skill profile yet.")
    else:
        parts.append(
            f"{role_title} requires {name} at {required_level}%. Your profile shows {user_level}%, a {gap}-point gap."
        )

    parts.append(f"Its market demand weight in the SkillVeda taxonomy is {round(demand_weight * 100)}%.")

    skill = get_skill(skill_id) or {}
    builds_on = [skill_name(p) for p in skill.get("prerequisites", []) if user_levels.get(p, 0) > 0]
    if builds_on:
        parts.append(f"It builds on skills you already have: {_join(builds_on)}.")

    unlock_names = [skill_name(s) for s in unlocks_in_plan]
    if unlock_names:
        parts.append(f"Learning it unlocks {_join(unlock_names)} in your roadmap.")

    return " ".join(parts)
