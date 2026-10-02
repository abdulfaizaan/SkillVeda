"""End-to-end student flow through the API, plus the legacy endpoints."""
import io

from shared.nlp.skill_extractor import extract_skills
from shared.services.gap_analyzer import compute_gap
from tests.conftest import SAMPLE_RESUME


def _onboard(client, headers, role="ai_engineer"):
    analysis = client.post("/api/student/resume/analyze-text", json={"text": SAMPLE_RESUME}, headers=headers)
    assert analysis.status_code == 200
    applied = client.post("/api/student/resume/apply", json={"analysis_id": analysis.json()["analysis_id"]}, headers=headers)
    assert applied.status_code == 200
    state = client.post("/api/student/target-role", json={"role_id": role}, headers=headers)
    assert state.status_code == 200
    return state.json()


def test_requires_student_id(client):
    assert client.get("/api/student/intelligence").status_code == 422
    assert client.get("/api/student/intelligence", headers={"X-Student-Id": "bad"}).status_code == 400


def test_empty_student_gets_resume_action(client, headers):
    state = client.get("/api/student/intelligence", headers=headers).json()
    assert state["has_skills"] is False
    assert state["readiness"] is None
    assert state["next_actions"][0]["kind"] == "resume"


def test_intelligence_matches_gap_engine(client, headers):
    state = _onboard(client, headers)
    expected = compute_gap(extract_skills(SAMPLE_RESUME), "ai_engineer")
    assert state["readiness"]["score"] == expected["overall_readiness"]
    assert len(state["critical_gaps"]) == expected["critical_gap_count"]
    assert all(g["reason"] for g in state["critical_gaps"])
    assert state["roadmap"]["steps"]
    assert len(state["next_actions"]) <= 3


def test_changing_target_role_recomputes(client, headers):
    ai = _onboard(client, headers, "ai_engineer")
    backend = client.post("/api/student/target-role", json={"role_id": "backend_developer"}, headers=headers).json()
    assert ai["readiness"]["score"] != backend["readiness"]["score"]
    assert client.post("/api/student/target-role", json={"role_id": "nope"}, headers=headers).status_code == 404


def test_roadmap_progress_persists(client, headers):
    state = _onboard(client, headers)
    skill_id = state["roadmap"]["steps"][0]["skill_id"]
    res = client.patch(f"/api/student/roadmap/{skill_id}", json={"status": "completed"}, headers=headers)
    assert res.status_code == 200
    again = client.get("/api/student/roadmap", headers=headers).json()
    step = next(s for s in again["roadmap"]["steps"] if s["skill_id"] == skill_id)
    assert step["status"] == "completed" and step["progress"] == 100
    assert again["roadmap"]["summary"]["completed_steps"] == 1
    assert client.patch("/api/student/roadmap/python_not_real", json={"status": "completed"}, headers=headers).status_code == 404


def test_self_assessment_keeps_nlp_estimate(client, headers):
    _onboard(client, headers)
    detail = client.put("/api/student/skills/python", json={"proficiency": 90}, headers=headers).json()
    assert detail["profile"]["proficiency"] == 90
    assert detail["profile"]["source"] == "self_assessed"
    assert detail["profile"]["nlp_proficiency"] == 75


def test_graph_courses_and_jobs(client, headers):
    _onboard(client, headers)
    graph = client.get("/api/student/skill-graph", headers=headers).json()
    ids = {n["id"] for n in graph["nodes"]}
    assert "role:ai_engineer" in ids
    assert all(e["source"] in ids and e["target"] in ids for e in graph["edges"])
    courses = client.get("/api/student/courses", headers=headers).json()
    assert courses["catalog"]["is_demo"] and courses["recommendations"]
    jobs = client.get("/api/student/jobs", headers=headers).json()
    assert jobs["catalog"]["is_demo"] and jobs["jobs"][0]["role_id"] == "ai_engineer"
    job = client.get(f"/api/student/jobs/{jobs['jobs'][0]['id']}", headers=headers).json()
    assert "strong_matches" in job and "missing" in job


def test_resume_file_validation(client, headers):
    bad = client.post("/api/student/resume/analyze", files={"file": ("cv.docx", b"hello world text", "application/octet-stream")}, headers=headers)
    assert bad.status_code == 415
    ok = client.post("/api/student/resume/analyze", files={"file": ("cv.txt", io.BytesIO(SAMPLE_RESUME.encode()), "text/plain")}, headers=headers)
    assert ok.status_code == 200 and ok.json()["total_skills_found"] >= 5
    broken = client.post("/api/student/resume/analyze", files={"file": ("cv.pdf", b"not really a pdf", "application/pdf")}, headers=headers)
    assert broken.status_code == 400


def test_ai_falls_back_without_llm(client, headers):
    _onboard(client, headers)
    assert client.get("/api/ai/status").json()["enabled"] is False
    res = client.post("/api/ai/explain", json={"skill_id": "pytorch"}, headers=headers).json()
    assert res["llm_used"] is False and res["source"] == "skillveda_engine"
    assert "PyTorch" in res["answer"]
    q = client.post("/api/ai/career-question", json={"question": "Why learn PyTorch?"}, headers=headers).json()
    assert q["llm_used"] is False


def test_ai_provider_failure_uses_engine_and_success_is_cached(headers):
    from shared.ai import service
    from shared.ai.provider import LLMUnavailable

    class Failing:
        name, model = "fake", "fake-1"
        def complete(self, system, user, max_tokens=400):
            raise LLMUnavailable("timeout")

    class Working:
        name, model = "fake", "fake-2"
        calls = 0
        def complete(self, system, user, max_tokens=400):
            Working.calls += 1
            assert "SkillVeda context" in user
            return "Because it is required."

    failed = service.explain(headers["X-Student-Id"], "pytorch", provider_factory=Failing)
    assert failed["llm_used"] is False
    first = service.explain(headers["X-Student-Id"], "pytorch", provider_factory=Working)
    second = service.explain(headers["X-Student-Id"], "pytorch", provider_factory=Working)
    assert first["llm_used"] and second["cached"] and Working.calls == 1


def test_legacy_endpoints_still_work(client):
    assert client.get("/health").json() == {"status": "healthy"}
    assert client.get("/api/roles").json()["total_roles"] == 18
    assert client.post("/api/extract-skills", json={"text": SAMPLE_RESUME}).json()["total_skills_found"] >= 5
    direct = client.post("/api/gap-analysis/direct", json={"skills": [{"skill_id": "python", "proficiency": 80}], "target_role_id": "ai_engineer"})
    assert direct.status_code == 200
    assert client.get("/api/graph/python").status_code == 200
    assert client.get("/api/skills/search?q=pyt").json()
