const debug = require('debug')('thumbsup:debug')
const error = require('debug')('thumbsup:error')
const fs = require('fs-extra')
const path = require('path')
const ListrWorkQueue = require('../components/listr-work-queue/index')

function createTasks(jobs, opts, parentTask, concurrency) {
  // wrap each job in a Listr task that returns a Promise
  const tasks = jobs.map(job => listrTaskFromJob(job, opts.output));
  const originalTaskTitle = parentTask.title;
  const listr = new ListrWorkQueue(tasks, {
    concurrent: concurrency || 1,
    update: (done, total) => {
      const progress = done === total ? '' : `(${done}/${total})`
      parentTask.title = `${originalTaskTitle}: Processing media ${progress}`
    }
  })
  return listr
}

function createFileProcessTask(action, srcPath, destPath, file, output, problems, onFileProcessed) {
  const destDate = modifiedDate(destPath)

  // ignore output files that don't have an action (e.g. existing links)
  if (action) {
    debug(`Comparing ${file.path} (${file.date}) and ${output.path} (${destDate})`)
  }
  if (action && ((file.date > destDate) || (file.modified || file.added))) {
    const task = {
      file,
      dest: destPath,
      rel: output.rel,
      action: (done) => {
        fs.mkdirsSync(path.dirname(destPath))
        debug(`${output.rel} from ${srcPath} to ${destPath}`)
        return action({ src: srcPath, dest: destPath, file }, err => {
          if (err) {
            error(`Error processing ${file.path} -> ${output.path}\n${err}`)
            problems.addFile(file.path)
          } else {
            onFileProcessed(destPath);
          }
          done()
        })
      }
    }

    return {
      dest: destPath,
      sourceFile: file.path,
      task,
    }
  }
  else if (!!destDate) {
    onFileProcessed(destPath);
  }

  return {};
}

function listrTaskFromJob (job, outputRoot) {
  const relative = path.relative(outputRoot, job.dest)
  return {
    title: `${job.rel}: ${relative}`,
    task: (ctx, task) => {
      return new Promise((resolve, reject) => {
        var progressEmitter = job.action(err => {
          err ? reject(err) : resolve()
        })
        // render progress percentage for videos
        if (progressEmitter) {
          progressEmitter.on('progress', (percent) => {
            task.title = `${relative} (${percent}%)`
          })
        }
      })
    }
  }
}

function modifiedDate (filepath) {
  try {
    return fs.statSync(filepath).mtime.getTime()
  } catch (ex) {
    return 0
  }
}

module.exports = {
  createFileProcessTask,
  createTasks,
}