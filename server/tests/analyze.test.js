import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateAnalyzeInput,
  extractJsonFromText,
  validateAndNormalizeAiOutput,
} from '../src/services/aiValidator.js';
import { getActiveProviderConfig } from '../src/services/aiService.js';
import { AiConfigError, AiParseError } from '../src/services/aiErrors.js';

describe('POST /api/analyze Input Validation', () => {
  it('accepts valid meeting title and transcript', () => {
    const input = {
      title: 'Sprint Planning Q4',
      transcript: 'Alice: Let us discuss the sprint goals for the upcoming quarter. Bob: I will take the frontend tasks.',
    };
    const res = validateAnalyzeInput(input);
    assert.equal(res.valid, true);
    assert.equal(res.sanitized.title, 'Sprint Planning Q4');
    assert.equal(res.sanitized.transcript, input.transcript);
  });

  it('rejects missing or empty title', () => {
    const resEmpty = validateAnalyzeInput({ title: '   ', transcript: 'Valid transcript exceeding minimum characters' });
    assert.equal(resEmpty.valid, false);
    assert.ok(resEmpty.errors.title);

    const resMissing = validateAnalyzeInput({ transcript: 'Valid transcript exceeding minimum characters' });
    assert.equal(resMissing.valid, false);
    assert.ok(resMissing.errors.title);
  });

  it('rejects title longer than 200 characters', () => {
    const longTitle = 'A'.repeat(201);
    const res = validateAnalyzeInput({ title: longTitle, transcript: 'Valid transcript exceeding minimum characters' });
    assert.equal(res.valid, false);
    assert.ok(res.errors.title);
  });

  it('rejects transcript shorter than 20 characters', () => {
    const res = validateAnalyzeInput({ title: 'Valid Title', transcript: 'Too short' });
    assert.equal(res.valid, false);
    assert.ok(res.errors.transcript);
  });

  it('rejects transcript exceeding 50,000 characters', () => {
    const longTranscript = 'A'.repeat(50001);
    const res = validateAnalyzeInput({ title: 'Valid Title', transcript: longTranscript });
    assert.equal(res.valid, false);
    assert.ok(res.errors.transcript);
  });

  it('rejects non-object or null request body', () => {
    assert.equal(validateAnalyzeInput(null).valid, false);
    assert.equal(validateAnalyzeInput('invalid string').valid, false);
  });
});

describe('AI JSON Extraction & Parsing', () => {
  it('extracts raw JSON string directly', () => {
    const raw = '{"summary": "Test meeting summary", "keyDiscussionPoints": ["Point 1"], "actionItems": []}';
    const parsed = extractJsonFromText(raw);
    assert.equal(parsed.summary, 'Test meeting summary');
  });

  it('extracts JSON enclosed within markdown code blocks', () => {
    const raw = '```json\n{"summary": "Markdown fenced", "keyDiscussionPoints": ["Point A"], "actionItems": []}\n```';
    const parsed = extractJsonFromText(raw);
    assert.equal(parsed.summary, 'Markdown fenced');
  });

  it('extracts JSON surrounded by extraneous text', () => {
    const raw = 'Here is the meeting analysis:\n{"summary": "Embedded JSON", "keyDiscussionPoints": ["Point X"], "actionItems": []}\nHope this helps!';
    const parsed = extractJsonFromText(raw);
    assert.equal(parsed.summary, 'Embedded JSON');
  });

  it('throws AiParseError on invalid JSON text', () => {
    assert.throws(
      () => extractJsonFromText('This is not JSON at all.'),
      AiParseError
    );
  });
});

describe('AI Output Schema Normalization & Strict Zero-Hallucination', () => {
  it('validates and preserves properly structured AI output', () => {
    const raw = {
      summary: 'Executive overview of project milestones.',
      keyDiscussionPoints: ['Reviewed architecture', 'Agreed on database schema'],
      actionItems: [
        { task: 'Set up SQLite', owner: 'Carol', deadline: '2026-10-15' },
      ],
    };
    const validated = validateAndNormalizeAiOutput(raw);
    assert.equal(validated.summary, 'Executive overview of project milestones.');
    assert.equal(validated.keyDiscussionPoints.length, 2);
    assert.equal(validated.actionItems.length, 1);
    assert.equal(validated.actionItems[0].owner, 'Carol');
    assert.equal(validated.actionItems[0].deadline, '2026-10-15');
  });

  it('normalizes unstated owners and deadlines to null (zero hallucination)', () => {
    const raw = {
      summary: 'Team sync regarding sprint goals.',
      keyDiscussionPoints: ['Reviewed tasks'],
      actionItems: [
        { task: 'Update docs', owner: 'unassigned', deadline: 'TBD' },
        { task: 'Deploy staging', owner: 'none', deadline: 'N/A' },
        { task: 'Refactor auth', owner: null, deadline: null },
      ],
    };
    const validated = validateAndNormalizeAiOutput(raw);
    assert.equal(validated.actionItems[0].owner, null);
    assert.equal(validated.actionItems[0].deadline, null);
    assert.equal(validated.actionItems[1].owner, null);
    assert.equal(validated.actionItems[1].deadline, null);
    assert.equal(validated.actionItems[2].owner, null);
    assert.equal(validated.actionItems[2].deadline, null);
  });

  it('normalizes common field aliases (key_discussion_points, action_items)', () => {
    const raw = {
      summary: 'Meeting summary.',
      key_discussion_points: ['Discussion point 1'],
      action_items: [
        { action: 'Clean up test files', assignee: 'Alice', due_date: 'Friday' },
      ],
    };
    const validated = validateAndNormalizeAiOutput(raw);
    assert.deepEqual(validated.keyDiscussionPoints, ['Discussion point 1']);
    assert.equal(validated.actionItems[0].task, 'Clean up test files');
    assert.equal(validated.actionItems[0].owner, 'Alice');
    assert.equal(validated.actionItems[0].deadline, 'Friday');
  });

  it('throws AiParseError when summary is missing', () => {
    const raw = {
      keyDiscussionPoints: ['Point 1'],
      actionItems: [],
    };
    assert.throws(() => validateAndNormalizeAiOutput(raw), AiParseError);
  });
});

describe('AI Provider Configuration', () => {
  it('throws AiConfigError when no API keys are configured', () => {
    const originalEnv = { ...process.env };
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.AI_PROVIDER;

    assert.throws(() => getActiveProviderConfig(), AiConfigError);

    // Restore env
    Object.assign(process.env, originalEnv);
  });
});
