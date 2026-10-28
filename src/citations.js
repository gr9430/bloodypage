(function (CD) {
  const { CONFIG } = CD;
  const ENTER_TICKS = 30, ATTACK_TICKS = 20, EXIT_TICKS = 30;

  function createCitationState(names) {
    return { names: names.slice(), index: 0, cooldown: 0 };
  }

  function nextCitation(cs) {
    return cs.names[cs.index];
  }

  // Returns the cited name, or null if the cite can't happen this tick.
  function tryCite(cs, fighter, input) {
    if (!input.cite || cs.cooldown > 0 || !CD.isActionable(fighter)) return null;
    const name = cs.names[cs.index];
    cs.index = (cs.index + 1) % cs.names.length;
    cs.cooldown = CONFIG.citeCooldownTicks;
    return name;
  }

  function tickCitation(cs) {
    if (cs.cooldown > 0) cs.cooldown--;
  }

  function citeText(name) {
    return 'See ' + name + '!';
  }

  // Summoned scholars are invulnerable: nothing ever targets an assist.
  function createAssist(name, owner, ownerFighter) {
    const s = CD.resolveScholar(name);
    const facing = ownerFighter.facing;
    return {
      name, look: s.look, assist: s.assist, owner, facing,
      x: facing === 1 ? -60 : CONFIG.width + 60,
      y: CONFIG.floorY,
      onGround: true,
      phase: 'enter', timer: ENTER_TICKS, effectSpawned: false,
    };
  }

  // Burst-type assists close in on the opponent; everyone else stands
  // just behind their owner.
  function assistGoal(a, owner, target) {
    if (a.assist.kind === 'burst') return target.x - a.facing * 100;
    return owner.x - a.facing * 80;
  }

  function updateAssists(assists, fighters) {
    const kept = [], newEffects = [], events = [];
    for (const a of assists) {
      const owner = fighters[a.owner], target = fighters[1 - a.owner];
      a.timer--;
      if (a.phase === 'enter') {
        a.x += (assistGoal(a, owner, target) - a.x) * 0.2;
        if (a.timer <= 0) { a.phase = 'attack'; a.timer = ATTACK_TICKS; }
      } else if (a.phase === 'attack') {
        if (!a.effectSpawned) {
          a.effectSpawned = true;
          newEffects.push(CD.spawnEffect(a.assist.kind, a.owner, a, target, a.assist));
          events.push({ type: 'whoosh', player: a.owner });
        }
        if (a.timer <= 0) { a.phase = 'exit'; a.timer = EXIT_TICKS; }
      } else {
        a.x -= a.facing * 16;
        if (a.timer <= 0) continue;
      }
      kept.push(a);
    }
    return { assists: kept, newEffects, events };
  }

  Object.assign(CD, { createCitationState, nextCitation, tryCite, tickCitation, citeText, createAssist, updateAssists });
})(globalThis.CD = globalThis.CD || {});
