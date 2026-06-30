const { test, expect } = require("@playwright/test");
const tokenManager = require("../../../../utils/tokenManager");
const { activePartner } = require("../../../../config/partners.config");
const { apiPath } = require("../../../../config/apiPath.config");
const { generateHeaders } = require("../../../../utils/headerHelper");
const { attachRequestResponse } = require("../../../../utils/reportHelper");


const baseUrl = apiPath.batamBaseUrl;
const changePinV1Url = `${baseUrl}${apiPath.cobrandSavings.pathChangePin}`;

test.describe("Cobrand Saving Change PIN", () => {
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

  test("Should execute Cobrand Saving Change PIN successfully", async ({ request, page }) => {
    
    const requestBody = {
      partnerReferenceNo: Math.floor(Math.random() * 1e12).toString(),
      authentication: '1234567890',
      merchantId: activePartner.channelId,
      phoneNo: activePartner.phoneNo,
      redirectUrl: activePartner.redirectUrl,
      additionalData: {
        email: activePartner.email,
      },
      additionalInfo: {
        accountId: activePartner.accountId,
      }
    }
    
    const headers = generateHeaders({
      method: "POST",
      path: apiPath.cobrandSavings.pathChangePin,
      body: requestBody,
      activePartner,
      tokens,
    });

    const response = await request.post(changePinV1Url, {
      headers: headers,
      data: requestBody,
    });

    const body = await response.json();

    expect(response.status()).toBe(200);
    expect(body.responseCode).toMatch(/^\d{3}95\d{2}$/); // validates middle 2 digits = "95"
    expect(body.responseMessage).toBe("Request has been processed successfully");

    await attachRequestResponse({
      label: 'CSA - Change PIN V1',
      headers,
      requestBody,
      responseBody: body,
      status: response.status(),
      statusText: response.statusText(),
    });

    // Validate webviewUrl exists and open it in the browser
    const webviewUrl = body.params?.pinWebViewUrl;
    expect(webviewUrl).toBeTruthy();
    expect(webviewUrl).toContain("https://");
    await page.goto(webviewUrl);
    await page.waitForLoadState("domcontentloaded");

    
    
  });
});
