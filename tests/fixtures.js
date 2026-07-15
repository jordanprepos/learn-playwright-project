const base = require("@playwright/test");
const { EkycPortalLoginPage } = require("../pages/ekyc-portal/ekycPortalLoginPage");
const { EkycPortalSubmissionList } = require("../pages/ekyc-portal/submissionList");


exports.test = base.test.extend({
    loginPage: async ({ page }, use) => {
        await use(new EkycPortalLoginPage(page));
    },
    submissionPage: async ({ page }, use) => {
        await use(new EkycPortalSubmissionList(page));
    }
});

exports.expect = base.expect;