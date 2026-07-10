const { test, expect } = require("@playwright/test");
const tokenManager = require("../../../../utils/tokenManager");
const { activePartner } = require("../../../../config/partners.config");
const { apiPath } = require("../../../../config/apiPath.config");
const { generateHeaders } = require("../../../../utils/headerHelper");
const { attachRequestResponse } = require("../../../../utils/reportHelper");
const { enterPin } = require("../../../../utils/pinHelper");

const baseUrl = apiPath.batamBaseUrl;
const csaResetPinUrl = `${baseUrl}${apiPath.cobrandSavings.pathResetPin}`;

test.describe('Cobrand Saving Reset PIN', () => {

    /**
     * Get Token B2b and B2b2c before each test
     */
    let tokens;
    test.beforeEach(async ({ request }) => {
        tokens = await tokenManager.getTokens(request);
        // Only attach if tokens were freshly fetched (not from cache)
        if (tokens.debug) {
            await attachRequestResponse({
                label: 'B2B Token',
                headers: tokens.debug.b2b.requestHeaders,
                requestBody: tokens.debug.b2b.requestBody,
                responseBody: tokens.debug.b2b.responseBody,
                status: tokens.debug.b2b.status,
            });

            await attachRequestResponse({
                label: 'B2B2C Token',
                headers: tokens.debug.b2b2c.requestHeaders,
                requestBody: tokens.debug.b2b2c.requestBody,
                responseBody: tokens.debug.b2b2c.responseBody,
                status: tokens.debug.b2b2c.status,
            });
        }
    });

    /**
     * Positive Flow of Cobrand Saving Reset PIN via API OBK
     */
    test.describe('Positive', () => {
        test('Cobrand Saving Reset PIN successfully', async ({ request, page }) => {
            const requestBody = {
                partnerReferenceNo: Math.floor(Math.random() * 1e12).toString(),
                referenceNo: Math.floor(Math.random() * 1e12).toString(),
                additionalInfo: {
                    accountId: activePartner.accountId,
                },
            }

            const headers = generateHeaders({
                method: 'POST',
                path: apiPath.cobrandSavings.pathResetPin,
                body: requestBody,
                activePartner,
                tokens
            });

            const response = await request.post(csaResetPinUrl, {
                headers: headers,
                data: requestBody
            });

            const body = await response.json();

            expect(response.status()).toBe(200);
            expect(body.responseCode).toMatch(/^\d{3}98\d{2}$/);
            expect(body.responseMessage).toBe("Request has been processed successfully");

            const webviewUrl = body.additionalInfo?.webViewUrl;
            expect(webviewUrl).toBeTruthy();
            expect(webviewUrl).toContain('https://surabaya-obk-uat-onprem.nobubank.com/reset-mpin');

            console.log("WEBVIEW URL >>>>>>>>>>>>>. " + webviewUrl);

            await attachRequestResponse({
                label: 'CSA - Reset PIN',
                headers,
                requestBody,
                responseBody: body,
                status: response.status(),
                statusText: response.statusText(),
            });

            page.on('console', msg =>
                console.log('console:', msg.text())
            );
            page.on('pageerror', err =>
                console.log('pageerror:', err.message)
            );
            page.on('requestfailed', req =>
                console.log('requestfailed:', req.url(), req.failure()?.errorText));

            await page.goto(webviewUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 60000 //60 seocnds
            });

            await page.getByText('Reset PIN', { exact: true }).waitFor({ state: 'visible', timeout: 30000 });
            await expect(page.getByRole('button', { name: 'Selanjutnya' })).toBeDisabled();

            // Step 1: Fill Form
            await page.getByPlaceholder('Nama Lengkap').fill(activePartner.name);
            await page.getByPlaceholder('Nomer Induk Kependudukan').fill(activePartner.nik);
            await page.getByPlaceholder('Alamat Email').fill(activePartner.email);

            // Step 2: Click Next
            await expect(page.getByRole('button', { name: 'Selanjutnya' })).toBeVisible();
            await page.getByRole('button', { name: 'Selanjutnya' }).click();
            await expect(page.getByRole('heading', { name: 'Masukkan Kode Verifikasi' })).toBeVisible();

            // // Step 4: Set New PIN
            // const newPin = "142536";
            // await enterPin(page, newPin);

            // // Step 5: Confirm New PIN
            // await enterPin(page, newPin);

        });
    });


});
