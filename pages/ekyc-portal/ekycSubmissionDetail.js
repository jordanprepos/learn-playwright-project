const { expect } = require("@playwright/test");

class EkycPortalSubmissionDetail {

    constructor(page) {
        this.page = page;
    }

    /**
     * Value of a field in the top summary card (2-column label/value rows),
     * e.g. "Submission ID", "Status Submission", "Category".
     *
     * Anchors on the label's own text node (not a container) since MuiGrid
     * containers nest, making "container that has this text" ambiguous at
     * every level of the tree. Some labels (e.g. "Phone Number", "CIF") also
     * appear in lower cards, so we take the first match in DOM order — the
     * summary card renders first.
    */
    summaryValue(label) {
        return this.page.getByText(label, { exact: true }).first()
            .locator(
                'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " MuiGrid-item ")][1]' +
                '/following-sibling::div[contains(concat(" ", normalize-space(@class), " "), " MuiGrid-item ")][1]',
            );
    }

    /**
     * Value in the "Client Data" (middle) column of the Customer Data section,
     * e.g. field "NIK" or "Name". These rows have 3 columns
     * (label / Client Data / Dukcapil Data); Client Data is the cell
     * immediately following the label.
    */
    customerDataValue(label) {
        return this.page.getByText(label, { exact: true }).first()
            .locator(
                'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " MuiGrid-item ")][1]' +
                '/following-sibling::div[contains(concat(" ", normalize-space(@class), " "), " MuiGrid-item ")][1]',
            );
    }

}

module.exports = { EkycPortalSubmissionDetail };