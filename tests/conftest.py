"""Test setup: isolated SQLite file per test and the LLM always disabled."""
import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

SAMPLE_RESUME = """
Software Engineer with 3 years of experience in Python and Django.
Built REST APIs using FastAPI. Familiar with Docker and basic AWS.
Completed a course on Machine Learning. Used PostgreSQL and Redis
for database management. Strong problem solving skills.
"""


@pytest.fixture(autouse=True)
def isolated_env(tmp_path, monkeypatch):
    monkeypatch.setenv("SKILLVEDA_DB_PATH", str(tmp_path / "test.db"))
    monkeypatch.setenv("LLM_PROVIDER", "disabled")
    monkeypatch.delenv("LLM_API_KEY", raising=False)
    yield


@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    from main import app

    return TestClient(app)


@pytest.fixture
def headers():
    return {"X-Student-Id": "test-student-0001"}
