'use strict'

var dgram = require('dgram')
var SrflxSocket = require('../src/srflx_socket')
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

var testAddr = argv.addr
var testPort = argv.port
winston.level = argv.log

describe('#STUN operations', function () {
  this.timeout(5000)

  it('should execute STUN bind operation (using promises)', function () {
    var socket = new SrflxSocket(testAddr, testPort)
    return socket.listenP()
      .then(function (localAddress) {
        return socket.bindP()
      })
      .then(function (mappedAddress) {
        expect(mappedAddress).not.to.be.undefined
        expect(mappedAddress).to.have.property('address')
        expect(mappedAddress).to.have.property('port')
      // expect(mappedAddress.address).to.equal(testGW)
      })
  })

  it('should execute STUN bind operation (using callbacks)', function (done) {
    var socket = new SrflxSocket(testAddr, testPort)
    // if something fails
    var onFailure = function (error) {
      done(error)
    }
    // once some test results are available
    var onSuccess = function (mappedAddress) {
      expect(mappedAddress).not.to.be.undefined
      expect(mappedAddress).to.have.property('address')
      expect(mappedAddress).to.have.property('port')
      // expect(mappedAddress.address).to.equal(testGW)
      socket.close()
      done()
    }
    // if socket is listening
    var onListening = function (localAddress) {
      socket.bind(onSuccess, onFailure)
    }
    socket.listen({},
      onListening, // on ready
      onFailure // on failure
    )
  })

  it('should execute STUN bind operation using a specific dgram socket (using promises)', function () {
    var udpSocket = dgram.createSocket('udp4')
    var socket = new SrflxSocket(testAddr, testPort, udpSocket)
    return socket.listenP()
      .then(function (localAddress) {
        return socket.bindP()
      })
      .then(function (mappedAddress) {
        expect(mappedAddress).not.to.be.undefined
        expect(mappedAddress).to.have.property('address')
        expect(mappedAddress).to.have.property('port')
      // expect(mappedAddress.address).to.equal(testGW)
      })
  })

  it('should receive messages that are sent to a srflx address', function (done) {
    var testData = 'hello there'
    var testRuns = 1
    var messagesReceived = 0

    var socketAlice = new SrflxSocket(testAddr, testPort)
    var socketBob = new SrflxSocket(testAddr, testPort)
    var addressAlice, addressBob

    // subscribe to incoming messages
    socketBob.on('message', function (bytes, rinfo) {
      var message = bytes.toString()
      expect(message).to.equal(testData)
      winston.debug('[stun-js] receiving test message ' + message)
      messagesReceived++
      if (messagesReceived === testRuns) {
        socketBob.close()
        done()
      }
    })

    // open alice's socket ...
    socketAlice.listenP()
      .then(function (localAddress) {
        // and determine her public address (not really needed for this test, but it also doesn't hurt ...)
        return socketAlice.bindP()
      })
      .then(function (mappedAddress) {
        addressAlice = mappedAddress
        winston.debug("[stun-js] alice's srflx address = " + addressAlice.address + ':' + addressAlice.port)
        // open bob's socket ...
        return socketBob.listenP()
      })
      .then(function (localAddress) {
        // and determine his public address
        return socketBob.bindP()
      })
      .then(function (mappedAddress) {
        addressBob = mappedAddress
        winston.debug("[stun-js] bob's srflx address = " + addressBob.address + ':' + addressBob.port)
        // send test message n times
        for (var i = 0; i < testRuns; i++) {
          var bytes = new Buffer(testData)
          socketAlice.send(
            bytes,
            addressBob.address,
            addressBob.port,
            function () { // on success
              winston.debug('[stun-js] test message sent to ' + addressBob.address + ':' + addressBob.port)
            },
            function (error) { // on failure
              done(error)
            }
          )
        }
      })
  })
})
