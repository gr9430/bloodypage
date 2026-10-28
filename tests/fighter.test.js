const test = require('node:test'); const assert = require('node:assert');
const CD = require('./helpers').load('config', 'roster', 'input', 'fighter', 'combat');
const { CONFIG } = CD;

const input = (o = {}) => ({ ...CD.idleInput(), ...o });
const pair = () => [CD.createFighter(CD.FIGHTERS.foucault, 0, false), CD.createFighter(CD.FIGHTERS.chomsky, 1, false)];

test('fighters spawn on the floor facing each other', () => {
  const [a, b] = pair();
  assert.strictEqual(a.x, 300); assert.strictEqual(b.x, 660);
  assert.strictEqual(a.facing, 1); assert.strictEqual(b.facing, -1);
  assert.strictEqual(a.y, CONFIG.floorY); assert.strictEqual(a.hp, 100);
});
test('walk right moves x by walkSpeed per tick', () => {
  const [a, b] = pair();
  CD.updateFighter(a, input({ right: true }), b);
  assert.strictEqual(a.x, 300 + CONFIG.walkSpeed);
  assert.strictEqual(a.state, 'walk');
});
test('jump rises then lands on floorY with onGround true', () => {
  const [a, b] = pair();
  CD.updateFighter(a, input({ jump: true }), b);
  let minY = a.y;
  for (let i = 0; i < 60; i++) { CD.updateFighter(a, input(), b); minY = Math.min(minY, a.y); }
  assert.ok(minY < CONFIG.floorY - 100);
  assert.strictEqual(a.y, CONFIG.floorY); assert.strictEqual(a.onGround, true); assert.strictEqual(a.state, 'idle');
});
test('cannot walk past stage bounds', () => {
  const [a, b] = pair();
  b.x = 800;
  for (let i = 0; i < 300; i++) CD.updateFighter(a, input({ left: true }), b);
  assert.strictEqual(a.x, CONFIG.stageLeft);
});
test('holding away from opponent while grounded sets blocking and backs off slowly', () => {
  const [a, b] = pair();
  CD.updateFighter(a, input({ left: true }), b);
  assert.strictEqual(a.blocking, true);
  assert.ok(a.x < 300 && a.x > 300 - CONFIG.walkSpeed);
});
test('holding toward opponent does not block', () => {
  const [a, b] = pair();
  CD.updateFighter(a, input({ right: true }), b);
  assert.strictEqual(a.blocking, false);
});
test('crouch shrinks hurtbox height to 100', () => {
  const [a, b] = pair();
  assert.strictEqual(CD.hurtbox(a).h, 160);
  CD.updateFighter(a, input({ down: true }), b);
  assert.strictEqual(a.state, 'crouch');
  assert.strictEqual(CD.hurtbox(a).h, 100);
  assert.strictEqual(CD.hurtbox(a).y + CD.hurtbox(a).h, CONFIG.floorY);
});
test('crossover flips facing and block direction', () => {
  const [a, b] = pair();
  a.x = 500; b.x = 400;
  CD.updateFighter(a, input(), b);
  assert.strictEqual(a.facing, -1);
  CD.updateFighter(a, input({ right: true }), b);
  assert.strictEqual(a.blocking, true);
  CD.updateFighter(a, input({ left: true }), b);
  assert.strictEqual(a.blocking, false);
});
test('rectsOverlap', () => {
  assert.ok(CD.rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 }));
  assert.ok(!CD.rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 }));
});
test('separateFighters pushes overlapping fighters apart', () => {
  const [a, b] = pair();
  a.x = 480; b.x = 500;
  CD.separateFighters(a, b);
  assert.ok(b.x - a.x >= 70);
  assert.ok(a.x < 480 && b.x > 500);
});
test('separateFighters keeps both inside the stage at a wall', () => {
  const [a, b] = pair();
  a.x = CONFIG.stageLeft; b.x = CONFIG.stageLeft + 10;
  CD.separateFighters(a, b);
  assert.strictEqual(a.x, CONFIG.stageLeft);
  assert.ok(b.x - a.x >= 70);
});
