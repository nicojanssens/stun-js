'use strict'

var dgram = require('dgram')
var StunClient = require('../src/stun_client')
var transports = require('../src/transports')
var winston = require('winston')

var chai = require('chai')
var chaiAsPromised = require('chai-as-promised')
var expect = chai.expect
chai.use(chaiAsPromised)
chai.should()

var argv = require('yargs')
  .usage('Usage: $0 [params]')
  .demand('a')
  .default('a', 'stun.l.google.com')
  .alias('a', 'addr')
  .nargs('a', 1)
  .describe('a', 'STUN server address')
  .demand('p')
  .default('p', '19302')
  .alias('p', 'port')
  .nargs('p', 1)
  .describe('p', 'STUN server port')
  .default('l', 'debug')
  .choices('l', ['info', 'debug', 'warn', 'error', 'verbose', 'silly'])
  .alias('l', 'log')
  .nargs('l', 1)
  .describe('l', 'Log level')
  .help('h')
  .alias('h', 'help')
  .argv

var stunAddr = argv.addr
var stunPort = argv.port
var socketPort = 12345
winston.level = argv.log

describe('#STUN operations', function () {
  this.timeout(5000)

  it('should execute STUN bind operation over UDP socket using promises', function (done) {
    // create socket
    var socket = dgram.createSocket('udp4')
    socket.on('message', function (message, rinfo) { //
      done(new Error('message callback should not be fired'))
    })
    socket.on('error', function (error) {
      done(error)
    })
    socket.on('listening', function () {
      // create stun client and pass socket over
      var transport = new transports.UDP(socket)
      var client = new StunClient(stunAddr, stunPort, transport)
      client.bindP()
        .then(function (mappedAddress) {
          // verify the mapped address
          expect(mappedAddress).not.to.be.undefined
          expect(mappedAddress).to.have.property('address')
          expect(mappedAddress).to.have.property('port')
          client.close()
          // check the socket's event listeners (should not include any STUN client handler)
          expect(socket.listeners('message').length).to.equal(1)
          expect(socket.listeners('error').length).to.equal(1)
          done()
        })
    })
    socket.bind(socketPort)
  })

  it('should execute STUN bind operation over TCP socket using callbacks', function (done) {
    var transport = new transports.TCP()
    var client = new StunClient(stunAddr, stunPort, transport)
    // if something fails
    var onFailure = function (error) {
      done(error)
    }
    // check bind results
    var onBindSuccess = function (mappedAddress) {
      expect(mappedAddress).not.to.be.undefined
      expect(mappedAddress).to.have.property('address')
      expect(mappedAddress).to.have.property('port')
      // expect(mappedAddress.address).to.equal(testGW)
      client.close()
      done()
    }
    // execute bind operation
    client.bind(onBindSuccess, onFailure)
  })

  it('should execute STUN bind operation over unspecified UDP socket using promises', function () {
    // create stun client and pass socket over
    var client = new StunClient(stunAddr, stunPort)
    return client.bindP()
      .then(function (mappedAddress) {
        // verify the mapped address
        expect(mappedAddress).not.to.be.undefined
        expect(mappedAddress).to.have.property('address')
        expect(mappedAddress).to.have.property('port')
        client.close()
      })
  })
})
