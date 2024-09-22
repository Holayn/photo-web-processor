# photo-web-processor

---

## Requirements

- [Node.js](http://nodejs.org/): `brew install node`
- [exiftool](http://www.sno.phy.queensu.ca/~phil/exiftool/): `brew install exiftool`
- [GraphicsMagick](http://www.graphicsmagick.org/): `brew install graphicsmagick`
- [FFmpeg](http://www.ffmpeg.org/) to process videos: `brew install ffmpeg`
- [ImageMagick](https://imagemagick.org/) for HEIC support (needs to be compiled with `--with-heic`)

## Sanity Check

`node bin/photo-web-processor.js --input test/input --output test/output`

## Quickstart

`node bin/photo-web-processor.js --input INPUT_DIR --output OUTPUT_DIR --concurrency 4`

## Options

### Excluding Files

Use `--exclude`, which accepts a glob pattern of files to exclude e.g., `my/dir/**`. The config accepts an array of patterns.

### Dealing with Untrustworthy File Modify Dates

There are occassions where a file does not any EXIF date. The processor will fallback to using the file's modify date as the file's meta date. 
However, this may not always be accurate, e.g., when a file is downloaded, its modify date is set to the current system time.

Therefore, set `trust-modify-dates` to `false` in order to not fallback to a file's modify date. In this case, the file's meta data will just be set to 0, and the
file can then be dealt with appropriately.

## Notes

- Have to regenerate symlinks if moving the output directory, because symlinks are absolute paths rather than relative. This should be fixed in the future.