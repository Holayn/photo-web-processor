/*
--------------------------------------------------------------------------------
Indexes all photos and videos in the input folder, and parses their metadata
Caches the results in <thumbsup.db> for faster re-runs
--------------------------------------------------------------------------------
*/

const Index = require('../components/index/index')
const info = require('debug')('thumbsup:info')
const { Metadata } = require('../model/metadata')
const File = require('../model/file')
const Observable = require('zen-observable')

exports.run = function (opts, callback) {
  return new Observable(observer => {
    const index = new Index(opts.databaseFile)
    const emitter = index.update(opts.input, opts)
    const files = [];
    const deleted = [];

    emitter.on('stats', stats => {
      info('Differences between disk and index', stats)
    })

    // after a file is indexed
    var lastPercent = -1
    emitter.on('progress', stats => {
      const percent = Math.floor(stats.processed * 100 / stats.total)
      if (percent > lastPercent) {
        observer.next(`Indexing ${stats.processed}/${stats.total} (${percent}%)`)
        lastPercent = percent
      }
    })

    // emitted for every file once indexing is finished
    emitter.on('file', file => {
      const meta = new Metadata(file.metadata, opts)
      const model = new File(file.metadata, meta, opts, file.modified, file.added, file.size)
      // only include valid photos and videos (i.e. exiftool recognised the format)
      if (model.type !== 'unknown') {
        files.push(model)
      }
    });

    emitter.on('deleted', file => {
      const meta = new Metadata(file.metadata, opts);
      const model = new File(file.metadata, meta, opts);
      deleted.push(model);
    });

    emitter.on('done', stats => {
      callback(null, files, index, deleted)
      observer.complete()
    })
  })
}
