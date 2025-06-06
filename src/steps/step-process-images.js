const info = require('debug')('thumbsup:info')
const error = require('debug')('thumbsup:error')
const path = require('path')
const fs = require('fs-extra')
const actions = require('./actions')
const { createFileProcessTask, createTasks } = require('./utils');

exports.run = function (files, problems, opts, parentTask, concurrency) {
  return createTasks(create(files, opts, problems), opts, parentTask, concurrency);
}

function create(files, opts, problems) {
  const tasks = {}
  const sourceFiles = new Set()
  const actionMap = actions.createMap(opts)
  files.filter(f => !f.isVideo).forEach(f => {
    if (!f.isWebSupported()) {
      const outputs = ['conversion'];
      outputs.forEach(outputType => {
        const output = f.output[outputType];
  
        if (output) {
          const action = actionMap[output.rel];
          const srcPath = path.join(opts.input, f.path);
          const destPath = path.join(opts.output, output.path);

          const { dest, sourceFile, task } = createFileProcessTask(action, srcPath, destPath, f, output, problems, () => {
            if (opts.relocateConverted) {
              if (!fs.existsSync(destPath)) {
                error(`${destPath} missing, conversion probably failed.`);
                problems.addFile(destPath);
                return;
              }

              const stats = fs.lstatSync(destPath);
              if (!stats.isSymbolicLink()) {
                const relocatePath = path.join(opts.relocateConverted, output.path);

                try {
                  fs.mkdirsSync(path.dirname(relocatePath));
                  fs.moveSync(destPath, relocatePath, { overwrite: true });
                } catch (err) {
                  error(`Error relocating ${destPath} -> ${relocatePath}\n${err}`);
                  problems.addFile(destPath);
    
                  return;
                }
    
                try {
                  fs.symlinkSync(path.resolve(relocatePath), destPath);
                } catch (err) {
                  error(`Error generating symlink ${destPath} -> ${relocatePath}\n${err}`);
                  problems.addFile(destPath);
                  fs.moveSync(relocatePath, destPath);
                }
              }
            }
          });

          if (task) {
            tasks[dest] = task;
            sourceFiles.add(sourceFile);
          }
        }
      });
    }
  });
  const list = Object.keys(tasks).map(dest => tasks[dest])
  info('Calculated required tasks', {
    sourceFiles: sourceFiles.size,
    tasks: list.length
  })
  return list
}
