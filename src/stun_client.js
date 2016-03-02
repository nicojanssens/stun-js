'use strict'

var inherits = require('util').inherits
var Q = require('q')

var debug = require('debug')
var debugLog = debug('stun-js')
var errorLog = debug('stun-js:error')

var Attributes = require('./attributes')
var Packet = require('./packet')
var StunComm = require('./stun_comm')

// Constructor
var StunClient = function (stunHost, stunPort, transport) {
  StunComm.call(this, stunHost, stunPort, transport)
}

// Inherit from StunComm
inherits(StunClient, StunComm)

/** StunComm operations */

// Bind request
StunClient.prototype.bindP = function () {
  return this.sendBindRequestP()
    .then(function (bindReply) {
      var errorCode = bindReply.getAttribute(Attributes.ERROR_CODE)
      // check if the reply includes an error code attr
      if (errorCode) {
        throw new Error('bind error: ' + errorCode.reason)
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

StunClient.prototype.bind = function (onSuccess, onFailure) {
  if (onSuccess === undefined || onFailure === undefined) {
    var error = 'bind callback handlers are undefined'
    errorLog(error)
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
StunClient.prototype.sendBindRequestP = function () {
  debugLog('send bind request (using promises)')
  var message = composeBindRequest()
  return this.sendStunRequestP(message)
}

StunClient.prototype.sendBindRequest = function (onSuccess, onFailure) {
  debugLog('send bind request')
  if (onSuccess === undefined || onFailure === undefined) {
    var error = 'send bind request callback handlers are undefined'
    errorLog(error)
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
StunClient.prototype.sendBindIndicationP = function () {
  debugLog('send bind indication (using promises)')
  var message = composeBindIndication()
  return this.sendStunIndicationP(message)
}

StunClient.prototype.sendBindIndication = function (onSuccess, onFailure) {
  debugLog('send bind indication')
  if (onSuccess === undefined || onFailure === undefined) {
    var error = 'send bind indication callback handlers are undefined'
    errorLog(error)
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

module.exports = StunClient
