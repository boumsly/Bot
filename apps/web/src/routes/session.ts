import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import axios from "axios";
import type { Request, Response } from "express";

const prisma = new PrismaClient();
const router = Router();
const AI_BASE = process.env.PY_AI_BASE_URL || "http://127.0.0.1:8001";

router.post("/start", async (req: Request, res: Response) => {
  try {
    const { departmentKey, userId } = req.body as { departmentKey: string; userId?: string };
    const dep = await prisma.department.findUnique({ where: { key: departmentKey } });
    if (!dep) return res.status(400).json({ error: "Invalid department" });

    const session = await prisma.chatSession.create({
      data: { departmentId: dep.id, userId: userId ?? null },
    });

    return res.json({ sessionId: session.id });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: "failed_to_start_session" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const session = await prisma.chatSession.findUnique({
      where: { id },
      include: { messages: true, department: true },
    });
    if (!session) return res.status(404).json({ error: "not_found" });
    return res.json({ session });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: "failed_to_get_session" });
  }
});

router.post("/:id/answer", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { answer, nodeKey } = req.body as { answer?: any; nodeKey?: string };

    const session = await prisma.chatSession.findUnique({ where: { id }, include: { department: true } });
    if (!session) return res.status(404).json({ error: "not_found" });

    // Validate answer only if provided and nodeKey present
    if (typeof answer !== "undefined" && nodeKey) {
      try {
        const q = await axios.get(`${AI_BASE}/question/${encodeURIComponent(nodeKey)}`).then(r => r.data);
        if (!q || q.error === "not_found") {
          console.warn("question_metadata_not_found", { nodeKey });
          // Pas de validation si metadata manquante
        } else {
          // Type validations
          if (q.type === "number") {
            const num = typeof answer === "number" ? answer : Number(answer);
            if (Number.isNaN(num)) {
              return res.status(400).json({ error: "invalid_type_number", nodeKey });
            }
            const min = q.validations?.min;
            const max = q.validations?.max;
            if (typeof min === "number" && num < min) {
              return res.status(400).json({ error: "number_below_min", min, nodeKey });
            }
            if (typeof max === "number" && num > max) {
              return res.status(400).json({ error: "number_above_max", max, nodeKey });
            }
          }
          // Add more type validations here (e.g., enums, regex) when needed
        }
      } catch (e: any) {
        // Ne bloque pas si l'endpoint metadata échoue; continuer sans validation stricte
        console.warn("validation_metadata_fetch_failed", e?.response?.status, e?.response?.data || e?.message || e);
      }
    }

    // Persist user message only when an answer is provided
    if (typeof answer !== "undefined") {
      const content = typeof answer === "string" ? answer : JSON.stringify(answer);
      await prisma.message.create({
        data: { sessionId: id, role: "user", content },
      });
    }

    // Persist structured answer if provided (manual upsert: updateMany → create)
    if (typeof answer !== "undefined" && nodeKey) {
      const val: any = typeof answer === "string" ? (answer as any) : (answer as any);
      const updated = await prisma.answer.updateMany({
        where: { sessionId: id, questionKey: nodeKey },
        data: { value: val },
      });
      if (updated.count === 0) {
        await prisma.answer.create({
          data: { sessionId: id, questionKey: nodeKey, value: val },
        });
      }
    }

    // Ask Python for the next question
    const resp = await axios.post(`${AI_BASE}/next-question`, { sessionId: id, departmentKey: session.department.key, nodeKey, answer });

    const { nodeKey: nextNodeKey, questionText, type, validations, done } = resp.data;

    if (questionText) {
      await prisma.message.create({
        data: { sessionId: id, role: "assistant", content: questionText },
      });
    }

    return res.json({ nextQuestion: { nodeKey: nextNodeKey, questionText, type, validations }, done: !!done });
  } catch (e: any) {
    console.error(e?.response?.data || e);
    return res.status(500).json({ error: "failed_to_process_answer" });
  }
});

export default router;

// GET /api/session/:id/answers - list structured answers for a session
router.get("/:id/answers", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const session = await prisma.chatSession.findUnique({ where: { id } });
    if (!session) return res.status(404).json({ error: "not_found" });

    const answers = await prisma.answer.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: "asc" },
      select: { id: true, questionKey: true, value: true, createdAt: true },
    });
    return res.json({ sessionId: id, count: answers.length, answers });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "failed_to_get_session_answers" });
  }
});
