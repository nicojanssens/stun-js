const addressAttr = require('./address');
const winston = require('winston-debug');
const winstonWrapper = require('winston-meta-wrapper');

class MappedAddressAttr {
  constructor(address, port) {
    // logging
    this.log = winstonWrapper(winston);
    this.log.addMeta({
      module: 'stun:attributes',
    });
    // verify address and port
    if (address === undefined || port === undefined) {
      const errorMsg = 'invalid mapped address attribute';
      this.log.error(errorMsg);
      throw new Error(errorMsg);
    }
    // init
    this.address = address;
    this.port = port;
    this.type = 0x0001;
    // done
    this.log.debug(`mapped address = ${this.address}, port = ${this.port}`);
  }

  encode() {
    // type
    const typeBytes = new Buffer(2);
    typeBytes.writeUInt16BE(this.type, 0);
    // value
    const valueBytes = addressAttr.encode(this.address, this.port);
    // length
    const lengthBytes = new Buffer(2);
    lengthBytes.writeUInt16BE(valueBytes.length, 0);
    // combination
    const result = Buffer.concat([typeBytes, lengthBytes, valueBytes]);
    // done
    return result;
  }
}

MappedAddressAttr.decode = (attrBytes) => {
  const result = addressAttr.decode(attrBytes);
  return new MappedAddressAttr(result.address, result.port);
};

module.exports = MappedAddressAttr;
