const { test, expect } = require("@playwright/test");
const tokenManager = require("../../../../utils/tokenManager");
const { activePartner } = require("../../../../config/partners.config");
const { apiPath } = require("../../../../config/apiPath.config");
const { generateHeaders } = require("../../../../utils/headerHelper");


const baseUrl = apiPath.batamBaseUrl;
const balanceInquiryV1Url   = `${baseUrl}${apiPath.cobrandSavings.pathBalanceInquiryV1}`;
const balanceInquiryV1_1Url = `${baseUrl}${apiPath.cobrandSavings.pathBalanceInquiryV1_1}`;

test.describe("Cobrand Saving Balance Inquiry", () => {
  
  let tokens;
  
  test.beforeEach(async ({ request }) => {
    tokens = await tokenManager.getTokens(request);
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

    await test.info().attach('Request Headers', {
      body: JSON.stringify(headers, null, 2),
      contentType: 'application/json',
    });

    await test.info().attach('Rquest Body', {
      body: JSON.stringify(requestBody, null, 2),
      contentType: 'application/json',
    });

    await test.info().attach('Response Body', {
      body: JSON.stringify(body, null, 2),
      contentType: 'application/json',
    });
    
    await test.info().attach('Response Status', {
      body: `${response.status()} ${response.statusText()}`,
      contentType: 'text/plain',
    });

    expect(response.status()).toBe(200);
    expect(body.responseCode).toBe("2001100");
    expect(body.responseMessage).toBe("Request has been processed successfully");


    
  });





});