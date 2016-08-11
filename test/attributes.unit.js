'use strict'

var Attributes = require('../lib/attributes')
var Packet = require('../lib/packet')

var chai = require('chai')
var expect = chai.expect

describe('#STUN attributes', function () {
  it('should encode and decode an address attribute', function (done) {
    var testAddress = '127.0.0.1'
    var testPort = 2345
    var address = require('../lib/attributes/address')
    var bytes = address.encode(testAddress, testPort)
    var decodedAddress = address.decode(bytes)
    expect(decodedAddress.family).to.equal(4)
    expect(decodedAddress.address).to.exist
    expect(decodedAddress.address).to.equal(testAddress)
    expect(decodedAddress.port).to.exist
    expect(decodedAddress.port).to.equal(testPort)
    done()
  })

  it('should encode and decode an alternate-server attribute', function (done) {
    var testAddress = '127.0.0.1'
    var testPort = 2345
    var AlternateServer = Attributes.AlternateServer
    var alternateServer = new AlternateServer(testAddress, testPort)
    var bytes = alternateServer.encode()
    var decodedAlternateServer = AlternateServer.decode(bytes.slice(4, bytes.lenght))
    expect(decodedAlternateServer.address).to.exist
    expect(decodedAlternateServer.address).to.equal(testAddress)
    expect(decodedAlternateServer.port).to.exist
    expect(decodedAlternateServer.port).to.equal(testPort)
    done()
  })

  it('should encode and decode an error code attribute', function (done) {
    var testCode = 401
    var ErrorCode = Attributes.ErrorCode
    var errorCode = new ErrorCode(testCode)
    var bytes = errorCode.encode()
    var decodedErrorCode = ErrorCode.decode(bytes.slice(4, bytes.lenght))
    expect(decodedErrorCode.code).to.exist
    expect(decodedErrorCode.code).to.equal(testCode)
    expect(decodedErrorCode.reason).to.exist
    expect(decodedErrorCode.reason).to.equal('Unauthorized')
    done()
  })

  it('should encode and decode a mapped-address attribute', function (done) {
    var testAddress = '127.0.0.1'
    var testPort = 2345
    var MappedAddress = Attributes.MappedAddress
    var mappedAddress = new MappedAddress(testAddress, testPort)
    var bytes = mappedAddress.encode()
    var decodedMappedAddress = MappedAddress.decode(bytes.slice(4, bytes.lenght))
    expect(decodedMappedAddress.address).to.exist
    expect(decodedMappedAddress.address).to.equal(testAddress)
    expect(decodedMappedAddress.port).to.exist
    expect(decodedMappedAddress.port).to.equal(testPort)
    done()
  })

  it('should encode and decode a message-integrity attribute', function (done) {
    var testRealm = 'test.io'
    var testUser = 'foo'
    var testPwd = 'bar'
    var testPacket = new Buffer('abcdefghjkl')
    var MessageIntegrity = Attributes.MessageIntegrity
    var messageIntegrity = new MessageIntegrity({
      username: testUser,
      password: testPwd,
      realm: testRealm
    })
    var bytes = messageIntegrity.encode(testPacket)
    var decodedMessageIntegrity = MessageIntegrity.decode(bytes.slice(4, bytes.lenght))
    expect(decodedMessageIntegrity).to.exist
    expect(decodedMessageIntegrity.hash).to.exist
    done()
  })

  it('should encode and decode a nonce attribute', function (done) {
    var testNonce = 'abcdefg'
    var Nonce = Attributes.Nonce
    var nonce = new Nonce(testNonce)
    var bytes = nonce.encode()
    var length = bytes.readUInt16BE(2)
    var decodedNonce = Nonce.decode(bytes.slice(4, 4 + length))
    expect(decodedNonce.value).to.exist
    expect(decodedNonce.value).to.equal(testNonce)
    done()
  })

  it('should encode and decode a realm attribute', function (done) {
    var testRealm = 'test.io'
    var Realm = Attributes.Realm
    var realm = new Realm(testRealm)
    var bytes = realm.encode()
    var length = bytes.readUInt16BE(2)
    var decodedRealm = Realm.decode(bytes.slice(4, 4 + length))
    expect(decodedRealm.value).to.exist
    expect(decodedRealm.value).to.equal(testRealm)
    done()
  })

  it('should encode and decode a software attribute', function (done) {
    var testDescription = 'my awesome product'
    var Software = Attributes.Software
    var software = new Software(testDescription)
    var bytes = software.encode()
    var length = bytes.readUInt16BE(2)
    var decodedSoftware = Software.decode(bytes.slice(4, 4 + length))
    expect(decodedSoftware.description).to.exist
    expect(decodedSoftware.description).to.equal(testDescription)
    done()
  })

  it('should encode and decode an unknown-attribtes attribute', function (done) {
    // TODO: add test case once encode operation of unknown-attributes is implemented
    done()
  })

  it('should encode and decode a username attribute', function (done) {
    var testUser = 'foo'
    var Username = Attributes.Username
    var username = new Username(testUser)
    var bytes = username.encode()
    var length = bytes.readUInt16BE(2)
    var decodedUsername = Username.decode(bytes.slice(4, 4 + length))
    expect(decodedUsername.name).to.exist
    expect(decodedUsername.name).to.equal(testUser)
    done()
  })

  it('should encode and decode an xor-mapped-address attribute', function (done) {
    var testAddress = '127.0.0.1'
    var testPort = 2345
    var tid = Math.random() * Packet.TID_MAX
    var magic = Packet.MAGIC_COOKIE
    var testHeaderBytes = createTestHeaderBytes(magic, tid)
    var XORMappedAddress = Attributes.XORMappedAddress
    var xorMappedAddress = new XORMappedAddress(testAddress, testPort)
    var bytes = xorMappedAddress.encode(magic, tid)
    var decodedXORMappedAddress = XORMappedAddress.decode(bytes.slice(4, bytes.lenght), testHeaderBytes)
    expect(decodedXORMappedAddress.address).to.exist
    expect(decodedXORMappedAddress.address).to.equal(testAddress)
    expect(decodedXORMappedAddress.port).to.exist
    expect(decodedXORMappedAddress.port).to.equal(testPort)
    done()
  })
})

function createTestHeaderBytes (magic, tid) {
  var encodedHeader = new Buffer(Packet.HEADER_LENGTH)
  var type = Packet.METHOD.ALLOCATE
  var length = 0
  encodedHeader.writeUInt16BE((type & 0x3fff), 0)
  encodedHeader.writeUInt16BE(length, 2)
  encodedHeader.writeUInt32BE(magic, 4)
  encodedHeader.writeUInt32BE(0, 8)
  encodedHeader.writeUInt32BE(0, 12)
  encodedHeader.writeUInt32BE(tid, 16)
  return encodedHeader
}
