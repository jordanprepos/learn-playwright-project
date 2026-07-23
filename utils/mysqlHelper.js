// utils/mysqlHelper.js
const mysql = require('mysql2/promise');

let pool;

function getPool() {
    if (!pool) {
        pool = mysql.createPool({
            host: process.env.MYSQL_HOST,
            port: Number(process.env.MYSQL_PORT) || 3306,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
            ssl: process.env.MYSQL_SSL === 'true' ? {} : undefined,
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0,
        });
    }
    return pool;
}

// Always pass dynamic values via `params` (?, ?, ...) — never string-concatenate
// them into `sql` — mysql2's execute() parameterizes them safely.
async function query(sql, params = []) {
    const [rows] = await getPool().execute(sql, params);
    return rows;
}

// Convenience for the common "verify exactly one row exists" case.
async function queryOne(sql, params = []) {
    const rows = await query(sql, params);
    return rows[0] ?? null;
}

// Called once from global-teardown.js at the end of the run.
async function closePool() {
    if (pool) {
        await pool.end();
        pool = undefined;
    }
}

module.exports = { query, queryOne, closePool };
