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
        # Prepare messages for OpenAI Chat Completions API
        api_messages = []
        
        if system_prompt:
            api_messages.append({"role": "system", "content": system_prompt})
        
        # Add the conversation messages
        for m in messages:
            role = m.get("role", "user")
            content = m.get("content", "")
            if role in ["system", "user", "assistant"]:
                api_messages.append({"role": role, "content": content})
            else:
                # Default unknown roles to user
                api_messages.append({"role": "user", "content": content})

        # Optional temperature via env
        temp_env = os.getenv("OPENAI_TEMPERATURE")
        extra: Dict[str, Any] = {}
        if temp_env:
            try:
                extra["temperature"] = float(temp_env)
            except Exception:
                pass

        resp = self.client.chat.completions.create(
            model=self.model,
            messages=api_messages,
            **extra,
        )
        content = resp.choices[0].message.content or ""
        return {"content": content, "model": self.model}
