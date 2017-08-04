const events = require('events');
const myUtils = require('../utils');
const Q = require('q');
const winston = require('winston-debug');
const winstonWrapper = require('winston-meta-wrapper');

class AbstractTransport extends events.EventEmitter {
  constructor() {
    // event emitter
    super();
    // logging
    this.log = winstonWrapper(winston);
    this.log.addMeta({
      module: 'stun:transports',
    });
    // register error handler
    myUtils.mixinEventEmitterErrorFunction(this);
  }

  isReliable() {
    const errorMsg = 'AbstractTransport.isReliable function not implemented';
    this.log.error(errorMsg);
    this.error(errorMsg);
  }

  getTimeoutDelay() {
    const errorMsg = 'AbstractTransport.getTimeoutDelay function not implemented';
    this.log.error(errorMsg);
    this.error(errorMsg);
  }

  send() {
    const errorMsg = 'AbstractTransport.send function not implemented';
    this.log.error(errorMsg);
    this.error(errorMsg);
  }

  sendP(bytes) {
    const deferred = Q.defer();
    this.send(
      bytes,
      () => { // on success
        deferred.resolve();
      },
      (error) => {
        const errorMsg = `tcp wrapper could not send bytes to ${this.host}:${this.port}. ${error}`;
        this.log.error(errorMsg);
        deferred.reject(errorMsg);
      } // eslint-disable-line comma-dangle
    );
    return deferred.promise;
  }

  close() {
    const errorMsg = 'AbstractTransport.close function not implemented';
    this.log.error(errorMsg);
    this.error(errorMsg);
  }

  closeP() {
    const deferred = Q.defer();
    this.close(
      () => { // on success
        deferred.resolve();
      } // eslint-disable-line comma-dangle
    );
    return deferred.promise;
  }
}

module.exports = AbstractTransport;
