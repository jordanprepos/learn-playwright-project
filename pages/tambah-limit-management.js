
class TambahLimitManagementPage {

    constructor(page) {
        this.page = page;
        this.apiMonetizingMenu = page.getByText('API Monetizing Configuration');
        this.limitManagementSubMenu = page.getByText('Limit Management');
        this.tambahButton = page.getByRole('button', { name: 'Tambah', exact: true });
        this.tambahLimitKonfigurasiButton = page.getByRole('button', { name: 'Tambah Limit Konfigurasi' });

        // Form Inputs
        this.partnerSearchInput = page.getByRole('combobox', { name: 'Search for option' }).getByRole('searchbox');

        // Use filters to find the specific container for each field to avoid "form-wide" matches
        this.serviceNameInput = page.locator('div').filter({ hasText: /^Service Name/ }).getByRole('textbox');
        this.serviceApiInput = page.locator('div').filter({ hasText: /^Service API/ }).getByRole('textbox');
        this.descriptionTextarea = page.locator('div').filter({ hasText: /^Deskripsi/ }).getByRole('textbox');

        // Limit Dialog Inputs
        this.limitTypeSelect = page.getByRole('combobox', { name: 'menu' });
        this.minInput = page.locator('div').filter({ hasText: /^Min$/ }).getByRole('textbox');
        this.maxInput = page.locator('div').filter({ hasText: /^Max$/ }).getByRole('textbox');
        this.dialogTambahButton = page.locator('dialog').getByRole('button', { name: 'Tambah', exact: true });

        this.submitButton = page.getByRole('button', { name: 'Submit' });
    }

    async navigateToLimitManagement() {
        await this.apiMonetizingMenu.click();
        await this.limitManagementSubMenu.click();
    }

    async clickTambahNewLimitManagement() {
        // Falls back to the main "Tambah" button on list page
        // await this.page.getByRole('button', { name: 'Tambah' }).click();
        await this.page.getByRole('button', { name: ' Tambah' }).click();
    }

    async fillForm(partnerName, serviceName, serviceApi, description) {
        // Select Partner
        await this.partnerSearchInput.click();
        await this.partnerSearchInput.pressSequentially(partnerName, { delay: 50 });
        // Wait for options and select
        await this.page.getByRole('option', { name: partnerName }).first().click();

        // Fill other fields with sequentially typing to trigger Vue reactivity
        await this.serviceNameInput.click();
        await this.serviceNameInput.pressSequentially(serviceName, { delay: 30 });

        await this.serviceApiInput.click();
        await this.serviceApiInput.pressSequentially(serviceApi, { delay: 30 });

        await this.descriptionTextarea.click();
        await this.descriptionTextarea.pressSequentially(description, { delay: 30 });
    }

    async addLimitConfiguration(type, min, max) {
        await this.tambahLimitKonfigurasiButton.click();
        await this.limitTypeSelect.click();
        await this.page.getByRole('option', { name: type }).click();
        await this.minInput.fill(min.toString());
        await this.maxInput.fill(max.toString());
        await this.dialogTambahButton.click();
    }
}

module.exports = { TambahLimitManagementPage };
