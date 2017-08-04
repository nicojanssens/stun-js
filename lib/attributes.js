const winston = require('winston-debug');
const winstonWrapper = require('winston-meta-wrapper');

const log = winstonWrapper(winston);
log.addMeta({
  module: 'stun:attributes',
});

// Attributes Class
class Attributes {
  constructor() {
    // init
    this.attrs = [];
    // logging
    this.log = winstonWrapper(winston);
    this.log.addMeta({
      module: 'stun:attributes',
    });
  }

  // Attributes.TYPES[Attributes.FINGERPRINT] = 'FINGERPRINT'

  add(attr) {
    if (typeof attr.encode !== 'function') {
      throw new Error(`attribute ${attr} does not contain required encoding function`);
    }
    this.attrs.push(attr);
  }

  get(type) {
    return this.attrs.find(attr => attr.type === type);
  }

  encode(magic, tid) {
    const attrBytesArray = [];
    this.attrs.forEach((attr) => {
      // magic & tid must be passed to create xor encoded addresses
      if (attr.encode.length === 2) {
        attrBytesArray.push(attr.encode(magic, tid));
        return;
      }
      // message integrity attr requires special treatment -- see packet.encode()
      if (attr.type === Attributes.MESSAGE_INTEGRITY) {
        return;
      }
      // all other attributes can be encoded without further ado
      attrBytesArray.push(attr.encode());
    });
    return Buffer.concat(attrBytesArray);
  }
}

// RFC 5389 (STUN) attributes
Attributes.AlternateServer = require('./attributes/alternate-server');
Attributes.ErrorCode = require('./attributes/error-code');
Attributes.MappedAddress = require('./attributes/mapped-address');
Attributes.MessageIntegrity = require('./attributes/message-integrity');
Attributes.Nonce = require('./attributes/nonce');
Attributes.Realm = require('./attributes/realm');
Attributes.Software = require('./attributes/software');
Attributes.UnknownAttributes = require('./attributes/unknown-attributes');
Attributes.Username = require('./attributes/username');
Attributes.XORMappedAddress = require('./attributes/xor-mapped-address');

// RFC 5389 (STUN) attributes
Attributes.MAPPED_ADDRESS = 0x0001;
Attributes.USERNAME = 0x0006;
Attributes.MESSAGE_INTEGRITY = 0x0008;
Attributes.ERROR_CODE = 0x0009;
Attributes.UNKNOWN_ATTRIBUTES = 0x000A;
Attributes.REALM = 0x0014;
Attributes.NONCE = 0x0015;
Attributes.XOR_MAPPED_ADDRESS = 0x0020;
Attributes.SOFTWARE = 0x8022;
Attributes.ALTERNATE_SERVER = 0x8023;
// Attributes.FINGERPRINT = 0x8028

Attributes.TYPES = {};
// RFC 5389 (STUN)
Attributes.TYPES[Attributes.MAPPED_ADDRESS] = Attributes.MappedAddress;
Attributes.TYPES[Attributes.USERNAME] = Attributes.Username;
Attributes.TYPES[Attributes.MESSAGE_INTEGRITY] = Attributes.MessageIntegrity;
Attributes.TYPES[Attributes.ERROR_CODE] = Attributes.ErrorCode;
Attributes.TYPES[Attributes.UNKNOWN_ATTRIBUTES] = Attributes.UnknownAttributes;
Attributes.TYPES[Attributes.REALM] = Attributes.Realm;
Attributes.TYPES[Attributes.NONCE] = Attributes.Nonce;
Attributes.TYPES[Attributes.XOR_MAPPED_ADDRESS] = Attributes.XORMappedAddress;
Attributes.TYPES[Attributes.SOFTWARE] = Attributes.Software;
Attributes.TYPES[Attributes.ALTERNATE_SERVER] = Attributes.AlternateServer;

Attributes.decode = (attrsBuffer, headerBuffer) => {
  let offset = 0;
  const attrs = new Attributes();

  while (offset < attrsBuffer.length) {
    const type = attrsBuffer.readUInt16BE(offset);
    offset += 2;

    const length = attrsBuffer.readUInt16BE(offset);
    const blockOut = length % 4;
    const padding = blockOut > 0 ? 4 - blockOut : 0;
    offset += 2;

    const attrBytes = attrsBuffer.slice(offset, offset + length);
    offset += length + padding;
    const decoder = Attributes.TYPES[type];
    if (decoder) {
      const attr = decoder.decode(attrBytes, headerBuffer);
      attrs.add(attr);
    } else {
      log.debug(`don't know how to process attribute ${type.toString(16)}. Ignoring ...`);
    }
  }

  return attrs;
};

module.exports = Attributes;
