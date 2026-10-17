import http from 'http';

async function runFullFlowVerification() {
  console.log('=== FULL FLOW END-TO-END VERIFICATION ===\n');

  // Step 1: Start temporary mock LLM server to test AI analysis + save
  const mockLLM = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const mockAiOutput = {
        choices: [{
          message: {
            content: JSON.stringify({
              summary: 'The product team agreed on the Q4 roadmap, mobile performance optimization, and SQLite local storage.',
              keyDiscussionPoints: [
                'Finalized mobile performance targets under 1.5 seconds',
                'Approved SQLite database schema with full-text search',
                'Scheduled staging deployment for next Tuesday'
              ],
              actionItems: [
                { task: 'Optimize bundle size for mobile viewports', owner: 'Alice', deadline: '2026-10-20' },
                { task: 'Implement parameterized SQL queries', owner: 'Bob', deadline: 'Friday' },
                { task: 'Write user documentation', owner: null, deadline: null }
              ]
            })
          }
        }]
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mockAiOutput));
    });
  });

  await new Promise(resolve => mockLLM.listen(4001, resolve));
  console.log('Step 1: Mock LLM service running on port 4001');

  // Configure environment for analysis
  process.env.OPENAI_API_KEY = 'test-flow-key';
  process.env.OPENAI_BASE_URL = 'http://localhost:4001';
  process.env.AI_PROVIDER = 'openai';

  const meetingTitle = 'Q4 Roadmap & Mobile Performance Sync';
  const meetingTranscript = 'Alice: Welcome everyone. We must reduce initial load time on mobile devices to under 1.5s. Bob: Agreed, I will benchmark the SQLite queries by Friday. Alice: I will optimize the client bundle by October 20th. Carol: Someone should write docs.';

  // Step 2: Analyze meeting (Simulates clicking 'Analyze Meeting' in UI)
  const { analyzeMeeting } = await import('../src/services/aiService.js');
  const analysisResult = await analyzeMeeting({
    title: meetingTitle,
    transcript: meetingTranscript
  });
  console.log('\nStep 2: Analyzed with AI:');
  console.log(' - Summary:', analysisResult.summary);
  console.log(' - Points count:', analysisResult.keyDiscussionPoints.length);
  console.log(' - Action items count:', analysisResult.actionItems.length);

  // Step 3: Save results (Simulates clicking 'Save Meeting to History' in UI)
  const saveRes = await fetch('http://localhost:3001/api/meetings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: meetingTitle,
      transcript: meetingTranscript,
      summary: analysisResult.summary,
      keyDiscussionPoints: analysisResult.keyDiscussionPoints,
      actionItems: analysisResult.actionItems,
      provider: analysisResult.provider,
      model: analysisResult.model
    })
  });
  const savedData = await saveRes.json();
  const savedId = savedData.data?.id;
  console.log('\nStep 3: Saved to SQLite database:');
  console.log(' - HTTP Status:', saveRes.status);
  console.log(' - Saved Meeting ID:', savedId);

  // Step 4: Simulate page refresh / opening Meeting History (GET /api/meetings)
  const historyRes = await fetch('http://localhost:3001/api/meetings');
  const historyData = await historyRes.json();
  console.log('\nStep 4: Page Refresh -> Loaded Meeting History:');
  console.log(' - Total stored meetings:', historyData.data?.total);
  const foundInHistory = historyData.data?.meetings?.some(m => m.id === savedId);
  console.log(' - Saved meeting visible in history:', foundInHistory ? 'PASS' : 'FAIL');

  // Step 5: Search the meeting by keyword in transcript / title (GET /api/meetings?q=Mobile+Performance)
  const searchRes = await fetch('http://localhost:3001/api/meetings?q=' + encodeURIComponent('Mobile Performance'));
  const searchData = await searchRes.json();
  console.log('\nStep 5: Searched for "Mobile Performance":');
  console.log(' - Matching meetings count:', searchData.data?.meetings?.length);
  console.log(' - Search match ID:', searchData.data?.meetings?.[0]?.id === savedId ? 'PASS' : 'FAIL');

  // Step 6: Open the saved meeting again (GET /api/meetings/:id)
  const detailRes = await fetch('http://localhost:3001/api/meetings/' + savedId);
  const detailData = await detailRes.json();
  const opened = detailData.data;
  console.log('\nStep 6: Opened Saved Meeting Details (# ' + savedId + '):');
  console.log(' - Title:', opened.title);
  console.log(' - Summary:', opened.summary);
  console.log(' - Discussion Points:', opened.keyDiscussionPoints);
  console.log(' - Action Items:', opened.actionItems);

  // Step 7: Verification assertions
  console.log('\nStep 7: Verifying Stored Data Integrity:');
  const titleMatches = opened.title === meetingTitle;
  const summaryMatches = opened.summary === analysisResult.summary;
  const pointsMatch = opened.keyDiscussionPoints.length === 3;
  const action1Matches = opened.actionItems[0].owner === 'Alice' && opened.actionItems[0].deadline === '2026-10-20';
  const action3PreservedNull = opened.actionItems[2].owner === null && opened.actionItems[2].deadline === null;

  console.log(' - Title intact:', titleMatches ? 'PASS' : 'FAIL');
  console.log(' - Summary intact:', summaryMatches ? 'PASS' : 'FAIL');
  console.log(' - Discussion points intact (3 items):', pointsMatch ? 'PASS' : 'FAIL');
  console.log(' - Action item 1 (Alice, 2026-10-20):', action1Matches ? 'PASS' : 'FAIL');
  console.log(' - Action item 3 (Null unassigned owner/deadline preserved):', action3PreservedNull ? 'PASS' : 'FAIL');

  // Clean up
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_BASE_URL;
  delete process.env.AI_PROVIDER;
  mockLLM.close();

  if (titleMatches && summaryMatches && pointsMatch && action1Matches && action3PreservedNull) {
    console.log('\n>>> FULL WORKFLOW VERIFIED 100% SUCCESSFULLY! <<<');
    process.exit(0);
  } else {
    console.error('\n>>> VERIFICATION FAILED! <<<');
    process.exit(1);
  }
}

runFullFlowVerification();
