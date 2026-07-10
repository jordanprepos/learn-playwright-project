
/**
 * Converts a raw API amount string into the on-screen Rupiah format.
 * "505500.00"   → "Rp 505,500.00"
 * "1023456.00"  → "Rp 1,023,456.00"
 */

function formatRupiah(amount) {
    // "505500.00" → 505500 (a real number)
    const number = parseFloat(amount);
    const formattedAmount = number.toLocaleString('en-US', {
        // always show 2 decimals: 505500 → "505,500.00"
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    return `Rp ${formattedAmount}`; // add prefix → "Rp 505,500.00"
}

module.exports = { formatRupiah };