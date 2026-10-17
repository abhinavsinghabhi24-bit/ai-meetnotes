import { getDb, closeDb } from '../src/db/index.js';
import { saveMeeting, getMeetingById } from '../src/db/meetingsRepo.js';

async function testPersistenceAcrossRestart() {
  console.log('=== TESTING DB PERSISTENCE ACROSS RESTART ===');

  // Step 1: Initialize DB and save a meeting
  const testTitle = 'Persistence Test Meeting ' + Date.now();
  const testTranscript = 'Alice: This tests that the SQLite database preserves data when the process closes and restarts.';
  
  const saved = await saveMeeting({
    title: testTitle,
    transcript: testTranscript,
    summary: 'Testing persistence across simulated server reboot.',
    keyDiscussionPoints: ['Process shutdown', 'File re-read'],
    actionItems: [{ task: 'Verify record', owner: 'Alice', deadline: 'Today' }],
  });

  const savedId = saved.id;
  console.log('Step 1: Saved meeting with ID:', savedId);

  // Step 2: Simulate process shutdown
  console.log('Step 2: Simulating process shutdown (calling closeDb)...');
  closeDb();

  // Step 3: Re-open DB from disk file (simulate server restart)
  console.log('Step 3: Re-opening DB from disk file (simulating server restart)...');
  const freshDb = await getDb();
  console.log('Database successfully initialized from disk.');

  // Step 4: Retrieve the meeting
  const retrieved = await getMeetingById(savedId);

  if (!retrieved) {
    console.error('FAIL: Meeting was not found after database restart!');
    process.exit(1);
  }

  console.log('Step 4: Retrieved meeting from disk:', retrieved.title);
  console.log('Action items preserved count:', retrieved.actionItems.length);
  console.log('Action item 1 owner:', retrieved.actionItems[0].owner);

  if (retrieved.title === testTitle && retrieved.actionItems[0].owner === 'Alice') {
    console.log('\n>>> PERSISTENCE TEST PASSED: All data preserved across restart! <<<');
    closeDb();
    process.exit(0);
  } else {
    console.error('FAIL: Retrieved data does not match saved data!');
    closeDb();
    process.exit(1);
  }
}

testPersistenceAcrossRestart();
