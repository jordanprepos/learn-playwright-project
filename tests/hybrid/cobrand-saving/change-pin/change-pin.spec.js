const { test, expect } = require("@playwright/test");
const tokenManager = require("../../../../utils/tokenManager");
const { activePartner } = require("../../../../config/partners.config");
const { apiPath } = require("../../../../config/apiPath.config");
const { generateHeaders } = require("../../../../utils/headerHelper");
const { attachRequestResponse } = require("../../../../utils/reportHelper");
const { enterPin } = require("../../../../utils/pinHelper");

const baseUrl = apiPath.batamBaseUrl;
const changePinUrl = `${baseUrl}${apiPath.cobrandSavings.pathChangePin}`;

test.describe("Cobrand Saving Change PIN", () => {
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
                    label: "B2B Token",
                    ...tokens.debug.b2b,
                    url: tokens.debug.b2b.requestUrl,
                    headers: tokens.debug.b2b.requestHeaders
                });

            await attachRequestResponse(
                {
                    label: "B2B2C Token",
                    ...tokens.debug.b2b2c,
                    url: tokens.debug.b2b2c.requestUrl,
                    headers: tokens.debug.b2b2c.requestHeaders
                });
        }
    });

    /**
     * Positive Cases - Cobrand Saving Change PIN successfully
     */
    test.describe("Positive", () => {
        test("Cobrand Saving Change PIN successfully", async ({
            request,
            page,
        }) => {
            const requestBody = {
                partnerReferenceNo: Math.floor(Math.random() * 1e12).toString(),
                authentication: "1234567890",
                merchantId: activePartner.channelId,
                phoneNo: activePartner.phoneNo,
                redirectUrl: activePartner.redirectUrl,
                additionalData: {
                    email: activePartner.email,
                },
                additionalInfo: {
                    accountId: activePartner.accountId,
                },
            };

            const headers = generateHeaders({
                method: "POST",
                path: apiPath.cobrandSavings.pathChangePin,
                body: requestBody,
                activePartner,
                tokens,
            });

            const response = await request.post(changePinUrl, {
                headers: headers,
                data: requestBody,
            });

            const body = await response.json();

            expect(response.status()).toBe(200);
            expect(body.responseCode).toMatch(/^\d{3}95\d{2}$/); // validates middle 2 digits = "95"
            expect(body.responseMessage).toBe("Request has been processed successfully");

            await attachRequestResponse({
                label: "CSA - Change PIN V1",
                url: changePinUrl,
                headers,
                requestBody,
                responseHeaders: response.headers(),
                responseBody: body,
                status: response.status(),
                statusText: response.statusText(),
            });

            // Validate webviewUrl exists and open it in the browser
            const webviewUrl = body.params?.pinWebViewUrl;
            expect(webviewUrl).toBeTruthy();
            expect(webviewUrl).toContain("https://");

            await page.goto(webviewUrl, {
                waitUntil: "domcontentloaded",
                timeout: 60000, //60second
            });

            await page
                .getByRole("heading", { name: "Masukkan 6 digit PIN Kamu" })
                .waitFor({ state: "visible", timeout: 30000 });


            await test.info().attach("before-input-pin", {
                body: await page.screenshot(),
                contentType: "image/png",
            });

            const pin = "142536";
            await enterPin(page, pin);

            await test.info().attach("after-input-pin", {
                body: await page.screenshot(),
                contentType: "image/png",
            });

            // Pause the test to keep the browser open for debugging
            // await page.pause();
        });
    });

    /**
     * Negative Cases - Cobrand Saving Change PIN
     */
    test.describe("Negative", () => {
        test("Backend Fails after Input PIN (mocked 505)", async ({ request, page }) => {
            const requestBody = {
                partnerReferenceNo: Math.floor(Math.random() * 1e12).toString(),
                authentication: "1234567890",
                merchantId: activePartner.channelId,
                phoneNo: activePartner.phoneNo,
                redirectUrl: activePartner.redirectUrl,
                additionalData: {
                    email: activePartner.email,
                },
                additionalInfo: {
                    accountId: activePartner.accountId,
                },
            };

            const headers = generateHeaders({
                method: "POST",
                path: apiPath.cobrandSavings.pathChangePin,
                body: requestBody,
                activePartner,
                tokens,
            });

            const response = await request.post(changePinUrl, {
                headers: headers,
                data: requestBody,
            });
            const body = await response.json();

            const webviewUrl = body.params?.pinWebViewUrl;
            expect(webviewUrl).toBeTruthy();
            expect(webviewUrl).toContain('https://surabaya-obk-uat-onprem.nobubank.com/change-mpin');

            // 1. Intercept the network request BEFORE entering the PIN
            await page.route("**/verify-pin*", async (route) => {
                // 2. Fulfill the route with your own custom, fake JSON response
                await route.fulfill({
                    status: 505,
                    contentType: "application/json",
                    body: JSON.stringify({
                        code: "504",
                        message: "Gagal Memproses",
                        data: { token: "fake-jwt-token-123" },
                    })
                });
            });

            await page.goto(webviewUrl, {
                waitUntil: "domcontentloaded",
                timeout: 60000, //60second
            });

            await page
                .getByRole("heading", { name: "Masukkan 6 digit PIN Kamu" })
                .waitFor({ state: "visible", timeout: 30000 });

            // 3. Input the PIN. The browser will make the request,
            // but Playwright will instantly return the fake data above!
            // Simply declare the PIN and call the function directly
            const pin = "142536";
            await enterPin(page, pin);
        });

        test("Input Wrong PIN", async ({ request, page }) => {
            //code here
        });

        test("Internet Connection Off", async ({ request, page }) => {
            //code here
            await page.context().setOffline(true);
            await expect(page.getByText("Koneksi Internet Terputus", { exact: true })).toBeVisible();
        });
    });
});
