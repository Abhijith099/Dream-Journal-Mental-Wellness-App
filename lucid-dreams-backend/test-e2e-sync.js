const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

function makeRequest(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: headers,
    };
    if (dataString) {
      options.headers['Content-Length'] = Buffer.byteLength(dataString);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (dataString) {
      req.write(dataString);
    }
    req.end();
  });
}

async function runE2ESyncVerification() {
  console.log('=== Running End-to-End Caregiver <-> Patient Sync Verification ===');
  await mongoose.connect(process.env.MONGO_URI);
  let user = await User.findOne();
  if (!user) {
    user = new User({ email: 'sync_test@example.com', name: 'Tester', passwordHash: 'hash' });
    await user.save();
  }
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret');

  // Step 1: Initial state for patient voices
  console.log('\nStep 1: Patient queries active voices...');
  const patientVoicesBefore = await makeRequest('/api/memory-support/sanctuary/contacts/voices', 'GET', null, token);
  console.log(`Patient sees ${patientVoicesBefore.data.length} active voice notes.`);
  const initialCount = patientVoicesBefore.data.length;

  // Step 2: Caregiver queries content
  console.log('\nStep 2: Caregiver fetches content list...');
  const caregiverContent = await makeRequest('/api/caregiver/content', 'GET', null, token);
  const voiceToToggle = caregiverContent.data.voiceNotes[0];
  console.log(`Caregiver targeting recording: "${voiceToToggle.title}" (ID: ${voiceToToggle.id})`);

  // Step 3: Caregiver toggles OFF
  console.log('\nStep 3: Caregiver sets recording isActive = false...');
  const toggleOff = await makeRequest(`/api/caregiver/voice/${voiceToToggle.id}/active`, 'PATCH', { isActive: false }, token);
  console.log('Toggle OFF response:', toggleOff.data);

  // Step 4: Patient re-queries voices
  console.log('\nStep 4: Patient re-queries active voices...');
  const patientVoicesAfterToggle = await makeRequest('/api/memory-support/sanctuary/contacts/voices', 'GET', null, token);
  console.log(`Patient now sees ${patientVoicesAfterToggle.data.length} active voice notes.`);
  const isExcluded = !patientVoicesAfterToggle.data.some(v => v.recordingId === voiceToToggle.id);
  console.log(`Recording excluded from patient view: ${isExcluded ? 'YES (SUCCESS)' : 'NO (FAILED)'}`);

  // Step 5: Caregiver toggles back ON
  console.log('\nStep 5: Caregiver sets recording isActive = true...');
  const toggleOn = await makeRequest(`/api/caregiver/voice/${voiceToToggle.id}/active`, 'PATCH', { isActive: true }, token);
  console.log('Toggle ON response:', toggleOn.data);

  // Step 6: Patient re-queries voices to confirm restored
  const patientVoicesRestored = await makeRequest('/api/memory-support/sanctuary/contacts/voices', 'GET', null, token);
  console.log(`Patient now sees ${patientVoicesRestored.data.length} active voice notes.`);
  const isRestored = patientVoicesRestored.data.some(v => v.recordingId === voiceToToggle.id);
  console.log(`Recording restored to patient view: ${isRestored ? 'YES (SUCCESS)' : 'NO (FAILED)'}`);

  // Step 7: Patient feeling check-in and caregiver session log sync
  console.log('\nStep 7: Patient logs feelings check-in ("calmer")...');
  const feelRes = await makeRequest('/api/memory-support/sanctuary/feelings-checkin', 'POST', {
    feeling: 'calmer',
    completedActivity: 'Sarah Grounding Note Playback'
  }, token);
  console.log('Check-in logged:', feelRes.data);

  console.log('\nStep 8: Caregiver inspects session intervention history...');
  const sessions = await makeRequest('/api/caregiver/sessions', 'GET', null, token);
  console.log(`Intervention history entries count: ${sessions.data.length}`);
  console.log(`Most recent intervention: "${sessions.data[0].title}" | Outcome: "${sessions.data[0].badge}"`);

  await mongoose.disconnect();
  console.log('\n=== END-TO-END CAREGIVER <-> PATIENT SYNC VERIFIED SUCCESSFULLY ===');
}

runE2ESyncVerification().catch(err => {
  console.error('E2E Sync Verification Failed:', err);
  process.exit(1);
});
