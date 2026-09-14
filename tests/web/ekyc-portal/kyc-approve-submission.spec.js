const { test, expect } = require("@playwright/test");
const path = require("path");
const { EkycPortalLoginPage } = require("../../../pages/ekyc-portal/ekycPortalLoginPage");
const { EkycPortalSubmissionList } = require("../../../pages/ekyc-portal/ekycSubmissionList");
const { getColumnValues } = require("../../../utils/excelHelper");
const testData = require("../../../utils/testData");

// KSS bulk-upload template. Header row uses "*" to mark required fields (e.g. "NIK*").
const EXCEL_PATH = path.join(__dirname, "../../../data/ListNewSubmission.csv");

test.describe("EKYC Portal - Approve Submission", () => {
    let niks = [];

    test.beforeAll(async () => {
        // Read all NIK values from the data_kss sheet once, before the test runs.
        niks = await getColumnValues(EXCEL_PATH, "data_kss", "NIK*");
        expect(niks.length, "expected at least one NIK row in the sheet").toBeGreaterThan(0);
    });

    test("approve each pending NIK from ListNewSubmission file", async ({ page }) => {
        // Default 30s test timeout is sized for single-flow tests; this one drives
        // several real page navigations per NIK across up to 50 data_kss rows.
        test.setTimeout(600_000);

        const loginPage = new EkycPortalLoginPage(page);
        const submissionList = new EkycPortalSubmissionList(page);

        await loginPage.gotoEkycPortal();
        await loginPage.fillCredentials(
            testData.ekycPortal.ekycPortalUser,
            testData.ekycPortal.ekycPortalPass,
        );
        await loginPage.clickLoginButton();

        // Wait for the dashboard to render (app hydrated) before clicking the
        // sidebar — otherwise the client-side nav click is swallowed. Post-login
        // navigation can be slow on this sandbox, so allow more than the 5s default.
        await expect(page.getByRole("heading", { name: "DASHBOARD", level: 6 })).toBeVisible({
            timeout: 20_000,
        });

        for (const nik of niks) {
            await test.step(`NIK ${nik}`, async () => {
                // Approval redirects back to the list, so (re)navigate to it each iteration.
                await submissionList.navigateToSubmissionList();
                // Submit closes the sidebar, so reopen it for each NIK.
                await submissionList.navigateToSidebarFilterForm();
                await submissionList.filterByNik(nik); // fills NIK + clicks Submit

                // Sandbox data can drift out of sync with data_kss — some NIKs may no longer
                // have a matching submission. Skip those instead of failing the whole run.
                // The losing branch of the race still rejects on timeout, so catch it —
                // an unhandled rejection surfaces later and misattributes the failure.
                const found = await Promise.race([
                    submissionList
                        .resultRow(nik)
                        .waitFor({ state: "visible" })
                        .then(() => true)
                        .catch(() => false),
                    submissionList.noResultsMessage
                        .waitFor({ state: "visible" })
                        .then(() => false)
                        .catch(() => false),
                ]);
                if (!found) {
                    test.info().annotations.push({
                        type: "warning",
                        description: `NIK ${nik}: no submission found in sandbox (skipped)`,
                    });
                    return;
                }

                // Only call scanRows once the filtered table has rendered — count() does
                // not auto-wait, so scanning too early reads zero rows (or the previous NIK's).
                const rows = await submissionList.scanRows(nik);

                // A CIF on any row means this NIK has already been approved *and* provisioned
                // in an earlier pass, so there's nothing for an approval run to do. In the list
                // view an unprovisioned CIF is an empty cell (the "-" placeholder is detail-page only).
                if (rows.some((row) => row.cif !== "")) {
                    test.info().annotations.push({
                        type: "warning",
                        description: `NIK ${nik}: already provisioned (skipped)`,
                    });
                    return;
                }

                // The table is sorted newest-first, so find() gives the newest pending
                // submission — repeat bulk uploads stack up and we approve only that one.
                const pending = rows.find((row) => row.status === "WaitingApproval");
                if (!pending) {
                    test.info().annotations.push({
                        type: "warning",
                        description: `NIK ${nik}: nothing awaiting approval (skipped)`,
                    });
                    return;
                }

                await submissionList.approveSubmission(`Automated approval for NIK ${nik}`);

                // Re-search and confirm the approval took on that same submission. Addressing
                // the row by Submission ID (not a positional index) keeps this pinned to the
                // row we acted on after the list re-renders.
                await submissionList.navigateToSidebarFilterForm();
                await submissionList.filterByNik(nik);
                const approvedStatusCell = await submissionList.rowCell(pending.submissionId, "Status");
                await expect(approvedStatusCell).toHaveText("Approved", { timeout: 20_000 });
            });
        }
    });
});
