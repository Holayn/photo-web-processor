const { run } = require('../src/main');

// Read all options from the command-line / config file
const args = process.argv.slice(2)
run(args)
  .then(() => {
    exit(0);
  })
  .catch(() => {
    exit(1);
  });

// Force a successful or failed exit
// This is required
// - because capturing unhandled errors will make Listr run forever
function exit (code) {
  setTimeout(() => process.exit(code), 10)
}
