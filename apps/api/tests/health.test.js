import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';

test('la aplicacion expone el modulo de salud', () => {
  assert.equal(typeof app, 'function');
});
