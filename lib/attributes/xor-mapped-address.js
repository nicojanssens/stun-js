'use strict'

var addressAttr = require('./address')
var winston = require('winston-debug')
var winstonWrapper = require('winston-meta-wrapper')

var XORMappedAddressAttr = function (address, port) {
  // logging
  this._log = winstonWrapper(winston)
  this._log.addMeta({
    module: 'stun:attributes'
  })
  // verify address and port
  if (address === undefined || port === undefined) {
    var errorMsg = 'invalid xor mapped address attribute'
    this.log.error(errorMsg)
    throw new Error(errorMsg)
  }
  // init
  this.address = address
  this.port = port
  this.type = 0x0020
  // done
  this._log.debug('xor mapped address attr: ' + this.address + ':' + this.port)
}

XORMappedAddressAttr.prototype.encode = function (magic, tid) {
  if (magic === undefined || tid === undefined) {
    var errorMsg = 'invalid xorMappedAddressAttr.encode params'
    this._log.error(errorMsg)
    throw new Error(errorMsg)
  }
  // type
  var typeBytes = new Buffer(2)
  typeBytes.writeUInt16BE(this.type, 0)
  // value
  var valueBytes = addressAttr.encodeXor(this.address, this.port, magic, tid)
  // length
  var lengthBytes = new Buffer(2)
  lengthBytes.writeUInt16BE(valueBytes.length, 0)
  // combination
  var result = Buffer.concat([typeBytes, lengthBytes, valueBytes])
  // done
  return result
}

XORMappedAddressAttr.decode = function (attrBytes, headerBytes) {
  var magicBytes = headerBytes.slice(4, 8) // BE
  var tidBytes = headerBytes.slice(8, 20) // BE

  var result = addressAttr.decodeXor(attrBytes, magicBytes, tidBytes)
  return new XORMappedAddressAttr(result.address, result.port)
}

module.exports = XORMappedAddressAttr
