# Bloody Page: Scholarly Deathmatch — Design

*Title chosen by the user on 2026-10-28 (formerly the working title "Citation Deathmatch"). Tagline: "Settle it with your fists and NOT your sources."*

## Intent and why

This is a browser fighting game born from an in-joke in a gender in technology course. Academic arguments get settled by citation ("Well, to Tuck and Yang, I would say see Walter Mignolo"), so the game makes that literal. Critical theorists fight it out, and citing someone **summons them into the fight**.

The tone is *Celebrity Deathmatch* (crude, cartoonish likenesses of real thinkers in a mock-sports spectacle) crossed with *Marvel vs. Capcom* (fast, flashy, with assist characters called in mid-fight). The audience is people from the course who get the references, so deep cuts are welcome.

Bloody Rage was the starting reference for "a simple two-player browser fighter." It is **not** a template. This is an original game, and no assets, characters or move sets come from it. The user's Bloody Rage files are compiled `.swf` and aren't used.

## Goals (first version)

1. Two players on one keyboard, head to head, in a desktop browser.
2. Four playable fighters, drawn as crude likenesses: **Michel Foucault** and **Noam Chomsky** (the headline matchup), plus **Marshall McLuhan** and **Walter Ong** (user-specified second pair, so McLuhan can face his former student; Ong replaced Mignolo on 2026-10-27).
3. A Marvel vs. Capcom-style **citation assist**: a button makes your fighter shout a citation, and that scholar pops in, does one attack, and leaves.
4. A complete match loop: character select → best of 3 rounds with health bars and a round timer → winner screen → rematch / back to select.
5. Adding a new theorist or a new citation means **editing a data entry**, not writing new engine code. The roster will grow, and the user will supply the real citation lists later.

## Added 2026-10-28: computer opponent

- A main menu offers **1 Player vs Computer** or **2 Players**. Choosing the computer leads to an **Easy / Medium / Hard** screen.
- Against the computer, the human picks their own fighter and then the computer's. The human plays as P1 and the computer as P2.
- The computer is a Controller that presses the same virtual buttons as a player, delayed by its reaction time. It has no extra damage and doesn't read inputs early. It uses seeded randomness.
- Levels:
  - **Easy:** slow, rarely blocks, mostly random swings.
  - **Medium:** blocks about half the time, uses its special and cites.
  - **Hard:** quick, guards at close range, punishes, dodges projectiles.
- Enter rematches at the same difficulty. Esc from the winner screen returns to the main menu.

## Added 2026-10-28: pause, dash, directional attacks

- **Pause:** Esc or P during a fight freezes everything, the computer included. The menu offers Resume, Restart match, Character select and Main menu.
- **Dash:** double-tap forward or back. No new keys.
- **Downward attacks:**
  - Crouching punch: low jab.
  - Crouching kick: sweep.
  - Lows must be crouch-blocked (Down + away). Crouch-blocking was added for this.
- **Upward attacks:** these happen in the air, as chosen by the user.
  - Punch while airborne swings upward.
  - Down + kick while airborne is a dive kick, which must be blocked standing.
- Moves carry a `level` (mid, low or overhead) that decides which block stops them.
- The computer crouch-blocks lows it sees coming and uses sweeps, dashes, jump-ins, upward punches and dive kicks (medium and hard).

## Added 2026-10-28: specialty bar, critical hits, three-button controls

- **Controls:** three buttons. P1 uses F Attack, G Special, H Cite. P2 uses K, L and ;.
  - Attack on the ground: punch; toward = kick; down = sweep.
  - Attack in the air: upward punch; down = dive kick.
  - The low jab was dropped.
- **Specialty bar:**
  - It fills only from landed hits: +10 for a hit, +30 for a crit. Blocks, misses and the fighter's own special hits add nothing.
  - The special needs a full bar and empties it. Pressing early fizzles ("NOT YET!").
  - The bar carries over between rounds.
  - Special damage was roughly doubled.
- **Critical hits:**
  - Counter-hits (the defender is mid-attack) always crit. Other hits crit 8% of the time, from the match's seeded RNG.
  - Crits do 1.5× damage and show "CRITICAL!".
- These supersede the per-button control table above.

## Non-goals (for now)

- Online play, gamepads, mobile/touch.
- Super meters, combo systems, multi-character tag teams, story mode.
- Final citation lists. Use placeholders (below).
- Sprite/image assets. Art is drawn in code.

## Anti-goals (would make it a failure even if it works)

- **Gore.** No blood or dismemberment. Hits read as cartoon bonks: hit sparks, knockback, squash-and-stretch, comic "POW" text.
- Copying Bloody Rage (or any existing game's) characters, art, or moves.
- Hardcoding characters into engine logic so that adding a theorist means touching game code.
- Needing an install, build step, or server to play.

## Decided

- **Platform:** runs in a desktop browser, two players sharing one keyboard.
- **Combat feel:** Marvel vs. Capcom-like rather than bloody.
- **Citations = summons.** They bring a theorist into the fight as an assist. They are not damage numbers or text attacks.
- **Starting roster:** Foucault and Chomsky, plus McLuhan and Ong, all four playable in the first version.
- **Order:** two-player local first, then computer opponent.

## My calls (the user hasn't weighed in; change freely)

**Tech:** Plain HTML + JavaScript + `<canvas>`, no framework, no build. It must work by double-clicking `index.html` (i.e., over `file://`), so use classic `<script>` tags rather than ES modules. Suggested split: `index.html`, `game.js` (engine), `characters.js` (roster data).

**Art style:** Drawn with canvas shapes. Big heads, small bodies, wobbly crude outlines, a deliberately "made in MS Paint" look.
- *Foucault:* bald dome, round glasses, black turtleneck, intense grin.
- *Chomsky:* swept grey hair, big glasses, sweater, calm expression.
- *McLuhan:* long face, slicked side-parted hair, 1960s suit and skinny tie.
- *Ong:* receding grey hair, heavy glasses, black Jesuit suit with a white clerical collar.
- Summoned assists use the same rig in a different colorway with a recognizable feature (hair, glasses, prop) and a name tag.

**Stage:** One stage, a cartoon version of a 1970s TV debate set: two chairs, a moderator's desk and studio lights. It's a nod to the 1971 Foucault–Chomsky debate.

**Controls:**

| Action | Player 1 | Player 2 |
|---|---|---|
| Move / jump / crouch | W A S D | Arrow keys |
| Punch | F | K |
| Kick | G | L |
| Special | H | ; |
| Citation (summon) | R | O |
| Block | hold away from opponent | hold away from opponent |

Show the controls on the character select screen. Make the key mapping one easy-to-edit table, and test for keyboard ghosting on a typical laptop.

**Moves per fighter:** walk, jump, crouch, block, light punch, kick, one signature special, and a citation call.
- *Foucault special:* "Panopticon". A watchtower/eye appears over the opponent and briefly stuns them.
- *Chomsky special:* "Universal Grammar". He throws a syntax-tree projectile.
- *McLuhan special:* "The Medium Is the Message". A giant 1960s TV set drops on the opponent.
- *Ong special:* "Secondary Orality". A booming short-range soundwave that knocks the opponent far back.

**Citation mechanic:**
- Each fighter has an ordered list of 2–3 citable scholars. Pressing Citation summons the next one in the list, which then cycles.
- The fighter shows a speech bubble ("See Deleuze!") and the summoned scholar dashes in from off-screen, does one attack (a hit, projectile, or effect defined per scholar in data), and exits.
- Citations are on a **cooldown** (~8 seconds, tunable). The HUD shows readiness and the next name up.
- Placeholder citation lists:
  - Foucault → Deleuze, Nietzsche, Butler
  - Chomsky → Edward Herman, Howard Zinn, Bakunin
  - McLuhan → Harold Innis, Walter Ong, Wyndham Lewis
  - Ong → Eric Havelock, Milman Parry, Marshall McLuhan

**Match rules:** 100 HP each, 60-second rounds, best of 3. If time runs out, more HP remaining wins. Announcer-style big text: "ROUND 1", "DEBATE!", "K.O.", "[NAME] WINS THE ARGUMENT".

**Edge cases:**
- If time runs out with equal HP, the round is a draw and neither player scores. If the score is still tied after round 3, play sudden-death rounds.
- Both players may pick the same fighter. Player 2 then gets an alternate colorway.
- Summoned scholars can't be hit or interrupted, but their attacks can be blocked.
- A citation can be **just a name**. Any scholar without their own entry gets a generic look (name tag plus random hair and glasses) and a default rush attack. This lets the user paste in real citation lists later with no extra work.

**Sound:** Simple synthesized hit/whoosh blips via Web Audio. No audio files. A mute toggle.

**Roster data shape:** each character entry carries a name, look parameters (colors, head shape, features), move stats (damage, speed, hitbox, startup/recovery), the special's definition, its citation list, and a win quote. Summonable scholars are entries too (look and assist attack), so anyone can be both a fighter and a summon.

## Left to the builder

- Exact frame data, hitbox sizes, physics constants and balance. Aim for snappy, readable and fun.
- Internal architecture (state machine, entity structure, game loop), as long as an AI controller can drive a fighter later through the same input interface.
- Testing approach. Pure logic (damage, round/match state, cooldowns, collision) should be testable without a browser.
- Visual polish details within the crude-likeness style.
