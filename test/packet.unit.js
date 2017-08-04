const Packet = require('../lib/packet');

const chai = require('chai');
const expect = chai.expect;

describe('#STUN operations', () => {
  it('should encode and decode a binding request', done => {
    const packet = new Packet(Packet.METHOD.BINDING, Packet.TYPE.REQUEST);
    const data = packet.encode();
    const stunDecoding = Packet.decode(data);
    const decodedPacket = stunDecoding.packet;
    expect(decodedPacket.method).to.equal(Packet.METHOD.BINDING)
    expect(decodedPacket.type).to.equal(Packet.TYPE.REQUEST)
    const remainingBytes = stunDecoding.remainingBytes;
    expect(remainingBytes.length).to.equal(0)
    done()
  })

  it('should encode and decode a binding indication', done => {
    const packet = new Packet(Packet.METHOD.BINDING, Packet.TYPE.INDICATION);
    const data = packet.encode();
    const stunDecoding = Packet.decode(data);
    const decodedPacket = stunDecoding.packet;
    expect(decodedPacket.method).to.equal(Packet.METHOD.BINDING)
    expect(decodedPacket.type).to.equal(Packet.TYPE.INDICATION)
    const remainingBytes = stunDecoding.remainingBytes;
    expect(remainingBytes.length).to.equal(0)
    done()
  })
})
