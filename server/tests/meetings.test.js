import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  saveMeeting,
  getMeetingById,
  listMeetings,
  deleteMeeting,
} from '../src/db/meetingsRepo.js';
import { closeDb, getDb } from '../src/db/index.js';

describe('Phase 4: SQLite Meeting Persistence & Search', () => {
  let createdMeetingId = null;

  before(async () => {
    // Ensure DB is initialized
    await getDb();
  });

  after(() => {
    // Clean up connections
    closeDb();
  });

  it('1. saves a new analyzed meeting with structured points and action items', async () => {
    const meetingPayload = {
      title: 'Q4 Architecture Review - Test',
      transcript: 'Alice: We need to finalize the SQLite schema and indexing strategy. Bob: I will test queries by Friday.',
      summary: 'The team reviewed the database schema and confirmed the indexing plan.',
      keyDiscussionPoints: [
        'Agreed on parameterized queries for security',
        'Implemented full-text search indexing on meetings',
      ],
      actionItems: [
        { task: 'Implement parameterized SQL queries', owner: 'Alice', deadline: '2026-10-16' },
        { task: 'Benchmarking search latency', owner: 'Bob', deadline: 'Friday' },
        { task: 'Update API docs', owner: null, deadline: null },
      ],
      provider: 'gemini',
      model: 'gemini-1.5-flash',
    };

    const saved = await saveMeeting(meetingPayload);
    assert.ok(saved);
    assert.ok(saved.id > 0);
    createdMeetingId = saved.id;

    assert.equal(saved.title, meetingPayload.title);
    assert.equal(saved.summary, meetingPayload.summary);
    assert.equal(saved.transcript, meetingPayload.transcript);
    assert.equal(saved.provider, 'gemini');
    assert.equal(saved.model, 'gemini-1.5-flash');
    assert.equal(saved.keyDiscussionPoints.length, 2);
    assert.equal(saved.actionItems.length, 3);
    assert.equal(saved.actionItemCount, 3);
    assert.equal(saved.actionItems[0].owner, 'Alice');
    assert.equal(saved.actionItems[2].owner, null); // null unassigned owner preserved
    assert.ok(saved.createdAt);
    assert.ok(saved.updatedAt);
  });

  it('2. retrieves a saved meeting by ID', async () => {
    assert.ok(createdMeetingId);
    const retrieved = await getMeetingById(createdMeetingId);

    assert.ok(retrieved);
    assert.equal(retrieved.id, createdMeetingId);
    assert.equal(retrieved.title, 'Q4 Architecture Review - Test');
    assert.equal(retrieved.actionItems.length, 3);
  });

  it('3. returns null for non-existent meeting IDs', async () => {
    const notFound = await getMeetingById(999999);
    assert.equal(notFound, null);

    const invalidId = await getMeetingById('abc');
    assert.equal(invalidId, null);
  });

  it('4. prevents duplicate records from repeated submissions', async () => {
    // Submit identical title and transcript
    const duplicateSubmission = {
      title: 'Q4 Architecture Review - Test',
      transcript: 'Alice: We need to finalize the SQLite schema and indexing strategy. Bob: I will test queries by Friday.',
      summary: 'Updated summary after re-analysis.',
      keyDiscussionPoints: ['Updated discussion point'],
      actionItems: [{ task: 'Single updated task', owner: 'Alice', deadline: 'Monday' }],
    };

    const updated = await saveMeeting(duplicateSubmission);
    assert.equal(updated.id, createdMeetingId); // Same ID, not a duplicate!
    assert.equal(updated.summary, 'Updated summary after re-analysis.');
    assert.equal(updated.actionItems.length, 1);
  });

  it('5. searches meetings by title keyword', async () => {
    const res = await listMeetings({ query: 'Architecture Review' });
    assert.ok(res.meetings.length >= 1);
    const match = res.meetings.find((m) => m.id === createdMeetingId);
    assert.ok(match, 'Meeting should be found by title search');
  });

  it('6. searches meetings by summary keyword', async () => {
    const res = await listMeetings({ query: 're-analysis' });
    assert.ok(res.meetings.length >= 1);
    const match = res.meetings.find((m) => m.id === createdMeetingId);
    assert.ok(match, 'Meeting should be found by summary search');
  });

  it('7. searches meetings by transcript keyword', async () => {
    const res = await listMeetings({ query: 'indexing strategy' });
    assert.ok(res.meetings.length >= 1);
    const match = res.meetings.find((m) => m.id === createdMeetingId);
    assert.ok(match, 'Meeting should be found by transcript search');
  });

  it('8. handles empty search queries and returns all records with pagination', async () => {
    const res = await listMeetings({ query: '', limit: 10, offset: 0 });
    assert.ok(res.meetings.length >= 1);
    assert.ok(res.total >= 1);
    assert.equal(res.limit, 10);
    assert.equal(res.offset, 0);
  });

  it('9. returns zero matches for non-existent search keywords', async () => {
    const res = await listMeetings({ query: 'ZzzzNonExistentKeyword987654' });
    assert.equal(res.meetings.length, 0);
    assert.equal(res.total, 0);
  });

  it('10. deletes a meeting by ID', async () => {
    assert.ok(createdMeetingId);
    const deleted = await deleteMeeting(createdMeetingId);
    assert.equal(deleted, true);

    const check = await getMeetingById(createdMeetingId);
    assert.equal(check, null);
  });

  it('11. safely handles omitted/undefined optional fields on save and update without SQL binding error', async () => {
    // Save without provider, model, summary
    const saved = await saveMeeting({
      title: 'Minimal Meeting',
      transcript: 'Bob: Quick standup today. Alice: All good on my end.',
    });
    assert.ok(saved.id > 0);
    assert.equal(saved.provider, null);
    assert.equal(saved.model, null);
    assert.equal(saved.summary, null);

    // Update with partial fields
    const updated = await saveMeeting({
      id: saved.id,
      title: 'Minimal Meeting Updated',
      transcript: 'Bob: Quick standup today. Alice: All good on my end.',
      summary: 'Updated summary.',
    });
    assert.equal(updated.id, saved.id);
    assert.equal(updated.title, 'Minimal Meeting Updated');
    assert.equal(updated.summary, 'Updated summary.');
    assert.equal(updated.provider, null);

    // Clean up
    await deleteMeeting(saved.id);
  });
});

