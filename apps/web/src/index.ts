import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import sessionRouter from "./routes/session";
import departmentRouter from "./routes/department";
import chatRouter from "./routes/chat";
import type { Request, Response } from "express";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req: Request, res: Response) => {
  console.log("Health endpoint called");
  res.json({ ok: true });
});
app.use("/api/session", sessionRouter);
app.use("/api/department", departmentRouter);
app.use("/api/chat", chatRouter);

// Serve UI from /public
const publicDir = path.join(process.cwd(), "public");
app.use(express.static(publicDir));

const port = Number(process.env.PORT) || 3000;
app.listen(port, '0.0.0.0', () => console.log(`[web] listening on :${port}`));
