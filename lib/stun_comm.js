const Args = require('args-js');
const events = require('events');
const myUtils = require('./utils');
const Packet = require('./packet');
const Q = require('q');
const UdpTransport = require('./transports/udp');
const winston = require('winston-debug');
const winstonWrapper = require('winston-meta-wrapper');

const MAX_RETRANSMISSIONS = 5;

// Create client
class StunComm extends events.EventEmitter {
  constructor(...args) {
    super();
    // logging
    this.log = winstonWrapper(winston);
    this.log.addMeta({
      module: 'stun:client',
    });
    // parse args
    const functionArgs = new Args([
      { stunHost: Args.STRING | Args.Required },
      { stunPort: Args.INT | Args.Required },
      { transport: Args.OBJECT | Args.Optional }
    ], args);
    // init
    this.stunHost = functionArgs.stunHost;
    this.stunPort = functionArgs.stunPort;
    this.transport = functionArgs.transport;
    if (this.transport === undefined) {
      this.transport = new UdpTransport();
    }
    this.unackedSendOperations = {};
    this.decoders = [];
    this.decoders.push({
      decoder: Packet.decode,
      listener: this.dispatchStunPacket.bind(this),
    });
    this.availableBytes = Buffer.alloc(0);
    // register error handler
    myUtils.mixinEventEmitterErrorFunction(this);
  }

  init(onReady, onFailure) {
    this.transport.init(
      this.stunHost,
      this.stunPort,
      onReady,
      this.onIncomingData(),
      this.onError(onFailure) // eslint-disable-line comma-dangle
    );
  }

  initP() {
    const deferred = Q.defer();
    this.init(
      () => { // on success
        deferred.resolve();
      },
      (error) => {
        deferred.reject(error);
      } // eslint-disable-line comma-dangle
    );
    return deferred.promise;
  }

  // Close client
  close(done) {
    this.log.debug('closing client');
    this.transport.close(done);
  }

  closeP() {
    this.log.debug('closing client');
    return this.transport.closeP();
  }

  /** STUN communication */

  // Send STUN request
  sendStunRequest(bytes, onResponse, onFailure) {
    // get tid
    const tid = bytes.readUInt32BE(16);
    this.log.debug(`sending stun request with TID ${tid}`);
    // store response handlers for this tid
    if (this.unackedSendOperations[tid] === undefined) {
      this.unackedSendOperations[tid] = {
        onResponse,
        onFailure,
      };
    }
    // send bytes
    this.transport.send(
      bytes,
      () => { // on success
        // do nothing
      },
      (error) => { // on failure
        onFailure(error);
      } // eslint-disable-line comma-dangle
    );
    // when stun transport is unreliable
    if (!this.transport.isReliable()) {
      // set # of retransmissions if undefined
      if (this.unackedSendOperations[tid].remainingRetransmissionAttempts === undefined) {
        this.unackedSendOperations[tid].remainingRetransmissionAttempts = MAX_RETRANSMISSIONS;
      }
      // start retransmission timer
      const timeout = setTimeout(
        () => {
          if (this.unackedSendOperations[tid].remainingRetransmissionAttempts === 0) {
            // stopping retransmission
            const errorMsg = 'giving up, no more retransmission attempts left';
            this.log.error(errorMsg);
            this.error(errorMsg, onFailure);
            delete this.unackedSendOperations[tid];
          } else {
            this.unackedSendOperations[tid].remainingRetransmissionAttempts -= 1;
            this.sendStunRequest(bytes, onResponse, onFailure);
          }
        },
        this.transport.getTimeoutDelay() // eslint-disable-line comma-dangle
      );
      this.unackedSendOperations[tid].retransmissionTimeout = timeout;
    }
  }

  sendStunRequestP(bytes) {
    const deferred = Q.defer();
    this.sendStunRequest(
      bytes,
      (stunResponse) => { // on response
        deferred.resolve(stunResponse);
      },
      (error) => { // on failure
        deferred.reject(error);
      } // eslint-disable-line comma-dangle
    );
    return deferred.promise;
  }

  // Send STUN indication
  sendStunIndicationP(bytes) {
    return this.transport.sendP(bytes);
  }

  sendStunIndication(bytes, onSuccess, onFailure) {
    if (onSuccess === undefined || onFailure === undefined) {
      const errorMsg = 'send stun indication callback handlers are undefined';
      this.log.error(errorMsg);
      throw new Error(errorMsg);
    }
    this.transport.send(bytes, onSuccess, onFailure);
  }

  // Incoming data handler
  onIncomingData() {
    return (bytes, rinfo, isFrame) => {
      this.log.debug(`receiving data from ${JSON.stringify(rinfo)}`);
      this.availableBytes = Buffer.concat([this.availableBytes, bytes]);
      this.parseIncomingData(rinfo, isFrame);
    };
  }

  parseIncomingData(rinfo, isFrame) {
    // iterate over registered decoders
    for (const i in this.decoders) {
      const decoder = this.decoders[i].decoder;
      const listener = this.decoders[i].listener;
      // execute decoder
      const decoding = decoder(this.availableBytes, isFrame);
      // if decoding was successful
      if (decoding) {
        // store remaining bytes (if any) for later use
        this.availableBytes = decoding.remainingBytes;
        // dispatch packet
        listener(decoding.packet, rinfo);
        // if there are remaining bytes, then trigger new parsing round
        if (this.availableBytes.length !== 0) {
          this.parseIncomingData(rinfo, isFrame);
        }
        // and break
        break;
      }
    }
  }

  dispatchStunPacket(stunPacket, rinfo) {
    switch (stunPacket.type) {
      case Packet.TYPE.SUCCESS_RESPONSE:
        this.log.debug(`incoming STUN success response with tid ${stunPacket.tid}`);
        this.onIncomingStunResponse(stunPacket);
        break;
      case Packet.TYPE.ERROR_RESPONSE:
        this.log.debug(`incoming STUN error response with tid ${stunPacket.tid}`);
        this.onIncomingStunResponse(stunPacket);
        break;
      case Packet.TYPE.INDICATION:
        this.log.debug('incoming STUN indication');
        this.onIncomingStunIndication(stunPacket, rinfo);
        break;
      default:
        const errorMsg = "don't know how to process incoming STUN message -- dropping it on the floor";
        this.log.error(errorMsg);
        throw new Error(errorMsg);
    }
  }

  // Incoming STUN reply
  onIncomingStunResponse(stunPacket) {
    const sendOperation = this.unackedSendOperations[stunPacket.tid];
    if (sendOperation === undefined) {
      const noSendOperationFoundMessage = `cannot find associated STUN request for TID ${stunPacket.tid} -- ignoring request`;
      this.log.error(noSendOperationFoundMessage);
      return;
    }
    // stop retransmission timer (if present)
    const timeout = this.unackedSendOperations[stunPacket.tid].retransmissionTimeout;
    if (timeout) {
      clearTimeout(timeout);
    }
    // this is a stun reply
    const onResponseCallback = this.unackedSendOperations[stunPacket.tid].onResponse;
    if (onResponseCallback) {
      onResponseCallback(stunPacket);
      delete this.unackedSendOperations[stunPacket.tid];
    } else {
      const errorMsg = `no handler available to process response with tid ${stunPacket.tid}`;
      this.log.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  // Incoming STUN indication
  onIncomingStunIndication(stunPacket, rinfo) {
    this.emit('indication', stunPacket, rinfo);
  }

  // Error handler
  onError(callback) {
    return (error) => {
      const errorMsg = `client error: ${error}`;
      this.log.error(errorMsg);
      this.error(new Error(errorMsg), callback);
    };
  }
}

module.exports = StunComm;
