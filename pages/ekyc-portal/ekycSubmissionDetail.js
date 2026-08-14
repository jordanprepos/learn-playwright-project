const { expect } = require("@playwright/test");

class EkycPortalSubmissionDetail {

    constructor(page) {
        this.page = page;
    }

    /**
     * Value of a field in the top summary card (2-column label/value rows),
     * e.g. "Submission ID", "Status Submission", "Category".
     *
     * Some labels (e.g. "Phone Number", "CIF") also appear in lower cards, so we
     * take the first match in DOM order — the summary card renders first.
    */
    summaryValue(label) {
        return this.page.locator('div.MuiGrid-container')
            .filter({ has: this.page.getByText(label, { exact: true }) }).first()
            .locator('> div.MuiGrid-item').last();
    }

    /**
     * Value in the "Client Data" (middle) column of the Customer Data section,
     * e.g. field "NIK" or "Name". These rows have 3 columns
     * (label / Client Data / Dukcapil Data), so the value is the 2nd item.
    */
    customerDataValue(label) {
        return this.oage.locator('div.MuiGrid-container')
            .filter({ has: this.page.getByText(label, { exact: true }) }).first()
            .locator('> div.MuiGrid-item').nth(1);
    }

}

module.exports = { EkycPortalSubmissionDetail };