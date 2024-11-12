const padding = require('./padding');
const winston = require('winston-debug');
const winstonWrapper = require('winston-meta-wrapper');

class ErrorCodeAttr {
  constructor(code, reason) {
    // logging
    this.log = winstonWrapper(winston);
    this.log.addMeta({
      module: 'stun:attributes',
    });
    // verify error code
    if (code === undefined) {
      const undefinedCodeError = 'invalid error code attribute';
      this.log.error(undefinedCodeError);
      throw new Error(undefinedCodeError);
    }
    if (code < 300 || code >= 700) {
      const invalidCodeError = 'invalid error code';
      this.log.error(invalidCodeError);
      return new Error(invalidCodeError);
    }
    // verify reason
    reason = reason || ErrorCodeAttr.REASON[code];
    if (reason.length >= 128) {
      const invalidReasonError = 'invalid error reason';
      this.log.error(invalidReasonError);
      return new Error(invalidReasonError);
    }
    // init
    this.code = code;
    this.reason = reason;
    this.type = 0x0009;
    // done
    this.log.debug(`error code attr: code = ${this.code}, reason = ${this.reason}`);
  }

  encode() {
    // type
    const typeBytes = Buffer.alloc(2);
    typeBytes.writeUInt16BE(this.type, 0);
    // value
    const valueBytes = Buffer.alloc(4 + this.reason.length);
    valueBytes.writeUInt16BE(0, 0);
    valueBytes.writeUInt8(this.code / 100 | 0, 2);
    valueBytes.writeUInt8(this.code % 100, 3);
    valueBytes.write(this.reason, 4);
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

// error codes
ErrorCodeAttr.REASON = {
  300: 'Try Alternate',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  420: 'Unknown Attribute',
  437: 'Allocation Mismatch',
  438: 'Stale Nonce',
  441: 'Wrong Credentials',
  442: 'Unsupported Transport Protocol',
  486: 'Allocation Quota Reached',
  500: 'Server Error',
  508: 'Insufficient Capacity',
};

ErrorCodeAttr.decode = (attrBytes) => {
  const code = (attrBytes.readUInt8(2) * 100) + (attrBytes.readUInt8(3) % 100);
  const reason = attrBytes.toString('utf8', 4);

  if (reason.length >= 128) {
    throw new Error('invalid error code');
  }
  if (code < 300 || code >= 700) {
    throw new Error('invalid error code');
  }

  return new ErrorCodeAttr(code, reason);
};

module.exports = ErrorCodeAttr;
