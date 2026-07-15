const { test, expect } = require('@playwright/test');
const { TambahLimitManagementPage } = require('../../pages/tambah-limit-management');
const testData = require('../../utils/testData');

test.afterEach(async ({ page }) => {
    // This will keep the browser open and show the Playwright Inspector
    // regardless of whether the test passed or failed.
    await page.pause();
});

test('Tambah Limit Management', async ({ page }) => {
    // Disable timeout so the browser stays open indefinitely
    test.setTimeout(0);

    // Increase timeout since this flow involves heavy navigations
    test.setTimeout(200000);

    // 1. Open the application
    // We go to /# /dashboard to ensure we land on the right page
    await page.goto('/#/dashboard');
    
    // 2. Initial check to ensure we are logged in/on dashboard
    await expect(page.getByText('DASHBOARD PAGE')).toBeVisible();

    const tambahLimitPage = new TambahLimitManagementPage(page);

    // 3. Navigate through Sidebar
    await tambahLimitPage.navigateToLimitManagement();
    
    // 4. Verify we reached the Limit Management page
    await expect(page).toHaveURL(/limit-config\/list/);
    
    // 5. Click Tambah
    await tambahLimitPage.clickTambahNewLimitManagement();
    
    // 6. Verify we are on the "Tambah Limit Management" form
    await expect(page.getByText('Tambah Limit Management')).toBeVisible();
    await tambahLimitPage.fillForm(
        testData.partnerInfo.partnerName,
        testData.services.cobrandSaving.serviceName,
        testData.services.apiServices.interbankTransfer,
        testData.services.cobrandSaving.serviceDescription
    );
    await page.getByRole('button', { name: ' Tambah Limit Konfigurasi' }).click();
    await page.getByLabel('menu').selectOption('1');
    await page.getByRole('textbox').nth(3).click();
    await page.getByRole('textbox').nth(3).fill('1000');
    await page.getByRole('textbox').nth(4).click();
    await page.getByRole('textbox').nth(4).fill('250000000');
    await expect(tambahLimitPage.submitButton).toBeEnabled();
    await page.getByRole('button', { name: 'Tambah', exact: true }).click();
    await page.getByRole('button', { name: 'Submit' }).click();



    
});