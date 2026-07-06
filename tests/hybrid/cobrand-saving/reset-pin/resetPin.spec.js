const { apiPath } = require("../../../../config/apiPath.config");
const { generateHeaders } = require("../../../../utils/headerHelper");



const baseUrl = apiPath.batamBaseUrl;
const csaResetPinUrl = `${baseUrl}${apiPath.cobrandSavings.pathResetPin}`;

async function enterPin(page, pin) {
    for (const digit of pin.split("")) {
        await page.getByRole("button", { name: digit, exact: true }).click();

        // Give the application 300 milliseconds to process the click before moving on to the next digit
        await page.waitForTimeout(200);
    }
}

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

            const webviewUrl = body.params?.resetPinWebviewUrl;
            expect(webviewUrl).toBeTruthy();
            expect(webviewUrl).toContain('https://surabaya-obk-uat-onprem.nobubank.com/reset-mpin');

            await attachRequestResponse({
                label: 'CSA - Reset PIN',
                headers,
                requestBody,
                responseBody: body,
                status: response.status(),
                statusText: response.statusText(),
            });

            await page.goto(webviewUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 60000 //60 seocnds
            });


        });
    });


});
