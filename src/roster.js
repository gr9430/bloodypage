(function (CD) {
  // Hitboxes are relative to the fighter's origin (x = center, y = feet), facing right.
  // `level` decides how a hit can be blocked: mid by any block, low only
  // crouching, overhead only standing.
  function moves(punchDmg, kickDmg) {
    return {
      punch: { damage: punchDmg, startup: 4, active: 3, recovery: 8, hitbox: { x: 20, y: -130, w: 62, h: 26 }, knockback: 4, hitstun: 14, level: 'mid' },
      kick: { damage: kickDmg, startup: 7, active: 4, recovery: 12, hitbox: { x: 15, y: -80, w: 82, h: 30 }, knockback: 8, hitstun: 18, level: 'mid' },
      lowPunch: { damage: punchDmg - 1, startup: 5, active: 3, recovery: 9, hitbox: { x: 20, y: -62, w: 60, h: 24 }, knockback: 3, hitstun: 13, level: 'low' },
      sweep: { damage: kickDmg - 1, startup: 9, active: 4, recovery: 16, hitbox: { x: 10, y: -24, w: 96, h: 24 }, knockback: 6, hitstun: 20, level: 'low' },
      airPunch: { damage: punchDmg, startup: 3, active: 5, recovery: 6, hitbox: { x: 0, y: -215, w: 72, h: 64 }, knockback: 5, hitstun: 16, level: 'mid' },
      diveKick: { damage: kickDmg, startup: 4, active: 40, recovery: 10, hitbox: { x: 20, y: -44, w: 70, h: 44 }, knockback: 6, hitstun: 16, level: 'overhead' },
    };
  }

  const FIGHTERS = {
    foucault: {
      id: 'foucault',
      name: 'Michel Foucault',
      look: { skin: '#f1c9a5', hair: 'bald', hairColor: '#e8b896', glasses: 'round', outfit: 'turtleneck', outfitColor: '#1b1b1f', accentColor: '#f5f5f5', headScale: 1.25 },
      altLook: { skin: '#f1c9a5', hair: 'bald', hairColor: '#e8b896', glasses: 'round', outfit: 'turtleneck', outfitColor: '#f2f2f2', accentColor: '#1b1b1f', headScale: 1.25 },
      moves: moves(5, 8),
      special: { name: 'Panopticon', kind: 'stunZone', damage: 6, startup: 10, recovery: 24, knockback: 2, stunTicks: 45 },
      citations: ['Gilles Deleuze', 'Friedrich Nietzsche', 'Judith Butler'],
      assist: { kind: 'stunZone', damage: 5, knockback: 2, stunTicks: 45 },
      winQuote: 'Where there is power, there is resistance. You resisted. Poorly.',
    },
    chomsky: {
      id: 'chomsky',
      name: 'Noam Chomsky',
      look: { skin: '#f0cfb0', hair: 'swept', hairColor: '#b9b9b9', glasses: 'big', outfit: 'sweater', outfitColor: '#6b4f3a', accentColor: '#d8c7a8', headScale: 1.2 },
      altLook: { skin: '#f0cfb0', hair: 'swept', hairColor: '#b9b9b9', glasses: 'big', outfit: 'sweater', outfitColor: '#2f5d7c', accentColor: '#a8c7d8', headScale: 1.2 },
      moves: moves(5, 8),
      special: { name: 'Universal Grammar', kind: 'projectile', damage: 9, startup: 12, recovery: 20, knockback: 6, speed: 9 },
      citations: ['Edward Herman', 'Howard Zinn', 'Mikhail Bakunin'],
      assist: { kind: 'projectile', damage: 7, knockback: 5 },
      winQuote: 'Colorless green fists sleep furiously.',
    },
    mcluhan: {
      id: 'mcluhan',
      name: 'Marshall McLuhan',
      look: { skin: '#f3d2b3', hair: 'slick', hairColor: '#8a8178', glasses: 'none', outfit: 'suit', outfitColor: '#4a4f57', accentColor: '#9b2d2d', headScale: 1.2 },
      altLook: { skin: '#f3d2b3', hair: 'slick', hairColor: '#8a8178', glasses: 'none', outfit: 'suit', outfitColor: '#7a6a3a', accentColor: '#2d4f9b', headScale: 1.2 },
      moves: moves(6, 7),
      special: { name: 'The Medium Is the Message', kind: 'drop', damage: 12, startup: 14, recovery: 26, knockback: 4 },
      citations: ['Harold Innis', 'Walter Ong', 'Wyndham Lewis'],
      assist: { kind: 'drop', damage: 9, knockback: 4 },
      winQuote: 'You know nothing of my work.',
    },
    ong: {
      id: 'ong',
      name: 'Walter Ong',
      look: { skin: '#efc9a8', hair: 'slick', hairColor: '#6e6e6e', glasses: 'big', outfit: 'clerical', outfitColor: '#16161a', accentColor: '#ffffff', headScale: 1.2 },
      altLook: { skin: '#efc9a8', hair: 'slick', hairColor: '#6e6e6e', glasses: 'big', outfit: 'clerical', outfitColor: '#3d2a55', accentColor: '#ffffff', headScale: 1.2 },
      moves: moves(5, 9),
      special: { name: 'Secondary Orality', kind: 'burst', damage: 8, startup: 8, recovery: 22, knockback: 22 },
      citations: ['Eric Havelock', 'Milman Parry', 'Marshall McLuhan'],
      assist: { kind: 'burst', damage: 7, knockback: 16 },
      winQuote: 'Sound exists only when it is going out of existence. Like your argument.',
    },
  };

  const fighterIds = ['foucault', 'chomsky', 'mcluhan', 'ong'];

  // Summon-only scholars with bespoke looks. Anyone not listed here (and not a
  // fighter) still works: they get a generic look seeded from their name.
  const SCHOLARS = {
    'Gilles Deleuze': { name: 'Gilles Deleuze', look: { skin: '#efc7a2', hair: 'swept', hairColor: '#cfcfcf', glasses: 'none', outfit: 'suit', outfitColor: '#5a4632', accentColor: '#e0d0b0', headScale: 1.15 }, assist: { kind: 'rush', damage: 8, knockback: 7 } },
    'Friedrich Nietzsche': { name: 'Friedrich Nietzsche', look: { skin: '#eec39c', hair: 'slick', hairColor: '#4a3a2a', glasses: 'none', outfit: 'suit', outfitColor: '#222222', accentColor: '#4a3a2a', headScale: 1.15 }, assist: { kind: 'drop', damage: 9, knockback: 5 } },
    'Judith Butler': { name: 'Judith Butler', look: { skin: '#f0c8a8', hair: 'swept', hairColor: '#7a7a7a', glasses: 'big', outfit: 'turtleneck', outfitColor: '#2b2b33', accentColor: '#a0a0a0', headScale: 1.15 }, assist: { kind: 'burst', damage: 7, knockback: 14 } },
    'Edward Herman': { name: 'Edward Herman', look: { skin: '#f1cdb0', hair: 'white', hairColor: '#e8e8e8', glasses: 'big', outfit: 'sweater', outfitColor: '#5b6b3a', accentColor: '#c8d0a0', headScale: 1.15 }, assist: { kind: 'projectile', damage: 7, knockback: 5 } },
  };

  const GENERIC = {
    hair: ['bald', 'swept', 'slick', 'white'],
    hairColor: ['#2b2018', '#6b4a2b', '#b9b9b9', '#e8e8e8', '#a0522d', '#111111'],
    glasses: ['round', 'big', 'none'],
    outfit: ['turtleneck', 'sweater', 'suit', 'scarf'],
    outfitColor: ['#3a5a7a', '#7a3a4a', '#4a7a3a', '#6a4a7a', '#7a6a3a', '#2a2a2a'],
    skin: ['#f1c9a5', '#d9a77e', '#b07a4f', '#8a5a3a', '#f5d7bf'],
  };

  // FNV-1a: small deterministic string hash, so a name always gets the same look.
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function genericScholar(name) {
    let h = hash(name);
    const pick = (arr) => { const v = arr[h % arr.length]; h = Math.imul(h ^ (h >>> 13), 2654435761) >>> 0; return v; };
    const look = {
      skin: pick(GENERIC.skin),
      hair: pick(GENERIC.hair),
      hairColor: pick(GENERIC.hairColor),
      glasses: pick(GENERIC.glasses),
      outfit: pick(GENERIC.outfit),
      outfitColor: pick(GENERIC.outfitColor),
      accentColor: '#f0f0f0',
      headScale: 1.15,
    };
    return { name, look, assist: { kind: 'rush', damage: 8, knockback: 6 } };
  }

  function resolveScholar(name) {
    if (SCHOLARS[name]) return SCHOLARS[name];
    for (const id of fighterIds) {
      const f = FIGHTERS[id];
      if (f.name === name) return { name, look: f.look, assist: f.assist };
    }
    return genericScholar(name);
  }

  Object.assign(CD, { FIGHTERS, SCHOLARS, fighterIds, resolveScholar });
})(globalThis.CD = globalThis.CD || {});
