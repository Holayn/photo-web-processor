const fs = require('fs-extra')
const moment = require('moment')
const dependencies = require('./cli/dependencies')
const messages = require('./cli/messages')
const options = require('./cli/options')

function run(args) {
  const opts = options.get(args)

  // Only require the index after logging options have been set
  fs.mkdirpSync(opts.output)
  require('../bin/log').init(opts.log, opts.logFile)
  const index = require('./index')

  // Catch all exceptions and exit gracefully
  process.on('uncaughtException', handleError)
  process.on('unhandledRejection', handleError)

  // Check that all binary dependencies are present
  dependencies.checkOptional()

  return new Promise((resolve, reject) => {
    const missingErrors = dependencies.checkRequired()
    if (missingErrors) {
      console.log(`${missingErrors}`)
      reject();
      return;
    }

    // Global settings
    moment.locale(opts.locale)

    // Build the gallery!
    try {
      index.build(opts, (err, result) => {
        console.log('')
        if (err) {
          handleError(err)
          reject();
        } else {
          // Print any problems
          result.problems.print()
          // And then a summary of the gallery
          const stats = {
            photos: 'TODO',
            videos: 'TODO',
            fixedFiles: result.fixedFiles,
          }
          console.log(messages.SUCCESS(stats) + '\n')
          resolve();
        }
      });
    } catch (e) {
      handleError(err)
      reject();
    }
  });

  // Print an error report and exit
  // Note: remove "err.context" (entire data model) which can make the output hard to read
  function handleError (err) {
    // delete err.context
    require('debug')('thumbsup:error')(err)
    console.error('\nUnexpected error', err.message)
    console.error(`\n${messages.SORRY(opts.logFile)}\n`)
  }
}

module.exports = {
  run,
}
