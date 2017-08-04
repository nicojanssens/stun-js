const AbstractTransport = require('./abstract');
const merge = require('merge');
const net = require('net');
const winston = require('winston-debug');
const winstonWrapper = require('winston-meta-wrapper');

class TcpWrapper extends AbstractTransport {
  constructor(args) {
    super();
    if (!(this instanceof TcpWrapper)) {
      return new TcpWrapper(args);
    }
    // init
    this.args = merge(Object.create(TcpWrapper.DEFAULTS), args);
    // logging
    this.log = winstonWrapper(winston);
    this.log.addMeta({
      module: 'stun:transports:tcp',
    });
  }

  init(host, port, onReady, onData, onError) {
    // init
    this.host = host;
    this.port = port;
    // create and store tcp socket
    const client = net.createConnection(this.port, this.host);
    this.client = client;
    this.log.debug(`creating TCP connection with ${this.host}:${this.port}`);
    // add socket event handlers
    client.on('error', onError);
    client.on('data', (bytes) => {
      this.log.debug(`incoming data: ${bytes.length} bytes`);
      const rinfo = {};
      rinfo.address = this.host;
      rinfo.port = parseInt(this.port, 10);
      rinfo.family = net.isIPv4(this.host) ? 'IPv4' : 'IPv6';
      rinfo.size = bytes.length;
      onData(bytes, rinfo, false);
    });
    client.on('connect', () => {
      // stop and remove timer
      clearTimeout(client.connectionTimeout);
      delete client.connectionTimeout;
      // fire ready callback
      onReady();
      // localport represents connection
      this.log.addMeta({
        conn: this.client.localPort,
      });
    });
    client.on('close', () => {
      this.log.debug('TCP connection closed');
    });
    // init connection timeout
    client.connectionTimeout = setTimeout(() => {
      this.log.error('connection timeout');
      onError('TCP connection timeout');
    }, this.args.connectTimeout);
  }

  // eslint-disable-next-line class-methods-use-this
  isReliable() {
    return true;
  }

  // eslint-disable-next-line class-methods-use-this
  getTimeoutDelay() {
    return 0;
  }

  send(bytes, onSuccess, onFailure) {
    this.log.debug(`outgoing data: ${bytes.length} bytes`);
    if (onSuccess === undefined || onFailure === undefined) {
      const errorMsg = 'tcp send bytes callback handlers are undefined';
      this.log.error(errorMsg);
      throw new Error(errorMsg);
    }
    const flushed = this.client.write(bytes, 'binary', () => {
      this.log.debug('message sent');
    });
    if (!flushed) {
      this.log.debug(`high water -- buffer size = ${this.client.bufferSize}`);
      this.client.once('drain', () => {
        this.log.debug(`drained -- buffer size = ${this.client.bufferSize}`);
        onSuccess();
      });
    } else {
      onSuccess();
    }
  }

  close(done) {
    this.client.once('close', () => {
      if (done) {
        done();
      }
    });
    this.client.destroy();
  }
}

TcpWrapper.DEFAULTS = {
  connectTimeout: 100,
};

module.exports = TcpWrapper;
