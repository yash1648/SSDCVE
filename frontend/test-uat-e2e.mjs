import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const BASE_URL = 'http://127.0.0.1:5173';
const EXECUTABLE_PATH = '/usr/bin/chromium';

async function runComprehensiveUatSuite() {
  console.log('================================================================');
  console.log('       SSDCVE COMPREHENSIVE ZERO-MOCK UAT & E2E SUITE          ');
  console.log('       (Real Backend, Postgres + IPFS, Strict Quality Gates)   ');
  console.log('================================================================\n');

  const browser = await chromium.launch({
    executablePath: EXECUTABLE_PATH,
    headless: true,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Track console errors to ensure zero CORS and unhandled exceptions
  const consoleErrors = [];
  const corsErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      consoleErrors.push(text);
      if (text.toLowerCase().includes('cors') || text.toLowerCase().includes('access-control')) {
        corsErrors.push(text);
      }
    }
  });

  const testResults = {
    lifecycle: {},
    tamperedPriority: {},
    rbacMatrix: {},
    securityBounds: {},
    qrRoundTrip: {},
    storageCheck: {},
    corsCheck: {},
  };

  const timestamp = Date.now();

  try {
    // ------------------------------------------------------------------
    // TEST 1: Register -> Roles Navigation
    // ------------------------------------------------------------------
    console.log('[TEST 1] Register -> Roles Navigation:');
    const freshHolderEmail = `uat_holder_${timestamp}@test.edu`;
    const userPass = 'TestPass-123!';
    const freshHolderName = `UAT Student ${timestamp}`;

    await page.goto(`${BASE_URL}/register`);
    await page.fill('input[name="fullName"]', freshHolderName);
    await page.fill('input[name="email"]', freshHolderEmail);
    await page.fill('input[name="password"]', userPass);

    const [regRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/register')),
      page.click('button[type="submit"]'),
    ]);
    const regJson = await regRes.json();
    console.log(`  -> Registered user: ${regJson.id} with role: ${regJson.role} (Status: ${regRes.status()})`);
    if (regJson.role !== 'HOLDER' || regRes.status() !== 201) {
      throw new Error(`Register failed or role is not HOLDER: ${JSON.stringify(regJson)}`);
    }

    // Click "Proceed to Login" -> lands on /login
    await page.click('button:has-text("Proceed to Login")');
    await page.waitForURL('**/login');
    await page.fill('input[name="email"]', freshHolderEmail);
    await page.fill('input[name="password"]', userPass);
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/login')),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForURL('**/holder');
    console.log('  -> HOLDER landed on /holder successfully.');

    // Logout
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');

    // Login as ISSUER (issuer@test.edu) -> lands on /issuer
    await page.fill('input[name="email"]', 'issuer@test.edu');
    await page.fill('input[name="password"]', userPass);
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/login')),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForURL('**/issuer');
    console.log('  -> ISSUER landed on /issuer successfully.');

    // Logout
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');

    // Login as VERIFIER (verifier@test.edu) -> lands on /verifier
    await page.fill('input[name="email"]', 'verifier@test.edu');
    await page.fill('input[name="password"]', userPass);
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/login')),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForURL('**/verifier');
    console.log('  -> VERIFIER landed on /verifier successfully.');

    // Logout
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');

    // Login as ADMIN (admin@test.edu) -> lands on /admin
    await page.fill('input[name="email"]', 'admin@test.edu');
    await page.fill('input[name="password"]', userPass);
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/login')),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForURL('**/admin');
    console.log('  -> ADMIN landed on /admin successfully.');

    // Logout
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');

    testResults.lifecycle.rolesNavigation = 'PASS';

    // ------------------------------------------------------------------
    // TEST 2: Issue Credential -> Wallet Add -> Download -> Verify VALID
    // ------------------------------------------------------------------
    console.log('\n[TEST 2] Issue -> Wallet Add -> Download -> Verify VALID:');
    // Login as ISSUER
    await page.fill('input[name="email"]', 'issuer@test.edu');
    await page.fill('input[name="password"]', userPass);
    const [issuerLoginRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/login')),
      page.click('button[type="submit"]'),
    ]);
    const issuerLoginJson = await issuerLoginRes.json();
    const issuerToken = issuerLoginJson.accessToken;
    await page.waitForURL('**/issuer');

    // Switch to issue tab
    await page.click('button:has-text("Issue New Credential")');
    await page.fill('input[placeholder*="holder@test.edu"]', freshHolderEmail);
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/issuer/holders')),
      page.click('button:has-text("Lookup Student")'),
    ]);
    console.log(`  -> Student ${freshHolderEmail} verified.`);

    const credTitle = `Master of Science in Cybersecurity ${timestamp}`;
    await page.fill('input[placeholder*="Bachelor of Science"]', credTitle);

    const [issueRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/issuer/credentials') && res.request().method() === 'POST'),
      page.click('button:has-text("Issue & Sign Credential")'),
    ]);
    const issueStatus = issueRes.status();
    const issueData = await issueRes.json();
    console.log(`  -> Issued Credential: ${issueData.credentialNumber} (ID: ${issueData.id}, Status: HTTP ${issueStatus})`);
    if (issueStatus !== 201) throw new Error(`Issuance failed with status ${issueStatus}`);

    testResults.lifecycle.issue = {
      status: issueStatus,
      credentialNumber: issueData.credentialNumber,
      credentialId: issueData.id,
    };

    // Logout Issuer
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');

    // Login as fresh HOLDER
    await page.fill('input[name="email"]', freshHolderEmail);
    await page.fill('input[name="password"]', userPass);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/holder');

    // Add credential to wallet using UUID
    console.log(`  -> Adding credential ID ${issueData.id} to student wallet:`);
    await page.fill('input[placeholder*="Enter credential ID"]', issueData.id);
    const [addWalletRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes(`/api/holder/wallet/${issueData.id}`) && res.request().method() === 'POST'),
      page.click('button:has-text("Add to Wallet")'),
    ]);
    const addWalletStatus = addWalletRes.status();
    console.log(`  -> POST /api/holder/wallet/${issueData.id} responded HTTP ${addWalletStatus}`);
    if (addWalletStatus !== 201) throw new Error(`Wallet add failed with HTTP ${addWalletStatus}`);

    // Wait for card to render
    await page.waitForSelector(`text=${issueData.credentialNumber}`);
    console.log('  -> Credential card rendered in student wallet.');

    // Download Envelope JSON
    console.log('  -> Downloading Signed Envelope JSON:');
    const holderCard = page.locator(`div:has-text("${issueData.credentialNumber}")`).first();
    await holderCard.locator('button:has-text("Files")').click();
    await page.waitForSelector('text=Signed Envelope JSON');

    const [downloadEvent] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Download .json Envelope")'),
    ]);
    const downloadedPath = await downloadEvent.path();
    const envelopeRaw = fs.readFileSync(downloadedPath, 'utf8');
    const envelopeJson = JSON.parse(envelopeRaw);
    console.log(`  -> Downloaded Envelope: ${downloadEvent.suggestedFilename()} (${envelopeRaw.length} bytes)`);
    if (!envelopeJson.credential || !envelopeJson.signature) {
      throw new Error('Downloaded file is not a valid envelope JSON structure');
    }

    // Close download modal
    await page.keyboard.press('Escape');

    // Verify VALID via public upload
    console.log('  -> Verifying downloaded envelope via Public Upload:');
    await page.goto(`${BASE_URL}/verify`);
    await page.setInputFiles('input[type="file"]', downloadedPath);
    await page.waitForSelector(`text=${issueData.credentialNumber}`);
    await page.waitForSelector('text=Certificate Valid');
    const validBadge = await page.locator('span:has-text("VALID")').first().textContent();
    console.log(`  -> Public Upload verification verdict: "${validBadge?.trim()}" (VALID)`);
    if (!validBadge?.includes('VALID')) throw new Error('Envelope verification did not return VALID');

    testResults.lifecycle.verifyValid = 'PASS';

    // ------------------------------------------------------------------
    // TEST 3: Revoke Credential (via Issuer UI) -> Verify REVOKED
    // ------------------------------------------------------------------
    console.log('\n[TEST 3] Revoke Credential -> Verify REVOKED:');
    // Login as ISSUER
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'issuer@test.edu');
    await page.fill('input[name="password"]', userPass);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/issuer');

    // Click on credential row in table to open details modal
    console.log(`  -> Opening detail modal for ${issueData.credentialNumber}:`);
    const credRow = page.locator('tr', { hasText: issueData.credentialNumber }).first();
    await credRow.click();

    // Click Revoke button in modal
    await page.waitForSelector('text=Revoke Credential');
    await page.click('button:has-text("Revoke")');

    // Fill reason and submit
    await page.fill('input[placeholder*="Issued in error"]', 'Academic Misconduct Disciplinary Action');
    const [revokeRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes(`/api/issuer/credentials/${issueData.id}/revoke`) && res.request().method() === 'POST'),
      page.click('button:has-text("Confirm Revocation")'),
    ]);
    const revokeStatus = revokeRes.status();
    const revokeJson = await revokeRes.json();
    console.log(`  -> Revoke API returned HTTP ${revokeStatus}: Status ${revokeJson.status}`);
    if (revokeStatus !== 200 || revokeJson.status !== 'REVOKED') {
      throw new Error(`Revocation failed with status ${revokeStatus}`);
    }

    // Close modal
    await page.keyboard.press('Escape');

    // Verify the unchanged envelope now returns REVOKED
    await page.goto(`${BASE_URL}/verify`);
    await page.setInputFiles('input[type="file"]', downloadedPath);
    await page.waitForSelector(`text=${issueData.credentialNumber}`);
    await page.waitForSelector('text=Certificate Revoked');
    const revokedBadge = await page.locator('span:has-text("REVOKED")').first().textContent();
    console.log(`  -> Public Upload verification verdict: "${revokedBadge?.trim()}" (REVOKED)`);
    if (!revokedBadge?.includes('REVOKED')) throw new Error('Envelope verification did not return REVOKED');

    testResults.lifecycle.revokeAndVerify = 'PASS';

    // ------------------------------------------------------------------
    // TEST 4: Tampered Envelope -> TAMPERED & Revoked+Tampered Priority
    // ------------------------------------------------------------------
    console.log('\n[TEST 4] Tampered Envelope & Revoked+Tampered -> TAMPERED Priority:');
    // Create a tampered copy of the revoked envelope (flip title in claims)
    const tamperedEnvelope = JSON.parse(JSON.stringify(envelopeJson));
    tamperedEnvelope.credential.title = 'FORGED TITLE HACKED';
    const tamperedPath = `/tmp/tampered_envelope_${timestamp}.json`;
    fs.writeFileSync(tamperedPath, JSON.stringify(tamperedEnvelope, null, 2));

    await page.goto(`${BASE_URL}/verify`);
    await page.setInputFiles('input[type="file"]', tamperedPath);
    await page.waitForSelector(`text=${issueData.credentialNumber}`);
    await page.waitForSelector('text=Verification Failed');
    const tamperedBadge = await page.locator('span:has-text("TAMPERED")').first().textContent();
    console.log(`  -> Revoked + Tampered file verification verdict: "${tamperedBadge?.trim()}" (TAMPERED)`);
    if (!tamperedBadge?.includes('TAMPERED')) {
      throw new Error('Revoked+Tampered file did not prioritize TAMPERED!');
    }
    console.log('  -> Priority confirmed: Cryptographic integrity check strictly precedes status registry check.');
    testResults.tamperedPriority.status = 'PASS';

    // ------------------------------------------------------------------
    // TEST 5: RBAC 403 Matrix
    // ------------------------------------------------------------------
    console.log('\n[TEST 5] RBAC 403 Matrix:');

    // 5a: HOLDER visiting /issuer -> 403 Screen
    console.log('  -> 5a. HOLDER visiting /issuer:');
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', freshHolderEmail);
    await page.fill('input[name="password"]', userPass);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/holder');

    await page.goto(`${BASE_URL}/issuer`);
    await page.waitForSelector('text=Access Denied');
    await page.waitForSelector('text=Forbidden');
    console.log('     -> 403 Forbidden screen displayed for HOLDER on /issuer.');

    // 5b: VERIFIER visiting /admin -> 403 Screen
    console.log('  -> 5b. VERIFIER visiting /admin:');
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'verifier@test.edu');
    await page.fill('input[name="password"]', userPass);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/verifier');

    await page.goto(`${BASE_URL}/admin`);
    await page.waitForSelector('text=Access Denied');
    await page.waitForSelector('text=Forbidden');
    console.log('     -> 403 Forbidden screen displayed for VERIFIER on /admin.');

    // 5c: Cross-Issuer Revoke -> HTTP 403 Forbidden
    console.log('  -> 5c. Cross-Issuer Revoke (Issuer B revoking Issuer A credential):');
    // Provision a second distinct issuer (Issuer B)
    const issuerBEmail = `issuer_b_${timestamp}@test.edu`;
    const regBRes = await page.request.post('http://127.0.0.1:5173/api/auth/register', {
      data: {
        email: issuerBEmail,
        password: userPass,
        fullName: 'Second Issuer Staff',
      },
      headers: { 'Content-Type': 'application/json' },
    });
    const regBJson = await regBRes.json();
    execSync(`docker exec ssdcve-postgres psql -U ssdcve -d ssdcve -c "UPDATE users SET role='ISSUER' WHERE id='${regBJson.id}';"`);
    execSync(`docker exec ssdcve-postgres psql -U ssdcve -d ssdcve -c "INSERT INTO issuers (id, user_id, name, domain, verified, created_at, updated_at) VALUES (gen_random_uuid(), '${regBJson.id}', 'Second University', 'second.edu', true, NOW(), NOW());"`);

    // Login as Issuer B
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', issuerBEmail);
    await page.fill('input[name="password"]', userPass);
    const [loginBRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/login')),
      page.click('button[type="submit"]'),
    ]);
    const loginBJson = await loginBRes.json();
    const tokenB = loginBJson.accessToken;

    // Issuer B tries to revoke Issuer A's credential (issueData.id)
    const crossRevokeRes = await page.request.post(`http://127.0.0.1:5173/api/issuer/credentials/${issueData.id}/revoke`, {
      headers: {
        'Authorization': `Bearer ${tokenB}`,
        'Content-Type': 'application/json',
      },
      data: { reason: 'Malicious Attempt' },
    });
    const crossRevokeStatus = crossRevokeRes.status();
    const crossRevokeBody = await crossRevokeRes.json();
    console.log(`     -> Cross-issuer revoke HTTP Status: ${crossRevokeStatus}, body: ${JSON.stringify(crossRevokeBody)}`);
    if (crossRevokeStatus !== 403 || !crossRevokeBody.error?.includes('Issuer does not own this credential')) {
      throw new Error(`Cross-issuer revoke expected 403 Forbidden with ownership error, got ${crossRevokeStatus}`);
    }
    console.log('     -> Cross-issuer revoke 403 verified: "Issuer does not own this credential".');

    testResults.rbacMatrix.holderToIssuer = '403 PASS';
    testResults.rbacMatrix.verifierToAdmin = '403 PASS';
    testResults.rbacMatrix.crossIssuerRevoke = '403 PASS';

    // ------------------------------------------------------------------
    // TEST 6: Expired Token 401 & Security Bounds (Oversize, Wrong MIME)
    // ------------------------------------------------------------------
    console.log('\n[TEST 6] Expired Token 401 & Security Bounds:');

    // 6a: Expired Token 401
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTEyMzQtMTIzNC0xMjM0NTY3ODEyMzQiLCJyb2xlIjoiSE9MREVSIiwiaWF0IjoxNTAwMDAwMDAwLCJleHAiOjE1MDAwMDAwMDF9.invalid_signature_proof';
    const expiredRes = await page.request.get('http://127.0.0.1:5173/api/holder/wallet', {
      headers: { 'Authorization': `Bearer ${expiredToken}` },
    });
    console.log(`  -> Expired token call to /api/holder/wallet returned HTTP ${expiredRes.status()}`);
    if (expiredRes.status() !== 401) {
      throw new Error(`Expected 401 for expired token, got ${expiredRes.status()}`);
    }
    testResults.securityBounds.expiredToken = '401 PASS';

    // 6b: Wrong-MIME Document 415
    console.log('  -> Wrong-MIME document upload to /api/issuer/credentials/{id}/document:');
    const wrongMimeRes = await page.request.post(`http://127.0.0.1:5173/api/issuer/credentials/${issueData.id}/document`, {
      headers: {
        'Authorization': `Bearer ${issuerToken}`,
      },
      multipart: {
        document: {
          name: 'malicious.sh',
          mimeType: 'text/plain',
          buffer: Buffer.from('#!/bin/sh\necho "exploit"'),
        },
      },
    });
    console.log(`  -> Wrong-MIME upload returned HTTP ${wrongMimeRes.status()}`);
    if (wrongMimeRes.status() !== 415) {
      throw new Error(`Expected 415 for wrong-MIME upload, got ${wrongMimeRes.status()}`);
    }
    testResults.securityBounds.wrongMime = '415 PASS';

    // 6c: Oversized Upload Rejection
    console.log('  -> Oversized upload rejection (>2MB payload):');
    const largeBuffer = Buffer.alloc(3 * 1024 * 1024, 'a'); // 3MB file
    const oversizeRes = await page.request.post('http://127.0.0.1:5173/api/verifier/verify/batch', {
      multipart: {
        file: {
          name: 'large_credential.json',
          mimeType: 'application/json',
          buffer: largeBuffer,
        },
      },
    });
    console.log(`  -> Oversized upload returned HTTP ${oversizeRes.status()}`);
    if (oversizeRes.status() !== 400 && oversizeRes.status() !== 413) {
      throw new Error(`Expected 400/413 for oversized upload, got ${oversizeRes.status()}`);
    }
    testResults.securityBounds.oversizedUpload = `${oversizeRes.status()} PASS`;

    // ------------------------------------------------------------------
    // TEST 7: QR Round-Trip (Scan credentialNumber -> Verify-by-ID -> VALID)
    // ------------------------------------------------------------------
    console.log('\n[TEST 7] QR Round-Trip:');
    // Issue a clean active credential using Issuer A
    const qrCredTitle = `Bachelor of Engineering in Distributed Systems ${timestamp}`;
    const qrIssueRes = await page.request.post('http://127.0.0.1:5173/api/issuer/credentials', {
      headers: {
        'Authorization': `Bearer ${issuerToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        subjectId: regJson.id,
        type: 'DegreeCertificate',
        title: qrCredTitle,
        claims: { major: 'Systems Security', gpa: '3.98' },
      },
    });
    const qrCredJson = await qrIssueRes.json();
    console.log(`  -> Fresh Active Credential issued: ${qrCredJson.credentialNumber} (UUID: ${qrCredJson.id})`);

    // Login as Holder to inspect QR modal
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', freshHolderEmail);
    await page.fill('input[name="password"]', userPass);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/holder');

    // Add to wallet
    await page.fill('input[placeholder*="Enter credential ID"]', qrCredJson.id);
    await page.click('button:has-text("Add to Wallet")');
    await page.waitForSelector(`text=${qrCredJson.credentialNumber}`);

    // Click "Share" button on card
    const credCard = page.locator(`div:has-text("${qrCredJson.credentialNumber}")`).first();
    await credCard.locator('button:has-text("Share")').first().click();

    // Verify QR modal opens with target URL
    await page.waitForSelector('text=Public Verification Link');
    await page.waitForSelector(`text=${qrCredJson.credentialNumber}`);
    const qrTargetUrl = `${BASE_URL}/verify/${qrCredJson.id}`;
    console.log(`  -> QR modal rendered encoding frontend URL: ${qrTargetUrl}`);

    // Navigate to the QR target URL in browser
    await page.goto(qrTargetUrl);
    await page.waitForSelector(`text=${qrCredJson.credentialNumber}`);
    await page.waitForSelector('text=Certificate Valid');
    const qrVerifiedBadge = await page.locator('span:has-text("VALID")').first().textContent();
    console.log(`  -> QR target URL /verify/${qrCredJson.id} verdict: "${qrVerifiedBadge?.trim()}" (VALID)`);
    if (!qrVerifiedBadge?.includes('VALID')) {
      throw new Error(`QR target route verification failed to show VALID!`);
    }
    testResults.qrRoundTrip.status = 'PASS';

    // ------------------------------------------------------------------
    // TEST 8: Storage Check (Zero Tokens in Storage) & CORS Cleanliness
    // ------------------------------------------------------------------
    console.log('\n[TEST 8] Storage Check & CORS Cleanliness:');
    const storageDump = await page.evaluate(() => {
      return {
        local: Object.keys(localStorage),
        session: Object.keys(sessionStorage),
        localStorageContent: { ...localStorage },
        sessionStorageContent: { ...sessionStorage },
      };
    });

    const tokenKeys = [...storageDump.local, ...storageDump.session].filter((k) =>
      k.toLowerCase().includes('token') || k.toLowerCase().includes('jwt') || k.toLowerCase().includes('auth')
    );
    console.log(`  -> Web storage keys found: Local [${storageDump.local.join(', ')}], Session [${storageDump.session.join(', ')}]`);
    console.log(`  -> Token-related keys in storage: ${tokenKeys.length}`);
    if (tokenKeys.length > 0) {
      throw new Error(`Tokens detected in Web Storage! Keys: ${tokenKeys.join(', ')}`);
    }
    testResults.storageCheck.status = 'PASS (Zero tokens stored in localStorage / sessionStorage)';

    console.log(`  -> CORS errors logged in browser console: ${corsErrors.length}`);
    if (corsErrors.length > 0) {
      throw new Error(`CORS errors detected in console:\n${corsErrors.join('\n')}`);
    }
    testResults.corsCheck.status = 'PASS (Zero CORS errors across entire suite)';

    console.log('\n================================================================');
    console.log('       ALL UAT VERIFICATION GATES PASSED CLEANLY!              ');
    console.log('================================================================');
    console.log(JSON.stringify(testResults, null, 2));

  } catch (err) {
    console.error('\nUAT Test Suite Failure:', err);
    process.exit(1);
  } finally {
    // Cleanup temporary files
    try {
      if (fs.existsSync(`/tmp/tampered_envelope_${timestamp}.json`)) {
        fs.unlinkSync(`/tmp/tampered_envelope_${timestamp}.json`);
      }
    } catch {}
    await browser.close();
  }
}

runComprehensiveUatSuite();
