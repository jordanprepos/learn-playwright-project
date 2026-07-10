const SLACK_HISTORY_URL = "https://slack.com/api/conversations.history";

/**
 * Collect all readable text from a Slack message, since bots often put
 * the content in attachments or blocks instead of the plain `text` field.
 */
function extractMessageText(message) {
    const parts = [message.text || ""];

    for (const attachment of message.attachments || []) {
        parts.push(attachment.text || "", attachment.fallback || "");
    }

    for (const block of message.blocks || []) {
        if (block.text?.text) parts.push(block.text.text);
    }

    return parts.join(" ");
}

/**
 * Poll the Slack channel (e.g. #bento-bot) until a message containing an OTP appears.
 *
 * @param {Object} options
 * @param {number} options.oldest - Epoch time in seconds; only messages sent AFTER this
 *   are considered. Capture it right before triggering the OTP so a stale OTP
 *   from a previous run is never picked up.
 * @param {number} [options.timeoutMs=60000] - How long to keep polling before failing.
 * @param {number} [options.pollIntervalMs=3000] - Delay between polls.
 * @param {RegExp} [options.otpRegex=/\b(\d{6})\b/] - Pattern that captures the OTP digits.
 * @returns {Promise<string>} the OTP
 */
async function getOtpFromSlack({
    oldest,
    timeoutMs = 60000,
    pollIntervalMs = 3000,
    otpRegex = /\b(\d{6})\b/,
} = {}) {
    const token = process.env.SLACK_BOT_TOKEN;
    const channel = process.env.SLACK_OTP_CHANNEL_ID;

    if (!token || !channel) {
        throw new Error("SLACK_BOT_TOKEN and SLACK_OTP_CHANNEL_ID must be set in .env");
    }

    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        const params = new URLSearchParams({ channel, limit: "10" });
        if (oldest) params.set("oldest", String(oldest));

        const response = await fetch(`${SLACK_HISTORY_URL}?${params}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const body = await response.json();

        if (!body.ok) {
            throw new Error(`Slack API error: ${body.error}`);
        }

        // Messages come newest first, so the first match is the latest OTP
        for (const message of body.messages || []) {
            const match = extractMessageText(message).match(otpRegex);
            if (match) {
                return match[1] || match[0];
            }
        }

        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Timed out after ${timeoutMs}ms waiting for OTP in Slack channel ${channel}`);
}

module.exports = { getOtpFromSlack };
