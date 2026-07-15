// playwright.config.js
require('dotenv').config();

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests',
    retries: 0,
    reporter: 'html',
    globalTeardown: require.resolve('./global-teardown'),
    use: {
        headless: true,
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    // ✅ Pass env vars explicitly to all worker processes
    workers: 1,  // optional — forces single worker, avoids env sharing issues
    projects: [
        {
            name: 'web',
            testDir: './tests/web',
            use: {
                ...devices['Desktop Chrome'],
                browserName: 'chromium',
                screenshot: 'only-on-failure',
            },
        },
        {
            name: 'api',
            testDir: './tests/api',
            use: {
                // No browser needed for API tests
            },
        },
        {
            name: 'hybrid', // API + browser
            testDir: './tests/hybrid',
            timeout: 90000,
            use: {
                browserName: 'chromium',
                navigationTimeout: 1200000,
            },
        },
    ],
});