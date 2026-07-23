// /pages/nobu-dashboard/nobuLoginPage.js
const { expect } = require("@playwright/test");
const { dashboardBaseUrl } = require("../../config/dashboardBase.config");

class NobuLoginPage {

    constructor(page) {
        this.page = page;
        this.baseUrl = dashboardBaseUrl.nobuDashboardBaseUrlUat;
        this.emailField = this.page.getByRole('textbox', { name: 'Email' });
        this.passwordField = this.page.getByRole('textbox', { name: 'Password' });
        this.loginButton = this.page.getByRole('button', { name: 'Log in' });
    }

    async gotoLogin() {
        await this.page.goto(this.baseUrl + '/login');
        await expect(this.emailField).toBeVisible();
    }

    async fillCredentials(email, password) {
        await this.emailField.fill(email);
        await this.passwordField.fill(password);
    }

    async clickLoginButton() {
        await this.loginButton.click();
        await this.page.waitForURL(url => !url.pathname.includes('/login'));
    }
}
module.exports = { NobuLoginPage };
