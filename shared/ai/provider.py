"""
Replaceable LLM providers.

Configured only through environment variables (never sent to the browser):

    LLM_PROVIDER   disabled | openai_compatible | ollama | gemini
    LLM_MODEL      model name for the provider
    LLM_API_KEY    secret key (not needed for ollama)
    LLM_BASE_URL   API base URL (openai_compatible / ollama)
    LLM_TIMEOUT_SECONDS  optional, default 20

"openai_compatible" covers most low-cost hosted models (Groq, DeepSeek,
OpenRouter, Together, Mistral, etc.) because they expose the same
/chat/completions API. Adding another provider means adding one class.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional, Protocol

import httpx


class LLMUnavailable(Exception):
    """Raised when no provider is configured or the provider call fails."""


@dataclass(frozen=True)
class LLMConfig:
    provider: str
    model: str
    api_key: str
    base_url: str
    timeout: float

    @classmethod
    def from_env(cls) -> "LLMConfig":
        try:
            timeout = float(os.getenv("LLM_TIMEOUT_SECONDS", "20"))
        except ValueError:
            timeout = 20.0
        return cls(
            provider=(os.getenv("LLM_PROVIDER") or "disabled").strip().lower(),
            model=(os.getenv("LLM_MODEL") or "").strip(),
            api_key=(os.getenv("LLM_API_KEY") or "").strip(),
            base_url=(os.getenv("LLM_BASE_URL") or "").strip().rstrip("/"),
            timeout=timeout,
        )


class LLMProvider(Protocol):
    name: str
    model: str

    def complete(self, system: str, user: str, max_tokens: int = 400) -> str: ...


class OpenAICompatibleProvider:
    name = "openai_compatible"

    def __init__(self, config: LLMConfig, require_key: bool = True):
        if not config.base_url or not config.model:
            raise LLMUnavailable("LLM_BASE_URL and LLM_MODEL must be set.")
        if require_key and not config.api_key:
            raise LLMUnavailable("LLM_API_KEY must be set.")
        self.config = config
        self.model = config.model

    def complete(self, system: str, user: str, max_tokens: int = 400) -> str:
        headers = {"Content-Type": "application/json"}
        if self.config.api_key:
            headers["Authorization"] = f"Bearer {self.config.api_key}"
        payload = {
            "model": self.model,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
            "max_tokens": max_tokens,
            "temperature": 0.3,
        }
        try:
            response = httpx.post(
                f"{self.config.base_url}/chat/completions",
                json=payload, headers=headers, timeout=self.config.timeout,
            )
            response.raise_for_status()
            text = response.json()["choices"][0]["message"]["content"]
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as exc:
            raise LLMUnavailable(f"LLM request failed: {type(exc).__name__}") from exc
        if not isinstance(text, str) or not text.strip():
            raise LLMUnavailable("LLM returned an empty answer.")
        return text.strip()


class OllamaProvider(OpenAICompatibleProvider):
    """Local models through Ollama's OpenAI-compatible endpoint (no key)."""
    name = "ollama"

    def __init__(self, config: LLMConfig):
        if not config.base_url:
            config = LLMConfig(config.provider, config.model, config.api_key, "http://127.0.0.1:11434/v1", config.timeout)
        super().__init__(config, require_key=False)


class GeminiProvider:
    name = "gemini"

    def __init__(self, config: LLMConfig):
        if not config.api_key or not config.model:
            raise LLMUnavailable("LLM_API_KEY and LLM_MODEL must be set.")
        self.config = config
        self.model = config.model

    def complete(self, system: str, user: str, max_tokens: int = 400) -> str:
        base = self.config.base_url or "https://generativelanguage.googleapis.com/v1beta"
        payload = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": user}]}],
            "generationConfig": {"maxOutputTokens": max_tokens, "temperature": 0.3},
        }
        try:
            response = httpx.post(
                f"{base}/models/{self.model}:generateContent",
                json=payload, headers={"x-goog-api-key": self.config.api_key}, timeout=self.config.timeout,
            )
            response.raise_for_status()
            parts = response.json()["candidates"][0]["content"]["parts"]
            text = "".join(p.get("text", "") for p in parts)
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as exc:
            raise LLMUnavailable(f"LLM request failed: {type(exc).__name__}") from exc
        if not text.strip():
            raise LLMUnavailable("LLM returned an empty answer.")
        return text.strip()


PROVIDERS = {
    "openai_compatible": OpenAICompatibleProvider,
    "ollama": OllamaProvider,
    "gemini": GeminiProvider,
}


def get_provider(config: Optional[LLMConfig] = None) -> LLMProvider:
    config = config or LLMConfig.from_env()
    if config.provider in ("", "disabled", "none"):
        raise LLMUnavailable("No LLM provider is configured.")
    factory = PROVIDERS.get(config.provider)
    if factory is None:
        raise LLMUnavailable(f"Unknown LLM_PROVIDER '{config.provider}'.")
    return factory(config)


def provider_status() -> dict:
    """Safe to return to the browser: no key, no URL."""
    config = LLMConfig.from_env()
    try:
        provider = get_provider(config)
        return {"enabled": True, "provider": provider.name, "model": provider.model}
    except LLMUnavailable as exc:
        return {"enabled": False, "provider": config.provider or "disabled", "model": None, "reason": str(exc)}
