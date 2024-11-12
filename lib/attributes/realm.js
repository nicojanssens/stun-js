const padding = require('./padding');
const winston = require('winston-debug');
const winstonWrapper = require('winston-meta-wrapper');

class RealmAttr {
  constructor(value) {
    // logging
    this.log = winstonWrapper(winston);
    this.log.addMeta({
      module: 'stun:attributes',
    });
    // verify value
    if (value === undefined || value === '') {
      const errorMsg = 'invalid realm attribute';
      this.log.error(errorMsg);
      throw new Error(errorMsg);
    }
    // init
    this.value = value;
    this.type = 0x0014;
    // done
    this.log.debug(`realm attr: ${this.value}`);
  }

  encode() {
    // type
    const typeBytes = Buffer.alloc(2);
    typeBytes.writeUInt16BE(this.type, 0);
    // value
    const valueBytes = Buffer.from(this.value);
    if (this.value.length >= 128 || valueBytes.length >= 764) {
      throw new Error('invalid realm attribute');
    }
    // length
    const lengthBytes = Buffer.alloc(2);
    lengthBytes.writeUInt16BE(valueBytes.length, 0);
    // padding
    const paddingBytes = padding.getBytes(valueBytes.length);
    // combination
    const result = Buffer.concat([typeBytes, lengthBytes, valueBytes, paddingBytes]);
    // done
    return result;
  }
}

RealmAttr.decode = (attrBytes) => {
  const value = attrBytes.toString();
  if (attrBytes.length >= 764 || value.length >= 128) {
    throw new Error('invalid realm attribute');
  }
  return new RealmAttr(value);
};

module.exports = RealmAttr;
