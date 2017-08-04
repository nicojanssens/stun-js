const AbstractTransport = require('./abstract');
const dgram = require('dgram');
const winston = require('winston-debug');
const winstonWrapper = require('winston-meta-wrapper');

class UdpWrapper extends AbstractTransport {
  constructor(socket) {
    super();
    // create dgram if socker is undefined
    this.socket = (socket === undefined) ? dgram.createSocket('udp4') : socket;
    this.externalSocket = (socket !== undefined);
    // logging
    this.log = winstonWrapper(winston);
    this.log.addMeta({
      module: 'stun:transports:udp',
    });
  }

  init(host, port, onReady, onData, onError) {
    // init
    this.host = host;
    this.port = port;
    // if socket is defined/used externally
    if (this.externalSocket) {
      // store original message and error listeners, if any
      this.messageListeners = this.socket.listeners('message');
      this.errorListeners = this.socket.listeners('error');
      // temp remove these listeners ...
      this.messageListeners.forEach((callback) => {
        this.socket.removeListener('message', callback);
      });
      this.errorListeners.forEach((callback) => {
        this.socket.removeListener('error', callback);
      });
    }
    // register our own handlers
    this.socket.on('message', (message, rinfo) => {
      onData(message, rinfo, true);
    });
    this.socket.on('error', onError);
    onReady();
  }

  // eslint-disable-next-line class-methods-use-this
  isReliable() {
    return false;
  }

  // eslint-disable-next-line class-methods-use-this
  getTimeoutDelay() {
    return 500;
  }

  send(bytes, onSuccess, onFailure) {
    if (onSuccess === undefined || onFailure === undefined) {
      const errorMsg = 'udp send bytes callback handlers are undefined';
      this.log.error(errorMsg);
      throw new Error(errorMsg);
    }
    this.socket.send(bytes, 0, bytes.length, this.port, this.host, (error) => {
      if (error) {
        onFailure(error);
        return;
      }
      onSuccess();
    });
  }

  close(done) {
    // if socket is defined/used externally
    if (this.externalSocket) {
      // remove temp listeners
      this.socket.listeners('message').forEach((callback) => {
        this.socket.removeListener('message', callback);
      });
      this.socket.listeners('error').forEach((callback) => {
        this.socket.removeListener('error', callback);
      });
      // restore the original listeners
      this.messageListeners.forEach((callback) => {
        this.socket.on('message', callback);
      });
      this.errorListeners.forEach((callback) => {
        this.socket.on('error', callback);
      });
      // and remove refs to these original listeners
      this.messageListeners = [];
      this.errorListeners = [];
      // fire callback
      if (done) {
        done();
      }
    } else {
      // close socket
      this.socket.close(() => {
        // fire callback
        if (done) {
          done();
        }
      });
    }
  }
}

module.exports = UdpWrapper;
