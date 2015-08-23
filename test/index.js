'use strict'
/*global describe, it */

var FileCache = require('../index.js')

describe('file-cache', function () {
  var fileCache = FileCache()
  it('file-cache', function (done) {
    fileCache('index.js')(function (err, file) {
      console.log(err, file)
    })(done)
  })
// TODO
})
