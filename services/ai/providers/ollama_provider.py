import os
from typing import List, Dict, Any
import httpx

from .base import AIProvider

class OllamaProvider(AIProvider):
    def __init__(self):
        self.base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.model = os.getenv("OLLAMA_MODEL", "llama3")

    def chat(self, messages: List[Dict[str, str]], system_prompt: str | None = None) -> Dict[str, Any]:
        prompt = ""
        if system_prompt:
            prompt += f"System: {system_prompt}\n"
        for m in messages:
            prompt += f"{m.get('role')}: {m.get('content')}\n"
        payload = {"model": self.model, "prompt": prompt, "stream": False}
        with httpx.Client(timeout=60) as client:
            r = client.post(f"{self.base_url}/api/generate", json=payload)
            r.raise_for_status()
            data = r.json()
            return {"content": data.get("response", ""), "model": self.model}
