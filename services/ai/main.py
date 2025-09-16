import os
import json
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import JSONResponse
import traceback
from pydantic import BaseModel
from typing import Optional, Any, Dict
from .providers.base import get_provider

app = FastAPI(title="AI Service")

class NextQuestionRequest(BaseModel):
    sessionId: str
    departmentKey: Optional[str] = None
    nodeKey: Optional[str] = None
    answer: Optional[Any] = None

class NextQuestionResponse(BaseModel):
    nodeKey: Optional[str] = None
    questionText: Optional[str] = None
    type: Optional[str] = None
    validations: Optional[Dict[str, Any]] = None
    done: bool = False

class ChatRequest(BaseModel):
    sessionId: str
    departmentKey: Optional[str] = None
    messages: list[dict]

class ChatResponse(BaseModel):
    reply: str
    meta: Optional[dict] = None

# Load shared questions list once at startup
QUESTIONS_PATH = Path(__file__).parent / "questions.json"
try:
    with QUESTIONS_PATH.open("r", encoding="utf-8") as f:
        SHARED_FLOW = json.load(f)
except Exception:
    SHARED_FLOW = []

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/question/{key}")
def get_question(key: str):
    for q in SHARED_FLOW:
        if q.get("key") == key:
            return q
    return {"error": "not_found"}

@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    try:
        provider = get_provider()
        result = provider.chat(req.messages, system_prompt=f"Department: {req.departmentKey}")
        return ChatResponse(reply=result.get("content", ""), meta={"model": result.get("model")})
    except Exception as e:
        # Log full traceback server-side
        traceback.print_exc()
        # Return explicit error to caller for easier debugging
        return JSONResponse(status_code=500, content={"error": "chat_failed", "detail": str(e)})

@app.post("/next-question", response_model=NextQuestionResponse)
def next_question(req: NextQuestionRequest):
    # Shared flow for all departments loaded from questions.json
    flow = SHARED_FLOW or []

    # find next node
    order = [n.get("key") for n in flow]
    if req.nodeKey and req.nodeKey in order:
        idx = order.index(req.nodeKey) + 1
    else:
        idx = 0

    if idx >= len(flow):
        return NextQuestionResponse(done=True)

    node = flow[idx]
    node_key = node.get("key")
    q_text = node.get("questionText")
    q_type = node.get("type")
    validations = node.get("validations") or {}

    return NextQuestionResponse(
        nodeKey=node_key,
        questionText=q_text,
        type=q_type,
        validations=validations,
        done=False,
    )
