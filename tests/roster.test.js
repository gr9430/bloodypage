const test = require('node:test'); const assert = require('node:assert');
const CD = require('./helpers').load('config', 'roster');

test('four playable fighters', () => {
  assert.deepStrictEqual(CD.fighterIds, ['foucault', 'chomsky', 'mcluhan', 'ong']);
  for (const id of CD.fighterIds) {
    const f = CD.FIGHTERS[id];
    for (const k of ['name', 'look', 'altLook', 'moves', 'special', 'citations', 'assist', 'winQuote']) assert.ok(f[k], `${id}.${k}`);
    assert.ok(f.citations.length >= 2 && f.citations.length <= 3);
  }
});
test('spec citation lists', () => {
  assert.deepStrictEqual(CD.FIGHTERS.foucault.citations, ['Gilles Deleuze', 'Friedrich Nietzsche', 'Judith Butler']);
  assert.deepStrictEqual(CD.FIGHTERS.chomsky.citations, ['Edward Herman', 'Howard Zinn', 'Mikhail Bakunin']);
  assert.deepStrictEqual(CD.FIGHTERS.mcluhan.citations, ['Harold Innis', 'Walter Ong', 'Wyndham Lewis']);
  assert.deepStrictEqual(CD.FIGHTERS.ong.citations, ['Eric Havelock', 'Milman Parry', 'Marshall McLuhan']);
});
test('spec specials', () => {
  assert.strictEqual(CD.FIGHTERS.foucault.special.name, 'Panopticon');
  assert.strictEqual(CD.FIGHTERS.foucault.special.kind, 'stunZone');
  assert.strictEqual(CD.FIGHTERS.chomsky.special.kind, 'projectile');
  assert.strictEqual(CD.FIGHTERS.mcluhan.special.kind, 'drop');
  assert.strictEqual(CD.FIGHTERS.ong.special.name, 'Secondary Orality');
  assert.strictEqual(CD.FIGHTERS.ong.special.kind, 'burst');
  let maxNormal = 0;
  for (const id of CD.fighterIds) for (const m of Object.values(CD.FIGHTERS[id].moves)) maxNormal = Math.max(maxNormal, m.knockback);
  assert.ok(CD.FIGHTERS.ong.special.knockback >= 2 * maxNormal);
});
test('every fighter citation resolves', () => {
  for (const id of CD.fighterIds) for (const n of CD.FIGHTERS[id].citations) {
    const s = CD.resolveScholar(n); assert.strictEqual(s.name, n); assert.ok(s.look && s.assist);
  }
});
test('unknown name gets deterministic generic look and rush assist', () => {
  const a = CD.resolveScholar('Eve Tuck'), b = CD.resolveScholar('Eve Tuck');
  assert.deepStrictEqual(a, b);
  assert.strictEqual(a.assist.kind, 'rush');
  assert.notDeepStrictEqual(CD.resolveScholar('K. Wayne Yang').look, a.look);
});
test('fighters are summonable by name', () => {
  assert.deepStrictEqual(CD.resolveScholar('Walter Ong').look, CD.FIGHTERS.ong.look);
  assert.deepStrictEqual(CD.resolveScholar('Marshall McLuhan').look, CD.FIGHTERS.mcluhan.look);
});
test('Mignolo is no longer playable', () => {
  assert.strictEqual(CD.FIGHTERS.mignolo, undefined);
  assert.strictEqual(CD.resolveScholar('Walter Mignolo').assist.kind, 'rush');
});
test('Ong wears a clerical collar', () => {
  assert.strictEqual(CD.FIGHTERS.ong.look.outfit, 'clerical');
});
test('altLook differs from look', () => {
  for (const id of CD.fighterIds) assert.notDeepStrictEqual(CD.FIGHTERS[id].altLook, CD.FIGHTERS[id].look);
});
test('config spec values', () => {
  assert.strictEqual(CD.CONFIG.maxHp, 100);
  assert.strictEqual(CD.CONFIG.roundTicks, 3600);
  assert.strictEqual(CD.CONFIG.roundsToWin, 2);
  assert.strictEqual(CD.CONFIG.citeCooldownTicks, 480);
  assert.strictEqual(CD.KEYMAP[0].cite, 'KeyR');
  assert.strictEqual(CD.KEYMAP[1].special, 'Semicolon');
});
