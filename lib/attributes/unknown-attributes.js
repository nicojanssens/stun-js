'use strict'

var winston = require('winston-debug')
var winstonWrapper = require('winston-meta-wrapper')

var UnknownAttributesAttr = function (value) {
  // logging
  this._log = winstonWrapper(winston)
  this._log.addMeta({
    module: 'stun:attributes'
  })
  // init
  this.value = value
  this.type = 0x000A
  // done
  this._log.debug('unknown attributes attr: ' + JSON.stringify(this.value))
}

UnknownAttributesAttr.prototype.encode = function () {
  throw new Error('unknown-attributes.encode not implemented yet')
}

UnknownAttributesAttr.decode = function (attrBytes) {
  var unknownAttrs = []
  var offset = 0

  while (offset < attrBytes.length) {
    unknownAttrs.push(attrBytes.readUInt16BE(offset).toString(16))
    offset += 2
  }

  return new UnknownAttributesAttr(unknownAttrs)
}

module.exports = UnknownAttributesAttr
