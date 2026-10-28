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
  assert.deepStrictEqual(Object.keys(CD.idleInput()).sort(), ['attack', 'cite', 'dashLeft', 'dashRight', 'down', 'jump', 'left', 'right', 'special']);
});
test('P1 and P2 keys held simultaneously both register', () => {
  const { t, k } = kb();
  down(t, 'KeyA'); down(t, 'KeyF'); down(t, 'ArrowRight'); down(t, 'KeyL');
  const p1 = k.controllers[0].read(), p2 = k.controllers[1].read();
  assert.strictEqual(p1.left, true); assert.strictEqual(p1.attack, true); assert.strictEqual(p1.right, false);
  assert.strictEqual(p2.right, true); assert.strictEqual(p2.special, true); assert.strictEqual(p2.attack, false);
});
test('up key is a jump edge', () => {
  const { t, k } = kb();
  down(t, 'KeyW');
  assert.strictEqual(k.controllers[0].read().jump, true);
  k.endTick();
  assert.strictEqual(k.controllers[0].read().jump, false);
});
test('holding attack fires once', () => {
  const { t, k } = kb();
  down(t, 'KeyK');
  assert.strictEqual(k.controllers[1].read().attack, true);
  k.endTick();
  down(t, 'KeyK', { repeat: true });
  assert.strictEqual(k.controllers[1].read().attack, false);
  up(t, 'KeyK'); down(t, 'KeyK');
  assert.strictEqual(k.controllers[1].read().attack, true);
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

test('double-tapping a direction dashes that way', () => {
  const { t, k } = kb();
  down(t, 'KeyD'); up(t, 'KeyD'); k.endTick(); k.endTick();
  down(t, 'KeyD');
  assert.strictEqual(k.controllers[0].read().dashRight, true);
  assert.strictEqual(k.controllers[0].read().dashLeft, false);
  k.endTick();
  assert.strictEqual(k.controllers[0].read().dashRight, false);
});
test('slow taps do not dash', () => {
  const { t, k } = kb();
  down(t, 'ArrowLeft'); up(t, 'ArrowLeft');
  for (let i = 0; i < 20; i++) k.endTick();
  down(t, 'ArrowLeft');
  assert.strictEqual(k.controllers[1].read().dashLeft, false);
});
test('a double tap by one player does not dash the other', () => {
  const { t, k } = kb();
  down(t, 'KeyA'); up(t, 'KeyA'); k.endTick(); down(t, 'KeyA');
  assert.strictEqual(k.controllers[0].read().dashLeft, true);
  assert.strictEqual(k.controllers[1].read().dashLeft, false);
});
test('P pauses like Escape (preventDefault and global edge)', () => {
  const { t, k } = kb();
  assert.strictEqual(down(t, 'KeyP').defaultPrevented, true);
  assert.strictEqual(k.pressedGlobal('KeyP'), true);
});
