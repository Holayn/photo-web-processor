const chalk = require('chalk')
const boxen = require('boxen')

function box (str) {
  const lines = str.split('\n').map(s => `  ${s}  `).join('\n')
  return boxen(lines)
}

exports.USAGE = () => `
Usages:
  photo-web-processor [required] [options]
  photo-web-processor --config config.json
`

exports.CONFIG_USAGE = () => `
The optional JSON config should contain a single object with one key
per argument, not including the leading "--". For example:
{ "argument": "value" }
`

exports.BINARIES_REQUIRED = (list) => `
Error: the following programs are required to run photo-web-processor.
Please make sure they are installed and available in the system path.\n
${list.join('\n')}
`

const getSuccessText = stats => {
  let successText = `Images/videos processed successfully!
Start: ${stats.timings.startTime}
End: ${new Date()}
Total MS: ${stats.timings.end - stats.timings.start}ms
Converted ${stats.converted} files
Performed ${stats.resized} resizes`;

  if (stats.duplicates) {
    successText += `\nSkipped ${Object.keys(stats.duplicates).length} duplicates`
  }

  return `
${successText}
  `;
}

exports.SUCCESS = (stats) => box(getSuccessText(stats));

exports.PROBLEMS = (count) => chalk.yellow(`
 Warning: there was an issue with ${count} file${count > 1 ? 's' : ''}.
 Please check the full log for more detail.
`)

exports.SORRY = (logFile) => box(`
Something went wrong!

An unexpected error occurred.

Please check the logs at ${chalk.green(logFile)}.
`)
