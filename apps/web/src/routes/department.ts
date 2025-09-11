import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import type { Request, Response } from "express";

const prisma = new PrismaClient();
const router = Router();

// GET /api/department - list departments
router.get("/", async (_req: Request, res: Response) => {
  try {
    const deps = await prisma.department.findMany({
      orderBy: { name: "asc" },
      select: { id: true, key: true, name: true },
    });
    return res.json({ count: deps.length, departments: deps });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: "failed_to_list_departments" });
  }
});

// GET /api/department/:key/answers
router.get("/:key/answers", async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const dep = await prisma.department.findUnique({ where: { key } });
    if (!dep) return res.status(404).json({ error: "department_not_found" });

    const answers = await prisma.answer.findMany({
      where: { session: { departmentId: dep.id } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        sessionId: true,
        questionKey: true,
        value: true,
        createdAt: true,
      },
    });

    return res.json({ department: { id: dep.id, key: dep.key, name: dep.name }, count: answers.length, answers });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: "failed_to_get_department_answers" });
  }
});

export default router;
