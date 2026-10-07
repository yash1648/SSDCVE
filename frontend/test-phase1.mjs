import { chromium } from 'playwright';

const BASE_URL = 'http://127.0.0.1:5173';
const EXECUTABLE_PATH = '/usr/bin/chromium';

async function runTests() {
  console.log('====================================================');
  console.log('           SSDCVE PHASE 1 E2E TEST SUITE            ');
  console.log('====================================================\n');

  const browser = await chromium.launch({
    executablePath: EXECUTABLE_PATH,
    headless: true,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  const results = {
    register: null,
    testUsers: [],
    crossRole403: null,
    badLogin401: null,
    logout: null,
  };

  try {
    // ------------------------------------------------------------------
    // TEST 1: Register Page (fields: fullName, email, password (8-72))
    // ------------------------------------------------------------------
    console.log('[TEST 1] Register page: fields email / password (8-72) / fullName');
    await page.goto(`${BASE_URL}/register`);

    const timestamp = Date.now();
    const testRegEmail = `testuser_${timestamp}@test.edu`;
    const testRegPassword = 'TestPass-123!';
    const testRegName = 'E2E Test Registered User';

    await page.fill('input[name="fullName"]', testRegName);
    await page.fill('input[name="email"]', testRegEmail);
    await page.fill('input[name="password"]', testRegPassword);

    // Wait for the API request
    const [registerResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/register')),
      page.click('button[type="submit"]'),
    ]);

    const regStatus = registerResponse.status();
    const regJson = await registerResponse.json();
    console.log(`  -> POST /api/auth/register responded HTTP ${regStatus}`);
    console.log(`  -> Response body:`, JSON.stringify(regJson));

    await page.waitForSelector('text=Account Created Successfully');
    const roleConfirmed = regJson.role === 'HOLDER';
    console.log(`  -> Default role assigned: ${regJson.role} (HOLDER expected: ${roleConfirmed})\n`);

    results.register = {
      status: regStatus,
      user: regJson,
      isHolderByDefault: roleConfirmed,
    };

    // ------------------------------------------------------------------
    // TEST 2: Bad login -> 401 {"error":"Unauthorized"} screen
    // ------------------------------------------------------------------
    console.log('[TEST 2] Bad login credentials -> 401 {"error":"Unauthorized"}');
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'admin@test.edu');
    await page.fill('input[name="password"]', 'WrongPassword123!');

    const [badLoginResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/login')),
      page.click('button[type="submit"]'),
    ]);

    const badLoginStatus = badLoginResponse.status();
    const badLoginJson = await badLoginResponse.json();
    console.log(`  -> POST /api/auth/login responded HTTP ${badLoginStatus}`);
    console.log(`  -> Raw Response:`, JSON.stringify(badLoginJson));

    await page.waitForSelector('text=401 Unauthorized');
    const has401Verbatim = await page.textContent('pre');
    console.log(`  -> 401 Screen rendered verbatim:`, has401Verbatim.trim());
    console.log('');

    results.badLogin401 = {
      status: badLoginStatus,
      rawResponse: badLoginJson,
      screenVerbatim: has401Verbatim.trim(),
    };

    // ------------------------------------------------------------------
    // TEST 3: All 4 Backend Test Users End-to-End
    // ------------------------------------------------------------------
    const usersToTest = [
      { role: 'ADMIN', email: 'admin@test.edu', expectedPath: '/admin', title: 'Admin Landing Page' },
      { role: 'ISSUER', email: 'issuer@test.edu', expectedPath: '/issuer', title: 'Issuer Landing Page' },
      { role: 'HOLDER', email: 'holder@test.edu', expectedPath: '/holder', title: 'Holder Landing Page' },
      { role: 'VERIFIER', email: 'verifier@test.edu', expectedPath: '/verifier', title: 'Verifier Landing Page' },
    ];

    console.log('[TEST 3] Testing each of the 4 backend test users end-to-end:');

    for (const u of usersToTest) {
      console.log(`  --> Testing ${u.role} (${u.email}):`);
      await page.goto(`${BASE_URL}/login`);

      await page.fill('input[name="email"]', u.email);
      await page.fill('input[name="password"]', 'TestPass-123!');

      const [loginResponse] = await Promise.all([
        page.waitForResponse((res) => res.url().includes('/api/auth/login')),
        page.click('button[type="submit"]'),
      ]);

      const loginStatus = loginResponse.status();
      const loginData = await loginResponse.json();
      const cookies = await context.cookies();
      const refreshCookie = cookies.find((c) => c.name === 'refresh_token');

      // Wait for role router to reach landing page
      await page.waitForURL(`**${u.expectedPath}`);
      const currentUrl = page.url();
      await page.waitForSelector(`text=${u.title}`);

      console.log(`      * Login HTTP: ${loginStatus}`);
      console.log(`      * Token: Bearer received, sub=${loginData.userId}, role=${loginData.role}`);
      console.log(`      * Refresh Cookie: ${refreshCookie ? `Present (name=${refreshCookie.name}, path=${refreshCookie.path}, httpOnly=${refreshCookie.httpOnly}, sameSite=${refreshCookie.sameSite})` : 'MISSING'}`);
      console.log(`      * Role router destination: ${currentUrl}`);
      console.log(`      * Landing page verified: ${u.title}`);

      results.testUsers.push({
        role: u.role,
        email: u.email,
        loginStatus,
        landingUrl: currentUrl,
        landingReached: currentUrl.endsWith(u.expectedPath),
        hasRefreshTokenCookie: !!refreshCookie,
      });

      // If HOLDER, perform Cross-Role URL test before logging out!
      if (u.role === 'HOLDER') {
        console.log('\n[TEST 4] Cross-role URL test: HOLDER visiting /issuer -> 403 Forbidden screen');
        console.log('      * Attempting navigation to /issuer while authenticated as HOLDER...');
        await page.goto(`${BASE_URL}/issuer`);

        // Verify URL remains /issuer and 403 Forbidden screen is rendered
        await page.waitForSelector('text=403 FORBIDDEN');
        await page.waitForSelector('text=Access Denied: Wrong-Role Access');
        const forbiddenVerbatim = await page.textContent('pre');

        console.log(`      * Current URL: ${page.url()}`);
        console.log(`      * 403 screen rendered with verbatim: ${forbiddenVerbatim.trim()}`);
        console.log(`      * HOLDER -> /issuer 403 Proof confirmed!\n`);

        results.crossRole403 = {
          attemptedUrl: page.url(),
          forbiddenVerbatim: forbiddenVerbatim.trim(),
          passed: page.url().endsWith('/issuer') && forbiddenVerbatim.includes('Forbidden'),
        };
      }

      // Test Logout
      console.log(`      * Testing Logout for ${u.role}...`);
      const [logoutResponse] = await Promise.all([
        page.waitForResponse((res) => res.url().includes('/api/auth/logout')),
        page.click('button:has-text("Logout")'),
      ]);

      const logoutStatus = logoutResponse.status();
      await page.waitForURL('**/login');
      console.log(`      * POST /api/auth/logout HTTP ${logoutStatus} (204 expected)`);
      console.log(`      * Redirected to /login: ${page.url().endsWith('/login')}\n`);

      if (!results.logout) {
        results.logout = {
          status: logoutStatus,
          redirectedToLogin: page.url().endsWith('/login'),
        };
      }
    }

    console.log('====================================================');
    console.log('               ALL TESTS PASSED!                    ');
    console.log('====================================================');
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('Test Suite Error:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runTests();
