'use strict'
// **Github:** https://github.com/thunks/file-cache
//
// **License:** MIT

var fs = require('fs')
var zlib = require('zlib')
var path = require('path')
var crypto = require('crypto')

var mime = require('mime-types')
var compressible = require('compressible')
var LRUCache = require('lrucache')
var thunk = require('thunks')()

var stat = thunk.thunkify(fs.stat)
var readFile = thunk.thunkify(fs.readFile)
var copyBuffer = Buffer.allocUnsafe ? Buffer.from : function (buf) { return new Buffer(buf) }
var compressFile = {
  gzip: thunk.thunkify(zlib.gzip),
  deflate: thunk.thunkify(zlib.deflate),
  origin: function (buf) {
    return thunk(buf)
  }
}

module.exports = function (options) {
  var cache = Object.create(null)
  var extraFilesMap = Object.create(null)
  var lruCache = new LRUCache()
  var totalBytes = 0
  var cwd = process.cwd()

  options = options || {}

  if (typeof options === 'string') options = {root: options}
  // for test.
  if (options.debug) module.exports.cache = cache

  var root = typeof options.root === 'string' ? options.root : cwd
  root = path.resolve(cwd, root)

  var extraFiles = options.extraFiles || []
  if (!Array.isArray(extraFiles)) throw new Error('"extraFiles" must be Array')
  for (var i = 0; i < extraFiles.length; i++) {
    extraFilesMap[extraFiles[i]] = path.resolve(cwd, extraFiles[i])
  }

  var enableCompress = options.compress !== false
  var maxCacheLength = options.maxCacheLength >= -1 ? Math.floor(options.maxCacheLength) : 0
  var minCompressLength = options.minCompressLength >= 16 ? Math.floor(options.minCompressLength) : 256
  var md5Encoding = options.md5Encoding || 'base64'

  function resolvePath (filePath) {
    filePath = path.normalize(filePath)
    if (extraFilesMap[filePath]) return extraFilesMap[filePath]
    return path.join(root, path.join('/', filePath))
  }

  function checkLRU (filePath, addSize) {
    if (maxCacheLength <= 0) return

    totalBytes += addSize
    lruCache.set(filePath, (lruCache.get(filePath) || 0) + addSize)

    while (lruCache.staleKey() !== filePath && totalBytes >= maxCacheLength) {
      var stale = lruCache.popStale()
      delete cache[stale[0]]
      totalBytes -= stale[1]
    }
  }

  return function fileCache (filePath, encodings) {
    return thunk(function (done) {
      var compressEncoding = bestCompress(encodings)
      filePath = resolvePath(filePath)

      var readAndCacheFile = cache[filePath]
      if (readAndCacheFile instanceof OriginFile) {
        return cloneFile(readAndCacheFile, compressEncoding, checkLRU)(done)
      }
      if (!readAndCacheFile) {
        readAndCacheFile = thunk.persist(thunk.seq([
          stat(filePath),
          readFile(filePath)
        ]))
        if (maxCacheLength !== -1) cache[filePath] = readAndCacheFile
      }

      readAndCacheFile(function (error, res) {
        if (error) throw error
        var originFile = cache[filePath]
        if (!(originFile instanceof OriginFile)) {
          originFile = new OriginFile(filePath, res[0], res[1],
            enableCompress, minCompressLength, md5Encoding)
          cache[filePath] = maxCacheLength === -1 ? null : originFile
        }
        return cloneFile(originFile, compressEncoding, checkLRU)
      })(done)
    })
  }
}

var enableEncodings = Object.create(null)
enableEncodings.gzip = true
enableEncodings.deflate = true

function bestCompress (encodings) {
  if (!Array.isArray(encodings)) encodings = [encodings]
  for (var i = 0; i < encodings.length; i++) {
    if (enableEncodings[encodings[i]]) return encodings[i]
  }
  return 'origin'
}

function File (originFile, compressEncoding) {
  this.md5 = originFile.md5
  this.dir = originFile.dir
  this.ext = originFile.ext
  this.name = originFile.name
  this.path = originFile.path
  this.size = originFile.size
  this.type = originFile.type
  this.atime = originFile.atime
  this.mtime = originFile.mtime
  this.ctime = originFile.ctime
  this.compress = compressEncoding === 'origin' ? '' : compressEncoding
  this.contents = copyBuffer(originFile[compressEncoding])
}

function OriginFile (filePath, stats, buf, enableCompress, minCompressLength, md5Encoding) {
  filePath = filePath.replace(/\\/g, '/')
  this.count = 0
  this.md5 = crypto.createHash('md5').update(buf).digest(md5Encoding)
  this.dir = path.dirname(filePath)
  this.ext = path.extname(filePath)
  this.name = path.basename(filePath)
  this.path = filePath
  this.size = stats.size
  this.type = mime.lookup(filePath) || 'application/octet-stream'
  this.atime = stats.atime.toUTCString()
  this.mtime = stats.mtime.toUTCString()
  this.ctime = stats.ctime.toUTCString()
  this.compressible = enableCompress && this.size > minCompressLength && compressible(this.type)
  this.contents = buf
  this.origin = null
  this.gzip = null
  this.deflate = null
}

function cloneFile (originFile, compressEncoding, checkLRU) {
  return thunk(function (done) {
    originFile.count += 1
    if (!originFile.compressible) compressEncoding = 'origin'
    var compressAndCacheBuffer = originFile[compressEncoding]
    if (Buffer.isBuffer(compressAndCacheBuffer)) {
      return done(null, new File(originFile, compressEncoding))
    }

    if (!compressAndCacheBuffer) {
      compressAndCacheBuffer = thunk.persist(compressFile[compressEncoding](originFile.contents))
      originFile[compressEncoding] = compressAndCacheBuffer
    }

    compressAndCacheBuffer(function (error, buf) {
      if (error) throw error
      if (!Buffer.isBuffer(originFile[compressEncoding])) {
        originFile[compressEncoding] = buf
        checkLRU(originFile.path, buf.length)
      }
      return new File(originFile, compressEncoding)
    })(done)
  })
}

module.exports.File = File
module.exports.OriginFile = OriginFile
