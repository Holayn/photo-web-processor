const path = require('path')
const urljoin = require('url-join')
const url = require('./url')

const BROWSER_SUPPORTED_PHOTO_EXTS = /(jpg|jpeg|png|gif)$/i
const BROWSER_CONVERTED_PHOTO_EXT = 'jpg'
const BROWSER_CONVERTED_VIDEO_EXT = 'mp4'

exports.folders = function (filepath, rel, options = {}) {
  const dir = path.dirname(filepath)
  const name = path.basename(filepath, path.extname(filepath))
  const ext = path.extname(filepath).substr(1)
  const photoExt = photoExtension(filepath)
  const videoExt = BROWSER_CONVERTED_VIDEO_EXT
  switch (rel) {
    case 'photo:thumbnail': return path.normalize(`media/thumb/${dir}/${name}.${photoExt}`)
    case 'photo:small': return path.normalize(`media/small/${dir}/${name}.${photoExt}`)
    case 'photo:large': return path.normalize(`media/large/${dir}/${name}.${photoExt}`)
    case 'video:thumbnail': return path.normalize(`media/thumb/${dir}/${name}.jpg`)
    case 'video:small': return path.normalize(`media/small/${dir}/${name}.jpg`)
    case 'video:poster': return path.normalize(`media/large/${dir}/${name}.jpg`)
    case 'video:resized': return path.normalize(`media/large/${dir}/${name}.${videoExt}`)
    case 'fs:copy': return path.normalize(`media/original/${dir}/${name}.${ext}`)
    case 'fs:symlink': return path.normalize(`media/original/${dir}/${name}.${ext}`)
    case 'fs:link': return join(options.linkPrefix, filepath)
    default: throw new Error(`Invalid relationship: ${rel}`)
  }
}

exports.suffix = function (filepath, rel, options = {}) {
  const dir = path.dirname(filepath)
  const name = path.basename(filepath, path.extname(filepath))
  const ext = path.extname(filepath).substr(1)
  const photoExt = photoExtension(filepath)
  const videoExt = options.videoFormat || 'mp4'
  switch (rel) {
    case 'photo:thumbnail': return path.normalize(`media/${dir}/${name}_${ext}_thumb.${photoExt}`)
    case 'photo:small': return path.normalize(`media/${dir}/${name}_${ext}_small.${photoExt}`)
    case 'photo:large': return path.normalize(`media/${dir}/${name}_${ext}_large.${photoExt}`)
    case 'video:thumbnail': return path.normalize(`media/${dir}/${name}_${ext}_thumb.jpg`)
    case 'video:small': return path.normalize(`media/${dir}/${name}_${ext}_small.jpg`)
    case 'video:poster': return path.normalize(`media/${dir}/${name}_${ext}_poster.jpg`)
    case 'video:resized': return path.normalize(`media/${dir}/${name}_${ext}_large.${videoExt}`)
    case 'fs:copy': return path.normalize(`media/${dir}/${name}.${ext}`)
    case 'fs:symlink': return path.normalize(`media/${dir}/${name}.${ext}`)
    case 'fs:link': return join(options.linkPrefix, filepath)
    default: throw new Error(`Invalid relationship: ${rel}`)
  }
}

function photoExtension (filepath) {
  const extension = path.extname(filepath).substr(1)
  return extension.match(BROWSER_SUPPORTED_PHOTO_EXTS) ? extension : BROWSER_CONVERTED_PHOTO_EXT
}

function join (prefix, filepath) {
  if (prefix.match(/^(http|https|file):\/\//)) {
    return urljoin(prefix, url.fromPath(filepath))
  } else {
    return path.join(prefix, filepath)
  }
}
