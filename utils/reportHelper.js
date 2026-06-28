// utils/reportHelper.js
const { test } = require('@playwright/test');

async function attachRequestResponse({ label = 'API Call', headers, requestBody, responseBody, status, statusText }) {
  await test.info().attach(`[${label}] Request Headers`, {
    body: JSON.stringify(headers, null, 2),
    contentType: 'application/json',
  });
  await test.info().attach(`[${label}] Request Body`, {
    body: JSON.stringify(requestBody, null, 2),
    contentType: 'application/json',
  });
  await test.info().attach(`[${label}] Response Status`, {
    body: `${status}`,
    contentType: 'text/plain',
  });
  await test.info().attach(`[${label}] Response Body`, {
    body: JSON.stringify(responseBody, null, 2),
    contentType: 'application/json',
  });
}

module.exports = { attachRequestResponse };