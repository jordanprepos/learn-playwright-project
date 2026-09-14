const http = require("http");
const { test, expect } = require("@playwright/test");
const tokenManager = require("../../../../utils/tokenManager");
const { activePartner } = require("../../../../config/partners.config");
const { apiPath } = require("../../../../config/apiPath.config");
const { generateHeaders } = require("../../../../utils/headerHelper");
const { attachRequestResponse } = require("../../../../utils/reportHelper");


const baseUrl = apiPath.batamBaseUrl;
const balanceInquiryV1Url = `${baseUrl}${apiPath.cobrandSavings.pathBalanceInquiryV1}`;
const balanceInquiryV1_1Url = `${baseUrl}${apiPath.cobrandSavings.pathBalanceInquiryV1_1}`;

test.describe("Cobrand Saving Balance Inquiry", () => {

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

    test("Cobrand Saving Balance Inquiry V1 - Success", async ({ request }) => {

        const requestBody = {
            partnerReferenceNo: Math.floor(Math.random() * 1e12).toString(),
            additionalInfo: {
                accountId: activePartner.accountId,
            }
        }

        const headers = generateHeaders({
            method: "POST",
            path: apiPath.cobrandSavings.pathBalanceInquiryV1,
            body: requestBody,
            activePartner,
            tokens,
        });

        const response = await request.post(balanceInquiryV1Url, {
            headers: headers,
            data: requestBody,
        });

        const body = await response.json();

        await attachRequestResponse({
            label: 'CSA - Balance Inquiry V1',
            url: balanceInquiryV1Url,
            headers,
            requestBody,
            responseHeaders: response.headers(),
            responseBody: body,
            status: response.status(),
            statusText: response.statusText(),
        });

        expect(response.status()).toBe(200);
        expect(body.responseCode).toBe("2001100");
        expect(body.responseMessage).toBe("Request has been processed successfully");

    });

    test("Cobrand Saving Balance Inquiry V1.1 - Success", async ({ request }) => {
        const requestBody = {
            partnerReferenceNo: Math.floor(Math.random() * 1e12).toString(),
            additionalInfo: {
                accountId: activePartner.accountId,
            }
        }
        const headers = generateHeaders({
            method: "POST",
            path: apiPath.cobrandSavings.pathBalanceInquiryV1_1,
            body: requestBody,
            activePartner,
            tokens,
        });

        const response = await request.post(balanceInquiryV1_1Url, {
            headers: headers,
            data: requestBody,
        });

        const body = await response.json();

        await attachRequestResponse({
            label: 'CSA - Balance Inquiry V1.1',
            url: balanceInquiryV1_1Url,
            headers,
            requestBody,
            responseHeaders: response.headers(),
            responseBody: body,
            status: response.status(),
            statusText: response.statusText(),
        });

        expect(response.status()).toBe(200);
        expect(body.responseCode).toBe("2001100");
        expect(body.responseMessage).toBe("Request has been processed successfully");
        expect(body).toHaveProperty('name');
        // expect(body).toHaveProperty('accountNo');
        expect(body.accountInfos[0]).toHaveProperty('balanceType');
        expect(body.accountInfos[0].balanceType).toBe('Cash');

    });

    /**
     * Timeout is stubbed, not real. The sandbox gateway has no trigger that makes
     * it return 5041100, and `page.route` can't intercept the `request` fixture
     * (no browser context behind it), so this test points the same signed request
     * at a throwaway local server that returns the SNAP timeout body verbatim.
     *
     * What this covers: our handling/assertion of a 504 + 5041100 payload, and the
     * report attachment for it. What it does NOT cover: that the real gateway ever
     * emits this. Replace the stub with the live URL if a trigger is ever exposed.
     */
    test("Cobrand Saving Balance Inquiry V1 - Timeout (stubbed gateway)", async ({ request }) => {
        const timeoutBody = {
            responseCode: "5041100",
            responseMessage: "Timeout",
        };

        const server = http.createServer((req, res) => {
            res.writeHead(504, { "Content-Type": "application/json" });
            res.end(JSON.stringify(timeoutBody));
        });
        await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
        const stubUrl = `http://127.0.0.1:${server.address().port}${apiPath.cobrandSavings.pathBalanceInquiryV1}`;

        try {
            const requestBody = {
                partnerReferenceNo: Math.floor(Math.random() * 1e12).toString(),
                additionalInfo: {
                    accountId: activePartner.accountId,
                }
            }

            const headers = generateHeaders({
                method: "POST",
                path: apiPath.cobrandSavings.pathBalanceInquiryV1,
                body: requestBody,
                activePartner,
                tokens,
            });

            const response = await request.post(stubUrl, {
                headers: headers,
                data: requestBody,
            });

            const body = await response.json();

            await attachRequestResponse({
                label: 'CSA - Balance Inquiry V1 - Timeout (stubbed)',
                url: stubUrl,
                headers,
                requestBody,
                responseHeaders: response.headers(),
                responseBody: body,
                status: response.status(),
                statusText: response.statusText(),
            });

            expect(response.status()).toBe(504);
            expect(body.responseCode).toBe("5041100");
            expect(body.responseMessage).toBe("Timeout");
        } finally {
            await new Promise((resolve) => server.close(resolve));
        }
    });


});