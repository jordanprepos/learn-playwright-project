// global-teardown.js
const { closePool } = require('./utils/mysqlHelper');

async function globalTeardown(config) {
  console.log('--- TEST EXECUTION FINISHED ---');
  console.log('Performing project-wide cleanup if necessary...');

  await closePool();
}

module.exports = globalTeardown;
