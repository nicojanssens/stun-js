'use strict'

var AbstractTransport = require('./abstract')
var merge = require('merge')
var net = require('net')
var util = require('util')
var winston = require('winston-debug')
var winstonWrapper = require('winston-meta-wrapper')

function TcpWrapper (args) {
  if (!(this instanceof TcpWrapper)) {
    return new TcpWrapper(args)
  }
  AbstractTransport.call(this)
  // init
  this._args = merge(Object.create(TcpWrapper.DEFAULTS), args)
  // logging
  this._log = winstonWrapper(winston)
  this._log.addMeta({
    module: 'stun:transports:tcp'
  })
}

// Inherit from abstract transport
util.inherits(TcpWrapper, AbstractTransport)

TcpWrapper.DEFAULTS = {
  connectTimeout: 100
}

TcpWrapper.prototype.init = function (host, port, onReady, onData, onError) {
  // init
  var self = this
  this._host = host
  this._port = port
  // create and store tcp socket
  var client = net.createConnection(this._port, this._host)
  this._client = client
  this._log.debug('creating TCP connection with ' + this._host + ':' + this._port)
  // add socket event handlers
  client.on('error', onError)
  client.on('data', function (bytes) {
    self._log.debug('incoming data: ' + bytes.length + ' bytes')
    var rinfo = {}
    rinfo.address = self._host
    rinfo.port = parseInt(self._port, 10)
    rinfo.family = net.isIPv4(self._host) ? 'IPv4' : 'IPv6'
    rinfo.size = bytes.length
    onData(bytes, rinfo, false)
  })
  client.on('connect', function () {
    // stop and remove timer
    clearTimeout(client._connectionTimeout)
    delete client._connectionTimeout
    // fire ready callback
    onReady()
    // localport represents connection
    self._log.addMeta({
      conn: self._client.localPort
    })
  })
  client.on('close', function () {
    self._log.debug('TCP connection closed')
  })
  // init connection timeout
  client._connectionTimeout = setTimeout(function () {
    self._log.error('connection timeout')
    onError('TCP connection timeout')
  }, this._args.connectTimeout)
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

module.exports = TcpWrapper
