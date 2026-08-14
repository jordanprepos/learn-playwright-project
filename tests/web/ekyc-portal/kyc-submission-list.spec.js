const { test, expect } = require("@playwright/test");
const { EkycPortalLoginPage } = require("../../../pages/ekyc-portal/ekycPortalLoginPage");
const testData = require("../../../utils/testData");
const { dashboardBaseUrl } = require("../../../config/dashboardBase.config");

const portalEkycBaseUrl = dashboardBaseUrl.ekycPortalBaseUrl;

test.describe('EKYC Portal to Submission List Page', () => {
    test('Open Filter Sidebar from Submission List Page', async ({ page }) => {

        //login flow until success redirect to dashboard page
        const ekycPortalLoginPage = new EkycPortalLoginPage(page);
        const ekycPortalSubmissionList = new EkycPortalSubmissionList(page);
        await ekycPortalLoginPage.gotoEkycPortal()
        await ekycPortalLoginPage.fillCredentials(testData.ekycPortal.ekycPortalUser, testData.ekycPortal.ekycPortalPass)
        await ekycPortalLoginPage.clickLoginButton();
        await expect(page).toHaveURL(portalEkycBaseUrl + '/dashboard');
        await expect(page.getByRole('heading', { name: 'DASHBOARD', level: 6 })).toBeVisible();

        //flow to submission
        await ekycPortalSubmissionList.navigateToSubmissionList();
        await expect(page).toHaveURL(portalEkycBaseUrl + '/list-submission');

        //flow to filter submission
        await ekycPortalSubmissionList.navigateToSidebarFilterForm();
        await expect(page.getByRole('heading', { name: 'Filter Submission', level: 6 })).toBeVisible();

    });
});