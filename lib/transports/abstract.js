'use strict'

var events = require('events')
var myUtils = require('../utils')
var Q = require('q')
var util = require('util')
var winston = require('winston-debug')
var winstonWrapper = require('winston-meta-wrapper')

function AbstractTransport () {
  // logging
  this._log = winstonWrapper(winston)
  this._log.addMeta({
    module: 'stun:transports'
  })
  // event emitter
  events.EventEmitter.call(this)
  // register _error handler
  myUtils.mixinEventEmitterErrorFunction(this)
}

// Inherit EventEmitter
util.inherits(AbstractTransport, events.EventEmitter)

AbstractTransport.prototype.isReliable = function () {
  var errorMsg = 'AbstractTransport.isReliable function not implemented'
  this._log.error(errorMsg)
  this._error(errorMsg)
}

AbstractTransport.prototype.getTimeoutDelay = function () {
  var errorMsg = 'AbstractTransport.getTimeoutDelay function not implemented'
  this._log.error(errorMsg)
  this._error(errorMsg)
}

AbstractTransport.prototype.send = function (bytes, onSuccess, onFailure) {
  var errorMsg = 'AbstractTransport.send function not implemented'
  this._log.error(errorMsg)
  this._error(errorMsg)
}

AbstractTransport.prototype.sendP = function (bytes) {
  var deferred = Q.defer()
  var self = this
  this.send(
    bytes,
    function () { // on success
      deferred.resolve()
    },
    function (error) {
      var errorMsg = 'tcp wrapper could not send bytes to ' + self._host + ':' + self._port + '. ' + error
      self._log.error(errorMsg)
      deferred.reject(errorMsg)
    }
  )
  return deferred.promise
}

AbstractTransport.prototype.close = function (callback) {
  var errorMsg = 'AbstractTransport.close function not implemented'
  this._log.error(errorMsg)
  this._error(errorMsg)
}

AbstractTransport.prototype.closeP = function () {
  var deferred = Q.defer()
  this.close(
    function () { // on success
      deferred.resolve()
    }
  )
  return deferred.promise
}

module.exports = AbstractTransport
