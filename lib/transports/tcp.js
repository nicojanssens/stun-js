'use strict'

var AbstractTransport = require('./abstract')
var net = require('net')
var util = require('util')
var winston = require('winston-debug')
var winstonWrapper = require('winston-meta-wrapper')

function TcpWrapper () {
  AbstractTransport.call(this)
  // logging
  this._log = winstonWrapper(winston)
  this._log.addMeta({
    module: 'stun:transports:tcp'
  })
}

// Inherit from abstract transport
util.inherits(TcpWrapper, AbstractTransport)

TcpWrapper.prototype.init = function (host, port) {
  // init
  var self = this
  this._host = host
  this._port = port
  this._client = net.createConnection(this._port, this._host)
  this._log.debug('created TCP connection with ' + this._host + ':' + this._port)
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
  this._client.on('connect', function () {
    // localport represents connection
    self._log.addMeta({
      conn: self._client.localPort
    })
  })
}

TcpWrapper.prototype.isReliable = function () {
  return true
}

TcpWrapper.prototype.getTimeoutDelay = function () {
  return 0
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

TcpWrapper.prototype.close = function (done) {
  this._client.once('close', function () {
    if (done) {
      done()
    }
  })
  this._client.destroy()
}

TcpWrapper.prototype.onData = function (callback) {
  this._onData = callback
}

TcpWrapper.prototype.onError = function (callback) {
  this._onError = callback
}

module.exports = TcpWrapper
