'use strict'

var Packet = require('../lib/packet')

var chai = require('chai')
var expect = chai.expect

describe('#STUN operations', function () {
  it('should encode and decode a binding request', function (done) {
    var packet = new Packet(Packet.METHOD.BINDING, Packet.TYPE.REQUEST)
    var data = packet.encode()
    var stunDecoding = Packet.decode(data)
    var decodedPacket = stunDecoding.packet
    expect(decodedPacket.method).to.equal(Packet.METHOD.BINDING)
    expect(decodedPacket.type).to.equal(Packet.TYPE.REQUEST)
    var remainingBytes = stunDecoding.remainingBytes
    expect(remainingBytes.length).to.equal(0)
    done()
  })

  it('should encode and decode a binding indication', function (done) {
    var packet = new Packet(Packet.METHOD.BINDING, Packet.TYPE.INDICATION)
    var data = packet.encode()
    var stunDecoding = Packet.decode(data)
    var decodedPacket = stunDecoding.packet
    expect(decodedPacket.method).to.equal(Packet.METHOD.BINDING)
    expect(decodedPacket.type).to.equal(Packet.TYPE.INDICATION)
    var remainingBytes = stunDecoding.remainingBytes
    expect(remainingBytes.length).to.equal(0)
    done()
  })
})
