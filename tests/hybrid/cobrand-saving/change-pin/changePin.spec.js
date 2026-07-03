const { test, expect } = require("@playwright/test");
const tokenManager = require("../../../../utils/tokenManager");
const { activePartner } = require("../../../../config/partners.config");
const { apiPath } = require("../../../../config/apiPath.config");
const { generateHeaders } = require("../../../../utils/headerHelper");
const { attachRequestResponse } = require("../../../../utils/reportHelper");


const baseUrl = apiPath.batamBaseUrl;
const changePinUrl = `${baseUrl}${apiPath.cobrandSavings.pathChangePin}`;



// Helper function defined inside or outside the test
async function enterPin(page, pin) {
  for (const digit of pin.split('')) {
    await page.getByRole('button', { name: digit, exact: true }).click();
    
    // Give the application 300 milliseconds to process the click before moving on to the next digit
    await page.waitForTimeout(200); 
  }
}

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

  test.describe("Should execute Cobrand Saving Change PIN successfully", async ({ request, page }) => {
    
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

    const response = await request.post(changePinUrl, {
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

    await page.goto(webviewUrl,{
      waitUntil: 'domcontentloaded',
      timeout: 60000 //60second
    });

    await page.getByRole('heading', { name: 'Masukkan 6 digit PIN Kamu' })
      .waitFor({ state: 'visible', timeout: 30000 });

    await test.info().attach('before-input-pin',{
      body: await page.screenshot(),
      contentType: 'image/png',
    });

    const pin = '142536';
    await enterPin(page, pin);
    
    await test.info().attach('after-input-pin',{
      body: await page.screenshot(),
      contentType: 'image/png',
    });

    // Pause the test to keep the browser open for debugging
    // await page.pause();

  });
});

test.describe("Negative - Cobrand Saving Change PIN",() =>{

  test("Should show error when PIN entry fails (mocked 505)", async ({ request, page }) => {
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
    })

    const response = await request.post(changePinUrl,{
      headers: headers,
      data: requestBody
    })
    const body = await response.json();

    expect(response.status()).toBe(200);
    expect(body.responseCode).toMatch(/^\d{3}95\d{2}$/); // validates middle 2 digits = "95"
    expect(body.responseMessage).toBe("Request has been processed successfully");

    const webviewUrl = body.params?.pinWebViewUrl;
    expect(webviewUrl).toBeTruthy();
    expect(webviewUrl).toContain("https://");

    await page.goto(webviewUrl,{
      waitUntil: 'domcontentloaded',
      timeout: 60000 //60second
    });

    // 1. Intercept the network request BEFORE entering the PIN
    await page.route('**/verify-pin*', async route => {
      // 2. Fulfill the route with your own custom, fake JSON response
      await route.fulfill({
        status: 505,
        contentType: 'application/json',
        body: JSON.stringify({
          code: '504',
          message: 'Gagal Memproses',
          data: { token: 'fake-jwt-token-123' }
        })
        // body: JSON.stringify(
        //   {
        //     "partnerReferenceNo": "202259342092",
        //     "authentication": "U2FsdGVkX1/f1LBK+keD46sjGQlYlYYhrTKb0Z8okzc=",
        //     "newAuthentication": "",
        //     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODI4MTk3NTksImlzcyI6ImQ5ZjVlNDA1YTdmNzRlZDY1MmE4ZjBiMzFhODdmNjM2IiwiY2xpZW50X2lkIjoiZDlmNWU0MDVhN2Y3NGVkNjUyYThmMGIzMWE4N2Y2MzYiLCJwaG9uZV9udW1iZXIiOiI4YmM0ODZjMTcyNTFjMDViM2U0NGIwMzUwMjhlYWQ2ZSJ9.2SbFC03RKPTwtRctAVWUZZQuG-uTW63NLb9UJwFhTxM",
        //     "refreshToken": "ddbdcb89-3fa4-49d0-a665-9aeb35ed3075",
        //     "partnerStyle": {
        //         "backgroundColor": "#00CED1",
        //         "buttonColor": "#00CED1",
        //         "buttonColorFont": "#FFFFFF",
        //         "partnerLogoUrl": "https://storage.googleapis.com/nobu_openbanking/bf4afe74-71c0-4ff7-8973-f08aed8b79ea.png?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=open-banking%40nobu-digital-sit.iam.gserviceaccount.com%2F20260630%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20260630T112739Z&X-Goog-Expires=10799&X-Goog-Signature=8e4a7ef6caf86718c014558faed418cbadb774edde3e796cdd2ab7a16e981b785bc288a2211d80badc833e68a76c50277f0e8c0f1fe1b053a1f065e3f1bf1c4f8b42f23401fac6f317d1d1a1a58d423b5f82075910dcb9685bf337089ba56de92f38299d4450723f080096cc2aea77f8366b0f7a38ed8def62867f8109dc3ce7c85375164ce8cfc264a13ed5446d4def76cad80d59eab7778f6db48665fc616489a77ebf8aee889e9d6b235ffda8724a921592b0e94611f7f82015ce8d6e19a8489e6f564a39e4fa939167bc3d6001fbaf54a7551c86d13296268bd053c8ab52d2e00984396a0755df1600254729f852a23a3fede6755cd783a9f14fa985f1cc&X-Goog-SignedHeaders=host",
        //         "fontDarkColor": "#000fff",
        //         "fontLightColor": "#000fff",
        //         "partnerName": "KopnusAgent",
        //         "applicationName": "MADERA",
        //         "fontFilenames": null,
        //         "assetUrls": null,
        //         "isActive": false,
        //         "colorPrimary": "#fff000",
        //         "colorSecondary": "#fff000",
        //         "profilePage": "akd",
        //         "bgColor": "#fff000",
        //         "showAKD": false
        //     },
        //     "additionalInfo": {
        //         "callbackUrl": "",
        //         "redirectUrl": "https://688358d521fa24876a9dbb73.mockapi.io",
        //         "accountId": "111819305170",
        //         "deviceId": "device-xiaomi",
        //         "partnerId": "0021"
        //     },
        //     "externalId": 1782818880
        //   }
        // )
      });
    });
    // 3. Input the PIN. The browser will make the request, 
    // but Playwright will instantly return the fake data above!
    // Simply declare the PIN and call the function directly

  });







});
