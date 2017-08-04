const padding = require('./padding');
const winston = require('winston-debug');
const winstonWrapper = require('winston-meta-wrapper');

class NonceAttr {
  constructor(value) {
    // logging
    this.log = winstonWrapper(winston);
    this.log.addMeta({
      module: 'stun:attributes',
    });
    // verify value
    if (value === undefined) {
      const errorMsg = 'invalid nonce attribute';
      this.log.error(errorMsg);
      throw new Error(errorMsg);
    }
    // init
    this.value = value;
    this.type = 0x0015;
    // done
    this.log.debug(`nonce attr: ${this.value}`);
  }

  encode() {
    // type
    const typeBytes = new Buffer(2);
    typeBytes.writeUInt16BE(this.type, 0);
    // value
    const valueBytes = new Buffer(this.value);
    if (this.value.length >= 128 || valueBytes.length >= 764) {
      throw new Error('invalid nonce attribute');
    }
    // length
    const lengthBytes = new Buffer(2);
    lengthBytes.writeUInt16BE(valueBytes.length, 0);
    // padding
    const paddingBytes = padding.getBytes(valueBytes.length);
    // combination
    const result = Buffer.concat([typeBytes, lengthBytes, valueBytes, paddingBytes]);
    // done
    return result;
  }
}

NonceAttr.decode = (attrBytes) => {
  const value = attrBytes.toString();
  if (attrBytes.length >= 764 || value.length >= 128) {
    throw new Error('invalid nonce attribute');
  }
  return new NonceAttr(value);
};

module.exports = NonceAttr;
