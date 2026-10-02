"""Shared request dependencies."""
from __future__ import annotations

from fastapi import Header, HTTPException

from shared.store import db


def student_id_header(x_student_id: str = Header(..., alias="X-Student-Id")) -> str:
    """
    Local student identity. There is no login yet: the browser generates a
    random ID once and sends it on every request. Replace this dependency with
    real authentication later without touching the routes.
    """
    if not db.is_valid_student_id(x_student_id):
        raise HTTPException(status_code=400, detail="Missing or invalid X-Student-Id header.")
    return x_student_id
