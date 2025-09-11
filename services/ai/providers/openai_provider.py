import os
from typing import List, Dict, Any
from openai import OpenAI

from .base import AIProvider

class OpenAIProvider(AIProvider):
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is not set")
        self.client = OpenAI(api_key=api_key)
        self.model = os.getenv("OPENAI_MODEL", "gpt-4")

    def chat(self, messages: List[Dict[str, str]], system_prompt: str | None = None) -> Dict[str, Any]:
        # Flatten messages to a single transcript string compatible with Responses API
        parts: List[str] = []
        if system_prompt:
            parts.append(f"System: {system_prompt}")
        for m in messages:
            role = m.get("role", "user")
            content = m.get("content", "")
            if role == "system":
                parts.append(f"System: {content}")
            elif role == "assistant":
                parts.append(f"Assistant: {content}")
            else:
                parts.append(f"User: {content}")
        transcript = "\n".join(parts)

        # Optional temperature via env; omitted by default for maximum compatibility
        temp_env = os.getenv("OPENAI_TEMPERATURE")
        extra: Dict[str, Any] = {}
        if temp_env:
            try:
                extra["temperature"] = float(temp_env)
            except Exception:
                pass

        resp = self.client.responses.create(
            model=self.model,
            input=transcript,
            **extra,
        )
        content = getattr(resp, "output_text", "") or ""
        return {"content": content, "model": self.model}
