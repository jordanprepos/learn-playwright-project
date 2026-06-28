// config/partners.config.js

// Shared base for all Boost sub-partners
const boostBase = {
  partnerId: process.env.BOOST_PARTNER_ID,
  clientId: process.env.BOOST_CLIENT_ID,
  clientSecret: process.env.BOOST_CLIENT_SECRET,
  clientKey: process.env.BOOST_CLIENT_ID,
  privateKey: process.env.BOOST_PRIVATE_KEY,
  channelId: 'BOOSTID',
  ipAddress: process.env.B2B_IP_ADDRESS,
  email: 'christopher.jordan@ddt.id',
};

const partners = {
  sandbox: {
    partnerId: process.env.SANDBOX_PARTNER_ID,
    clientId: process.env.SANDBOX_CLIENT_ID,
    clientSecret: process.env.SANDBOX_CLIENT_SECRET,
    clientKey: process.env.SANDBOX_CLIENT_ID,
    privateKey: process.env.SANDBOX_PRIVATE_KEY,
    deviceId: 'device-xiaomi',
    authCode: process.env.SANDBOX_AUTH_CODE,
    name: 'UAT CARD SERVICE',
    phoneNo: '085161451122',
    email: 'christopher.jordan@ddt.id',
    nik: '2845468154505468',
    accountId: '111819305170',
    cif: '250516170340000',
    accountNo: '81100201339',
    ipAddress: process.env.B2B_IP_ADDRESS,
    channelId: process.env.SANDBOX_CHANNEL_ID || 'APIMGM',
  },

  cfx: {
    partnerId: process.env.CFX_PARTNER_ID,
    clientId: process.env.CFX_CLIENT_ID,
    clientSecret: process.env.CFX_CLIENT_SECRET,
    clientKey: process.env.CFX_CLIENT_ID,
    privateKey: process.env.CFX_PRIVATE_KEY,
    deviceId: '0811222117',
    authCode: process.env.CFX_AUTH_CODE,
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

  boost_huskar: {
    ...boostBase,
    deviceId: '0811222109',
    authCode: process.env.BOOST_HUSKAR_AUTH_CODE,
    name: 'HUSKAR SIX SEVEN',
    phoneNo: '0811222109',
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
    nik: '3277222512902317',
    accountId: '111720958937',
    cif: '260511113939000',
    accountNo: '81100227401',
  },
};

// Select the partner based on PARTNER_ENV environment variable, default to 'sandbox'
const activePartnerEnv = process.env.PARTNER_ENV || 'sandbox';
const activePartner = partners[activePartnerEnv];

if (!activePartner) {
  throw new Error(`Partner environment "${activePartnerEnv}" is not defined in partners.config.js`);
}

module.exports = {
  activePartnerEnv,
  activePartner,
  partners,
};