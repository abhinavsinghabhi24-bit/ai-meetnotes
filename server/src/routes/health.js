import { Router } from "express";
import { getDb } from "../db/index.js";

const router = Router();

/**
 * GET /api/health
 * Returns server status, uptime, and database connectivity.
 */
router.get("/health", async (_req, res) => {
  try {
    // Quick DB connectivity check
    const db = await getDb();
    const stmt = db.prepare("SELECT 1 AS ok");
    stmt.step();
    const row = stmt.getAsObject();
    stmt.free();

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      database: row?.ok === 1 ? "connected" : "error",
    });
  } catch (err) {
    console.error("Health check failed:", err);
    res.status(503).json({
      status: "error",
      message: "Service unavailable",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
