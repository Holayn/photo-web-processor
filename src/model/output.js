const warn = require('debug')('thumbsup:warn')
const structure = require('./structure')

exports.paths = function (filepath, mediaType, opts) {
  if (mediaType === 'image') {
    return image(filepath, opts)
  } else if (mediaType === 'video') {
    return video(filepath, opts)
  } else {
    warn(`Unsupported file type <${mediaType}> for ${filepath}`)
    return {}
  }
}

function image (filepath, opts) {
  return {
    small: relationship(filepath, 'photo:small', opts),
    large: relationship(filepath, shortRel('image', opts.photoPreview), opts),
    original: relationship(filepath, 'fs:symlink', opts)
  }
}

function video (filepath, opts) {
  return {
    small: relationship(filepath, 'video:small', opts),
    large: relationship(filepath, shortRel('video', opts.videoPreview), opts),
    original: relationship(filepath, 'fs:symlink', opts)
  }
}

function shortRel (mediaType, shorthand) {
  shorthand = shorthand || 'resize'
  switch (shorthand) {
    case 'resize': return mediaType === 'image' ? 'photo:large' : 'video:resized'
    case 'copy': return 'fs:copy'
    case 'symlink': return 'fs:symlink'
    case 'link': return 'fs:link'
    default: throw new Error(`Invalid relationship: ${shorthand}`)
  }
}

function relationship (filepath, rel, opts) {
  const fn = structure[opts.outputStructure || 'folders']
  if (!fn) {
    throw new Error(`Invalid output structure: ${opts.outputStructure}`)
  }
  return {
    path: fn(filepath, rel, opts),
    rel: rel
  }
}
