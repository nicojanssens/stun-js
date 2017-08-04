const Attributes = require('./lib/attributes');
const Packet = require('./lib/packet');
const StunClient = require('./lib/stun_client');

const address = require('./lib/attributes/address');
const padding = require('./lib/attributes/padding');
const transports = require('./lib/transports');

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
