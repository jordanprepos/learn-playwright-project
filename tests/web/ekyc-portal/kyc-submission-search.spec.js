const { test, expect } = require("@playwright/test");
const path = require("path");
const { EkycPortalLoginPage } = require("../../../pages/ekyc-portal/ekycPortalLoginPage");
const { EkycPortalSubmissionList } = require("../../../pages/ekyc-portal/ekycSubmissionList");
const { getColumnValues } = require("../../../utils/excelHelper");
const testData = require("../../../utils/testData");
const { EkycPortalSubmissionDetail } = require("../../../pages/ekyc-portal/ekycSubmissionDetail");

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
        // Default 30s test timeout is sized for single-flow tests; this one drives
        // several real page navigations per NIK across up to 50 data_kss rows.
        test.setTimeout(600_000);

        const loginPage = new EkycPortalLoginPage(page);
        const submissionList = new EkycPortalSubmissionList(page);
        const submissionDetail = new EkycPortalSubmissionDetail(page);

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
                // Each iteration starts (and, after detail view, ends) off the list, so (re)navigate to it.
                await submissionList.navigateToSubmissionList();
                // Submit closes the sidebar, so reopen it for each NIK.
                await submissionList.navigateToSidebarFilterForm();
                await submissionList.filterByNik(nik); // fills NIK + clicks Submit

                // Sandbox data can drift out of sync with data_kss — some NIKs may no longer
                // have a matching submission. Skip those instead of failing the whole run.
                const found = await Promise.race([
                    submissionList
                        .resultRow(nik)
                        .waitFor({ state: "visible" })
                        .then(() => true),
                    submissionList.noResultsMessage.waitFor({ state: "visible" }).then(() => false),
                ]);
                if (!found) {
                    test.info().annotations.push({
                        type: "warning",
                        description: `NIK ${nik}: no submission found in sandbox (skipped)`,
                    });
                    return;
                }

                const rowDataStatus = await submissionList.rowCell(nik, "Status");
                const status = (await rowDataStatus.textContent()).trim();

                // Capture the Submission ID from the row, then open its detail page.
                const submissionId = await submissionList.getSubmissionId(nik);
                await submissionList.openSubmissionDetail(nik); // clicks View Details for this NIK

                // The detail URL must carry the same Submission ID as the row.
                await expect(page).toHaveURL(new RegExp(`/list-submission/detail/${submissionId}`));
                // Detail data loads asynchronously after navigation (fields show "-" behind a spinner
                // until it resolves) and can take longer than the default 5s on a slow response.
                await expect(submissionDetail.summaryValue("Submission ID")).toHaveText(submissionId, {
                    timeout: 20_000,
                });

                if (status === "Approved") {
                    // Sandbox data can drift to Approved between excel.xlsx being captured and
                    // the test running. Account provisioning (CIF/Account Number) can lag behind
                    // approval, so log instead of failing when they're not yet populated.
                    const cif = (await submissionDetail.summaryValue("CIF").textContent()).trim();
                    const accountNumber = (
                        await submissionDetail.summaryValue("Account Number").textContent()
                    ).trim();

                    if (cif === "-") {
                        test.info().annotations.push({
                            type: "warning",
                            description: `NIK ${nik}: Approved but CIF not yet provisioned`,
                        });
                    }
                    if (accountNumber === "-") {
                        test.info().annotations.push({
                            type: "warning",
                            description: `NIK ${nik}: Approved but Account Number not yet provisioned`,
                        });
                    }
                } else {
                    expect(status, `unexpected status for NIK ${nik}`).toBe("WaitingApproval");
                    await expect(submissionDetail.summaryValue("Status Submission")).toHaveText("Waiting Approval");
                    await expect(submissionDetail.customerDataValue("NIK")).toHaveText(nik);

                    // Approve eKYC Submission
                    await submissionList.approveSubmission(`Automated approval for NIK ${nik}`);

                    // Re-search the same NIK to confirm the approval actually took effect.
                    await submissionList.navigateToSidebarFilterForm();
                    await submissionList.filterByNik(nik);
                    await expect(submissionList.resultRow(nik)).toBeVisible();
                    const approvedStatusCell = await submissionList.rowCell(nik, "Status");
                    await expect(approvedStatusCell).toHaveText("Approved", { timeout: 20_000 });

                    const approvedSubmissionId = await submissionList.getSubmissionId(nik);
                    await submissionList.openSubmissionDetail(nik);
                    await expect(page).toHaveURL(new RegExp(`/list-submission/detail/${approvedSubmissionId}`));
                    await expect(submissionDetail.summaryValue("Submission ID")).toHaveText(approvedSubmissionId, {
                        timeout: 20_000,
                    });
                    await expect(submissionDetail.summaryValue("CIF")).not.toHaveText("-", { timeout: 20_000 });
                    await expect(submissionDetail.summaryValue("Account Number")).not.toHaveText("-", {
                        timeout: 20_000,
                    });
                }
            });

        }


    });
});
