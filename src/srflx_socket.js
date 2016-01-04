'use strict'

var inherits = require('util').inherits
var Q = require('q')
var winston = require('winston')

var Attributes = require('./attributes')
var Packet = require('./packet')
var StunSocket = require('./stun_socket')

// Constructor
var SrflxSocket = function (stunHost, stunPort, udpSocket) {
  StunSocket.call(this, stunHost, stunPort, udpSocket)
}

// Inherit from StunSocket
inherits(SrflxSocket, StunSocket)

/** StunSocket operations */

// Bind request
SrflxSocket.prototype.bindP = function () {
  return this.sendBindRequestP()
    .then(function (bindReply) {
      var errorCode = bindReply.getAttribute(Attributes.ERROR_CODE)
      // check if the reply includes an error code attr
      if (errorCode) {
        throw new Error('[stun-js] bind error: ' + errorCode.reason)
      }
      var mappedAddressAttr = bindReply.getAttribute(Attributes.XOR_MAPPED_ADDRESS)
      if (!mappedAddressAttr) {
        mappedAddressAttr = bindReply.getAttribute(Attributes.MAPPED_ADDRESS)
      }
      var mappedAddress = {
        address: mappedAddressAttr.address,
        port: mappedAddressAttr.port
      }
      return Q.fcall(function () {
        return mappedAddress
      })
    })
}

SrflxSocket.prototype.bind = function (onSuccess, onFailure) {
  if (onSuccess === undefined || onFailure === undefined) {
    var error = '[stun-js] bind callback handlers are undefined'
    winston.error(error)
    throw new Error(error)
  }
  this.bindP()
    .then(function (result) {
      onSuccess(result)
    })
    .catch(function (error) {
      onFailure(error)
    })
}

/** Message transmission */

// Send STUN bind request
SrflxSocket.prototype.sendBindRequestP = function () {
  winston.debug('[stun-js] send bind request (using promises)')
  var message = composeBindRequest()
  return this.sendStunRequestP(message)
}

SrflxSocket.prototype.sendBindRequest = function (onSuccess, onFailure) {
  winston.debug('[stun-js] send bind request')
  if (onSuccess === undefined || onFailure === undefined) {
    var error = '[stun-js] send bind request callback handlers are undefined'
    winston.error(error)
    throw new Error(error)
  }
  this.sendBindRequestP()
    .then(function (reply) {
      onSuccess(reply)
    })
    .catch(function (error) {
      onFailure(error)
    })
}

// Send STUN bind indication
SrflxSocket.prototype.sendBindIndicationP = function () {
  winston.debug('[stun-js] send bind indication (using promises)')
  var message = composeBindIndication()
  return this.sendStunIndicationP(message)
}

SrflxSocket.prototype.sendBindIndication = function (onSuccess, onFailure) {
  winston.debug('[stun-js] send bind indication')
  if (onSuccess === undefined || onFailure === undefined) {
    var error = '[stun-js] send bind indication callback handlers are undefined'
    winston.error(error)
    throw new Error(error)
  }
  this.sendBindIndicationP()
    .then(function (reply) {
      onSuccess(reply)
    })
    .catch(function (error) {
      onFailure(error)
    })
}

/** Message composition */

// Create bind request message
function composeBindRequest () {
  // create packet
  var packet = new Packet(Packet.METHOD.BINDING, Packet.TYPE.REQUEST)
  // encode packet
  var message = packet.encode()
  return message
}

// Create bind request message
function composeBindIndication () {
  // create packet
  var packet = new Packet(Packet.METHOD.BINDING, Packet.TYPE.INDICATION)
  // encode packet
  var message = packet.encode()
  return message
}

module.exports = SrflxSocket
