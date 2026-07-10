// config/partners.config.js

// Shared base for all Boost sub-partners

const sandboxBase = {
    partnerId: process.env.SANDBOX_PARTNER_ID,
    clientId: process.env.SANDBOX_CLIENT_ID,
    clientSecret: process.env.SANDBOX_CLIENT_SECRET,
    clientKey: process.env.SANDBOX_CLIENT_ID,
    privateKey: process.env.SANDBOX_PRIVATE_KEY,
    ipAddress: process.env.B2B_IP_ADDRESS,
    channelId: process.env.SANDBOX_CHANNEL_ID || 'APIMGM',
    redirectUrl: 'https://688358d521fa24876a9dbb73.mockapi.io',
    partnerUrl: 'https://mock-mb-ob.meta-uat.nobubank.com'
}

const cfxBase = {
    partnerId: process.env.CFX_PARTNER_ID,
    clientId: process.env.CFX_CLIENT_ID,
    clientSecret: process.env.CFX_CLIENT_SECRET,
    clientKey: process.env.CFX_CLIENT_ID,
    privateKey: process.env.CFX_PRIVATE_KEY,
    channelId: 'TESTCFXQA'
}

const boostBase = {
    partnerId: process.env.BOOST_PARTNER_ID,
    clientId: process.env.BOOST_CLIENT_ID,
    clientSecret: process.env.BOOST_CLIENT_SECRET,
    clientKey: process.env.BOOST_CLIENT_ID,
    privateKey: process.env.BOOST_PRIVATE_KEY,
    channelId: 'BOOSTID',
    ipAddress: process.env.B2B_IP_ADDRESS,
    redirectUrl: 'https://payflex-uat.myboost.co.id',
    partnerUrl: 'https://mock-mb-ob.meta-uat.nobubank.com/'
};

const bukuWarungBase = {
    partnId: process.env.BUKUWARUNG_PARTNER_ID,
    clientId: process.env.BUKUWARUNG_CLIENT_ID,
    clientSecret: process.env.BUKUWARUNG_CLIENT_SECRET,
    clientKey: process.env.BUKUWARUNG_CLIENT_KEY,
    privateKey: process.env.BUKUWARUNG_PRIVATE_KEY,
    ipAddress: process.env.B2B_IP_ADDRESS,
    channelId: process.env.BUKUWARUNG_CHANNEL_ID || 'APIMGM',
    redirectUrl: 'https://688358d521fa24876a9dbb73.mockapi.io',
    partnerUrl: 'https://mock-mb-ob.meta-uat.nobubank.com'
}

const partners = {

    sandbox_audi_lagi: {
        ...sandboxBase,
        deviceId: 'audi-device-666',
        authCode: process.env.SANDBOX_AUDI_LAGI_AUTH_CODE,
        name: 'AUDI DHARMAWAN LAGI',
        phoneNo: '087787111332',
        email: 'audi.dharmawan@digdayatech.id',
        nik: '1234567891827123',
        accountId: '1008442812',
        cif: '230613104740000',
        accountNo: '81100144416',
    },

    sandbox_uat_card_service: {
        ...sandboxBase,
        deviceId: 'device-xiaomi',
        authCode: process.env.SANDBOX_UAT_CARD_SERVICE_AUTH_CODE,
        name: 'UAT CARD SERVICE',
        phoneNo: '085161451122',
        email: 'christopher.jordan@ddt.id',
        nik: '2845468154505468',
        accountId: '111819305170',
        cif: '250516170340000',
        accountNo: '81100201339',
    },


    cfx_atreus_satu: {
        ...cfxBase,
        deviceId: '0811222117',
        authCode: process.env.CFX_ATREUS_SATU_AUTH_CODE,
        name: 'RX KING',
        phoneNo: '0811222117',
        email: 'christopher.jordan@ddt.id',
        nik: '3277222512902317',
        accountId: '111720958937',
        cif: '260511113939000',
        accountNo: '81100227401',
        ipAddress: process.env.B2B_IP_ADDRESS,
        channelId: process.env.CFX_CHANNEL_ID || 'TESTCFXQA',
    },

    cfx_ami_sihotang: {
        ...cfxBase,
        deviceId: '089688100207',
        name: 'AMI SIHOTANG',
        phoneNo: '089688100207',
        email: 'rindangocean@gmail.com',
        nik: '',
        accountId: '111993599878',
        cif: '',
        accountNo: '81100213361',
        ipAddress: process.env.B2B_IP_ADDRESS,
        channelId: process.env.CFX_CHANNEL_ID || 'TESTCFXQA',
    },

    boost_huskar: {
        ...boostBase,
        deviceId: '0811222109',
        authCode: process.env.BOOST_HUSKAR_AUTH_CODE,
        name: 'HUSKAR SIX SEVEN',
        phoneNo: '0811222109',
        email: 'christopher.jordan@ddt.id',
        nik: '3101010102903957',
        accountId: '111687000719',
        cif: '260430134957000',
        accountNo: '81100226960',

    },

    boost_rexus: {
        ...boostBase,
        deviceId: '0811222116',
        authCode: process.env.BOOST_REXUS_AUTH_CODE,
        name: 'REXUS',
        phoneNo: '0811222116',
        email: 'christopher.jordan@ddt.id',
        nik: '3277222512902316',
        accountId: '111524061591',
        cif: '',
        accountNo: '81100227371',
    },

    boost_rxking: {
        ...boostBase,
        deviceId: '0811222117',
        authCode: process.env.BOOST_RXKING_AUTH_CODE,
        name: 'RX KING',
        phoneNo: '0811222117',
        email: 'christopher.jordan@ddt.id',
        nik: '3277222512902317',
        accountId: '111720958937',
        cif: '260511113939000',
        accountNo: '81100227401',
    },

    bukuWarung_hotfixDeviceA: {
        ...bukuWarungBase,
        authCode: process.env.BUKUWARUNG_HOTFIX_DEVICE_A_AUTH_CODE,
        deviceId: 'hotfix-device-a',
        name: 'Hotfix Device A',
        phoneNo: '089987990019',
        email: 'christopher.jordan@ddt.id',
        nik: '8947089987990019',
        accountId: '111560656476',
        cif: '260521173016000',
        accountNo: '81100228199',
    },

    bukuWarung_hotfixDeviceX: {
        ...bukuWarungBase,
        authCode: process.env.BUKUWARUNG_HOTFIX_DEVICE_X_AUTH_CODE,
        deviceId: 'hotfix-device-x',
        name: 'Hotfix Device X',
        phoneNo: '089987990020',
        email: 'christopher.jordan@ddt.id',
        nik: '8947089987990020',
        accountId: '111838576957',
        cif: '260521200443000',
        accountNo: '81100228202',
    },

    bukuWarung_rayanda: {
        ...bukuWarungBase,
        authCode: process.env.BUKUWARUNG_RAYANDA_AUTH_CODE,
        deviceId: '0819788727639',
        name: 'RAYANDA',
        phoneNo: '0819788727639',
        email: 'intan.agustin@digdayatech.id',
        nik: '3275890968202119',
        accountId: '111116264463',
        cif: '260415230010000',
        accountNo: '81100224363',
    },

    bukuWarung_intan: {
        ...bukuWarungBase,
        authCode: process.env.BUKUWARUNG_INTAN_AUTH_CODE,
        deviceId: '0819788727637',
        name: 'INTAN AGUSTIN',
        phoneNo: '0819788727637',
        email: 'intan.agustin@digdayatech.id',
        nik: '3275890968202117',
        accountId: '111831833054',
        cif: '260415183713000',
        accountNo: '81100221267',
    }
};

// Select the partner based on PARTNER_ENV environment variable
// Valid keys: sandbox_audi_lagi, sandbox_uat_card_service, cfx_atreus_satu,
//             cfx_ami_sihotang, boost_huskar, boost_rexus, boost_rxking
const activePartnerEnv = process.env.PARTNER_ENV || 'sandbox_uat_card_service';
const activePartner = partners[activePartnerEnv];

if (!activePartner) {
    const validKeys = Object.keys(partners).join(', ');
    throw new Error(`Partner environment "${activePartnerEnv}" is not defined in partners.config.js. Valid options: ${validKeys}`);
}

module.exports = {
    activePartnerEnv,
    activePartner,
    partners,
};