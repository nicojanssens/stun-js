'use strict'

var crypto = require('crypto')
var winston = require('winston-debug')
var winstonWrapper = require('winston-meta-wrapper')

var MessageIntegrityAttr = function (request, hash) {
  // logging
  this._log = winstonWrapper(winston)
  this._log.addMeta({
    module: 'stun:attributes'
  })
  // verify request
  if (request) {
    if (request.username === undefined || request.password === undefined) {
      var errorMsg = 'invalid message integrity attribute'
      this._log.error(errorMsg)
      throw new Error(errorMsg)
    }
  }
  // init
  this.request = request
  this.hash = hash
  this.type = 0x0008
  // done
  this._log.debug('message integrity attr: request = ' + JSON.stringify(this.request) + ', hash = ' + this.hash)
}

MessageIntegrityAttr.prototype.encode = function (packetBytes) {
  if (packetBytes === undefined) {
    var errorMsg = 'invalid MessageIntegrityAttr.encode attributes'
    this._log.error(errorMsg)
    throw new Error(errorMsg)
  }
  // type
  var typeBytes = new Buffer(2)
  typeBytes.writeUInt16BE(this.type, 0)
  // value
  var key
  if (this.request.realm && this.request.realm !== '') {
    var md5 = crypto.createHash('md5')
    md5.update([this.request.username, this.request.realm, this.request.password].join(':'))
    key = md5.digest()
  } else {
    key = this.request.password
  }
  var hmac = crypto.createHmac('sha1', key)
  hmac.update(packetBytes)
  var valueBytes = new Buffer(hmac.digest())
  // length
  var lengthBytes = new Buffer(2)
  lengthBytes.writeUInt16BE(valueBytes.length, 0)
  // combination
  var result = Buffer.concat([typeBytes, lengthBytes, valueBytes])
  // done
  return result
}

MessageIntegrityAttr.decode = function (attrBytes) {
  if (attrBytes.length !== 20) {
    var errorMsg = 'invalid message integrity attribute'
    this._log.error(errorMsg)
    throw new Error(errorMsg)
  }
  var hash = attrBytes.toString('hex')
  return new MessageIntegrityAttr(null, hash)
}

module.exports = MessageIntegrityAttr
