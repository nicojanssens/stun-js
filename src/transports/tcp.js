'use strict'

var net = require('net')
var Q = require('q')
var winston = require('winston')
var winstonWrapper = require('winston-meta-wrapper')

function TcpWrapper () {
  // logging
  this._log = winstonWrapper(winston)
  this._log.addMeta({
    module: 'stun-js:transports:tcp'
  })
}

TcpWrapper.prototype.init = function (host, port) {
  // init
  var self = this
  this._host = host
  this._port = port
  this._client = net.createConnection(this._port, this._host)
  this._client.on('error', this._onError)
  this._client.on('data', function (bytes) {
    self._log.debug('incoming data: ' + bytes.length + ' bytes')
    var rinfo = {}
    rinfo.address = self._host
    rinfo.port = parseInt(self._port, 10)
    rinfo.family = net.isIPv4(self._host) ? 'IPv4' : 'IPv6'
    rinfo.size = bytes.length
    self._onData(bytes, rinfo, false)
  })
  // localport represents connection
  this._log.addMeta({
    conn: this._client.localPort
  })

}

TcpWrapper.prototype.send = function (bytes, onSuccess, onFailure) {
  this._log.debug('outgoing data: ' + bytes.length + ' bytes')
  if (onSuccess === undefined || onFailure === undefined) {
    var errorMsg = 'tcp send bytes callback handlers are undefined'
    this._log.error(errorMsg)
    throw new Error(errorMsg)
  }
  var self = this
  var flushed = this._client.write(bytes, 'binary', function () {
    self._log.debug('message sent')
  })
  if (!flushed) {
    this._log.debug('high water -- buffer size = ' + this._client.bufferSize)
    this._client.once('drain', function () {
      self._log.debug('drained -- buffer size = ' + self._client.bufferSize)
      onSuccess()
    })
  } else {
    onSuccess()
  }
}

TcpWrapper.prototype.sendP = function (bytes) {
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

TcpWrapper.prototype.close = function (done) {
  this._client.once('close', function () {
    if (done) {
      done()
    }
  })
  this._client.destroy()
}

TcpWrapper.prototype.closeP = function () {
  var deferred = Q.defer()
  this.close(
    function () { // on success
      deferred.resolve()
    }
  )
  return deferred.promise
}

TcpWrapper.prototype.onData = function (callback) {
  this._onData = callback
}

TcpWrapper.prototype.onError = function (callback) {
  this._onError = callback
}

module.exports = TcpWrapper
