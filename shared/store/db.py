"""
Local persistence for student-owned state (SQLite, standard library only).

Stored here: profile, skill profile, target role, roadmap progress, activity,
recent resume analyses and cached AI explanations. Taxonomy, role requirements
and graph relationships stay in the taxonomy JSON.

Every function takes and returns plain values, so a Postgres implementation can
replace this module later without changing the services.
"""
from __future__ import annotations

import json
import os
import re
import sqlite3
import threading
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator, Optional

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = PROJECT_ROOT / ".local" / "skillveda.db"
STUDENT_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{8,64}$")
ROADMAP_STATUSES = ("not_started", "in_progress", "completed")
KEEP_RESUME_ANALYSES = 5

SCHEMA = """
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    education TEXT NOT NULL DEFAULT '',
    institution TEXT NOT NULL DEFAULT '',
    target_role_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS student_skills (
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    skill_id TEXT NOT NULL,
    proficiency INTEGER NOT NULL,
    confidence REAL,
    evidence TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL,
    nlp_proficiency INTEGER,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (student_id, skill_id)
);
CREATE TABLE IF NOT EXISTS roadmap_progress (
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    role_id TEXT NOT NULL,
    skill_id TEXT NOT NULL,
    status TEXT NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (student_id, role_id, skill_id)
);
CREATE TABLE IF NOT EXISTS activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_student ON activity(student_id, id DESC);
CREATE TABLE IF NOT EXISTS resume_analyses (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    filename TEXT,
    skills_json TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ai_cache (
    cache_key TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    response_json TEXT NOT NULL,
    created_at TEXT NOT NULL
);
"""

_initialized: set[str] = set()
_init_lock = threading.Lock()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def db_path() -> Path:
    return Path(os.getenv("SKILLVEDA_DB_PATH") or DEFAULT_DB_PATH)


def is_valid_student_id(value: Optional[str]) -> bool:
    return bool(value and STUDENT_ID_PATTERN.fullmatch(value))


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    path = db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        key = str(path.resolve())
        if key not in _initialized:
            with _init_lock:
                conn.executescript(SCHEMA)
                _initialized.add(key)
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ------------------------------------------------------------------ students
def get_or_create_student(student_id: str) -> dict[str, Any]:
    with connect() as conn:
        row = conn.execute("SELECT * FROM students WHERE id = ?", (student_id,)).fetchone()
        if row is None:
            now = _now()
            conn.execute(
                "INSERT INTO students (id, created_at, updated_at) VALUES (?, ?, ?)",
                (student_id, now, now),
            )
            row = conn.execute("SELECT * FROM students WHERE id = ?", (student_id,)).fetchone()
        return dict(row)


def update_profile(student_id: str, name: str, education: str, institution: str) -> None:
    with connect() as conn:
        conn.execute(
            "UPDATE students SET name = ?, education = ?, institution = ?, updated_at = ? WHERE id = ?",
            (name, education, institution, _now(), student_id),
        )


def set_target_role(student_id: str, role_id: Optional[str]) -> None:
    with connect() as conn:
        conn.execute(
            "UPDATE students SET target_role_id = ?, updated_at = ? WHERE id = ?",
            (role_id, _now(), student_id),
        )


def delete_student(student_id: str) -> None:
    with connect() as conn:
        conn.execute("DELETE FROM students WHERE id = ?", (student_id,))


# ------------------------------------------------------------------ skills
def list_skills(student_id: str) -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT skill_id, proficiency, confidence, evidence, source, nlp_proficiency, updated_at "
            "FROM student_skills WHERE student_id = ? ORDER BY proficiency DESC, skill_id",
            (student_id,),
        ).fetchall()
        return [dict(row) for row in rows]


def save_nlp_skills(student_id: str, skills: list[dict], replace: bool = False) -> None:
    """Store skills produced by the SkillVeda NLP (merge or replace)."""
    now = _now()
    with connect() as conn:
        if replace:
            conn.execute("DELETE FROM student_skills WHERE student_id = ?", (student_id,))
        for skill in skills:
            conn.execute(
                """
                INSERT INTO student_skills
                    (student_id, skill_id, proficiency, confidence, evidence, source, nlp_proficiency, updated_at)
                VALUES (?, ?, ?, ?, ?, 'resume_nlp', ?, ?)
                ON CONFLICT(student_id, skill_id) DO UPDATE SET
                    proficiency = excluded.proficiency,
                    confidence = excluded.confidence,
                    evidence = excluded.evidence,
                    source = 'resume_nlp',
                    nlp_proficiency = excluded.nlp_proficiency,
                    updated_at = excluded.updated_at
                """,
                (
                    student_id,
                    skill["skill_id"],
                    int(skill["proficiency"]),
                    skill.get("confidence"),
                    str(skill.get("evidence", ""))[:500],
                    int(skill["proficiency"]),
                    now,
                ),
            )


def set_skill_level(student_id: str, skill_id: str, proficiency: int) -> None:
    """Student self-assessment. Keeps the original NLP estimate for reference."""
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO student_skills (student_id, skill_id, proficiency, confidence, evidence, source, updated_at)
            VALUES (?, ?, ?, NULL, 'Added by the student', 'self_assessed', ?)
            ON CONFLICT(student_id, skill_id) DO UPDATE SET
                proficiency = excluded.proficiency,
                source = 'self_assessed',
                updated_at = excluded.updated_at
            """,
            (student_id, skill_id, proficiency, _now()),
        )


def delete_skill(student_id: str, skill_id: str) -> bool:
    with connect() as conn:
        cur = conn.execute(
            "DELETE FROM student_skills WHERE student_id = ? AND skill_id = ?",
            (student_id, skill_id),
        )
        return cur.rowcount > 0


# ------------------------------------------------------------------ roadmap
def get_roadmap_progress(student_id: str, role_id: str) -> dict[str, dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT skill_id, status, progress, updated_at FROM roadmap_progress WHERE student_id = ? AND role_id = ?",
            (student_id, role_id),
        ).fetchall()
        return {row["skill_id"]: dict(row) for row in rows}


def set_roadmap_progress(student_id: str, role_id: str, skill_id: str, status: str, progress: int) -> None:
    if status not in ROADMAP_STATUSES:
        raise ValueError(f"Unknown roadmap status: {status}")
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO roadmap_progress (student_id, role_id, skill_id, status, progress, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(student_id, role_id, skill_id) DO UPDATE SET
                status = excluded.status, progress = excluded.progress, updated_at = excluded.updated_at
            """,
            (student_id, role_id, skill_id, status, progress, _now()),
        )


# ------------------------------------------------------------------ activity
def add_activity(student_id: str, kind: str, message: str) -> None:
    with connect() as conn:
        conn.execute(
            "INSERT INTO activity (student_id, kind, message, created_at) VALUES (?, ?, ?, ?)",
            (student_id, kind, message[:300], _now()),
        )


def list_activity(student_id: str, limit: int = 8) -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT kind, message, created_at FROM activity WHERE student_id = ? ORDER BY id DESC LIMIT ?",
            (student_id, limit),
        ).fetchall()
        return [dict(row) for row in rows]


# ------------------------------------------------------------------ resume analyses
def save_resume_analysis(student_id: str, filename: Optional[str], skills: list[dict]) -> str:
    analysis_id = uuid.uuid4().hex
    with connect() as conn:
        conn.execute(
            "INSERT INTO resume_analyses (id, student_id, filename, skills_json, created_at) VALUES (?, ?, ?, ?, ?)",
            (analysis_id, student_id, filename, json.dumps(skills), _now()),
        )
        conn.execute(
            """
            DELETE FROM resume_analyses WHERE student_id = ? AND id NOT IN (
                SELECT id FROM resume_analyses WHERE student_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?
            )
            """,
            (student_id, student_id, KEEP_RESUME_ANALYSES),
        )
    return analysis_id


def get_resume_analysis(student_id: str, analysis_id: str) -> Optional[dict[str, Any]]:
    with connect() as conn:
        row = conn.execute(
            "SELECT id, filename, skills_json, created_at FROM resume_analyses WHERE id = ? AND student_id = ?",
            (analysis_id, student_id),
        ).fetchone()
        if row is None:
            return None
        data = dict(row)
        data["skills"] = json.loads(data.pop("skills_json"))
        return data


# ------------------------------------------------------------------ AI cache
def get_ai_cache(cache_key: str) -> Optional[dict[str, Any]]:
    with connect() as conn:
        row = conn.execute("SELECT response_json FROM ai_cache WHERE cache_key = ?", (cache_key,)).fetchone()
        return json.loads(row["response_json"]) if row else None


def set_ai_cache(cache_key: str, student_id: Optional[str], response: dict[str, Any]) -> None:
    with connect() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO ai_cache (cache_key, student_id, response_json, created_at) VALUES (?, ?, ?, ?)",
            (cache_key, student_id, json.dumps(response), _now()),
        )
