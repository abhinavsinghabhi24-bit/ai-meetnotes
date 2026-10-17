import { Router } from 'express';
import { validateAnalyzeInput } from '../services/aiValidator.js';
import { analyzeMeeting } from '../services/aiService.js';
import { AiError } from '../services/aiErrors.js';

const router = Router();

/**
 * POST /api/analyze
 * Analyzes meeting transcript using configured LLM provider.
 *
 * Request Body:
 * {
 *   "title": string (1 - 200 chars),
 *   "transcript": string (20 - 50,000 chars)
 * }
 *
 * Success Response (200):
 * {
 *   "status": "success",
 *   "data": {
 *     "provider": "gemini" | "openai" | "groq",
 *     "model": "...",
 *     "summary": "...",
 *     "keyDiscussionPoints": ["..."],
 *     "actionItems": [
 *       { "task": "...", "owner": string | null, "deadline": string | null }
 *     ]
 *   }
 * }
 */
router.post(['/analyze', '/meetings/analyze'], async (req, res) => {
  // 1. Input validation & size limits
  const validation = validateAnalyzeInput(req.body);
  if (!validation.valid) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: 'Invalid meeting input',
      errors: validation.errors,
    });
  }

  // 2. Execute AI analysis with robust error handling
  try {
    const result = await analyzeMeeting(validation.sanitized);

    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (err) {
    if (err instanceof AiError) {
      return res.status(err.status).json({
        status: 'error',
        code: err.code,
        message: err.message,
      });
    }

    // Unhandled / unexpected errors: sanitize and do not leak details
    console.error('Unhandled AI analysis error:', err.message);
    return res.status(500).json({
      status: 'error',
      code: 'SERVER_ERROR',
      message: 'An unexpected error occurred while analyzing the meeting. Please try again.',
    });
  }
});

export default router;
