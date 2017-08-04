const winston = require('winston-debug');
const winstonWrapper = require('winston-meta-wrapper');

class UnknownAttributesAttr {
  constructor(value) {
    // logging
    this.log = winstonWrapper(winston);
    this.log.addMeta({
      module: 'stun:attributes',
    });
    // init
    this.value = value;
    this.type = 0x000A;
    // done
    this.log.debug(`unknown attributes attr: ${JSON.stringify(this.value)}`);
  }

  // eslint-disable-next-line class-methods-use-this
  encode() {
    throw new Error('unknown-attributes.encode not implemented yet');
  }
}

UnknownAttributesAttr.decode = (attrBytes) => {
  const unknownAttrs = [];
  let offset = 0;

  while (offset < attrBytes.length) {
    unknownAttrs.push(attrBytes.readUInt16BE(offset).toString(16));
    offset += 2;
  }

  return new UnknownAttributesAttr(unknownAttrs);
};

module.exports = UnknownAttributesAttr;
