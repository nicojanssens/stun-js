'use strict'

var debugLog = require('debug')('stun')
var errorLog = require('debug')('stun:error')

function log (message) {
  debugLog(message)
}

function debug (message) {
  debugLog(message)
}

function info (message) {
  debugLog(message)
}

function error (message) {
  errorLog(message)
}

module.exports.debug = debug
module.exports.error = error
module.exports.info = info
module.exports.log = log
