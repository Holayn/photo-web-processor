const info = require('debug')('thumbsup:info')
const path = require('path')
const actions = require('./actions')
const { createFileProcessTask, createTasks } = require('./utils');

exports.run = function (files, problems, opts, parentTask, concurrency, index) {
  return createTasks(create(files, opts, problems, index), opts, parentTask, concurrency);
}

function create (files, opts, problems, index) {
  const tasks = {}
  const sourceFiles = new Set()
  const actionMap = actions.createMap(opts)
  
  files.forEach(f => {
    const outputType = 'original';
    const output = f.output.original;
    const { dest, sourceFile, task } = createFileProcessTask(actionMap[output.rel], path.join(opts.input, f.path), path.join(opts.output, output.path), f, output, problems, (dest) => {
      // Update index with path of processed file.
      index.addProcessedPath(f, outputType, dest);
    });
    if (task) {
      tasks[dest] = task;
      sourceFiles.add(sourceFile);
    }
  });
  
  const list = Object.keys(tasks).map(dest => tasks[dest])
  info('Calculated required tasks', {
    sourceFiles: sourceFiles.size,
    tasks: list.length
  })
  return list
}
