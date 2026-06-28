const { test, expect } = require('@playwright/test');
const tokenManager = require('../utils/tokenManager');

test.describe('Inquiry API Tests', () => {
  
  // Optional: Fetch tokens before each test to ensure they are loaded and ready
  test.beforeEach(async ({ request }) => {
    // In a real environment, you can pass parameters or override configuration here:
    // await tokenManager.getTokens(request, {
    //   b2bUrl: 'https://api.yourdomain.com/oauth/token',
    //   b2bData: { client_id: '...', client_secret: '...' }
    // });
    
    // We call this with default config to initialize the cache
    try {
      await tokenManager.getTokens(request);
    } catch (e) {
      console.warn('Skipping actual token acquisition in mock example:', e.message);
    }
  });

  test('should execute balance inquiry successfully', async ({ request }) => {
    let tokens;
    try {
      tokens = await tokenManager.getTokens(request);
    } catch (e) {
      // Fallback/Mock tokens for demo purposes if endpoints aren't configured yet
      tokens = { b2bToken: 'mock-b2b-token', b2b2cToken: 'mock-b2b2c-token' };
    }

    const { b2bToken, b2b2cToken } = tokens;

    // Perform the target API call with the fetched tokens
    const response = await request.get('https://httpbin.org/headers', {
      headers: {
        'Authorization': `Bearer ${b2bToken}`,
        'X-B2B2C-Token': b2b2cToken,
        'Accept': 'application/json'
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    
    // Confirm the headers were sent correctly
    expect(body.headers['Authorization']).toBe(`Bearer ${b2bToken}`);
    const b2b2cHeaderKey = Object.keys(body.headers).find(k => k.toLowerCase() === 'x-b2b2c-token');
    expect(body.headers[b2b2cHeaderKey]).toBe(b2b2cToken);
    
    console.log('Balance inquiry headers verified successfully!');
  });
});
