const downsize = require('thumbsup-downsize')
const fs = require('fs-extra')
const sharp = require('sharp');

exports.createMap = function (opts) {
  const thumbSize = opts.thumbSize || 120
  const smallSize = opts.smallSize || 480
  const largeSize = opts.largeSize || 1440
  const defaultOptions = {
    quality: opts.photoQuality || 90,
    args: opts.gmArgs
  }
  const watermark = (!opts.watermark) ? null : {
    file: opts.watermark,
    position: opts.watermarkPosition
  }
  const seek = opts.videoStills === 'middle' ? -1 : opts.videoStillsSeek
  const thumbnail = Object.assign({}, defaultOptions, {
    height: thumbSize,
    width: thumbSize,
    seek: seek
  })
  const small = Object.assign({}, defaultOptions, {
    height: smallSize,
    seek: seek
  })
  const large = Object.assign({}, defaultOptions, {
    height: largeSize,
    watermark: watermark,
    animated: true,
    seek: seek
  })
  const videoOpts = {
    format: opts.videoFormat,
    quality: opts.videoQuality || 75,
    bitrate: opts.videoBitrate
  }
  return {
    'fs:copy': (task, done) => fs.copy(task.src, task.dest, done),
    'fs:symlink': (task, done) => fs.symlink(task.src, task.dest, done),
    'photo:conversion': ({ src, dest, file }, done) => {
      if (file.isWebSupported()) {
        done();
      } else {
        downsize.image(src, dest, {
          quality: 100,
        }, done);
      }
    },
    'photo:thumbnail': (task, done) => downsize.image(task.src, task.dest, thumbnail, done),
    'photo:small': ({ src, dest, file }, done) => {
      if (!file.isJpg()) {
        sharp(src)
        .resize(null, small.height)
        .jpeg({
          quality: 90,
        })
        .toFile(dest)
        .then(() => done());
      } else {
        sharp(src)
        .resize(null, small.height)
        .toFile(dest)
        .then(() => done());
      }
    },
    'photo:large': ({ src, dest, file }, done) => {
      let height = file.isHorizontalImage() ? largeSize : null;
      const width = file.isVerticalImage() ? largeSize : null;
      if (height === null && width === null) {
        height = largeSize;
      }
      if (file.isWebSupported()) {
        if (!file.isJpg()) {
          sharp(src)
          .resize(width, height)
          .jpeg({
            quality: 90,
          })
          .toFile(dest)
          .then(() => done());
        } else {
          sharp(src)
          .resize(width, height)
          .toFile(dest)
          .then(() => done());
        }
      }
      else {
        return downsize.image(src, dest, {
          ...large,
          height,
          width,
        }, done);
      }
    },
    'video:thumbnail': (task, done) => downsize.still(task.src, task.dest, thumbnail, done),
    'video:small': (task, done) => downsize.still(task.src, task.dest, small, done),
    'video:poster': (task, done) => downsize.still(task.src, task.dest, large, done),
    'video:resized': ({ src, dest, file }, done) => {
      if (file.isWebSupported()) {
        // Return original video, don't bother resizing it.
        return fs.symlink(src, dest, done);
      } else {
        return downsize.video(src, dest, videoOpts, done);
      }
    },
    'video:large': ({ src, dest, file }, done) => {
      return fs.symlink(src, dest, done);
    },
    'video:conversion': ({ src, dest, file }, done) => {
      if (file.isWebSupported()) {
        done();
      } else {
        return downsize.video(src, dest, videoOpts, done);
      }
    },
  }
}
