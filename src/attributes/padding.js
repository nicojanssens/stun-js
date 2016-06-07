'use strict'

exports.getBytes = getBytes

var PADDING_VALUE = '0x00'

function getBytes (length) {
  var paddingBytes = new Buffer((4 - length % 4) % 4)
  for (var i = 0; i < paddingBytes.length; i++) {
    paddingBytes[i] = PADDING_VALUE
  }
  return paddingBytes
}
