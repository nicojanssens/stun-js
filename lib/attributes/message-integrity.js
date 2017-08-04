const crypto = require('crypto');
const winston = require('winston-debug');
const winstonWrapper = require('winston-meta-wrapper');

class MessageIntegrityAttr {
  constructor(request, hash) {
    // logging
    this.log = winstonWrapper(winston);
    this.log.addMeta({
      module: 'stun:attributes',
    });
    // verify request
    if (request) {
      if (request.username === undefined || request.password === undefined) {
        const errorMsg = 'invalid message integrity attribute';
        this.log.error(errorMsg);
        throw new Error(errorMsg);
      }
    }
    // init
    this.request = request;
    this.hash = hash;
    this.type = 0x0008;
    // done
    this.log.debug(`message integrity attr: request = ${JSON.stringify(this.request)}, hash = ${this.hash}`);
  }

  encode(packetBytes) {
    if (packetBytes === undefined) {
      const errorMsg = 'invalid MessageIntegrityAttr.encode attributes';
      this.log.error(errorMsg);
      throw new Error(errorMsg);
    }
    // type
    const typeBytes = new Buffer(2);
    typeBytes.writeUInt16BE(this.type, 0);
    // value
    let key;
    if (this.request.realm && this.request.realm !== '') {
      const md5 = crypto.createHash('md5');
      md5.update([this.request.username, this.request.realm, this.request.password].join(':'));
      key = md5.digest();
    } else {
      key = this.request.password;
    }
    const hmac = crypto.createHmac('sha1', key);
    hmac.update(packetBytes);
    const valueBytes = new Buffer(hmac.digest());
    // length
    const lengthBytes = new Buffer(2);
    lengthBytes.writeUInt16BE(valueBytes.length, 0);
    // combination
    const result = Buffer.concat([typeBytes, lengthBytes, valueBytes]);
    // done
    return result;
  }

  static decode(attrBytes) {
    if (attrBytes.length !== 20) {
      const errorMsg = 'invalid message integrity attribute';
      this.log.error(errorMsg);
      throw new Error(errorMsg);
    }
    const hash = attrBytes.toString('hex');
    return new MessageIntegrityAttr(null, hash);
  }
}

module.exports = MessageIntegrityAttr;
