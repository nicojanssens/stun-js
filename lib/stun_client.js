'use strict'

var Attributes = require('./attributes')
var inherits = require('util').inherits
var Packet = require('./packet')
var Q = require('q')
var StunComm = require('./stun_comm')
var winston = require('winston-debug')
var winstonWrapper = require('winston-meta-wrapper')

// Constructor
var StunClient = function (stunHost, stunPort, transport) {
  // logging
  this._log = winstonWrapper(winston)
  this._log.addMeta({
    module: 'stun:client'
  })
  // inheritance
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
    var errorMsg = 'bind callback handlers are undefined'
    this._log.error(errorMsg)
    throw new Error(errorMsg)
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
  this._log.debug('send bind request (using promises)')
  var message = composeBindRequest()
  return this.sendStunRequestP(message)
}

StunClient.prototype.sendBindRequest = function (onSuccess, onFailure) {
  this._log.debug('send bind request')
  if (onSuccess === undefined || onFailure === undefined) {
    var errorMsg = 'send bind request callback handlers are undefined'
    this._log.error(errorMsg)
    throw new Error(errorMsg)
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
  this._log.debug('send bind indication (using promises)')
  var message = composeBindIndication()
  return this.sendStunIndicationP(message)
}

StunClient.prototype.sendBindIndication = function (onSuccess, onFailure) {
  this._log.debug('send bind indication')
  if (onSuccess === undefined || onFailure === undefined) {
    var errorMsg = 'send bind indication callback handlers are undefined'
    this._log.debug(errorMsg)
    throw new Error(errorMsg)
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
