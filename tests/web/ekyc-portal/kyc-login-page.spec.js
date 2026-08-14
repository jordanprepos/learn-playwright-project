// tests/web/ekyc-portal/kyc-login-page.spec.js
const { test, expect } = require('@playwright/test');
const { EkycPortalLoginPage } = require('../../../pages/ekyc-portal/ekycPortalLoginPage');
const testData = require('../../../utils/testData');

test('E-KYC Login Page', async ({ page }) => {
    const ekycPortalLoginPage = new EkycPortalLoginPage(page);
    await ekycPortalLoginPage.gotoEkycPortal();
    await expect(page.getByRole('heading', { name: 'CMS KYC', level: 4 })).toBeVisible();
    await ekycPortalLoginPage.fillCredentials(testData.ekycPortal.ekycPortalUser, testData.ekycPortal.ekycPortalPass);
    await ekycPortalLoginPage.clickLoginButton();
    await expect(page).toHaveURL('https://portal-ekyc-uat-cloud.nobubank.com/dashboard');
    await expect(page.getByRole('heading', { name: 'DASHBOARD', level: 6 })).toBeVisible();

});
