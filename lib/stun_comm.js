'use strict'

var Args = require('args-js')
var events = require('events')
var myUtils = require('./utils')
var Packet = require('./packet')
var Q = require('q')
var UdpTransport = require('./transports/udp')
var util = require('util')
var winston = require('winston-debug')
var winstonWrapper = require('winston-meta-wrapper')

var MAX_RETRANSMISSIONS = 5

// Create client
var StunComm = function () {
  // logging
  this._log = winstonWrapper(winston)
  this._log.addMeta({
    module: 'stun:client'
  })
  // event emitter
  events.EventEmitter.call(this)
  // parse args
  var functionArgs = new Args([
    { stunHost: Args.STRING | Args.Required },
    { stunPort: Args.INT | Args.Required },
    { transport: Args.OBJECT | Args.Optional }
  ], arguments)
  // init
  this._stunHost = functionArgs.stunHost
  this._stunPort = functionArgs.stunPort
  this._transport = functionArgs.transport
  if (this._transport === undefined) {
    this._transport = new UdpTransport()
  }
  this._unackedSendOperations = {}
  this._decoders = []
  this._decoders.push({
    decoder: Packet.decode,
    listener: this.dispatchStunPacket.bind(this)
  })
  this._availableBytes = new Buffer(0)
  // register _error handler
  myUtils.mixinEventEmitterErrorFunction(this)
}

// Inherit EventEmitter
util.inherits(StunComm, events.EventEmitter)

StunComm.prototype.init = function (onReady, onFailure) {
  var self = this
  this._transport.init(
    self._stunHost,
    self._stunPort,
    onReady,
    self.onIncomingData(),
    self.onError(onFailure)
  )
}

StunComm.prototype.initP = function () {
  var deferred = Q.defer()
  this.init(
    function () { // on success
      deferred.resolve()
    },
    function (error) {
      deferred.reject(error)
    }
  )
  return deferred.promise
}

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
  this._log.debug('sending stun request with TID ' + tid)
  // store response handlers for this tid
  if (this._unackedSendOperations[tid] === undefined) {
    this._unackedSendOperations[tid] = {
      onResponse: onResponse,
      onFailure: onFailure
    }
  }
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
  var self = this
  // when stun transport is unreliable
  if (!this._transport.isReliable()) {
    // set # of retransmissions if undefined
    if (this._unackedSendOperations[tid].remainingRetransmissionAttempts === undefined) {
      this._unackedSendOperations[tid].remainingRetransmissionAttempts = MAX_RETRANSMISSIONS
    }
    // start retransmission timer
    var timeout = setTimeout(
      function () {
        if (self._unackedSendOperations[tid].remainingRetransmissionAttempts === 0) {
          // stopping retransmission
          var errorMsg = 'giving up, no more retransmission attempts left'
          self._log.error(errorMsg)
          self._error(errorMsg, onFailure)
          delete self._unackedSendOperations[tid]
        } else {
          self._unackedSendOperations[tid].remainingRetransmissionAttempts--
          self.sendStunRequest(bytes, onResponse, onFailure)
        }
      },
      self._transport.getTimeoutDelay()
    )
    self._unackedSendOperations[tid].retransmissionTimeout = timeout
  }
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
  // iterate over registered decoders
  for (var i in this._decoders) {
    var decoder = this._decoders[i].decoder
    var listener = this._decoders[i].listener
    // execute decoder
    var decoding = decoder(this._availableBytes, isFrame)
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
      this._log.debug('incoming STUN success response with tid ' + stunPacket.tid)
      this.onIncomingStunResponse(stunPacket)
      break
    case Packet.TYPE.ERROR_RESPONSE:
      this._log.debug('incoming STUN error response with tid ' + stunPacket.tid)
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
  var sendOperation = this._unackedSendOperations[stunPacket.tid]
  if (sendOperation === undefined) {
    var noSendOperationFoundMessage = 'cannot find associated STUN request for TID ' + stunPacket.tid + ' -- ignoring request'
    this._log.error(noSendOperationFoundMessage)
    return
  }
  // stop retransmission timer (if present)
  var timeout = this._unackedSendOperations[stunPacket.tid].retransmissionTimeout
  if (timeout) {
    clearTimeout(timeout)
  }
  // this is a stun reply
  var onResponseCallback = this._unackedSendOperations[stunPacket.tid].onResponse
  if (onResponseCallback) {
    onResponseCallback(stunPacket)
    delete this._unackedSendOperations[stunPacket.tid]
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
StunComm.prototype.onError = function (callback) {
  var self = this
  return function (error) {
    var errorMsg = 'client error: ' + error
    self._log.error(errorMsg)
    self._error(new Error(errorMsg), callback)
  }
}

module.exports = StunComm
