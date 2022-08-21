const Listr = require('listr')
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
        return steps.index(opts, (err, files, index) => {
          if (!err) {
            ctx.files = files;
            ctx.index = index;
          }
        })
      }
    },
    {
      title: 'Performing additional filtering',
      task: (ctx) => {
        const files = [];
        ctx.files.forEach(f => {
          if (f.isAppleLivePhoto()) {
            // Clear out any paths of previous live photos that may have set due to being processed.
            ctx.index.db.prepare('UPDATE files SET processed_path_small = null, processed_path_large = null, processed_path_original = null WHERE path = ?').run(f.path);
          } else {
            files.push(f);
          }
        });
        ctx.files = files;
      },
    },
    {
      title: 'Converting photos to web-friendly',
      task: (ctx, task) => {
        ctx.problems = new Problems()
        const tasks = steps.processImages(ctx.files, ctx.problems, opts, task, opts.concurrency)
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
        const tasks = steps.processVideos(ctx.files, ctx.problems, opts, task)
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
        const tasks = steps.originals(ctx.files, ctx.problems, opts, task)
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
        const tasks = steps.resize(ctx.files, ctx.problems, opts, task)
        if (!opts.dryRun) {
          return tasks
        } else {
          task.skip()
          return null
        }
      }
    },
  ], {
    renderer: renderer,
    dateFormat: false
  })

  tasks.run().then(ctx => {
    done(null, {
      problems: ctx.problems
    })
  }).catch(err => {
    done(err)
  })
}
