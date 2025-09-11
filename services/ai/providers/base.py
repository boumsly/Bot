import os
from typing import List, Dict, Any

class AIProvider:
    def chat(self, messages: List[Dict[str, str]], system_prompt: str | None = None) -> Dict[str, Any]:
        raise NotImplementedError

def get_provider() -> AIProvider:
    provider = os.getenv("AI_PROVIDER", "openai").lower()
    if provider == "ollama":
        from .ollama_provider import OllamaProvider
        return OllamaProvider()
    else:
        from .openai_provider import OpenAIProvider
        return OpenAIProvider()
