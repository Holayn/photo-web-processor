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
    fs.mkdirpSync(path.dirname(indexPath))
    this.db = new Database(indexPath, {})
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        path TEXT NOT NULL,
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

    this.deletedDb = new DeletedIndex(indexPath);
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
    const insertIdStatement = this.db.prepare('INSERT INTO files (id, path, file_name, file_date, date, metadata) VALUES (?, ?, ?, ?, ?, ?)')
    const replaceStatement = this.db.prepare('REPLACE INTO files (id, path, file_name, file_date, date, metadata) VALUES (?, ?, ?, ?, ?, ?)')
    const deleteStatement = this.db.prepare('DELETE FROM files WHERE id = ?');
    const countStatement = this.db.prepare('SELECT COUNT(*) AS count FROM files')
    const selectMetadata = this.db.prepare('SELECT * FROM files')
    const selectByFileNameFileDate = this.db.prepare('SELECT * FROM files WHERE file_name = ? AND file_date = ?');
    const selectByPath = this.db.prepare('SELECT * FROM files WHERE path = ?');

    const findFileCopies = (fileName, fileDate) => selectByFileNameFileDate.all(fileName, fileDate);

    // create hashmap of all files in the database
    const databaseMap = {}
    for (var row of selectStatement.iterate()) {
      databaseMap[row.path] = row.file_date
    }

    function finished (deltaFiles, deletedIndex) {
      const deleted = new Set(deltaFiles.deleted);

      const entries = selectMetadata.all();
      // emit every file in the index
      for (const row of entries) {
        if (deleted.has(row.path)) { 
          emitter.emit('deleted', {
            path: row.path,
            timestamp: new Date(row.file_date),
            metadata: JSON.parse(row.metadata),
          });

          deletedIndex.insert(row);
          deleteStatement.run(row.id);
          continue; 
        }

        emitter.emit('file', {
          path: row.path,
          timestamp: new Date(row.file_date),
          metadata: JSON.parse(row.metadata),
          modified: deltaFiles.modified.includes(row.path),
          added: deltaFiles.added.includes(row.path),
          deleted: deltaFiles.deleted.includes(row.path),
        });
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
      if (toProcess.length === 0) {
        return finished(deltaFiles, this.deletedDb)
      }

      // call <exiftool> on added and modified files
      // and write each entry to the database
      const stream = exiftool.parse(mediaFolder, toProcess, options.concurrency)
      stream.on('data', entry => {
        const fileDate = moment(entry.File.FileModifyDate, EXIF_DATE_FORMAT).valueOf();
        const fileName = path.basename(entry.SourceFile);
        const filePath = entry.SourceFile;
        const fileMetaDate = getDate(entry, options.trustModifyDates);

        const originalPathFile = selectByPath.get(filePath);

        if (originalPathFile) {
          replaceStatement.run(originalPathFile.id, filePath, fileName, fileDate, fileMetaDate, JSON.stringify(entry))
        } else {
          const insert = () => {
            // If matching files used to exist in the index, add them back (with the same IDs they had before).
            const deletedFiles = this.deletedDb.findFileCopies(fileName, fileDate);
            if (deletedFiles.length) {
              deletedFiles.forEach(deletedFile => {
                insertIdStatement.run(deletedFile.id, filePath, fileName, fileDate, fileMetaDate, JSON.stringify(entry));
                this.deletedDb.remove(deletedFile.id);
              });
            } else {
              insertStatement.run(filePath, fileName, fileDate, fileMetaDate, JSON.stringify(entry))
            }
          }

          // The file doesn't exist yet. Look for any existing entries that indicate that the entry is in fact a copy of the new file.
          // Instead of inserting a new record for the file, check to see if any existing entry points to a path that no longer exists, and update that entry to point to the new path instead.
          // This way, files that have been moved have their ID preserved.
          const fileCopies = findFileCopies(fileName, fileDate);
          
          if (fileCopies.length) {
            let replaced = false;

            fileCopies.forEach(file => {
              if (!replaced) {
                const exists = deltaFiles.added.includes(file.path) || deltaFiles.unchanged.includes(file.path) || deltaFiles.modified.includes(file.path);
                if (!exists) {
                  replaceStatement.run(file.id, filePath, fileName, fileDate, getDate(entry), JSON.stringify(entry));
                  replaced = true;
                }
              }
            });

            if (!replaced) {
              insert();
            }
          } else {
            insert();
          }
        }

        ++processed
        emitter.emit('progress', { path: filePath, processed: processed, total: toProcess.length })
      }).on('end', () => {
        finished(deltaFiles, this.deletedDb);
      });
    })

    return emitter
  }

  updateMetadataFields(trustModifyDates = true) {
    this.db.prepare('SELECT * FROM files').all().forEach(file => {
      const newDate = getDate(JSON.parse(file.metadata), trustModifyDates);
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

class DeletedIndex {
  constructor (indexPath) {
    fs.mkdirpSync(path.dirname(indexPath))
    const parsedPath = path.parse(indexPath);
    parsedPath.base = 'index-deleted.db';
    const deletedIndexPath = path.join(parsedPath.dir, parsedPath.base);
    this.db = new Database(deletedIndexPath, {})
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER,
        path TEXT UNIQUE NOT NULL,
        file_name TEXT NOT NULL,
        file_date INTEGER NOT NULL
      )
    `)

    this.insertStatement = this.db.prepare('INSERT INTO files (id, path, file_name, file_date) VALUES (?, ?, ?, ?)');
    this.selectStatement = this.db.prepare('SELECT * FROM files WHERE file_name = ? AND file_date = ?');
    this.selectIdStatement = this.db.prepare('SELECT * FROM files WHERE id = ?');
    this.deleteStatement = this.db.prepare('DELETE FROM files WHERE id = ?');
  }

  insert(row) {
    if (!this.selectIdStatement.get(row.id)) {
      this.insertStatement.run(row.id, row.path, row.file_name, row.file_date);
    }
  }

  findFileCopies(fileName, fileDate) {
    return this.selectStatement.all(fileName, fileDate);
  }

  remove(id) {
    this.deleteStatement.run(id);
  }
}

module.exports = Index
