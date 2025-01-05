const Listr = require('listr')
const fs = require('fs-extra');
const path = require('path');

const steps = require('./steps/index')
const Problems = require('./problems')

exports.build = function (opts, done) {
  // How to render tasks
  const renderer = (opts.log === 'default') ? 'update' : 'verbose'
  // List of high level tasks
  const tasks = new Listr([
    {
      title: 'Indexing folder',
      task: (ctx) => {
        return steps.index(opts, (err, files, index, deleted) => {
          if (!err) {
            ctx.files = files;
            ctx.index = index;
            ctx.cleanup = [];

            // Clean up converted and resizes for files that have been deleted.
            ctx.cleanup.push(...deleted);
          }
        })
      }
    },
    {
      title: 'Performing additional filtering',
      task: (ctx) => {
        const { files, cleanup, duplicates } = steps.filter(ctx.files, ctx.index);
        ctx.files = files;
        ctx.cleanup.push(...cleanup);
        ctx.duplicates = duplicates;
      },
    },
    {
      title: 'Cleaning up unneeded files',
      task: (ctx) => {
        ctx.cleanup.forEach(f => {
          const outputs = ['conversion', 'original', 'large', 'small', 'thumbnail'];
          outputs.forEach(outputType => {
            const output = f.output[outputType];
      
            if (output) {
              const destPath = path.join(opts.output, output.path);
              fs.removeSync(destPath);

              if (opts.relocateConverted) {
                const relocatePath = path.join(opts.relocateConverted, output.path);
                fs.removeSync(relocatePath);
              }
            }
          });
        });
      },
    },
    {
      title: 'Converting photos to web-friendly',
      task: (ctx, task) => {
        ctx.problems = new Problems()
        const tasks = steps.processImages(ctx.files, ctx.problems, opts, task, opts.concurrency)
        ctx.converted = tasks.jobsTotal;
        if (!opts.dryRun) {
          return tasks
        } else {
          task.skip()
          return null
        }
      }
    },
    {
      title: 'Converting videos to web-friendly',
      task: (ctx, task) => {
        const tasks = steps.processVideos(ctx.files, ctx.problems, opts, task);
        ctx.converted += tasks.jobsTotal;
        if (!opts.dryRun) {
          return tasks
        } else {
          task.skip()
          return null
        }
      }
    },
    {
      title: 'Handling original files',
      task: (ctx, task) => {
        const tasks = steps.originals(ctx.files, ctx.problems, opts, task, opts.concurrency, ctx.index)
        if (!opts.dryRun) {
          return tasks
        } else {
          task.skip()
          return null
        }
      }
    },
    {
      title: 'Resizing images for the web, generating video covers',
      task: (ctx, task) => {
        const tasks = steps.resize(ctx.files, ctx.problems, opts, task, opts.concurrency, ctx.index)
        ctx.resized = tasks.jobsTotal;
        if (!opts.dryRun) {
          return tasks
        } else {
          task.skip()
          return null
        }
      }
    },
    {
      title: 'Marking files as processed',
      task: (ctx) => {
        ctx.files.forEach(f => {
          ctx.index.db.prepare('UPDATE files SET processed = 1 WHERE path = ?').run(f.path);
        });
      },
    },
  ], {
    renderer: renderer,
    dateFormat: false
  })

  tasks.run().then(ctx => {
    ctx.index.db.close();
    done(null, {
      problems: ctx.problems,
      converted: ctx.converted,
      resized: ctx.resized,
      duplicates: ctx.duplicates,
    })
  }).catch(err => {
    done(err)
  })
}
