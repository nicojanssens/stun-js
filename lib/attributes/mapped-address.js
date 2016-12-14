'use strict'

var addressAttr = require('./address')
var winston = require('winston')
var winstonWrapper = require('winston-meta-wrapper')

var MappedAddressAttr = function (address, port) {
  // logging
  this._log = winstonWrapper(winston)
  this._log.addMeta({
    module: 'stun:attributes'
  })
  // verify address and port
  if (address === undefined || port === undefined) {
    var errorMsg = 'invalid mapped address attribute'
    this._log.error(errorMsg)
    throw new Error(errorMsg)
  }
  // init
  this.address = address
  this.port = port
  this.type = 0x0001
  // done
  this._log.debug('mapped address = ' + this.address + ', port = ' + this.port)
}

MappedAddressAttr.prototype.encode = function () {
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

MappedAddressAttr.decode = function (attrBytes) {
  var result = addressAttr.decode(attrBytes)
  return new MappedAddressAttr(result.address, result.port)
}

module.exports = MappedAddressAttr