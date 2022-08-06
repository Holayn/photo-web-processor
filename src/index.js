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
      task: (ctx, task) => {
        return steps.index(opts, (err, files) => {
          if (!err) {
            ctx.files = files
            ctx.problems = new Problems()
          }
        })
      }
    },
    {
      title: 'Resizing media',
      task: (ctx, task) => {
        ctx.problems = new Problems()
        const tasks = steps.process(ctx.files, ctx.problems, opts, task)
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
