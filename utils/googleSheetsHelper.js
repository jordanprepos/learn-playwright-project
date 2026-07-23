// utils/googleSheetsHelper.js
const { google } = require('googleapis');

function getSheetsClient() {
    const auth = new google.auth.JWT({
        email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        key: (process.env.GOOGLE_SHEETS_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return google.sheets({ version: 'v4', auth });
}

/**
 * Appends rows to the end of a sheet's existing data.
 * `rows` is an array of arrays (one array per row, cell values in column order).
 * Assumes the target spreadsheet/sheet already exists and has a header row.
 */
async function appendRows(rows, sheetName) {
    if (!rows.length) return;
    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
        range: `${sheetName}!A1`,
        // RAW (not USER_ENTERED) so numeric-looking strings like phone numbers
        // are stored as literal text instead of being parsed into numbers,
        // which silently strips leading zeros (085... -> 85...).
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: rows },
    });
}

module.exports = { appendRows };
