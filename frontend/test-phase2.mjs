import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://127.0.0.1:5173';
const EXECUTABLE_PATH = '/usr/bin/chromium';

const VALID_FILE = path.resolve('../backend/.tmp/envelope.json');
const TAMPERED_FILE = path.resolve('../backend/.tmp/envelope-tampered.json');

async function runPhase2Tests() {
  console.log('====================================================');
  console.log('           SSDCVE PHASE 2 E2E TEST SUITE            ');
  console.log('====================================================\n');

  if (!fs.existsSync(VALID_FILE)) {
    throw new Error(`Valid envelope file not found at ${VALID_FILE}`);
  }
  if (!fs.existsSync(TAMPERED_FILE)) {
    throw new Error(`Tampered envelope file not found at ${TAMPERED_FILE}`);
  }

  const browser = await chromium.launch({
    executablePath: EXECUTABLE_PATH,
    headless: true,
  });

  const context = await browser.newContext({
    acceptDownloads: true,
  });
  const page = await context.newPage();

  const results = {
    validUploadProof: null,
    tamperedUploadProof: null,
    verifyByIdProof: null,
    batchAndCsvProof: null,
    historyLoggedInProof: null,
  };

  try {
    // ------------------------------------------------------------------
    // TEST 1: Public Upload-Verify with VALID Envelope (without login)
    // ------------------------------------------------------------------
    console.log('[TEST 1] Public Upload-Verify with VALID Envelope (no login):');
    await page.goto(`${BASE_URL}/verify`);
    await page.waitForSelector('text=Verify Digital Credential');

    const fileInput = await page.locator('input[type="file"]');
    
    // Setting input files automatically triggers handleUploadVerify in PublicVerifyPage
    const [validVerifyResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/verifier/verify') && res.request().method() === 'POST'),
      fileInput.setInputFiles(VALID_FILE),
    ]);

    const validVerifyStatus = validVerifyResponse.status();
    const validVerifyJson = await validVerifyResponse.json();
    console.log(`  -> POST /api/verifier/verify returned HTTP ${validVerifyStatus}`);
    console.log(`  -> API Status: ${validVerifyJson.status}, Valid: ${validVerifyJson.valid}, CredentialNumber: ${validVerifyJson.credentialNumber}`);

    // Wait for Result Card in DOM
    await page.waitForSelector('text=Certificate Valid & Authentic');
    const headline = await page.locator('h2:has-text("Certificate Valid & Authentic")').textContent();
    const credNumBadge = await page.locator('span:has-text("SSD-CVE-")').first().textContent();
    const statusBadge = await page.locator('span:has-text("VALID")').first().textContent();
    const issuerName = await page.locator('text=Test University').first().textContent();

    console.log(`  -> Headline rendered: "${headline?.trim()}"`);
    console.log(`  -> Credential Number badge: "${credNumBadge?.trim()}"`);
    console.log(`  -> Status badge: "${statusBadge?.trim()}"`);
    console.log(`  -> Issuer: "${issuerName?.trim()}"\n`);

    results.validUploadProof = {
      httpStatus: validVerifyStatus,
      status: validVerifyJson.status,
      valid: validVerifyJson.valid,
      credentialNumber: validVerifyJson.credentialNumber,
      headline: headline?.trim(),
      issuerName: issuerName?.trim(),
    };

    // ------------------------------------------------------------------
    // TEST 2: Public Upload-Verify with TAMPERED Envelope (without login)
    // ------------------------------------------------------------------
    console.log('[TEST 2] Public Upload-Verify with TAMPERED Envelope (no login):');
    // Click "Verify Another File"
    await page.click('button:has-text("Verify Another File")');
    await page.waitForSelector('text=Select Envelope JSON File');

    const [tamperedVerifyResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/verifier/verify') && res.request().method() === 'POST'),
      page.locator('input[type="file"]').setInputFiles(TAMPERED_FILE),
    ]);

    const tamperedVerifyStatus = tamperedVerifyResponse.status();
    const tamperedVerifyJson = await tamperedVerifyResponse.json();
    console.log(`  -> POST /api/verifier/verify returned HTTP ${tamperedVerifyStatus}`);
    console.log(`  -> API Status: ${tamperedVerifyJson.status}, Valid: ${tamperedVerifyJson.valid}, Reason: "${tamperedVerifyJson.reason}"`);

    // Wait for Tampered Result Card in DOM
    await page.waitForSelector('text=Certificate Verification Failed: Tampered Envelope');
    const tamperedHeadline = await page.locator('h2:has-text("Certificate Verification Failed: Tampered Envelope")').textContent();
    const tamperedReason = await page.locator('p:has-text("Content hash mismatch")').textContent();
    const tamperedStatusBadge = await page.locator('span:has-text("TAMPERED")').first().textContent();

    console.log(`  -> Headline rendered: "${tamperedHeadline?.trim()}"`);
    console.log(`  -> Status badge: "${tamperedStatusBadge?.trim()}"`);
    console.log(`  -> Reason text: "${tamperedReason?.trim()}"\n`);

    results.tamperedUploadProof = {
      httpStatus: tamperedVerifyStatus,
      status: tamperedVerifyJson.status,
      valid: tamperedVerifyJson.valid,
      credentialNumber: tamperedVerifyJson.credentialNumber,
      reason: tamperedVerifyJson.reason,
      headline: tamperedHeadline?.trim(),
    };

    // ------------------------------------------------------------------
    // TEST 3: Verify-by-ID route /verify/:credentialId (Public QR target)
    // ------------------------------------------------------------------
    // Retrieve active credential ID from database matching envelope
    const envelopeData = JSON.parse(fs.readFileSync(VALID_FILE, 'utf8'));
    let credId = '5bcffe7f-9f6b-4fb4-a7a7-5a9400cb7c79';
    try {
      const { execSync } = await import('node:child_process');
      const dbId = execSync(`docker exec ssdcve-postgres psql -U ssdcve -d ssdcve -t -A -c "SELECT id FROM credentials WHERE credential_number='${envelopeData.credential.credentialNumber}';"`, { encoding: 'utf8' }).trim();
      if (dbId) credId = dbId;
    } catch {
      // fallback to known active
    }
    console.log(`[TEST 3] Verify-by-ID route /verify/${credId}:`);
    
    const [getByIdResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes(`/api/verifier/verify/${credId}`)),
      page.goto(`${BASE_URL}/verify/${credId}`),
    ]);

    const getByIdStatus = getByIdResponse.status();
    const getByIdJson = await getByIdResponse.json();
    console.log(`  -> GET /api/verifier/verify/${credId} returned HTTP ${getByIdStatus}`);
    console.log(`  -> Status: ${getByIdJson.status}, Valid: ${getByIdJson.valid}, CredentialNumber: ${getByIdJson.credentialNumber}`);

    await page.waitForSelector('text=Certificate Valid & Authentic');
    const byIdHeadline = await page.locator('h2:has-text("Certificate Valid & Authentic")').textContent();
    console.log(`  -> Headline rendered: "${byIdHeadline?.trim()}"\n`);

    results.verifyByIdProof = {
      httpStatus: getByIdStatus,
      status: getByIdJson.status,
      valid: getByIdJson.valid,
      credentialNumber: getByIdJson.credentialNumber,
      headline: byIdHeadline?.trim(),
    };

    // ------------------------------------------------------------------
    // TEST 4: Batch Verification & CSV Export (/verify/batch)
    // ------------------------------------------------------------------
    console.log('[TEST 4] Batch multi-file input & CSV export:');
    await page.goto(`${BASE_URL}/verify/batch`);
    await page.waitForSelector('text=Batch Credential Verification');

    const batchFileInput = await page.locator('input[type="file"]');
    await batchFileInput.setInputFiles([VALID_FILE, TAMPERED_FILE]);

    await page.waitForSelector('button:has-text("Run Batch Verification")');
    const [batchResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/verifier/verify/batch') && res.request().method() === 'POST'),
      page.click('button:has-text("Run Batch Verification")'),
    ]);

    const batchStatus = batchResponse.status();
    const batchJson = await batchResponse.json();
    console.log(`  -> POST /api/verifier/verify/batch returned HTTP ${batchStatus}`);
    console.log(`  -> Total: ${batchJson.total}, Valid: ${batchJson.validCount}, Failed: ${batchJson.invalidCount}`);

    // Wait for the results table
    await page.waitForSelector('table');
    const rows = await page.locator('tbody tr').count();
    console.log(`  -> Table rendered with ${rows} rows.`);

    // Test Export button to download CSV via POST /api/verifier/verify/batch/csv
    console.log('  -> Clicking Export CSV Report...');
    const [download, csvResponse] = await Promise.all([
      page.waitForEvent('download'),
      page.waitForResponse((res) => res.url().includes('/api/verifier/verify/batch/csv')),
      page.click('button:has-text("Export CSV Report")'),
    ]);

    const csvStatus = csvResponse.status();
    const suggestedFilename = download.suggestedFilename();
    const downloadPath = await download.path();
    const csvContent = fs.readFileSync(downloadPath, 'utf-8');

    console.log(`  -> CSV API HTTP: ${csvStatus}`);
    console.log(`  -> Downloaded file: ${suggestedFilename}`);
    console.log(`  -> CSV Content preview:\n${csvContent.trim()}\n`);

    results.batchAndCsvProof = {
      batchStatus,
      total: batchJson.total,
      validCount: batchJson.validCount,
      invalidCount: batchJson.invalidCount,
      csvFilename: suggestedFilename,
      csvLines: csvContent.trim().split('\n').length,
      csvPreview: csvContent.trim(),
    };

    // ------------------------------------------------------------------
    // TEST 5: Logged-in History table (/verifier/history)
    // ------------------------------------------------------------------
    console.log('[TEST 5] Logged-in only: GET /api/verifier/history table:');
    
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'verifier@test.edu');
    await page.fill('input[name="password"]', 'TestPass-123!');

    const [loginResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/login')),
      page.click('button[type="submit"]'),
    ]);
    console.log(`  -> Logged in as verifier@test.edu (HTTP ${loginResponse.status()})`);

    // Perform an authenticated verification so an entry gets stored in verifier's history
    console.log('  -> Performing an authenticated verification to ensure history entry exists...');
    await page.goto(`${BASE_URL}/verify`);
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/verifier/verify')),
      page.locator('input[type="file"]').setInputFiles(VALID_FILE),
    ]);
    console.log('  -> Authenticated verification completed.');

    // Now navigate to /verifier/history
    console.log('  -> Navigating to /verifier/history...');
    const [historyResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/verifier/history')),
      page.goto(`${BASE_URL}/verifier/history`),
    ]);

    const historyStatus = historyResponse.status();
    const historyJson = await historyResponse.json();
    console.log(`  -> GET /api/verifier/history returned HTTP ${historyStatus}`);
    console.log(`  -> Total history records: ${historyJson.totalElements}`);

    await page.waitForSelector('table');
    const historyRows = await page.locator('tbody tr').count();
    const firstRowText = await page.locator('tbody tr').first().innerText();
    console.log(`  -> History table rendered with ${historyRows} row(s)`);
    console.log(`  -> First row summary: ${firstRowText.replace(/\n+/g, ' | ')}\n`);

    results.historyLoggedInProof = {
      historyStatus,
      totalElements: historyJson.totalElements,
      tableRows: historyRows,
      firstRow: firstRowText.replace(/\n+/g, ' | '),
    };

    console.log('====================================================');
    console.log('           ALL PHASE 2 PROOFS SUCCEEDED!            ');
    console.log('====================================================');
    console.log(JSON.stringify(results, null, 2));

  } catch (err) {
    console.error('Phase 2 Test Failure:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runPhase2Tests();
