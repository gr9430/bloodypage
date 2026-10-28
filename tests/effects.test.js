const test = require('node:test'); const assert = require('node:assert');
const CD = require('./helpers').load('config', 'roster', 'input', 'fighter', 'combat', 'effects');

const input = (o = {}) => ({ ...CD.idleInput(), ...o });
function vs(id, gap = 200) {
  const a = CD.createFighter(CD.FIGHTERS[id], 0, false), b = CD.createFighter(CD.FIGHTERS.chomsky, 1, false);
  a.x = 400; b.x = 400 + gap;
  return [a, b];
}
function run(effects, fighters, ticks) {
  const events = [];
  for (let i = 0; i < ticks; i++) {
    const r = CD.updateEffects(effects, fighters);
    effects = r.effects; events.push(...r.events);
  }
  return { effects, events };
}

test('pressing special emits a special event at startup', () => {
  const [a, b] = vs('foucault');
  const ev = [];
  for (let i = 0; i < 20; i++) ev.push(...CD.updateFighter(a, input(i === 0 ? { special: true } : {}), b));
  assert.strictEqual(ev.filter(e => e.type === 'special').length, 1);
});
test('panopticon stuns target for stunTicks after arming', () => {
  const [a, b] = vs('foucault');
  let effects = [CD.spawnSpecial(a, b)];
  let r = run(effects, [a, b], 29);
  assert.strictEqual(b.hp, 100);
  r = run(r.effects, [a, b], 3);
  assert.strictEqual(b.state, 'stunned');
  assert.strictEqual(b.stateTimer, CD.FIGHTERS.foucault.special.stunTicks);
  assert.ok(b.hp < 100);
});
test('universal grammar projectile travels toward opponent and is removed off-stage', () => {
  const [a, b] = vs('chomsky', 300);
  const e = CD.spawnSpecial(a, b);
  assert.ok(e.vx > 0);
  let r = run([e], [a, b], 60);
  assert.ok(b.hp < 100);
  assert.strictEqual(r.effects.length, 0);
  // miss case: opponent jumped away far above; projectile leaves stage
  const [c, d] = vs('chomsky', 300); d.y = 100; d.onGround = false;
  r = run([CD.spawnSpecial(c, d)], [c, d], 200);
  assert.strictEqual(r.effects.length, 0);
});
test('medium is the message TV drops onto target and hits once', () => {
  const [a, b] = vs('mcluhan', 300);
  const e = CD.spawnSpecial(a, b);
  assert.ok(e.y < 0);
  const r = run([e], [a, b], 120);
  assert.strictEqual(b.hp, 100 - CD.FIGHTERS.mcluhan.special.damage);
  assert.strictEqual(r.events.filter(x => x.type === 'hit').length, 1);
});
test('delinking knocks back further than kick', () => {
  const [a, b] = vs('mignolo', 80);
  const x0 = b.x;
  run([CD.spawnSpecial(a, b)], [a, b], 2);
  for (let i = 0; i < 30; i++) CD.updateFighter(b, input(), a);
  const burstDist = b.x - x0;
  const [c, d] = vs('mignolo', 80);
  const k = CD.FIGHTERS.mignolo.moves.kick;
  CD.applyHit(d, { damage: k.damage, knockback: k.knockback, hitstun: k.hitstun, fromX: c.x });
  for (let i = 0; i < 30; i++) CD.updateFighter(d, input(), c);
  assert.ok(burstDist > 2 * (d.x - x0), `${burstDist} vs ${d.x - x0}`);
});
test('effects never hit their owner', () => {
  const [a, b] = vs('mignolo', 600);
  const e = CD.spawnSpecial(a, b);
  e.x = a.x - 60; // sitting right on the owner
  run([e], [a, b], 15);
  assert.strictEqual(a.hp, 100);
});
test('blocking defender blocks a projectile coming from the front', () => {
  const [a, b] = vs('chomsky', 300);
  let effects = [CD.spawnSpecial(a, b)];
  const events = [];
  for (let i = 0; i < 60; i++) {
    CD.updateFighter(b, input({ right: true }), a);
    const r = CD.updateEffects(effects, [a, b]); effects = r.effects; events.push(...r.events);
  }
  assert.strictEqual(b.hp, 100);
  assert.ok(events.some(e => e.type === 'block'));
});
