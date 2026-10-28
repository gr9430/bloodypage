# Bloody Page: Scholarly Deathmatch

*Settle it with your fists and NOT your sources.*

A browser fighting game in which crude, big-headed caricatures of theorists settle their debates by brawling on a cartoon version of the 1971 Foucault–Chomsky debate set. It started as a joke in a gender in technology course: "Well, to Tuck and Yang, I would say see Walter Mignolo." In this game, citing someone summons them into the fight.

It plays like Celebrity Deathmatch with Marvel vs. Capcom-style assists, and there's no blood. You can fight a friend on one keyboard or play against the computer.

## Quick start

Double-click `index.html`. It runs in any desktop browser, with nothing to install and no server.

1. **Main menu:** choose **1 Player vs Computer** or **2 Players**.
   - Move with W/S or ↑/↓.
   - Confirm with F or Enter.
2. **Difficulty** (vs. computer only): **Easy**, **Medium** or **Hard**.
3. **Character select:**
   - *vs. computer:* pick your fighter with A/D + F, then pick the computer's. G undoes the last pick.
   - *2 players:* each player picks with left/right + Attack. Special unlocks a pick.
   - The match starts a moment after both picks are locked in, or right away if you press Enter.

## The roster

| Fighter | Special (needs a full bar) | Cites (placeholders) |
|---|---|---|
| **Michel Foucault** | *Panopticon*: a watchtower appears over the opponent and stuns them | Deleuze, Nietzsche, Butler |
| **Noam Chomsky** | *Universal Grammar*: throws a spinning syntax tree | Edward Herman, Howard Zinn, Bakunin |
| **Marshall McLuhan** | *The Medium Is the Message*: drops a 1960s TV set on the opponent | Harold Innis, Walter Ong, Wyndham Lewis |
| **Walter Ong** | *Secondary Orality*: a booming soundwave that knocks the opponent far back | Eric Havelock, Milman Parry, Marshall McLuhan |

McLuhan and Ong cite each other, so each can summon the other.

## Controls

| Action | Player 1 | Player 2 |
|---|---|---|
| Move / jump / crouch | W A S D | Arrow keys |
| **Attack** | F | K |
| **Special** | G | L |
| **Cite** (summon a scholar) | H | ; |
| Block | hold away from your opponent | hold away from your opponent |
| Dash | double-tap forward or back | double-tap forward or back |
| Pause | Esc or P | Esc or P |
| Mute | M | M |

Against the computer, you play as Player 1, on the left.

### Attack changes with the direction you hold

| Hold | On the ground | In the air |
|---|---|---|
| nothing (or away) | punch | upward punch, good against jumpers |
| toward the opponent | kick, with longer reach | upward punch |
| down | sweep, a low attack | dive kick, an overhead attack |

### Blocking

- Hold away from your opponent to block. You back off slowly while blocking.
- **Sweeps** are lows and must be blocked **crouching** (down + away).
- **Dive kicks** are overheads and must be blocked **standing**.
- Everything else can be blocked either way. Crouching also ducks under standing punches.
- A hit from behind can't be blocked.

## How a fight works

**Rounds:**
- Matches are best of three, with 100 HP and 60 seconds per round.
- If time runs out, whoever has more health wins the round. Equal health is a draw.
- A match still tied after round 3 goes to sudden death.

**Specialty bar:** the orange bar under your health bar.
- It fills only when your attacks land: **+10** for a hit and **+30** for a critical hit.
- Blocked attacks, misses and hits from your own special add nothing.
- When it's full it flashes **SPECIAL READY**. Pressing Special then fires your signature move and empties the bar.
- Pressing Special before the bar is full just shows "NOT YET!".
- The bar carries over between rounds.

**Critical hits:**
- A hit is critical when it catches the opponent in the middle of an attack (a counter-hit). Any other hit also has an 8% chance.
- Critical hits do 1.5× damage and fill your bar three times as fast. They show a big **CRITICAL!**.

**Citations:**
- Pressing Cite shouts "See *Scholar Name*!" and calls in the next scholar on your list.
- The scholar runs in, attacks once and leaves. They can't be hit, but their attack can be blocked.
- Citing then has an 8-second cooldown. The meter in the bottom corner shows when you can cite again and who's next.

**Pause menu** (Esc or P): Resume, Restart match, Character select, Main menu. Everything freezes while paused, including the computer.

**After a match:**
- Enter gives you a rematch with the same fighters and difficulty.
- Esc goes back to the main menu.

## Playing the computer

| Level | What to expect |
|---|---|
| **Easy** | Slow and sloppy. It rarely blocks and mostly swings at random. |
| **Medium** | Blocks about half the time, crouch-blocks some sweeps, dashes and jumps in, cites, and saves up for its special. |
| **Hard** | Reacts quickly and guards up close. It crouch-blocks sweeps it sees coming, punishes your misses and jumps over projectiles. |

The computer presses the same virtual buttons a player would and follows the same rules. It has no bonus damage and doesn't read your inputs before they happen.

## Customize

### Add a citation

Open `src/roster.js` and edit a fighter's `citations` list. **A name is enough:**

```js
citations: ['Eve Tuck', 'K. Wayne Yang', 'Walter Mignolo'],
```

A name with no entry of its own gets a generic look, which is generated from the name so it's always the same, plus a charging attack. A name that matches a playable fighter, such as `'Walter Ong'`, summons that fighter with their own look.

To give a summoned scholar a custom look or attack, add an entry to `SCHOLARS` in the same file:

```js
'Eve Tuck': {
  name: 'Eve Tuck',
  look: { skin: '#d9a77e', hair: 'swept', hairColor: '#2b2018', glasses: 'none',
          outfit: 'scarf', outfitColor: '#3a5a7a', accentColor: '#e0a800', headScale: 1.15 },
  assist: { kind: 'projectile', damage: 7, knockback: 5 },
},
```

Look options:
- `hair`: `bald`, `swept`, `slick`, `white`
- `glasses`: `round`, `big`, `none`
- `outfit`: `turtleneck`, `sweater`, `suit`, `scarf`, `clerical`

Attack kinds (for `assist.kind` and a fighter's `special.kind`):
- `rush`: charges across the stage
- `projectile`: a thrown object
- `drop`: something falls from above
- `stunZone`: a delayed stun
- `burst`: a close-range blast with big knockback

### Add a playable fighter

Add an entry to `FIGHTERS` in `src/roster.js`, copying an existing one to start, then add its id to `fighterIds`. Each fighter needs:
- `look` and `altLook` (the alternate colors are used in mirror matches)
- `moves` (use the shared `moves(punchDamage, kickDamage)` helper)
- a `special` that uses one of the attack kinds above
- `citations`
- `assist` (used when someone else cites this fighter)
- `winQuote`

### Change the controls or tune the game

Everything below is in `src/config.js`:
- **Controls:** `KEYMAP`, using `KeyboardEvent.code` names.
- **Specialty bar:** `meterHit`, `meterCrit`, `meterMax`.
- **Critical hits:** `critChance`, `critMultiplier`.
- **Rounds and citations:** `maxHp`, `roundTicks` (60 ticks = 1 second), `citeCooldownTicks`.

Computer difficulty is the `LEVELS` table at the top of `src/ai.js`.

## Project layout

```
index.html          the page: a canvas plus the scripts below, in load order
src/config.js       constants, controls (KEYMAP), seeded random numbers
src/roster.js       fighters, summonable scholars, move data
src/input.js        keyboard → button presses (incl. double-tap dash)
src/fighter.js      movement, attacks, dashing, blocking
src/combat.js       hit detection, blocking rules, critical hits
src/effects.js      specials and assist attacks (projectiles, drops, …)
src/citations.js    citing, cooldowns, summoned scholars
src/match.js        rounds, timer, specialty bar, winners
src/ai.js           the computer opponent
src/menu.js         main menu, difficulty, character select, pause menu
src/render.js       all drawing: stage, fighters, HUD, screens
src/audio.js        synthesized sound effects
src/main.js         the game loop that ties it together
tests/              automated tests (Node)
docs/               design notes and the build plan
```

All art is drawn in code and all sounds are synthesized, so there are no image or audio files.

## Develop

```
npm test
```

This runs the test suite with Node's built-in test runner (Node 20+), and there are no dependencies to install. The tests cover the game rules and the computer opponent. They also drive one full game through the real page code with a simulated keyboard.
