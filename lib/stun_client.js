const Attributes = require('./attributes');
const Packet = require('./packet');
const Q = require('q');
const StunComm = require('./stun_comm');
const winston = require('winston-debug');
const winstonWrapper = require('winston-meta-wrapper');

// Create bind request message
const composeBindRequest = () => {
  // create packet
  const packet = new Packet(Packet.METHOD.BINDING, Packet.TYPE.REQUEST);
  // encode packet
  const message = packet.encode();
  return message;
};

// Create bind request message
const composeBindIndication = () => {
  // create packet
  const packet = new Packet(Packet.METHOD.BINDING, Packet.TYPE.INDICATION);
  // encode packet
  const message = packet.encode();
  return message;
};

// Constructor
class StunClient extends StunComm {
  constructor(stunHost, stunPort, transport) {
    super(stunHost, stunPort, transport);
    // logging
    this.log = winstonWrapper(winston);
    this.log.addMeta({
      module: 'stun:client',
    });
    // inheritance
  }

  /** StunComm operations */

  // Bind request
  bindP() {
    return this.sendBindRequestP()
      .then((bindReply) => {
        const errorCode = bindReply.getAttribute(Attributes.ERROR_CODE);
        // check if the reply includes an error code attr
        if (errorCode) {
          throw new Error(`bind error: ${errorCode.reason}`);
        }
        let mappedAddressAttr = bindReply.getAttribute(Attributes.XOR_MAPPED_ADDRESS);
        if (!mappedAddressAttr) {
          mappedAddressAttr = bindReply.getAttribute(Attributes.MAPPED_ADDRESS);
        }
        const mappedAddress = {
          address: mappedAddressAttr.address,
          port: mappedAddressAttr.port,
        };
        return Q.fcall(() => mappedAddress);
      });
  }

  bind(onSuccess, onFailure) {
    if (onSuccess === undefined || onFailure === undefined) {
      const errorMsg = 'bind callback handlers are undefined';
      this.log.error(errorMsg);
      throw new Error(errorMsg);
    }
    this.bindP()
      .then((result) => {
        onSuccess(result);
      })
      .catch((error) => {
        onFailure(error);
      });
  }

  /** Message transmission */

  // Send STUN bind request
  sendBindRequestP() {
    this.log.debug('send bind request (using promises)');
    const message = composeBindRequest();
    return this.sendStunRequestP(message);
  }

  sendBindRequest(onSuccess, onFailure) {
    this.log.debug('send bind request');
    if (onSuccess === undefined || onFailure === undefined) {
      const errorMsg = 'send bind request callback handlers are undefined';
      this.log.error(errorMsg);
      throw new Error(errorMsg);
    }
    this.sendBindRequestP()
      .then((reply) => {
        onSuccess(reply);
      })
      .catch((error) => {
        onFailure(error);
      });
  }

  // Send STUN bind indication
  sendBindIndicationP() {
    this.log.debug('send bind indication (using promises)');
    const message = composeBindIndication();
    return this.sendStunIndicationP(message);
  }

  sendBindIndication(onSuccess, onFailure) {
    this.log.debug('send bind indication');
    if (onSuccess === undefined || onFailure === undefined) {
      const errorMsg = 'send bind indication callback handlers are undefined';
      this.log.debug(errorMsg);
      throw new Error(errorMsg);
    }
    this.sendBindIndicationP()
      .then((reply) => {
        onSuccess(reply);
      })
      .catch((error) => {
        onFailure(error);
      });
  }
}

module.exports = StunClient;
