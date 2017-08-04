const tcpTransport = require('./tcp');
const udpTransport = require('./udp');

module.exports = {
  TCP: tcpTransport,
  UDP: udpTransport,
};
