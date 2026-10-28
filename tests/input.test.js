const test = require('node:test'); const assert = require('node:assert');
const { load, fakeTarget } = require('./helpers');
const CD = load('config', 'input');

function kb() {
  const t = fakeTarget();
  return { t, k: CD.createKeyboard(t, CD.KEYMAP) };
}
const down = (t, code, extra) => t.dispatch('keydown', { code, ...extra });
const up = (t, code) => t.dispatch('keyup', { code });

test('idleInput is all false', () => {
  assert.ok(Object.values(CD.idleInput()).every(v => v === false));
  assert.deepStrictEqual(Object.keys(CD.idleInput()).sort(), ['cite', 'down', 'jump', 'kick', 'left', 'punch', 'right', 'special']);
});
test('P1 and P2 keys held simultaneously both register', () => {
  const { t, k } = kb();
  down(t, 'KeyA'); down(t, 'KeyF'); down(t, 'ArrowRight'); down(t, 'KeyL');
  const p1 = k.controllers[0].read(), p2 = k.controllers[1].read();
  assert.strictEqual(p1.left, true); assert.strictEqual(p1.punch, true); assert.strictEqual(p1.right, false);
  assert.strictEqual(p2.right, true); assert.strictEqual(p2.kick, true); assert.strictEqual(p2.punch, false);
});
test('up key is a jump edge', () => {
  const { t, k } = kb();
  down(t, 'KeyW');
  assert.strictEqual(k.controllers[0].read().jump, true);
  k.endTick();
  assert.strictEqual(k.controllers[0].read().jump, false);
});
test('holding punch fires once', () => {
  const { t, k } = kb();
  down(t, 'KeyK');
  assert.strictEqual(k.controllers[1].read().punch, true);
  k.endTick();
  down(t, 'KeyK', { repeat: true });
  assert.strictEqual(k.controllers[1].read().punch, false);
  up(t, 'KeyK'); down(t, 'KeyK');
  assert.strictEqual(k.controllers[1].read().punch, true);
});
test('held directions persist across ticks until keyup', () => {
  const { t, k } = kb();
  down(t, 'KeyD'); k.endTick();
  assert.strictEqual(k.controllers[0].read().right, true);
  up(t, 'KeyD');
  assert.strictEqual(k.controllers[0].read().right, false);
});
test('blur clears held keys', () => {
  const { t, k } = kb();
  down(t, 'KeyD'); down(t, 'ArrowLeft');
  t.dispatch('blur');
  assert.strictEqual(k.controllers[0].read().right, false);
  assert.strictEqual(k.controllers[1].read().left, false);
});
test('mapped keys are preventDefaulted', () => {
  const { t } = kb();
  assert.strictEqual(down(t, 'ArrowDown').defaultPrevented, true);
  assert.strictEqual(down(t, 'Semicolon').defaultPrevented, true);
  assert.strictEqual(down(t, 'Enter').defaultPrevented, true);
  assert.strictEqual(down(t, 'KeyZ').defaultPrevented, false);
});
test('Enter edge is visible through pressedGlobal', () => {
  const { t, k } = kb();
  down(t, 'Enter');
  assert.strictEqual(k.pressedGlobal('Enter'), true);
  k.endTick();
  assert.strictEqual(k.pressedGlobal('Enter'), false);
});
test('detach stops listening', () => {
  const { t, k } = kb();
  k.detach();
  down(t, 'KeyD');
  assert.strictEqual(k.controllers[0].read().right, false);
});
