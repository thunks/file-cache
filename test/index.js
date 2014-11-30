'use strict';
/*global describe, it, before, after, beforeEach, afterEach*/

var should = require('should'),
  FileCache = require('../index.js');

describe('file-cache', function () {
  var fileCache = FileCache();
  it('file-cache', function (done) {
    fileCache('index.js')(function (err, file) {
      console.log(err, file);
    })(done);
  });
  // TODO
});
