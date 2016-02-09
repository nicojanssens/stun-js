'use strict'

var events = require('events')
var util = require('util')
var Q = require('q')
var winston = require('winston')

var Packet = require('./packet')
var UdpTransport = require('./transports/udp')

// Init client
var StunComm = function (stunHost, stunPort, transport) {
  if (stunPort === undefined || stunHost === undefined) {
    var error = '[stun-js] stun host and/or port are undefined'
    winston.error(error)
    throw new Error(error)
  }
  this._responseCallbacks = {}

  events.EventEmitter.call(this)

  this._transport = transport || new UdpTransport()
  this._transport.onMessage(this.onIncomingMessage())
  this._transport.onError(this.onFailure())
  this._transport.init(stunHost, stunPort)
}

// Inherit EventEmitter
util.inherits(StunComm, events.EventEmitter)

// Close client
StunComm.prototype.close = function () {
  winston.debug('[stun-js] closing client')
  this._transport.release()
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
    var error = '[stun-js] send stun indication callback handlers are undefined'
    winston.error(error)
    throw new Error(error)
  }
  this._transport.send(bytes, onSuccess, onFailure)
}

// Incoming message handler
StunComm.prototype.onIncomingMessage = function () {
  var self = this
  return function (bytes, rinfo) {
    winston.debug('[stun-js] receiving message from ' + JSON.stringify(rinfo))
    // this is a stun packet
    var stunPacket = Packet.decode(bytes)
    if (stunPacket) {
      switch (stunPacket.type) {
        case Packet.TYPE.SUCCESS_RESPONSE:
          self.onIncomingStunResponse(stunPacket, rinfo)
          break
        case Packet.TYPE.ERROR_RESPONSE:
          self.onIncomingStunResponse(stunPacket, rinfo)
          break
        case Packet.TYPE.INDICATION:
          self.onIncomingStunIndication(stunPacket, rinfo)
          break
        default:
          var errorMsg = "[stun-js] don't know how to process incoming STUN message -- dropping it on the floor"
          winston.error(errorMsg)
          throw new Error(errorMsg)
      }
    } else {
      self.onOtherIncomingMessage(bytes, rinfo)
    }
  }
}

// Incoming STUN reply
StunComm.prototype.onIncomingStunResponse = function (stunPacket, rinfo) {
  // this is a stun reply
  var onResponseCallback = this._responseCallbacks[stunPacket.tid]
  if (onResponseCallback) {
    onResponseCallback(stunPacket)
    delete this._responseCallbacks[stunPacket.tid]
  } else {
    var errorMsg = '[stun-js] no handler available to process response with tid ' + stunPacket.tid
    winston.error(errorMsg)
    throw new Error(errorMsg)
  }
}

// Incoming STUN indication
StunComm.prototype.onIncomingStunIndication = function (stunPacket, rinfo) {
  this.emit('indication', stunPacket, rinfo)
}

// Incoming message that is different from regular STUN packets
StunComm.prototype.onOtherIncomingMessage = function (bytes, rinfo) {
  this.emit('message', bytes, rinfo)
}

// Error handler
StunComm.prototype.onFailure = function () {
  return function (error) {
    var errorMsg = '[stun-js] client error: ' + error
    winston.error(errorMsg)
    throw new Error(errorMsg)
  }
}

module.exports = StunComm
