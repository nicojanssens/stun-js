const dgram = require('dgram');
const StunClient = require('../lib/stun_client');
const transports = require('../lib/transports');

const winston = require('winston-debug');
winston.level = 'debug'

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const expect = chai.expect;
chai.use(chaiAsPromised)
chai.should()

if (!process.env.STUN_ADDR) {
  throw new Error('STUN_ADDR undefined -- giving up')
}
if (!process.env.STUN_PORT) {
  throw new Error('STUN_PORT undefined -- giving up')
}

const stunAddr = process.env.STUN_ADDR;
const stunPort = parseInt(process.env.STUN_PORT);

const socketPort = 20000;

describe('#STUN operations', function () {
  this.timeout(10000)

  it('should execute STUN bind operation over UDP socket using promises', done => {
    let retransmissionTimer;
    // send a STUN bind request and verify the reply
    const sendBindRequest = (client, socket) => {
      client.bindP()
        .then(mappedAddress => {
          // end retransmissionTimer
          clearTimeout(retransmissionTimer)
          // verify the mapped address
          expect(mappedAddress).not.to.be.undefined
          expect(mappedAddress).to.have.property('address')
          expect(mappedAddress).to.have.property('port')
          return client.closeP()
        })
        .then(() => {
          // check the socket's event listeners (should not include any STUN client handler)
          expect(socket.listeners('message').length).to.equal(1)
          expect(socket.listeners('error').length).to.equal(1)
          // close socket
          socket.close(() => {
            done()
          })
        })
        .catch(error => {
          done(error)
        })
    };
    // create socket
    const socket = dgram.createSocket('udp4');
    socket.on('message', (message, rinfo) => { //
      done(new Error('message callback should not be fired'))
    })
    socket.on('error', error => {
      done(error)
    })
    socket.on('listening', () => {
      // create stun client and pass socket over
      const transport = new transports.UDP(socket);
      const client = new StunClient(stunAddr, stunPort, transport);
      client.init(() => {
        // retransmission timer -- we're using UDP ...
        retransmissionTimer = setTimeout(() => {
          console.log('resending BIND request')
          sendBindRequest(client, socket)
        }, 3000)
        // bind request
        sendBindRequest(client, socket)
      })
    })
    socket.bind(socketPort)
  })

  it('should execute STUN bind operation over UDP socket using promises + un-existing server', done => {
    let retransmissionTimer;
    // send a STUN bind request and verify the reply
    const sendBindRequest = (client, socket) => {
      client.bindP()
        .then(() => {
          done(new Error('promise should not resolve'))
        })
        .catch(error => {
          expect(error).not.to.be.undefined
          done()
        })
    };
    // create socket
    const socket = dgram.createSocket('udp4');
    socket.on('message', (message, rinfo) => { //
      done(new Error('message callback should not be fired'))
    })
    socket.on('error', error => {
      done(error)
    })
    socket.on('listening', () => {
      // create stun client and pass socket over
      const transport = new transports.UDP(socket);
      const client = new StunClient('1.2.3.4', stunPort, transport);
      client.init(() => {
        // bind request
        sendBindRequest(client, socket)
      })
    })
    socket.bind(socketPort)
  })

  it('should execute STUN bind operation over TCP socket using callbacks', done => {
    const transport = new transports.TCP();
    const client = new StunClient(stunAddr, stunPort, transport);
    // if something fails
    const onFailure = error => {
      done(error)
    };
    // check bind results
    const onBindSuccess = mappedAddress => {
      expect(mappedAddress).not.to.be.undefined
      expect(mappedAddress).to.have.property('address')
      expect(mappedAddress).to.have.property('port')
      // expect(mappedAddress.address).to.equal(testGW)
      client.close(() => {
        done()
      })
    };
    // execute bind operation
    client.init(() => {
      client.bind(onBindSuccess, onFailure)
    })
  })

  it('should execute multiple concurrent STUN bind operations over TCP sockets using callbacks', done => {
    const nbClients = 10;
    const clients = [];
    let nbBindSuccesses = 0;
    let nbClientsClosed = 0;

    const createClient = () => {
      const transport = new transports.TCP();
      const client = new StunClient(stunAddr, stunPort, transport);
      // if something fails
      const onFailure = error => {
        done(error)
      };
      // check bind results
      const onBindSuccess = mappedAddress => {
        expect(mappedAddress).not.to.be.undefined
        expect(mappedAddress).to.have.property('address')
        expect(mappedAddress).to.have.property('port')
        nbBindSuccesses++
        if (nbBindSuccesses === nbClients) {
          closeAllClients()
        }
      };
      // execute bind operation
      client.init(() => {
        client.bind(onBindSuccess, onFailure)
      })
      // store client ref
      clients.push(client)
    };

    var closeAllClients = () => {
      clients.forEach(client => {
        client.close(() => {
          nbClientsClosed++
          if (nbClientsClosed === nbClients) {
            done()
          }
        })
      })
    }

    for (let i = 0; i < nbClients; i++) {
      createClient()
    }
  })

  it('should execute multiple concurrent STUN bind operations over UDP sockets using callbacks', done => {
    const nbClients = 10;
    const clients = [];
    let nbBindSuccesses = 0;
    let nbClientsClosed = 0;

    const createClient = () => {
      const transport = new transports.UDP();
      const client = new StunClient(stunAddr, stunPort, transport);
      // if something fails
      const onFailure = error => {
        done(error)
      };
      // check bind results
      const onBindSuccess = mappedAddress => {
        expect(mappedAddress).not.to.be.undefined
        expect(mappedAddress).to.have.property('address')
        expect(mappedAddress).to.have.property('port')
        nbBindSuccesses++
        if (nbBindSuccesses === nbClients) {
          closeAllClients()
        }
      };
      // execute bind operation
      client.init(() => {
        client.bind(onBindSuccess, onFailure)
      })
      // store client ref
      clients.push(client)
    };

    var closeAllClients = () => {
      clients.forEach(client => {
        client.close(() => {
          nbClientsClosed++
          if (nbClientsClosed === nbClients) {
            done()
          }
        })
      })
    }

    for (let i = 0; i < nbClients; i++) {
      createClient()
    }
  })

  it('should execute STUN bind operation over TCP socket using callbacks + un-existing server', done => {
    const transport = new transports.TCP();
    const client = new StunClient('1.2.3.4', stunPort, transport);
    // execute bind operation
    client.init(() => {
      done('did not expect init operation to succeed')
    }, error => {
      expect(error.message).to.be.a('string')
      expect(error.message).to.include('TCP connection timeout')
      done()
    })
  })

  it('should execute STUN bind operation over unspecified UDP socket using promises', done => {
    let retransmissionTimer;
    // send a STUN bind request and verify the reply
    const sendBindRequest = client => {
      client.bindP()
        .then(mappedAddress => {
          // end retransmissionTimer
          clearTimeout(retransmissionTimer)
          // verify the mapped address
          expect(mappedAddress).not.to.be.undefined
          expect(mappedAddress).to.have.property('address')
          expect(mappedAddress).to.have.property('port')
          return client.closeP()
        })
        .then(() => {
          done()
        })
        .catch(error => {
          done(error)
        })
    };
    // create stun client and pass socket over
    const client = new StunClient(stunAddr, stunPort);
    client.init(() => {
      // retransmission timer -- we're using UDP ...
      retransmissionTimer = setTimeout(() => {
        console.log('resending BIND request')
        sendBindRequest(client)
      }, 3000)
      // bind request
      sendBindRequest(client)
    })
  })
})
