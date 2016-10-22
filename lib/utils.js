'use strict'

var EventEmitter = require('events').EventEmitter

var mixinEventEmitterErrorFunction = function (object) {
  // verify attrs
  if (object === undefined) {
    throw new Error('object is undefined -- cannot execute mixinEventEmitterErrorFunction')
  }
  if (!(object instanceof EventEmitter)) {
    throw new Error('object is not an EventEmitter -- cannot execute mixinEventEmitterErrorFunction')
  }
  // assign _error function
  object._error = function (error, callback) {
    // verify if error is defined
    if (error === undefined) {
      throw new Error('error is undefined -- cannot execute _error')
    }
    // execute callback (such as onFailure handler)
    if (callback !== undefined) {
      callback(error)
      return
    }
    // if error listener(s) registered, then throw error event
    if (object.listeners('error').length > 0) {
      object.emit('error', error)
      return
    }
    // else throw exception
    throw new Error(error)
  }
}

module.exports.mixinEventEmitterErrorFunction = mixinEventEmitterErrorFunction
