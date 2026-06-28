// tests/login.spec.js
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../../pages/loginPage');

test('Login to CMS Backoffice', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  // Replace with a dummy/test account
  await loginPage.login(validUser.email, validUser.password);
  await expect(page.getByText('DASHBOARD PAGE')).toBeVisible();
});

