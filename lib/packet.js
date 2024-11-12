const Attributes = require('./attributes');
const winston = require('winston-debug');
const winstonWrapper = require('winston-meta-wrapper');

const log = winstonWrapper(winston);
log.addMeta({
  module: 'stun:packet',
});

// utils
const containsFlag = (number, flag) => (
  (number & flag) === flag
);

const containsValue = (object, value) => {
  let result = false;
  Object.keys(object).forEach((key) => {
    if (object[key] === value) {
      result = true;
    }
  });
  return result;
};

// packet class
class Packet {
  constructor(method, type, attrs) {
    // logging
    this.log = winstonWrapper(winston);
    this.log.addMeta({
      module: 'stun:packet',
    });
    // assertions
    if (!containsValue(Packet.METHOD, method)) {
      const methodError = 'invalid packet method attribute';
      this.log.error(methodError);
      throw new Error(methodError);
    }
    if (!containsValue(Packet.TYPE, type)) {
      const typeError = 'invalid packet type attribute';
      this.log.error(typeError);
      throw new Error(typeError);
    }
    // init
    this.method = method;
    this.type = type;
    this.attrs = attrs || new Attributes();
    this.tid = this.getTransactionId();
  }

  // encode packet
  encode() {
    const attrsBuffer = this.attrs.encode(Packet.MAGIC_COOKIE, this.tid);
    let attrsLength = attrsBuffer.length;
    // check if we need to include a message integrity attribute
    const messageIntegrity = this.getAttribute(Attributes.MESSAGE_INTEGRITY);
    if (messageIntegrity) {
      attrsLength += 24; // size of the message-integrity attribute
    }
    // encode header bytes
    const headerBuffer = this.encodeHeader(attrsLength);
    // create packet bytes
    let packetBuffer = Buffer.concat([headerBuffer, attrsBuffer]);
    // append message integrity attribute if requested
    if (messageIntegrity) {
      const messageIntegrityBuffer = messageIntegrity.encode(packetBuffer);
      packetBuffer = Buffer.concat([packetBuffer, messageIntegrityBuffer]);
    }
    return packetBuffer;
  }

  // get attribute
  getAttribute(type) {
    return this.attrs.get(type);
  }

  // encode packet header
  encodeHeader(length) {
    const type = this.method | this.type;
    const encodedHeader = Buffer.alloc(Packet.HEADER_LENGTH);
    encodedHeader.writeUInt16BE((type & 0x3fff), 0);
    encodedHeader.writeUInt16BE(length, 2);
    encodedHeader.writeUInt32BE(Packet.MAGIC_COOKIE, 4);
    encodedHeader.writeUInt32BE(0, 8);
    encodedHeader.writeUInt32BE(0, 12);
    encodedHeader.writeUInt32BE(this.tid, 16);
    return encodedHeader;
  }

  // generate tansaction ID
  // eslint-disable-next-line class-methods-use-this
  getTransactionId() {
    return Math.random() * Packet.TID_MAX;
  }
}

// packet header length
Packet.HEADER_LENGTH = 20;
// STUN magic cookie
Packet.MAGIC_COOKIE = 0x2112A442; // fixed
// max transaction ID (32bit)
Packet.TID_MAX = Math.pow(2, 32); // eslint-disable-line no-restricted-properties
// message types
Packet.TYPE = {
  REQUEST: 0x0000,
  INDICATION: 0x0010,
  SUCCESS_RESPONSE: 0x0100,
  ERROR_RESPONSE: 0x0110,
};
// STUN method
Packet.METHOD = {};
Packet.METHOD.BINDING = 0x0001;

// decode packet
Packet.decode = (bytes, isFrame) => {
  // check if packet starts with 0b00
  if (!Packet.isStunPacket(bytes)) {
    log.debug('this is not a STUN packet');
    return;
  }
  // check if buffer contains enough bytes to parse header
  if (bytes.length < Packet.HEADER_LENGTH) {
    log.debug('not enough bytes to parse STUN header, giving up');
    return;
  }
  // parse header
  const headerBytes = bytes.slice(0, Packet.HEADER_LENGTH);
  const header = Packet.decodeHeader(headerBytes);
  // check magic cookie
  if (header.magic !== Packet.MAGIC_COOKIE) {
    const incorrectMagicCookieError = 'magic cookie field has incorrect value';
    log.error(incorrectMagicCookieError);
    throw new Error(incorrectMagicCookieError);
  }
  // check if length attribute is valid
  if (header.length % 4 !== 0) {
    log.debug('attributes are not padded to a multiple of 4 bytes, giving up');
    return;
  }
  // check if buffer contains enough bytes to parse Attributes
  if (bytes.length < Packet.HEADER_LENGTH + header.length) {
    log.debug('not enough bytes to parse attributes, giving up');
    return;
  }
  const attrsBytes = bytes.slice(Packet.HEADER_LENGTH, Packet.HEADER_LENGTH + header.length);
  const attrs = Attributes.decode(attrsBytes, headerBytes);

  const packet = new Packet(header.method, header.type, attrs);
  packet.tid = header.tid;

  const result = {};
  result.packet = packet;
  result.remainingBytes = bytes.slice(Packet.HEADER_LENGTH + header.length, bytes.length);
  // do we expect remaining bytes?
  if (isFrame && result.remainingBytes.length !== 0) {
    const errorMsg = 'not expecting remaining bytes after processing full frame packet';
    log.error(errorMsg);
    throw new Error(errorMsg);
  }
  // done
  return result;
};

// decode packet header
Packet.decodeHeader = (bytes) => {
  const header = {};
  const methodType = bytes.readUInt16BE(0);
  header.length = bytes.readUInt16BE(2);
  header.magic = bytes.readUInt32BE(4);
  header.tid = bytes.readUInt32BE(16);
  header.type = (methodType & 0x0110);
  header.method = (methodType & 0xFEEF);
  return header;
};

// check if this is a STUN packet (starts with 0b00)
Packet.isStunPacket = (bytes) => {
  const block = bytes.readUInt8(0);
  const bit1 = containsFlag(block, 0x80);
  const bit2 = containsFlag(block, 0x40);
  return (!bit1 && !bit2);
};

module.exports = Packet;
