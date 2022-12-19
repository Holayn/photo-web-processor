const fs = require('fs-extra');
const Listr = require('listr')
const os = require('os');
const path = require('path');
const yargs = require('yargs');
const Observable = require('zen-observable')
const exiftool = require('../src/components/exiftool/parallel')
const globber = require('../src/components/index/glob')
const Index = require('../src/components/index/index')

const args = process.argv.slice(2);
yargs(args)
  .wrap(null)
  .help('help')
  .config('config')
  .demandCommand(1, 'You need at least one command before moving on')
  .command('fix-bad-extension-heic', `Fix .HEIC images that don't have a proper extension`, {
    source: {
      demand: true,
      description: 'System filepath to the images/videos',
      type: 'string',
    },
    concurrency: {
      description: 'Concurrency',
      type: 'number',
      default: os.cpus().length,
    },
    'dry-run': {
      description: 'Do a dry-run where files are not renamed',
      type: 'boolean',
    },
  }, (options) => {
    const tasks = new Listr([
      {
        title: 'Running',
        task: (ctx) => {
          return new Observable(observer => {
            globber.findAllPhotos(options.source, options, (err, diskMap) => {
              if (err) return console.error('error', err);
        
              const filePaths = Object.keys(diskMap).reduce((acc, path) => { acc.push(path); return acc; }, []);
        
              const stream = exiftool.parse(options.source, filePaths, options.concurrency);
        
              stream.on('data', entry => {
                const origFile = entry.SourceFile;
                const origExt = path.extname(origFile);
                if ((origExt.includes('jpg') || origExt.includes('jpeg')) && entry.File.MIMEType.includes('heic')) {
                  if (!options.dryRun) {
                    console.log(`Fixing ${entry.File.FileName}`);
                    const origFileDir = path.dirname(origFile);
                    const origFileName = path.basename(origFile, path.extname(origFile));
                    const newFile = `${origFileDir}/${origFileName}.HEIC`;
                    fs.renameSync(path.join(options.source, entry.SourceFile), path.join(options.source, newFile));
                  } else {
                    console.log(`Need to fix ${entry.File.FileName}`);
                  }
                }
              }).on('end', () => {
                observer.complete();
              });
            });
          });
        }
      },
    ], {
      renderer: 'update',
      dateFormat: false,
    });
  
    tasks.run();
  })
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