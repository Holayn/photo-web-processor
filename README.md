# photo-web-processor

---

## Requirements

- [Node.js](http://nodejs.org/): `brew install node`
- [exiftool](http://www.sno.phy.queensu.ca/~phil/exiftool/): `brew install exiftool`
- [GraphicsMagick](http://www.graphicsmagick.org/): `brew install graphicsmagick`

Optional:
- [FFmpeg](http://www.ffmpeg.org/) to process videos: `brew install ffmpeg`
- [Gifsicle](http://www.lcdf.org/gifsicle/) to process animated GIFs: `brew install gifsicle`
- [dcraw](https://www.cybercom.net/~dcoffin/dcraw/) to process RAW photos: `brew install dcraw`
- [ImageMagick](https://imagemagick.org/) for HEIC support (needs to be compiled with `--with-heic`)

## Sanity Check

`node bin/photo-web-processor.js --input test/input --output test/output`

## Quickstart

`node bin/photo-web-processor.js --input INPUT_DIR --output OUTPUT_DIR --concurrency 4`

## Cron Job

A cron job can be run in order to routinely process photos. This job is setup to process configs. A config file should look like:

```
{
  "input": "INPUT_DIR",
  "output": "OUTPUT_DIR",
  "concurrency": 4
}
```
Point to the config filepath in the `.env` file under `JOB_CONFIGS` (comma-delineated).

This job runs every hour.

### Starting the Job

`node bin/job.js`

