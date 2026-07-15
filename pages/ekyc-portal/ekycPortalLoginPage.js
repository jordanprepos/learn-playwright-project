// /pages/ekyc-portal/ekycPortalLoginPage.js
/**
 * Put Playwright selector in this pages folder
 */

const { expect } = require("@playwright/test");
const testData = require("../../utils/testData");

class EkycPortalLoginPage {

    constructor(page) {
        //All page selector put here
        this.page = page;
        this.ekycPortalUrl = testData.ekycPortal.ekycPortalUrl;
        this.emailField = this.page.getByRole('textbox', { name: 'Email' });
        this.passwordField = this.page.locator('input[name="password"]');

    }

    async gotoEkycPortal() {
        await this.page.goto(this.ekycPortalUrl);
        await expect(this.page.getByRole('heading', { name: 'CMS KYC', level: 4 })).toBeVisible();
    }

    async fillCredentials(email, password) {
        await this.emailField.fill(email);
        await this.passwordField.fill(password);
    }

    async clickLoginButton() {
        await this.page.getByRole('button', { name: 'Sign In Now' }).click();
    }
}
module.exports = { EkycPortalLoginPage };
