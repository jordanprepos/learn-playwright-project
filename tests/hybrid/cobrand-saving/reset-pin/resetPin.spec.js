const { test, expect } = require("@playwright/test");
const tokenManager = require("../../../../utils/tokenManager");
const { activePartner } = require("../../../../config/partners.config");
const { apiPath } = require("../../../../config/apiPath.config");
const { generateHeaders } = require("../../../../utils/headerHelper");
const { attachRequestResponse, attachScreenshot } = require("../../../../utils/reportHelper");
const { enterPin, enterOtp } = require("../../../../utils/pinHelper");
const { getOtpFromSlack } = require("../../../../utils/slackHelper");
const { queryOne } = require("../../../../utils/mysqlHelper");

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
            await attachRequestResponse(
                {
                    label: 'B2B Token',
                    ...tokens.debug.b2b,
                    url: tokens.debug.b2b.requestUrl,
                    headers: tokens.debug.b2b.requestHeaders
                });

            await attachRequestResponse(
                {
                    label: 'B2B2C Token',
                    ...tokens.debug.b2b2c,
                    url: tokens.debug.b2b2c.requestUrl,
                    headers: tokens.debug.b2b2c.requestHeaders
                });
        }
    });

    /**
     * Positive Flow of Cobrand Saving Reset PIN via API OBK
     */
    test.describe('Positive', () => {
        test('Cobrand Saving Reset PIN successfully', async ({ request, page }) => {
            let accountRow;
            await test.step('verify account exists and is active in DB', async () => {
                accountRow = await queryOne(
                    'SELECT * FROM obk_saving_transaction.accounts WHERE account_id = ?',
                    [activePartner.accountId]
                );
                expect(accountRow).not.toBeNull();
                expect(accountRow.status).toBe(1);
            });

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

            console.log("WEBVIEW URL >>>>>>>>>>>>> " + webviewUrl);

            await attachRequestResponse({
                label: 'CSA - Reset PIN',
                url: csaResetPinUrl,
                headers,
                requestBody,
                responseHeaders: response.headers(),
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
            await attachScreenshot(page, 'Screen 1 - Reset PIN Form');

            // Step 1: Fill Form — sourced from the DB row, not partner config,
            // since the form must match what's actually on the account record.
            await page.getByPlaceholder('Nama Lengkap').fill(accountRow.full_name);
            await page.getByPlaceholder('Nomer Induk Kependudukan').fill(accountRow.identification_number);
            await page.getByPlaceholder('Alamat Email').fill(accountRow.email);
            await expect(page.getByRole('button', { name: 'Selanjutnya' })).toBeVisible();
            await attachScreenshot(page, 'Screen 1 - Form Filled');

            // Step 2: Click Next — this triggers the OTP being sent to #bento-bot.
            // Capture the time first (Slack `oldest` is epoch seconds) so we only
            // accept OTP messages posted after this click, never a stale one.
            const otpRequestedAt = Date.now() / 1000;
            await page.getByRole('button', { name: 'Selanjutnya' }).click();
            await expect(page.getByRole('heading', { name: 'Masukkan Kode Verifikasi' })).toBeVisible();
            await attachScreenshot(page, 'Screen 2 - OTP Verification');

            // Step 3: Read the OTP from Slack and enter it.
            // Bento-bot posts the destination in international format (0812... -> 62812...),
            // so match on our partner's number to ignore OTPs meant for other accounts.
            // The OTP wording varies per flow ("RAHASIA Anda:744975", "Anda Code:808390",
            // "anda 480088"), so accept any of them after the destination.
            const destination = '62' + activePartner.phoneNo.slice(1);
            const otp = await getOtpFromSlack({
                oldest: otpRequestedAt,
                otpRegex: new RegExp(`Destination:\\s*${destination}[\\s\\S]*?anda\\s*:?\\s*(?:Code\\s*:\\s*)?(\\d{6})`, 'i'),
            });
            console.log("OTP FROM SLACK >>>>>>>>>>>>> " + otp);
            //Input otp 
            await enterOtp(page, otp);
            await expect(page.getByRole('heading', { name: 'Masukkan Kode Verifikasi' }));

            // Step 4: Set New PIN
            await expect(page.getByRole('heading', { name: 'Buat PIN Baru', level: 1 })).toBeVisible();
            // The product name in the subtitle varies ("Nobu", "Nobu Madera", ...), so match around it
            await expect(page.getByText(/Masukkan PIN baru .*untuk akses login dan transaksi/)).toBeVisible();
            await attachScreenshot(page, 'Screen 4 - Create New PIN');

            const newPin = "142536";
            await enterPin(page, newPin);

            // Step 5: Confirm New PIN
            await expect(page.getByRole('heading', { name: 'Konfirmasi PIN Baru', level: 1 })).toBeVisible();
            await attachScreenshot(page, 'Screen 5 - Confirm New PIN');
            await enterPin(page, newPin);

            // Step 6: Success Page
            await expect(page.getByText('PIN Berhasil Diubah')).toBeVisible();
            await expect(page.getByText('Kamu dapat konfirmasi transaksi dengan PIN yang baru kamu buat')).toBeVisible();
            await attachScreenshot(page, 'Screen 6 - Success Reset PIN Page');
        });
    });

});
