'use strict'

var debugLib = require('debug')
var debugLog = debugLib('udp-hole-puncher')
var errorLog = debugLib('udp-hole-puncher:error')

function debug (message) {
  debugLog.log(message)
}

function info (message) {
  debugLog.log(message)
}

function error (message) {
  errorLog.log(message)
}

module.exports.debug = debug
module.exports.error = error
module.exports.info = info
