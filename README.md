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

### Starting the Job

`node bin/job.js`

## Options

### Excluding Files

Use `--exclude`, which accepts a glob pattern of files to exclude e.g., `my/dir/**`. The config accepts an array of patterns.