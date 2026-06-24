const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildContactsList, contactForDept } = require('../utils/contacts');

describe('buildContactsList', () => {
  it('returns 14 department contacts', () => {
    const list = buildContactsList();
    assert.equal(list.length, 14);
  });

  it('includes required fields for each contact', () => {
    const list = buildContactsList();
    for (const c of list) {
      assert.ok(c.deptId);
      assert.ok(c.deptName);
      assert.ok(c.kra);
      assert.ok(c.owner);
    }
  });

  it('contactForDept finds by id', () => {
    const c = contactForDept('D01');
    assert.equal(c.deptId, 'D01');
    assert.ok(c.phone);
  });
});
