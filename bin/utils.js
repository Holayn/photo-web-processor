const Listr = require('listr')
const yargs = require('yargs');
const fs = require('fs');
const Index = require('../src/components/index/index')

const args = process.argv.slice(2);
yargs(args)
  .wrap(null)
  .help('help')
  .demandCommand(1, 'You need at least one command before moving on')
  .command('update-metadata-fields', `Update fields that source from the metadata field.`, {
    source: {
      demand: true,
      description: 'System filepath to the index database.',
      type: 'string',
    },
    'trust-modify-dates': {
      description: 'Whether or not file modify dates are trustworthy to use as photo dates.',
      type: 'boolean',
      default: true,
    },
  }, (options) => {
    const tasks = new Listr([
      {
        title: 'Running',
        task: () => {
          if (fs.existsSync(options.source)) {
            new Index(options.source).updateMetadataFields(options.trustModifyDates);
          } else {
            console.log('Source does not exist.');
          }
        }
      },
    ], {
      renderer: 'update',
      dateFormat: false,
    });
  
    tasks.run();
  })
  .argv;