const PADDING_VALUE = '0x00';

const getBytes = (length) => {
  const paddingBytes = new Buffer(((4 - length) % 4) % 4);
  for (let i = 0; i < paddingBytes.length; i += 1) {
    paddingBytes[i] = PADDING_VALUE;
  }
  return paddingBytes;
};

exports.getBytes = getBytes;
