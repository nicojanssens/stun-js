const padding = require('./padding');
const winston = require('winston-debug');
const winstonWrapper = require('winston-meta-wrapper');

class SoftwareAttr {
  constructor(description) {
    // logging
    this.log = winstonWrapper(winston);
    this.log.addMeta({
      module: 'stun:attributes',
    });
    // verify description
    if (description === undefined) {
      const errorMsg = 'invalid software attribute';
      this.log.error(errorMsg);
      throw new Error(errorMsg);
    }
    // init
    this.description = description;
    this.type = 0x8022;
    // done
    this.log.debug(`software attr: ${this.description}`);
  }

  encode() {
    // type
    const typeBytes = new Buffer(2);
    typeBytes.writeUInt16BE(this.type, 0);
    // value
    const valueBytes = new Buffer(this.description);
    if (this.description.length >= 128 || valueBytes.length >= 764) {
      throw new Error('invalid software attribute');
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

SoftwareAttr.decode = (attrBytes) => {
  const description = attrBytes.toString();
  if (attrBytes.length >= 764 || description.length >= 128) {
    throw new Error('invalid software attribute');
  }
  return new SoftwareAttr(description);
};

module.exports = SoftwareAttr;
