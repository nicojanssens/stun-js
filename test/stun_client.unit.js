'use strict'

var dgram = require('dgram')
var StunClient = require('../lib/stun_client')
var transports = require('../lib/transports')

var winston = require('winston-debug')
winston.level = 'debug'

var chai = require('chai')
var chaiAsPromised = require('chai-as-promised')
var expect = chai.expect
chai.use(chaiAsPromised)
chai.should()

if (!process.env.STUN_ADDR) {
  throw new Error('STUN_ADDR undefined -- giving up')
}
if (!process.env.STUN_PORT) {
  throw new Error('STUN_PORT undefined -- giving up')
}

var stunAddr = process.env.STUN_ADDR
var stunPort = parseInt(process.env.STUN_PORT)

var socketPort = 20000

describe('#STUN operations', function () {
  this.timeout(10000)

  it('should execute STUN bind operation over UDP socket using promises', function (done) {
    var retransmissionTimer
    // send a STUN bind request and verify the reply
    var sendBindRequest = function (client, socket) {
      client.bindP()
        .then(function (mappedAddress) {
          // end retransmissionTimer
          clearTimeout(retransmissionTimer)
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
    }
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
      client.init(function () {
        // retransmission timer -- we're using UDP ...
        retransmissionTimer = setTimeout(function () {
          console.log('resending BIND request')
          sendBindRequest(client, socket)
        }, 3000)
        // bind request
        sendBindRequest(client, socket)
      })
    })
    socket.bind(socketPort)
  })

  it('should execute STUN bind operation over UDP socket using promises + un-existing server', function (done) {
    var retransmissionTimer
    // send a STUN bind request and verify the reply
    var sendBindRequest = function (client, socket) {
      client.bindP()
        .then(function () {
          done(new Error('promise should not resolve'))
        })
        .catch(function (error) {
          expect(error).not.to.be.undefined
          done()
        })
    }
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
      var client = new StunClient('1.2.3.4', stunPort, transport)
      client.init(function () {
        // bind request
        sendBindRequest(client, socket)
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
    client.init(function () {
      client.bind(onBindSuccess, onFailure)
    })
  })

  it('should execute multiple concurrent STUN bind operations over TCP sockets using callbacks', function (done) {
    var nbClients = 10
    var clients = []
    var nbBindSuccesses = 0
    var nbClientsClosed = 0

    var createClient = function () {
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
        nbBindSuccesses++
        if (nbBindSuccesses === nbClients) {
          closeAllClients()
        }
      }
      // execute bind operation
      client.init(function () {
        client.bind(onBindSuccess, onFailure)
      })
      // store client ref
      clients.push(client)
    }

    var closeAllClients = function () {
      clients.forEach(function (client) {
        client.close(function () {
          nbClientsClosed++
          if (nbClientsClosed === nbClients) {
            done()
          }
        })
      })
    }

    for (var i = 0; i < nbClients; i++) {
      createClient()
    }
  })

  it('should execute multiple concurrent STUN bind operations over UDP sockets using callbacks', function (done) {
    var nbClients = 10
    var clients = []
    var nbBindSuccesses = 0
    var nbClientsClosed = 0

    var createClient = function () {
      var transport = new transports.UDP()
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
        nbBindSuccesses++
        if (nbBindSuccesses === nbClients) {
          closeAllClients()
        }
      }
      // execute bind operation
      client.init(function () {
        client.bind(onBindSuccess, onFailure)
      })
      // store client ref
      clients.push(client)
    }

    var closeAllClients = function () {
      clients.forEach(function (client) {
        client.close(function () {
          nbClientsClosed++
          if (nbClientsClosed === nbClients) {
            done()
          }
        })
      })
    }

    for (var i = 0; i < nbClients; i++) {
      createClient()
    }
  })

  it('should execute STUN bind operation over TCP socket using callbacks + un-existing server', function (done) {
    var transport = new transports.TCP()
    var client = new StunClient('1.2.3.4', stunPort, transport)
    // execute bind operation
    client.init(function () {
      done('did not expect init operation to succeed')
    }, function (error) {
      expect(error.message).to.be.a('string')
      expect(error.message).to.include('TCP connection timeout')
      done()
    })
  })

  it('should execute STUN bind operation over unspecified UDP socket using promises', function (done) {
    var retransmissionTimer
    // send a STUN bind request and verify the reply
    var sendBindRequest = function (client) {
      client.bindP()
        .then(function (mappedAddress) {
          // end retransmissionTimer
          clearTimeout(retransmissionTimer)
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
    }
    // create stun client and pass socket over
    var client = new StunClient(stunAddr, stunPort)
    client.init(function () {
      // retransmission timer -- we're using UDP ...
      retransmissionTimer = setTimeout(function () {
        console.log('resending BIND request')
        sendBindRequest(client)
      }, 3000)
      // bind request
      sendBindRequest(client)
    })
  })
})
