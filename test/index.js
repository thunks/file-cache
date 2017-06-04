'use strict'

const path = require('path')
const tman = require('tman')
const assert = require('assert')
const thunk = require('thunks')()
const FileCache = require('../index.js')

tman.suite('file-cache', function () {
  const fileCache = FileCache({debug: true})

  tman.it('read dir should error', function () {
    return fileCache('test')(function (err, res) {
      assert.ok(err instanceof Error)
      assert.strictEqual(err.code, 'EISDIR')
      assert.strictEqual(res, undefined)
    })
  })

  tman.it('read non-exists file should error', function () {
    return fileCache('package1.json')(function (err, res) {
      assert.ok(err instanceof Error)
      assert.strictEqual(err.code, 'ENOENT')
      assert.strictEqual(res, undefined)
    })
  })

  tman.it('read file', function () {
    assert.ok(Object.keys(FileCache.cache).length > 0)

    return fileCache('index.js')(function (err, file) {
      if (err) throw err

      assert.ok(file instanceof FileCache.File)
      assert.strictEqual(typeof file.dir, 'string')
      assert.strictEqual(file.ext, '.js')
      assert.strictEqual(file.name, 'index.js')
      assert.strictEqual(file.type, 'application/javascript')
      assert.strictEqual(file.path, path.join(file.dir, file.name))
      assert.strictEqual(typeof file.size, 'number')
      assert.ok(new Date(file.atime).getTime() > 0)
      assert.ok(new Date(file.mtime).getTime() > 0)
      assert.ok(new Date(file.ctime).getTime() > 0)
      assert.strictEqual(file.compress, '')
      assert.ok(file.contents instanceof Buffer)
      assert.strictEqual(file.contents.length, file.size)
      assert.strictEqual(typeof file.md5, 'string')

      let originFile = FileCache.cache[file.path]
      assert.ok(originFile instanceof FileCache.OriginFile)
      assert.strictEqual(originFile.md5, file.md5)
      assert.strictEqual(originFile.count, 1)
      assert.strictEqual(originFile.gzip, null)
      assert.strictEqual(originFile.deflate, null)
      assert.ok(originFile.origin === originFile.contents)
      assert.ok(originFile.origin !== file.contents)
      assert.ok(originFile.origin.equals(file.contents))
    })
  })

  tman.it('read file with gzip compress', function () {
    return fileCache('index.js', 'gzip')(function (err, file) {
      if (err) throw err

      assert.ok(file instanceof FileCache.File)
      assert.strictEqual(file.compress, 'gzip')
      assert.ok(file.contents instanceof Buffer)
      assert.ok(file.contents.length < file.size)
      assert.strictEqual(typeof file.md5, 'string')

      let originFile = FileCache.cache[file.path]
      assert.strictEqual(originFile.md5, file.md5)
      assert.strictEqual(originFile.count, 2)
      assert.strictEqual(originFile.deflate, null)
      assert.ok(originFile.gzip.length < originFile.origin.length)
      assert.ok(originFile.gzip !== file.contents)
      assert.ok(originFile.gzip.equals(file.contents))
    })
  })

  tman.it('read file with deflate compress', function () {
    return fileCache('index.js', 'deflate')(function (err, file) {
      if (err) throw err

      assert.ok(file instanceof FileCache.File)
      assert.strictEqual(file.compress, 'deflate')
      assert.ok(file.contents instanceof Buffer)
      assert.ok(file.contents.length < file.size)
      assert.strictEqual(typeof file.md5, 'string')

      let originFile = FileCache.cache[file.path]
      assert.strictEqual(originFile.md5, file.md5)
      assert.strictEqual(originFile.count, 3)
      assert.ok(originFile.deflate.length < originFile.origin.length)
      assert.ok(originFile.deflate !== file.contents)
      assert.ok(originFile.deflate.equals(file.contents))
    })
  })

  tman.it('cocurrent read should use cache', function () {
    return thunk.all([
      fileCache('package.json'),
      fileCache('package.json'),
      fileCache('package.json', 'gzip'),
      fileCache('package.json', 'gzip'),
      fileCache('package.json', 'deflate')
    ])(function (err, res) {
      if (err) throw err

      assert.ok(res[0] instanceof FileCache.File)
      assert.ok(res[1] instanceof FileCache.File)
      assert.ok(res[2] instanceof FileCache.File)
      assert.ok(res[3] instanceof FileCache.File)
      assert.ok(res[4] instanceof FileCache.File)

      assert.ok(res[0] !== res[1])
      assert.ok(res[2] !== res[3])

      assert.deepEqual(res[0], res[1])
      assert.deepEqual(res[2], res[3])

      let originFile = FileCache.cache[res[0].path]
      assert.strictEqual(originFile.count, 5)
      assert.ok(Buffer.isBuffer(originFile.origin))
      assert.ok(Buffer.isBuffer(originFile.gzip))
      assert.ok(Buffer.isBuffer(originFile.deflate))
    })
  })
})
