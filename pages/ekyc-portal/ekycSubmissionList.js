const { expect } = require("@playwright/test");


class EkycPortalSubmissionList {

    constructor(page) {
        this.page = page;
        this.listSubmissionBtn = this.page.getByRole('link', { name: 'List Submission', exact: true });
        this.submissionFilterBtn = this.page.getByRole('button', { name: 'Filter', exact: true });
        this.nikFilterField = this.page.locator('input[name="nik"]');
        this.submitFilterBtn = this.page.getByRole('button', { name: 'Submit', exact: true });
        this.noResultsMessage = this.page.getByRole('heading', { name: 'No results found' });
        this.detailApproveBtn = this.page.getByRole('button', { name: 'Approve', exact: true });
        this.approvalRemarksField = this.page.getByPlaceholder('please fill remarks first');
        this.approvalConfirmYesBtn = this.page.getByRole('button', { name: 'Yes', exact: true });
    }

    async navigateToSubmissionList() {
        await expect(this.listSubmissionBtn).toBeVisible();
        await this.listSubmissionBtn.click();
        await this.page.waitForURL('**/list-submission');
    }

    async navigateToSidebarFilterForm() {
        await expect(this.submissionFilterBtn).toBeVisible();
        await this.submissionFilterBtn.click();
    }

    /**
     * Approves the currently open submission's detail page: clicks Approve,
     * fills the confirmation modal's remark (Yes stays disabled until it's
     * non-empty), confirms, then waits for the redirect back to the list
     * once the system finishes processing.
     */
    async approveSubmission(remark) {
        await expect(this.detailApproveBtn).toBeVisible();
        await this.detailApproveBtn.click();

        await expect(this.approvalRemarksField).toBeVisible();
        await this.approvalRemarksField.fill(remark);

        await expect(this.approvalConfirmYesBtn).toBeEnabled();
        await this.approvalConfirmYesBtn.click();

        await this.page.waitForURL('**/list-submission', { timeout: 15_000 });
    }

    /**
     * Fills the NIK field in the filter sidebar and applies the filter.
     */
    async filterByNik(nik) {
        await expect(this.nikFilterField).toBeVisible();
        await this.nikFilterField.fill(nik);
        await this.submitFilterBtn.click();
    }

    /**
     * Every submission row for the given NIK. A NIK accumulates many submissions
     * (repeat runs stack up) and the portal's NIK filter returns all of them, so
     * this is deliberately plural — callers pick the row they want, usually via
     * scanRows(). Exact match keeps this off the Phone Number column, which can
     * share a trailing digit sequence with the NIK.
     */
    resultRows(nik) {
        return this.page.getByRole('row').filter({
            has: this.page.getByRole('cell', { name: nik, exact: true }),
        });
    }

    /**
     * Newest row for the NIK (the table is sorted newest-first). Single-row, so
     * it is safe for strict operations like waitFor — use it to wait for the
     * filtered table to render before calling scanRows().
     */
    resultRow(nik) {
        return this.resultRows(nik).first();
    }

    /**
     * A row addressed by its Submission ID. IDs are unique, so this is strict-safe
     * without .first() and — unlike a positional index — still points at the same
     * submission after the list re-renders (e.g. following an approval).
     */
    rowBySubmissionId(submissionId) {
        return this.page.getByRole('row').filter({
            has: this.page.getByRole('cell', { name: submissionId, exact: true }),
        });
    }

    /**
     * Reads Submission ID / CIF / Status off every row for this NIK, so a caller
     * can choose which submission to act on.
     *
     * Whether a submission is provisioned is not predictable from its Status —
     * two rows can both be "Approved" with only one carrying a CIF — so the CIF
     * cell itself is the discriminator. An unprovisioned CIF is an *empty* cell
     * here (the "-" placeholder is a detail-page thing).
     *
     * Only call this once the filtered table has rendered; count() does not
     * auto-wait, so scanning too early reads zero rows — or the previous NIK's.
     */
    async scanRows(nik) {
        const [idIndex, cifIndex, statusIndex] = await Promise.all([
            this.getColumnIndex('Submission ID'),
            this.getColumnIndex('CIF'),
            this.getColumnIndex('Status'),
        ]);

        const rows = this.resultRows(nik);
        const summaries = [];
        for (let i = 0; i < (await rows.count()); i++) {
            const cells = rows.nth(i).getByRole('cell');
            const [submissionId, cif, status] = await Promise.all([
                cells.nth(idIndex).textContent(),
                cells.nth(cifIndex).textContent(),
                cells.nth(statusIndex).textContent(),
            ]);
            summaries.push({
                submissionId: submissionId.trim(),
                cif: cif.trim(),
                status: status.trim(),
            });
        }
        return summaries;
    }

    /**
     * Opens the submission detail for a given Submission ID, then waits for the
     * detail route to load.
     */
    async openSubmissionDetail(submissionId) {
        await this.rowBySubmissionId(submissionId)
            .getByRole('button', { name: 'View Details' })
            .click();
        await this.page.waitForURL(`**/list-submission/detail/${submissionId}`);
    }

    /**
    * 0-based index of a column by its header text (e.g. "Status", "Name"),
    * so cell lookups don't break if columns are reordered.
    */
    async getColumnIndex(columnName) {
        const labels = await this.page.getByRole('columnheader').allTextContents();
        const index = labels.findIndex((text => text.trim() === columnName));
        if (index === -1) {
            throw new Error(`Column "${columnName}" not found in the submission table header`);
        }
        return index;
    }


    /**
     * Cell locator for a given column in the row with this Submission ID.
     * Returned as a locator so assertions like toHaveText auto-retry.
     */
    async rowCell(submissionId, columnName) {
        const index = await this.getColumnIndex(columnName);
        return this.rowBySubmissionId(submissionId).getByRole('cell').nth(index);
    }



}
module.exports = { EkycPortalSubmissionList };
