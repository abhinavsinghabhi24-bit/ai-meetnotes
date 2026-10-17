import { AiParseError } from './aiErrors.js';

// Words that indicate an unassigned owner or deadline
const UNASSIGNED_PATTERNS = /^(none|n\/a|null|undefined|tbd|unknown|unassigned|nil|not specified|not mentioned)$/i;

/**
 * Normalizes values that represent missing/unassigned fields to strict null.
 */
function normalizeOptionalField(val) {
  if (val === null || val === undefined) return null;
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed || UNASSIGNED_PATTERNS.test(trimmed)) {
    return null;
  }
  return trimmed;
}

/**
 * Cleans raw string output from an LLM and extracts the JSON object.
 * Handles markdown code fences (```json ... ```) and leading/trailing chatter.
 */
export function extractJsonFromText(rawText) {
  if (typeof rawText !== 'string' || !rawText.trim()) {
    throw new AiParseError('Model returned empty response text');
  }

  let text = rawText.trim();

  // Strip markdown code fences if present
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    text = codeBlockMatch[1].trim();
  } else {
    // If no code block, look for outermost curly braces
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      text = text.substring(firstBrace, lastBrace + 1).trim();
    }
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    throw new AiParseError(`Failed to parse AI response as JSON: ${err.message}`);
  }
}

/**
 * Validates and normalizes structured AI response against the required schema:
 * {
 *   summary: string,
 *   keyDiscussionPoints: string[],
 *   actionItems: Array<{ task: string, owner: string | null, deadline: string | null }>
 * }
 */
export function validateAndNormalizeAiOutput(raw) {
  const data = typeof raw === 'string' ? extractJsonFromText(raw) : raw;

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new AiParseError('AI response must be a JSON object');
  }

  // 1. Summary validation
  const summaryRaw = data.summary || data.executive_summary || data.overview;
  if (!summaryRaw || typeof summaryRaw !== 'string' || summaryRaw.trim().length === 0) {
    throw new AiParseError('AI response missing valid "summary" field');
  }
  const summary = summaryRaw.trim();

  // 2. Key discussion points validation (with defensive aliasing)
  const rawPoints = data.keyDiscussionPoints || data.key_discussion_points || data.discussionPoints || data.discussion_points || [];
  if (!Array.isArray(rawPoints)) {
    throw new AiParseError('AI response "keyDiscussionPoints" must be an array');
  }

  const keyDiscussionPoints = rawPoints
    .map((pt) => {
      if (typeof pt === 'string') return pt.trim();
      if (pt && typeof pt === 'object' && pt.point) return String(pt.point).trim();
      if (pt && typeof pt === 'object' && pt.topic) return String(pt.topic).trim();
      return '';
    })
    .filter((pt) => pt.length > 0);

  // 3. Action items validation (with defensive aliasing)
  const rawActions = data.actionItems || data.action_items || data.actions || [];
  if (!Array.isArray(rawActions)) {
    throw new AiParseError('AI response "actionItems" must be an array');
  }

  const actionItems = rawActions
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const taskRaw = item.task || item.description || item.action || item.item;
      if (!taskRaw || typeof taskRaw !== 'string' || !taskRaw.trim()) {
        return null; // Skip malformed action item rows without a task
      }

      const ownerRaw = item.owner ?? item.assignee ?? item.responsible ?? null;
      const deadlineRaw = item.deadline ?? item.due_date ?? item.dueDate ?? item.date ?? null;

      return {
        task: taskRaw.trim(),
        owner: normalizeOptionalField(ownerRaw),
        deadline: normalizeOptionalField(deadlineRaw),
      };
    })
    .filter(Boolean);

  return {
    summary,
    keyDiscussionPoints,
    actionItems,
  };
}

/**
 * Validates user input before sending to the LLM.
 * Imposes reasonable input size limits.
 */
export function validateAnalyzeInput(body) {
  const errors = {};

  if (!body || typeof body !== 'object') {
    return {
      valid: false,
      errors: { _body: 'Request body must be a valid JSON object' },
    };
  }

  const { title, transcript } = body;

  // Title validation
  if (title === undefined || title === null || typeof title !== 'string') {
    errors.title = 'Meeting title is required';
  } else {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) {
      errors.title = 'Meeting title cannot be empty';
    } else if (trimmedTitle.length > 200) {
      errors.title = 'Meeting title cannot exceed 200 characters';
    }
  }

  // Transcript validation
  if (transcript === undefined || transcript === null || typeof transcript !== 'string') {
    errors.transcript = 'Meeting transcript is required';
  } else {
    const trimmedTranscript = transcript.trim();
    if (trimmedTranscript.length === 0) {
      errors.transcript = 'Meeting transcript cannot be empty';
    } else if (trimmedTranscript.length < 20) {
      errors.transcript = 'Meeting transcript is too short (minimum 20 characters required)';
    } else if (trimmedTranscript.length > 50000) {
      errors.transcript = 'Meeting transcript exceeds maximum allowed limit (50,000 characters)';
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    sanitized: {
      title: title.trim(),
      transcript: transcript.trim(),
    },
  };
}
