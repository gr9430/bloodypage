(function (CD) {
  const { KEYMAP } = CD;
  const MODE_OPTIONS = ['1 PLAYER VS COMPUTER', '2 PLAYERS'];
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
    return anyOf(pressed, 'punch') || pressed('Enter');
  }

  function stepSelect(st, pressed) {
    const sel = st.sel;
    const n = CD.fighterIds.length;
    if (st.cpu) {
      // One human picks both fighters: their own, then the computer's.
      const km = KEYMAP[0];
      const active = sel.locked[0] ? 1 : 0;
      if (pressed(km.kick)) {
        if (sel.locked[1]) sel.locked[1] = false;
        else sel.locked[0] = false;
      } else if (!sel.locked[active]) {
        if (pressed(km.left)) sel.cursor[active] = (sel.cursor[active] + n - 1) % n;
        if (pressed(km.right)) sel.cursor[active] = (sel.cursor[active] + 1) % n;
        if (pressed(km.punch)) sel.locked[active] = true;
      }
    } else {
      for (let i = 0; i < 2; i++) {
        const km = KEYMAP[i];
        if (!sel.locked[i]) {
          if (pressed(km.left)) sel.cursor[i] = (sel.cursor[i] + n - 1) % n;
          if (pressed(km.right)) sel.cursor[i] = (sel.cursor[i] + 1) % n;
          if (pressed(km.punch)) sel.locked[i] = true;
        } else if (pressed(km.kick)) {
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

  Object.assign(CD, { MODE_OPTIONS, createMenuState, stepMenu, backToSelect });
})(globalThis.CD = globalThis.CD || {});
