// tests/web/login.spec.js
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../../pages/loginPage');
const testData = require('../../utils/testData');

test('Login to CMS Backoffice', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(testData.validUser.email, testData.validUser.password);
  await expect(page.getByText('DASHBOARD PAGE')).toBeVisible();
});
