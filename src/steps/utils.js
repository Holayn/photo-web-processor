const debug = require('debug')('thumbsup:debug')
const error = require('debug')('thumbsup:error')
const fs = require('fs-extra')
const path = require('path')

function createTasks(jobs, opts, parentTask, concurrency = 1) {
  const originalParentTitle = parentTask.title;
  const total = jobs.length;
  let done = 0;

  return parentTask.newListr(jobs.map(job => ({
    title: `${job.rel}: ${path.relative(opts.output, job.dest)}`,
    task: () => {
      return new Promise((resolve, reject) => {
        job.action(err => {
          if (err) {
            reject(err);
          } else {
            done += 1;
            const progress = done === total ? '' : `(${done}/${total})`
            parentTask.title = `${originalParentTitle}: Processing media ${progress}`
            resolve();
          }
        });
      });
    }
  })), {
    concurrent: concurrency,
  });
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