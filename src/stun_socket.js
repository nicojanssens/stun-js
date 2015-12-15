var dgram = require('dgram')
var events = require('events')
var util = require('util')
var Q = require('q')
var winston = require('winston')

// Init socket object
var StunSocket = function (stunHost, stunPort) {
  if (stunPort === undefined || stunHost === undefined) {
    var error = '[libstun] invalid socket params'
    winston.error(error)
    throw new Error(error)
  }
  this._stunPort = stunPort
  this._stunHost = stunHost

  this._responseCallbacks = {}

  events.EventEmitter.call(this)

  var socket = dgram.createSocket('udp4')
  this._socket = socket
  socket.on('message', this.onIncomingMessage())
  socket.on('error', this.onFailure())
}

// Inherit EventEmitter
util.inherits(StunSocket, events.EventEmitter)

// Open socket
StunSocket.prototype.listen = function (args, onSuccess, onFailure) {
  args = args | {}
  if (onSuccess === undefined || onFailure === undefined) {
    var error = '[libstun] listen callback handlers are undefined'
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

StunSocket.prototype.listenP = function (args) {
  var deferred = Q.defer()
  args = args | {}
  var self = this
  this._socket.bind(args.address, args.port, function () {
    var listeningAddress = self._socket.address()
    winston.debug('[libstun] socket listening ' + listeningAddress.address + ':' + listeningAddress.port)
    deferred.resolve(listeningAddress)
  })
  return deferred.promise
}

// Close socket
StunSocket.prototype.close = function () {
  this._socket.close()
}

/** UDP communication */

// Send STUN request
StunSocket.prototype.sendStunRequest = function (message, onSuccess, onFailure) {
  this.sendStunRequestP(message)
    .then(function (result) {
      onSuccess(result)
    })
    .catch(function (error) {
      onFailure(error)
    })
}

StunSocket.prototype.sendStunRequestP = function (message) {
  var deferred = Q.defer()
  // get tid
  var tid = message.readUInt32BE(16)
  // store response handler for this tid
  var onResponse = function (stunPacket) {
    deferred.resolve(stunPacket)
  }
  this._responseCallbacks[tid] = onResponse
  // send message
  this.send(message, this._stunPort, this._stunHost, function (error) {
    // and complain if something went wrong
    if (error) {
      deferred.reject(error)
    }
  })
  return deferred.promise
}

// Send STUN indication
StunSocket.prototype.sendStunIndication = function (message, onSuccess, onFailure) {
  this.sendStunIndicationP(message)
    .then(function (result) {
      onSuccess(result)
    })
    .catch(function (error) {
      onFailure(error)
    })
}

StunSocket.prototype.sendStunIndicationP = function (message) {
  var deferred = Q.defer()
  this.send(message, this._stunPort, this._stunHost, function (error) {
    if (error) {
      deferred.reject(error)
    } else {
      deferred.resolve()
    }
  })
  return deferred.promise
}

StunSocket.prototype.send = function (message, port, host, cb) {
  this._socket.send(message, 0, message.length, port, host, cb)
}

// Incoming message handler
StunSocket.prototype.onIncomingMessage = function () {
  throw new Error('Subclass must implement onIncomingMessage')
}

// Incoming STUN message handler
StunSocket.prototype.onIncomingStunMessage = function (stunPacket) {
  // this is a stun reply
  var onResponse = this._responseCallbacks[stunPacket.tid]
  if (onResponse) {
    onResponse(stunPacket)
    delete this._responseCallbacks[stunPacket.tid]
  }
}

// Error handler
StunSocket.prototype.onFailure = function () {
  return function (error) {
    var errorMsg = '[libstun] socket error: ' + error
    winston.error(errorMsg)
    throw new Error(errorMsg)
  }
}

module.exports = StunSocket
