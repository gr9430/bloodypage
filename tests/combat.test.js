const test = require('node:test'); const assert = require('node:assert');
const CD = require('./helpers').load('config', 'roster', 'input', 'fighter', 'combat');

const input = (o = {}) => ({ ...CD.idleInput(), ...o });
function close(gap = 70) {
  const a = CD.createFighter(CD.FIGHTERS.foucault, 0, false), b = CD.createFighter(CD.FIGHTERS.chomsky, 1, false);
  a.x = 400; b.x = 400 + gap;
  return [a, b];
}
// Steps attacker with `first` input then idle, resolving hits each tick.
function swing(a, b, first, ticks = 40) {
  const events = [];
  for (let i = 0; i < ticks; i++) {
    CD.updateFighter(a, i === 0 ? input(first) : input(), b);
    events.push(...CD.resolveFighterHits(a, b));
  }
  return events;
}

test('punch hits opponent in range once per swing', () => {
  const [a, b] = close();
  const ev = swing(a, b, { attack: true });
  assert.strictEqual(b.hp, 100 - CD.FIGHTERS.foucault.moves.punch.damage);
  assert.strictEqual(ev.filter(e => e.type === 'hit').length, 1);
});
test('punch out of range misses', () => {
  const [a, b] = close(300);
  swing(a, b, { attack: true });
  assert.strictEqual(b.hp, 100);
});
test('no hitbox during startup', () => {
  const [a, b] = close();
  CD.updateFighter(a, input({ attack: true }), b);
  assert.strictEqual(CD.attackHitbox(a), null);
});
test('blocked hit deals no damage and causes blockstun', () => {
  const [a, b] = close();
  const events = [];
  for (let i = 0; i < 12; i++) {
    CD.updateFighter(a, i === 0 ? input({ attack: true }) : input(), b);
    CD.updateFighter(b, input({ right: true }), a); // b faces left; right is away
    events.push(...CD.resolveFighterHits(a, b));
    if (b.state === 'blockstun') break;
  }
  assert.strictEqual(b.hp, 100);
  assert.strictEqual(b.state, 'blockstun');
  assert.ok(events.some(e => e.type === 'block'));
});
test('hit from behind a blocker is not blocked', () => {
  const [a, b] = close();
  b.blocking = true; b.facing = 1; // b is facing away from a
  const r = CD.applyHit(b, { damage: 5, knockback: 4, hitstun: 10, fromX: a.x });
  assert.strictEqual(r, 'hit');
  assert.strictEqual(b.hp, 95);
});
test('hit knocks defender away from the attacker', () => {
  const [a, b] = close();
  CD.applyHit(b, { damage: 5, knockback: 8, hitstun: 10, fromX: a.x });
  const x0 = b.x;
  for (let i = 0; i < 10; i++) CD.updateFighter(b, input(), a);
  assert.ok(b.x > x0);
});
test('hp floors at 0 and state becomes ko', () => {
  const [a, b] = close();
  b.hp = 3;
  assert.strictEqual(CD.applyHit(b, { damage: 10, knockback: 4, hitstun: 10, fromX: a.x }), 'hit');
  assert.strictEqual(b.hp, 0);
  assert.strictEqual(b.state, 'ko');
  assert.strictEqual(CD.applyHit(b, { damage: 10, knockback: 4, hitstun: 10, fromX: a.x }), 'ignored');
});
test('cannot start attack during hitstun', () => {
  const [a, b] = close();
  CD.applyHit(a, { damage: 1, knockback: 0, hitstun: 10, fromX: b.x });
  CD.updateFighter(a, input({ attack: true }), b);
  assert.strictEqual(a.attack, null);
  assert.strictEqual(a.state, 'hitstun');
});
test('hitstun wears off back to idle', () => {
  const [a, b] = close();
  CD.applyHit(a, { damage: 1, knockback: 0, hitstun: 10, fromX: b.x });
  for (let i = 0; i < 11; i++) CD.updateFighter(a, input(), b);
  assert.strictEqual(a.state, 'idle');
});
test('ko fighter ignores input', () => {
  const [a, b] = close();
  a.hp = 1; CD.applyHit(a, { damage: 5, knockback: 0, hitstun: 10, fromX: b.x });
  CD.updateFighter(a, input({ attack: true, right: true }), b);
  assert.strictEqual(a.attack, null); assert.strictEqual(a.state, 'ko');
});
test('attack returns to idle after full duration', () => {
  const [a, b] = close(400);
  const k = CD.FIGHTERS.foucault.moves.kick;
  CD.updateFighter(a, input({ attack: true, right: true }), b); // toward + attack = kick
  assert.strictEqual(a.attack.key, 'kick');
  assert.strictEqual(a.state, 'attack');
  for (let i = 1; i < k.startup + k.active + k.recovery; i++) CD.updateFighter(a, input(), b);
  assert.strictEqual(a.state, 'idle');
  assert.strictEqual(a.attack, null);
});
