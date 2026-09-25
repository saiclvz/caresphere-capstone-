import assert from 'node:assert/strict';
import test from 'node:test';
import { permissionsByRole } from '../src/middleware/auth.js';

test('administrator has privileged health, audit, inventory, and QR permissions', () => {
  for (const permission of ['VIEW_HEALTH_RECORD', 'EDIT_HEALTH_RECORD', 'VIEW_AUDIT_LOGS', 'MANAGE_INVENTORY', 'GENERATE_QR']) {
    assert.equal(permissionsByRole.ADMIN.has(permission), true);
  }
});

test('health-authorized users cannot view audit logs', () => {
  assert.equal(permissionsByRole.HEALTH.has('VIEW_HEALTH_RECORD'), true);
  assert.equal(permissionsByRole.HEALTH.has('VIEW_AUDIT_LOGS'), false);
});

test('visitor and donor roles can resolve but cannot generate child QR codes', () => {
  assert.equal(permissionsByRole.VISITOR.has('RESOLVE_QR'), true);
  assert.equal(permissionsByRole.VISITOR.has('GENERATE_QR'), false);
  assert.equal(permissionsByRole.DONOR.has('RESOLVE_QR'), true);
  assert.equal(permissionsByRole.DONOR.has('GENERATE_QR'), false);
});