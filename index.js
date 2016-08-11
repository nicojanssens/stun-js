'use strict'

var Attributes = require('./lib/attributes')
var Packet = require('./lib/packet')
var StunClient = require('./lib/stun_client')

var address = require('./lib/attributes/address')
var padding = require('./lib/attributes/padding')
var transports = require('./lib/transports')

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
