'use strict'

var dgram = require('dgram')
var events = require('events')
var util = require('util')
var Q = require('q')
var winston = require('winston')

var Packet = require('./packet')

// Init socket object
var StunSocket = function (stunHost, stunPort, udpSocket) {
  if (stunPort === undefined || stunHost === undefined) {
    var error = '[stun-js] invalid socket params'
    winston.error(error)
    throw new Error(error)
  }
  this._stunPort = stunPort
  this._stunHost = stunHost

  this._responseCallbacks = {}

  events.EventEmitter.call(this)

  var socket = (udpSocket === undefined) ? dgram.createSocket('udp4') : udpSocket
  this._socket = socket
  socket.on('message', this.onIncomingMessage())
  socket.on('error', this.onFailure())
}

// Inherit EventEmitter
util.inherits(StunSocket, events.EventEmitter)

// Open socket
StunSocket.prototype.listenP = function (args) {
  var deferred = Q.defer()
  args = args | {}
  var self = this
  this._socket.bind(args.address, args.port, function () {
    var listeningAddress = self._socket.address()
    winston.debug('[stun-js] socket listening ' + listeningAddress.address + ':' + listeningAddress.port)
    deferred.resolve(listeningAddress)
  })
  return deferred.promise
}

StunSocket.prototype.listen = function (args, onSuccess, onFailure) {
  args = args | {}
  if (onSuccess === undefined || onFailure === undefined) {
    var error = '[stun-js] listen callback handlers are undefined'
    winston.error(error)
    throw new Error(error)
  }
  this.listenP(args)
    .then(function (result) {
      onSuccess(result)
    })
    .catch(function (error) {
      onFailure(error)
    })
}

// Close socket
StunSocket.prototype.close = function () {
  var listeningAddress = this._socket.address()
  winston.debug('[stun-js] closing socket ' + listeningAddress.address + ':' + listeningAddress.port)
  this._socket.close()
}

/** UDP communication */

// Send STUN request
StunSocket.prototype.sendStunRequestP = function (bytes) {
  var deferred = Q.defer()
  // get tid
  var tid = bytes.readUInt32BE(16)
  // store response handler for this tid
  var onResponse = function (stunPacket) {
    deferred.resolve(stunPacket)
  }
  this._responseCallbacks[tid] = onResponse
  // send bytes
  this.send(
    bytes,
    this._stunHost,
    this._stunPort,
    function () { // on success
      // do nothing
    },
    function (error) { // on failure
      deferred.reject(error)
    }
  )
  return deferred.promise
}

StunSocket.prototype.sendStunRequest = function (bytes, onSuccess, onFailure) {
  this.sendStunRequestP(bytes)
    .then(function (result) {
      onSuccess(result)
    })
    .catch(function (error) {
      onFailure(error)
    })
}

// Send STUN indication
StunSocket.prototype.sendStunIndicationP = function (bytes) {
  return this.sendP(bytes, this._stunHost, this._stunPort)
}

StunSocket.prototype.sendStunIndication = function (bytes, onSuccess, onFailure) {
  if (onSuccess === undefined || onFailure === undefined) {
    var error = '[stun-js] send stun indication callback handlers are undefined'
    winston.error(error)
    throw new Error(error)
  }
  this.sendStunIndicationP(bytes)
    .then(function (result) {
      onSuccess(result)
    })
    .catch(function (error) {
      onFailure(error)
    })
}

// Send bytes
StunSocket.prototype.sendP = function (bytes, host, port) {
  var deferred = Q.defer()
  this._socket.send(bytes, 0, bytes.length, port, host, function (error) {
    if (error) {
      var errorMsg = '[stun-js] could not send bytes to ' + host + ':' + port + '. ' + error
      winston.error(errorMsg)
      deferred.reject(errorMsg)
    } else {
      deferred.resolve()
    }
  })
  return deferred.promise
}

StunSocket.prototype.send = function (bytes, host, port, onSuccess, onFailure) {
  if (onSuccess === undefined || onFailure === undefined) {
    var error = '[stun-js] send bytes callback handlers are undefined'
    winston.error(error)
    throw new Error(error)
  }
  this.sendP(bytes, host, port)
    .then(function () {
      onSuccess()
    })
    .catch(function (error) {
      onFailure(error)
    })
}

// Incoming message handler
StunSocket.prototype.onIncomingMessage = function () {
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
StunSocket.prototype.onIncomingStunResponse = function (stunPacket, rinfo) {
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
StunSocket.prototype.onIncomingStunIndication = function (stunPacket, rinfo) {
  this.emit('indication', stunPacket, rinfo)
}

// Incoming message that is different from regular STUN packets
StunSocket.prototype.onOtherIncomingMessage = function (bytes, rinfo) {
  this.emit('message', bytes, rinfo)
}

// Error handler
StunSocket.prototype.onFailure = function () {
  return function (error) {
    var errorMsg = '[stun-js] socket error: ' + error
    winston.error(errorMsg)
    throw new Error(errorMsg)
  }
}

module.exports = StunSocket
