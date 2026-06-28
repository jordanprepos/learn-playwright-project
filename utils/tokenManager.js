const crypto = require('crypto');
const { activePartner } = require('../config/partners.config');
const { apiPath } = require('../config/apiPath.config');
const { attachRequestResponse } = require('./reportHelper');

function getJakartaTimestamp() {
  const tzoffset = 7 * 60 * 60 * 1000; // Jakarta is UTC+7
  const localISOTime = new Date(Date.now() + tzoffset).toISOString().slice(0, 19);
  return localISOTime + '+07:00';
}

function generateSignature(clientKey, timestamp, privateKeyPem) {
  if (!privateKeyPem) {
    return null;
  }
  try {
    const input = `${clientKey}|${timestamp}`;
    
    // Clean base64 string, mimicking the Groovy preprocessor logic exactly
    const cleanedKey = privateKeyPem
      .replace(/-----BEGIN RSA PRIVATE KEY-----/g, '')
      .replace(/-----END RSA PRIVATE KEY-----/g, '')
      .replace(/-----BEGIN PRIVATE KEY-----/g, '')
      .replace(/-----END PRIVATE KEY-----/g, '')
      .replace(/\s+/g, ''); // Removes spaces, newlines, tabs, carriage returns

    const keyBuffer = Buffer.from(cleanedKey, 'base64');
    
    // Load as DER PKCS#8 (Java PKCS8EncodedKeySpec equivalent)
    let privateKeyObj;
    try {
      privateKeyObj = crypto.createPrivateKey({
        key: keyBuffer,
        format: 'der',
        type: 'pkcs8'
      });
    } catch (err8) {
      // Fallback to PKCS#1 DER format if PKCS#8 fails
      privateKeyObj = crypto.createPrivateKey({
        key: keyBuffer,
        format: 'der',
        type: 'pkcs1'
      });
    }

    const sign = crypto.createSign('SHA256');
    sign.update(input);
    return sign.sign(privateKeyObj, 'base64');
  } catch (error) {
    console.error('Error generating RSA-SHA256 signature:', error.message);
    return null;
  }
}

class TokenManager {
  constructor() {
    this.b2bToken = null;
    this.b2b2cToken = null;
    this.tokenExpiry = null; // Timestamp (ms) when token expires
  }

  /**
   * Get valid B2B and B2B2C tokens.
   * If cached tokens exist and are not expired, they are returned.
   * Otherwise, fetches new tokens.
   * @param {import('@playwright/test').APIRequestContext} request 
   * @param {Object} [config] 
   */
  async getTokens(request, config = {}) {
    const now = Date.now();
    
    // Check if token is cached and still valid (with a 30-second buffer)
    if (this.b2bToken && this.b2b2cToken && this.tokenExpiry && now < this.tokenExpiry - 30000) {
      return {
        b2bToken: this.b2bToken,
        b2b2cToken: this.b2b2cToken
      };
    }

    // Configure default credentials / endpoints for Nobu Bank B2B Sandbox
    const b2bUrl = config.b2bUrl || apiPath.b2bUrl;
    const b2b2cUrl = config.b2b2cUrl || apiPath.b2b2cUrl;
    
    const clientKey = config.clientKey || activePartner.clientKey;
    const partnerId = config.partnerId || activePartner.partnerId;
    const ipAddress = config.ipAddress || activePartner.ipAddress;
    const channelId = config.channelId || activePartner.channelId;
    const privateKey = config.privateKey || activePartner.privateKey;

    // Generate dynamic values
    const timestamp = getJakartaTimestamp();
    const externalId = config.externalId || Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
    
    // Generate signature using private key
    const signature = generateSignature(clientKey, timestamp, privateKey);
    if (!signature) {
      throw new Error(`Failed to generate X-SIGNATURE. Ensure a valid privateKey is provided in config/partners.config.js or via process.env.B2B_PRIVATE_KEY.`);
    }

    const b2bTimestamp = config.timestamp || timestamp;
    const b2bExternalId = config.externalId || externalId;

    const b2bHeaders = {
      'Content-Type': 'application/json',
      'X-TIMESTAMP': b2bTimestamp,
      'X-CLIENT-KEY': clientKey,
      'X-PARTNER-ID': partnerId,
      'X-EXTERNAL-ID': b2bExternalId,
      'X-IP-ADDRESS': ipAddress,
      'X-SIGNATURE': signature,
      'CHANNEL-ID': channelId,
    };

    const b2bData = config.b2bData || {
      grantType: 'client_credentials',
      additionalInfo: {
        partnerId: partnerId
      }
    };

    try {
      // Step 1: Hit B2B Token API
      const b2bResponse = await request.post(b2bUrl, {
        headers: b2bHeaders,
        data: b2bData
      });

      if (!b2bResponse.ok()) {
        const errorText = await b2bResponse.text();
        throw new Error(`Failed to fetch B2B Token: ${b2bResponse.status()} - ${errorText}`);
      }

      const b2bResult = await b2bResponse.json();
      // Handle standard SNAP accessToken structure vs common camelCase/snake_case
      const fetchedB2bToken = b2bResult.accessToken || b2bResult.access_token || b2bResult.token;

      if (!fetchedB2bToken) {
        throw new Error(`B2B response succeeded but no token was found in the body: ${JSON.stringify(b2bResult)}`);
      }

      // Step 2: Hit B2B2C Token API (using the obtained B2B Token)
      const b2b2cTimestamp = getJakartaTimestamp();
      const b2b2cSignature = generateSignature(clientKey, b2b2cTimestamp, privateKey);

      if (!b2b2cSignature) {
        throw new Error(`Failed to generate B2B2C X-SIGNATURE.`);
      }

      const b2b2cHeaders = {
        'Content-Type': 'application/json',
        'X-TIMESTAMP': b2b2cTimestamp,
        'X-EXTERNAL-ID': Math.floor(100000000000 + Math.random() * 900000000000).toString(),
        'X-PARTNER-ID': partnerId,
        'X-IP-ADDRESS': ipAddress,
        'CHANNEL-ID': channelId,
        'X-DEVICE-ID': activePartner.deviceId || 'device-xiaomi',        
        'X-SIGNATURE': b2b2cSignature,
        'X-CLIENT-KEY': clientKey,
        'Authorization': `Bearer ${fetchedB2bToken}`,
      };

      const b2b2cPayload = config.b2b2cData || {
        grantType: 'client_credentials',
        authCode: activePartner.authCode || 'default-auth-code',
        refreshToken: ''
      };

      const b2b2cResponse = await request.post(b2b2cUrl, {
        headers: b2b2cHeaders,
        data: b2b2cPayload
      });

      if (!b2b2cResponse.ok()) {
        const errorText = await b2b2cResponse.text();
        throw new Error(`Failed to fetch B2B2C Token: ${b2b2cResponse.status()} - ${errorText}`);
      }

      const b2b2cResult = await b2b2cResponse.json();
      const fetchedB2b2cToken = b2b2cResult.accessToken || b2b2cResult.access_token || b2b2cResult.token;

      if (!fetchedB2b2cToken) {
        throw new Error(`B2B2C response succeeded but no token was found in the body: ${JSON.stringify(b2b2cResult)}`);
      }

      // Update Cache
      this.b2bToken = fetchedB2bToken;
      this.b2b2cToken = fetchedB2b2cToken;
      
      // Cache expiration (accessTokenExpiryTime from response or default to 300 seconds)
      const expiresInSec = parseInt(b2b2cResult.accessTokenExpiryTime || b2b2cResult.expires_in || 300, 10);
      this.tokenExpiry = now + (expiresInSec * 1000);

      // At the end of getTokens(), change the return to include raw responses
      return {
        accessToken: this.b2bToken,
        customerToken: this.b2b2cToken,
        // Add these for logging
        debug: {
          b2b: {
            requestUrl: b2bUrl,
            requestHeaders: b2bHeaders,
            requestBody: b2bData,
            responseBody: b2bResult,
            status: b2bResponse.status(),
          },
          b2b2c: {
            requestUrl: b2b2cUrl,
            requestHeaders: b2b2cHeaders,
            requestBody: b2b2cPayload,
            responseBody: b2b2cResult,
            status: b2b2cResponse.status(),
          },
        }
      };

    } catch (error) {
      // Clear cache on failure so next request will retry
      this.b2bToken = null;
      this.b2b2cToken = null;
      this.tokenExpiry = null;
      throw error;
    }
  }
  
}

module.exports = new TokenManager();
