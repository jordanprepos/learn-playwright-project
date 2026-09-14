const { test, expect } = require("@playwright/test");
const path = require("path");
const { EkycPortalLoginPage } = require("../../../pages/ekyc-portal/ekycPortalLoginPage");
const { EkycPortalSubmissionList } = require("../../../pages/ekyc-portal/ekycSubmissionList");
const { getColumnValues, updateRowByKey } = require("../../../utils/excelHelper");
const testData = require("../../../utils/testData");
const { EkycPortalSubmissionDetail } = require("../../../pages/ekyc-portal/ekycSubmissionDetail");

// KSS bulk-upload template. Header row uses "*" to mark required fields (e.g. "NIK*").
const EXCEL_PATH = path.join(__dirname, "../../../data/excel.xlsx");

/**
 * Writes CIF / Account Number back into the data_kss row for this NIK (columns
 * "CIF*" / "Nomor Rekening Auto Debet" are blank placeholders in the KSS
 * template until a submission is approved and provisioned). Skips any value
 * still showing the "-" placeholder instead of writing a meaningless dash.
 */
async function writeProvisioningResult(nik, { cif, accountNumber }) {
    const valuesByColumn = {};
    if (cif && cif !== "-") valuesByColumn["CIF*"] = cif;
    if (accountNumber && accountNumber !== "-") valuesByColumn["Nomor Rekening Auto Debet"] = accountNumber;

    if (Object.keys(valuesByColumn).length === 0) return;
    await updateRowByKey(EXCEL_PATH, "data_kss", "NIK*", nik, valuesByColumn);
}

/**
 * Opens a submission's detail page and waits for its data to load — fields show
 * the "-" placeholder behind a spinner until it resolves, so reading too early
 * returns placeholders. Matching Submission ID doubles as the load signal and as
 * a check that the right submission opened.
 */
async function openDetail(submissionList, submissionDetail, submissionId) {
    await submissionList.openSubmissionDetail(submissionId);
    await expect(submissionDetail.summaryValue("Submission ID")).toHaveText(submissionId, {
        timeout: 20_000,
    });
}

/**
 * Reads CIF / Account Number off the open detail page and records them in the
 * sheet, annotating any that are still the "-" placeholder.
 *
 * These are *recorded, not asserted*. Approval alone does not provision an
 * account within a run — submissions approved hours earlier still show "-" — so
 * asserting a value here fails on a state the backend simply hasn't reached yet.
 */
async function recordProvisioning(submissionDetail, nik, status) {
    const cif = (await submissionDetail.summaryValue("CIF").textContent()).trim();
    const accountNumber = (await submissionDetail.summaryValue("Account Number").textContent()).trim();

    for (const [label, value] of [["CIF", cif], ["Account Number", accountNumber]]) {
        if (value === "-") {
            test.info().annotations.push({
                type: "warning",
                description: `NIK ${nik}: ${status} but ${label} not yet provisioned`,
            });
        }
    }

    await writeProvisioningResult(nik, { cif, accountNumber });
    return { cif, accountNumber };
}

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

                // A NIK has many submissions and only some are provisioned — and Status
                // doesn't tell you which (two rows can both be "Approved" with only one
                // carrying a CIF). So pick the row by its CIF cell: take the provisioned
                // one if there is one, otherwise drive the pending one through approval.
                const rows = await submissionList.scanRows(nik);
                const provisioned = rows.find((row) => row.cif !== "");
                const pending = rows.find((row) => row.status === "WaitingApproval");

                if (provisioned) {
                    await openDetail(submissionList, submissionDetail, provisioned.submissionId);
                    await recordProvisioning(submissionDetail, nik, provisioned.status);
                    return;
                }

                if (!pending) {
                    // Every row is unprovisioned and none is awaiting approval — a real
                    // state (nothing to act on), distinct from the NIK being missing.
                    test.info().annotations.push({
                        type: "warning",
                        description: `NIK ${nik}: no CIF provisioned and nothing awaiting approval (skipped)`,
                    });
                    return;
                }

                await openDetail(submissionList, submissionDetail, pending.submissionId);
                await expect(submissionDetail.summaryValue("Status Submission")).toHaveText("Waiting Approval");
                await expect(submissionDetail.customerDataValue("NIK")).toHaveText(nik);

                await submissionList.approveSubmission(`Automated approval for NIK ${nik}`);

                // Re-search and confirm the approval took on that same submission.
                await submissionList.navigateToSidebarFilterForm();
                await submissionList.filterByNik(nik);
                const approvedStatusCell = await submissionList.rowCell(pending.submissionId, "Status");
                await expect(approvedStatusCell).toHaveText("Approved", { timeout: 20_000 });

                // Provisioning is recorded, not asserted: approval does not generate a
                // CIF within the run (rows approved hours earlier still show none), so
                // this captures whatever exists and annotates when it doesn't.
                await openDetail(submissionList, submissionDetail, pending.submissionId);
                await recordProvisioning(submissionDetail, nik, "Approved");
            });

        }


    });
});
