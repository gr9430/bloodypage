# Citation Deathmatch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A two-player, one-keyboard browser fighting game with four crude-likeness theorists (Foucault, Chomsky, McLuhan, Mignolo) who summon cited scholars as Marvel vs. Capcom-style assists.

**Architecture:** Vanilla JS loaded as classic `<script>` tags. Every file attaches its exports to one global namespace, `globalThis.CD`. The game simulation (fighters, combat, citations, match) is pure and runs at a fixed 60 ticks per second, with all durations in **ticks**. It knows nothing about the DOM. Node tests `require()` the same files in dependency order and read `globalThis.CD`. Rendering, audio, keyboard and screens are thin browser layers on top. Fighters are driven by a `Controller` interface (`read() → InputFrame`), so a future AI is just another controller.

**Tech Stack:** HTML5 canvas 2D, Web Audio API, plain ES2020 JavaScript, Node 20 built-in test runner (`node --test`). No dependencies, no build step.

**Spec:** `docs/superpowers/specs/2026-10-27-citation-deathmatch-design.md`

## Global Constraints

- Game must open by double-clicking `index.html` (`file://`). Use classic `<script src>` only: no ES modules, no `fetch`, no server.
- No npm dependencies. `package.json` exists only for `"test": "node --test tests/"`.
- Every source file uses this wrapper so it works in both the browser and Node:
  `(function (CD) { ... Object.assign(CD, { exported, names }); })(globalThis.CD = globalThis.CD || {});`
- Simulation code (`config`, `roster`, `fighter`, `combat`, `effects`, `citations`, `match`) must not touch `window`, `document`, or `Math.random`. Any randomness is seeded from strings.
- No blood, gore, or dismemberment. Hits are sparks, knockback, squash, and comic text.
- No assets, characters or moves from Bloody Rage or any other existing game.
- Art is drawn with canvas shapes only. No image or audio files.
- Exact values: 100 HP, 60-second rounds (3600 ticks), first to 2 round wins, citation cooldown 8 s (480 ticks), canvas 960×540.
- Announcer copy, verbatim: `ROUND N`, `DEBATE!`, `K.O.`, `TIME!`, `DRAW`, `SUDDEN DEATH`, `<NAME> WINS THE ARGUMENT`.
- Speech bubble copy on citation: `See <Scholar Name>!`
- Controls (from `CD.KEYMAP`, the one editable table):
  - P1: W/A/S/D move, F punch, G kick, H special, R cite.
  - P2: arrow keys move, K punch, L kick, `;` special, O cite.
  - Block = hold away from the opponent.
- Global keys: Enter = confirm/rematch, Escape = back to character select, M = mute toggle.

## Review Focus

1. **Crossing over.** When one fighter jumps over the other, both must flip `facing`, and "away" for blocking must flip with them. *Test in Task 2:* `crossover flips facing and block direction`.
2. **Simultaneous KO.** If both fighters drop to 0 HP on the same tick, the round is a draw, not a P1 win from iteration order. *Test in Task 6:* `double KO is a draw`.
3. **Stuck keys.** If the window loses focus while keys are held, a fighter must not keep walking forever. *Test in Task 7:* `blur clears held keys`.
4. **Held buttons.** Holding Punch or Cite must not auto-repeat. Attacks and citations fire on press only. *Tests in Task 7* (`holding punch fires once`) *and Task 5* (`cite cannot fire again while held during cooldown`).
5. **Acting when you shouldn't.** Citing or attacking during hitstun, KO, or between rounds (intro/round-end phases) must do nothing. Cooldowns reset each round. *Tests in Task 5* (`cannot cite while in hitstun or KO`) *and Task 6* (`inputs ignored during intro and roundEnd`, `cooldowns reset on new round`).

---

## File Structure

```
index.html            canvas + script tags in dependency order
package.json          { "scripts": { "test": "node --test tests/" } }
README.md             how to play, how to add a theorist/citation
src/config.js         CD.CONFIG constants, CD.KEYMAP
src/roster.js         CD.FIGHTERS, CD.SCHOLARS, CD.resolveScholar, CD.fighterIds
src/fighter.js        CD.createFighter, CD.updateFighter, CD.hurtbox, CD.attackHitbox
src/combat.js         CD.rectsOverlap, CD.applyHit, CD.separateFighters
src/effects.js        CD.spawnSpecial, CD.updateEffects  (specials + assist attacks)
src/citations.js      CD.createCitationState, CD.tryCite, CD.tickCitation, CD.updateAssists
src/match.js          CD.createMatch, CD.stepMatch, CD.matchWinner
src/input.js          CD.createKeyboard (browser), CD.idleInput, Controller contract
src/render.js         CD.renderMatch, CD.drawFighterRig, CD.renderSelect, CD.renderWinner
src/audio.js          CD.createAudio
src/main.js           screen state machine + requestAnimationFrame loop
tests/helpers.js      loads src files into globalThis.CD for Node
tests/*.test.js
```

### Shared types (referenced by all tasks)

```js
// InputFrame: produced by any Controller once per tick
{ left, right, down,               // booleans, true while held
  jump, punch, kick, special, cite } // booleans, true ONLY on the tick the key went down

// Controller
{ read(): InputFrame }

// Rect, in world coordinates: x,y is the top-left corner. y grows downward, and the floor is CONFIG.floorY.
{ x, y, w, h }

// Event, returned from stepMatch so render/audio can react
{ type: 'hit'|'block'|'whoosh'|'special'|'cite'|'ko'|'announce', player?: 0|1, x?, y?, text? }
```

---

### Task 1: Project scaffold, config, and roster data

**Files:**
- Create: `package.json`, `src/config.js`, `src/roster.js`, `tests/helpers.js`, `tests/roster.test.js`

**Interfaces:**
- Produces:
  - `CD.CONFIG`: `{ width: 960, height: 540, floorY: 470, tickRate: 60, maxHp: 100, roundTicks: 3600, roundsToWin: 2, citeCooldownTicks: 480, gravity: 0.9, jumpVel: -17, walkSpeed: 4, stageLeft: 40, stageRight: 920, introTicks: 120, roundEndTicks: 150 }`
  - `CD.KEYMAP`: `[{ left:'KeyA', right:'KeyD', up:'KeyW', down:'KeyS', punch:'KeyF', kick:'KeyG', special:'KeyH', cite:'KeyR' }, { left:'ArrowLeft', right:'ArrowRight', up:'ArrowUp', down:'ArrowDown', punch:'KeyK', kick:'KeyL', special:'Semicolon', cite:'KeyO' }]`. Values are `KeyboardEvent.code`.
  - `CD.FIGHTERS`: object keyed by id `'foucault'|'chomsky'|'mcluhan'|'mignolo'`. Each entry is `{ id, name, look, altLook, moves: { punch, kick }, special, citations: string[], assist, winQuote }`.
    - `look`: `{ skin, hair: 'bald'|'swept'|'slick'|'white', hairColor, glasses: 'round'|'big'|'none', outfit: 'turtleneck'|'sweater'|'suit'|'scarf', outfitColor, accentColor, headScale }`
    - `altLook`: the same shape with different colors, used for mirror matches.
    - A move is `{ damage, startup, active, recovery, hitbox: Rect relative to the fighter origin when facing right, knockback, hitstun }`.
    - `special`: `{ name, kind: 'stunZone'|'projectile'|'drop'|'burst', damage, startup, recovery, knockback, stunTicks?, speed? }`
    - `assist`: `{ kind: 'rush'|'projectile'|'drop'|'stunZone'|'burst', damage, knockback, stunTicks? }`
  - `CD.SCHOLARS`: summon-only entries keyed by exact display name, each `{ name, look, assist }`. Give at least Deleuze, Nietzsche, Butler and Edward Herman bespoke looks and assist kinds. All other placeholder names may fall through to the generic look.
  - `CD.resolveScholar(name: string) → { name, look, assist }`. Lookup order:
    1. `SCHOLARS[name]`
    2. a FIGHTER whose `name === name`, using its `look` and `assist`
    3. generic: look seeded deterministically from a string hash of `name`, with `assist = { kind:'rush', damage:8, knockback:6 }`
  - `CD.fighterIds = ['foucault','chomsky','mcluhan','mignolo']`
- Values from the spec:
  - Specials:
    - Foucault: `{name:'Panopticon', kind:'stunZone', stunTicks:60}`
    - Chomsky: `{name:'Universal Grammar', kind:'projectile'}`
    - McLuhan: `{name:'The Medium Is the Message', kind:'drop'}`
    - Mignolo: `{name:'Delinking', kind:'burst'}` with knockback at least 2× any normal move's.
  - Citation lists, exact order:
    - Foucault: `['Gilles Deleuze','Friedrich Nietzsche','Judith Butler']`
    - Chomsky: `['Edward Herman','Howard Zinn','Mikhail Bakunin']`
    - McLuhan: `['Harold Innis','Walter Ong','Wyndham Lewis']`
    - Mignolo: `['Aníbal Quijano','Gloria Anzaldúa','Catherine Walsh']`
  - Looks:
    - Foucault: bald, round glasses, black turtleneck.
    - Chomsky: grey swept hair, big glasses, sweater.
    - McLuhan: slick side-part, suit.
    - Mignolo: white hair, glasses, scarf.
  - Win quotes are the builder's choice: short and in character.

- [ ] **Step 1: Create `package.json` and `tests/helpers.js`**

`tests/helpers.js` exports `load(...files)`, which `require`s `../src/<file>.js` for each name and returns `globalThis.CD`. Every test calls `load('config','roster',…)` with the files it needs, in dependency order.

- [ ] **Step 2: Write failing tests in `tests/roster.test.js`**

```js
const test = require('node:test'); const assert = require('node:assert');
const CD = require('./helpers').load('config', 'roster');

test('four playable fighters', () => {
  assert.deepStrictEqual(CD.fighterIds, ['foucault','chomsky','mcluhan','mignolo']);
  for (const id of CD.fighterIds) {
    const f = CD.FIGHTERS[id];
    for (const k of ['name','look','altLook','moves','special','citations','assist','winQuote']) assert.ok(f[k], `${id}.${k}`);
    assert.ok(f.citations.length >= 2 && f.citations.length <= 3);
  }
});
test('spec citation lists', () => {
  assert.deepStrictEqual(CD.FIGHTERS.foucault.citations, ['Gilles Deleuze','Friedrich Nietzsche','Judith Butler']);
  assert.deepStrictEqual(CD.FIGHTERS.mignolo.citations, ['Aníbal Quijano','Gloria Anzaldúa','Catherine Walsh']);
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
  assert.deepStrictEqual(CD.resolveScholar('Walter Mignolo').look, CD.FIGHTERS.mignolo.look);
});
test('altLook differs from look', () => {
  for (const id of CD.fighterIds) assert.notDeepStrictEqual(CD.FIGHTERS[id].altLook, CD.FIGHTERS[id].look);
});
```

- [ ] **Step 3: Run `npm test`.** Expected: FAIL (cannot find module `src/config.js`).
- [ ] **Step 4: Implement `src/config.js` and `src/roster.js`** using the wrapper and values above. Hash for generic looks: any small string hash (e.g. FNV-1a) picks hair, glasses, colors from fixed arrays.
- [ ] **Step 5: Run `npm test`.** Expected: all roster tests PASS.
- [ ] **Step 6: Commit:** `git add -A && git commit -m "feat: config, keymap, and roster data"`

---

### Task 2: Fighter movement, facing, and blocking state

**Files:**
- Create: `src/fighter.js`, `src/combat.js` (only `separateFighters` and `rectsOverlap` in this task), `tests/fighter.test.js`

**Interfaces:**
- Consumes: `CD.CONFIG`, `CD.FIGHTERS`
- Produces:
  - `CD.createFighter(def, playerIndex: 0|1, useAlt: boolean) → Fighter`. P1 spawns at x=300 facing 1, P2 at x=660 facing -1, both on the floor.
    `Fighter = { def, player, look, x, y, vx, vy, facing: 1|-1, hp, state, stateTimer, attack: null|{ key:'punch'|'kick'|'special', frame, hasHit }, blocking: boolean, crouching: boolean, onGround: boolean }`.
    `state` is one of `'idle'|'walk'|'jump'|'crouch'|'attack'|'hitstun'|'blockstun'|'stunned'|'ko'`. Here `x` is the horizontal center and `y` is the feet.
  - `CD.updateFighter(f: Fighter, input: InputFrame, opponent: Fighter) → Event[]`. Advances one tick: movement, gravity, facing, blocking, starting attacks and advancing attack frames. Damage is NOT applied here.
  - `CD.hurtbox(f) → Rect`. Size 70×160 standing, 70×100 crouching.
  - `CD.isActionable(f) → boolean`. True in `idle|walk|jump|crouch`.
  - `CD.rectsOverlap(a: Rect, b: Rect) → boolean`
  - `CD.separateFighters(a, b)`. Pushes overlapping grounded fighters apart equally and clamps both to `[stageLeft, stageRight]`.
- Rules:
  - Facing always points toward the opponent, updated every tick while on the ground.
  - `blocking = onGround && actionable && holding the direction away from the opponent`. A blocking fighter doesn't walk.
  - `down` while grounded → crouch.
  - `jump` while grounded → vy = jumpVel.

- [ ] **Step 1: Write failing tests** (`tests/fighter.test.js`). Each test builds fighters with `createFighter` and steps them with `updateFighter` using `{...CD.idleInput(), ...overrides}`. `idleInput` is defined here in `fighter.js` for now and moves to `input.js` in Task 7, where it is re-exported. Tests:
  - `walk right moves x by walkSpeed per tick`
  - `jump rises then lands on floorY with onGround true` (step 60 ticks)
  - `cannot walk past stage bounds`
  - `holding away from opponent while grounded sets blocking and does not move`
  - `crouch shrinks hurtbox height to 100`
  - `crossover flips facing and block direction`: put P1 at x=500 and P2 at x=400, step once with idle input, and assert P1.facing === -1. Then holding `right` (now away) gives `blocking === true`.
  - `separateFighters pushes overlapping fighters apart`
- [ ] **Step 2: Run `npm test`.** Expected: new tests FAIL.
- [ ] **Step 3: Implement** `fighter.js` and the two `combat.js` functions.
- [ ] **Step 4: Run `npm test`.** Expected: PASS.
- [ ] **Step 5: Commit:** `feat: fighter movement, facing, blocking`

---

### Task 3: Normal attacks, hit resolution, and KO

**Files:**
- Modify: `src/fighter.js`, `src/combat.js`
- Test: `tests/combat.test.js`

**Interfaces:**
- Produces:
  - `CD.attackHitbox(f) → Rect|null`. Returns the move hitbox in world space, mirrored by `facing`, only during active frames (`startup < frame <= startup+active`) and only if `!attack.hasHit`.
  - `CD.applyHit(defender, { damage, knockback, hitstun, stunTicks?, fromX }) → 'hit'|'block'|'ignored'`. Rules:
    - Returns `'ignored'` if the defender is `ko`.
    - If the defender is blocking and the hit comes from the side they face: 0 damage, state `blockstun` for ⌈hitstun/2⌉ ticks, half the knockback, returns `'block'`.
    - Otherwise: subtract damage (floor at 0) and push the defender away from `fromX` by `knockback`. Set state to `stunned` for `stunTicks` if given, else `hitstun` for `hitstun`. At 0 HP, set state `ko`. Returns `'hit'`.
- Rules:
  - `punch`/`kick` presses start an attack only when `isActionable`. The attack runs through `startup + active + recovery` ticks, then returns to `idle`.
  - Hitstun/blockstun/stunned count down and then return to `idle`.
  - A KO'd fighter ignores input.

- [ ] **Step 1: Write failing tests:**
  - `punch hits opponent in range once per swing`: step until active; call the hit resolution helper used by match (`CD.resolveFighterHits(attacker, defender) → Event[]`, add to `combat.js`); HP drops by exactly `moves.punch.damage`. Stepping through the remaining active frames doesn't hit again.
  - `punch out of range misses`
  - `blocked hit deals no damage and causes blockstun`
  - `hit from behind a blocker is not blocked`
  - `hp floors at 0 and state becomes ko`
  - `cannot start attack during hitstun`
  - `attack returns to idle after full duration`
- [ ] **Step 2: Run `npm test`.** Expected: FAIL.
- [ ] **Step 3: Implement** `attackHitbox`, `applyHit`, `resolveFighterHits(attacker, defender) → Event[]` (emits `{type:'hit'|'block', player: attacker.player, x, y}`), and the attack state progression in `updateFighter`.
- [ ] **Step 4: Run `npm test`.** Expected: PASS.
- [ ] **Step 5: Commit:** `feat: normal attacks, blocking, KO`

---

### Task 4: Effects system and the four specials

**Files:**
- Create: `src/effects.js`, `tests/effects.test.js`
- Modify: `src/fighter.js` (pressing special starts a `special` attack; when the attack reaches `startup`, the fighter emits `{type:'special', player}`, and match calls `spawnSpecial`)

**Interfaces:**
- Consumes: `CD.applyHit`, `CD.hurtbox`, `CD.rectsOverlap`
- Produces:
  - `Effect = { kind, owner: 0|1, x, y, vx, vy, w, h, damage, knockback, hitstun, stunTicks?, ttl, armedAt: tick count until it can hit, hasHit, label? }`
  - `CD.spawnEffect(kind, owner, ownerFighter, targetFighter, params) → Effect`. This is shared by specials and assists. Kind behavior:
    - `stunZone`: an eye/tower above the target's current x, armed after 30 ticks, hits once with `stunTicks`.
    - `projectile`: starts at the owner's front and travels at `speed` (default 9) × facing until it leaves the stage.
    - `drop`: appears above the target's x at y = -200 and falls with gravity until it reaches the floor, hitting on contact.
    - `burst`: a 120-wide rect in front of the owner that lasts 10 ticks.
    - `rush`: a body-sized rect that runs from the owner's off-screen edge across the stage at speed 14 (used by assists).
  - `CD.spawnSpecial(fighter, opponent) → Effect`, built from `fighter.def.special`.
  - `CD.updateEffects(effects: Effect[], fighters: [Fighter, Fighter]) → { effects: Effect[], events: Event[] }`. Moves each effect, decrements ttl, and calls `applyHit` against the non-owner when overlapping and armed (once per effect). Drops expired effects.

- [ ] **Step 1: Write failing tests:**
  - `panopticon stuns target for stunTicks after arming` (no hit before 30 ticks; state `stunned` after)
  - `universal grammar projectile travels toward opponent and is removed off-stage`
  - `medium is the message TV drops onto target and hits once`
  - `delinking knocks back further than kick` (compare x displacement)
  - `effects never hit their owner`
  - `blocking defender blocks a projectile coming from the front`
- [ ] **Step 2: Run `npm test`.** Expected: FAIL.
- [ ] **Step 3: Implement** `effects.js` and the special start in `fighter.js`.
- [ ] **Step 4: Run `npm test`.** Expected: PASS.
- [ ] **Step 5: Commit:** `feat: effects and four specials`

---

### Task 5: Citations and assists

**Files:**
- Create: `src/citations.js`, `tests/citations.test.js`

**Interfaces:**
- Consumes: `CD.resolveScholar`, `CD.spawnEffect`, `CD.isActionable`, `CD.CONFIG.citeCooldownTicks`
- Produces:
  - `CD.createCitationState(names: string[]) → { names, index: 0, cooldown: 0 }`
  - `CD.nextCitation(cs) → string`. The name that will be summoned next, for the HUD.
  - `CD.tryCite(cs, fighter, input) → string|null`. When `input.cite && cooldown === 0 && isActionable(fighter)`: returns the cited name, advances `index` (wrapping) and sets `cooldown = citeCooldownTicks`. Otherwise returns null. Citing doesn't interrupt the fighter's own state.
  - `CD.tickCitation(cs)`. Decrements the cooldown toward 0.
  - `Assist = { name, look, owner, x, y, phase: 'enter'|'attack'|'exit', timer, effectSpawned }`. It is invulnerable: nothing ever targets it.
  - `CD.createAssist(name, owner, ownerFighter) → Assist`. Enters from the owner's back edge of the screen.
  - `CD.updateAssists(assists, fighters) → { assists, newEffects: Effect[], events: Event[] }`:
    - `enter`: 30 ticks moving toward the owner.
    - `attack`: spawns exactly one effect via `spawnEffect(assist.kind, …)` and holds for 20 ticks.
    - `exit`: 30 ticks moving off-screen, then the assist is removed.
  - Cite events: `{type:'cite', player, text:'See <name>!'}`

- [ ] **Step 1: Write failing tests:**
  - `cite cycles through list in order and wraps` (zero the cooldown between calls)
  - `cooldown blocks a second cite for 480 ticks`
  - `cite cannot fire again while held during cooldown`: pass `cite:true` every tick for 479 ticks, and only one cite results.
  - `cannot cite while in hitstun or KO`
  - `assist enters, spawns exactly one effect, exits, and is removed`
  - `assist effect can be blocked`
  - `generic-name citation still produces a rush effect`
  - `cite event text is "See Gilles Deleuze!"`
- [ ] **Step 2: Run `npm test`.** Expected: FAIL.
- [ ] **Step 3: Implement** `citations.js`.
- [ ] **Step 4: Run `npm test`.** Expected: PASS.
- [ ] **Step 5: Commit:** `feat: citation summons and assists`

---

### Task 6: Match and round state machine

**Files:**
- Create: `src/match.js`, `tests/match.test.js`

**Interfaces:**
- Consumes: everything above.
- Produces:
  - `CD.createMatch(p1Id, p2Id) → Match`. If `p1Id === p2Id`, P2 uses `altLook`.
    `Match = { fighterIds, fighters:[F,F], cites:[CS,CS], effects:[], assists:[], wins:[0,0], round: 1, phase: 'intro'|'fight'|'roundEnd'|'matchEnd', phaseTimer, timer: roundTicks, roundResult: null|0|1|'draw', winner: null|0|1, suddenDeath: boolean, banner: string|null }`
  - `CD.stepMatch(m, inputs: [InputFrame, InputFrame]) → Event[]`. Advances one tick. Order of operations during `fight`:
    1. Update both fighters.
    2. Run citations.
    3. Spawn specials.
    4. Update assists, then effects.
    5. Resolve fighter hits *for both before checking KO*.
    6. Separate fighters.
    7. Decrement the timer.
    8. Check the round end.

    In other phases, ignore inputs: pass `idleInput()` to fighters so physics still settles.
  - `CD.matchWinner(wins, roundsPlayed) → 0|1|null`:
    - Any player at 2 wins → that player.
    - Otherwise, `roundsPlayed >= 3` and wins differ → the leader.
    - Otherwise null.
  - Round end:
    - If both fighters are KO → draw.
    - If one is KO → the other wins.
    - If the timer hits 0 → higher HP wins, and equal HP is a draw.
    - Banner `K.O.`, `TIME!`, or `DRAW` for `roundEndTicks`. Then either `matchEnd` (banner `<NAME> WINS THE ARGUMENT`, using the winner's `def.name.toUpperCase()`) or the next round.
  - New round:
    - Reset both fighters (createFighter positions, full HP), cooldowns to 0, citation index kept, effects and assists cleared.
    - `round++`.
    - `suddenDeath = round > 3`.
    - Intro banner `ROUND N` (or `SUDDEN DEATH`) for the first half of `introTicks`, then `DEBATE!`.
    - Emit `{type:'announce', text}` whenever the banner changes.

- [ ] **Step 1: Write failing tests:**
  - `intro shows ROUND 1 then DEBATE! then fight`
  - `inputs ignored during intro and roundEnd`: a punch pressed during intro doesn't start an attack.
  - `KO ends round and awards win`
  - `double KO is a draw`: set both HP to 1 and fire overlapping punches on the same tick. `roundResult === 'draw'` and wins stay `[0,0]`.
  - `time out awards higher hp; equal hp is DRAW`
  - `first to two wins ends match with "<NAME> WINS THE ARGUMENT"`
  - `matchWinner`: `([2,0],2)→0`, `([1,0],3)→0`, `([1,1],3)→null`, `([0,0],3)→null`, `([1,1],2)→null`
  - `round 4 is sudden death`
  - `cooldowns reset on new round`
  - `mirror match gives P2 altLook`
  - `full scripted match completes`: P1 spams punch while walking right and P2 idles. Within 5 × (roundTicks + introTicks + roundEndTicks) ticks, `phase === 'matchEnd'` and `winner === 0`.
- [ ] **Step 2: Run `npm test`.** Expected: FAIL.
- [ ] **Step 3: Implement** `match.js`.
- [ ] **Step 4: Run `npm test`.** Expected: all tests PASS.
- [ ] **Step 5: Commit:** `feat: match and round flow`

---

### Task 7: Keyboard controllers

**Files:**
- Create: `src/input.js`, `tests/input.test.js`
- Modify: `src/fighter.js` (remove `idleInput`; it now lives in `input.js`, which must load before `fighter.js` in both `helpers.load` order and `index.html`. Update the earlier tests' `load()` calls.)

**Interfaces:**
- Consumes: `CD.KEYMAP`
- Produces:
  - `CD.idleInput() → InputFrame` (all false)
  - `CD.createKeyboard(target: EventTarget, keymap) → { controllers: [Controller, Controller], pressedGlobal(code) → boolean, endTick(), detach() }`:
    - Listens for `keydown`/`keyup` on `target` and `blur` on `target`.
    - Ignores `e.repeat` for edge detection.
    - Calls `preventDefault()` on any mapped key, plus Enter, Escape and M, so arrows and `;` don't scroll or type.
    - `controllers[i].read()` returns held directions and edge buttons. `up` maps to `jump` as an edge.
    - `pressedGlobal` reports edges for keys not in the player maps (Enter/Escape/KeyM).
    - `endTick()` clears all edges and is called once per sim tick after both reads.
  - In Node tests, `target` is a minimal fake with `addEventListener`/`dispatch` (build it in `tests/helpers.js` as `fakeTarget()`).

- [ ] **Step 1: Write failing tests:**
  - `P1 and P2 keys held simultaneously both register`
  - `holding punch fires once`: keydown, then read → punch true; endTick; repeated keydown with `repeat:true`; read → punch false.
  - `blur clears held keys`
  - `mapped keys are preventDefaulted`
  - `Enter edge is visible through pressedGlobal`
- [ ] **Step 2: Run `npm test`.** Expected: FAIL.
- [ ] **Step 3: Implement** `input.js`.
- [ ] **Step 4: Run `npm test`.** Expected: all PASS.
- [ ] **Step 5: Commit:** `feat: keyboard controllers`

---

### Task 8: Rendering — rigs, stage, effects, HUD

**Files:**
- Create: `src/render.js`, `tests/render.test.js`

**Interfaces:**
- Consumes: the `Match` shape, `CD.FIGHTERS`, `CD.nextCitation`
- Produces:
  - `CD.drawFighterRig(ctx, look, x, y, facing, pose, scale=1)`. `pose` is one of `'idle'|'walk'|'jump'|'crouch'|'punch'|'kick'|'special'|'block'|'hurt'|'ko'|'win'`. It draws a big-headed crude rig from `look`: wobbly outlines (offset by a deterministic per-frame jitter), hair style, glasses, and outfit. It is used for fighters, assists, and the select screen.
  - `CD.poseFor(fighter) → pose`
  - `CD.renderMatch(ctx, match, tick)`:
    - The stage: a 1970s TV debate set with two chairs, a moderator's desk, studio lights, and a brown/orange palette.
    - Fighters, assists (with a name tag), and effects:
      - stunZone: a watchtower eye
      - projectile: a syntax tree (S → NP VP)
      - drop: a 1960s TV
      - burst: a breaking chain
      - rush: a speed-lined body
    - Hit sparks and comic text ("POW!", "BONK!", "BLOCKED") from recent events.
    - Speech bubbles for cites (~60 ticks).
    - HUD:
      - HP bars with names.
      - Round-win pips.
      - The timer in seconds.
      - Per player, a citation readiness bar plus `Next: <name>`.
      - The banner, in big centered text.
  - `CD.renderSelect(ctx, selState, tick)` and `CD.renderWinner(ctx, match, tick)`:
    - Select shows all four fighters as rigs with names and P1/P2 cursors, plus the full controls table from `CD.KEYMAP` (key labels prettified: `KeyF`→`F`, `Semicolon`→`;`, `ArrowLeft`→`←`).
    - Winner shows the winning rig in the `win` pose, the banner, the `winQuote`, and "Enter: rematch · Esc: character select".
  - Render functions keep transient visuals (sparks, bubbles) in a module-level list fed by `CD.pushRenderEvents(events)`.
- No gore: sparks are yellow/white stars, never red splatter.

- [ ] **Step 1: Write a failing smoke test** (`tests/render.test.js`). Use a recording fake ctx (a Proxy whose methods are no-ops that count calls and whose properties are settable). Then:
  - `renderMatch draws without throwing for every fighter pairing in every phase`
  - `drawFighterRig handles every pose for every look, including generic scholar looks`
  - `renderSelect output includes every key label`: record `fillText` strings and assert `F`, `;`, `←`, `R`, `O` are present.
- [ ] **Step 2: Run `npm test`.** Expected: FAIL.
- [ ] **Step 3: Implement** `render.js`.
- [ ] **Step 4: Run `npm test`.** Expected: PASS.
- [ ] **Step 5: Commit:** `feat: crude-likeness rendering and HUD`

---

### Task 9: Audio, screens, main loop, page, README

**Files:**
- Create: `src/audio.js`, `src/main.js`, `index.html`, `README.md`

**Interfaces:**
- Consumes: everything.
- Produces:
  - `CD.createAudio() → { play(event: Event), toggleMute() → boolean, muted }`:
    - Creates the AudioContext lazily on the first keydown (browser autoplay rules).
    - Plays short oscillator/noise blips per event type: hit, block, whoosh, special, cite, ko, announce.
    - No files.
  - `main.js` screens:
    - **`select`.** P1 uses A/D to move the cursor and F to lock in. P2 uses ←/→ and K. Once both are locked, Enter or an auto-start after 30 ticks begins the match. Mirror picks are allowed.
    - **`fight`.** A fixed-timestep loop: an accumulator stepping `stepMatch` at 60 Hz, at most 5 steps per frame, then render. Events go to audio and render.
    - **`winner`.** Enter starts a rematch with the same fighters, and Escape returns to select.
    - **Global keys.** M toggles mute anywhere, with a small speaker icon in a corner. Escape during a fight returns to select.
  - `index.html`:
    - A 960×540 canvas, CSS-scaled to fit the window while keeping the aspect ratio. Dark background, title `Citation Deathmatch`.
    - Scripts in order: `config, roster, input, fighter, combat, effects, citations, match, render, audio, main`.
  - `README.md`:
    - How to play: open `index.html`, plus the controls table.
    - How to add a fighter or a citation, with an example entry.
    - Note that a citation can be just a name.

- [ ] **Step 1: Implement `audio.js`, `main.js`, `index.html`, `README.md`.**
- [ ] **Step 2: Run `npm test`.** Expected: all PASS. The script order in `index.html` must match `helpers.load` order.
- [ ] **Step 3: Headless smoke check.** Run `firefox --headless --screenshot /tmp/<scratch>/cd.png file://$PWD/index.html` and view the PNG. Expected: the select screen renders with four rigs and the controls table, and no blank canvas. Also open the page in a headless run and confirm no console errors (`firefox --headless` plus `window.onerror`, which writes to `document.title`, is acceptable).
- [ ] **Step 4: Manual playtest checklist** (for the human):
  - All four fighters selectable.
  - Each special visibly works.
  - Each cite shows a bubble and an assist.
  - Holding several keys per player on a laptop still registers: check P1 walk+jump+punch together with P2 walk+kick.
  - Draw and sudden death are reachable.
  - Mute works.
- [ ] **Step 5: Commit:** `feat: screens, main loop, audio, page`
