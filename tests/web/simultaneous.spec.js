const { test } = require('@playwright/test');
const { PinPage } = require('../../pages/pinPage');
const testData = require('../../utils/testData');

// Automatically open DevTools for every window/tab
test.use({
  launchOptions: {
    args: [
      '--auto-open-devtools-for-tabs',
      '--devtools-flags=panel:network'
    ]
  }
});

test('Simultaneous PIN Entry', async ({ browser }) => {
  // Allow this test to run indefinitely (no timeout)
  test.setTimeout(0);

  const targetUrl = testData.urls.webviewUrl;

  // 1. Create two independent browser contexts
  // We pass an empty storageState to bypass any global config requirements
  const context1 = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const context2 = await browser.newContext({ storageState: { cookies: [], origins: [] } });

  // 2. Open a page in each context
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();

  // 3. Initialize Page Objects
  const pinPage1 = new PinPage(page1);
  const pinPage2 = new PinPage(page2);

  // 4. Navigate both windows simultaneously
  console.log('Navigating both windows...');
  await Promise.all([
    page1.goto(targetUrl),
    page2.goto(targetUrl)
  ]);

  // 5. Verify PIN page and input PIN simultaneously
  console.log('Checking for PIN page...');
  await Promise.all([
    pinPage1.verifyIsOnPinPage(),
    pinPage2.verifyIsOnPinPage()
  ]);

  console.log('Entering PIN with delay...');
  await Promise.all([
    // Window 1 starts immediately
    pinPage1.inputPin('142536'),
    
    // Window 2 waits for 2 seconds before starting
    (async () => {
      await page2.waitForTimeout(0); 
      await pinPage2.inputPin('142536');
    })()
  ]);

  // Keep windows open for a few seconds to observe
  await page1.waitForTimeout(500000);

  // Clean up
  // await context1.close();
  // await context2.close();
});
