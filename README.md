file-cache v0.3.0 [![Build Status](https://travis-ci.org/thunks/file-cache.svg)](https://travis-ci.org/thunks/file-cache)
====
Read file with caching, rely on thunks.

## [thunks](https://github.com/thunks/thunks)

## Demo

```js
'use strict';
var FileCache = require('file-cache');
var fileCache = FileCache('./');

fileCache('index.js')(function (err, file) {
  console.log(file);
  // { path: '/Users/zensh/git/toajs/file-cache/index.js',
  // dir: '/Users/zensh/git/toajs/file-cache',
  // name: 'index.js',
  // ext: '.js',
  // type: 'application/javascript',
  // size: 4375,
  // atime: 'Sun, 30 Nov 2014 03:38:25 GMT',
  // mtime: 'Sun, 30 Nov 2014 03:31:30 GMT',
  // ctime: 'Sun, 30 Nov 2014 03:31:30 GMT',
  // birthtime: 'Tue, 23 Sep 2014 01:13:26 GMT',
  // compress: 'origin',
  // contents: <Buffer 27 75 73 65 20 73 74 72 69 63 74 27 3b 0a 2f 2f 20 2a 2a 47 69 74 68 75 62 3a 2a 2a 20 68 74 74 70 73 3a 2f 2f 67 69 74 68 75 62 2e 63 6f 6d 2f 74 6f ... >,
  // length: 4375,
  // md5: '08f89d75eec2731ea6612ada474a1795' }

  fileCache('index.js', 'gzip')(function (err, file) {
    console.log(file);
    // read file from cache, compress with gzip:
    //
    // { path: '/Users/zensh/git/toajs/file-cache/index.js',
    // dir: '/Users/zensh/git/toajs/file-cache',
    // name: 'index.js',
    // ext: '.js',
    // type: 'application/javascript',
    // size: 4375,
    // atime: 'Sun, 30 Nov 2014 03:48:47 GMT',
    // mtime: 'Sun, 30 Nov 2014 03:48:35 GMT',
    // ctime: 'Sun, 30 Nov 2014 03:48:35 GMT',
    // birthtime: 'Tue, 23 Sep 2014 01:13:26 GMT',
    // compress: 'gzip',
    // contents: <Buffer 1f 8b 08 00 00 00 00 00 00 03 95 58 4b 73 db 36 10 be eb 57 30 97 90 74 64 ca e9 34 17 a9 69 a7 75 d3 36 33 c9 a4 d3 26 27 47 07 8a 04 45 24 14 c1 00 ... >,
    // length: 2576,
    // md5: '33a6f550613d64dc6b7e1e2d99d568bd' }
  });
});
```

## Installation

```bash
npm install file-cache
```

## API

```js
var FileCache = require('file-cache');
var fileCache = FileCache('./static');
```

### FileCache(options)

Return a read file function with cache.

#### options

*Optional*, Type: `String` or `Object`


**options.root**

*Optional*, Type: `String`, Default: `process.cwd()`.

File directory, that allow to read file.

**options.extraFiles**

*Optional*, Type: `String` or `Array`, Default: `[]`.

Extra files path, that allow to read.

**options.compress**

*Optional*, Type: `Boolean`, Default: `true`.

Allow to compress file with `gzip` or `deflate`

**options.md5Encoding**

*Optional*, Type: `String`, Default: `base64`.

The MD5 encoding can be 'hex', 'binary' or 'base64'.

**options.maxCacheLength**

*Optional*, Type: `Number`, Default: `0`.

The maximum length of the files cache in bytes. if cache's size > maxCacheLength, then the least recently used file will be removed. if maxCacheLength === -1, cache will not be used. if maxCacheLength === 0, there is no limit.

**options.minCompressLength**

*Optional*, Type: `Number`, Default: `256`.

The minimum length of the files size in bytes that could be compressed.

### fileCache(path, encodings)

Return thunk function.

#### path

*Required*, Type: `String`

File path to read.

#### encodings

*Optional*, Type: `String` or `Array`

Compress encoding, `['gzip', 'deflate']`.
