import express from "express";
import cors from "cors";
import { validateEnv, env } from "./config/env.js";
import { closeDb } from "./db/index.js";
import healthRouter from "./routes/health.js";
import analyzeRouter from "./routes/analyze.js";
import meetingsRouter from "./routes/meetings.js";

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

// ── Validate environment ────────────────────────────────────────────
validateEnv();

const app = express();
const PORT = Number(env("PORT", "3001"));

// ── Middleware ───────────────────────────────────────────────────────
const corsOrigin = env("CORS_ORIGIN", "*");
const allowedOrigins = corsOrigin.split(",").map((o) => o.trim()).filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server, curl, same-origin) or wildcard
      if (!origin || corsOrigin === "*" || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

// ── API Routes ───────────────────────────────────────────────────────
app.use("/api", healthRouter);
app.use("/api", analyzeRouter);
app.use("/api", meetingsRouter);

// ── 404 handler for unknown API routes ──────────────────────────────
app.use("/api", (_req, res) => {
  res.status(404).json({
    status: "error",
    code: "NOT_FOUND",
    message: "Requested API endpoint not found",
  });
});

// ── Static Frontend Serving (Unified Full-Stack Deployment) ──────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, "../../client/dist");

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  // SPA fallback for non-API navigation routes (e.g. /history)
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
}

// ── Global error handler ────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(err.status || 500).json({
    status: "error",
    code: err.code || "INTERNAL_ERROR",
    message:
      env("NODE_ENV", "development") === "development"
        ? err.message
        : "Internal server error occurred",
  });
});

// ── Start server ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  MeetNotes API running → http://localhost:${PORT}`);
  console.log(`   Health check → http://localhost:${PORT}/api/health\n`);
});

// ── Graceful shutdown ───────────────────────────────────────────────
function shutdown(signal) {
  console.log(`\n${signal} received — shutting down…`);
  closeDb();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
