const info = require('debug')('thumbsup:info')
const error = require('debug')('thumbsup:error')
const path = require('path')
const fs = require('fs-extra')
const { createTasks } = require('./utils');

exports.run = function (files, problems, opts, parentTask) {
  return createTasks(create(files, opts, problems), opts, parentTask);
}

function create(files, opts, problems) {
  const tasks = [];
  const sourceFiles = new Set()
  files.forEach(f => {
    if (!f.isWebSupported()) {
      const output = f.output['conversion'];

      const convertedFilePath = path.join(opts.output, output.path);
      const stats = fs.lstatSync(convertedFilePath);
      if (!stats.isSymbolicLink()) {
        sourceFiles.add(convertedFilePath);
        const relocatePath = path.join(opts.relocateConverted, output.path);

        tasks.push({
          action: (done) => {
            try {
              fs.mkdirsSync(path.dirname(relocatePath));
              fs.renameSync(convertedFilePath, relocatePath);
            } catch (err) {
              error(`Error relocating ${convertedFilePath} -> ${relocatePath}\n${err}`);
              problems.addFile(convertedFilePath);

              done();
            }

            try {
              fs.symlinkSync(relocatePath, convertedFilePath);
            } catch (err) {
              error(`Error generating symlink ${convertedFilePath} -> ${relocatePath}\n${err}`);
              problems.addFile(convertedFilePath);
              fs.renameSync(relocatePath, convertedFilePath);
            }

            done();
          },
          rel: 'relocate',
          dest: relocatePath,
        });
      }
    }
  });
  info('Calculated required tasks', {
    sourceFiles: sourceFiles.size,
    tasks: tasks.length
  })
  return tasks;
}
