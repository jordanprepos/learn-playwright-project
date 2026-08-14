const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { NobuLoginPage } = require('../../../pages/nobu-dashboard/nobuLoginPage');
const { UnlinkDevicePage } = require('../../../pages/nobu-dashboard/unlinkDevicePage');
const testData = require('../../../utils/testData');
const { phonenumber } = require('../../../data/unlinkDevicePhoneNumbers');
const { attachScreenshot } = require('../../../utils/reportHelper');
const { appendRows } = require('../../../utils/googleSheetsHelper');

// Tab name in the target Google Sheet (spreadsheet ID comes from .env).
// Existing header row (row 2, under "USER INFORMATION" / "ACCOUNT" title cells):
// Nama | Phone No | User Type | User Status | Nobu Kasbon Suka-Suka | Account Status
const SHEET_TAB_NAME = 'UnlinkDeviceResults';

// Bundled Chromium can't resolve the internal.uat.nobubank.internal host on this
// network (VPN/DNS policy appears scoped to the real Chrome app) — use the
// system Chrome channel for this spec only.
test.use({ channel: 'chrome' });

test('search each phone number for Unlink Device', async ({ page }) => {
    // Default test timeout is 30s for the whole test body, not per step — with
    // 100+ numbers in the loop (each waiting up to 15s for an outcome in the
    // worst case) that's nowhere near enough. Must be set synchronously here,
    // before any other awaits, per Playwright's test.setTimeout() contract.
    test.setTimeout(60 * 60 * 1000);

    const loginPage = new NobuLoginPage(page);
    const unlinkDevicePage = new UnlinkDevicePage(page);
    const results = [];

    await loginPage.gotoLogin();
    await loginPage.fillCredentials(testData.nobuDashboard.nobuUser, testData.nobuDashboard.nobuPass);
    await loginPage.clickLoginButton();

    for (const number of phonenumber) {
        await test.step(`Phone ${number}`, async () => {
            await unlinkDevicePage.navigateToUnlinkDevice();
            await unlinkDevicePage.searchPhoneNumber(number);
            const outcome = await unlinkDevicePage.waitForOutcome();

            if (outcome === 'error' || outcome === 'not_found') {
                results.push({ number, outcome });
                await unlinkDevicePage.dismissPopup();
            } else if (outcome === 'success') {
                const { name, userType, userStatus } = await unlinkDevicePage.extractCustomerSummary();
                const kasbonAccounts = await unlinkDevicePage.extractKasbonAccounts();
                await attachScreenshot(page, `Result - ${number}`);
                results.push({ number, outcome, name, userType, userStatus, kasbonAccounts });
            } else {
                await attachScreenshot(page, `Timeout - ${number}`);
                results.push({ number, outcome });
            }
        });
    }

    const outDir = path.join(__dirname, '../../../test-results');
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, 'unlink-device-search-results.json');
    fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
    await test.info().attach('Summary JSON', { path: outFile, contentType: 'application/json' });

    // 'not_found' -> phone number only, rest of the row blank.
    // 'success' -> one row per Kasbon account (repeating the customer's info),
    // or a single row with blank Kasbon columns if they don't have one.
    const sheetRows = results
        .filter((r) => r.outcome === 'success' || r.outcome === 'not_found')
        .flatMap((r) => {
            if (r.outcome === 'not_found') return [['', r.number, '', '', '', '']];
            const base = [r.name, r.number, r.userType, r.userStatus];
            if (!r.kasbonAccounts.length) return [[...base, '', '']];
            return r.kasbonAccounts.map((acc) => [...base, acc.accountNumber, acc.status]);
        });
    await appendRows(sheetRows, SHEET_TAB_NAME);

    await unlinkDevicePage.logout();
});
