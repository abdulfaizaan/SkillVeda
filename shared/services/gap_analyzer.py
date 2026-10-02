"""
SkillGraph Bharat - Gap Analysis Engine

Compares a user's extracted skills against a target role's requirements
(from the Neo4j Skill Graph) and produces a prioritized gap report.
"""
import json
from pathlib import Path
from typing import Optional


# Load taxonomy locally as fallback when Neo4j is unavailable
TAXONOMY_PATH = Path(__file__).resolve().parent.parent / "data" / "skill_taxonomy.json"


def _load_taxonomy():
    """Load skill taxonomy from JSON file. Handles both list and dict formats."""
    with open(TAXONOMY_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    # Handle flat list format (just skills, no roles)
    if isinstance(data, list):
        return {"skills": data, "roles": [], "metadata": {}}
    
    # Handle structured dict format
    return data


def _get_role_requirements_from_taxonomy(role_id: str, taxonomy: dict) -> list:
    """
    Fallback: Get required skills for a role directly from taxonomy JSON
    when Neo4j is not available.
    """
    for role in taxonomy.get("roles", []):
        if role["id"] == role_id:
            return role.get("required_skills", [])
    return []


def _get_skill_name(skill_id: str, taxonomy: dict) -> str:
    """Resolve skill_id to human-readable name."""
    for skill in taxonomy.get("skills", []):
        if skill["id"] == skill_id:
            return skill["name"]
    return skill_id.replace("_", " ").title()


def _get_skill_category(skill_id: str, taxonomy: dict) -> str:
    """Resolve skill_id to its category."""
    for skill in taxonomy.get("skills", []):
        if skill["id"] == skill_id:
            return skill.get("category", "unknown")
    return "unknown"


def _get_skill_demand(skill_id: str, taxonomy: dict) -> float:
    """Get demand weight for a skill."""
    for skill in taxonomy.get("skills", []):
        if skill["id"] == skill_id:
            return skill.get("demand_weight", 0.5)
    return 0.5


# ============================================================
# Scoring rules (shared by role gap analysis and job matching)
# ============================================================
STRONG_COVERAGE = 0.8
DEVELOPING_COVERAGE = 0.4


def classify_coverage(user_level: int, required_level: int) -> str:
    """Return "strong", "medium" or "critical" for one required skill."""
    required_level = max(1, required_level)
    coverage = min(user_level / required_level, 1.0)
    if coverage >= STRONG_COVERAGE:
        return "strong"
    if coverage >= DEVELOPING_COVERAGE:
        return "medium"
    return "critical"


def weighted_coverage(items: list[tuple[int, int, float]]) -> int:
    """
    Demand-weighted coverage in percent.

    items: (user_level, required_level, demand_weight) per required skill.
    Partial progress counts; higher-demand skills contribute slightly more.
    """
    covered = 0.0
    total_weight = 0.0
    for user_level, required_level, demand in items:
        covered += min(user_level / max(1, required_level), 1.0) * demand
        total_weight += demand
    return round((covered / total_weight) * 100) if total_weight else 0


def estimate_effort_weeks(gap: int) -> int:
    """Rough learning effort for closing a proficiency gap (0-100 points)."""
    return max(1, int((max(gap, 0) / 100) * 8))


def compute_gap(
    user_skills: list[dict],
    target_role_id: str,
    graph_db=None
) -> dict:
    """
    Core gap analysis algorithm.

    Args:
        user_skills: List of dicts from skill_extractor, each with:
                     {"skill_id": "python", "proficiency": 75, ...}
        target_role_id: Role ID from taxonomy (e.g., "ai_engineer")
        graph_db: Optional GraphDB instance. Falls back to JSON if None.

    Returns:
        {
            "target_role": "AI Engineer",
            "target_role_id": "ai_engineer",
            "overall_readiness": 62,  # percentage
            "strong_skills": [...],
            "medium_gaps": [...],
            "critical_gaps": [...],
            "irrelevant_skills": [...],
            "learning_roadmap": [...]
        }
    """
    taxonomy = _load_taxonomy()

    # Step 1: Get required skills for the target role
    if graph_db:
        try:
            required_raw = graph_db.get_skills_for_role(target_role_id)
            required_skills = [
                {"skill_id": r["id"], "proficiency_required": r.get("proficiency_required", 60)}
                for r in required_raw
            ]
        except Exception:
            required_skills = _get_role_requirements_from_taxonomy(target_role_id, taxonomy)
    else:
        required_skills = _get_role_requirements_from_taxonomy(target_role_id, taxonomy)

    if not required_skills:
        return {
            "target_role": target_role_id,
            "target_role_id": target_role_id,
            "error": f"Role '{target_role_id}' not found in the skill graph.",
            "overall_readiness": 0,
            "strong_skills": [],
            "medium_gaps": [],
            "critical_gaps": [],
            "irrelevant_skills": [],
            "learning_roadmap": []
        }

    # Resolve role title
    role_title = target_role_id.replace("_", " ").title()
    for role in taxonomy.get("roles", []):
        if role["id"] == target_role_id:
            role_title = role["title"]
            break

    return compute_gap_for_requirements(user_skills, required_skills, role_title, target_role_id, taxonomy)


def compute_gap_for_requirements(
    user_skills: list[dict],
    required_skills: list[dict],
    role_title: str,
    target_role_id: str,
    taxonomy: Optional[dict] = None,
) -> dict:
    """
    Score a skill profile against any list of requirements
    ({"skill_id", "proficiency_required"}). Used for taxonomy roles and for
    job postings so both share one scoring algorithm.
    """
    if taxonomy is None:
        taxonomy = _load_taxonomy()

    # Step 2: Build a lookup of user's current skills
    valid_skill_ids = {skill.get("id") for skill in taxonomy.get("skills", [])}
    user_skill_map = {}
    for skill in user_skills:
        if not isinstance(skill, dict):
            continue
        sid = str(skill.get("skill_id", "")).strip()
        if not sid or sid not in valid_skill_ids:
            continue
        try:
            proficiency = int(float(skill.get("proficiency", 50)))
        except (TypeError, ValueError):
            proficiency = 0
        user_skill_map[sid] = max(0, min(100, proficiency))

    # Step 3: Classify each required skill
    strong_skills = []
    medium_gaps = []
    critical_gaps = []

    for req in required_skills:
        skill_id = req["skill_id"]
        required_level = max(1, min(100, int(req.get("proficiency_required", 60))))
        user_level = user_skill_map.get(skill_id, 0)
        gap = required_level - user_level
        demand = max(0.1, min(1.0, float(_get_skill_demand(skill_id, taxonomy))))

        skill_entry = {
            "skill_id": skill_id,
            "skill_name": _get_skill_name(skill_id, taxonomy),
            "category": _get_skill_category(skill_id, taxonomy),
            "user_proficiency": user_level,
            "required_proficiency": required_level,
            "gap": max(gap, 0),
            "demand_weight": demand
        }

        status = classify_coverage(user_level, required_level)
        if status == "strong":
            # User has >= 80% of required level → STRONG
            strong_skills.append(skill_entry)
        elif status == "medium":
            # User has 40-80% of required level → MEDIUM gap
            medium_gaps.append(skill_entry)
        else:
            # User has < 40% of required level → CRITICAL gap
            critical_gaps.append(skill_entry)

    # Step 4: Find irrelevant skills (user has, but role doesn't need)
    required_ids = {r["skill_id"] for r in required_skills}
    irrelevant_skills = []
    for sid, prof in user_skill_map.items():
        if sid not in required_ids:
            irrelevant_skills.append({
                "skill_id": sid,
                "skill_name": _get_skill_name(sid, taxonomy),
                "category": _get_skill_category(sid, taxonomy),
                "user_proficiency": prof
            })

    # Step 5: Compute weighted coverage across every required skill. Partial
    # progress counts, while higher-demand skills contribute slightly more.
    total_required = len(required_skills)
    coverage_items = []
    for req in required_skills:
        skill_id = req["skill_id"]
        required_level = max(1, min(100, int(req.get("proficiency_required", 60))))
        demand = max(0.1, min(1.0, float(_get_skill_demand(skill_id, taxonomy))))
        coverage_items.append((user_skill_map.get(skill_id, 0), required_level, demand))
    readiness = weighted_coverage(coverage_items)

    # Step 6: Generate learning roadmap
    # Sort critical gaps by demand weight (highest demand first = learn first)
    # Then medium gaps
    roadmap = []
    priority_order = sorted(critical_gaps, key=lambda x: x["demand_weight"], reverse=True) + \
                     sorted(medium_gaps, key=lambda x: x["demand_weight"], reverse=True)

    for i, skill in enumerate(priority_order):
        roadmap.append({
            "step": i + 1,
            "skill_id": skill["skill_id"],
            "skill_name": skill["skill_name"],
            "priority": "HIGH" if skill in critical_gaps else "MEDIUM",
            "current_level": skill["user_proficiency"],
            "target_level": skill["required_proficiency"],
            "effort_estimate_weeks": estimate_effort_weeks(skill["gap"])
        })

    return {
        "target_role": role_title,
        "target_role_id": target_role_id,
        "overall_readiness": readiness,
        "readiness_method": "demand_weighted_skill_coverage",
        "total_required_skills": total_required,
        "strong_count": len(strong_skills),
        "medium_gap_count": len(medium_gaps),
        "critical_gap_count": len(critical_gaps),
        "strong_skills": strong_skills,
        "medium_gaps": medium_gaps,
        "critical_gaps": critical_gaps,
        "irrelevant_skills": irrelevant_skills,
        "learning_roadmap": roadmap
    }


def get_available_roles() -> list[dict]:
    """Return all roles from taxonomy with their IDs and titles."""
    taxonomy = _load_taxonomy()
    return [
        {"id": role["id"], "title": role["title"], "required_skill_count": len(role.get("required_skills", []))}
        for role in taxonomy.get("roles", [])
    ]


# ============================================================
# Demo / Standalone Test
# ============================================================
if __name__ == "__main__":
    # Simulate a student who knows Python, basic ML, and some web dev
    sample_user_skills = [
        {"skill_id": "python", "proficiency": 85},
        {"skill_id": "machine_learning", "proficiency": 30},
        {"skill_id": "sql", "proficiency": 60},
        {"skill_id": "html", "proficiency": 70},
        {"skill_id": "css", "proficiency": 65},
        {"skill_id": "javascript", "proficiency": 50},
        {"skill_id": "git", "proficiency": 70},
    ]

    print("=" * 60)
    print("  SKILLGRAPH BHARAT - GAP ANALYSIS DEMO")
    print("=" * 60)

    report = compute_gap(sample_user_skills, "ai_engineer")

    print(f"\nTarget Role: {report['target_role']}")
    print(f"Overall Readiness: {report['overall_readiness']}%\n")

    print("--- STRONG SKILLS ---")
    for s in report["strong_skills"]:
        print(f"  [OK]  {s['skill_name']}: {s['user_proficiency']}% (need {s['required_proficiency']}%)")

    print("\n--- MEDIUM GAPS ---")
    for s in report["medium_gaps"]:
        print(f"  [!!]  {s['skill_name']}: {s['user_proficiency']}% (need {s['required_proficiency']}%)")

    print("\n--- CRITICAL GAPS ---")
    for s in report["critical_gaps"]:
        print(f"  [XX]  {s['skill_name']}: {s['user_proficiency']}% (need {s['required_proficiency']}%)")

    print("\n--- LEARNING ROADMAP ---")
    for step in report["learning_roadmap"]:
        print(f"  Step {step['step']}: {step['skill_name']} [{step['priority']}] "
              f"({step['current_level']}% -> {step['target_level']}%, ~{step['effort_estimate_weeks']} weeks)")

    print(f"\nIrrelevant skills (not needed for this role): "
          f"{', '.join(s['skill_name'] for s in report['irrelevant_skills'])}")
