const fs = require("fs");
const ExcelJS = require("exceljs");

/**
 * Reads every value under a named column in a given worksheet.
 *
 * Locates the column by its header text (row 1) rather than a fixed letter,
 * so it keeps working if columns are reordered in the file.
 *
 * @param {string} filePath   Path to the .xlsx file, e.g. "data/kss.xlsx"
 * @param {string} sheetName  Worksheet name, e.g. "data_kss"
 * @param {string} columnName Header text to match, e.g. "NIK"
 * @returns {Promise<string[]>} Values of that column, top-to-bottom, empty rows skipped
 */
async function getColumnValues(filePath, sheetName, columnName) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(filePath);

    const ws = wb.getWorksheet(sheetName);
    if (!ws) {
        throw new Error(`Worksheet "${sheetName}" not found in ${filePath}`);
    }

    // Find the column index whose header (row 1) matches columnName.
    const headerRow = ws.getRow(1);
    let targetCol = null;
    headerRow.eachCell((cell, colNumber) => {
        if (String(cell.value).trim() === columnName) {
            targetCol = colNumber;
        }
    });

    if (targetCol === null) {
        throw new Error(`Column "${columnName}" not found in sheet "${sheetName}"`);
    }

    // Collect the cell value from that column for every data row (skip header).
    const values = [];
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return; // header
        const cell = row.getCell(targetCol);
        if (cell.value !== null && cell.value !== undefined && cell.value !== "") {
            values.push(String(cell.value).trim());
        }
    });

    return values;
}

/**
 * Appends a single row of values to a worksheet in a .xlsx file.
 *
 * Creates the workbook file and/or worksheet if they don't exist yet.
 * When creating a new worksheet, `headers` (if provided) is written as row 1.
 *
 * @param {string} filePath    Path to the .xlsx file, e.g. "data/results.xlsx"
 * @param {string} sheetName   Worksheet name, e.g. "results"
 * @param {Array<string|number>} rowValues Values to append as a new row
 * @param {string[]} [headers] Header row to write when the worksheet is newly created
 * @returns {Promise<void>}
 */
async function appendRow(filePath, sheetName, rowValues, headers) {
    const wb = new ExcelJS.Workbook();
    if (fs.existsSync(filePath)) {
        await wb.xlsx.readFile(filePath);
    }

    let ws = wb.getWorksheet(sheetName);
    if (!ws) {
        ws = wb.addWorksheet(sheetName);
        if (headers) {
            ws.addRow(headers);
        }
    }

    ws.addRow(rowValues);
    await wb.xlsx.writeFile(filePath);
}

module.exports = { getColumnValues, appendRow };
