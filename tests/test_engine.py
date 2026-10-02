"""The deterministic core: NLP, gap engine, roadmap order and catalogs."""
from shared.nlp.skill_extractor import extract_skills
from shared.services import catalog_matcher as catalog
from shared.services.gap_analyzer import compute_gap
from shared.services.roadmap_planner import build_roadmap, _ancestors
from shared.services.taxonomy import get_skill
from tests.conftest import SAMPLE_RESUME


def test_nlp_extracts_expected_skills():
    ids = {s["skill_id"] for s in extract_skills(SAMPLE_RESUME)}
    assert {"python", "django", "fastapi", "postgresql", "redis", "docker", "machine_learning"} <= ids
    for skill in extract_skills(SAMPLE_RESUME):
        assert 0 <= skill["proficiency"] <= 100
        assert 0 < skill["confidence"] <= 1
        assert skill["evidence"]


def test_gap_engine_baseline_is_unchanged():
    skills = extract_skills(SAMPLE_RESUME)
    ai = compute_gap(skills, "ai_engineer")
    backend = compute_gap(skills, "backend_developer")
    assert (ai["overall_readiness"], ai["strong_count"], ai["critical_gap_count"]) == (27, 3, 8)
    assert (backend["overall_readiness"], backend["strong_count"], backend["medium_gap_count"]) == (44, 4, 1)


def test_unknown_role_returns_error():
    assert "error" in compute_gap([], "not_a_role")


def test_roadmap_respects_prerequisites():
    report = compute_gap([], "ai_engineer")
    roadmap = build_roadmap(report, {}, {})
    order = [s["skill_id"] for s in roadmap["steps"]]
    position = {sid: i for i, sid in enumerate(order)}
    for sid in order:
        for dep in _ancestors(sid) & set(order):
            if sid in _ancestors(dep):
                continue  # taxonomy cycle, broken by priority
            assert position[dep] < position[sid], f"{dep} must come before {sid}"
    assert roadmap["summary"]["total_steps"] == len(order)


def test_seed_catalogs_reference_real_skills_and_are_marked_demo():
    assert catalog.catalog_meta("courses")["is_demo"]
    assert catalog.catalog_meta("jobs")["is_demo"]
    for course in catalog.all_courses():
        assert all(get_skill(sid) for sid in course["skills_taught"])
    for job in catalog.all_jobs():
        assert all(get_skill(r["skill_id"]) for r in job["required_skills"])


def test_course_recommendations_only_teach_the_gap_skill():
    report = compute_gap(extract_skills(SAMPLE_RESUME), "ai_engineer")
    for group in catalog.recommend_courses(report):
        for course in group["courses"]:
            assert group["skill_id"] in {s["skill_id"] for s in course["skills_taught"]}
