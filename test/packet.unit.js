'use strict'

var Packet = require('../src/packet')

var chai = require('chai')
var expect = chai.expect

describe('#STUN operations', function () {
  it('should encode and decode a binding request', function (done) {
    var packet = new Packet(Packet.METHOD.BINDING, Packet.TYPE.REQUEST)
    var data = packet.encode()
    var decodedPacket = Packet.decode(data)
    expect(decodedPacket.method).to.equal(Packet.METHOD.BINDING)
    expect(decodedPacket.type).to.equal(Packet.TYPE.REQUEST)
    done()
  })

  it('should encode and decode a binding indication', function (done) {
    var packet = new Packet(Packet.METHOD.BINDING, Packet.TYPE.INDICATION)
    var data = packet.encode()
    var decodedPacket = Packet.decode(data)
    expect(decodedPacket.method).to.equal(Packet.METHOD.BINDING)
    expect(decodedPacket.type).to.equal(Packet.TYPE.INDICATION)
    done()
  })
})
