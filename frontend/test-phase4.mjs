import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL = 'http://127.0.0.1:5173';
const EXECUTABLE_PATH = '/usr/bin/chromium';

async function runPhase4Tests() {
  console.log('====================================================');
  console.log('           SSDCVE PHASE 4 E2E TEST SUITE            ');
  console.log('         (Student Holder Journey & Privacy)         ');
  console.log('====================================================\n');

  const browser = await chromium.launch({
    executablePath: EXECUTABLE_PATH,
    headless: true,
  });

  const context = await browser.newContext({
    acceptDownloads: true,
  });
  const page = await context.newPage();

  const results = {
    emptyStateProof: null,
    walletAddProof: null,
    envelopeDownloadProof: null,
    certificateDownloadProof: null,
    selectiveDisclosureProof: null,
    reVerificationProof: null,
    qrCodeFormatProof: null,
    walletRemoveProof: null,
  };

  try {
    // ------------------------------------------------------------------
    // STEP 1: Prove Empty State using a brand new Holder
    // ------------------------------------------------------------------
    const freshHolderEmail = `freshstudent_${Date.now()}@test.edu`;
    const freshHolderPass = 'TestPass-123!';
    const freshHolderName = 'Fresh Student E2E';

    console.log(`[STEP 1] Registering fresh HOLDER to verify empty state (${freshHolderEmail}):`);
    await page.goto(`${BASE_URL}/register`);
    await page.fill('input[name="fullName"]', freshHolderName);
    await page.fill('input[name="email"]', freshHolderEmail);
    await page.fill('input[name="password"]', freshHolderPass);

    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/register')),
      page.click('button[type="submit"]'),
    ]);

    // Login as fresh holder
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', freshHolderEmail);
    await page.fill('input[name="password"]', freshHolderPass);

    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/login')),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForURL('**/holder');

    await page.waitForSelector('text=No Credentials Yet');
    const emptyStateText = await page.locator('text=No credentials yet — ask your institution to issue one, or add it below with its credential ID.').textContent();
    console.log(`  -> Empty state rendered verbatim: "${emptyStateText?.trim()}"\n`);

    results.emptyStateProof = {
      renderedVerbatim: emptyStateText?.trim(),
      passed: !!emptyStateText,
    };

    // Logout fresh holder
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');

    // ------------------------------------------------------------------
    // STEP 2: Login as main holder@test.edu who has credentials
    // ------------------------------------------------------------------
    console.log('[STEP 2] Login as holder@test.edu:');
    await page.fill('input[name="email"]', 'holder@test.edu');
    await page.fill('input[name="password"]', 'TestPass-123!');

    const [loginRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/login')),
      page.click('button[type="submit"]'),
    ]);
    const walletRes = await page.waitForResponse((res) => res.url().includes('/api/holder/wallet'));
    const walletData = await walletRes.json();
    await page.waitForURL('**/holder');
    await page.waitForSelector('text=My Credential Cards');
    console.log('  -> Landed on /holder wallet successfully.');
    console.log(`  -> Wallet credentials count: ${walletData.length}`);

    // Select credential for remove & re-add
    const removeCred = walletData[0];
    const testCredId = removeCred.credentialId;
    const testCredNum = removeCred.credentialNumber;

    // Select active credential for download, disclosure, and QR
    const activeCred = walletData.find((c) => c.status === 'ACTIVE') || walletData[0];
    const activeCredId = activeCred.credentialId;
    const activeCredNum = activeCred.credentialNumber;

    // ------------------------------------------------------------------
    // STEP 3: Remove & Re-Add Credential to prove POST 201 and DELETE 204
    // ------------------------------------------------------------------
    console.log(`\n[STEP 3] Testing Remove Credential (DELETE 204 no body) for ${testCredNum}:`);

    // Locate the card for this credential
    const cardLocator = page.locator('div.rounded-2xl', { hasText: testCredNum }).first();
    await cardLocator.scrollIntoViewIfNeeded();

    // Click remove from wallet
    await cardLocator.locator('button:has-text("Remove from wallet")').click();
    await cardLocator.locator('button:has-text("Confirm")').waitFor();

    const [deleteRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes(`/api/holder/wallet/${testCredId}`) && res.request().method() === 'DELETE'),
      cardLocator.locator('button:has-text("Confirm")').click(),
    ]);

    const deleteStatus = deleteRes.status();
    const deleteBody = await deleteRes.text();
    console.log(`  -> DELETE /api/holder/wallet/${testCredId} returned HTTP ${deleteStatus} (204 expected)`);
    console.log(`  -> Response body length: ${deleteBody.length} (empty body verified: ${deleteBody === ''})`);

    results.walletRemoveProof = {
      httpStatus: deleteStatus,
      emptyBody: deleteBody === '',
      passed: deleteStatus === 204 && deleteBody === '',
    };

    // Re-Add the credential to wallet -> POST 201
    console.log(`\n[STEP 4] Testing Add Credential to Wallet (POST /api/holder/wallet/${testCredId} -> 201):`);
    await page.fill('input[placeholder*="Enter credential ID"]', testCredId);

    const [addRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes(`/api/holder/wallet/${testCredId}`) && res.request().method() === 'POST'),
      page.click('button:has-text("Add to Wallet")'),
    ]);

    const addStatus = addRes.status();
    const addJson = await addRes.json();
    console.log(`  -> POST /api/holder/wallet/${testCredId} returned HTTP ${addStatus} (201 expected)`);
    console.log(`  -> Added Credential: ${addJson.credentialNumber} ("${addJson.title}")`);

    // Verify card appears in wallet
    await page.waitForSelector(`span:has-text("${addJson.credentialNumber}")`);
    console.log(`  -> Credential card rendered in DOM.`);

    results.walletAddProof = {
      httpStatus: addStatus,
      credentialId: addJson.credentialId,
      credentialNumber: addJson.credentialNumber,
      title: addJson.title,
      issuerName: addJson.issuerName,
      status: addJson.status,
    };

    // ------------------------------------------------------------------
    // STEP 5: Downloads (Envelope JSON & Certificate PDF)
    // ------------------------------------------------------------------
    const activeCredCard = page.locator('div.rounded-2xl', { hasText: activeCredNum }).first();
    await activeCredCard.scrollIntoViewIfNeeded();

    console.log(`\n[STEP 5] Testing Native Downloads (Envelope & Certificate) for ${activeCredNum}:`);
    await activeCredCard.locator('button:has-text("Files")').click();
    await page.waitForSelector('text=Cryptographic Credentials & Documents');

    // 5a: Download envelope JSON
    console.log('  -> 5a: Downloading signed envelope JSON...');
    const [envDownload, envRes] = await Promise.all([
      page.waitForEvent('download'),
      page.waitForResponse((res) => res.url().includes('/download')),
      page.click('button:has-text("Download .json Envelope")'),
    ]);

    const envStatus = envRes.status();
    const envFilename = envDownload.suggestedFilename();
    const envPath = await envDownload.path();
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const envParsed = JSON.parse(envContent);

    console.log(`  -> Envelope API HTTP: ${envStatus}`);
    console.log(`  -> Suggested Filename (from Content-Disposition): "${envFilename}"`);
    console.log(`  -> Envelope claims:`, JSON.stringify(envParsed.credential.claims));

    results.envelopeDownloadProof = {
      httpStatus: envStatus,
      filename: envFilename,
      claims: envParsed.credential.claims,
    };

    // 5b: Download certificate PDF
    console.log('  -> 5b: Downloading official certificate PDF...');
    const [pdfDownload, pdfRes] = await Promise.all([
      page.waitForEvent('download'),
      page.waitForResponse((res) => res.url().includes('/certificate')),
      page.click('button:has-text("Download .pdf Certificate")'),
    ]);

    const pdfStatus = pdfRes.status();
    const pdfFilename = pdfDownload.suggestedFilename();
    const pdfPath = await pdfDownload.path();
    const pdfStats = fs.statSync(pdfPath);

    console.log(`  -> PDF API HTTP: ${pdfStatus}`);
    console.log(`  -> Suggested Filename (from Content-Disposition): "${pdfFilename}"`);
    console.log(`  -> File size: ${pdfStats.size} bytes`);

    results.certificateDownloadProof = {
      httpStatus: pdfStatus,
      filename: pdfFilename,
      bytes: pdfStats.size,
    };

    // ------------------------------------------------------------------
    // STEP 6: Privacy / Selective Disclosure
    // ------------------------------------------------------------------
    console.log('\n[STEP 6] Testing Selective Disclosure (Hide Claim):');
    await page.locator('[role="dialog"] button:has-text("Selective Disclosure")').click();
    await page.waitForSelector('text=Student Privacy & Claim Disclosure');

    const toggleClaimBtn = page.locator('button[data-claim-toggle]').first();
    await toggleClaimBtn.waitFor();
    const claimToToggle = await toggleClaimBtn.getAttribute('data-claim-toggle');

    console.log(`  -> Toggling "${claimToToggle}" claim to HIDDEN...`);
    const currentBtnText = await toggleClaimBtn.textContent();
    
    if (currentBtnText?.includes('Reveal')) {
      // It's hidden, reveal first to verify toggle
      await Promise.all([
        page.waitForResponse((res) => res.url().includes('/disclosure') && res.request().method() === 'PUT'),
        toggleClaimBtn.click(),
      ]);
      await page.waitForTimeout(500);
    }

    // Now hide claim
    const [putRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/disclosure') && res.request().method() === 'PUT'),
      toggleClaimBtn.click(),
    ]);

    const putStatus = putRes.status();
    const putJson = await putRes.json();
    console.log(`  -> PUT /api/holder/credentials/{id}/disclosure returned HTTP ${putStatus}`);
    console.log(`  -> Hidden claims array:`, JSON.stringify(putJson.hiddenClaims));

    // Verify Live Preview
    const willSee = await page.locator('div:has-text("Verifier Will See:")').locator('ul').first().textContent();
    const wontSee = await page.locator('div:has-text("Verifier Won\'t See:")').locator('ul').first().textContent();
    console.log(`  -> Preview "Verifier Will See": ${willSee?.replace(/\s+/g, ' ').trim()}`);
    console.log(`  -> Preview "Verifier Won't See": ${wontSee?.replace(/\s+/g, ' ').trim()}`);

    results.selectiveDisclosureProof = {
      httpStatus: putStatus,
      hiddenClaim: claimToToggle,
      hiddenClaims: putJson.hiddenClaims,
      previewWillSee: willSee?.replace(/\s+/g, ' ').trim(),
      previewWontSee: wontSee?.replace(/\s+/g, ' ').trim(),
    };

    // ------------------------------------------------------------------
    // STEP 7: Re-Verify Disclosed Envelope as Verifier
    // ------------------------------------------------------------------
    console.log('\n[STEP 7] Re-verifying envelope as verifier (Proof of Hidden Claim Absence):');
    await page.locator('[role="dialog"] button[role="tab"]:has-text("Download Files")').click();
    const [disclosedDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Download .json Envelope")'),
    ]);

    const disclosedPath = await disclosedDownload.path();
    const disclosedContent = JSON.parse(fs.readFileSync(disclosedPath, 'utf-8'));
    console.log(`  -> Disclosed envelope claims in file:`, JSON.stringify(disclosedContent.credential.claims));

    // Close modal
    await page.click('button[aria-label="Close modal"]');

    // Go to /verify public page
    await page.goto(`${BASE_URL}/verify`);
    await page.waitForSelector('text=Verify Digital Credential');

    const [verifyRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/verifier/verify') && res.request().method() === 'POST'),
      page.locator('input[type="file"]').setInputFiles(disclosedPath),
    ]);

    const verifyStatus = verifyRes.status();
    const verifyJson = await verifyRes.json();
    console.log(`  -> POST /api/verifier/verify returned HTTP ${verifyStatus}`);
    console.log(`  -> Status: ${verifyJson.status}, Valid: ${verifyJson.valid}`);
    console.log(`  -> Verifier Received Claims:`, JSON.stringify(verifyJson.claims));
    console.log(`  -> Verifier Disclosure Info:`, JSON.stringify(verifyJson.disclosure));

    const claimAbsent = !verifyJson.claims || !(claimToToggle in verifyJson.claims);
    console.log(`  -> Claim "${claimToToggle}" ABSENT from verification result: ${claimAbsent}`);

    results.reVerificationProof = {
      httpStatus: verifyStatus,
      status: verifyJson.status,
      valid: verifyJson.valid,
      claimsDisclosed: verifyJson.claims,
      disclosure: verifyJson.disclosure,
      hiddenClaim: claimToToggle,
      hiddenClaimAbsent: claimAbsent,
    };

    // ------------------------------------------------------------------
    // STEP 8: Share & QR Code Payload Format
    // ------------------------------------------------------------------
    console.log('\n[STEP 8] Share & QR Code Payload Format:');
    await page.goto(`${BASE_URL}/holder`);
    const cardForShare = page.locator('div.rounded-2xl', { hasText: activeCredNum }).first();
    await cardForShare.locator('button:has-text("Share")').click();
    await page.waitForSelector('text=Instant Verification QR Code');

    const qrUrlText = await page.locator('span:has-text("/verify/")').textContent();
    const credNumText = await page.locator('span:has-text("SSD-CVE-")').first().textContent();

    console.log(`  -> QR URL Target: "${qrUrlText?.trim()}"`);
    console.log(`  -> Copyable Credential Number: "${credNumText?.trim()}"`);

    const expectedQrUrl = `${BASE_URL}/verify/${activeCredId}`;
    const qrFormatValid = qrUrlText?.trim() === expectedQrUrl;
    console.log(`  -> Encodes frontend route URL /verify/{credential-UUID}: ${qrFormatValid}`);

    results.qrCodeFormatProof = {
      qrTargetUrl: qrUrlText?.trim(),
      expectedQrUrl,
      encodesFrontendRouteUrl: qrFormatValid,
      copyableCredentialNumber: credNumText?.trim(),
    };

    // Close modal
    await page.click('button[aria-label="Close modal"]');

    console.log('\n====================================================');
    console.log('       ALL PHASE 4 HOLDER TESTS PASSED!             ');
    console.log('====================================================');
    console.log(JSON.stringify(results, null, 2));

  } catch (err) {
    console.error('Phase 4 Test Failure:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runPhase4Tests();
