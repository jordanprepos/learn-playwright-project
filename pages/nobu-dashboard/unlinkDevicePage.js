// /pages/nobu-dashboard/unlinkDevicePage.js
const { expect } = require("@playwright/test");

class UnlinkDevicePage {

    constructor(page) {
        this.page = page;
        this.phoneNumberInput = this.page.locator('#phone_number');
        this.submitButton = this.page.getByRole('button', { name: 'Submit', exact: true });
        this.errorModalTitle = this.page.getByText('Terjadi Kesalahan');
        this.notFoundModalTitle = this.page.getByText('Data User tidak Ditemukan');
        this.errorModalOkButton = this.page.getByRole('button', { name: 'OK' });
        this.avatarDropdownTrigger = this.page.locator('.ant-dropdown-trigger');
        this.logoutLink = this.page.getByText('Log out');
    }

    /**
     * A successful search replaces the form with results on the SAME /unlink-device
     * URL (no route change), and clicking the sidebar link again is a no-op once
     * already on that route (Vue Router doesn't remount on a same-route navigation).
     * A real page.goto() forces a fresh load every time, guaranteeing the form is back.
     */
    async navigateToUnlinkDevice() {
        const unlinkDeviceUrl = new URL('/unlink-device', this.page.url()).href;
        await this.page.goto(unlinkDeviceUrl);
        await expect(this.phoneNumberInput).toBeVisible();
    }

    async searchPhoneNumber(number) {
        await expect(this.phoneNumberInput).toBeVisible();
        await this.phoneNumberInput.fill(number);
        await this.submitButton.click();
    }

    /**
     * Races the "Terjadi Kesalahan" popup and the "Data User tidak Ditemukan"
     * popup against the phone number form being replaced by results (confirmed
     * live: a successful search removes #phone_number from the DOM instead of
     * navigating anywhere). Resolves to 'error' | 'not_found' | 'success' |
     * 'timeout' — never throws, so one bad phone number can't abort the batch.
     */
    async waitForOutcome() {
        const errorWait = this.errorModalTitle.waitFor({ state: 'visible', timeout: 15000 })
            .then(() => 'error');
        const notFoundWait = this.notFoundModalTitle.waitFor({ state: 'visible', timeout: 15000 })
            .then(() => 'not_found');
        const successWait = this.phoneNumberInput.waitFor({ state: 'hidden', timeout: 15000 })
            .then(() => 'success');

        try {
            return await Promise.race([errorWait, notFoundWait, successWait]);
        } catch {
            return 'timeout';
        }
    }

    async dismissPopup() {
        try {
            await this.errorModalOkButton.waitFor({ state: 'visible', timeout: 2000 });
            await this.errorModalOkButton.click();
        } catch {
            await this.page.keyboard.press('Escape');
        }
    }

    async logout() {
        await this.avatarDropdownTrigger.click();
        await this.logoutLink.click();
        await this.page.waitForURL('**/login');
    }

    /**
     * Confirmed live: the result page's name is the first level-4 heading
     * (e.g. "ROSITA"), and Status/User Type/Email/etc render as
     * "<li><h4><strong>Label</strong></h4>: value</li>" rows inside a <ul>.
     * Scoping to <li> excludes section titles (User Information, Account
     * Type, List Transaction) that are also h4/strong but aren't label:value.
     */
    async extractCustomerSummary() {
        const name = (await this.page.getByRole('heading', { level: 4 }).first().innerText()).trim();
        const fields = await this.page.evaluate(() => {
            const result = {};
            document.querySelectorAll('li').forEach((li) => {
                const strong = li.querySelector('h4 strong');
                if (!strong) return;
                const label = strong.textContent.trim();
                const rest = li.textContent.slice(label.length).trim().replace(/^:\s*/, '');
                if (label && rest) result[label] = rest;
            });
            return result;
        });
        return { name, userType: fields['User Type'] || '', userStatus: fields['Status'] || '' };
    }

    /**
     * Scopes to whichever <table> has Type/Account Number/Status headers
     * (the "Account Type" table, confirmed live) — not the separate
     * "List Transaction" table, which has different columns — then returns
     * every row whose Type is "Nobu Kasbon Suka-Suka".
     */
    async extractKasbonAccounts() {
        return this.page.evaluate(() => {
            const KASBON_TYPE = 'Nobu Kasbon Suka-Suka';
            const accounts = [];
            document.querySelectorAll('table').forEach((table) => {
                const headers = [...table.querySelectorAll('thead th, tr:first-child th')].map((th) => th.textContent.trim());
                const typeIdx = headers.indexOf('Type');
                const numberIdx = headers.indexOf('Account Number');
                const statusIdx = headers.indexOf('Status');
                if (typeIdx === -1 || numberIdx === -1 || statusIdx === -1) return;
                table.querySelectorAll('tbody tr').forEach((row) => {
                    const cells = [...row.querySelectorAll('td')].map((td) => td.textContent.trim());
                    if (cells[typeIdx] === KASBON_TYPE) {
                        accounts.push({ accountNumber: cells[numberIdx] || '', status: cells[statusIdx] || '' });
                    }
                });
            });
            return accounts;
        });
    }
}
module.exports = { UnlinkDevicePage };
