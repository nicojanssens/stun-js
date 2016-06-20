'use strict'

var dgram = require('dgram')
var StunClient = require('../src/stun_client')
var transports = require('../src/transports')

var chai = require('chai')
var chaiAsPromised = require('chai-as-promised')
var expect = chai.expect
chai.use(chaiAsPromised)
chai.should()

var stunAddr = process.env.STUN_ADDR
var stunPort = process.env.STUN_PORT

var socketPort = 10000

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
          return client.closeP()
        })
        .then(function () {
          // check the socket's event listeners (should not include any STUN client handler)
          expect(socket.listeners('message').length).to.equal(1)
          expect(socket.listeners('error').length).to.equal(1)
          // close socket
          socket.close(function () {
            done()
          })
        })
        .catch(function (error) {
          done(error)
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
      client.close(function () {
        done()
      })
    }
    // execute bind operation
    client.bind(onBindSuccess, onFailure)
  })

  it('should execute STUN bind operation over unspecified UDP socket using promises', function (done) {
    // create stun client and pass socket over
    var client = new StunClient(stunAddr, stunPort)
    client.bindP()
      .then(function (mappedAddress) {
        // verify the mapped address
        expect(mappedAddress).not.to.be.undefined
        expect(mappedAddress).to.have.property('address')
        expect(mappedAddress).to.have.property('port')
        return client.closeP()
      })
      .then(function () {
        done()
      })
      .catch(function (error) {
        done(error)
      })
  })
})
