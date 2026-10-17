import { Router } from 'express';
import {
  saveMeeting,
  getMeetingById,
  listMeetings,
  deleteMeeting,
} from '../db/meetingsRepo.js';

const router = Router();

/**
 * GET /api/meetings
 * Lists meetings with optional search query and pagination.
 *
 * Query params:
 *   - q: search term (searches title, summary, transcript)
 *   - limit: integer (1-100, default 20)
 *   - offset: integer (default 0)
 */
router.get('/meetings', async (req, res) => {
  try {
    const { q, limit, offset } = req.query;
    const result = await listMeetings({ query: q, limit, offset });

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (err) {
    console.error('Database query error in GET /api/meetings:', err.message);
    res.status(500).json({
      status: 'error',
      code: 'DATABASE_ERROR',
      message: 'Failed to retrieve meeting list.',
    });
  }
});

/**
 * GET /api/meetings/:id
 * Retrieves a single meeting by its numerical ID.
 */
router.get('/meetings/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Invalid meeting ID provided.',
      });
    }

    const meeting = await getMeetingById(id);
    if (!meeting) {
      return res.status(404).json({
        status: 'error',
        code: 'NOT_FOUND',
        message: `Meeting with ID ${id} not found.`,
      });
    }

    res.status(200).json({
      status: 'success',
      data: meeting,
    });
  } catch (err) {
    console.error(`Database query error in GET /api/meetings/${req.params.id}:`, err.message);
    res.status(500).json({
      status: 'error',
      code: 'DATABASE_ERROR',
      message: 'Failed to retrieve meeting details.',
    });
  }
});

/**
 * POST /api/meetings
 * Saves or updates a meeting record in SQLite.
 * Prevents accidental duplicate records from repeated submissions.
 */
router.post('/meetings', async (req, res) => {
  try {
    const { id, title, transcript, summary, keyDiscussionPoints, actionItems, provider, model } = req.body || {};

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Meeting title is required to save.',
      });
    }

    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      return res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Meeting transcript is required to save.',
      });
    }

    const saved = await saveMeeting({
      id,
      title,
      transcript,
      summary,
      keyDiscussionPoints,
      actionItems,
      provider,
      model,
    });

    if (!saved) {
      return res.status(500).json({
        status: 'error',
        code: 'DATABASE_SAVE_FAILED',
        message: 'Failed to save meeting record to database.',
      });
    }

    res.status(201).json({
      status: 'success',
      data: saved,
    });
  } catch (err) {
    console.error('Database write error in POST /api/meetings:', err.message);
    res.status(500).json({
      status: 'error',
      code: 'DATABASE_ERROR',
      message: 'Database error occurred while saving meeting.',
    });
  }
});

/**
 * DELETE /api/meetings/:id
 * Deletes a meeting record by its numerical ID.
 */
router.delete('/meetings/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Invalid meeting ID provided.',
      });
    }

    const existing = await getMeetingById(id);
    if (!existing) {
      return res.status(404).json({
        status: 'error',
        code: 'NOT_FOUND',
        message: `Meeting with ID ${id} not found.`,
      });
    }

    await deleteMeeting(id);

    res.status(200).json({
      status: 'success',
      message: 'Meeting deleted successfully.',
      data: { id },
    });
  } catch (err) {
    console.error(`Database delete error in DELETE /api/meetings/${req.params.id}:`, err.message);
    res.status(500).json({
      status: 'error',
      code: 'DATABASE_ERROR',
      message: 'Failed to delete meeting record.',
    });
  }
});

export default router;
