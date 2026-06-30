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
    headless: false,
    // baseURL: 'https://bima.meta-uat.nobubank.com',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
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
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // storageState is inherited or explicitly set here
        storageState: fs.existsSync(STORAGE_STATE) ? STORAGE_STATE : undefined,
      },
      // This project depends on 'setup' being successful
      // dependencies: ['setup'],
    },
    {
      name: 'api',
      testDir: './tests/api',
      use: {
        // No browser needed for API tests
      },
    },
    {
      name: 'web',
      testDir: './tests/web',
      use: {
        browserName: 'chromium',
      },
    },
  ],
});

module.exports.STORAGE_STATE = STORAGE_STATE;