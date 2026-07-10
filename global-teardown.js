// global-teardown.js
async function globalTeardown(config) {
  console.log('--- TEST EXECUTION FINISHED ---');
  console.log('Performing project-wide cleanup if necessary...');
  
  // Example: You could close database connections here
  // or clean up temporary files created during the run
}

module.exports = globalTeardown;
