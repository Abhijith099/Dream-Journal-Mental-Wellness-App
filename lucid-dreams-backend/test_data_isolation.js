const http = require('http');
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

require('dotenv').config();

const BASE_URL = 'http://localhost:5000';

// Helper to make HTTP requests
function request(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const reqHeaders = {
            'Content-Type': 'application/json',
            ...headers
        };

        const postData = body ? JSON.stringify(body) : null;
        if (postData) {
            reqHeaders['Content-Length'] = Buffer.byteLength(postData);
        }

        const req = http.request(url, {
            method,
            headers: reqHeaders
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsed = data;
                try {
                    parsed = JSON.parse(data);
                } catch (e) {}
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: parsed
                });
            });
        });

        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(`ASSERTION FAILED: ${message}`);
    }
    console.log(`  ✓ ${message}`);
}

async function runTests() {
    console.log('====================================================');
    console.log('DATA ISOLATION & MULTI-TENANCY SYSTEM VERIFICATION');
    console.log('====================================================\n');

    await mongoose.connect(process.env.MONGO_URI);

    const rand = Math.floor(Math.random() * 90000) + 10000;
    const emailA = `isolation_user_a_${rand}@test.com`;
    const emailB = `isolation_user_b_${rand}@test.com`;
    const password = 'StrongPassword1!';

    // ----------------------------------------------------
    // TEST 1: New Account Signup & Clean Dataset Isolation
    // ----------------------------------------------------
    console.log('[TEST 1] Registering User A & User B and verifying clean empty datasets...');
    const signupA = await request('POST', '/api/auth/signup', {
        name: 'Alice UserA',
        email: emailA,
        password: password
    });
    assert(signupA.status === 201, 'User A registered successfully');
    const tokenA = signupA.body.token;
    const userAId = signupA.body.user.id;
    assert(!!tokenA && !!userAId, 'User A token and ID received');

    const signupB = await request('POST', '/api/auth/signup', {
        name: 'Bob UserB',
        email: emailB,
        password: password
    });
    assert(signupB.status === 201, 'User B registered successfully');
    const tokenB = signupB.body.token;
    const userBId = signupB.body.user.id;
    assert(!!tokenB && !!userBId, 'User B token and ID received');

    // Test 1A: User A dreams empty
    const dreamsA = await request('GET', '/api/dreams', null, { Authorization: `Bearer ${tokenA}` });
    assert(Array.isArray(dreamsA.body) && dreamsA.body.length === 0, 'New user has exactly 0 dreams in /api/dreams');

    // Test 1B: Paginated dreams query empty
    const dreamsPaginatedA = await request('GET', '/api/dreams?sort=recent&limit=20', null, { Authorization: `Bearer ${tokenA}` });
    assert(dreamsPaginatedA.body.total_count === 0, 'New user has total_count: 0 in paginated /api/dreams');
    assert(Array.isArray(dreamsPaginatedA.body.dreams) && dreamsPaginatedA.body.dreams.length === 0, 'New user has dreams: [] in paginated response');

    // Test 1C: Insights root empty state
    const insightsA = await request('GET', '/api/insights?period=month', null, { Authorization: `Bearer ${tokenA}` });
    assert(insightsA.body.metrics.dreams_added === 0, 'Insights dreams_added is 0 for new user');
    assert(insightsA.body.metrics.sanctuary_sessions_count === 0, 'Insights sanctuary_sessions_count is 0');
    assert(insightsA.body.message && insightsA.body.message.includes('No data yet'), 'Insights returns "No data yet" message for clean new account');

    // Test 1D: Home dashboard clean state
    const homeDashA = await request('GET', '/api/home/dashboard', null, { Authorization: `Bearer ${tokenA}` });
    assert(homeDashA.status === 200, 'Home dashboard returned 200');
    assert(homeDashA.body.total_dreams_count === 0, 'Home dashboard total_dreams_count is 0');
    assert(homeDashA.body.total_dreams_this_week === 0, 'Home dashboard total_dreams_this_week is 0');
    assert(homeDashA.body.recent_dreams.length === 0, 'Home dashboard recent_dreams is empty []');
    assert(homeDashA.body.last_sanctuary_session === null, 'Home dashboard last_sanctuary_session is null');

    // Test 1E: Chatbot conversations clean state
    const chatA = await request('GET', '/api/chatbot/conversations', null, { Authorization: `Bearer ${tokenA}` });
    assert(chatA.body.total_conversations === 0, 'Chatbot total_conversations is 0');
    assert(chatA.body.conversations.length === 0, 'Chatbot conversations list is []');

    // Test 1F: Sanctuary sessions clean state
    const sanctuaryA = await request('GET', '/api/sanctuary/sessions?period=month', null, { Authorization: `Bearer ${tokenA}` });
    assert(sanctuaryA.body.total_sessions === 0, 'Sanctuary total_sessions is 0');
    assert(sanctuaryA.body.sessions.length === 0, 'Sanctuary sessions list is []');

    // Test 1G: Sanctuary contacts clean state (no pre-seeded fake Sarah or Michael)
    const voicesA = await request('GET', '/api/sanctuary/contacts/voices', null, { Authorization: `Bearer ${tokenA}` });
    assert(Array.isArray(voicesA.body) && voicesA.body.length === 0, 'Sanctuary voices has 0 fake contacts seeded');

    // Test 1H: Wellness summary clean state
    const wellnessA = await request('GET', '/api/wellness/summary', null, { Authorization: `Bearer ${tokenA}` });
    assert(wellnessA.body.summary.entries_count === 0, 'Wellness summary entries_count is 0');
    assert(wellnessA.body.summary.streak_days === 0, 'Wellness streak_days is 0');
    assert(wellnessA.body.daily_breakdown.length === 0, 'Wellness daily_breakdown is []');

    // Test 1I: Workspace initialize
    const initA = await request('POST', '/api/users/initialize', { preferred_timezone: 'America/New_York' }, { Authorization: `Bearer ${tokenA}` });
    assert(initA.status === 200, 'POST /api/users/initialize returned 200');
    assert(initA.body.collections.dreams === 0, 'Initialized workspace verified 0 dreams');

    console.log('\n[TEST 2] Cross-User Boundary & Isolation Enforcement...');
    // User A creates a dream
    const dreamCreateA = await request('POST', '/api/dreams', {
        title: 'Secret Dream of User A',
        description: 'This is deeply confidential personal dream content',
        isLucid: true,
        tags: ['secret', 'personal']
    }, { Authorization: `Bearer ${tokenA}` });
    assert(dreamCreateA.status === 201, 'User A created secret dream');
    const dreamAId = dreamCreateA.body._id;

    // User B checks their dreams list
    const dreamsB = await request('GET', '/api/dreams', null, { Authorization: `Bearer ${tokenB}` });
    assert(dreamsB.body.length === 0, 'User B dreams list remains strictly 0 (no leakage of User A dream)');

    // User B attempts to access User A's dream by ID
    const directAccess = await request('GET', `/api/dreams/${dreamAId}`, null, { Authorization: `Bearer ${tokenB}` });
    assert(directAccess.status === 404, 'User B direct access to User A dream by ID returns 404 Not Found (isolated)');

    // User B attempts to access User A's dreams via path spoofing: /api/users/:userId/dreams
    const pathAccess = await request('GET', `/api/users/${userAId}/dreams`, null, { Authorization: `Bearer ${tokenB}` });
    assert(pathAccess.status === 403, 'Path parameter spoofing /api/users/:userAId/dreams by User B returns 403 Forbidden');

    // User B attempts to access User A's dashboard via path: /api/home/:userId/dashboard
    const dashSpoof = await request('GET', `/api/home/${userAId}/dashboard`, null, { Authorization: `Bearer ${tokenB}` });
    assert(dashSpoof.status === 403, 'Path parameter spoofing /api/home/:userAId/dashboard returns 403 Forbidden');

    // User B attempts to query caregiver route without assignment: /api/caregiver/patients/:patientId/dreams
    const unauthCaregiver = await request('GET', `/api/caregiver/patients/${userAId}/dreams`, null, { Authorization: `Bearer ${tokenB}` });
    assert(unauthCaregiver.status === 403, 'Unassigned caregiver access returns 403 Forbidden');

    console.log('\n[TEST 3] Token Security, Tampering & Expiration Validation...');
    // Test 3A: Expired token
    const expiredToken = jwt.sign(
        { userId: userAId, user_id: userAId, email: emailA },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '1ms' }
    );
    await new Promise(r => setTimeout(r, 20));
    const expiredReq = await request('GET', '/api/dreams', null, { Authorization: `Bearer ${expiredToken}` });
    assert(expiredReq.status === 401, 'Expired token returns 401 Unauthorized');

    // Test 3B: Forged signature token
    const forgedToken = jwt.sign(
        { userId: userAId, user_id: userAId },
        'wrong_attacker_secret_12345',
        { expiresIn: '1d' }
    );
    const forgedReq = await request('GET', '/api/dreams', null, { Authorization: `Bearer ${forgedToken}` });
    assert(forgedReq.status === 401, 'Forged signature token returns 401 Unauthorized');

    // Test 3C: Tampered payload token
    const parts = tokenA.split('.');
    const tamperedPayload = Buffer.from(JSON.stringify({ userId: userBId, user_id: userBId })).toString('base64');
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
    const tamperedReq = await request('GET', '/api/dreams', null, { Authorization: `Bearer ${tamperedToken}` });
    assert(tamperedReq.status === 401, 'Tampered token payload returns 401 Unauthorized');

    console.log('\n[TEST 4] SQL / Parameterized Input Safety...');
    const sqliDream = await request('POST', '/api/dreams', {
        title: "'; DROP TABLE dreams; --",
        description: "Adversarial injection test"
    }, { Authorization: `Bearer ${tokenA}` });
    assert(sqliDream.status === 201, 'Adversarial payload handled cleanly as text');
    const userADreams = await request('GET', '/api/dreams', null, { Authorization: `Bearer ${tokenA}` });
    assert(userADreams.body.some(d => d.title === "'; DROP TABLE dreams; --"), 'Database data intact, stored verbatim safely');

    console.log('\n[TEST 5] Authorized Caregiver Assignment Verification...');
    const CaregiverAssignment = require('./models/CaregiverAssignment');
    await CaregiverAssignment.create({
        caregiverId: userBId,
        patientId: userAId,
        status: 'active',
        permissions: {
            canViewRecordings: true,
            canFlagContent: true,
            canEditContent: false
        }
    });

    // Now User B calls caregiver patient dreams endpoint
    const caregiverAccess = await request('GET', `/api/caregiver/patients/${userAId}/dreams`, null, { Authorization: `Bearer ${tokenB}` });
    assert(caregiverAccess.status === 200, 'Assigned caregiver successfully accessed patient dreams');
    assert(Array.isArray(caregiverAccess.body.dreams) && caregiverAccess.body.dreams.length >= 1, 'Caregiver received patient dreams');

    // Verify audit log exists
    const AuditLog = require('./models/AuditLog');
    const auditLogs = await AuditLog.find({ actorId: userBId, userId: userAId });
    assert(auditLogs.length >= 1, 'AuditLog entry captured caregiver access');

    console.log('\n[TEST 6] Cascade Account Deletion...');
    const deleteAccountA = await request('DELETE', '/api/auth/account', { confirmation: 'DELETE' }, { Authorization: `Bearer ${tokenA}` });
    assert(deleteAccountA.status === 200, 'User A account deletion returned 200 OK');

    // Verify User A no longer exists
    const User = require('./models/User');
    const Dream = require('./models/Dream');
    const userCheck = await User.findById(userAId);
    assert(!userCheck, 'User record deleted from database');

    const dreamCheck = await Dream.find({ userId: userAId });
    assert(dreamCheck.length === 0, 'All dreams belonging to User A cascaded and deleted');

    const assignmentCheck = await CaregiverAssignment.find({ $or: [{ patientId: userAId }, { caregiverId: userAId }] });
    assert(assignmentCheck.length === 0, 'All caregiver assignments involving User A cascaded and deleted');

    await mongoose.disconnect();

    console.log('\n====================================================');
    console.log('ALL DATA ISOLATION SPECIFICATION TESTS PASSED! 🎉');
    console.log('====================================================\n');
}

runTests().catch(err => {
    console.error('TEST RUNNER FAILED:', err);
    process.exit(1);
});
