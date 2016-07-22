'use strict'

var events = require('events')
var util = require('util')
var Packet = require('./packet')
var Q = require('q')
var UdpTransport = require('./transports/udp')
var winston = require('winston')
var winstonWrapper = require('winston-meta-wrapper')

// Init client
var StunComm = function (stunHost, stunPort, transport) {
  // logging
  this._log = winstonWrapper(winston)
  this._log.addMeta({
    module: 'stun-js'
  })
  // verify port and address
  if (stunPort === undefined || stunHost === undefined) {
    var errorMsg = 'stun host and/or port are undefined'
    this._log.error(errorMsg)
    throw new Error(errorMsg)
  }
  // init
  this._responseCallbacks = {}

  events.EventEmitter.call(this)

  this._transport = transport || new UdpTransport()
  this._transport.onData(this.onIncomingData())
  this._transport.onError(this.onFailure())
  this._transport.init(stunHost, stunPort)

  this._decoders = []
  this._decoders.push({
    decoder: Packet.decode,
    listener: this.dispatchStunPacket.bind(this)
  })
  this._availableBytes = new Buffer(0)
}

// Inherit EventEmitter
util.inherits(StunComm, events.EventEmitter)

// Close client
StunComm.prototype.close = function (done) {
  this._log.debug('closing client')
  this._transport.close(done)
}

StunComm.prototype.closeP = function () {
  this._log.debug('closing client')
  return this._transport.closeP()
}

/** STUN communication */

// Send STUN request
StunComm.prototype.sendStunRequest = function (bytes, onResponse, onFailure) {
  // get tid
  var tid = bytes.readUInt32BE(16)
  // store response handler for this tid
  this._responseCallbacks[tid] = onResponse
  // send bytes
  this._transport.send(
    bytes,
    function () { // on success
      // do nothing
    },
    function (error) { // on failure
      onFailure(error)
    }
  )
}

StunComm.prototype.sendStunRequestP = function (bytes) {
  var deferred = Q.defer()
  this.sendStunRequest(
    bytes,
    function (stunResponse) { // on response
      deferred.resolve(stunResponse)
    },
    function (error) { // on failure
      deferred.reject(error)
    }
  )
  return deferred.promise
}

// Send STUN indication
StunComm.prototype.sendStunIndicationP = function (bytes) {
  return this._transport.sendP(bytes)
}

StunComm.prototype.sendStunIndication = function (bytes, onSuccess, onFailure) {
  if (onSuccess === undefined || onFailure === undefined) {
    var errorMsg = 'send stun indication callback handlers are undefined'
    this._log.error(errorMsg)
    throw new Error(errorMsg)
  }
  this._transport.send(bytes, onSuccess, onFailure)
}

// Incoming data handler
StunComm.prototype.onIncomingData = function () {
  var self = this
  return function (bytes, rinfo, isFrame) {
    self._log.debug('receiving data from ' + JSON.stringify(rinfo))
    self._availableBytes = Buffer.concat([self._availableBytes, bytes])
    self.parseIncomingData(rinfo, isFrame)
  }
}

StunComm.prototype.parseIncomingData = function (rinfo, isFrame) {
  var self = this
  // iterate over registered decoders
  for (var i in this._decoders) {
    var decoder = this._decoders[i].decoder
    var listener = this._decoders[i].listener
    // execute decoder
    var decoding = decoder(self._availableBytes, isFrame)
    // if decoding was successful
    if (decoding) {
      // store remaining bytes (if any) for later use
      this._availableBytes = decoding.remainingBytes
      // dispatch packet
      listener(decoding.packet, rinfo)
      // if there are remaining bytes, then trigger new parsing round
      if (this._availableBytes.length !== 0) {
        this.parseIncomingData(rinfo, isFrame)
      }
      // and break
      break
    }
  }
}

StunComm.prototype.dispatchStunPacket = function (stunPacket, rinfo) {
  switch (stunPacket.type) {
    case Packet.TYPE.SUCCESS_RESPONSE:
      this._log.debug('incoming STUN success response')
      this.onIncomingStunResponse(stunPacket)
      break
    case Packet.TYPE.ERROR_RESPONSE:
      this._log.debug('incoming STUN success response')
      this.onIncomingStunResponse(stunPacket)
      break
    case Packet.TYPE.INDICATION:
      this._log.debug('incoming STUN indication')
      this.onIncomingStunIndication(stunPacket, rinfo)
      break
    default:
      var errorMsg = "don't know how to process incoming STUN message -- dropping it on the floor"
      this._log.error(errorMsg)
      throw new Error(errorMsg)
  }
}

// Incoming STUN reply
StunComm.prototype.onIncomingStunResponse = function (stunPacket) {
  // this is a stun reply
  var onResponseCallback = this._responseCallbacks[stunPacket.tid]
  if (onResponseCallback) {
    onResponseCallback(stunPacket)
    delete this._responseCallbacks[stunPacket.tid]
  } else {
    var errorMsg = 'no handler available to process response with tid ' + stunPacket.tid
    this._log.error(errorMsg)
    throw new Error(errorMsg)
  }
}

// Incoming STUN indication
StunComm.prototype.onIncomingStunIndication = function (stunPacket, rinfo) {
  this.emit('indication', stunPacket, rinfo)
}

// Error handler
StunComm.prototype.onFailure = function () {
  var self = this
  return function (error) {
    var errorMsg = 'client error: ' + error
    self._log.error(errorMsg)
    throw new Error(errorMsg)
  }
}

module.exports = StunComm
