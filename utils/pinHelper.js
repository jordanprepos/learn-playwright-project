async function enterPin(page, pin) {
    for (const digit of pin.split("")) {
        await page.getByRole("button", { name: digit, exact: true }).click();

        // Give the application 300 milliseconds to process the click before moving on to the next digit
        await page.waitForTimeout(200);
    }
}

/**
 * Fill the OTP verification screen, which uses one textbox per digit
 * ("Digit 1" ... "Digit 6") that auto-advances focus as you type.
 */
async function enterOtp(page, otp) {
    await page.getByRole("textbox", { name: "Digit 1" }).click();
    await page.keyboard.type(otp, { delay: 150 });
}

module.exports = { enterPin, enterOtp };