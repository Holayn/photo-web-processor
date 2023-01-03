const CronJob = require('cron').CronJob;
const Listr = require('listr')
const path = require('path');
const Observable = require('zen-observable')
require('dotenv').config();

const { run } = require('../src/main');

let processing = false;

const args = process.argv.slice(2);

const schedule = '0 */1 * * *';
new CronJob(schedule, () => {
  processJob();
}).start();
console.log(`Processing job started: ${schedule}.`);

if (args.length && args[0].includes('--run')) {
  processJob();
}

function processJob() {
  if (!processing) {
    console.log('Job: Looking for photos to process.');
    processing = true;

    const configPaths = process.env.JOB_CONFIGS.split(',');

    const tasks = new Listr(configPaths.map(cp => {
      return {
        title: `Job: processing ${cp}`,
        task: (ctx) => {
          return new Observable(observer => {
            run(['--config', path.resolve(cp)]).then(() => {
              observer.complete();
            }).catch(() => { console.error('Something went wrong when processing photos.'); });
          });
        }
      }
    }), {
      renderer: 'update',
      dateFormat: false,
    });
  
    tasks.run().then(() => {
      processing = false;
    });
  }
}
