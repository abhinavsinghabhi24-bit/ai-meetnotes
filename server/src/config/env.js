import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load server/.env regardless of where node was launched
const serverEnvPath = path.resolve(__dirname, "../../.env");
if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath });
}

// Also check root .env if present
const rootEnvPath = path.resolve(__dirname, "../../../.env");
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}

// Default fallback to current working directory
dotenv.config();

/** Required environment variables and their descriptions. */
const REQUIRED_VARS = {
  // None strictly required for Phase 1; add keys here in later phases.
  // OPENAI_API_KEY: "OpenAI API key for summarization",
};

/** Validate environment variables and report status. */
export function validateEnv() {
  const missing = Object.entries(REQUIRED_VARS)
    .filter(([key]) => !process.env[key])
    .map(([key, desc]) => `  • ${key} — ${desc}`);

  if (missing.length > 0) {
    console.error(
      `\n❌  Missing required environment variables:\n${missing.join("\n")}\n` +
        `Copy .env.example → .env and fill in the values.\n`
    );
    process.exit(1);
  }

  // Check AI Provider status (never logging the keys!)
  const hasGemini = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  const hasOpenAi = Boolean(process.env.OPENAI_API_KEY);
  const hasGroq = Boolean(process.env.GROQ_API_KEY);

  if (hasGemini) {
    console.log(`🤖  AI Provider configured: Google Gemini (${process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'})`);
  } else if (hasOpenAi) {
    console.log(`🤖  AI Provider configured: OpenAI (${process.env.OPENAI_MODEL || 'gpt-4o-mini'})`);
  } else if (hasGroq) {
    console.log(`🤖  AI Provider configured: Groq (${process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'})`);
  } else {
    console.log(`⚠️   AI Provider notice: No API key detected. Set GEMINI_API_KEY or OPENAI_API_KEY in server/.env.`);
  }
}

/** Read an env var with an optional default. */
export function env(key, fallback) {
  const value = process.env[key];
  if (value !== undefined) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Environment variable ${key} is not set and has no default.`);
}
