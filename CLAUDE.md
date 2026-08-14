# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Playwright test suite for **Nobu Bank** (UAT/sandbox environments), covering:
- Direct REST API tests (cobrand-saving balance inquiry) against `sandbox-api.nobubank.com`
- Hybrid tests that trigger a flow via the REST API (reset PIN, change PIN, QR payment) and complete it in the resulting browser webview — entering PIN/OTP and reading OTPs from Slack
- Web UI tests against two internal admin portals via Page Object Model: the eKYC CMS portal (`tests/web/ekyc-portal`) and the internal Nobu dashboard (`tests/web/nobu-dashboard`)

There is no shared/cached login session (no Playwright `setup` project — it was removed as "hard to use"). Every web test authenticates fresh through its page object's own login flow at the start of the test body.

Several files in the tree are leftover/non-representative and should not be used as a pattern for new tests — see "Known dead / non-representative files" at the bottom.

## Commands

```bash
npm test                # run everything (playwright test — all projects: web, api, hybrid)
npm run test:web        # web project only (tests/web)
npm run test:api        # api project only (tests/api) — no browser
npm run test:hybrid     # hybrid project only (tests/hybrid) — API + browser combined
npm run test:hybrid:pos # hybrid tests grep-filtered to "Positive"
npm run test:hybrid:neg # hybrid tests grep-filtered to "Negative"
npm run format          # prettier --write over tests/, utils/, config/

npx playwright test <file>              # run a single spec file
npx playwright test -g "<test name>"    # run tests matching a title
npx playwright test tests/web/ekyc-portal/kyc-submission-search.spec.js --headed
npx playwright test --debug             # step through interactively
npx playwright show-report              # open the last HTML report
```

There is no separate lint/typecheck script — `npm run format` (Prettier) is the only static check.

## Environment setup

Copy `.env.example` to `.env` and fill in the Slack and Google Sheets vars it documents. **The template is incomplete** — these are also required and aren't listed in `.env.example`:
- Partner/private-key vars referenced in `config/partners.config.js`: `SANDBOX_*`, `CFX_*`, `BOOST_*`, `BUKUWARUNG_*`, `B2B_IP_ADDRESS`, `PARTNER_ENV`

What each integration is for:
- `SLACK_BOT_TOKEN` / `SLACK_OTP_CHANNEL_ID` — `utils/slackHelper.js` polls `#bento-bot` for OTPs during hybrid webview flows
- `GOOGLE_SHEETS_CLIENT_EMAIL` / `GOOGLE_SHEETS_PRIVATE_KEY` / `GOOGLE_SHEETS_SPREADSHEET_ID` — `utils/googleSheetsHelper.js` (service-account JWT auth) appends data-driven web test results to a Google Sheet tab

`.env` still carries `MYSQL_*` vars left over from a MySQL-based verification step — there is no `mysqlHelper.js` or any consumer of them anymore; they're vestigial and safe to ignore.

`playwright.config.js` forces `workers: 1` specifically to avoid env-var sharing issues across parallel workers — don't casually raise this without checking why it was pinned.

## Architecture

### Playwright projects (`playwright.config.js`)

Three projects, each scoped to its own `testDir`, no shared setup/dependency chain between them:
- `web` (`tests/web`) — browser UI tests. No `storageState`/auth dependency; each spec logs in itself.
- `api` (`tests/api`) — no browser context, pure `request` fixture calls.
- `hybrid` (`tests/hybrid`) — API + browser in the same test; 90s test timeout, 1200s navigation timeout (webview flows can be slow).

Data-driven `web` specs that loop over many rows (dozens of NIKs/phone numbers, each doing several real page interactions) will blow through Playwright's default 30s test timeout — they call `test.setTimeout(...)` as the first line of the test body (must be synchronous, before any `await`, per Playwright's contract). See `kyc-submission-search.spec.js` (`600_000`) and `unlink-device-search.spec.js` (`60 * 60 * 1000`).

`global-teardown.js` is currently just a placeholder that logs a completion message — it originally closed a MySQL pool, but that integration is gone.

### Partner/environment configuration (`config/partners.config.js`)

All API tests authenticate as a "partner" (a specific sandbox test identity: device ID, NIK, account ID/CIF, private key, etc). Partners are grouped under shared bases — `sandboxBase`, `cfxBase`, `boostBase`, `bukuWarungBase` — and selected at runtime via the `PARTNER_ENV` env var (defaults to `sandbox_uat_card_service`). `activePartner` (the resolved object) is imported directly by helpers and specs; there's no per-test partner override mechanism beyond changing `PARTNER_ENV`.

`config/apiPath.config.js` holds **API** base URLs and path fragments (e.g. `cobrandSavings.pathResetPin`) — specs build full URLs by combining `apiPath.batamBaseUrl` with a path constant, never hardcoding full URLs inline. `config/dashboardBase.config.js` is the equivalent for **browser UI** targets (OBK/BIMA CMS backoffice, eKYC portal, Nobu dashboard UAT/SIT) — keep these two config files separate; don't mix API paths into the dashboard config or vice versa.

### Auth token flow (`utils/tokenManager.js`)

A singleton `TokenManager` (module-level instance, shared across the whole run since `workers: 1`) that:
1. Fetches a B2B token (client-credentials grant, RSA-SHA256 signed with the partner's private key).
2. Uses that to fetch a B2B2C (customer-scoped) token.
3. Caches both in memory with a 30s-early expiry buffer; clears the cache on any failure so the next call retries cleanly.

Every API/hybrid spec calls `tokenManager.getTokens(request)` in `beforeEach` and only attaches the request/response debug info to the report when `tokens.debug` is present (i.e. freshly fetched, not served from cache).

### Request signing (`utils/headerHelper.js`)

`generateHeaders()` builds the full SNAP-style header set (`X-SIGNATURE`, `X-TIMESTAMP`, `X-EXTERNAL-ID`, etc.) for a single API call, HMAC-SHA512-signing `method:path:accessToken:sha256(body):timestamp` with the partner's `clientSecret`. This is distinct from `tokenManager.js`'s own RSA-SHA256 signing used specifically for the token-fetch endpoints — two different signing schemes for two different API layers, don't conflate them.

### Hybrid flow pattern (see `tests/hybrid/cobrand-saving/reset-pin/reset-pin.spec.js`)

The canonical hybrid test shape:
1. `beforeEach` fetches tokens via `tokenManager`; call the REST API (via `generateHeaders()` + the `request` fixture) to kick off a flow (reset PIN, change PIN, QR payment) and assert the SNAP response code/message.
2. Extract the webview URL from the response — **the field path differs per endpoint**, don't assume one shape: reset-pin uses `body.additionalInfo.webViewUrl`, change-pin uses `body.params.pinWebViewUrl`, QR payment uses `body.additionalInfo.webViewUrl` after a separate decode-QR call first. Check the actual response shape for new endpoints rather than copying one pattern blindly.
3. `page.goto(webviewUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })` and drive the UI with `utils/pinHelper.js` (`enterPin`/`enterOtp`).
4. Where the UI triggers an OTP, capture `Date.now()/1000` *before* the triggering action and pass it as `oldest` to `utils/slackHelper.js#getOtpFromSlack`, which polls `#bento-bot` and regex-matches the OTP tied to the partner's phone number — this ordering matters, otherwise a stale OTP from a previous run can be picked up.
5. Attach screenshots/request-response transcripts at each step via `utils/reportHelper.js` so the HTML report tells the full story.
6. For endpoints known to be slow on UAT (e.g. QR payment), call `test.slow()` (triples the timeout) rather than hand-rolling a custom timeout.

### Web admin-portal tests (`tests/web/ekyc-portal`, `tests/web/nobu-dashboard`)

Each spec logs in itself at the top of the test body via its page object (e.g. `EkycPortalLoginPage`, `NobuLoginPage`) — there's no cached session to reuse. Two recurring patterns worth following for new data-driven specs in this style:

- **Outcome racing instead of throwing.** When a UI action can land on one of several different states (error modal / not-found modal / success), race the possible locators with `Promise.race` and return a status string (`'error' | 'not_found' | 'success' | 'timeout'`) instead of asserting one specific outcome — see `UnlinkDevicePage.waitForOutcome()`. This lets a loop over many rows keep going instead of one bad input aborting the whole batch.
- **Shared UAT data drifts.** The eKYC submission-search spec's data (`data/excel.xlsx`, read via `utils/excelHelper.js`) can go stale between capture and test run — a NIK's status may have changed, or the NIK may no longer exist at all. `kyc-submission-search.spec.js` handles this explicitly (skip-and-log missing NIKs, branch on status instead of hard-asserting one value) rather than treating drift as a failure. Follow this shape for new specs against shared/mutable sandbox data instead of assuming fixture data stays valid.

Results are pushed out to two different places depending on direction: `utils/excelHelper.js` (exceljs) **reads** input data out of `.xlsx` files (e.g. NIK list for the eKYC search), while `utils/googleSheetsHelper.js` (googleapis, service-account JWT) **writes** run results out to a Google Sheet tab via `appendRows(rows, sheetName)` — uses `RAW` value input specifically so phone-number-like strings don't get their leading zero stripped by Sheets' auto-parsing.

### Page Object Model (`pages/`)

Each page class takes a Playwright `page` in its constructor and exposes action/assertion methods (e.g. `NobuLoginPage.gotoLogin()`, `EkycPortalSubmissionList.filterByNik()`). Locators are stored as instance properties, not scattered through specs. New UI flows should follow this shape rather than querying locators directly in spec files.

## Known dead / non-representative files

These exist in the tree but shouldn't be used as a pattern or assumed to work:

- `tests/web/simple-search-tokped.spec.js` + `pages/tokped.js` — unrelated Tokopedia (public e-commerce) demo left over from this repo's original boilerplate/learning-project origin.
- `tests/web/simultaneous.spec.js` + `pages/pinPage.js` — the original boilerplate's multi-window demo; currently broken (`testData.urls.webviewUrl` doesn't exist in `utils/testData.js`).
- `tests/web/tambah-limit-management.spec.js` + `pages/tambah-limit-management.js` — does target real config (BIMA/OBK CMS backoffice), but is written as a manual/debug script (`test.setTimeout(0)`, an unconditional `page.pause()` in `afterEach`), not an automated test to copy.
- `tests/fixtures.js` — dead custom-fixtures file; imports a nonexistent `../pages/ekyc-portal/submissionList` (the real file is `ekycSubmissionList.js`). Nothing in the repo imports `tests/fixtures.js`.
- `tests/web/ekyc-portal/kyc-submission-list.spec.js` — references `EkycPortalSubmissionList` without importing it; throws `ReferenceError` if run as-is.
