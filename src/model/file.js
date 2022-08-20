/*
--------------------------------------------------------------------------------
Represents a file on disk, inside the input folder
Also includes how it maps to the different output files
--------------------------------------------------------------------------------
*/

const _ = require('lodash')
const path = require('path')
const moment = require('moment')
const output = require('./output')
const url = require('./url')
const {
  BROWSER_SUPPORTED_PHOTO_EXTS,
  BROWSER_SUPPORTED_VIDEO_EXTS,
} = require('../globals');

const MIME_REGEX = /([^/]+)\/(.*)/
const EXIF_DATE_FORMAT = 'YYYY:MM:DD HH:mm:ssZ'

var index = 0

class File {
  constructor (dbEntry, meta, opts) {
    this.id = ++index
    this.path = dbEntry.SourceFile
    this.filename = path.basename(dbEntry.SourceFile)
    this.date = fileDate(dbEntry)
    this.type = mediaType(dbEntry)
    this.extension = path.extname(this.path);
    this.isVideo = (this.type === 'video')
    this.output = output.paths(this.path, this.type, opts || {})
    this.urls = _.mapValues(this.output, o => url.fromPath(o.path))
    this.meta = meta
  }

  isWebSupported() {
    if (this.isVideo) {
      return !!this.extension.match(BROWSER_SUPPORTED_VIDEO_EXTS);
    } else {
      return !!this.extension.match(BROWSER_SUPPORTED_PHOTO_EXTS);
    }
  }

  isJpg() {
    return !!this.extension.match(/(jpg)$/i);
  }

  isVerticalImage() {
    return this.meta.height > this.meta.width;
  }

  isHorizontalImage() {
    return this.meta.width > this.meta.height;
  }
}

function fileDate (dbEntry) {
  return moment(dbEntry.File.FileModifyDate, EXIF_DATE_FORMAT).valueOf()
}

function mediaType (dbEntry) {
  const match = MIME_REGEX.exec(dbEntry.File.MIMEType)
  if (match && match[1] === 'image') return 'image'
  if (match && match[1] === 'video') return 'video'
  return 'unknown'
}

module.exports = File
