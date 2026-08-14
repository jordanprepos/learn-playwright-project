const { expect } = require("@playwright/test");


class EkycPortalSubmissionList {

    constructor(page) {
        this.page = page;
        this.listSubmissionBtn = this.page.getByRole('link', { name: 'List Submission', exact: true });
        this.submissionFilterBtn = this.page.getByRole('button', { name: 'Filter', exact: true });
        this.nikFilterField = this.page.locator('input[name="nik"]');
        this.submitFilterBtn = this.page.getByRole('button', { name: 'Submit', exact: true });
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
     * Fills the NIK field in the filter sidebar and applies the filter.
     */
    async filterByNik(nik) {
        await expect(this.nikFilterField).toBeVisible();
        await this.nikFilterField.fill(nik);
        await this.submitFilterBtn.click();
    }

    /**
     * Returns the results-table row whose NIK cell exactly matches the given NIK.
     * Exact match avoids colliding with the Phone Number column, which can share
     * a trailing digit sequence with the NIK.
     */
    resultRow(nik) {
        return this.page.getByRole('row').filter({
            has: this.page.getByRole('cell', { name: nik, exact: true }),
        });
    }

    /**
     * Reads the Submission ID (first column) from the row matching the given NIK.
     */
    async getSubmissionId(nik) {
        const idCell = this.resultRow(nik).getByRole('cell').first();
        return (await idCell.textContent()).trim();
    }

    viewDetailsButton(nik) {
        return this.resultRow(nik).getByRole('button', { name: 'View Details' });
    }
    /**
     * Opens the submission detail for the row matching the given NIK.
     * Auto-scrolls the (possibly off-screen) Action column into view before clicking,
     * then waits for the detail route to load.
     */
    async openSubmissionDetail(nik) {
        await this.viewDetailsButton(nik).click();
        await this.page.waitForURL('**/list-submission/detail/**');
    }

    /**
    * 0-based index of a column by its header text (e.g. "Status", "Name"),
    * so cell lookups don't break if columns are reordered.
    */
    async getColumnIndex(columnName) {
        const labels = await this.page.getByRole('columnheader').allTextContents();
        const index = labels.findIndex((text => text.trim() === columnName));
        if ((await headers.nth(i).innerText()).trim() === columnName) {
            throw new Error(`Column "${columnName}" not found in the submission table header`);

        }
        return index;
    }


    /**
     * Cell locator for a given column in the row matching the NIK.
     * Returned as a locator so assertions like toHaveText auto-retry.
     */
    async rowCell(nik, columnName) {
        const index = await this.getColumnIndex(columnName);
        return this.resultRow(nik).getByRole('cell').nth(index);
    }



}
module.exports = { EkycPortalSubmissionList };
