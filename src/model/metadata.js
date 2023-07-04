/*
--------------------------------------------------------------------------------
Standardised metadata for a given image or video
This is based on parsing "provider data" such as Exiftool
--------------------------------------------------------------------------------
*/

const _ = require('lodash')
const moment = require('moment')

const EXIF_DATE_FORMAT = 'YYYY:MM:DD HH:mm:ssZ'

class Metadata {
  constructor (exif) {
    this.date = getDate(exif)
    const size = dimensions(exif)
    this.width = size.width
    this.height = size.height
    this.appleLivePhoto = exif.QuickTime?.LivePhotoAuto || exif.QuickTime?.['Live-photoAuto'];
  }
}

function getDate (exif) {
  // first, check if there's a valid date in the metadata
  const metadate = getMetaDate(exif)
  if (metadate) return metadate.valueOf()
  // otherwise, fallback to the last modified date
  return moment(exif.File.FileModifyDate, EXIF_DATE_FORMAT).valueOf()
}

function getMetaDate (exif) {
  const date = exif.EXIF?.DateTimeOriginal ||
    exif.H264?.DateTimeOriginal ||
    exif.QuickTime?.ContentCreateDate ||
    exif.QuickTime?.CreationDate ||
    exif.XMP?.CreateDate ||
    exif.XMP?.DateCreated;

  if (date) {
    const parsed = moment(date, EXIF_DATE_FORMAT)
    if (parsed.isValid()) return parsed
  }
  return null
}

function dimensions (exif) {
  // Use the Composite field to avoid having to check all possible tag groups (EXIF, QuickTime, ASF...)
  if (!exif.Composite || !exif.Composite.ImageSize) {
    return {
      width: null,
      height: null
    }
  } else {
    const size = exif.Composite.ImageSize
    const x = size.indexOf('x')
    return {
      width: parseInt(size.substr(0, x), 10),
      height: parseInt(size.substr(x + 1), 10)
    }
  }
}

module.exports = {
  getDate,
  Metadata,
}
