// utils/reportHelper.js
const { test } = require('@playwright/test');

function formatHeaders(headers = {}) {
  return Object.entries(headers)
    .map(([key, value]) => `${key}\t${value}`)
    .join('\n');
}

/**
 * Attach one plain-text transcript of the full API exchange
 * (URL, request headers/body, response headers/body) to the report.
 * `url` and `responseHeaders` are optional for older call sites.
 */
async function attachRequestResponse({ label = 'API Call', url, headers, requestBody, responseHeaders, responseBody, status, statusText }) {
  const report = [
    `URL: ${url || '-'}`,
    '',
    'REQUEST HEADER:',
    '',
    formatHeaders(headers),
    '',
    'REQUEST BODY:',
    '',
    JSON.stringify(requestBody, null, 2),
    '',
    'RESPONSE HEADER:',
    '',
    `HTTP/1.1 ${status} ${statusText || ''}`.trim(),
    formatHeaders(responseHeaders),
    '',
    'RESPONSE BODY:',
    '',
    JSON.stringify(responseBody, null, 2),
  ].join('\n');

  await test.info().attach(label, { body: report, contentType: 'text/plain' });
}

/**
 * Attach a labeled full-page screenshot to the HTML report.
 * Call it after each screen/step you want captured.
 */
async function attachScreenshot(page, label = 'Screenshot') {
  await test.info().attach(label, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
}

module.exports = { attachRequestResponse, attachScreenshot };