const { test, expect } = require('@playwright/test');
const tokenManager = require("../../../../utils/tokenManager");
const { apiPath } = require("../../../../config/apiPath.config");
const { attachRequestResponse, attachScreenshot } = require("../../../../utils/reportHelper");
const { generateHeaders, generateTimestamp, generateJakartaTimestamp } = require('../../../../utils/headerHelper');
const { activePartner } = require('../../../../config/partners.config');
const testData = require('../../../../utils/testData');
const { enterPin } = require('../../../../utils/pinHelper');
const { formatRupiah } = require('../../../../utils/formatHelper');

const baseUrl = apiPath.batamBaseUrl;
const csaDecodeQrUrl = `${baseUrl}${apiPath.cobrandSavings.pathDecodeQr}`;
const csaPaymentQrUrl = `${baseUrl}${apiPath.cobrandSavings.pathPaymentQr}`;

test.describe('Cobrand Saving QR Transaction', () => {

    let tokens;
    test.beforeEach(async ({ request }) => {
        tokens = await tokenManager.getTokens(request);
        if (tokens.debug) {
            await attachRequestResponse({
                label: 'B2B Token',
                ...tokens.debug.b2b,
                url: tokens.debug.b2b.requestUrl,
                headers: tokens.debug.b2b.requestHeaders
            });
            await attachRequestResponse({
                label: 'B2B2C Token',
                ...tokens.debug.b2b2c,
                url: tokens.debug.b2b2c.requestUrl,
                headers: tokens.debug.b2b2c.requestHeaders
            });
        }
    });

    /**
     * Positive Flow of Cobrand Saving QR Transaction via API OBK
     */
    test.describe('Positive', () => {
        /**
         * Decode QR to Payment QR
         */
        test('Cobrand Saving Payment QR', async ({ request, page }) => {
            // Payment QR responds slowly on UAT; triple the test timeout (90s -> 270s)
            test.slow();

            // Step 1: Decode the QR to get the merchant details for the payment
            const decodeRequestBody = {
                partnerReferenceNo: Math.floor(Math.random() * 1e12).toString(),
                qrContent: testData.qrData.qrContent,
                scanTime: generateJakartaTimestamp(),
                additionalInfo: {
                    accountId: activePartner.accountId,
                }
            }

            const decodeHeaders = generateHeaders({
                method: 'POST',
                path: apiPath.cobrandSavings.pathDecodeQr,
                body: decodeRequestBody,
                activePartner,
                tokens
            })

            const decodeResponse = await request.post(csaDecodeQrUrl, {
                headers: decodeHeaders,
                data: decodeRequestBody
            });

            const decodeBody = await decodeResponse.json();

            expect(decodeResponse.status()).toBe(200);
            expect(decodeBody.responseCode).toMatch(/^\d{3}48\d{2}$/);
            expect(decodeBody.responseMessage).toBe("Request has been processed successfully");

            await attachRequestResponse({
                label: 'CSA - Decode QR',
                url: csaDecodeQrUrl,
                headers: decodeHeaders,
                requestBody: decodeRequestBody,
                responseHeaders: decodeResponse.headers(),
                responseBody: decodeBody,
                status: decodeResponse.status(),
                statusText: decodeResponse.statusText()
            });

            // Step 2: Pay using the merchant fields returned by Decode QR
            const requestBody = {
                // Timestamp-style reference, e.g. 20260710T2345250700
                partnerReferenceNo: decodeBody.partnerReferenceNo,
                merchantId: decodeBody.additionalInfo.merchantId,
                amount: {
                    value: "505500.00",
                    currency: "IDR"
                },
                feeAmount: decodeBody.feeAmount,
                additionalInfo: {
                    accountId: activePartner.accountId,
                    tipsAmount: Number(decodeBody.additionalInfo.tipsAmount || 0).toFixed(2),
                    tipsPercentage: String(decodeBody.additionalInfo.tipsPercentage ?? 0),
                    redirectUrl: activePartner.redirectUrl,
                    failedRedirectUrl: "",
                    pendingRedirectUrl: ""
                }
            }

            const headers = generateHeaders({
                method: 'POST',
                path: apiPath.cobrandSavings.pathPaymentQr,
                body: requestBody,
                activePartner,
                tokens
            })

            // Payment can be slow on UAT; allow up to 2 minutes for the response
            const responsePaymentQr = await request.post(csaPaymentQrUrl, {
                headers: headers,
                data: requestBody,
                timeout: 120000
            });

            const responseBodyPaymentQr = await responsePaymentQr.json();

            expect(responsePaymentQr.status()).toBe(200);
            expect(responseBodyPaymentQr.responseCode).toMatch(/^\d{3}50\d{2}$/);
            expect(responseBodyPaymentQr.responseMessage).toBe("Request has been processed successfully");
            const webViewUrl = responseBodyPaymentQr.additionalInfo?.webViewUrl;
            expect(webViewUrl).toContain('https://surabaya-obk-uat-onprem.nobubank.com/transactional/csa/qr-mpm-payment/');
            console.log("WEBVIEW URL >>>>>>>>>>>>> " + webViewUrl);

            await attachRequestResponse({
                label: 'CSA - Payment QR',
                url: csaPaymentQrUrl,
                headers,
                requestBody,
                responseHeaders: responsePaymentQr.headers(),
                responseBody: responseBodyPaymentQr,
                status: responsePaymentQr.status(),
                statusText: responsePaymentQr.statusText()
            });

            //Step 3: Open webview url
            // Tall viewport so the receipt fits without inner scrolling — this app
            // scrolls inside a nested container, which fullPage screenshots can't expand
            await page.setViewportSize({ width: 1280, height: 2000 });
            await page.goto(webViewUrl, {
                waitUntil: 'domcontentloaded'
            });
            await expect(
                page.getByRole(
                    'heading',
                    {
                        level: 1,
                        name: 'Masukkan 6 digit PIN Kamu'
                    })
            ).toBeVisible();
            // The product name varies ("Nobu", "Nobu Madera", ...), so match around it
            await expect(
                page.getByText(/Silahkan masukkan PIN .*kamu untuk melanjutkan transaksi/)
            ).toBeVisible();
            await attachScreenshot(page, 'Screenshot PIN Page');

            const pin = '142536';
            await enterPin(page, pin);

            const namaMerchant = decodeBody.merchantName;
            const idTerminal = decodeBody.additionalInfo.terminalId;
            const lokasiMerchant = decodeBody.merchantLocation;
            const panMerchant = decodeBody.additionalInfo.pan;
            const namaPengakuisisi = decodeBody.additionalInfo.acquirerId;
            const nominalTransaksi = responseBodyPaymentQr.amount.value;


            //Assert Compact Succes Page
            await expect(page.getByText('Detail Transaksi', { exact: true })).toBeVisible({ timeout: 15000 });
            await expect(page.getByText(formatRupiah(nominalTransaksi)).first()).toBeVisible();
            await expect(page.getByText('Bayar QRIS ke ' + namaMerchant)).toBeVisible();
            await expect(
                page.locator('div')
                    .filter({ has: page.getByText('Nama Merchant', { exact: true }) })
                    .filter({ hasText: namaMerchant })
                    .first()
            ).toBeVisible();
            await expect(page.getByText('Lihat Detail')).toBeVisible();
            await attachScreenshot(page, 'Screenshot - receipt-compact');

            //Assert Detail Page
            //tab Lihat Detail first then Assert all data
            await page.getByText('Lihat Detail').click();
            await expect(page.getByText('Sembunyikan Detail')).toBeVisible();
            await expect(
                page.locator('div')
                    .filter({ has: page.getByText('Nama Merchant', { exact: true }) })
                    .filter({ hasText: namaMerchant })
                    .first()
            ).toBeVisible();
            await expect(
                page.locator('div')
                    .filter({ has: page.getByText('ID Terminal', { exact: true }) })
                    .filter({ hasText: idTerminal })
                    .first()
            ).toBeVisible();
            await expect(
                page.locator('div')
                    .filter({ has: page.getByText('Lokasi Merchant', { exact: true }) })
                    .filter({ hasText: lokasiMerchant })
                    .first()
            ).toBeVisible();
            await expect(
                page.locator('div')
                    .filter({ has: page.getByText('PAN Merchant', { exact: true }) })
                    .filter({ hasText: panMerchant })
                    .first()
            ).toBeVisible();
            await expect(
                page.locator('div')
                    .filter({ has: page.getByText('Nama Pengakuisisi', { exact: true }) })
                    .filter({ hasText: namaPengakuisisi })
                    .first()
            ).toBeVisible();
            await expect(
                page.locator('div')
                    .filter({ has: page.getByText('Nominal', { exact: true }) })
                    .filter({ hasText: formatRupiah(nominalTransaksi) })
                    .first()
            ).toBeVisible();
            await expect(
                page.locator('div')
                    .filter({ has: page.getByText('Total', { exact: true }) })
                    .filter({ hasText: formatRupiah(nominalTransaksi) })
                    .first()
            ).toBeVisible();
            await attachScreenshot(page, 'Screenshot - Transaction Detail');
        });
    });




});