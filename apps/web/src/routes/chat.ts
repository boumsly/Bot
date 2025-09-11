import { Router } from "express";
import axios from "axios";
import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();
const AI_BASE = process.env.PY_AI_BASE_URL || "http://localhost:8000";

// POST /api/chat
// body: { sessionId: string, message: string }
router.post("/", async (req: Request, res: Response) => {
  try {
    const { sessionId, message } = req.body as { sessionId: string; message: string };
    if (!sessionId || !message) return res.status(400).json({ error: "bad_request" });

    const session = await prisma.chatSession.findUnique({ where: { id: sessionId }, include: { department: true } });
    if (!session) return res.status(404).json({ error: "not_found" });

    // Load recent history (limit 20)
    const history = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      take: 20,
      select: { role: true, content: true },
    });

    // Add the new user message to history to give full context to AI
    const aiMessages = [
      { role: "system", content: `Tu es un assistant bref et empathique. Langue: Français. Département: ${session.department?.key ?? "n/a"}.` },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    const { data } = await axios.post(`${AI_BASE}/chat`, {
      sessionId,
      departmentKey: session.department?.key,
      messages: aiMessages,
    });
    const reply: string = data?.reply ?? "";

    // Persist the exchange
    await prisma.message.createMany({
      data: [
        { sessionId, role: "user", content: message },
        { sessionId, role: "assistant", content: reply || "" },
      ],
    });

    return res.json({ reply });
  } catch (e: any) {
    const detail = e?.response?.data || e?.message || String(e);
    console.error(detail);
    return res.status(500).json({ error: "chat_failed", detail });
  }
});

export default router;
