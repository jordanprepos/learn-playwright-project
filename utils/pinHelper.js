async function enterPin(page, pin) {
    for (const digit of pin.split("")) {
        await page.getByRole("button", { name: digit, exact: true }).click();

        // Give the application 300 milliseconds to process the click before moving on to the next digit
        await page.waitForTimeout(200);
    }
}

module.exports = { enterPin };