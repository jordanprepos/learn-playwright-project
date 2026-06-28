const { test: setup, expect } = require('@playwright/test');
const { LoginPage } = require('../../pages/loginPage');
const path = require('path');
const testData = require('../../utils/testData');
const fs = require('fs');

const authFile = path.join(__dirname, '../.auth/user.json');

setup('authenticate', async ({ page }) => {
  const loginPage = new LoginPage(page);
  
  // 1. Visit the page
  await loginPage.goto();
  
  // 2. CHECK: If we are already redirected to the dashboard, we can skip login
  // This happens if the storageState was already loaded and still valid
  if (page.url().includes('dashboard')) {
    console.log('Already logged in, skipping setup.');
    return;
  }

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