// utils/headerHelper.js
const { error } = require('console');
const crypto = require('crypto');

/**
 * Equivalent to:
 * def sha256 = DigestUtils.sha256Hex(databody)
 * def hmacdata = method + ":" + path + ":" + apikey + ":" + sha256 + ":" + time
 * def hmacSHA = HmacUtils.hmacSha512Hex(secretKey, hmacdata)
 */
function generateSignature({ method, path, accessToken, body, timestamp, clientSecret }) {
    // 1. Stringify body — same as JsonOutput.toJson(builder.content)
    const databody = JSON.stringify(body);

    // 2. SHA-256 the body — same as DigestUtils.sha256Hex(databody)
    const sha256 = crypto.createHash('sha256').update(databody).digest('hex');

    // 3. Build the HMAC input string — same as method + ":" + path + ":" + apikey + ":" + sha256 + ":" + time
    const hmacdata = `${method}:${path}:${accessToken}:${sha256}:${timestamp}`;

    // 4. HMAC-SHA512 — same as HmacUtils.hmacSha512Hex(secretKey, hmacdata)
    const signature = crypto.createHmac('sha512', clientSecret).update(hmacdata).digest('hex');

    return signature;
}

function generateTimestamp() {
    return new Date().toISOString().replace('Z', '+07:00');
}

/**
 * Jakarta local time in SNAP format for request bodies,
 * e.g. 2026-07-11T00:27:05+07:00 (no milliseconds).
 */
function generateJakartaTimestamp() {
    const jakartaOffsetMs = 7 * 60 * 60 * 1000; // UTC+7
    return new Date(Date.now() + jakartaOffsetMs).toISOString().slice(0, 19) + '+07:00';
}

function generateExternalId() {
    return Math.floor(Math.random() * 1e12).toString();
}

function generateHeaders({ method, path, body, activePartner, tokens }) {
    if (!tokens.accessToken) {
        throw new Error(`generateHeaders: tokens.accessToken is undefined. Check tokenManager cache return shape.`);
    }
    if (!tokens.customerToken) {
        throw new Error(`generateHeaders: tokens.customerToken is undefined. Check tokenManager cache return shape.`);
    }

    const timestamp = generateTimestamp();
    const signature = generateSignature({
        method,
        path,
        body,
        timestamp,
        clientSecret: activePartner.clientSecret,
        accessToken: tokens.accessToken,
        customerToken: tokens.customerToken,
    });

    return {
        "Content-Type": "application/json",
        "X-TIMESTAMP": timestamp,
        "X-EXTERNAL-ID": generateExternalId(),
        "X-PARTNER-ID": activePartner.partnerId,
        "X-IP-ADDRESS": activePartner.ipAddress,
        "CHANNEL-ID": activePartner.channelId,
        "X-SIGNATURE": signature,
        "X-DEVICE-ID": activePartner.deviceId,
        "Authorization": `Bearer ${tokens.accessToken}`,
        "Authorization-Customer": `Bearer ${tokens.customerToken}`,
    };
}

module.exports = { generateTimestamp, generateJakartaTimestamp, generateExternalId, generateSignature, generateHeaders };