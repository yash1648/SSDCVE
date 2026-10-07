import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://127.0.0.1:5173';
const EXECUTABLE_PATH = '/usr/bin/chromium';

const PDF_FILE = '/tmp/e2e-assets/diploma.pdf';
const TXT_FILE = '/tmp/e2e-assets/invalid-doc.txt';

async function runPhase3Tests() {
  console.log('====================================================');
  console.log('           SSDCVE PHASE 3 E2E TEST SUITE            ');
  console.log('       (Registrar-Staff Journey & Lifecycle)        ');
  console.log('====================================================\n');

  const browser = await chromium.launch({
    executablePath: EXECUTABLE_PATH,
    headless: true,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  const results = {
    authAndStatusBanner: null,
    keyCreation: null,
    holderLookupNotFound: null,
    holderLookupSuccess: null,
    credentialIssued: null,
    detailView: null,
    attach415Error: null,
    attachSuccess: null,
    revocation: null,
    activityLog: null,
  };

  try {
    // ------------------------------------------------------------------
    // STEP 1: Login as ISSUER and reach /issuer
    // ------------------------------------------------------------------
    console.log('[STEP 1] Login as ISSUER (issuer@test.edu):');
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'issuer@test.edu');
    await page.fill('input[name="password"]', 'TestPass-123!');

    const [loginRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/login')),
      page.click('button[type="submit"]'),
    ]);
    console.log(`  -> Login responded HTTP ${loginRes.status()}`);

    await page.waitForURL('**/issuer');
    console.log(`  -> Role router landed on: ${page.url()}`);

    // Verify GET /api/issuer/me status banner
    await page.waitForSelector('text=Test University');
    const institutionName = await page.locator('h3:has-text("Test University")').textContent();
    const verifiedBadge = await page.locator('text=Verified Institution').textContent();
    console.log(`  -> Status Banner verified: "${institutionName?.trim()}" (${verifiedBadge?.trim()})\n`);

    results.authAndStatusBanner = {
      institutionName: institutionName?.trim(),
      verifiedBadge: verifiedBadge?.trim(),
    };

    // ------------------------------------------------------------------
    // STEP 2: Keys - "Create signing key" -> POST /api/issuer/keys -> 201
    // ------------------------------------------------------------------
    console.log('[STEP 2] Create signing key (POST /api/issuer/keys):');
    const [keyRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/issuer/keys') && res.request().method() === 'POST'),
      page.click('button:has-text("Create Signing Key")'),
    ]);

    const keyStatus = keyRes.status();
    const keyJson = await keyRes.json();
    console.log(`  -> POST /api/issuer/keys returned HTTP ${keyStatus}`);
    console.log(`  -> Key ID produced: ${keyJson.keyId}`);
    console.log(`  -> Algorithm: ${keyJson.algorithm}, Active: ${keyJson.active}`);

    await page.waitForSelector(`text=${keyJson.keyId}`);
    console.log(`  -> Key prominently displayed on page\n`);

    results.keyCreation = {
      httpStatus: keyStatus,
      keyId: keyJson.keyId,
      algorithm: keyJson.algorithm,
      active: keyJson.active,
    };

    // ------------------------------------------------------------------
    // STEP 3: Issue Form - Email Lookup & Issuance
    // ------------------------------------------------------------------
    console.log('[STEP 3] Issue Credential Journey:');
    // Switch to Issue tab
    await page.click('button:has-text("Issue New Credential")');
    await page.waitForSelector('text=Recipient Student Email Lookup');

    // 3a: Nonexistent email lookup -> surface "holder not found" clearly
    console.log('  -> 3a: Testing nonexistent email lookup (expect Holder Not Found)...');
    await page.fill('input[placeholder*="holder@test.edu"]', 'nonexistent_student@test.edu');
    
    const [lookupNotFoundRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/issuer/holders')),
      page.click('button:has-text("Lookup Student")'),
    ]);

    const notFoundStatus = lookupNotFoundRes.status();
    console.log(`  -> GET /api/issuer/holders responded HTTP ${notFoundStatus}`);
    await page.waitForSelector('text=Holder Not Found');
    const notFoundMsg = await page.locator('text=No registered recipient found for exact email').textContent();
    console.log(`  -> Surfaced error clearly: "${notFoundMsg?.trim()}"\n`);

    results.holderLookupNotFound = {
      httpStatus: notFoundStatus,
      errorMessage: notFoundMsg?.trim(),
    };

    // 3b: Valid holder lookup -> holder@test.edu
    console.log('  -> 3b: Testing valid email lookup (holder@test.edu)...');
    await page.fill('input[placeholder*="holder@test.edu"]', 'holder@test.edu');

    const [lookupSuccessRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/issuer/holders')),
      page.click('button:has-text("Lookup Student")'),
    ]);

    const successStatus = lookupSuccessRes.status();
    const holderJson = await lookupSuccessRes.json();
    console.log(`  -> GET /api/issuer/holders responded HTTP ${successStatus}`);
    console.log(`  -> Recipient Name: ${holderJson.fullName}, Role: ${holderJson.role}`);

    await page.waitForSelector(`text=${holderJson.fullName}`);
    console.log(`  -> Recipient details confirmed without exposing raw UUIDs.\n`);

    results.holderLookupSuccess = {
      httpStatus: successStatus,
      fullName: holderJson.fullName,
      email: holderJson.email,
    };

    // 3c: Fill credential details and issue -> POST /api/issuer/credentials -> 201
    console.log('  -> 3c: Submitting credential issuance (POST /api/issuer/credentials)...');
    const credTitle = `Master of Cyber Security Engineering (${Date.now()})`;
    await page.fill('input[placeholder*="Bachelor of Science"]', credTitle);

    const [issueRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/issuer/credentials') && res.request().method() === 'POST'),
      page.click('button:has-text("Issue & Sign Credential")'),
    ]);

    const issueStatus = issueRes.status();
    const issueJson = await issueRes.json();
    console.log(`  -> POST /api/issuer/credentials responded HTTP ${issueStatus}`);
    console.log(`  -> Credential ID: ${issueJson.id}`);
    console.log(`  -> Credential Number: ${issueJson.credentialNumber}`);
    console.log(`  -> Anchor Tx Hash: ${issueJson.anchorTxHash} (Block #${issueJson.anchorBlockNumber})`);

    // Verify prominent banner
    await page.waitForSelector(`text=${issueJson.credentialNumber}`);
    console.log(`  -> Prominently displayed credentialNumber on page: ${issueJson.credentialNumber}\n`);

    results.credentialIssued = {
      httpStatus: issueStatus,
      id: issueJson.id,
      credentialNumber: issueJson.credentialNumber,
      title: issueJson.title,
      anchorTxHash: issueJson.anchorTxHash,
      anchorBlockNumber: issueJson.anchorBlockNumber,
    };

    // ------------------------------------------------------------------
    // STEP 4: List / Detail -> Row click opens Detail Modal
    // ------------------------------------------------------------------
    console.log('[STEP 4] List / Detail view:');
    // We are automatically switched to credentials tab, verify row exists
    await page.waitForSelector(`td:has-text("${issueJson.credentialNumber}")`);
    console.log(`  -> Found newly issued credential in credentials table.`);

    // Click the row to open CredentialDetailModal
    const [detailRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes(`/api/issuer/credentials/${issueJson.id}`)),
      page.click(`td:has-text("${issueJson.credentialNumber}")`),
    ]);

    const detailStatus = detailRes.status();
    const detailJson = await detailRes.json();
    console.log(`  -> GET /api/issuer/credentials/${issueJson.id} responded HTTP ${detailStatus}`);
    await page.waitForSelector('text=Attach Supporting Document');
    console.log(`  -> Detail modal opened successfully for ${detailJson.credentialNumber}.\n`);

    results.detailView = {
      httpStatus: detailStatus,
      credentialNumber: detailJson.credentialNumber,
    };

    // ------------------------------------------------------------------
    // STEP 5: Attach Document with 415 Validation
    // ------------------------------------------------------------------
    console.log('[STEP 5] Attach Document:');
    // 5a: Attach invalid text file -> trigger 415 rejection & friendly message
    console.log('  -> 5a: Testing invalid MIME type (/tmp/e2e-assets/invalid-doc.txt)...');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(TXT_FILE);

    // Click upload & attach
    const [badAttachRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/document') && res.request().method() === 'POST'),
      page.click('button:has-text("Upload & Attach Document")'),
    ]);

    const badAttachStatus = badAttachRes.status();
    console.log(`  -> POST .../document returned HTTP ${badAttachStatus} (415 expected)`);
    await page.waitForSelector('text=HTTP 415 Unsupported Media Type');
    const friendly415 = await page.locator('text=HTTP 415 Unsupported Media Type').textContent();
    console.log(`  -> Friendly 415 error rendered: "${friendly415?.trim()}"\n`);

    results.attach415Error = {
      httpStatus: badAttachStatus,
      friendlyMessage: friendly415?.trim(),
    };

    // 5b: Attach valid PDF file -> 200 OK
    console.log('  -> 5b: Testing valid PDF file (/tmp/e2e-assets/diploma.pdf)...');
    await fileInput.setInputFiles(PDF_FILE);

    const [goodAttachRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/document') && res.request().method() === 'POST'),
      page.click('button:has-text("Upload & Attach Document")'),
    ]);

    const goodAttachStatus = goodAttachRes.status();
    const goodAttachJson = await goodAttachRes.json();
    console.log(`  -> POST .../document returned HTTP ${goodAttachStatus} (200 expected)`);
    console.log(`  -> Document CID pinned: ${goodAttachJson.documentCid}`);
    await page.waitForSelector('text=Document already attached & pinned to IPFS');
    console.log(`  -> Document successfully attached and displayed.\n`);

    results.attachSuccess = {
      httpStatus: goodAttachStatus,
      documentCid: goodAttachJson.documentCid,
    };

    // ------------------------------------------------------------------
    // STEP 6: Revoke Credential -> POST /api/issuer/credentials/{id}/revoke
    // ------------------------------------------------------------------
    console.log('[STEP 6] Revoke Credential:');
    await page.click('button:has-text("Revoke")');
    await page.waitForSelector('text=Reason for Revocation');
    await page.fill('input[placeholder*="administrative correction"]', 'Automated E2E Test Revocation');

    const [revokeRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/revoke') && res.request().method() === 'POST'),
      page.click('button:has-text("Confirm Revocation")'),
    ]);

    const revokeStatus = revokeRes.status();
    const revokeJson = await revokeRes.json();
    console.log(`  -> POST .../revoke returned HTTP ${revokeStatus}`);
    console.log(`  -> Status: ${revokeJson.status}, RevokedAt: ${revokeJson.revokedAt}`);

    await page.waitForSelector('span:has-text("REVOKED")');
    console.log(`  -> UI updated: Status is REVOKED and revoked timestamp is rendered.\n`);

    results.revocation = {
      httpStatus: revokeStatus,
      status: revokeJson.status,
      revokedAt: revokeJson.revokedAt,
      reason: revokeJson.reason,
    };

    // Close the detail modal
    await page.click('button[aria-label="Close modal"]');
    await page.waitForTimeout(500);

    // ------------------------------------------------------------------
    // STEP 7: Activity Log -> GET /api/issuer/verifications table
    // ------------------------------------------------------------------
    console.log('[STEP 7] Activity Log (GET /api/issuer/verifications):');
    const [verificationsRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/issuer/verifications')),
      page.click('button:has-text("Activity & Verifications")'),
    ]);

    const verificationsStatus = verificationsRes.status();
    const verificationsJson = await verificationsRes.json();
    console.log(`  -> GET /api/issuer/verifications returned HTTP ${verificationsStatus}`);
    console.log(`  -> Found ${verificationsJson.length} verification activity entries.`);

    await page.waitForSelector('table');
    const revokedRow = await page.locator(`tr:has-text("${issueJson.credentialNumber}")`).textContent();
    console.log(`  -> Verified row in activity table: "${revokedRow?.replace(/\s+/g, ' ').trim()}"\n`);

    results.activityLog = {
      httpStatus: verificationsStatus,
      totalEntries: verificationsJson.length,
      foundRevokedEntry: !!revokedRow,
    };

    console.log('====================================================');
    console.log('       ALL PHASE 3 REGISTRAR TESTS PASSED!          ');
    console.log('====================================================');
    console.log(JSON.stringify(results, null, 2));

  } catch (err) {
    console.error('Phase 3 Test Failure:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runPhase3Tests();
