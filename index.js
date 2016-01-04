'use strict'

var Attributes = require('./src/attributes')
var Packet = require('./src/packet')
var SrflxSocket = require('./src/srflx_socket')
var StunSocket = require('./src/stun_socket')

var address = require('./src/attributes/address')
var padding = require('./src/attributes/padding')

module.exports = function createSocket (address, port, udpSocket) {
  return new SrflxSocket(address, port, udpSocket)
}

// STUN components
module.exports.Attributes = Attributes
module.exports.Packet = Packet
module.exports.SrflxSocket = SrflxSocket
module.exports.StunSocket = StunSocket

// STUN utils
module.exports.address = address
module.exports.padding = padding
