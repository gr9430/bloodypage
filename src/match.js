(function (CD) {
  const { CONFIG } = CD;

  function createMatch(p1Id, p2Id, seed = 1) {
    const m = {
      rng: CD.makeRng(seed),
      fighterIds: [p1Id, p2Id],
      fighters: null,
      cites: [CD.createCitationState(CD.FIGHTERS[p1Id].citations), CD.createCitationState(CD.FIGHTERS[p2Id].citations)],
      effects: [],
      assists: [],
      wins: [0, 0],
      round: 1,
      phase: 'intro',
      phaseTimer: CONFIG.introTicks,
      timer: CONFIG.roundTicks,
      roundResult: null,
      winner: null,
      suddenDeath: false,
      banner: 'ROUND 1',
      announced: null,
    };
    resetFighters(m);
    return m;
  }

  // The specialty bar carries over between rounds.
  function resetFighters(m) {
    const [a, b] = m.fighterIds;
    const meters = m.fighters ? m.fighters.map((f) => f.meter) : [0, 0];
    m.fighters = [CD.createFighter(CD.FIGHTERS[a], 0, false), CD.createFighter(CD.FIGHTERS[b], 1, a === b)];
    m.fighters.forEach((f, i) => { f.meter = meters[i]; });
  }

  // Landed hits (not specials, not blocks) fill the attacker's bar.
  function buildMeter(m, events) {
    for (const e of events) {
      if (e.type !== 'hit' || e.fromSpecial) continue;
      const f = m.fighters[e.player];
      f.meter = Math.min(CONFIG.meterMax, f.meter + (e.crit ? CONFIG.meterCrit : CONFIG.meterHit));
    }
  }

  function matchWinner(wins, roundsPlayed) {
    for (let i = 0; i < 2; i++) if (wins[i] >= CONFIG.roundsToWin) return i;
    if (roundsPlayed >= 3 && wins[0] !== wins[1]) return wins[0] > wins[1] ? 0 : 1;
    return null;
  }

  function startRound(m) {
    m.round++;
    m.suddenDeath = m.round > 3;
    resetFighters(m);
    for (const cs of m.cites) cs.cooldown = 0;
    m.effects = [];
    m.assists = [];
    m.timer = CONFIG.roundTicks;
    m.roundResult = null;
    m.phase = 'intro';
    m.phaseTimer = CONFIG.introTicks;
    m.banner = m.suddenDeath ? 'SUDDEN DEATH' : 'ROUND ' + m.round;
  }

  function endRound(m, result, banner, events) {
    m.roundResult = result;
    if (result !== 'draw') m.wins[result]++;
    m.phase = 'roundEnd';
    m.phaseTimer = CONFIG.roundEndTicks;
    m.banner = banner;
    m.effects = [];
    m.assists = [];
    if (banner === 'K.O.') events.push({ type: 'ko' });
  }

  function checkRoundEnd(m, events) {
    const [a, b] = m.fighters;
    const koA = a.state === 'ko', koB = b.state === 'ko';
    if (koA && koB) return endRound(m, 'draw', 'DRAW', events);
    if (koB) return endRound(m, 0, 'K.O.', events);
    if (koA) return endRound(m, 1, 'K.O.', events);
    if (m.timer <= 0) {
      if (a.hp === b.hp) return endRound(m, 'draw', 'DRAW', events);
      endRound(m, a.hp > b.hp ? 0 : 1, 'TIME!', events);
    }
  }

  function stepFight(m, inputs, events) {
    const [a, b] = m.fighters;
    for (const [f, opp, inp] of [[a, b, inputs[0]], [b, a, inputs[1]]]) {
      for (const e of CD.updateFighter(f, inp, opp)) {
        events.push(e);
        if (e.type === 'special') m.effects.push(CD.spawnSpecial(f, opp));
      }
    }
    for (let i = 0; i < 2; i++) {
      const name = CD.tryCite(m.cites[i], m.fighters[i], inputs[i]);
      if (name) {
        m.assists.push(CD.createAssist(name, i, m.fighters[i]));
        events.push({ type: 'cite', player: i, text: CD.citeText(name) });
      }
      CD.tickCitation(m.cites[i]);
    }
    const pendingHits = CD.findHits(a, b);
    const as = CD.updateAssists(m.assists, m.fighters);
    m.assists = as.assists;
    m.effects.push(...as.newEffects);
    events.push(...as.events);
    const ef = CD.updateEffects(m.effects, m.fighters, m.rng);
    m.effects = ef.effects;
    events.push(...ef.events);
    events.push(...CD.applyHits(pendingHits, m.rng));
    buildMeter(m, events);
    CD.separateFighters(a, b);
    m.timer--;
    checkRoundEnd(m, events);
  }

  // Advances the match by one tick. Inputs only count during the fight phase.
  function stepMatch(m, inputs) {
    const events = [];
    if (m.phase === 'fight') {
      stepFight(m, inputs, events);
    } else {
      const idle = CD.idleInput();
      CD.updateFighter(m.fighters[0], idle, m.fighters[1]);
      CD.updateFighter(m.fighters[1], idle, m.fighters[0]);
      if (m.phase === 'intro') {
        m.phaseTimer--;
        if (m.phaseTimer <= CONFIG.introTicks / 2) m.banner = 'DEBATE!';
        if (m.phaseTimer <= 0) { m.phase = 'fight'; m.banner = null; }
      } else if (m.phase === 'roundEnd') {
        m.phaseTimer--;
        if (m.phaseTimer <= 0) {
          const w = matchWinner(m.wins, m.round);
          if (w !== null) {
            m.phase = 'matchEnd';
            m.winner = w;
            m.banner = m.fighters[w].def.name.toUpperCase() + ' WINS THE ARGUMENT';
          } else {
            startRound(m);
          }
        }
      }
    }
    if (m.banner !== m.announced) {
      m.announced = m.banner;
      if (m.banner) events.push({ type: 'announce', text: m.banner });
    }
    return events;
  }

  Object.assign(CD, { createMatch, stepMatch, matchWinner });
})(globalThis.CD = globalThis.CD || {});
