const { test, expect, request } = require("@playwright/test");
const { EkycPortalLoginPage } = require("../../../pages/ekyc-portal/ekycPortalLoginPage");

test.describe('Approval Sumbission EKYC Portal', () => {
    test('Approval Submission EKYC Portal', async ({ page }) => {
        const ekycPortalLoginPage = new EkycPortalLoginPage(page)

    });
});