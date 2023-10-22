const _ = require('lodash')
const Database = require('better-sqlite3')
const delta = require('./delta')
const EventEmitter = require('events')
const exiftool = require('../exiftool/parallel')
const { getDate } = require('../../model/metadata')
const fs = require('fs-extra')
const globber = require('./glob')
const moment = require('moment')
const path = require('path')

const EXIF_DATE_FORMAT = 'YYYY:MM:DD HH:mm:ssZ'

class Index {
  constructor (indexPath) {
    // create the database if it doesn't exist
    fs.mkdirpSync(path.dirname(indexPath))
    this.db = new Database(indexPath, {})
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY,
        path TEXT UNIQUE NOT NULL,
        file_name TEXT NOT NULL,
        file_date INTEGER NOT NULL, 
        date INTEGER NOT NULL,
        metadata BLOB NOT NULL, 
        processed INTEGER,
        processed_path_small TEXT, 
        processed_path_large TEXT, 
        processed_path_original TEXT,
        processed_path_thumb TEXT
      )
    `)
  }

  /*
    Index all the files in <media> and store into <database>
  */
  update (mediaFolder, options = {}) {
    // will emit many different events
    const emitter = new EventEmitter()

    // prepared database statements
    const selectStatement = this.db.prepare('SELECT path, file_date FROM files')
    const insertStatement = this.db.prepare('INSERT INTO files (path, file_name, file_date, date, metadata) VALUES (?, ?, ?, ?, ?)')
    const replaceStatement = this.db.prepare('REPLACE INTO files (id, path, file_name, file_date, date, metadata) VALUES (?, ?, ?, ?, ?, ?)')
    const countStatement = this.db.prepare('SELECT COUNT(*) AS count FROM files')
    const selectMetadata = this.db.prepare('SELECT * FROM files')
    const selectFile = this.db.prepare('SELECT * FROM files WHERE file_name = ? AND file_date = ?');

    // create hashmap of all files in the database
    const databaseMap = {}
    for (var row of selectStatement.iterate()) {
      databaseMap[row.path] = row.file_date
    }

    function finished () {
      // emit every file in the index
      for (var row of selectMetadata.iterate()) {
        emitter.emit('file', {
          path: row.path,
          timestamp: new Date(row.file_date),
          metadata: JSON.parse(row.metadata)
        })
      }
      // emit the final count
      const result = countStatement.get()
      emitter.emit('done', { count: result.count })
    }

    // find all files on disk
    globber.find(mediaFolder, options, (err, diskMap) => {
      if (err) return console.error('error', err)

      // calculate the difference: which files have been added, modified, etc
      const deltaFiles = delta.calculate(databaseMap, diskMap)
      emitter.emit('stats', {
        unchanged: deltaFiles.unchanged.length,
        added: deltaFiles.added.length,
        modified: deltaFiles.modified.length,
        deleted: deltaFiles.deleted.length,
        total: Object.keys(diskMap).length
      })

      // check if any files need parsing
      var processed = 0
      const toProcess = _.union(deltaFiles.added, deltaFiles.modified)
      if (toProcess.length === 0) {;
        return finished()
      }

      // call <exiftool> on added and modified files
      // and write each entry to the database
      const stream = exiftool.parse(mediaFolder, toProcess, options.concurrency)
      stream.on('data', entry => {
        const fileDate = moment(entry.File.FileModifyDate, EXIF_DATE_FORMAT).valueOf();
        const fileName = path.basename(entry.SourceFile);
        const file = selectFile.get(fileName, fileDate);
        if (file && file.id) {
          replaceStatement.run(file.id, entry.SourceFile, fileName, fileDate, getDate(entry), JSON.stringify(entry))
        } else {
          insertStatement.run(entry.SourceFile, fileName, fileDate, getDate(entry), JSON.stringify(entry))
        }
        ++processed
        emitter.emit('progress', { path: entry.SourceFile, processed: processed, total: toProcess.length })
      }).on('end', () => {
        finished();
      });
    })

    return emitter
  }

  updateMetadataFields() {
    this.db.prepare('SELECT * FROM files').all().forEach(file => {
      const newDate = getDate(JSON.parse(file.metadata));
      if (file.date !== newDate) {
        console.log(`Updating date of ${file.path}`);
      }
      this.db.prepare(`UPDATE files SET date = ? WHERE path = ?`).run(newDate, file.path);
    });
  }

  /*
    Do a full vacuum to optimise the database
    which can be needed if files are often deleted/modified
  */
  vacuum () {
    this.db.exec('VACUUM')
  }

  addProcessedPath(file, outputType, realDest) {
    const convertPath = (filePath) => {
      const realDestFileName = path.basename(realDest);
      return path.join(path.dirname(filePath), realDestFileName);
    }
    if (outputType === 'small') {
      this.db.prepare('UPDATE files SET processed_path_small = ? WHERE path = ?').run(convertPath(file.output.small.path), file.path);
    } else if (outputType === 'large') {
      this.db.prepare('UPDATE files SET processed_path_large = ? WHERE path = ?').run(convertPath(file.output.large.path), file.path);
    } else if (outputType === 'original') {
      this.db.prepare('UPDATE files SET processed_path_original = ? WHERE path = ?').run(convertPath(file.output.original.path), file.path);
    } else if (outputType === 'thumbnail') {
      this.db.prepare('UPDATE files SET processed_path_thumb = ? WHERE path = ?').run(convertPath(file.output.thumbnail.path), file.path);
    }
  }
}

module.exports = Index
