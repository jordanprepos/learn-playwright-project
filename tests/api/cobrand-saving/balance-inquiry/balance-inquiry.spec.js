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
        expect(body.accountInfos[0]).toHaveProperty('balanceTypes');
        expect(body.accountInfos[0].balanceTypes).toBe('Cash');

    });


});