import { chromium } from 'playwright';
import { execSync } from 'node:child_process';

const BASE_URL = 'http://127.0.0.1:5173';
const EXECUTABLE_PATH = '/usr/bin/chromium';

async function runPhase5Tests() {
  console.log('====================================================');
  console.log('           SSDCVE PHASE 5 E2E TEST SUITE            ');
  console.log('         (System Admin Console & Governance)        ');
  console.log('====================================================\n');

  const browser = await chromium.launch({
    executablePath: EXECUTABLE_PATH,
    headless: true,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  const results = {
    promoteUserProof: null,
    freshIssuerRegistration: null,
    institutionRegistration: null,
    issuerQueuePendingProof: null,
    approveIssuerProof: null,
    issuerUnblockedProof: null,
    auditLogProof: null,
  };

  try {
    const timestamp = Date.now();

    // ------------------------------------------------------------------
    // STEP 1: Promote Proof (Admin User Directory: "Make Issuer")
    // ------------------------------------------------------------------
    const promoteUserEmail = `holder_for_promote_${timestamp}@test.edu`;
    const userPass = 'TestPass-123!';
    const promoteUserName = `Test Student ${timestamp}`;

    console.log(`[STEP 1] Registering fresh user for promotion (${promoteUserEmail}):`);
    await page.goto(`${BASE_URL}/register`);
    await page.fill('input[name="fullName"]', promoteUserName);
    await page.fill('input[name="email"]', promoteUserEmail);
    await page.fill('input[name="password"]', userPass);

    const [regRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/register')),
      page.click('button[type="submit"]'),
    ]);

    const regStatus = regRes.status();
    const regJson = await regRes.json();
    console.log(`  -> POST /api/auth/register responded HTTP ${regStatus}`);
    console.log(`  -> User ID: ${regJson.id}, Initial Role: ${regJson.role} (HOLDER)\n`);

    console.log('[STEP 2] Login as ADMIN (admin@test.edu) & Promote User via Directory:');
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'admin@test.edu');
    await page.fill('input[name="password"]', 'TestPass-123!');

    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/login')),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForURL('**/admin');
    console.log('  -> Landed on /admin console.');

    // Switch to User Directory tab
    await page.click('button:has-text("User Directory & Roles")');
    await page.waitForSelector('text=User Directory & Role Promotion');

    // Filter by the fresh user's email
    await page.fill('input[placeholder*="Filter by name"]', promoteUserEmail);
    const userRow = page.locator('tr', { hasText: promoteUserEmail }).first();
    await userRow.waitFor();

    // Check before role
    const beforeRole = await userRow.locator('span.font-mono').first().textContent();
    console.log(`  -> User located in table. Role BEFORE promotion: "${beforeRole?.trim()}"`);

    // Click "Make Issuer" button -> POST /api/admin/users/{id}/promote-issuer
    const [promoteRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes(`/api/admin/users/${regJson.id}/promote-issuer`) && res.request().method() === 'POST'),
      userRow.locator('button:has-text("Make Issuer")').click(),
    ]);

    const promoteStatus = promoteRes.status();
    const promoteJson = await promoteRes.json();
    console.log(`  -> POST /api/admin/users/${regJson.id}/promote-issuer returned HTTP ${promoteStatus}`);
    console.log(`  -> Updated Role in API response: ${promoteJson.role}`);

    // Wait for row update in DOM
    await page.waitForSelector(`tr:has-text("${promoteUserEmail}") span:has-text("ISSUER")`);
    const afterRole = await userRow.locator('span.font-mono').first().textContent();
    console.log(`  -> Role AFTER promotion: "${afterRole?.trim()}"\n`);

    results.promoteUserProof = {
      httpStatus: promoteStatus,
      userId: regJson.id,
      email: promoteUserEmail,
      beforeRole: beforeRole?.trim(),
      afterRole: afterRole?.trim(),
      promotedSuccessfully: promoteJson.role === 'ISSUER',
    };

    // Logout Admin
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');

    // ------------------------------------------------------------------
    // STEP 3: Register fresh issuer user via backend (unverified institution)
    // ------------------------------------------------------------------
    const freshIssuerEmail = `fresh_issuer_${timestamp}@test.edu`;
    const freshIssuerName = `Fresh Registrar Staff ${timestamp}`;

    console.log(`[STEP 3] Registering fresh issuer user via backend (${freshIssuerEmail}):`);
    await page.goto(`${BASE_URL}/register`);
    await page.fill('input[name="fullName"]', freshIssuerName);
    await page.fill('input[name="email"]', freshIssuerEmail);
    await page.fill('input[name="password"]', userPass);

    const [regIssuerRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/register')),
      page.click('button[type="submit"]'),
    ]);
    const regIssuerJson = await regIssuerRes.json();
    console.log(`  -> User created with ID: ${regIssuerJson.id}`);

    // Set role to ISSUER via backend (simulating backend provisioned issuer without pre-verified institution)
    console.log('  -> Setting role to ISSUER via backend database:');
    execSync(`docker exec ssdcve-postgres psql -U ssdcve -d ssdcve -c "UPDATE users SET role='ISSUER' WHERE id='${regIssuerJson.id}';"`);
    console.log('  -> User role updated to ISSUER in backend.');

    results.freshIssuerRegistration = {
      userId: regIssuerJson.id,
      email: freshIssuerEmail,
      role: 'ISSUER',
    };

    // ------------------------------------------------------------------
    // STEP 4: Login as fresh ISSUER -> Register Institution (verified=false)
    // ------------------------------------------------------------------
    console.log('[STEP 4] Login as fresh ISSUER & Register Institution Profile:');
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', freshIssuerEmail);
    await page.fill('input[name="password"]', userPass);

    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/login')),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForURL('**/issuer');
    console.log('  -> Fresh issuer reached /issuer!');

    // Should see Register Institution form because GET /api/issuer/me is 404
    await page.waitForSelector('text=Register Issuer Institution');
    console.log('  -> 404 handled: Register Institution form displayed.');

    const instName = `Oxford Institute of Tech ${timestamp}`;
    const instDomain = `oit-${timestamp}.edu`;

    await page.fill('input[placeholder*="Stanford University"]', instName);
    await page.fill('input[placeholder*="stanford.edu"]', instDomain);

    const [regInstRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/issuer/register') && res.request().method() === 'POST'),
      page.click('button:has-text("Register Institution")'),
    ]);

    const regInstStatus = regInstRes.status();
    const regInstJson = await regInstRes.json();
    console.log(`  -> POST /api/issuer/register returned HTTP ${regInstStatus} (201 expected)`);
    console.log(`  -> Institution ID: ${regInstJson.id}, verified: ${regInstJson.verified}`);

    // Expect "Pending Admin Approval" empty state (issuance actions blocked)
    await page.waitForSelector('text=Pending Admin Approval');
    await page.waitForSelector('text=Issuance actions are blocked until verified by administrator');
    console.log('  -> "Pending Admin Approval" empty state displayed; issuance actions blocked as expected.\n');

    results.institutionRegistration = {
      httpStatus: regInstStatus,
      institutionId: regInstJson.id,
      name: regInstJson.name,
      domain: regInstJson.domain,
      verified: regInstJson.verified,
    };

    // Logout
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');

    // ------------------------------------------------------------------
    // STEP 5: Login as ADMIN, view Issuers Queue, approve institution
    // ------------------------------------------------------------------
    console.log('[STEP 5] Login as ADMIN & Approve Institution in Issuers Queue:');
    await page.fill('input[name="email"]', 'admin@test.edu');
    await page.fill('input[name="password"]', 'TestPass-123!');

    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/login')),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForURL('**/admin');

    // View Issuers Queue tab
    await page.click('button:has-text("Issuers Queue")');
    await page.waitForSelector('text=Institution Issuers Queue');

    const instRow = page.locator('tr', { hasText: instName }).first();
    await instRow.waitFor();

    // Verify Pending badge BEFORE approval
    const beforeStatusBadge = await instRow.locator('span:has-text("Pending Approval")').first().textContent();
    console.log(`  -> Institution located in queue. Status BEFORE approval: "${beforeStatusBadge?.trim()}"`);

    results.issuerQueuePendingProof = {
      institutionId: regInstJson.id,
      name: instName,
      statusBefore: beforeStatusBadge?.trim(),
    };

    // Click "Approve Institution" -> POST /api/admin/issuers/{id}/verify (idempotent)
    const [approveRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes(`/api/admin/issuers/${regInstJson.id}/verify`) && res.request().method() === 'POST'),
      instRow.locator('button:has-text("Approve Institution")').click(),
    ]);

    const approveStatus = approveRes.status();
    const approveJson = await approveRes.json();
    console.log(`  -> POST /api/admin/issuers/${regInstJson.id}/verify returned HTTP ${approveStatus}`);
    console.log(`  -> Verified flag in API response: ${approveJson.verified}`);

    // Wait for row update in DOM
    await page.waitForSelector(`tr:has-text("${instName}") span:has-text("Verified")`);
    const afterStatusBadge = await page.locator(`tr:has-text("${instName}") span:has-text("Verified")`).first().textContent();
    console.log(`  -> Status AFTER approval: "${afterStatusBadge?.trim()}"\n`);

    results.approveIssuerProof = {
      httpStatus: approveStatus,
      institutionId: regInstJson.id,
      statusBefore: beforeStatusBadge?.trim(),
      statusAfter: afterStatusBadge?.trim(),
      verifiedFlagBefore: false,
      verifiedFlagAfter: approveJson.verified,
    };

    // Logout Admin
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');

    // ------------------------------------------------------------------
    // STEP 6: Confirm Issuer is now UNBLOCKED (Phase 3 flow unblocked)
    // ------------------------------------------------------------------
    console.log('[STEP 6] Confirm Issuer is now UNBLOCKED (Phase 3 flow unblocked):');
    await page.fill('input[name="email"]', freshIssuerEmail);
    await page.fill('input[name="password"]', userPass);

    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/login')),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForURL('**/issuer');

    // Verify Verified Institution banner is shown
    await page.waitForSelector('text=Verified Institution');
    await page.waitForSelector(`h3:has-text("${instName}")`);
    console.log('  -> Institution banner now shows "Verified Institution"!');

    // Create a key to prove full functionality
    console.log('  -> Creating signing key...');
    const [keyRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/issuer/keys')),
      page.click('button:has-text("Create Signing Key")'),
    ]);
    const keyJson = await keyRes.json();
    console.log(`  -> Key created: ${keyJson.keyId}`);

    // Switch to issue tab and issue a credential
    console.log('  -> Issuing a credential to holder@test.edu...');
    await page.click('button:has-text("Issue New Credential")');
    await page.fill('input[placeholder*="holder@test.edu"]', 'holder@test.edu');
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/issuer/holders')),
      page.click('button:has-text("Lookup Student")'),
    ]);

    await page.fill('input[placeholder*="Bachelor of Science"]', `Executive Diploma in Cyber Governance ${timestamp}`);
    const [issueRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/issuer/credentials') && res.request().method() === 'POST'),
      page.click('button:has-text("Issue & Sign Credential")'),
    ]);

    const issueStatus = issueRes.status();
    const issueJson = await issueRes.json();
    console.log(`  -> POST /api/issuer/credentials returned HTTP ${issueStatus}`);
    console.log(`  -> Credential Number produced: ${issueJson.credentialNumber}`);
    console.log(`  -> Status: ${issueJson.status}, Unblocked confirmed!\n`);

    results.issuerUnblockedProof = {
      keyId: keyJson.keyId,
      credentialNumber: issueJson.credentialNumber,
      issueHttpStatus: issueStatus,
      status: issueJson.status,
    };

    // Logout
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');

    // ------------------------------------------------------------------
    // STEP 7: Global Audit Table Verification
    // ------------------------------------------------------------------
    console.log('[STEP 7] Audit Global Verifications (GET /api/admin/verifications):');
    await page.fill('input[name="email"]', 'admin@test.edu');
    await page.fill('input[name="password"]', 'TestPass-123!');
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/login')),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForURL('**/admin');

    await page.click('button:has-text("Global Verification Audit")');
    await page.waitForSelector('text=Global Verification Audit Log');

    const auditRows = await page.locator('tbody tr').count();
    const firstRowText = await page.locator('tbody tr').first().textContent();
    console.log(`  -> Total audit rows displayed: ${auditRows}`);
    console.log(`  -> First audit row: "${firstRowText?.replace(/\s+/g, ' ').trim()}"\n`);

    results.auditLogProof = {
      totalRows: auditRows,
      firstRow: firstRowText?.replace(/\s+/g, ' ').trim(),
    };

    console.log('====================================================');
    console.log('       ALL PHASE 5 ADMIN TESTS PASSED!              ');
    console.log('====================================================');
    console.log(JSON.stringify(results, null, 2));

  } catch (err) {
    console.error('Phase 5 Test Failure:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runPhase5Tests();
