'use strict'

var events = require('events')
var util = require('util')
var Q = require('q')

var debug = require('debug')
var debugLog = debug('stun-js')
var errorLog = debug('stun-js:error')

var Packet = require('./packet')
var UdpTransport = require('./transports/udp')

// Init client
var StunComm = function (stunHost, stunPort, transport) {
  if (stunPort === undefined || stunHost === undefined) {
    var error = 'stun host and/or port are undefined'
    errorLog(error)
    throw new Error(error)
  }
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
  debugLog('closing client')
  this._transport.close(done)
}

StunComm.prototype.closeP = function () {
  debugLog('closing client')
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
    var error = 'send stun indication callback handlers are undefined'
    errorLog(error)
    throw new Error(error)
  }
  this._transport.send(bytes, onSuccess, onFailure)
}

// Incoming data handler
StunComm.prototype.onIncomingData = function () {
  var self = this
  return function (bytes, rinfo, isFrame) {
    debugLog('receiving data from ' + JSON.stringify(rinfo))
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
      debugLog('incoming STUN success response')
      this.onIncomingStunResponse(stunPacket)
      break
    case Packet.TYPE.ERROR_RESPONSE:
      debugLog('incoming STUN success response')
      this.onIncomingStunResponse(stunPacket)
      break
    case Packet.TYPE.INDICATION:
      debugLog('incoming STUN indication')
      this.onIncomingStunIndication(stunPacket, rinfo)
      break
    default:
      var errorMsg = "don't know how to process incoming STUN message -- dropping it on the floor"
      errorLog(errorMsg)
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
    errorLog(errorMsg)
    throw new Error(errorMsg)
  }
}

// Incoming STUN indication
StunComm.prototype.onIncomingStunIndication = function (stunPacket, rinfo) {
  this.emit('indication', stunPacket, rinfo)
}

// Error handler
StunComm.prototype.onFailure = function () {
  return function (error) {
    var errorMsg = 'client error: ' + error
    errorLog(errorMsg)
    throw new Error(errorMsg)
  }
}

module.exports = StunComm
