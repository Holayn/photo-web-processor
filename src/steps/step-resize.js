const info = require('debug')('thumbsup:info')
const path = require('path')
const actions = require('./actions')
const { createFileProcessTask, createTasks } = require('./utils');
const Index = require('../components/index/index')

exports.run = function (files, problems, opts, parentTask) {
  return createTasks(create(files, opts, problems), opts, parentTask);
}

function helper(file, output, src, outputType, tasks, actionMap, problems, sourceFiles, opts) {
  const action = actionMap[output.rel];
  const srcPath = path.join(opts.output, src);
  const destPath = path.join(opts.output, output.path);
  const { dest, sourceFile, task } = createFileProcessTask(action, srcPath, destPath, file, output, problems, (dest) => {
    // Update index with path of processed file.
    new Index(opts.databaseFile).addProcessedPath(file, outputType, dest);
  });
  if (task) {
    tasks[dest] = task;
    sourceFiles.add(sourceFile);
  }
}

function create (files, opts, problems) {
  const tasks = {}
  const sourceFiles = new Set()
  const actionMap = actions.createMap(opts)
  
  files.forEach(f => {
    const srcPath = f.isWebSupported() ? f.output.original.path : f.output.conversion.path;
    helper(f, f.output.small, srcPath, 'small', tasks, actionMap, problems, sourceFiles, opts);
    helper(f, f.output.large, srcPath, 'large', tasks, actionMap, problems, sourceFiles, opts);
  });
  
  const list = Object.keys(tasks).map(dest => tasks[dest])
  info('Calculated required tasks', {
    sourceFiles: sourceFiles.size,
    tasks: list.length
  })
  return list
}