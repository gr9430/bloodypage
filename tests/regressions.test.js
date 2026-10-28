const test = require('node:test'); const assert = require('node:assert');
const { load, fakeCtx, input, toFight } = require('./helpers');
const CD = load('config', 'roster', 'input', 'fighter', 'combat', 'effects', 'citations', 'match', 'render');


test('panopticon spam is not an infinite: a defender holding back escapes', () => {
  const m = CD.createMatch('foucault', 'chomsky');
  toFight(m);
  const [a, b] = m.fighters;
  b.x = a.x + 150;
  let firstHit = false, freeTicks = 0;
  for (let i = 0; i < 900 && m.phase === 'fight'; i++) {
    if (b.hp < 100) firstHit = true;
    if (firstHit && CD.isActionable(b)) freeTicks++;
    const awayB = b.facing === 1 ? { left: true } : { right: true };
    a.meter = CD.CONFIG.meterMax; // worst case: Foucault always has a full bar
    CD.stepMatch(m, [input({ special: CD.isActionable(a) }), input(firstHit ? awayB : {})]);
  }
  assert.ok(firstHit);
  assert.ok(freeTicks > 60, `defender only had ${freeTicks} actionable ticks`);
  assert.ok(b.hp > 50, `defender hp ${b.hp}`);
});
test('a fighter cannot be re-stunned while stun-immune', () => {
  const f = CD.createFighter(CD.FIGHTERS.chomsky, 1, false);
  CD.applyHit(f, { damage: 1, knockback: 0, hitstun: 10, stunTicks: 45, fromX: 0 });
  assert.strictEqual(f.state, 'stunned');
  CD.applyHit(f, { damage: 1, knockback: 0, hitstun: 10, stunTicks: 45, fromX: 0 });
  assert.strictEqual(f.state, 'hitstun');
  assert.strictEqual(f.stateTimer, 10);
});
test('effect hit and punch on the same tick both land (double KO is a draw)', () => {
  const m = CD.createMatch('foucault', 'chomsky');
  toFight(m);
  const [a, b] = m.fighters;
  a.x = 450; b.x = 520; a.hp = 5; b.hp = 5;
  const p = CD.FIGHTERS.foucault.moves.punch;
  // B's projectile is placed so it reaches A on the tick A's punch goes active.
  CD.stepMatch(m, [input({ attack: true }), input()]);
  for (let i = 1; i < p.startup; i++) CD.stepMatch(m, [input(), input()]);
  const hb = CD.hurtbox(a);
  m.effects.push({ kind: 'projectile', owner: 1, x: hb.x + hb.w + 1, y: hb.y + 20, w: 40, h: 40, vx: -9, vy: 0,
    age: 0, armedAt: 0, hasHit: false, landed: false, damage: 10, knockback: 2, hitstun: 20, ttl: 50 });
  CD.stepMatch(m, [input(), input()]);
  assert.strictEqual(a.hp, 0); assert.strictEqual(b.hp, 0);
  assert.strictEqual(m.roundResult, 'draw');
});
test('projectile assist fires toward the opponent after the owner crosses over', () => {
  const a = CD.createFighter(CD.FIGHTERS.chomsky, 0, false), b = CD.createFighter(CD.FIGHTERS.foucault, 1, false);
  let assists = [CD.createAssist('Edward Herman', 0, a)]; // facing right at creation
  a.x = 700; b.x = 300; // owner crossed over during the enter phase
  let effects = [];
  for (let i = 0; i < 200; i++) {
    const r = CD.updateAssists(assists, [a, b]); assists = r.assists; effects.push(...r.newEffects);
    effects = CD.updateEffects(effects, [a, b]).effects;
  }
  assert.ok(b.hp < 100);
});
test('speech bubbles last by sim ticks, not render frames', () => {
  CD.clearRenderEvents();
  CD.pushRenderEvents([{ type: 'cite', player: 0, text: 'See Gilles Deleuze!' }]);
  const m = CD.createMatch('foucault', 'chomsky');
  for (let i = 0; i < 200; i++) CD.renderMatch(fakeCtx(), m, i);
  let ctx = fakeCtx(); CD.renderMatch(ctx, m, 0);
  assert.ok(ctx.texts.includes('See Gilles Deleuze!'));
  for (let i = 0; i < 70; i++) CD.tickRenderFx();
  ctx = fakeCtx(); CD.renderMatch(ctx, m, 0);
  assert.ok(!ctx.texts.includes('See Gilles Deleuze!'));
});
