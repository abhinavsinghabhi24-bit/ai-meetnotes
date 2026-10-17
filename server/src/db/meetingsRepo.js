import { getDb, saveDb } from './index.js';

/**
 * Safely parse JSON string with fallback.
 */
function safeJsonParse(str, fallback = []) {
  if (!str || typeof str !== 'string') return fallback;
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Maps database row to clean public meeting object.
 * Deserializes JSON arrays and sanitizes internal details.
 */
function mapRowToMeeting(row) {
  if (!row) return null;

  const keyDiscussionPoints = safeJsonParse(row.key_discussion_points, []);
  const actionItems = safeJsonParse(row.action_items, []);

  return {
    id: row.id,
    title: row.title,
    date: row.date,
    duration: row.duration || null,
    summary: row.summary || null,
    transcript: row.transcript || '',
    keyDiscussionPoints,
    actionItems,
    actionItemCount: actionItems.length,
    provider: row.provider || null,
    model: row.model || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Creates or updates a meeting in SQLite using safe parameterized queries.
 * Prevents accidental duplicate records from repeated submissions.
 */
export async function saveMeeting({
  id = null,
  title,
  transcript,
  summary,
  keyDiscussionPoints,
  actionItems,
  provider,
  model,
}) {
  const db = await getDb();

  const cleanTitle = (title || '').trim();
  const cleanTranscript = (transcript || '').trim();
  const cleanSummary = summary ? summary.trim() : null;
  const safeProvider = provider !== undefined && provider !== null ? String(provider) : null;
  const safeModel = model !== undefined && model !== null ? String(model) : null;
  let targetId = id ? Number(id) : null;

  // 1. If explicit ID provided, verify it exists
  if (targetId) {
    const checkStmt = db.prepare('SELECT id FROM meetings WHERE id = ?');
    checkStmt.bind([targetId]);
    const exists = checkStmt.step();
    checkStmt.free();
    if (!exists) {
      targetId = null; // Fall through to duplicate check or insert
    }
  }

  // 2. Duplicate Prevention: Check for recent matching title + transcript
  if (!targetId) {
    const dupStmt = db.prepare(
      'SELECT id FROM meetings WHERE title = ? AND transcript = ? ORDER BY id DESC LIMIT 1'
    );
    dupStmt.bind([cleanTitle, cleanTranscript]);
    if (dupStmt.step()) {
      targetId = dupStmt.getAsObject().id;
    }
    dupStmt.free();
  }

  // 3. If updating existing record, preserve any fields not provided in payload
  if (targetId) {
    const existingStmt = db.prepare('SELECT * FROM meetings WHERE id = ?');
    existingStmt.bind([targetId]);
    let existing = null;
    if (existingStmt.step()) {
      existing = existingStmt.getAsObject();
    }
    existingStmt.free();

    const finalSummary = summary !== undefined ? (summary ? summary.trim() : null) : (existing?.summary ?? null);
    const finalPoints = keyDiscussionPoints !== undefined
      ? JSON.stringify(Array.isArray(keyDiscussionPoints) ? keyDiscussionPoints : [])
      : (existing?.key_discussion_points || '[]');
    const finalActions = actionItems !== undefined
      ? JSON.stringify(Array.isArray(actionItems) ? actionItems : [])
      : (existing?.action_items || '[]');
    const finalProvider = provider !== undefined ? safeProvider : (existing?.provider ?? null);
    const finalModel = model !== undefined ? safeModel : (existing?.model ?? null);

    db.run(
      `UPDATE meetings 
       SET title = ?, summary = ?, transcript = ?, key_discussion_points = ?, action_items = ?, provider = ?, model = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [cleanTitle, finalSummary, cleanTranscript, finalPoints, finalActions, finalProvider, finalModel, targetId]
    );
  } else {
    const jsonPoints = JSON.stringify(Array.isArray(keyDiscussionPoints) ? keyDiscussionPoints : []);
    const jsonActions = JSON.stringify(Array.isArray(actionItems) ? actionItems : []);

    db.run(
      `INSERT INTO meetings (title, date, summary, transcript, key_discussion_points, action_items, provider, model, created_at, updated_at)
       VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [cleanTitle, cleanSummary, cleanTranscript, jsonPoints, jsonActions, safeProvider, safeModel]
    );

    const idRes = db.exec('SELECT last_insert_rowid() AS id');
    targetId = idRes[0]?.values[0]?.[0];
  }

  // Persist SQLite changes to disk
  saveDb();

  // Return the saved record
  return getMeetingById(targetId);
}

/**
 * Retrieves a single meeting by its ID using parameterized query.
 */
export async function getMeetingById(id) {
  const db = await getDb();
  const numId = Number(id);

  if (!Number.isInteger(numId) || numId <= 0) {
    return null;
  }

  const stmt = db.prepare(
    `SELECT id, title, date, duration, summary, transcript, key_discussion_points, action_items, provider, model, created_at, updated_at
     FROM meetings
     WHERE id = ?`
  );
  stmt.bind([numId]);

  let meeting = null;
  if (stmt.step()) {
    meeting = mapRowToMeeting(stmt.getAsObject());
  }
  stmt.free();

  return meeting;
}

/**
 * Lists meetings with search across title, transcript, and summary.
 * Imposes pagination limits to prevent excessive payloads.
 */
export async function listMeetings({ query = '', limit = 20, offset = 0 } = {}) {
  const db = await getDb();

  // Enforce sensible bounds on limit and offset
  const safeLimit = Math.min(Math.max(1, Number(limit) || 20), 100);
  const safeOffset = Math.max(0, Number(offset) || 0);
  const cleanQuery = (query || '').trim();

  let meetings = [];
  let total = 0;

  if (cleanQuery) {
    const pattern = `%${cleanQuery}%`;

    // Count total matches
    const countStmt = db.prepare(
      `SELECT COUNT(*) AS total
       FROM meetings
       WHERE title LIKE ? OR summary LIKE ? OR transcript LIKE ?`
    );
    countStmt.bind([pattern, pattern, pattern]);
    if (countStmt.step()) {
      total = countStmt.getAsObject().total;
    }
    countStmt.free();

    // Fetch paginated matches
    const selectStmt = db.prepare(
      `SELECT id, title, date, duration, summary, transcript, key_discussion_points, action_items, provider, model, created_at, updated_at
       FROM meetings
       WHERE title LIKE ? OR summary LIKE ? OR transcript LIKE ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    );
    selectStmt.bind([pattern, pattern, pattern, safeLimit, safeOffset]);
    while (selectStmt.step()) {
      meetings.push(mapRowToMeeting(selectStmt.getAsObject()));
    }
    selectStmt.free();
  } else {
    // Count total rows
    const countStmt = db.prepare('SELECT COUNT(*) AS total FROM meetings');
    if (countStmt.step()) {
      total = countStmt.getAsObject().total;
    }
    countStmt.free();

    // Fetch paginated rows
    const selectStmt = db.prepare(
      `SELECT id, title, date, duration, summary, transcript, key_discussion_points, action_items, provider, model, created_at, updated_at
       FROM meetings
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    );
    selectStmt.bind([safeLimit, safeOffset]);
    while (selectStmt.step()) {
      meetings.push(mapRowToMeeting(selectStmt.getAsObject()));
    }
    selectStmt.free();
  }

  return {
    meetings,
    total,
    limit: safeLimit,
    offset: safeOffset,
    hasMore: safeOffset + meetings.length < total,
  };
}

/**
 * Deletes a meeting by ID using parameterized query.
 */
export async function deleteMeeting(id) {
  const db = await getDb();
  const numId = Number(id);

  if (!Number.isInteger(numId) || numId <= 0) {
    return false;
  }

  db.run('DELETE FROM meetings WHERE id = ?', [numId]);
  saveDb();
  return true;
}
