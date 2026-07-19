// middleware/getRealIp.js
const getRealIp = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket.remoteAddress ||
    req.connection.remoteAddress ||
    'unknown'
  );
};

module.exports = getRealIp;
