'use strict'

function TlsWrapper () {
  throw new Error('not implemented yet')
}

TlsWrapper.prototype.init = function (host, port) {
  throw new Error('not implemented yet')
}

TlsWrapper.prototype.send = function (bytes, onSuccess, onFailure) {
  throw new Error('not implemented yet')
}

TlsWrapper.prototype.sendP = function (bytes) {
  throw new Error('not implemented yet')
}

TlsWrapper.prototype.close = function () {
  throw new Error('not implemented yet')
}

TlsWrapper.prototype.closeP = function () {
  throw new Eroor('not implemented yet')
}

TlsWrapper.prototype.onData = function (callback) {
  throw new Error('not implemented yet')
}

TlsWrapper.prototype.onError = function (callback) {
  throw new Error('not implemented yet')
}

module.exports = TlsWrapper
