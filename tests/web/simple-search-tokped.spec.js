const { test, expect } = require('@playwright/test');
const { SimpleSearchTokpedPage } = require('../../pages/tokped');
const testData = require('../../utils/testData');


test.afterEach(async ({ page }) => {
    // This will keep the browser open and show the Playwright Inspector
    // regardless of whether the test passed or failed.
    // await page.pause();
});

test('Simple Search Tokped', async ({ page }) => {
    // Disable timeout so the browser stays open indefinitely
    test.setTimeout(0);

    // Increase timeout since this flow involves heavy navigations
    test.setTimeout(200000);

    const simpleSearchTokpedPage = new SimpleSearchTokpedPage(page);
    await simpleSearchTokpedPage.navigateToSimpleSearchTokped();
    await simpleSearchTokpedPage.searchTokped();
    await simpleSearchTokpedPage.verifyProductExist();
});
