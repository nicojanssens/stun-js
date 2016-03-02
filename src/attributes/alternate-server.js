'use strict'

var addressAttr = require('./address')

var debug = require('debug')
var debugLog = debug('stun-js:attributes')
var errorLog = debug('stun-js:attributes:error')

var AlternateServerAttr = function (address, port) {
  if (port === undefined || address === undefined) {
    var error = 'invalid alternate server attribute'
    errorLog(error)
    throw new Error(error)
  }
  this.address = address
  this.port = port
  this.type = 0x8023

  debugLog('alternate server attr: address = ' + this.address + ', port = ' + this.port)
}

AlternateServerAttr.prototype.encode = function () {
  // type
  var typeBytes = new Buffer(2)
  typeBytes.writeUInt16BE(this.type, 0)
  // value
  var valueBytes = addressAttr.encode(this.address, this.port)
  // length
  var lengthBytes = new Buffer(2)
  lengthBytes.writeUInt16BE(valueBytes.length, 0)
  // combination
  var result = Buffer.concat([typeBytes, lengthBytes, valueBytes])
  // done
  return result
}

AlternateServerAttr.decode = function (attrBytes) {
  var result = addressAttr.decode(attrBytes)
  return new AlternateServerAttr(result.address, result.port)
}

module.exports = AlternateServerAttr
