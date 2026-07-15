const { expect } = require("@playwright/test");


class EkycPortalSubmissionList {

    constructor(page) {
        this.page = page;
        this.submissionBtn = this.page.getByRole('link', { name: 'List Submission', exact: true });
        this.submissionFilterBtn = this.page.getByRole('button', { name: 'Filter' });
    }

    async navigateToSubmissionList() {
        await expect(this.submissionBtn).toBeVisible();
        await this.submissionBtn.click();
    }

    async navigateToSidebarFilterForm() {
        await expect(this.submissionFilterBtn).toBeVisible();
        await this.submissionFilterBtn.click();

    }

}
module.exports = { EkycPortalSubmissionList };