'use strict'

var padding = require('./padding')
var winston = require('winston-debug')
var winstonWrapper = require('winston-meta-wrapper')

var NonceAttr = function (value) {
  // logging
  this._log = winstonWrapper(winston)
  this._log.addMeta({
    module: 'stun:attributes'
  })
  // verify value
  if (value === undefined) {
    var errorMsg = 'invalid nonce attribute'
    this._log.error(errorMsg)
    throw new Error(errorMsg)
  }
  // init
  this.value = value
  this.type = 0x0015
  // done
  this._log.debug('nonce attr: ' + this.value)
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
