# Bloody Page: Scholarly Deathmatch

A two-player browser fighting game in which critical theorists settle their debates with their fists. To call in backup, you cite someone.

## Play

Double-click `index.html`. You don't need to install anything or run a server.

The first screen asks for **1 Player vs Computer** or **2 Players**:
- Choose with W/S (or ↑/↓) and confirm with F (or Enter).
- Against the computer, pick **Easy**, **Medium** or **Hard**.
- Then pick your fighter, followed by the computer's, using A/D + F. G undoes the last pick.
- You play as Player 1, and the computer controls the right-hand fighter.

| Action | Player 1 | Player 2 |
|---|---|---|
| Move / jump / crouch | W A S D | Arrow keys |
| **Attack** | F | K |
| **Special** (needs a full bar) | G | L |
| **Cite** (summon a scholar) | H | ; |
| Block | hold away from your opponent | hold away from your opponent |
| Pause | Esc or P | Esc or P |

Attack changes with the direction you hold:

| Hold | On the ground | In the air |
|---|---|---|
| nothing (or away) | punch | upward punch |
| toward the opponent | kick (longer reach) | upward punch |
| down | sweep (a low) | dive kick (an overhead) |

- **Dash:** double-tap forward or back.
- **Blocking:** sweeps must be blocked crouching (down + away). Dive kicks must be blocked standing. Crouching also ducks under standing punches.

**Specialty bar:**
- The orange bar under your health bar fills only when your attacks land: +10 for a hit, +30 for a critical hit. Blocked attacks and misses add nothing, and neither do hits from your own special.
- When the bar is full, Special fires your signature move and empties the bar. Pressing it early just shows "NOT YET!".
- The bar carries over between rounds.

**Critical hits:**
- A hit is critical if it catches the opponent in the middle of an attack (a counter-hit). Any other hit also has a small random chance.
- Critical hits do 1.5× damage and fill the bar three times as fast.

On the character select screen in 2-player mode:
- Each player moves their cursor with left/right and locks in with Attack. Special unlocks.
- The match starts once both players are ready.

Other keys:
- Esc or P during a fight: pause menu (Resume, Restart match, Character select, Main menu)
- Enter on the winner screen: rematch (same fighters, same difficulty)
- Esc on menus: back a screen (from the winner screen, back to the main menu)
- M: mute

Matches are best of three rounds, with 100 HP and 60 seconds per round. A round that times out with both players on equal HP is a draw. A match still tied after round 3 goes to sudden death.

Each citation calls in the next scholar on your list. That scholar runs in, attacks once and leaves. You then wait about 8 seconds before you can cite again.

## Add a citation

Open `src/roster.js` and edit a fighter's `citations` list. **A name is enough:**

```js
citations: ['Eve Tuck', 'K. Wayne Yang', 'Walter Mignolo'],
```

Any name that isn't defined elsewhere gets a generic look (made up from the name, so it's always the same) and a charging attack. A name that matches a playable fighter, such as `'Walter Ong'`, summons that fighter with their own look.

To give a summoned scholar a custom look or attack, add an entry to `SCHOLARS` in the same file:

```js
'Eve Tuck': {
  name: 'Eve Tuck',
  look: { skin: '#d9a77e', hair: 'swept', hairColor: '#2b2018', glasses: 'none',
          outfit: 'scarf', outfitColor: '#3a5a7a', accentColor: '#e0a800', headScale: 1.15 },
  assist: { kind: 'projectile', damage: 7, knockback: 5 },
},
```

The look options are:
- `hair`: `bald`, `swept`, `slick`, `white`
- `glasses`: `round`, `big`, `none`
- `outfit`: `turtleneck`, `sweater`, `suit`, `scarf`, `clerical`

The `assist.kind` options are:
- `rush`: charges across the stage
- `projectile`: a thrown object
- `drop`: something falls from above
- `stunZone`: a delayed stun
- `burst`: a close-range blast with big knockback

## Add a playable fighter

Add an entry to `FIGHTERS` in `src/roster.js`. Copy an existing one to start. Then add its id to `fighterIds`. Each fighter needs:
- `look` and `altLook` (the alternate colors are used in mirror matches)
- `moves`
- a `special` that uses one of the assist kinds above
- `citations`
- `assist` (used when someone else cites this fighter)
- `winQuote`

## Change the controls

Edit `KEYMAP` in `src/config.js`. The values are `KeyboardEvent.code` names.

## Develop

```
npm test
```

This runs the game-logic tests with Node's built-in test runner (Node 20+). There are no dependencies to install.
