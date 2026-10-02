"""Turn an uploaded resume file into plain text for the SkillVeda NLP."""
from __future__ import annotations

import io
from pathlib import Path

MAX_RESUME_BYTES = 10 * 1024 * 1024
SUPPORTED_SUFFIXES = {".pdf", ".txt"}


class ResumeReadError(Exception):
    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def read_resume_text(filename: str, content: bytes) -> str:
    """Validate and extract text. Raises ResumeReadError with an HTTP status."""
    if not filename:
        raise ResumeReadError(400, "No file provided.")

    suffix = Path(filename).suffix.lower()
    if suffix not in SUPPORTED_SUFFIXES:
        raise ResumeReadError(415, "Unsupported file type. Upload a text-based PDF or TXT file.")
    if len(content) > MAX_RESUME_BYTES:
        raise ResumeReadError(413, "File exceeds the 10 MB upload limit.")

    if suffix == ".pdf":
        try:
            import PyPDF2
        except ImportError as exc:
            raise ResumeReadError(503, "PDF support is unavailable. Install the backend requirements and restart the API.") from exc
        try:
            reader = PyPDF2.PdfReader(io.BytesIO(content), strict=False)
            if reader.is_encrypted:
                raise ResumeReadError(400, "This PDF is password protected. Upload an unlocked PDF or paste the text.")
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        except ResumeReadError:
            raise
        except Exception as exc:
            raise ResumeReadError(400, "Could not read this PDF. Make sure it is a valid, text-based PDF.") from exc
    else:
        text = content.decode("utf-8-sig", errors="replace")

    if len(text.strip()) < 10:
        raise ResumeReadError(
            400,
            "No readable text was found. Scanned image PDFs need OCR; try a text-based PDF or paste the resume text.",
        )
    return text
