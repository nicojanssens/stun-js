'use strict'

var Attributes = require('./src/attributes')
var Packet = require('./src/packet')
var StunClient = require('./src/stun_client')

var address = require('./src/attributes/address')
var padding = require('./src/attributes/padding')
var transports = require('./src/transports')

module.exports = function createClient (address, port, transport) {
  return new StunClient(address, port, transport)
}

// STUN components
module.exports.Attributes = Attributes
module.exports.Packet = Packet
module.exports.StunClient = StunClient

// STUN utils
module.exports.address = address
module.exports.padding = padding
module.exports.transports = transports
