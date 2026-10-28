(function (CD) {
  const { KEYMAP } = CD;
  const MODE_OPTIONS = ['1 PLAYER VS COMPUTER', '2 PLAYERS'];
  const PAUSE_OPTIONS = ['RESUME', 'RESTART MATCH', 'CHARACTER SELECT', 'MAIN MENU'];
  const PAUSE_ACTIONS = ['resume', 'restart', 'select', 'main'];
  const AUTOSTART_TICKS = 30;

  function createMenuState() {
    return {
      screen: 'mode',
      modeCursor: 0,
      diffCursor: 1,
      cpu: null,
      sel: { cursor: [0, 1], locked: [false, false], countdown: 0 },
    };
  }

  function backToSelect(st) {
    st.screen = 'select';
    st.sel.locked = [false, false];
    st.sel.countdown = 0;
  }

  // Either player's keys (or arrows / Enter) drive the list menus.
  function anyOf(pressed, field) {
    return KEYMAP.some((km) => pressed(km[field]));
  }

  function stepList(st, pressed, key, count) {
    if (anyOf(pressed, 'up')) st[key] = (st[key] + count - 1) % count;
    if (anyOf(pressed, 'down')) st[key] = (st[key] + 1) % count;
    return anyOf(pressed, 'attack') || pressed('Enter');
  }

  function stepSelect(st, pressed) {
    const sel = st.sel;
    const n = CD.fighterIds.length;
    if (st.cpu) {
      // One human picks both fighters: their own, then the computer's.
      const km = KEYMAP[0];
      const active = sel.locked[0] ? 1 : 0;
      if (pressed(km.special)) {
        if (sel.locked[1]) sel.locked[1] = false;
        else sel.locked[0] = false;
      } else if (!sel.locked[active]) {
        if (pressed(km.left)) sel.cursor[active] = (sel.cursor[active] + n - 1) % n;
        if (pressed(km.right)) sel.cursor[active] = (sel.cursor[active] + 1) % n;
        if (pressed(km.attack)) sel.locked[active] = true;
      }
    } else {
      for (let i = 0; i < 2; i++) {
        const km = KEYMAP[i];
        if (!sel.locked[i]) {
          if (pressed(km.left)) sel.cursor[i] = (sel.cursor[i] + n - 1) % n;
          if (pressed(km.right)) sel.cursor[i] = (sel.cursor[i] + 1) % n;
          if (pressed(km.attack)) sel.locked[i] = true;
        } else if (pressed(km.special)) {
          sel.locked[i] = false;
        }
      }
    }
    if (!(sel.locked[0] && sel.locked[1])) {
      sel.countdown = 0;
      return null;
    }
    sel.countdown++;
    if (sel.countdown >= AUTOSTART_TICKS || pressed('Enter')) {
      return { p1: CD.fighterIds[sel.cursor[0]], p2: CD.fighterIds[sel.cursor[1]], cpu: st.cpu };
    }
    return null;
  }

  // Advances the menus one tick. Returns { p1, p2, cpu } when a match should start.
  function stepMenu(st, pressed) {
    if (st.screen === 'mode') {
      if (stepList(st, pressed, 'modeCursor', MODE_OPTIONS.length)) {
        if (st.modeCursor === 0) {
          st.screen = 'difficulty';
        } else {
          st.cpu = null;
          backToSelect(st);
        }
      }
      return null;
    }
    if (st.screen === 'difficulty') {
      if (pressed('Escape')) { st.screen = 'mode'; return null; }
      if (stepList(st, pressed, 'diffCursor', CD.aiLevels.length)) {
        st.cpu = CD.aiLevels[st.diffCursor];
        backToSelect(st);
      }
      return null;
    }
    if (pressed('Escape')) {
      st.screen = st.cpu ? 'difficulty' : 'mode';
      return null;
    }
    return stepSelect(st, pressed);
  }

  function createPauseState() {
    return { cursor: 0 };
  }

  // Returns 'resume' | 'restart' | 'select' | 'main' when a choice is made.
  function stepPause(p, pressed) {
    if (pressed('Escape') || pressed('KeyP')) return 'resume';
    if (stepList(p, pressed, 'cursor', PAUSE_OPTIONS.length)) return PAUSE_ACTIONS[p.cursor];
    return null;
  }

  Object.assign(CD, { MODE_OPTIONS, PAUSE_OPTIONS, createMenuState, stepMenu, backToSelect, createPauseState, stepPause });
})(globalThis.CD = globalThis.CD || {});
