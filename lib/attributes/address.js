const ip = require('ip');
const winston = require('winston-debug');
const winstonWrapper = require('winston-meta-wrapper');

const log = winstonWrapper(winston);
log.addMeta({
  module: 'stun:attributes',
});

const IPv4 = 0x01;
const IPv6 = 0x02;

const xor = (a, b) => {
  const data = [];
  let aCopy = a.slice(0);
  let bCopy = b.slice(0);

  if (bCopy.length > aCopy.length) {
    const tmp = aCopy;
    aCopy = bCopy;
    bCopy = tmp;
  }

  for (let i = 0, len = aCopy.length; i < len; i += 1) {
    data.push(aCopy[i] ^ bCopy[i]); // eslint-disable-line no-bitwise
  }

  return Buffer.from(data);
};

const encode = (address, port) => {
  // checks
  if (address === undefined || port === undefined) {
    const attrError = 'invalid address attribute';
    log.error(attrError);
    throw new Error(attrError);
  }
  if (!ip.isV4Format(address) && !ip.isV6Format(address)) {
    const hostError = 'invalid address host';
    log.error(hostError);
    throw new Error(hostError);
  }
  if (port < 0 || port > 65536) {
    const portError = 'invalid address port';
    log.error(portError);
    throw new Error(portError);
  }
  // create family type
  const familyByte = Buffer.alloc(1);
  if (ip.isV4Format(address)) {
    familyByte.writeUInt8(IPv4);
  } else {
    familyByte.writeUInt8(IPv6);
  }
  // create address bytes
  const addressBytes = ip.toBuffer(address);
  // create null byte
  const nullByte = Buffer.alloc(1);
  nullByte.writeUInt8(0, 0);
  // create port bytes
  const portBytes = Buffer.alloc(2);
  portBytes.writeUInt16BE(port, 0);
  // concat
  return Buffer.concat([nullByte, familyByte, portBytes, addressBytes]);
};

const encodeXor = (address, port, magic, tid) => {
  // checks
  if (address === undefined || port === undefined) {
    const attrError = 'invalid address attribute';
    log.error(attrError);
    throw new Error(attrError);
  }
  if (!ip.isV4Format(address) && !ip.isV6Format(address)) {
    const hostError = 'invalid address host';
    log.error(hostError);
    throw new Error(hostError);
  }
  if (port < 0 || port > 65536) {
    const portError = 'invalid address port';
    log.error(portError);
    throw new Error(portError);
  }
  if (magic === undefined || tid === undefined) {
    const keyError = 'invalid xor keys';
    log.error(keyError);
    throw new Error(keyError);
  }
  // magic and tid bytes -- needed for xor mapping
  const magicBytes = Buffer.alloc(4);
  magicBytes.writeUInt32BE(magic);
  const tidBytes = Buffer.alloc(12);
  tidBytes.writeUInt32BE(0);
  tidBytes.writeUInt32BE(0, 4);
  tidBytes.writeUInt32BE(tid, 8);
  // create family type
  const familyByte = Buffer.alloc(1);
  if (ip.isV4Format(address)) {
    familyByte.writeUInt8(IPv4);
  } else {
    familyByte.writeUInt8(IPv6);
  }
  // create xaddress bytes
  const addressBytes = ip.toBuffer(address);
  const xaddressBytes = xor(addressBytes, ip.isV4Format(address) ?
    magicBytes : Buffer.concat([magicBytes, tidBytes]));
  // create null byte
  const nullByte = Buffer.alloc(1);
  nullByte.writeUInt8(0, 0);
  // create xport bytes
  const portBytes = Buffer.alloc(2);
  portBytes.writeUInt16BE(port, 0);
  const xportBytes = xor(portBytes, magicBytes.slice(0, 2));
  // concat
  return Buffer.concat([nullByte, familyByte, xportBytes, xaddressBytes]);
};

const decode = (bytes) => {
  const family = (bytes.readUInt8(1) === IPv4) ? 4 : 6;
  const portBytes = bytes.slice(2, 4); // LE
  const addressBytes = bytes.slice(4, family === 4 ? 8 : 20); // LE
  const result = {
    family,
    port: portBytes.readUInt16BE(0),
    address: ip.toString(addressBytes, 0, family),
  };
  return result;
};

const decodeXor = (bytes, magicBytes, tidBytes) => {
  const family = (bytes.readUInt8(1) === IPv4) ? 4 : 6;
  const xportBytes = bytes.slice(2, 4); // LE
  const portBytes = xor(xportBytes, magicBytes.slice(0, 2));
  const xaddressBytes = bytes.slice(4, family === 4 ? 8 : 20); // LE
  const addressBytes = xor(xaddressBytes, family === 4 ?
    magicBytes : Buffer.concat([magicBytes, tidBytes]));
  const result = {
    family,
    port: portBytes.readUInt16BE(0),
    address: ip.toString(addressBytes, 0, family),
  };
  return result;
};

exports.encode = encode;
exports.encodeXor = encodeXor;
exports.decode = decode;
exports.decodeXor = decodeXor;
