"""
Cached, read-only access to the SkillVeda skill taxonomy.

The taxonomy JSON is the source of truth for skills, roles, prerequisites and
related skills. This module only indexes it so services do not rescan lists.
"""
from __future__ import annotations

from functools import lru_cache
from typing import Any, Optional

from shared.services.gap_analyzer import _load_taxonomy


@lru_cache(maxsize=1)
def taxonomy_index() -> dict[str, Any]:
    data = _load_taxonomy()
    skills = {s["id"]: s for s in data.get("skills", []) if s.get("id")}
    roles = {r["id"]: r for r in data.get("roles", []) if r.get("id")}

    required_by: dict[str, list[dict]] = {}
    for role in roles.values():
        for req in role.get("required_skills", []):
            required_by.setdefault(req["skill_id"], []).append({
                "role_id": role["id"],
                "role_title": role["title"],
                "required_proficiency": int(req.get("proficiency_required", 60)),
            })

    unlocks: dict[str, list[str]] = {}
    for skill in skills.values():
        for prereq in skill.get("prerequisites", []):
            unlocks.setdefault(prereq, []).append(skill["id"])

    return {"skills": skills, "roles": roles, "required_by": required_by, "unlocks": unlocks}


def get_skill(skill_id: str) -> Optional[dict]:
    return taxonomy_index()["skills"].get(skill_id)


def get_role(role_id: Optional[str]) -> Optional[dict]:
    if not role_id:
        return None
    return taxonomy_index()["roles"].get(role_id)


def skill_name(skill_id: str) -> str:
    skill = get_skill(skill_id)
    return skill["name"] if skill else skill_id.replace("_", " ").title()


def skill_category(skill_id: str) -> str:
    skill = get_skill(skill_id)
    return skill.get("category", "unknown") if skill else "unknown"
