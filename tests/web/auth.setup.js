const { test: setup, expect } = require('@playwright/test');
const { LoginPage } = require('../../pages/loginPage');
const path = require('path');
const testData = require('../../utils/testData');
const fs = require('fs');

const authFile = path.join(__dirname, '../.auth/user.json');

/**
 * Returns true if user.json exists and the JWT access_token is not expired.
 * This prevents running the full login flow on every test run.
 */
function isSessionValid() {
  if (!fs.existsSync(authFile)) return false;

  try {
    const state = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
    const cookies = state.cookies || [];
    const tokenCookie = cookies.find(c => c.name === 'access_token');

    if (!tokenCookie?.value) return false;

    // Decode JWT payload (no verification needed, just check expiry)
    const payload = JSON.parse(
      Buffer.from(tokenCookie.value.split('.')[1], 'base64').toString()
    );

    // exp is in seconds; add 60s buffer so we re-login before it expires
    return payload.exp * 1000 > Date.now() + 60_000;
  } catch {
    return false;
  }
}

setup('authenticate', async ({ page }) => {
  // Skip the entire setup (no browser needed) if session is still valid
  setup.skip(isSessionValid(), 'Session still valid — skipping login.');

  const loginPage = new LoginPage(page);
  
  // 1. Visit the page
  await loginPage.goto();

  // 3. Perform login steps
  await loginPage.login(testData.validUser.email, testData.validUser.password);
  
  // 4. WAIT FOR MANUAL INTERVENTION (Captcha)
  // We wait for the dashboard to appear. If a captcha appears, 
  // you must solve it manually in the --debug window.
  console.log('Waiting for Dashboard... (Please solve CAPTCHA if it appears)');
  await expect(page.getByText('DASHBOARD PAGE')).toBeVisible({ timeout: 120000 });
  
  // 5. Save the storage state
  await page.context().storageState({ path: authFile });
  console.log('Authentication state saved to:', authFile);
});