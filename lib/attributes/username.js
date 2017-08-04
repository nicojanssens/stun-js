const padding = require('./padding');
const winston = require('winston-debug');
const winstonWrapper = require('winston-meta-wrapper');

class UsernameAttr {
  constructor(name) {
    // logging
    this.log = winstonWrapper(winston);
    this.log.addMeta({
      module: 'stun:attributes',
    });
    // verify name
    if (name === undefined) {
      const errorMsg = 'invalid username attribute';
      this.log.error(errorMsg);
      throw new Error(errorMsg);
    }
    // init
    this.name = name;
    this.type = 0x0006;
    // debug
    this.log.debug(`username attr: ${this.name}`);
  }

  encode() {
    // type
    const typeBytes = new Buffer(2);
    typeBytes.writeUInt16BE(this.type, 0);
    // value
    const valueBytes = new Buffer(this.name);
    if (valueBytes.length > 512) {
      throw new Error('invalid username attribute');
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

UsernameAttr.decode = (attrBytes) => {
  if (attrBytes.length > 512) {
    throw new Error('invalid username');
  }
  const name = attrBytes.toString();
  return new UsernameAttr(name);
};

module.exports = UsernameAttr;
