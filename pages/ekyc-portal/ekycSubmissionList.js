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

    viewDetailsButton(nik) {
        return this.resultRow(nik).getByRole('button', { name: 'View Details' });
    }

    /**
     * Reads the Submission ID (first column) from the row matching the given NIK.
     */
    async getSubmissionId(nik) {
        const idCell = this.resultRow(nik).getByRole('cell').first();
        return (await idCell.innerText()).trim();
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

}
module.exports = { EkycPortalSubmissionList };
