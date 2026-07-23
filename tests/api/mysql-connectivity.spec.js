const { test, expect } = require('@playwright/test');
const { query } = require('../../utils/mysqlHelper');

test('MySQL connection is reachable', async () => {
    const rows = await query('SELECT 1 AS ok');
    expect(rows[0].ok).toBe(1);
});
