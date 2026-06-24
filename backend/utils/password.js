const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function verifyPassword(plain, stored) {
  if (!stored) return false;
  if (!isHashed(stored)) {
    return false;
  }
  return bcrypt.compare(plain, stored);
}

function isHashed(password) {
  return password && (password.startsWith('$2a$') || password.startsWith('$2b$'));
}

module.exports = { hashPassword, verifyPassword, isHashed };
