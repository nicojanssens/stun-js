'use strict'

var padding = require('./padding')

var debug = require('debug')
var debugLog = debug('stun-js:attributes')
var errorLog = debug('stun-js:attributes:error')

var NonceAttr = function (value) {
  if (value === undefined) {
    var error = 'invalid nonce attribute'
    errorLog(error)
    throw new Error(error)
  }
  this.value = value
  this.type = 0x0015
  debugLog('nonce attr: ' + this.value)
}

NonceAttr.prototype.encode = function () {
  // type
  var typeBytes = new Buffer(2)
  typeBytes.writeUInt16BE(this.type, 0)
  // value
  var valueBytes = new Buffer(this.value)
  if (this.value.length >= 128 || valueBytes.length >= 764) {
    throw new Error('invalid nonce attribute')
  }
  // length
  var lengthBytes = new Buffer(2)
  lengthBytes.writeUInt16BE(valueBytes.length, 0)
  // padding
  var paddingBytes = padding.getBytes(valueBytes.length)
  // combination
  var result = Buffer.concat([typeBytes, lengthBytes, valueBytes, paddingBytes])
  // done
  return result
}

NonceAttr.decode = function (attrBytes) {
  var value = attrBytes.toString()
  if (attrBytes.length >= 764 || value.length >= 128) {
    throw new Error('invalid nonce attribute')
  }
  return new NonceAttr(value)
}

module.exports = NonceAttr
