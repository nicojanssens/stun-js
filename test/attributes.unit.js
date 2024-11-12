const Attributes = require('../lib/attributes');
const Packet = require('../lib/packet');
const chai = require('chai');
const expect = chai.expect;

describe('#STUN attributes', () => {
  it('should encode and decode an address attribute', done => {
    const testAddress = '127.0.0.1';
    const testPort = 2345;
    const address = require('../lib/attributes/address');
    const bytes = address.encode(testAddress, testPort);
    const decodedAddress = address.decode(bytes);
    expect(decodedAddress.family).to.equal(4)
    expect(decodedAddress.address).to.exist
    expect(decodedAddress.address).to.equal(testAddress)
    expect(decodedAddress.port).to.exist
    expect(decodedAddress.port).to.equal(testPort)
    done()
  })

  it('should encode and decode an alternate-server attribute', done => {
    const testAddress = '127.0.0.1';
    const testPort = 2345;
    const AlternateServer = Attributes.AlternateServer;
    const alternateServer = new AlternateServer(testAddress, testPort);
    const bytes = alternateServer.encode();
    const decodedAlternateServer = AlternateServer.decode(bytes.subarray(4, bytes.lenght));
    expect(decodedAlternateServer.address).to.exist
    expect(decodedAlternateServer.address).to.equal(testAddress)
    expect(decodedAlternateServer.port).to.exist
    expect(decodedAlternateServer.port).to.equal(testPort)
    done()
  })

  it('should encode and decode an error code attribute', done => {
    const testCode = 401;
    const ErrorCode = Attributes.ErrorCode;
    const errorCode = new ErrorCode(testCode);
    const bytes = errorCode.encode();
    const decodedErrorCode = ErrorCode.decode(bytes.subarray(4, bytes.lenght));
    expect(decodedErrorCode.code).to.exist
    expect(decodedErrorCode.code).to.equal(testCode)
    expect(decodedErrorCode.reason).to.exist
    expect(decodedErrorCode.reason).to.equal('Unauthorized')
    done()
  })

  it('should encode and decode a mapped-address attribute', done => {
    const testAddress = '127.0.0.1';
    const testPort = 2345;
    const MappedAddress = Attributes.MappedAddress;
    const mappedAddress = new MappedAddress(testAddress, testPort);
    const bytes = mappedAddress.encode();
    const decodedMappedAddress = MappedAddress.decode(bytes.subarray(4, bytes.lenght));
    expect(decodedMappedAddress.address).to.exist
    expect(decodedMappedAddress.address).to.equal(testAddress)
    expect(decodedMappedAddress.port).to.exist
    expect(decodedMappedAddress.port).to.equal(testPort)
    done()
  })

  it('should encode and decode a message-integrity attribute', done => {
    const testRealm = 'test.io';
    const testUser = 'foo';
    const testPwd = 'bar';
    const testPacket = Buffer.from('abcdefghjkl');
    const MessageIntegrity = Attributes.MessageIntegrity;
    const messageIntegrity = new MessageIntegrity({
      username: testUser,
      password: testPwd,
      realm: testRealm
    });
    const bytes = messageIntegrity.encode(testPacket);
    const decodedMessageIntegrity = MessageIntegrity.decode(bytes.subarray(4, bytes.lenght));
    expect(decodedMessageIntegrity).to.exist
    expect(decodedMessageIntegrity.hash).to.exist
    done()
  })

  it('should encode and decode a nonce attribute', done => {
    const testNonce = 'abcdefg';
    const Nonce = Attributes.Nonce;
    const nonce = new Nonce(testNonce);
    const bytes = nonce.encode();
    const length = bytes.readUInt16BE(2);
    const decodedNonce = Nonce.decode(bytes.subarray(4, 4 + length));
    expect(decodedNonce.value).to.exist
    expect(decodedNonce.value).to.equal(testNonce)
    done()
  })

  it('should encode and decode a realm attribute', done => {
    const testRealm = 'test.io';
    const Realm = Attributes.Realm;
    const realm = new Realm(testRealm);
    const bytes = realm.encode();
    const length = bytes.readUInt16BE(2);
    const decodedRealm = Realm.decode(bytes.subarray(4, 4 + length));
    expect(decodedRealm.value).to.exist
    expect(decodedRealm.value).to.equal(testRealm)
    done()
  })

  it('should encode and decode a software attribute', done => {
    const testDescription = 'my awesome product';
    const Software = Attributes.Software;
    const software = new Software(testDescription);
    const bytes = software.encode();
    const length = bytes.readUInt16BE(2);
    const decodedSoftware = Software.decode(bytes.subarray(4, 4 + length));
    expect(decodedSoftware.description).to.exist
    expect(decodedSoftware.description).to.equal(testDescription)
    done()
  })

  it('should encode and decode an unknown-attribtes attribute', done => {
    // TODO: add test case once encode operation of unknown-attributes is implemented
    done()
  })

  it('should encode and decode a username attribute', done => {
    const testUser = 'foo';
    const Username = Attributes.Username;
    const username = new Username(testUser);
    const bytes = username.encode();
    const length = bytes.readUInt16BE(2);
    const decodedUsername = Username.decode(bytes.subarray(4, 4 + length));
    expect(decodedUsername.name).to.exist
    expect(decodedUsername.name).to.equal(testUser)
    done()
  })

  it('should encode and decode an xor-mapped-address attribute', done => {
    const testAddress = '127.0.0.1';
    const testPort = 2345;
    const tid = Math.random() * Packet.TID_MAX;
    const magic = Packet.MAGIC_COOKIE;
    const testHeaderBytes = createTestHeaderBytes(magic, tid);
    const XORMappedAddress = Attributes.XORMappedAddress;
    const xorMappedAddress = new XORMappedAddress(testAddress, testPort);
    const bytes = xorMappedAddress.encode(magic, tid);
    const decodedXORMappedAddress = XORMappedAddress.decode(bytes.subarray(4, bytes.lenght), testHeaderBytes);
    expect(decodedXORMappedAddress.address).to.exist
    expect(decodedXORMappedAddress.address).to.equal(testAddress)
    expect(decodedXORMappedAddress.port).to.exist
    expect(decodedXORMappedAddress.port).to.equal(testPort)
    done()
  })
})

function createTestHeaderBytes (magic, tid) {
  const encodedHeader = Buffer.alloc(Packet.HEADER_LENGTH);
  const type = Packet.METHOD.ALLOCATE;
  const length = 0;
  encodedHeader.writeUInt16BE((type & 0x3fff), 0)
  encodedHeader.writeUInt16BE(length, 2)
  encodedHeader.writeUInt32BE(magic, 4)
  encodedHeader.writeUInt32BE(0, 8)
  encodedHeader.writeUInt32BE(0, 12)
  encodedHeader.writeUInt32BE(tid, 16)
  return encodedHeader
}
