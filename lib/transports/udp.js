'use strict'

var AbstractTransport = require('./abstract')
var dgram = require('dgram')
var util = require('util')
var winston = require('winston-debug')
var winstonWrapper = require('winston-meta-wrapper')

function UdpWrapper (socket) {
  AbstractTransport.call(this)
  // create dgram if socker is undefined
  this._socket = (socket === undefined) ? dgram.createSocket('udp4') : socket
  this._externalSocket = (socket !== undefined)
  // logging
  this._log = winstonWrapper(winston)
  this._log.addMeta({
    module: 'stun:transports:udp'
  })
}

// Inherit from abstract transport
util.inherits(UdpWrapper, AbstractTransport)

UdpWrapper.prototype.init = function (host, port, onReady, onData, onError) {
  // init
  this._host = host
  this._port = port
  var self = this
  // if socket is defined/used externally
  if (this._externalSocket) {
    // store original message and error listeners, if any
    this._messageListeners = this._socket.listeners('message')
    this._errorListeners = this._socket.listeners('error')
    // temp remove these listeners ...
    this._messageListeners.forEach(function (callback) {
      self._socket.removeListener('message', callback)
    })
    this._errorListeners.forEach(function (callback) {
      self._socket.removeListener('error', callback)
    })
  }
  // register our own handlers
  this._socket.on('message', function (message, rinfo) {
    onData(message, rinfo, true)
  })
  this._socket.on('error', onError)
  onReady()
}

UdpWrapper.prototype.isReliable = function () {
  return false
}

UdpWrapper.prototype.getTimeoutDelay = function () {
  return 500
}

UdpWrapper.prototype.send = function (bytes, onSuccess, onFailure) {
  if (onSuccess === undefined || onFailure === undefined) {
    var errorMsg = 'udp send bytes callback handlers are undefined'
    this._log.error(errorMsg)
    throw new Error(errorMsg)
  }
  this._socket.send(bytes, 0, bytes.length, this._port, this._host, function (error) {
    if (error) {
      onFailure(error)
      return
    }
    onSuccess()
  })
}

UdpWrapper.prototype.close = function (done) {
  var self = this
  // if socket is defined/used externally
  if (this._externalSocket) {
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
    // fire callback
    if (done) {
      done()
    }
  } else {
    // close socket
    this._socket.close(function () {
      // fire callback
      if (done) {
        done()
      }
    })
  }
}

module.exports = UdpWrapper
