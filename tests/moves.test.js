const test = require('node:test'); const assert = require('node:assert');
const CD = require('./helpers').load('config', 'roster', 'input', 'fighter', 'combat', 'effects', 'citations', 'match');
const { CONFIG } = CD;

const input = (o = {}) => ({ ...CD.idleInput(), ...o });
function pair(gap = 70) {
  const a = CD.createFighter(CD.FIGHTERS.foucault, 0, false), b = CD.createFighter(CD.FIGHTERS.chomsky, 1, false);
  a.x = 400; b.x = 400 + gap;
  return [a, b];
}
// Runs an attack from `a` (first tick input `first`, then `hold` every tick) while `b` holds `bHold`.
function exchange(a, b, first, { hold = {}, bHold = {}, ticks = 50 } = {}) {
  const events = [];
  for (let i = 0; i < ticks; i++) {
    CD.updateFighter(a, input(i === 0 ? { ...hold, ...first } : hold), b);
    CD.updateFighter(b, input(bHold), a);
    events.push(...CD.resolveTrade(a, b));
  }
  return events;
}
const AWAY_B = { right: true }; // b faces left, so right is away

test('every fighter has the directional moves', () => {
  for (const id of CD.fighterIds) for (const k of ['punch', 'kick', 'lowPunch', 'sweep', 'airPunch', 'diveKick']) {
    assert.ok(CD.FIGHTERS[id].moves[k], `${id}.${k}`);
  }
  assert.strictEqual(CD.FIGHTERS.foucault.moves.sweep.level, 'low');
  assert.strictEqual(CD.FIGHTERS.foucault.moves.diveKick.level, 'overhead');
});

// ----- downward (crouching) attacks -----
test('down + punch is a low jab, down + kick is a sweep', () => {
  let [a, b] = pair(300);
  CD.updateFighter(a, input({ down: true, punch: true }), b);
  assert.strictEqual(a.attack.key, 'lowPunch');
  assert.strictEqual(a.crouching, true);
  [a, b] = pair(300);
  CD.updateFighter(a, input({ down: true, kick: true }), b);
  assert.strictEqual(a.attack.key, 'sweep');
});
test('a sweep hits a standing blocker', () => {
  const [a, b] = pair();
  exchange(a, b, { kick: true }, { hold: { down: true }, bHold: AWAY_B });
  assert.strictEqual(b.hp, 100 - CD.FIGHTERS.foucault.moves.sweep.damage);
});
test('a crouch-blocker blocks the sweep', () => {
  const [a, b] = pair();
  const ev = exchange(a, b, { kick: true }, { hold: { down: true }, bHold: { ...AWAY_B, down: true } });
  assert.strictEqual(b.hp, 100);
  assert.ok(ev.some(e => e.type === 'block'));
});
test('crouch-blocking also blocks a normal kick', () => {
  const [a, b] = pair();
  exchange(a, b, { kick: true }, { bHold: { ...AWAY_B, down: true } });
  assert.strictEqual(b.hp, 100);
});
test('crouch-blocking does not walk', () => {
  const [a, b] = pair(300);
  const x0 = b.x;
  for (let i = 0; i < 10; i++) CD.updateFighter(b, input({ ...AWAY_B, down: true }), a);
  assert.strictEqual(b.x, x0);
  assert.strictEqual(b.blocking, true);
  assert.strictEqual(b.crouching, true);
});

// ----- air attacks -----
function jumpThen(a, b, button, extra = {}) {
  CD.updateFighter(a, input({ jump: true }), b);
  for (let i = 0; i < 6; i++) CD.updateFighter(a, input(), b);
  CD.updateFighter(a, input({ [button]: true, ...extra }), b);
}
test('punch in the air is an upward punch', () => {
  const [a, b] = pair(300);
  jumpThen(a, b, 'punch');
  assert.strictEqual(a.attack.key, 'airPunch');
  const m = CD.FIGHTERS.foucault.moves.airPunch;
  assert.ok(m.hitbox.y + m.hitbox.h < -150, 'hitbox is above head height');
});
test('upward punch knocks a jumping opponent out of the air', () => {
  const [a, b] = pair(90);
  // b jumps in; a stays grounded and punches upward as b comes over
  CD.updateFighter(b, input({ jump: true }), a);
  for (let i = 0; i < 6; i++) CD.updateFighter(b, input(), a);
  a.onGround = false; a.state = 'jump'; a.y = CONFIG.floorY - 1; a.vy = -1; // a hops slightly to use the air punch
  const ev = exchange(a, b, { punch: true }, { ticks: 12 });
  assert.ok(b.hp < 100, 'jumping opponent was hit');
  assert.ok(ev.some(e => e.type === 'hit'));
});
test('down + kick in the air is a dive kick that drops fast and ends on landing', () => {
  const [a, b] = pair(300);
  jumpThen(a, b, 'kick', { down: true });
  assert.strictEqual(a.attack.key, 'diveKick');
  for (let i = 0; i < 6; i++) CD.updateFighter(a, input(), b);
  assert.ok(a.vy > 8, 'falling fast');
  for (let i = 0; i < 60; i++) CD.updateFighter(a, input(), b);
  assert.strictEqual(a.onGround, true);
  assert.strictEqual(a.attack, null);
  assert.strictEqual(a.state, 'idle');
});
test('dive kick beats a crouch-blocker but a standing blocker stops it', () => {
  const hit = (bHold) => {
    const [a, b] = pair(160);
    jumpThen(a, b, 'kick', { down: true });
    exchange(a, b, {}, { bHold, ticks: 60 });
    return b.hp;
  };
  assert.ok(hit({ ...AWAY_B, down: true }) < 100);
  assert.strictEqual(hit(AWAY_B), 100);
});
test('kick in the air without down is a normal kick', () => {
  const [a, b] = pair(300);
  jumpThen(a, b, 'kick');
  assert.strictEqual(a.attack.key, 'kick');
});

// ----- dash -----
test('dash forward covers about a third of the stage, then recovers', () => {
  const [a, b] = pair(700);
  b.x = 900;
  const x0 = a.x;
  CD.updateFighter(a, input({ dashRight: true }), b);
  assert.strictEqual(a.state, 'dash');
  assert.strictEqual(CD.isActionable(a), false);
  for (let i = 0; i < 40; i++) CD.updateFighter(a, input(), b);
  const dist = a.x - x0;
  assert.ok(dist > 220 && dist < 340, `dashed ${dist}`);
  assert.strictEqual(a.state, 'idle');
});
test('dash back moves away from the opponent', () => {
  const [a, b] = pair(200);
  const x0 = a.x;
  CD.updateFighter(a, input({ dashLeft: true }), b);
  for (let i = 0; i < 40; i++) CD.updateFighter(a, input(), b);
  assert.ok(a.x < x0 - 120);
});
test('cannot dash in the air', () => {
  const [a, b] = pair(300);
  CD.updateFighter(a, input({ jump: true }), b);
  CD.updateFighter(a, input({ dashRight: true }), b);
  assert.notStrictEqual(a.state, 'dash');
});
