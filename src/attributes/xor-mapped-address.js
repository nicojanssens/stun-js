'use strict'

var addressAttr = require('./address')

var debug = require('debug')
var debugLog = debug('stun-js:attributes')
var errorLog = debug('stun-js:attributes:error')

var XORMappedAddressAttr = function (address, port) {
  if (address === undefined || port === undefined) {
    var error = 'invalid xor mapped address attribute'
    errorLog(error)
    throw new Error(error)
  }
  this.address = address
  this.port = port
  this.type = 0x0020

  debugLog('xor mapped address attr: ' + this.address + ':' + this.port)
}

XORMappedAddressAttr.prototype.encode = function (magic, tid) {
  if (magic === undefined || tid === undefined) {
    var error = 'invalid xorMappedAddressAttr.encode params'
    errorLog(error)
    throw new Error(error)
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
