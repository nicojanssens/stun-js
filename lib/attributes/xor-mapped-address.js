const addressAttr = require('./address');
const winston = require('winston-debug');
const winstonWrapper = require('winston-meta-wrapper');

class XORMappedAddressAttr {
  constructor(address, port) {
    // logging
    this.log = winstonWrapper(winston);
    this.log.addMeta({
      module: 'stun:attributes',
    });
    // verify address and port
    if (address === undefined || port === undefined) {
      const errorMsg = 'invalid xor mapped address attribute';
      this.log.error(errorMsg);
      throw new Error(errorMsg);
    }
    // init
    this.address = address;
    this.port = port;
    this.type = 0x0020;
    // done
    this.log.debug(`xor mapped address attr: ${this.address}:${this.port}`);
  }

  encode(magic, tid) {
    if (magic === undefined || tid === undefined) {
      const errorMsg = 'invalid xorMappedAddressAttr.encode params';
      this.log.error(errorMsg);
      throw new Error(errorMsg);
    }
    // type
    const typeBytes = Buffer.alloc(2);
    typeBytes.writeUInt16BE(this.type, 0);
    // value
    const valueBytes = addressAttr.encodeXor(this.address, this.port, magic, tid);
    // length
    const lengthBytes = Buffer.alloc(2);
    lengthBytes.writeUInt16BE(valueBytes.length, 0);
    // combination
    const result = Buffer.concat([typeBytes, lengthBytes, valueBytes]);
    // done
    return result;
  }
}

XORMappedAddressAttr.decode = (attrBytes, headerBytes) => {
  const magicBytes = headerBytes.slice(4, 8); // BE
  const tidBytes = headerBytes.slice(8, 20); // BE

  const result = addressAttr.decodeXor(attrBytes, magicBytes, tidBytes);
  return new XORMappedAddressAttr(result.address, result.port);
};

module.exports = XORMappedAddressAttr;
