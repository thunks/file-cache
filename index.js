'use strict';
// **Github:** https://github.com/toajs/file-cache
//
// **License:** MIT

var crypto = require('crypto');
var fs = require('fs');
var zlib = require('zlib');
var path = require('path');
var assert = require('assert');

var mime = require('mime-types');
var compressible = require('compressible');
var Thunk = require('thunks')();

var stat = Thunk.thunkify.call(fs, fs.stat);
var readFile = Thunk.thunkify.call(fs, fs.readFile);
var compressFile = {
  gzip: Thunk.thunkify.call(zlib, zlib.gzip),
  deflate: Thunk.thunkify.call(zlib, zlib.deflate),
  origin: function (buf) {
    return Thunk(buf);
  }
};

module.exports = function (options) {
  var cache = Object.create(null);
  var extraFilesMap = Object.create(null);

  options = options || {};

  if (typeof options === 'string') options = {root: options};

  var root = typeof options.root === 'string' ? options.root : process.cwd();
  root = path.resolve(process.cwd(), root);

  var extraFiles = options.extraFiles || [];
  if (!Array.isArray(extraFiles)) extraFiles = [extraFiles];
  for (var i = 0; i < extraFiles.length; i++)
    extraFilesMap[extraFiles[i]] = path.resolve(root, extraFiles[i]);

  var enableCompress = options.compress !== false;

  function resolvePath(filePath) {
    filePath = path.normalize(safeDecodeURIComponent(filePath));
    if (extraFilesMap[filePath]) return extraFilesMap[filePath];
    filePath = path.resolve(root, filePath);
    if (filePath.indexOf(root) === 0) return filePath;
    throw new Error('Unauthorized file path');
  }

  return function fileCache(filePath, encodings) {
    return Thunk(function (done) {
      var compress = bestCompress(encodings);
      filePath = resolvePath(filePath);

      if (cache[filePath]) return cloneFile(cache[filePath], compress)(done);
      return Thunk.seq([stat(filePath), readFile(filePath)])(function (error, res) {
        if (error) throw error;
        cache[filePath] = new OriginFile(filePath, res[1], res[0], enableCompress);
        return cloneFile(cache[filePath], compress);
      })(done);
    });
  };
};

var enableEncodings = Object.create(null);
enableEncodings.gzip = true;
enableEncodings.deflate = true;

function bestCompress(encodings) {
  if (!Array.isArray(encodings)) encodings = [encodings];
  for (var i = 0; i < encodings.length; i++) {
    if (enableEncodings[encodings[i]]) return encodings[i];
  }
  return 'origin';
}

function safeDecodeURIComponent(path) {
  try {
    return decodeURIComponent(path);
  } catch (e) {
    return path;
  }
}

function File(originFile, compress) {
  var content = originFile[compress];
  this.path = originFile.path;
  this.dir = originFile.dir;
  this.name = originFile.name;
  this.ext = originFile.ext;
  this.type = originFile.type;
  this.size = originFile.size;
  this.atime = originFile.atime;
  this.mtime = originFile.mtime;
  this.ctime = originFile.ctime;
  this.birthtime = originFile.birthtime;
  this.compress = compress;
  this.contents = new Buffer(content.length);
  this.length = content.length;
  this.md5 = content.md5;
  content.contents.copy(this.contents);
}

function OriginFile(filePath, buf, stats, enableCompress) {
  filePath = filePath.replace(/\\/g, '/');
  this.path = filePath;
  this.dir = path.dirname(filePath);
  this.name = path.basename(filePath);
  this.ext = path.extname(filePath);
  this.type = this.mime = mime.lookup(filePath) || 'application/octet-stream';
  this.size = stats.size;
  this.atime = stats.atime.toUTCString();
  this.mtime = stats.mtime.toUTCString();
  this.ctime = stats.ctime.toUTCString();
  this.birthtime = stats.birthtime.toUTCString();
  this.compressible = enableCompress && this.size > 1024  && compressible(this.type);
  this.contents = buf;
  this.origin = null;
  this.gzip = null;
  this.deflate = null;
}

function cloneFile(originFile, compress) {
  if (!originFile.compressible) compress = 'origin';

  return Thunk(function (callback) {
    if (originFile[compress]) return callback(null, new File(originFile, compress));
    return compressFile[compress](originFile.contents)(function (error, buf) {
      if (error) throw error;
      originFile[compress] = {
        contents: buf,
        length: Buffer.byteLength(buf),
        md5: crypto.createHash('md5').update(buf).digest('hex')
      };
      return new File(originFile, compress);
    })(callback);
  });
}
