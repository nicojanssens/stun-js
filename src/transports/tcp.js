'use strict'

var net = require('net')
var Q = require('q')
var winston = require('winston')

function TcpWrapper(host, port) {
  this._host = host
  this._port = port
}

TcpWrapper.prototype.init = function () {
  this._client = net.createConnection(this._port, this._host)
  this._client.on('error', this._onError())
  this._client.on('data', this._onMessage())
}

TcpWrapper.prototype.send = function (bytes, onSuccess, onFailure) {
  if (onSuccess === undefined || onFailure === undefined) {
    var error = '[stun-js] tcp send bytes callback handlers are undefined'
    winston.error(error)
    throw new Error(error)
  }
  this._client.write(bytes, 'binary', onSuccess)
}

TcpWrapper.prototype.sendP = function (bytes) {
  var deferred = Q.defer()
  var self = this
  this.send(
    bytes,
    function() { // on success
      deferred.resolve()
    },
    function(error) {
      var errorMsg = '[stun-js] tcp wrapper could not send bytes to ' + self._host + ':' + self._port + '. ' + error
      winston.error(errorMsg)
      deferred.reject(errorMsg)
    }
  )
  return deferred.promise
}

TcpWrapper.prototype.release = function () {
  this._client.end()
}

TcpWrapper.prototype.onMessage = function(callback) {
  this._onMessage = callback
}

TcpWrapper.prototype.onError = function(callback) {
  this._onError = callback
}

module.exports = TcpWrapper
