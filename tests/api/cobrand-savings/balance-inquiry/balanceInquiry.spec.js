const { test, expect } = require("@playwright/test");
const tokenManager = require("../../../../utils/tokenManager");
const { activePartner } = require("../../../../config/partners.config");
const { apiPath } = require("../../../../config/apiPath.config");
const { generateHeaders } = require("../../../../utils/headerHelper");
const { attachRequestResponse } = require("../../../../utils/reportHelper");


const baseUrl = apiPath.batamBaseUrl;
const balanceInquiryV1Url   = `${baseUrl}${apiPath.cobrandSavings.pathBalanceInquiryV1}`;
const balanceInquiryV1_1Url = `${baseUrl}${apiPath.cobrandSavings.pathBalanceInquiryV1_1}`;

test.describe("Cobrand Saving Balance Inquiry", () => {
  
  let tokens;
  
  test.beforeEach(async ({ request }) => {
    tokens = await tokenManager.getTokens(request);
    
    // Attach B2B token request/response to report
    await attachRequestResponse({
      label: 'B2B Token',
      headers: tokens.debug.b2b.requestHeaders,
      requestBody: tokens.debug.b2b.requestBody,
      responseBody: tokens.debug.b2b.responseBody,
      status: tokens.debug.b2b.status,
      statusText: tokens.debug.b2b.statusText,
    });

    // Attach B2B2C token request/response to report
    await attachRequestResponse({
      label: 'B2B2C Token',
      headers: tokens.debug.b2b2c.requestHeaders,
      requestBody: tokens.debug.b2b2c.requestBody,
      responseBody: tokens.debug.b2b2c.responseBody,
      status: tokens.debug.b2b2c.status,
      statusText: tokens.debug.b2b2c.statusText,
    });

  });

  test("Should execute Cobrand Saving Balance Inquiry successfully", async ({ request }) => {
    
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
      headers,
      requestBody,
      responseBody: body,
      status: response.status(),
      statusText: response.statusText(),
    });

    expect(response.status()).toBe(200);
    expect(body.responseCode).toBe("2001100");
    expect(body.responseMessage).toBe("Request has been processed successfully");



  });





});