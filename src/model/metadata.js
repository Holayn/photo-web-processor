/*
--------------------------------------------------------------------------------
Standardised metadata for a given image or video
This is based on parsing "provider data" such as Exiftool
--------------------------------------------------------------------------------
*/

const _ = require('lodash')
const moment = require('moment')

// mime type for videos
const MIME_VIDEO_REGEX = /^video\/.*$/

// standard EXIF date format, which is different from ISO8601
// Ignore any time offsets - use the local time of the photo taken.
const EXIF_DATE_FORMAT = 'YYYY:MM:DD HH:mm:ss'

class Metadata {
  constructor (exiftool, opts) {
    // standardise metadata
    this.date = getDate(exiftool)
    this.caption = caption(exiftool)
    this.keywords = keywords(exiftool)
    this.people = people(exiftool)
    this.video = video(exiftool)
    this.animated = animated(exiftool)
    this.rating = rating(exiftool)
    const size = dimensions(exiftool)
    this.width = size.width
    this.height = size.height
    this.exif = opts ? (opts.embedExif ? exiftool.EXIF : undefined) : undefined
    this.appleLivePhoto = !!tagValue(exiftool, 'QuickTime', 'LivePhotoAuto') || !!tagValue(exiftool, 'QuickTime', 'Live-photoAuto');
    // metadata could also include fields like
    //  - lat = 51.5
    //  - long = 0.12
    //  - country = "England"
    //  - city = "London"
    //  - aperture = 1.8
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
  const date = tagValue(exif, 'EXIF', 'DateTimeOriginal') ||
    tagValue(exif, 'H264', 'DateTimeOriginal') ||
    tagValue(exif, 'QuickTime', 'ContentCreateDate') ||
    tagValue(exif, 'QuickTime', 'CreationDate') ||
    tagValue(exif, 'XMP', 'CreateDate') ||
    tagValue(exif, 'XMP', 'DateCreated')
  if (date) {
    const parsed = moment(date, EXIF_DATE_FORMAT)
    if (parsed.isValid()) return parsed
  }
  return null
}

function caption (exif) {
  return tagValue(exif, 'EXIF', 'ImageDescription') ||
    tagValue(exif, 'IPTC', 'Caption-Abstract') ||
    tagValue(exif, 'IPTC', 'Headline') ||
    tagValue(exif, 'XMP', 'Description') ||
    tagValue(exif, 'XMP', 'Title') ||
    tagValue(exif, 'XMP', 'Label') ||
    tagValue(exif, 'QuickTime', 'Title')
}

function keywords (exif) {
  const sources = [
    tagValue(exif, 'IPTC', 'Keywords'),
    tagValue(exif, 'XMP', 'Subject')
  ]
  return _.chain(sources).flatMap(makeArray).uniq().value()
}

function people (exif) {
  return tagValue(exif, 'XMP', 'PersonInImage') || []
}

function video (exif) {
  return MIME_VIDEO_REGEX.test(exif.File['MIMEType'])
}

function animated (exif) {
  if (exif.File['MIMEType'] !== 'image/gif') return false
  if (exif.GIF && exif.GIF.FrameCount > 0) return true
  return false
}

function rating (exif) {
  if (!exif.XMP) return 0
  return exif.XMP['Rating'] || 0
}

function tagValue (exif, type, name) {
  if (!exif[type]) return null
  return exif[type][name]
}

function makeArray (value) {
  if (!value) return []
  return Array.isArray(value) ? value : value.split(',')
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
