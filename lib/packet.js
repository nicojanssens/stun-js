'use strict'

var Attributes = require('./attributes')
var winston = require('winston-debug')
var winstonWrapper = require('winston-meta-wrapper')

var _log = winstonWrapper(winston)
_log.addMeta({
  module: 'stun:packet'
})

// packet class
var Packet = function (method, type, attrs) {
  // logging
  this._log = winstonWrapper(winston)
  this._log.addMeta({
    module: 'stun:packet'
  })
  // assertions
  if (!containsValue(Packet.METHOD, method)) {
    var methodError = 'invalid packet method attribute'
    this._log.error(methodError)
    throw new Error(methodError)
  }
  if (!containsValue(Packet.TYPE, type)) {
    var typeError = 'invalid packet type attribute'
    this._log.error(typeError)
    throw new Error(typeError)
  }
  // init
  this.method = method
  this.type = type
  this.attrs = attrs || new Attributes()
  this.tid = this._getTransactionId()
}

// packet header length
Packet.HEADER_LENGTH = 20
// STUN magic cookie
Packet.MAGIC_COOKIE = 0x2112A442 // fixed
// max transaction ID (32bit)
Packet.TID_MAX = Math.pow(2, 32)
// message types
Packet.TYPE = {
  REQUEST: 0x0000,
  INDICATION: 0x0010,
  SUCCESS_RESPONSE: 0x0100,
  ERROR_RESPONSE: 0x0110
}
// STUN method
Packet.METHOD = {}
Packet.METHOD.BINDING = 0x0001

// encode packet
Packet.prototype.encode = function () {
  var attrsBuffer = this.attrs.encode(Packet.MAGIC_COOKIE, this.tid)
  var attrsLength = attrsBuffer.length
  // check if we need to include a message integrity attribute
  var messageIntegrity = this.getAttribute(Attributes.MESSAGE_INTEGRITY)
  if (messageIntegrity) {
    attrsLength += 24 // size of the message-integrity attribute
  }
  // encode header bytes
  var headerBuffer = this._encodeHeader(attrsLength)
  // create packet bytes
  var packetBuffer = Buffer.concat([headerBuffer, attrsBuffer])
  // append message integrity attribute if requested
  if (messageIntegrity) {
    var messageIntegrityBuffer = messageIntegrity.encode(packetBuffer)
    packetBuffer = Buffer.concat([packetBuffer, messageIntegrityBuffer])
  }
  return packetBuffer
}

// decode packet
Packet.decode = function (bytes, isFrame) {
  // check if packet starts with 0b00
  if (!Packet._isStunPacket(bytes)) {
    _log.debug('this is not a STUN packet')
    return
  }
  // check if buffer contains enough bytes to parse header
  if (bytes.length < Packet.HEADER_LENGTH) {
    _log.debug('not enough bytes to parse STUN header, giving up')
    return
  }
  // parse header
  var headerBytes = bytes.slice(0, Packet.HEADER_LENGTH)
  var header = Packet._decodeHeader(headerBytes)
  // check magic cookie
  if (header.magic !== Packet.MAGIC_COOKIE) {
    var incorrectMagicCookieError = 'magic cookie field has incorrect value'
    _log.error(incorrectMagicCookieError)
    throw new Error(incorrectMagicCookieError)
  }
  // check if length attribute is valid
  if (header.length % 4 !== 0) {
    _log.debug('attributes are not padded to a multiple of 4 bytes, giving up')
    return
  }
  // check if buffer contains enough bytes to parse Attributes
  if (bytes.length < Packet.HEADER_LENGTH + header.length) {
    _log.debug('not enough bytes to parse attributes, giving up')
    return
  }
  var attrsBytes = bytes.slice(Packet.HEADER_LENGTH, Packet.HEADER_LENGTH + header.length)
  var attrs = Attributes.decode(attrsBytes, headerBytes)

  var packet = new Packet(header.method, header.type, attrs)
  packet.tid = header.tid

  var result = {}
  result.packet = packet
  result.remainingBytes = bytes.slice(Packet.HEADER_LENGTH + header.length, bytes.length)
  // do we expect remaining bytes?
  if (isFrame && result.remainingBytes.length !== 0) {
    var errorMsg = 'not expecting remaining bytes after processing full frame packet'
    _log.error(errorMsg)
    throw new Error(errorMsg)
  }
  // done
  return result
}

// get attribute
Packet.prototype.getAttribute = function (type) {
  return this.attrs.get(type)
}

// encode packet header
Packet.prototype._encodeHeader = function (length) {
  var type = this.method | this.type
  var encodedHeader = new Buffer(Packet.HEADER_LENGTH)
  encodedHeader.writeUInt16BE((type & 0x3fff), 0)
  encodedHeader.writeUInt16BE(length, 2)
  encodedHeader.writeUInt32BE(Packet.MAGIC_COOKIE, 4)
  encodedHeader.writeUInt32BE(0, 8)
  encodedHeader.writeUInt32BE(0, 12)
  encodedHeader.writeUInt32BE(this.tid, 16)

  return encodedHeader
}

// decode packet header
Packet._decodeHeader = function (bytes) {
  var header = {}
  var methodType = bytes.readUInt16BE(0)
  header.length = bytes.readUInt16BE(2)
  header.magic = bytes.readUInt32BE(4)
  header.tid = bytes.readUInt32BE(16)
  header.type = (methodType & 0x0110)
  header.method = (methodType & 0xFEEF)
  return header
}

// check if this is a STUN packet (starts with 0b00)
Packet._isStunPacket = function (bytes) {
  var block = bytes.readUInt8(0)
  var bit1 = containsFlag(block, 0x80)
  var bit2 = containsFlag(block, 0x40)
  return (!bit1 && !bit2)
}

// generate tansaction ID
Packet.prototype._getTransactionId = function () {
  return (Math.random() * Packet.TID_MAX)
}

// utils
function containsFlag (number, flag) {
  return (number & flag) === flag
}

function containsValue (object, value) {
  var result = false
  Object.keys(object).forEach(function (key) {
    if (object[key] === value) {
      result = true
    }
  })
  return result
}

module.exports = Packet
