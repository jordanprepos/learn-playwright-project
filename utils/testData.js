module.exports = {
    validUser: {
        email: 'superadmin',
        password: 'test'
    }, urls: {
        login: 'https://bima.meta-uat.nobubank.com/#/auth/login',
        webviewUrl: ''
    }, partnerInfo: {
        partnerName: 'TEST CFX QA',
        partnerId: '86fdc92f55044068922c1763d06a2ddc',
        partnerDescription: 'Partner Test Description',
        partnerStatus: 'Active',
    }, services: {
        cobrandSaving: {
            serviceName: 'cobrand-saving',
            serviceId: 'SERVICE-TEST',
            serviceDescription: 'Service Test Description',
            serviceStatus: 'Active',
        },
        cobrandEmoney: {
            serviceName: 'cobrand-emoney',
            serviceId: 'SERVICE-TEST',
            serviceDescription: 'Service Test Description',
            serviceStatus: 'Active',
        },
        bifast: {
            serviceNameBifast: 'bifast',
        },
        apiServices: {
            interbankTransfer: 'interbank-transfer',
            intrabankTransfer: 'intrabank-transfer',
            directDebit: 'direct-debit',
            directDebitPin: 'direct-debit-pin',
            bifastPayment: 'payment',
            bifastInquiry: 'inquiry',
            bifastRefund: 'refund',
            rtgs: 'rtgs',
            topup: 'topup',
            deposit: 'deposit',
        }
    }, tokped: {
        tokpedUrl: 'https://www.tokopedia.com',
        searchTokpedValue: 'iPhone 17',
    }
};
