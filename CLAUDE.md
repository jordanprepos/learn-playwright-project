# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Playwright test suite for **Nobu Bank** (UAT/sandbox environments), covering:
- Web UI flows (BIMA admin portal login, PIN entry) via Page Object Model
- Direct REST API tests (cobrand-saving balance inquiry, reset PIN) against `sandbox-api.nobubank.com`
- Hybrid tests that combine an API call with a resulting browser webview flow (e.g. trigger reset-PIN via API, then complete it in the browser, reading the OTP from Slack and verifying account data in MySQL)

`tests/web` also holds a couple of unrelated scratch specs left over from this repo's original boilerplate/learning-project origin (`simple-search-tokped.spec.js`, `tambah-limit-management.spec.js`, backed by `pages/tokped.js` and `pages/tambah-limit-management.js`) — these aren't part of the Nobu Bank BIMA/PIN flow and shouldn't be used as the pattern to follow for new tests.

## Commands

```bash
npm test                # run everything (playwright test)
npm run test:web        # web project only (tests/web) — needs the `setup` auth project first, handled via dependencies
npm run test:api        # api project only (tests/api) — no browser
npm run test:hybrid     # hybrid project only (tests/hybrid) — API + browser combined
npm run test:hybrid:pos # hybrid tests grep-filtered to "Positive"
npm run test:hybrid:neg # hybrid tests grep-filtered to "Negative"
npm run format          # prettier --write over tests/, utils/, config/

npx playwright test <file>              # run a single spec file
npx playwright test -g "<test name>"    # run tests matching a title
npx playwright test tests/web/simultaneous.spec.js --headed
npx playwright test --debug             # step through interactively
npx playwright show-report              # open the last HTML report
```

There is no separate lint/typecheck script — `npm run format` (Prettier) is the only static check.

## Environment setup

Copy `.env.example` to `.env` and fill in:
- `SLACK_BOT_TOKEN` / `SLACK_OTP_CHANNEL_ID` — used by `utils/slackHelper.js` to read OTPs posted to `#bento-bot`
- `MYSQL_HOST/PORT/USER/PASSWORD/DATABASE/SSL` — used by `utils/mysqlHelper.js` for read-only verification against a test/staging DB (never production)
- Partner/private-key env vars referenced in `config/partners.config.js` (e.g. `SANDBOX_*`, `CFX_*`, `BOOST_*`, `BUKUWARUNG_*`, `B2B_IP_ADDRESS`, `PARTNER_ENV`)

`playwright.config.js` forces `workers: 1` specifically to avoid env-var sharing issues across parallel workers — don't casually raise this without checking why it was pinned.

## Architecture

### Playwright projects (`playwright.config.js`)

Four projects, each scoped to its own `testDir`:
- `setup` — runs `tests/web/auth.setup.js` once, saves logged-in session state to `.auth/user.json`. Skips re-login if the cached JWT (`access_token` cookie) isn't within 60s of expiring.
- `web` (`tests/web`) — browser UI tests, `dependencies: ['setup']`, reuses `.auth/user.json` as `storageState`.
- `api` (`tests/api`) — no browser context, pure `request` fixture calls. Includes `mysql-connectivity.spec.js`, a plain smoke test that runs `SELECT 1` through `utils/mysqlHelper.js` to verify DB env vars are wired up correctly.
- `hybrid` (`tests/hybrid`) — API + browser in the same test; 90s test timeout, 1200s navigation timeout (webview flows can be slow).

`global-teardown.js` closes the shared MySQL pool (`utils/mysqlHelper.js`) once after the whole run finishes — this is the only reason a global teardown exists.

### Partner/environment configuration (`config/partners.config.js`)

All API tests authenticate as a "partner" (a specific sandbox test identity: device ID, NIK, account ID/CIF, private key, etc). Partners are grouped under three shared bases — `sandboxBase`, `cfxBase`, `boostBase` — and selected at runtime via the `PARTNER_ENV` env var (defaults to `sandbox_uat_card_service`). `activePartner` (the resolved object) is imported directly by helpers and specs; there's no per-test partner override mechanism beyond changing `PARTNER_ENV`.

`config/apiPath.config.js` holds base URLs and path fragments (e.g. `cobrandSavings.pathResetPin`) — specs build full URLs by combining `apiPath.batamBaseUrl` with a path constant, never hardcoding full URLs inline.

### Auth token flow (`utils/tokenManager.js`)

A singleton `TokenManager` (module-level instance, shared across the whole run since `workers: 1`) that:
1. Fetches a B2B token (client-credentials grant, RSA-SHA256 signed with the partner's private key).
2. Uses that to fetch a B2B2C (customer-scoped) token.
3. Caches both in memory with a 30s-early expiry buffer; clears the cache on any failure so the next call retries cleanly.

Every API spec calls `tokenManager.getTokens(request)` in `beforeEach` and only attaches the request/response debug info to the report when `tokens.debug` is present (i.e. freshly fetched, not served from cache).

### Request signing (`utils/headerHelper.js`)

`generateHeaders()` builds the full SNAP-style header set (`X-SIGNATURE`, `X-TIMESTAMP`, `X-EXTERNAL-ID`, etc.) for a single API call, HMAC-SHA512-signing `method:path:accessToken:sha256(body):timestamp` with the partner's `clientSecret`. This is distinct from `tokenManager.js`'s own RSA-SHA256 signing used specifically for the token-fetch endpoints — two different signing schemes for two different API layers, don't conflate them.

### Hybrid flow pattern (see `tests/hybrid/cobrand-saving/reset-pin/resetPin.spec.js`)

The canonical hybrid test shape:
1. Verify preconditions directly in MySQL (`utils/mysqlHelper.js` — `query`/`queryOne`, always parameterized, never string-concatenated).
2. Call the REST API to kick off a flow (e.g. reset PIN), extract a `webViewUrl` from the response.
3. Navigate the browser to that webview and drive the UI (page objects + `utils/pinHelper.js` for PIN/OTP digit entry).
4. Where the UI triggers an OTP, capture `Date.now()/1000` *before* the triggering action and pass it as `oldest` to `utils/slackHelper.js#getOtpFromSlack`, which polls the `#bento-bot` Slack channel and regex-matches the OTP tied to the partner's phone number — this ordering matters, otherwise a stale OTP from a previous run can be picked up.
5. Attach screenshots/request-response transcripts at each step via `utils/reportHelper.js` so the HTML report tells the full story.

### Page Object Model (`pages/`)

Each page class takes a Playwright `page` in its constructor and exposes action/assertion methods (e.g. `LoginPage.login()`, `PinPage.verifyIsOnPinPage()`). Locators are stored as instance properties, not scattered through specs. New UI flows should follow this shape rather than querying locators directly in spec files.
