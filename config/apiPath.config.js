const apiPath = {
    b2bUrl: 'https://sandbox-api.nobubank.com/v2.0/access-token/b2b/',
    b2b2cUrl: 'https://sandbox-api.nobubank.com/v2.0/access-token/b2b2c/',
    batamBaseUrl: 'https://sandbox-api.nobubank.com',

    cobrandSavings: {
        pathBalanceInquiryV1: '/cobrand-saving/v1.0/balance-inquiry/',
        pathBalanceInquiryV1_1: '/cobrand-saving/v1.1/balance-inquiry/',
        pathChangePin: '/cobrand-saving/v1.0/change-pin/',
        pathResetPin: '/cobrand-saving/v1.0/reset-mpin/',
    },
    cobrandEmoney: {
        balanceEnquiry: '/v1.0/balance-inquiry/cobrand/',
    }
};

module.exports = { apiPath };