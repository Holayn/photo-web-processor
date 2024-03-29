const Listr = require('listr')
const yargs = require('yargs');
const Observable = require('zen-observable')
const Index = require('../src/components/index/index')

const args = process.argv.slice(2);
yargs(args)
  .wrap(null)
  .help('help')
  .config('config')
  .demandCommand(1, 'You need at least one command before moving on')
  .command('update-metadata-fields', `Update fields that source from the metadata field.`, {
    source: {
      demand: true,
      description: 'System filepath to the index database.',
      type: 'string',
    },
  }, (options) => {
    const tasks = new Listr([
      {
        title: 'Running',
        task: (ctx) => {
          return new Observable(observer => {
            new Index(options.source).updateMetadataFields();
            observer.complete();
          });
        }
      },
    ], {
      renderer: 'update',
      dateFormat: false,
    });
  
    tasks.run();
  })
  .argv;