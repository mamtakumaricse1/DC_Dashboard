const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { verifyPassword, isHashed, hashPassword } = require('../utils/password');

describe('verifyPassword', () => {
  it('rejects plain-text stored passwords', async () => {
    assert.equal(await verifyPassword('123', '123'), false);
    assert.equal(await verifyPassword('admin123', 'admin123'), false);
  });

  it('accepts bcrypt hashed passwords', async () => {
    const hash = await hashPassword('testpass');
    assert.ok(isHashed(hash));
    assert.equal(await verifyPassword('testpass', hash), true);
    assert.equal(await verifyPassword('wrong', hash), false);
  });

  it('rejects empty stored password', async () => {
    assert.equal(await verifyPassword('anything', ''), false);
    assert.equal(await verifyPassword('anything', null), false);
  });
});

describe('isHashed', () => {
  it('detects bcrypt prefixes', () => {
    assert.equal(isHashed('$2a$10$abcdefghijklmnopqrstuv'), true);
    assert.equal(isHashed('$2b$10$abcdefghijklmnopqrstuv'), true);
    assert.equal(isHashed('plaintext'), false);
  });
});
