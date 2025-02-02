const messages = require('./messages')
const path = require('path')
const yargs = require('yargs')
const os = require('os')
const _ = require('lodash')

const OPTIONS = {

  // ------------------------------------
  // Required arguments
  // ------------------------------------

  'input': {
    group: 'Required:',
    description: 'Path to the folder with all photos/videos',
    type: 'string',
    normalize: true,
    demand: true
  },
  'output': {
    group: 'Required:',
    description: 'Output path for the static website',
    type: 'string',
    normalize: true,
    demand: true
  },

  // ------------------------------------
  // Input options
  // ------------------------------------
  'include-photos': {
    group: 'Input options:',
    description: 'Include photos in the gallery',
    type: 'boolean',
    'default': true
  },
  'include-videos': {
    group: 'Input options:',
    description: 'Include videos in the gallery',
    type: 'boolean',
    'default': true
  },
  'include-raw-photos': {
    group: 'Input options:',
    description: 'Include raw photos in the gallery',
    type: 'boolean',
    'default': false
  },
  'include': {
    group: 'Input options:',
    description: 'Glob pattern of files to include',
    type: 'array'
  },
  'exclude': {
    group: 'Input options:',
    description: 'Glob pattern of files to exclude',
    type: 'array'
  },
  'trust-modify-dates': {
    group: 'Input options:',
    description: 'Whether or not file modify dates are trustworthy to use as photo dates.',
    type: 'boolean',
    default: true,
  },

  // ------------------------------------
  // Output options
  // ------------------------------------

  'thumb-size': {
    group: 'Output options:',
    description: 'Pixel size of the square thumbnails',
    type: 'number',
    'default': 120
  },
  'small-size': {
    group: 'Output options:',
    description: 'Pixel height of the small photos',
    type: 'number',
  },
  'large-size': {
    group: 'Output options:',
    description: 'Pixel height of the fullscreen photos',
    type: 'number',
  },
  'photo-quality': {
    group: 'Output options:',
    description: 'Quality of the resized/converted photos',
    type: 'number',
  },
  'video-quality': {
    group: 'Output options:',
    description: 'Quality of the converted video (percent)',
    type: 'number',
  },
  'video-bitrate': {
    group: 'Output options:',
    description: 'Bitrate of the converted videos (e.g. 120k)',
    type: 'string',
    'default': null
  },
  'video-format': {
    group: 'Output options:',
    description: 'Video output format',
    choices: ['mp4', 'webm'],
    'default': 'mp4'
  },
  'video-stills': {
    group: 'Output options:',
    description: 'Where the video still frame is taken',
    choices: ['seek', 'middle'],
    'default': 'seek'
  },
  'video-stills-seek': {
    group: 'Output options:',
    description: 'Number of seconds where the still frame is taken',
    type: 'number',
    'default': 1
  },
  'photo-preview': {
    group: 'Output options:',
    description: 'How lightbox photos are generated',
    choices: ['resize', 'copy', 'symlink', 'link'],
    'default': 'resize'
  },
  'video-preview': {
    group: 'Output options:',
    description: 'How lightbox videos are generated',
    choices: ['resize', 'copy', 'symlink', 'link'],
    'default': 'resize'
  },
  'photo-download': {
    group: 'Output options:',
    description: 'How downloadable photos are generated',
    choices: ['resize', 'copy', 'symlink', 'link'],
    'default': 'resize'
  },
  'video-download': {
    group: 'Output options:',
    description: 'How downloadable videos are generated',
    choices: ['resize', 'copy', 'symlink', 'link'],
    'default': 'resize'
  },
  'link-prefix': {
    group: 'Output options:',
    description: 'Path or URL prefix for "linked" photos and videos',
    type: 'string'
  },
  'cleanup': {
    group: 'Output options:',
    description: 'Remove any output file that\'s no longer needed',
    type: 'boolean',
    'default': false
  },
  'concurrency': {
    group: 'Output options:',
    description: 'Number of parallel parsing/processing operations',
    type: 'number',
    'default': os.cpus().length
  },
  'output-structure': {
    group: 'Output options:',
    description: 'File and folder structure for output media',
    choices: ['folders', 'suffix'],
    'default': 'folders'
  },
  'gm-args': {
    group: 'Output options:',
    description: 'Custom image processing arguments for GraphicsMagick',
    type: 'array'
  },
  'relocate-converted': {
    group: 'Output options:',
    description: 'Relocate converted photos/videos to a different directory',
    type: 'string'
  },


  // ------------------------------------
  // Misc options
  // ------------------------------------

  'config': {
    group: 'Misc options:',
    description: 'JSON config file (one key per argument)',
    normalize: true
  },

  'database-file': {
    group: 'Misc options:',
    description: 'Path to the database file',
    normalize: true
  },

  'log-file': {
    group: 'Misc options:',
    description: 'Path to the log file',
    normalize: true
  },

  'log': {
    group: 'Misc options:',
    description: 'Print a detailed text log',
    choices: ['default', 'info', 'debug', 'trace', 'warn'],
    default: 'default'
  },

  'usage-stats': {
    group: 'Misc options:',
    description: 'Enable anonymous usage statistics',
    type: 'boolean',
    'default': true
  },

  'dry-run': {
    group: 'Misc options:',
    description: "Update the index, but don't create the media files",
    type: 'boolean',
    'default': false
  },
}

// explicitly pass <process.argv> so we can unit test this logic
// otherwise it pre-loads all process arguments on require()
exports.get = (args) => {
  const parsedOptions = yargs(args)
    .usage(messages.USAGE())
    .wrap(null)
    .help('help')
    .config('config')
    .options(OPTIONS)
    .epilogue(messages.CONFIG_USAGE())
    .argv

  // Warn users when they use deprecated options
  const deprecated = Object.keys(OPTIONS).filter(name => OPTIONS[name].group === 'Deprecated:')
  const specified = deprecated.filter(name => typeof parsedOptions[name] !== 'undefined')
  if (specified.length > 0) {
    const warnings = specified.map(name => `Warning: --${name} is deprecated`)
    console.error(warnings.join('\n') + '\n')
  }

  // Delete all options containing dashes, because yargs already aliases them as camelCase
  // This means we can process the camelCase version only after that
  const opts = _.omitBy(parsedOptions, (value, key) => key.indexOf('-') >= 0)

  // Default database file
  if (!opts.databaseFile) {
    opts.databaseFile = path.join(opts.output, 'index.db')
  }

  // Default log file
  if (!opts.logFile) {
    opts.logFile = changeExtension(opts.databaseFile, '.log')
  }

  // Better to work with absolute paths
  opts.input = path.resolve(opts.input)
  opts.output = path.resolve(opts.output)
  opts.databaseFile = path.resolve(opts.databaseFile)
  opts.logFile = path.resolve(opts.logFile)

  // By default, use relative links to the input folder
  if (opts.downloadLinkPrefix) opts.linkPrefix = opts.downloadLinkPrefix
  if (!opts.linkPrefix) {
    opts.linkPrefix = path.relative(opts.output, opts.input)
  }

  // Add a dash prefix to any --gm-args value
  // We can't specify the prefix on the CLI otherwise the parser thinks it's a photo-web-processor arg
  if (opts.gmArgs) {
    opts.gmArgs = opts.gmArgs.map(val => `-${val}`)
  }

  return opts
}

function changeExtension (file, ext) {
  const originalExt = path.extname(file)
  const filename = path.basename(file, originalExt)
  return path.join(path.dirname(file), filename + ext)
}
