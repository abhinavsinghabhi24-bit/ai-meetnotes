/**
 * Integration tests for Express API routes.
 * Tests /api/health, /api/analyze (validation only), and /api/meetings CRUD.
 * Does NOT call external AI providers — tests only the validation and DB layers.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { closeDb, getDb } from '../src/db/index.js';
import healthRouter from '../src/routes/health.js';
import analyzeRouter from '../src/routes/analyze.js';
import meetingsRouter from '../src/routes/meetings.js';

// ── Shared test Express app ──────────────────────────────────────────
let server;
let BASE_URL;

function createTestApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use('/api', healthRouter);
  app.use('/api', analyzeRouter);
  app.use('/api', meetingsRouter);
  return app;
}

async function request(method, path, body = null) {
  const url = new URL(path, BASE_URL);
  const options = {
    method,
    hostname: url.hostname,
    port: url.port,
    path: url.pathname + url.search,
    headers: { 'Content-Type': 'application/json' },
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ── Lifecycle ──────────────────────────────────────────────────────────
before(async () => {
  await getDb();
  const app = createTestApp();
  server = app.listen(0); // Bind to random available port
  const addr = server.address();
  BASE_URL = `http://127.0.0.1:${addr.port}`;
});

after(() => {
  if (server) server.close();
  closeDb();
});

// ════════════════════════════════════════════════════════════════════════
// GET /api/health
// ════════════════════════════════════════════════════════════════════════
describe('GET /api/health', () => {
  it('returns 200 with status ok and database connected', async () => {
    const res = await request('GET', '/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.database, 'connected');
    assert.ok(res.body.timestamp, 'should include ISO timestamp');
    assert.ok(typeof res.body.uptime === 'number', 'should include uptime');
  });
});

// ════════════════════════════════════════════════════════════════════════
// POST /api/analyze — Input validation only (no AI call needed)
// ════════════════════════════════════════════════════════════════════════
describe('POST /api/analyze — Input Validation', () => {
  it('rejects empty body with 400 and VALIDATION_ERROR code', async () => {
    const res = await request('POST', '/api/analyze', {});
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
    assert.ok(res.body.errors, 'should include field-level errors');
  });

  it('rejects missing title with 400', async () => {
    const res = await request('POST', '/api/analyze', {
      transcript: 'Alice: Let us discuss the sprint goals for the upcoming quarter.',
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.errors.title);
  });

  it('rejects transcript shorter than 20 chars', async () => {
    const res = await request('POST', '/api/analyze', {
      title: 'Valid Title',
      transcript: 'Too short',
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.errors.transcript);
  });

  it('rejects oversized title (>200 chars)', async () => {
    const res = await request('POST', '/api/analyze', {
      title: 'A'.repeat(201),
      transcript: 'Valid transcript text exceeding the twenty character limit.',
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.errors.title);
  });

  it('rejects oversized transcript (>50000 chars)', async () => {
    const res = await request('POST', '/api/analyze', {
      title: 'Valid Title',
      transcript: 'A'.repeat(50001),
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.errors.transcript);
  });

  it('does not leak stack traces or internal paths in error response', async () => {
    const res = await request('POST', '/api/analyze', {});
    const body = JSON.stringify(res.body);
    assert.ok(!body.includes('node_modules'), 'should not leak node_modules path');
    assert.ok(!body.includes('Error:'), 'should not leak raw Error constructor');
  });
});

// ════════════════════════════════════════════════════════════════════════
// POST / GET / DELETE /api/meetings — Full CRUD
// ════════════════════════════════════════════════════════════════════════
describe('POST /api/meetings — Save Meeting', () => {
  let savedId = null;

  it('saves a valid meeting and returns 201 with data', async () => {
    const res = await request('POST', '/api/meetings', {
      title: 'Route Test Meeting',
      transcript: 'Alice: We need to ship the feature by Friday. Bob: I will handle the deployment.',
      summary: 'Deployment plan for Friday.',
      keyDiscussionPoints: ['Feature ship date', 'Deployment owner'],
      actionItems: [
        { task: 'Handle deployment', owner: 'Bob', deadline: 'Friday' },
        { task: 'Write release notes', owner: null, deadline: null },
      ],
      provider: 'gemini',
      model: 'gemini-1.5-flash',
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'success');
    assert.ok(res.body.data.id > 0);
    savedId = res.body.data.id;
    assert.equal(res.body.data.title, 'Route Test Meeting');
    assert.equal(res.body.data.actionItems.length, 2);
    assert.equal(res.body.data.actionItems[1].owner, null);
  });

  it('rejects save with missing title', async () => {
    const res = await request('POST', '/api/meetings', {
      transcript: 'Some valid transcript content.',
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
  });

  it('rejects save with missing transcript', async () => {
    const res = await request('POST', '/api/meetings', {
      title: 'Missing Transcript Meeting',
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
  });

  it('retrieves the saved meeting by ID via GET', async () => {
    assert.ok(savedId);
    const res = await request('GET', `/api/meetings/${savedId}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, savedId);
    assert.equal(res.body.data.title, 'Route Test Meeting');
    assert.equal(res.body.data.keyDiscussionPoints.length, 2);
  });

  it('returns 404 for non-existent meeting ID', async () => {
    const res = await request('GET', '/api/meetings/999999');
    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'NOT_FOUND');
  });

  it('returns 400 for invalid meeting ID format', async () => {
    const res = await request('GET', '/api/meetings/abc');
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
  });

  it('lists meetings with search query', async () => {
    const res = await request('GET', '/api/meetings?q=Route+Test');
    assert.equal(res.status, 200);
    assert.ok(res.body.data.meetings.length >= 1);
    const match = res.body.data.meetings.find((m) => m.id === savedId);
    assert.ok(match);
  });

  it('lists all meetings with pagination', async () => {
    const res = await request('GET', '/api/meetings?limit=5&offset=0');
    assert.equal(res.status, 200);
    assert.ok(res.body.data.total >= 1);
    assert.equal(res.body.data.limit, 5);
    assert.equal(res.body.data.offset, 0);
  });

  it('prevents duplicate records when title+transcript match', async () => {
    const res = await request('POST', '/api/meetings', {
      title: 'Route Test Meeting',
      transcript: 'Alice: We need to ship the feature by Friday. Bob: I will handle the deployment.',
      summary: 'Updated summary after re-save.',
      keyDiscussionPoints: ['Updated point'],
      actionItems: [],
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.id, savedId, 'should return same ID (upsert, not duplicate)');
    assert.equal(res.body.data.summary, 'Updated summary after re-save.');
  });

  it('deletes the meeting and returns success', async () => {
    assert.ok(savedId);
    const res = await request('DELETE', `/api/meetings/${savedId}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'success');

    const check = await request('GET', `/api/meetings/${savedId}`);
    assert.equal(check.status, 404);
  });

  it('returns 404 when deleting non-existent meeting', async () => {
    const res = await request('DELETE', '/api/meetings/999999');
    assert.equal(res.status, 404);
  });

  it('returns 400 when deleting with invalid ID', async () => {
    const res = await request('DELETE', '/api/meetings/abc');
    assert.equal(res.status, 400);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Error response sanitization checks
// ════════════════════════════════════════════════════════════════════════
describe('Error Response Safety', () => {
  it('never exposes database file paths in error responses', async () => {
    const endpoints = [
      { method: 'GET', path: '/api/meetings/999999' },
      { method: 'POST', path: '/api/analyze', body: {} },
      { method: 'DELETE', path: '/api/meetings/abc' },
    ];

    for (const ep of endpoints) {
      const res = await request(ep.method, ep.path, ep.body || null);
      const text = JSON.stringify(res.body);
      assert.ok(!text.includes('meetnotes.db'), `${ep.method} ${ep.path} should not expose db path`);
      assert.ok(!text.includes('.env'), `${ep.method} ${ep.path} should not expose env path`);
    }
  });
});
