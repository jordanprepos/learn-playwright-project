const { test, expect } = require("@playwright/test");
const path = require("path");
const { EkycPortalLoginPage } = require("../../../pages/ekyc-portal/ekycPortalLoginPage");
const { EkycPortalSubmissionList } = require("../../../pages/ekyc-portal/ekycSubmissionList");
const { getColumnValues } = require("../../../utils/excelHelper");
const testData = require("../../../utils/testData");

// KSS bulk-upload template. Header row uses "*" to mark required fields (e.g. "NIK*").
const EXCEL_PATH = path.join(__dirname, "../../../data/excel.xlsx");

test.describe("EKYC Portal - Submission search by NIK (data-driven)", () => {
    let niks = [];

    test.beforeAll(async () => {
        // Read all NIK values from the data_kss sheet once, before the test runs.
        niks = await getColumnValues(EXCEL_PATH, "data_kss", "NIK*");
        expect(niks.length, "expected at least one NIK row in the sheet").toBeGreaterThan(0);
    });

    test("search each NIK from data_kss", async ({ page }) => {
        const loginPage = new EkycPortalLoginPage(page);
        const submissionList = new EkycPortalSubmissionList(page);

        await loginPage.gotoEkycPortal();
        await loginPage.fillCredentials(
            testData.ekycPortal.ekycPortalUser,
            testData.ekycPortal.ekycPortalPass,
        );
        await loginPage.clickLoginButton();

        // Wait for the dashboard to render (app hydrated) before clicking the
        // sidebar — otherwise the client-side nav click is swallowed.
        await expect(page.getByRole("heading", { name: "DASHBOARD", level: 6 })).toBeVisible();

        await submissionList.navigateToSubmissionList();

        for (const nik of niks) {
            await test.step(`NIK ${nik}`, async () => {
                // Submit closes the sidebar, so reopen it for each NIK.
                await submissionList.navigateToSidebarFilterForm();
                await submissionList.filterByNik(nik); // fills NIK + clicks Submit
                await expect(submissionList.resultRow(nik)).toBeVisible();

                // Capture the Submission ID from the row, then open its detail page.
                const submissionId = await submissionList.getSubmissionId(nik);
                await submissionList.openSubmissionDetail(nik); // clicks View Details for this NIK

                // The detail URL must carry the same Submission ID as the row.
                await expect(page).toHaveURL(new RegExp(`/list-submission/detail/${submissionId}`));
            });

        }
    });
});
