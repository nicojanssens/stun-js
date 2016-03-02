'use strict'

var dgram = require('dgram')
var Q = require('q')

var debug = require('debug')
var errorLog = debug('stun-js:transports:error')

function UdpWrapper (socket) {
  this._socket = (socket === undefined) ? dgram.createSocket('udp4') : socket
}

UdpWrapper.prototype.init = function (host, port) {
  this._host = host
  this._port = port
  // store original message and error listeners, if any
  this._messageListeners = this._socket.listeners('message')
  this._errorListeners = this._socket.listeners('error')
  // temp remove these listeners ...
  var self = this
  this._messageListeners.forEach(function (callback) {
    self._socket.removeListener('message', callback)
  })
  this._errorListeners.forEach(function (callback) {
    self._socket.removeListener('error', callback)
  })
  // ... and put temp handlers in place
  this._socket.on('message', this._onMessage)
  this._socket.on('error', this._onError)
}

UdpWrapper.prototype.send = function (bytes, onSuccess, onFailure) {
  if (onSuccess === undefined || onFailure === undefined) {
    var error = 'debugLogudp send bytes callback handlers are undefined'
    errorLog(error)
    throw new Error(error)
  }
  this._socket.send(bytes, 0, bytes.length, this._port, this._host, function (error) {
    if (error) {
      onFailure(error)
      return
    }
    onSuccess()
  })
}

UdpWrapper.prototype.sendP = function (bytes) {
  var deferred = Q.defer()
  var self = this
  this.send(
    bytes,
    function () { // on success
      deferred.resolve()
    },
    function (error) {
      var errorMsg = 'debugLogudp wrapper could not send bytes to ' + self._host + ':' + self._port + '. ' + error
      errorLog(errorMsg)
      deferred.reject(errorMsg)
    }
  )
  return deferred.promise
}

UdpWrapper.prototype.release = function () {
  var self = this
  // remove temp listeners
  this._socket.listeners('message').forEach(function (callback) {
    self._socket.removeListener('message', callback)
  })
  this._socket.listeners('error').forEach(function (callback) {
    self._socket.removeListener('error', callback)
  })
  // restore the original listeners
  this._messageListeners.forEach(function (callback) {
    self._socket.on('message', callback)
  })
  this._errorListeners.forEach(function (callback) {
    self._socket.on('error', callback)
  })
  // and remove refs to these original listeners
  this._messageListeners = this._errorListeners = []
  // finally drop ref to this socket
  this._socket = null
}

UdpWrapper.prototype.onMessage = function (callback) {
  this._onMessage = callback
}

UdpWrapper.prototype.onError = function (callback) {
  this._onError = callback
}

module.exports = UdpWrapper
