'use strict'

var debug = require('debug')

var debugLog = debug('stun-js:attributes')

var UnknownAttributesAttr = function (value) {
  this.value = value
  this.type = 0x000A
  debugLog('unknown attributes attr: ' + JSON.stringify(this.value))
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
