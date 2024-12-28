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
  constructor (exif, meta, opts, modified, added) {
    this.id = ++index
    this.path = exif.SourceFile
    this.filename = path.basename(exif.SourceFile)
    this.date = fileDate(exif)
    this.type = mediaType(exif)
    this.origType = exif.File.MIMEType;
    this.extension = path.extname(this.path);
    this.isVideo = (this.type === 'video');
    this.timescale = exif.QuickTime?.TimeScale;
    this.cameraModel = exif.QuickTime?.Model || 'unknown';
    this.output = output.paths(this.path, this.type, opts || {})
    this.urls = _.mapValues(this.output, o => url.fromPath(o.path))
    this.meta = meta
    this.modified = modified;
    this.added = added;
  }

  isWebSupported() {
    if (this.isVideo) {
      return !!this.extension.match(BROWSER_SUPPORTED_VIDEO_EXTS);
    } else {
      return !!this.extension.match(BROWSER_SUPPORTED_PHOTO_EXTS);
    }
  }

  isHdrVideo() {
    // No way to tell. Have to just assume iPhone 16 always shoots video in HDR.
    // Slow-mo videos are not shot in HDR.
    return this.isVideo && this.cameraModel.includes('iPhone 16') && !this.isSlowMo();
  }

  isSlowMo() {
    return this.timescale >= 48000;
  }

  isAppleLivePhoto() {
    return this.isVideo && this.meta.appleLivePhoto;
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

function fileDate (exif) {
  return moment(exif.File.FileModifyDate, EXIF_DATE_FORMAT).valueOf()
}

function mediaType (exif) {
  const match = MIME_REGEX.exec(exif.File.MIMEType)
  if (match && match[1] === 'image') return 'image'
  if (match && match[1] === 'video') return 'video'
  return 'unknown'
}

module.exports = File
