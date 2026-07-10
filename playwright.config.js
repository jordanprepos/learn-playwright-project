// playwright.config.js
require('dotenv').config();

const { defineConfig, devices } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// Define the path where the session state will be stored
const STORAGE_STATE = path.join(__dirname, '.auth/user.json');

module.exports = defineConfig({
    testDir: './tests',
    retries: 0,
    reporter: 'html',
    globalTeardown: require.resolve('./global-teardown'),
    use: {
        headless: true,
        // baseURL: 'https://bima.meta-uat.nobubank.com',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    // ✅ Pass env vars explicitly to all worker processes
    workers: 1,  // optional — forces single worker, avoids env sharing issues
    projects: [
        // Project to handle the authentication once
        {
            name: 'setup',
            testMatch: /auth\.setup\.js/,
            use: {
                // Allow setup to read the existing state to check validity
                storageState: fs.existsSync(STORAGE_STATE) ? STORAGE_STATE : undefined,
            }
        },
        // Main testing project(s)
        {
            name: 'web',
            // Tell this project to ONLY look inside the web folder, just like your 'web' project does
            testDir: './tests/web',
            use: {
                ...devices['Desktop Chrome'],
                // storageState is inherited or explicitly set here
                storageState: fs.existsSync(STORAGE_STATE) ? STORAGE_STATE : undefined,
                browserName: 'chromium',
                screenshot: 'only-on-failure',
            },
            // This project depends on 'setup' being successful
            dependencies: ['setup'],
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

module.exports.STORAGE_STATE = STORAGE_STATE;