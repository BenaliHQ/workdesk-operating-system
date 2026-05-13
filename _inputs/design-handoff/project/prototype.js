/* WorkDesk — Prototype script
   Wires up: ribbon, zone pane, editor, terminal, command palette, quick
   capture, settings, onboarding, theme toggle, focus mode, file switching. */
(() => {
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const ZONES = window.WS_ZONES;
  const ZONE_ORDER = window.WS_ZONE_ORDER;
  const svg = window.wsSvg;

  // ── Static icon stamps ────────────────────────────────────────────────
  function stampIcons() {
    [
      ['[data-act="new"]', 'newNote', 14],
      ['[data-act="sort"]', 'sort', 14],
      ['#collapse-all', 'collapse', 14],
      ['#demo-empty', 'help', 14],
      ['#toggle-left', 'panelL', 14],
      ['#toggle-right', 'panelR', 14],
      ['#toggle-theme', 'moon', 14],
      ['#open-cmd', 'search', 14],
      ['#open-settings', 'gear', 14],
      ['#cmd-icon', 'search', 16],
      ['#qc-mic', 'mic', 16],
      ['[data-rtab="backlinks"]', 'link', 15],
      ['[data-rtab="outline"]', 'outline', 15],
      ['[data-rtab="calendar"]', 'calendar', 15],
      ['[data-rtab="terminal"]', 'code', 15],
      ['#collapse-right', 'doubleR', 14],
      ['#expand-left', 'chevron', 10],
      ['#expand-right', 'doubleL', 10],
    ].forEach(([sel, ic, sz]) => {
      const el = $(sel); if (el) el.innerHTML = svg(ic, sz);
    });
    // settings-nav glyphs (rough order)
    const navGlyphs = ['pencil', 'files', 'sun', 'command', 'gear', 'layers', 'code', 'mic', 'code', 'help'];
    $$('.settings-nav-item').forEach((el, i) => {
      const g = el.querySelector('.glyph');
      if (g) g.innerHTML = svg(navGlyphs[i] || 'gear', 14);
    });
    // onboarding hero icon
    if ($('#ob-icon')) $('#ob-icon').innerHTML = svg('globe', 18);
  }

  // ── State ─────────────────────────────────────────────────────────────
  let activeZone = 'atlas';
  let activeFile = '_brief.md';
  let activeFilePath = 'atlas/projects/workdesk/_brief.md';
  let demoEmpty = false;
  let focusOn = false;

  // ── Ribbon ────────────────────────────────────────────────────────────
  function renderRibbon() {
    const ribbon = $('#ribbon');
    ribbon.innerHTML = '';
    ZONE_ORDER.forEach((id) => {
      const z = ZONES[id];
      const slot = document.createElement('button');
      slot.className = 'zone-slot' + (id === activeZone ? ' active' : '');
      slot.dataset.zone = id;
      slot.title = z.name;
      slot.setAttribute('aria-label', `Open zone: ${z.name}`);
      slot.innerHTML = `<div class="dot">${svg(z.icon, 16)}</div>`;
      slot.addEventListener('click', () => setZone(id));
      ribbon.appendChild(slot);
    });

    const filesSlot = document.createElement('button');
    filesSlot.className = 'zone-slot' + (activeZone === 'files' ? ' active' : '');
    filesSlot.dataset.zone = 'files';
    filesSlot.title = 'All files';
    filesSlot.setAttribute('aria-label', 'All files');
    filesSlot.innerHTML = `<div class="dot">${svg('files', 16)}</div>`;
    filesSlot.addEventListener('click', () => setZone('files'));
    ribbon.appendChild(filesSlot);

    const div = document.createElement('div');
    div.className = 'ribbon-divider';
    ribbon.appendChild(div);

    const tools = [
      { id: 'rb-search', ic: 'search', title: 'Search (⌘⇧O)', act: () => openCmd() },
      { id: 'rb-today',  ic: 'calendar', title: "Today's daily note (⌘T)", act: () => { setZone('personal'); selectFile('2026-05-13.md', 'personal/daily/2026-05-13.md'); } },
      { id: 'rb-term',   ic: 'code', title: 'Terminal (⌘J)', active: true },
      { id: 'rb-focus',  ic: 'focus', title: 'Focus mode (⌘⇧F)', act: toggleFocus },
    ];
    tools.forEach((t) => {
      const el = document.createElement('button');
      el.id = t.id;
      el.className = 'ribbon-icon' + (t.active ? ' active' : '');
      if (t.id === 'rb-focus' && focusOn) el.classList.add('focus-active');
      el.title = t.title;
      el.setAttribute('aria-label', t.title);
      el.innerHTML = svg(t.ic, 18);
      if (t.act) el.addEventListener('click', t.act);
      ribbon.appendChild(el);
    });

    const sp = document.createElement('div');
    sp.className = 'ribbon-spacer';
    ribbon.appendChild(sp);

    const mic = document.createElement('button');
    mic.className = 'ribbon-icon mic';
    mic.title = 'Quick capture (⌘⇧M)';
    mic.setAttribute('aria-label', 'Quick capture');
    mic.innerHTML = svg('mic', 18);
    mic.addEventListener('click', () => openModal('qc-scrim'));
    ribbon.appendChild(mic);
  }

  // ── Zone pane ─────────────────────────────────────────────────────────
  function renderZone(zoneId) {
    const heroEl = $('#pane-hero');
    const listEl = $('#object-list');

    if (zoneId === 'files') {
      heroEl.innerHTML = `
        <div class="hero-dot" style="background: var(--ws-zone-files-bg); color: var(--ws-zone-files-fg);">${svg('files', 18)}</div>
        <div>
          <h1>All files</h1>
          <div class="hero-sub">Stock Obsidian file tree · every zone as a folder</div>
        </div>
        <button class="hero-collapse" id="collapse-left-2" aria-label="Collapse left">${svg('doubleL', 14)}</button>`;
      $('#collapse-left-2').addEventListener('click', () => toggleLeft(true));

      // Flat Obsidian-style tree: each zone is a top-level folder.
      let html = '<div class="flat-tree">';
      ZONE_ORDER.forEach((zid) => {
        const z = ZONES[zid];
        const totalCount = (z.objects || []).reduce(
          (acc, o) => acc + (typeof o.count === 'number' ? o.count : 0), 0
        );
        html += `
          <div class="row is-folder is-zone" data-depth="1" data-zone="${zid}" data-name="${z.name}">
            <div class="chevron">${svg('chevron', 10)}</div>
            <div class="glyph"><span class="zone-pip" style="background: var(--ws-zone-${zid}-fg);"></span></div>
            <div class="name">${z.name}</div>
            <div class="count">${totalCount || '—'}</div>
          </div>`;
        (z.objects || []).forEach((obj) => {
          html += `
            <div class="row is-folder" data-depth="2" data-name="${obj.title}">
              <div class="chevron">${svg('chevron', 10)}</div>
              <div class="glyph">${svg('folder', 13)}</div>
              <div class="name">${obj.title}</div>
              <div class="count">${obj.count != null ? obj.count : ''}</div>
            </div>`;
          (obj.children || []).forEach((c) => {
            // Each child uses depth offset +1 relative to the zone (zone=1, object=2, child=depth+2)
            html += renderRow({ ...c, depth: c.depth + 2 }, zid);
          });
        });
      });
      html += '</div>';
      listEl.innerHTML = html;

      // Start collapsed: hide everything past depth 1.
      $$('#object-list .row').forEach((r) => {
        if (parseInt(r.dataset.depth, 10) > 1) r.style.display = 'none';
      });

      wireFolderRows();
      wireFileRows();
      return;
    }

    const z = ZONES[zoneId];
    heroEl.innerHTML = `
      <div class="hero-dot" style="background: var(--ws-zone-${zoneId}-bg); color: var(--ws-zone-${zoneId}-fg);">${svg(z.icon, 18)}</div>
      <div>
        <h1>${z.name}</h1>
        <div class="hero-sub">${z.sub}</div>
      </div>
      <button class="hero-collapse" id="collapse-left-2" aria-label="Collapse left pane">${svg('doubleL', 14)}</button>`;
    $('#collapse-left-2').addEventListener('click', () => toggleLeft(true));

    listEl.innerHTML = '';
    if (demoEmpty || !z.objects?.length) return renderEmptyZone(zoneId);

    z.objects.forEach((obj) => {
      const isEmpty = obj.count === 0 || obj.count === '—';
      const expanded = obj.expanded || isEmpty;
      const card = document.createElement('div');
      card.className = 'obj' + (expanded ? '' : ' collapsed');
      // Object icon = first letter of the title. Only the ribbon zone slots
      // use glyphs; object-row icons stay as initials so the zone color does
      // the work of categorization.
      const iconGlyph = (obj.title || '?').trim().charAt(0);

      let childrenBlock = '';
      if (obj.children?.length) {
        childrenBlock = `<div class="obj-children">${obj.children.map((c) => renderRow(c, zoneId)).join('')}</div>`;
      } else if (obj.empty === 'caught-up') {
        childrenBlock = `<div class="obj-children"><div class="empty-row caught-up">${svg('check', 14)} All caught up.</div></div>`;
      } else if (isEmpty) {
        childrenBlock = `<div class="obj-children"><div class="empty-row">Nothing here yet.</div></div>`;
      }

      const metaClass = obj.empty === 'caught-up' ? 'obj-meta caught-up' : 'obj-meta';
      const metaContent = obj.empty === 'caught-up'
        ? svg('check', 13)
        : (obj.count != null ? obj.count : '—');

      card.innerHTML = `
        <div class="obj-row">
          <div class="obj-icon" style="background: var(--ws-zone-${zoneId}-bg); color: var(--ws-zone-${zoneId}-fg);">${iconGlyph}</div>
          <div class="obj-text">
            <div class="obj-title">${obj.title}</div>
            <div class="obj-sub">${obj.sub}</div>
          </div>
          <div class="${metaClass}">${metaContent}</div>
        </div>
        ${childrenBlock}`;

      card.querySelector('.obj-row').addEventListener('click', () => {
        if (obj.children?.length) card.classList.toggle('collapsed');
      });
      listEl.appendChild(card);
    });

    wireFolderRows();
    wireFileRows();
    initFolderStates();
  }

  function renderRow(c, zoneId, parentPath = '') {
    if (c.type === 'folder') {
      const path = `${zoneId}/${c.name}`;
      const rows = [
        `<div class="row is-folder" data-depth="${c.depth}" data-name="${c.name}" data-expanded="${!!c.expanded}">
          <div class="chevron">${svg('chevron', 10)}</div>
          <div class="glyph">${svg('folder', 13)}</div>
          <div class="name">${c.name}</div>
          <div class="count">${c.count != null ? c.count : ''}</div>
        </div>`
      ];
      (c.children || []).forEach((cc) => rows.push(renderRow(cc, zoneId, path)));
      return rows.join('');
    }
    const fullPath = `${parentPath ? parentPath + '/' : zoneId + '/'}${c.name}`;
    return `<div class="row is-file ${c.active ? 'active' : ''}" data-depth="${c.depth}" data-name="${c.name}" data-path="${fullPath}">
      <div></div>
      <div class="glyph">${svg('file', 12)}</div>
      <div class="name">${c.name}</div>
      <div class="count"></div>
    </div>`;
  }

  function renderEmptyZone(zoneId) {
    const z = ZONES[zoneId] || { name: zoneId, sub: '', icon: 'folder' };
    const listEl = $('#object-list');
    listEl.innerHTML = `
      <div class="zone-empty">
        <div class="big-dot" style="background: var(--ws-zone-${zoneId}-bg); color: var(--ws-zone-${zoneId}-fg);">${svg(z.icon, 24)}</div>
        <h2>Nothing in ${z.name} yet.</h2>
        <p>Objects appear as you capture, process, or onboard new content.</p>
        <button class="empty-cta">${svg('plus', 14)} Create first ${z.name} note</button>
      </div>`;
  }

  function wireFolderRows() {
    $$('#object-list .row.is-folder').forEach((row) => {
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = row.classList.toggle('open');
        const myDepth = parseInt(row.dataset.depth, 10);
        let n = row.nextElementSibling;
        while (n && n.classList?.contains('row') && parseInt(n.dataset.depth, 10) > myDepth) {
          if (parseInt(n.dataset.depth, 10) === myDepth + 1) {
            n.style.display = open ? '' : 'none';
          } else if (!open) {
            n.style.display = 'none';
            n.classList.remove('open');
          }
          n = n.nextElementSibling;
        }
      });
    });
  }
  function wireFileRows() {
    $$('#object-list .row.is-file').forEach((row) => {
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        selectFile(row.dataset.name, row.dataset.path);
      });
    });
  }
  function initFolderStates() {
    $$('#object-list .row.is-folder').forEach((row) => {
      const open = row.dataset.expanded === 'true';
      if (open) row.classList.add('open');
      const myDepth = parseInt(row.dataset.depth, 10);
      let n = row.nextElementSibling;
      while (n && n.classList?.contains('row') && parseInt(n.dataset.depth, 10) > myDepth) {
        if (parseInt(n.dataset.depth, 10) === myDepth + 1) {
          n.style.display = open ? '' : 'none';
        } else {
          n.style.display = 'none';
        }
        n = n.nextElementSibling;
      }
    });
  }

  // ── Editor ────────────────────────────────────────────────────────────
  function selectFile(name, path) {
    $$('#object-list .row.is-file').forEach((r) => r.classList.remove('active'));
    const row = $(`#object-list .row.is-file[data-name="${name}"]`);
    if (row) row.classList.add('active');
    activeFile = name;
    activeFilePath = path || name;
    $('#active-tab').textContent = name;
    $('#breadcrumb').innerHTML = (path || name).split('/').map((p) => `<span>${p}</span>`).join('');
    $('#editor-body').innerHTML = window.stubBodyFor(name);
  }

  // ── State setters ─────────────────────────────────────────────────────
  function setZone(id) {
    activeZone = id;
    renderRibbon();
    renderZone(id);
  }

  // ── Pane toggles ──────────────────────────────────────────────────────
  const app = $('#app');
  function toggleLeft(force) {
    const will = force !== undefined ? force : !app.classList.contains('no-left');
    app.classList.toggle('no-left', will);
  }
  function toggleRight(force) {
    const will = force !== undefined ? force : !app.classList.contains('no-right');
    app.classList.toggle('no-right', will);
  }

  // ── Theme ─────────────────────────────────────────────────────────────
  function applyTheme(dark) {
    document.body.classList.toggle('theme-dark', dark);
    document.body.classList.toggle('theme-light', !dark);
    $('#toggle-theme').innerHTML = svg(dark ? 'sun' : 'moon', 14);
    try { localStorage.setItem('wd-theme', dark ? 'dark' : 'light'); } catch (_) {}
    // re-render the terminal to apply theme-aware colors in spans
    renderTerminal();
  }

  // ── Terminal fullscreen ───────────────────────────────────────────────
  // Collapses zone pane + editor; ribbon stays so the user can still
  // switch zones, hit today, etc. Toggled via the terminal session-head
  // fullscreen button, or via Esc when active.
  function toggleTermFullscreen(force) {
    const will = force !== undefined ? force : !app.classList.contains('term-fullscreen');
    app.classList.toggle('term-fullscreen', will);
    // Force terminal tab on when entering fullscreen
    if (will) showRpTab('terminal');
    // Update the fullscreen icon
    const btn = $('#t-fullscreen');
    if (btn) {
      btn.innerHTML = svg(will ? 'contract' : 'expand', 13);
      btn.title = will ? 'Exit fullscreen' : 'Toggle fullscreen';
    }
  }
  let preFocusState = { left: false, right: false };
  function toggleFocus() {
    focusOn = !focusOn;
    if (focusOn) {
      preFocusState = {
        left: app.classList.contains('no-left'),
        right: app.classList.contains('no-right'),
      };
      app.classList.add('no-left', 'no-right');
      document.body.classList.add('focus-on');
    } else {
      if (!preFocusState.left)  app.classList.remove('no-left');
      if (!preFocusState.right) app.classList.remove('no-right');
      document.body.classList.remove('focus-on');
    }
    renderRibbon();
  }

  // ── Modals ────────────────────────────────────────────────────────────
  function openModal(id) {
    closeAllModals();
    const el = $('#' + id);
    el.classList.add('open');
    if (id === 'cmd-scrim') { setTimeout(() => $('#cmd-input')?.focus(), 30); }
  }
  function closeAllModals() {
    $$('.scrim.open').forEach((el) => el.classList.remove('open'));
  }
  $$('.scrim').forEach((scrim) => {
    scrim.addEventListener('click', (e) => {
      if (e.target === scrim) scrim.classList.remove('open');
    });
  });

  // ── Command palette ───────────────────────────────────────────────────
  const COMMANDS = [
    { group: 'Files',     icon: 'file',    label: 'Open: _brief.md',           sub: 'atlas/projects/workdesk',  act: () => { setZone('atlas'); selectFile('_brief.md', 'atlas/projects/workdesk/_brief.md'); } },
    { group: 'Files',     icon: 'file',    label: 'Open: _status.md',          sub: 'atlas/projects/workdesk',  act: () => { setZone('atlas'); selectFile('_status.md', 'atlas/projects/workdesk/_status.md'); } },
    { group: 'Files',     icon: 'sun',     label: "Open: today's daily note",  sub: 'personal/daily',           hk: ['⌘','T'], act: () => { setZone('personal'); selectFile('2026-05-13.md', 'personal/daily/2026-05-13.md'); } },
    { group: 'Zones',     icon: 'globe',   label: 'Go to zone: atlas',         sub: 'People, companies, projects', act: () => setZone('atlas') },
    { group: 'Zones',     icon: 'check',   label: 'Go to zone: gtd',           sub: 'Active projects, next actions', act: () => setZone('gtd') },
    { group: 'Zones',     icon: 'signal',  label: 'Go to zone: intel',         sub: 'Reads, concepts, briefings',    act: () => setZone('intel') },
    { group: 'Zones',     icon: 'person',  label: 'Go to zone: personal',      sub: 'Journal, daily notes',          act: () => setZone('personal') },
    { group: 'Zones',     icon: 'layers',  label: 'Go to zone: system',        sub: 'Logs, processing, reference',   act: () => setZone('system') },
    { group: 'Zones',     icon: 'gear',    label: 'Go to zone: config',        sub: 'Plugins, skills, agents',       act: () => setZone('config') },
    { group: 'WorkDesk',  icon: 'mic',     label: 'Quick capture',             sub: 'Record a voice note',           hk: ['⌘','⇧','M'], act: () => openModal('qc-scrim') },
    { group: 'WorkDesk',  icon: 'focus',   label: 'Toggle focus mode',         sub: 'Hide chrome, just the page',    hk: ['⌘','⇧','F'], act: toggleFocus },
    { group: 'WorkDesk',  icon: 'doubleR', label: 'Toggle terminal fullscreen',sub: 'Ribbon + terminal only',        act: () => toggleTermFullscreen() },
    { group: 'WorkDesk',  icon: 'moon',    label: 'Toggle dark mode',          sub: '',                              act: () => applyTheme(!document.body.classList.contains('theme-dark')) },
    { group: 'WorkDesk',  icon: 'gear',    label: 'Open WorkDesk settings',    sub: '',                              act: () => openModal('settings-scrim') },
    { group: 'WorkDesk',  icon: 'help',    label: 'Replay onboarding',        sub: 'Walk through the 4-step intro', act: () => openModal('ob-scrim') },
    { group: 'Triage',    icon: 'inbox',   label: 'Run /triage on inbox',      sub: 'Process unfiled GTD captures',  act: () => { setZone('gtd'); closeAllModals(); } },
    { group: 'Triage',    icon: 'shield',  label: 'Run /workdesk-doctor',      sub: 'Diagnose & repair install',     act: () => closeAllModals() },
    { group: 'View',      icon: 'panelL',  label: 'Toggle left pane',          sub: '',                              act: () => toggleLeft() },
    { group: 'View',      icon: 'panelR',  label: 'Toggle right pane',         sub: '',                              act: () => toggleRight() },
  ];
  function renderCommands(query = '') {
    const list = $('#cmd-list');
    list.innerHTML = '';
    const q = query.toLowerCase().trim();
    const filtered = q
      ? COMMANDS.filter((c) => (c.label + ' ' + c.sub).toLowerCase().includes(q))
      : COMMANDS;
    let lastGroup = '';
    filtered.forEach((c, i) => {
      if (c.group !== lastGroup) {
        const g = document.createElement('div');
        g.className = 'cmd-group';
        g.textContent = c.group;
        list.appendChild(g);
        lastGroup = c.group;
      }
      const item = document.createElement('div');
      item.className = 'cmd-item' + (i === 0 ? ' selected' : '');
      item.innerHTML = `
        <span class="glyph">${svg(c.icon, 15)}</span>
        <span><span>${c.label}</span>${c.sub ? `<span class="sub">${c.sub}</span>` : ''}</span>
        <span class="hk">${(c.hk || []).map((k) => `<kbd>${k}</kbd>`).join('')}</span>`;
      item.addEventListener('click', () => { c.act(); closeAllModals(); });
      list.appendChild(item);
    });
    if (!filtered.length) {
      list.innerHTML = `<div style="padding:30px;text-align:center;color:var(--text-faint);font-size:13px">No matches for "${query}"</div>`;
    }
  }
  function openCmd() { openModal('cmd-scrim'); renderCommands(''); $('#cmd-input').value = ''; }

  $('#cmd-input').addEventListener('input', (e) => renderCommands(e.target.value));
  $('#cmd-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const sel = $('.cmd-item.selected');
      if (sel) sel.click();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const items = $$('.cmd-item');
      const sel = $('.cmd-item.selected');
      const idx = items.indexOf(sel);
      const next = e.key === 'ArrowDown' ? Math.min(items.length - 1, idx + 1) : Math.max(0, idx - 1);
      items.forEach((it) => it.classList.remove('selected'));
      items[next]?.classList.add('selected');
      items[next]?.scrollIntoView({ block: 'nearest' });
    }
  });

  // ── Quick capture ─────────────────────────────────────────────────────
  $('#qc-cancel').addEventListener('click', () => closeAllModals());
  $('#qc-stop').addEventListener('click', () => closeAllModals());
  $('#qc-save').addEventListener('click', () => {
    closeAllModals();
    // could insert toast here
  });

  // ── Settings ──────────────────────────────────────────────────────────
  const SETTINGS_TABS = {
    general:  { label: 'General',       group: 'workdesk' },
    zones:    { label: 'Zones',         group: 'workdesk' },
    terminal: { label: 'Terminal',      group: 'workdesk' },
    capture:  { label: 'Quick capture', group: 'workdesk' },
    claude:   { label: 'Claude Code',   group: 'workdesk' },
    about:    { label: 'About',         group: 'workdesk' },
  };
  let activeSettingsTab = 'general';

  function renderSettings() {
    // Update nav active state
    $$('.settings-nav-item').forEach((el, i) => {
      // Items 0-3 are Obsidian-side (Editor / Files / Appearance / Hotkeys), 4+ are WorkDesk
      const wsIdx = i - 4;
      const tabs = Object.keys(SETTINGS_TABS);
      if (wsIdx >= 0 && wsIdx < tabs.length) {
        el.classList.toggle('active', tabs[wsIdx] === activeSettingsTab);
        el.style.cursor = 'pointer';
        el.onclick = () => { activeSettingsTab = tabs[wsIdx]; renderSettings(); };
      }
    });

    $('#settings-body').innerHTML = SETTINGS_CONTENT[activeSettingsTab]();
    $$('.toggle[data-toggle]').forEach((t) => t.addEventListener('click', () => t.classList.toggle('on')));
    $$('.segmented button').forEach((b) => b.addEventListener('click', () => {
      $$('.segmented button', b.parentElement).forEach((bb) => bb.classList.remove('active'));
      b.classList.add('active');
    }));
    // Demo wiring
    $$('[data-toast]').forEach((el) => el.addEventListener('click', () => {
      const [msg, sev] = el.dataset.toast.split('|');
      window.showToast(msg, sev || 'info');
    }));
  }

  const SETTINGS_CONTENT = {
    general: () => `
      <h2>General</h2>
      <div class="lead">The visual surface and behavior of WorkDesk inside Obsidian.</div>

      <div class="settings-section">
        <div class="settings-section-label">Vault</div>
        <div class="setting">
          <div>
            <div class="label">Vault path</div>
            <div class="desc">Absolute path to your WorkDesk-OS vault. Used by the install bedrock + doctor.</div>
          </div>
          <input class="field mono" value="~/Workdesk-OS" style="width:280px" />
        </div>
        <div class="setting">
          <div>
            <div class="label">Auto-open today's daily note on launch</div>
            <div class="desc">When Obsidian starts, jump straight to <code>personal/daily/{{date}}.md</code>.</div>
          </div>
          <div class="ctrl"><div class="toggle on" data-toggle></div></div>
        </div>
        <div class="setting">
          <div>
            <div class="label">Daily note template</div>
            <div class="desc">Used by quick capture + the today shortcut.</div>
          </div>
          <select class="select"><option>config/templates/daily.md</option><option>config/templates/daily-minimal.md</option></select>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-label">Theme</div>
        <div class="setting">
          <div>
            <div class="label">Match Obsidian theme</div>
            <div class="desc">Follow the host app's light/dark setting. Disable to force a theme.</div>
          </div>
          <div class="ctrl"><div class="toggle on" data-toggle></div></div>
        </div>
        <div class="setting">
          <div>
            <div class="label">Reduce motion</div>
            <div class="desc">Strips animations. Respects the OS-level setting automatically when on.</div>
          </div>
          <div class="ctrl"><div class="segmented"><button class="active">auto</button><button>on</button><button>off</button></div></div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-label">Danger zone</div>
        <div class="setting">
          <div>
            <div class="label">Reset WorkDesk to factory defaults</div>
            <div class="desc">Removes plugin state. Does not touch your vault contents.</div>
          </div>
          <button class="btn danger" data-toast="WorkDesk reset to defaults|success">Reset…</button>
        </div>
        <div class="setting">
          <div>
            <div class="label">Re-scaffold zones</div>
            <div class="desc">Rebuilds <code>config/zones.yaml</code> from defaults. Existing notes stay put.</div>
          </div>
          <button class="btn" data-toast="Zone scaffold rewritten|success">Re-scaffold</button>
        </div>
      </div>
    `,

    zones: () => `
      <h2>Zones</h2>
      <div class="lead">How the curated zone view renders your vault.</div>

      <div class="settings-section">
        <div class="settings-section-label">Layout</div>
        <div class="setting">
          <div>
            <div class="label">Show Files view in ribbon</div>
            <div class="desc">Adds the stock Obsidian file tree at the bottom of the zone list. Useful as an escape hatch.</div>
          </div>
          <div class="ctrl"><div class="toggle on" data-toggle></div></div>
        </div>
        <div class="setting">
          <div>
            <div class="label">Zone density</div>
            <div class="desc">Vertical spacing inside zone cards.</div>
          </div>
          <div class="ctrl"><div class="segmented"><button>compact</button><button class="active">cozy</button><button>spacious</button></div></div>
        </div>
        <div class="setting">
          <div>
            <div class="label">Expand active zone by default</div>
            <div class="desc">First object in each zone opens automatically.</div>
          </div>
          <div class="ctrl"><div class="toggle on" data-toggle></div></div>
        </div>
        <div class="setting">
          <div>
            <div class="label">Show file counts</div>
            <div class="desc">Tabular numbers right-aligned in zone cards and tree rows.</div>
          </div>
          <div class="ctrl"><div class="toggle on" data-toggle></div></div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-label">Zone manifest</div>
        <div class="setting">
          <div>
            <div class="label">Zones source</div>
            <div class="desc">Path to the YAML that defines zones and which folders they include.</div>
          </div>
          <input class="field mono" value="config/zones.yaml" style="width:280px" />
        </div>
        <div class="setting">
          <div>
            <div class="label">Object icons</div>
            <div class="desc">Maps object names → glyph keys. See <code>shared/icons.js</code> for the full set.</div>
          </div>
          <input class="field mono" value="config/object-icons.yaml" style="width:280px" />
        </div>
        <div class="setting">
          <div>
            <div class="label">Reload manifests</div>
            <div class="desc">Re-reads zones.yaml and rebuilds the pane without restarting Obsidian.</div>
          </div>
          <button class="btn" data-toast="Zone manifest reloaded|success">Reload</button>
        </div>
      </div>
    `,

    terminal: () => `
      <h2>Claude Code terminal</h2>
      <div class="lead">Embedded terminal for Claude Code / Codex sessions. Backed by the workdesk-terminal sub-module.</div>

      <div class="settings-section">
        <div class="settings-section-label">Defaults</div>
        <div class="setting">
          <div>
            <div class="label">Right pane is terminal by default</div>
            <div class="desc">When you open WorkDesk, the right pane shows the terminal instead of Backlinks/Outline.</div>
          </div>
          <div class="ctrl"><div class="toggle on" data-toggle></div></div>
        </div>
        <div class="setting">
          <div>
            <div class="label">Default shell</div>
            <div class="desc">Command spawned for each new session.</div>
          </div>
          <input class="field mono" value="/bin/zsh -il" style="width:240px" />
        </div>
        <div class="setting">
          <div>
            <div class="label">Default working directory</div>
            <div class="desc">Each new session starts here. Use <code>{{vault}}</code> for the vault root.</div>
          </div>
          <input class="field mono" value="{{vault}}" style="width:240px" />
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-label">Appearance</div>
        <div class="setting">
          <div>
            <div class="label">Terminal font</div>
            <div class="desc">Monospace family for the canvas. All themed via tokens.css.</div>
          </div>
          <select class="select"><option>Geist Mono</option><option>JetBrains Mono</option><option>IBM Plex Mono</option><option>SF Mono</option></select>
        </div>
        <div class="setting">
          <div>
            <div class="label">Font size</div>
            <div class="desc">Canvas text size. Composer matches in fullscreen.</div>
          </div>
          <div class="ctrl"><div class="segmented"><button>12</button><button class="active">13</button><button>14</button><button>15</button></div></div>
        </div>
        <div class="setting">
          <div>
            <div class="label">Wrap long lines</div>
            <div class="desc">Soft-wrap terminal output at pane width.</div>
          </div>
          <div class="ctrl"><div class="toggle on" data-toggle></div></div>
        </div>
        <div class="setting">
          <div>
            <div class="label">Cursor style</div>
            <div class="desc">Block is the default; bar is thinner. Both blink at 1 s.</div>
          </div>
          <div class="ctrl"><div class="segmented"><button class="active">block</button><button>bar</button><button>underline</button></div></div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-label">Sessions</div>
        <div class="setting">
          <div>
            <div class="label">Persist session names</div>
            <div class="desc">Tab names + layout survive restarts.</div>
          </div>
          <div class="ctrl"><div class="toggle on" data-toggle></div></div>
        </div>
        <div class="setting">
          <div>
            <div class="label">Scrollback lines</div>
            <div class="desc">Per-session history retained in memory.</div>
          </div>
          <input class="field" value="10000" style="width:120px" />
        </div>
      </div>
    `,

    capture: () => `
      <h2>Quick capture</h2>
      <div class="lead">Record a voice note from anywhere with <kbd>⌘⇧M</kbd>. Transcribed via cloud STT, routed by <code>/triage</code>.</div>

      <div class="settings-section">
        <div class="settings-section-label">Speech-to-text</div>
        <div class="setting">
          <div>
            <div class="label">STT provider</div>
            <div class="desc">Cloud-only by design — cross-device parity outweighs offline use.</div>
          </div>
          <select class="select"><option>Groq · whisper-large-v3</option><option>OpenAI · whisper-1</option><option>Deepgram · nova-2</option></select>
        </div>
        <div class="setting">
          <div>
            <div class="label">API key</div>
            <div class="desc">Stored in Obsidian's encrypted plugin data store. Never written to vault.</div>
          </div>
          <input class="field mono" value="gsk_••••••••••••••••••••" style="width:260px" />
        </div>
        <div class="setting">
          <div>
            <div class="label">Stream partials</div>
            <div class="desc">Show live transcript as you speak. Otherwise wait for final.</div>
          </div>
          <div class="ctrl"><div class="toggle on" data-toggle></div></div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-label">Capture behavior</div>
        <div class="setting">
          <div>
            <div class="label">Default destination</div>
            <div class="desc">Where transcribed captures land before triage.</div>
          </div>
          <select class="select"><option>personal/captures</option><option>system/inbox</option><option>gtd/inbox</option></select>
        </div>
        <div class="setting">
          <div>
            <div class="label">Filename pattern</div>
            <div class="desc">Mustache template. <code>{{timestamp}}</code>, <code>{{slug}}</code>, <code>{{date}}</code> available.</div>
          </div>
          <input class="field mono" value="{{timestamp}}-{{slug}}.md" style="width:260px" />
        </div>
        <div class="setting">
          <div>
            <div class="label">Auto-log to system/log.md</div>
            <div class="desc">Append a one-line entry pointing at each capture.</div>
          </div>
          <div class="ctrl"><div class="toggle on" data-toggle></div></div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-label">Audio</div>
        <div class="setting">
          <div>
            <div class="label">Input device</div>
            <div class="desc">Microphone used for capture. System default if unset.</div>
          </div>
          <select class="select"><option>System default</option><option>MacBook Pro Microphone</option><option>AirPods Pro</option></select>
        </div>
        <div class="setting">
          <div>
            <div class="label">Test microphone</div>
            <div class="desc">Verify input is reaching the STT provider.</div>
          </div>
          <button class="btn" data-toast="Mic test: 'one, two, three' — Groq returned in 412ms|success">Run test</button>
        </div>
      </div>
    `,

    claude: () => `
      <h2>Claude Code</h2>
      <div class="lead">The CLI tool that runs inside the terminal. Settings here control how WorkDesk surfaces its output.</div>

      <div class="settings-section">
        <div class="settings-section-label">Integration</div>
        <div class="setting">
          <div>
            <div class="label">Claude binary path</div>
            <div class="desc">Override if <code>claude</code> isn't on PATH.</div>
          </div>
          <input class="field mono" value="/usr/local/bin/claude" style="width:240px" />
        </div>
        <div class="setting">
          <div>
            <div class="label">Auto-detect tab status</div>
            <div class="desc">Parse <code>●</code> / <code>⎿</code> markers from output to set tab status dots.</div>
          </div>
          <div class="ctrl"><div class="toggle on" data-toggle></div></div>
        </div>
        <div class="setting">
          <div>
            <div class="label">Highlight wikilinks in output</div>
            <div class="desc">Render <code>[[note]]</code> in atlas-blue inside the terminal canvas.</div>
          </div>
          <div class="ctrl"><div class="toggle on" data-toggle></div></div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-label">Display</div>
        <div class="setting">
          <div>
            <div class="label">Show context % in statusbar</div>
            <div class="desc">Pulls from Claude Code's session metadata.</div>
          </div>
          <div class="ctrl"><div class="toggle on" data-toggle></div></div>
        </div>
        <div class="setting">
          <div>
            <div class="label">Show cost estimate</div>
            <div class="desc">Cumulative cost since session start.</div>
          </div>
          <div class="ctrl"><div class="toggle on" data-toggle></div></div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-label">Skills</div>
        <div class="setting">
          <div>
            <div class="label">Skills directory</div>
            <div class="desc">Read by Claude Code on session start.</div>
          </div>
          <input class="field mono" value="config/skills" style="width:240px" />
        </div>
        <div class="setting">
          <div>
            <div class="label">Show skills loaded count</div>
            <div class="desc">Statusbar shows e.g. <code># 18 skills</code>.</div>
          </div>
          <div class="ctrl"><div class="toggle on" data-toggle></div></div>
        </div>
      </div>
    `,

    about: () => `
      <h2>About WorkDesk</h2>
      <div class="lead">Built for the operator who lives inside their notes — calm, deliberate, agent-collaborative.</div>

      <div class="settings-section">
        <div class="settings-section-label">Plugin</div>
        <div class="setting">
          <div>
            <div class="label">Version</div>
            <div class="desc">Current installed version.</div>
          </div>
          <span class="field mono" style="display:inline-block;padding:6px 10px;background:var(--background-modifier-form-field);border:1px solid var(--background-modifier-border);border-radius:6px;">1.0.0</span>
        </div>
        <div class="setting">
          <div>
            <div class="label">Check for updates</div>
            <div class="desc">Pulls the latest release manifest from GitHub.</div>
          </div>
          <button class="btn" data-toast="Up to date|success">Check now</button>
        </div>
        <div class="setting">
          <div>
            <div class="label">Run diagnostic</div>
            <div class="desc"><code>/workdesk-doctor</code> · checks vault scaffold, terminal binary, STT reachability.</div>
          </div>
          <button class="btn" data-toast="Running /workdesk-doctor…|loading">Run</button>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-label">Resources</div>
        <div class="setting">
          <div>
            <div class="label">Repository</div>
            <div class="desc"><a href="https://github.com/BenaliHQ/workdesk-os" target="_blank">github.com/BenaliHQ/workdesk-os</a></div>
          </div>
          <button class="btn">Open</button>
        </div>
        <div class="setting">
          <div>
            <div class="label">Terminal sub-module</div>
            <div class="desc"><a href="https://github.com/BenaliHQ/workdesk-terminal" target="_blank">github.com/BenaliHQ/workdesk-terminal</a></div>
          </div>
          <button class="btn">Open</button>
        </div>
        <div class="setting">
          <div>
            <div class="label">License</div>
            <div class="desc">MIT · <a href="#">view source</a></div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-label">Credits</div>
        <p style="font-size: 13px; color: var(--text-muted); line-height: 1.65; margin: 4px 0;">
          WorkDesk · designed for <span class="wikilink">khalil-benalioulhaj</span> at Benali. Visual surface built against the workdesk-terminal repo by
          <a href="https://github.com/internetvin" target="_blank">Vin Verma</a> (MIT, vendored).
        </p>
      </div>
    `,
  };

  // ── Onboarding ────────────────────────────────────────────────────────
  const OB_STEPS = [
    { icon: 'globe', title: 'Welcome to WorkDesk',
      body: `<p>WorkDesk is a curated surface for your Obsidian vault — designed for a single operator running their daily work from notes, with Claude Code as a side-by-side collaborator.</p>
             <p>Four panes make up the surface: <strong>ribbon</strong> (zones), <strong>zone pane</strong> (objects), <strong>editor</strong>, and <strong>terminal</strong>. We'll walk through each.</p>
             <div class="callout note" style="margin-top:18px"><div class="callout-title">Heads up</div><p>This onboarding takes ~3 minutes. You can replay any time from the command palette.</p></div>` },
    { icon: 'layers', title: 'Five zones',
      body: `<p>Your vault is organized into five <em>zones</em>, each color-coded:</p>
             <ul>
               <li><span class="wikilink">atlas</span> — people, companies, projects, decisions</li>
               <li><span class="wikilink">gtd</span> — active projects + next actions</li>
               <li><span class="wikilink">intel</span> — reads, concepts, briefings</li>
               <li><span class="wikilink">personal</span> — journal, daily notes, captures</li>
               <li><span class="wikilink">system</span> — logs and reference</li>
             </ul>
             <p>Each zone has a pastel dot in the ribbon. Click to jump.</p>` },
    { icon: 'mic', title: 'Quick capture',
      body: `<p>Press <kbd>⌘</kbd>+<kbd>⇧</kbd>+<kbd>M</kbd> anywhere — even outside Obsidian — to record a voice note. It's transcribed by Groq Whisper and lands in <code>personal/captures</code>.</p>
             <p>From there, your daily <code>/triage</code> routes it to the right zone.</p>
             <div class="callout success" style="margin-top:18px"><div class="callout-title">Started is better than perfect</div><p>Don't worry about where it lives. Capture first, sort later.</p></div>` },
    { icon: 'code', title: 'Claude Code is your right pane',
      body: `<p>The right pane is a live Claude Code session, scoped to your vault. Ask it to read, summarize, refactor, or run skills.</p>
             <p>Pre-loaded skills: <code>/triage</code>, <code>/onboarding</code>, <code>/workdesk-doctor</code>, plus 15 more in <code>config/skills</code>.</p>
             <p>You're ready. Open <kbd>⌘</kbd><kbd>K</kbd> any time to find anything.</p>` },
  ];
  let obStep = 0;
  function renderOnboarding() {
    const s = OB_STEPS[obStep];
    $('#ob-step').textContent = obStep + 1;
    $('#ob-icon').innerHTML = svg(s.icon, 18);
    $('#ob-body').innerHTML = `<h3 style="margin:0 0 10px;font-family:var(--ws-font-display);font-size:18px;letter-spacing:-0.01em">${s.title}</h3>${s.body}`;
    $('#ob-dots').innerHTML = OB_STEPS.map((_, i) =>
      `<div style="width:7px;height:7px;border-radius:50%;background:${i === obStep ? 'var(--interactive-accent)' : 'var(--background-modifier-border)'}"></div>`).join('');
    $('#ob-back').style.visibility = obStep === 0 ? 'hidden' : '';
    $('#ob-next').textContent = obStep === OB_STEPS.length - 1 ? 'Get started' : 'Next';
  }
  $('#ob-back').addEventListener('click', () => { obStep = Math.max(0, obStep - 1); renderOnboarding(); });
  $('#ob-next').addEventListener('click', () => {
    if (obStep === OB_STEPS.length - 1) { closeAllModals(); }
    else { obStep++; renderOnboarding(); }
  });
  $('#ob-close').addEventListener('click', () => closeAllModals());

  // ── Right-pane tabs ───────────────────────────────────────────────────
  const RP_PANELS = ['backlinks', 'outline', 'calendar', 'terminal'];
  function showRpTab(name) {
    $$('.right-tab').forEach((t) => {
      t.classList.toggle('active', t.dataset.rtab === name);
    });
    $('#terminal-body').style.display  = name === 'terminal'  ? '' : 'none';
    $('#calendar-body').style.display  = name === 'calendar'  ? 'flex' : 'none';
    $('#backlinks-body').style.display = name === 'backlinks' ? 'flex' : 'none';
    $('#outline-body').style.display   = name === 'outline'   ? 'flex' : 'none';
    // Set a class on the right pane that tracks which tab is active so CSS
    // can show/hide the composer + statusbar (only relevant for terminal).
    const rp = document.querySelector('.right-pane');
    if (rp) {
      RP_PANELS.forEach((p) => rp.classList.remove('tab-' + p));
      rp.classList.add('tab-' + name);
    }
    if (name === 'calendar')  renderCalendar();
    if (name === 'backlinks') renderBacklinks();
    if (name === 'outline')   renderOutline();
  }
  $$('.right-tab[data-rtab]').forEach((t) => {
    t.addEventListener('click', () => showRpTab(t.dataset.rtab));
  });

  // ── Calendar view ─────────────────────────────────────────────────────
  // Today is May 13 2026 per the prototype's frozen clock.
  const TODAY = { y: 2026, m: 5, d: 13 };       // m is 1-12
  let calCursor = { y: TODAY.y, m: TODAY.m };
  let calSelected = { ...TODAY };

  // Mock vault: notes indexed by ISO date. Each entry: { path, name, zone, sub }.
  const NOTES_BY_DATE = {
    '2026-05-13': [
      { path: 'personal/daily/2026-05-13.md',              name: '2026-05-13.md',         zone: 'personal', sub: 'Daily note' },
      { path: 'personal/captures/2026-05-13T0941.md',      name: '09:41 voice capture',   zone: 'personal', sub: '"The hard part isn\'t building the plugin…"' },
      { path: 'atlas/meetings/2026-05-13 lisa-sync.md',    name: 'lisa-sync',             zone: 'atlas',    sub: 'Meeting · 14:00–14:30' },
      { path: 'atlas/decisions/2026-05-13 stt-provider.md',name: 'STT provider: Groq',    zone: 'atlas',    sub: 'Decision' },
      { path: 'gtd/next-actions/2026-05-13-ship-spec.md',  name: 'Ship visual spec',      zone: 'gtd',      sub: 'Next action · done' },
    ],
    '2026-05-12': [
      { path: 'personal/daily/2026-05-12.md',              name: '2026-05-12.md',         zone: 'personal', sub: 'Daily note' },
      { path: 'personal/captures/2026-05-12T1722.md',      name: '17:22 voice capture',   zone: 'personal', sub: '"Three forks — one shipping…"' },
      { path: 'atlas/meetings/2026-05-12 internal-review.md', name: 'internal-review',    zone: 'atlas',    sub: 'Meeting · 10:00–10:45' },
    ],
    '2026-05-11': [
      { path: 'personal/daily/2026-05-11.md',              name: '2026-05-11.md',         zone: 'personal', sub: 'Daily note' },
      { path: 'atlas/meetings/2026-05-11 yvette-1on1.md',  name: 'yvette-1on1',           zone: 'atlas',    sub: 'Meeting · 13:00–14:00' },
      { path: 'gtd/next-actions/2026-05-11-dudley-msa.md', name: 'Dudley MSA red-lines',  zone: 'gtd',      sub: 'Next action' },
    ],
    '2026-05-10': [
      { path: 'personal/daily/2026-05-10.md', name: '2026-05-10.md', zone: 'personal', sub: 'Daily note' },
    ],
    '2026-05-08': [
      { path: 'personal/daily/2026-05-08.md', name: '2026-05-08.md', zone: 'personal', sub: 'Daily note' },
      { path: 'intel/reads/2026-05-08 cursor-vs-claude.md', name: 'Cursor vs. Claude Code', zone: 'intel', sub: 'Read · highlighted 4 passages' },
    ],
    '2026-05-07': [
      { path: 'personal/daily/2026-05-07.md', name: '2026-05-07.md', zone: 'personal', sub: 'Daily note' },
      { path: 'atlas/decisions/2026-05-07 plugin-budget.md', name: 'Plugin LOC budget: 500', zone: 'atlas', sub: 'Decision' },
    ],
    '2026-05-06': [
      { path: 'personal/daily/2026-05-06.md', name: '2026-05-06.md', zone: 'personal', sub: 'Daily note' },
    ],
    '2026-05-05': [
      { path: 'personal/daily/2026-05-05.md', name: '2026-05-05.md', zone: 'personal', sub: 'Daily note' },
    ],
    '2026-05-04': [
      { path: 'personal/daily/2026-05-04.md', name: '2026-05-04.md', zone: 'personal', sub: 'Daily note' },
      { path: 'gtd/projects/q2-content-plan/_brief.md', name: 'q2-content-plan/_brief', zone: 'gtd', sub: 'Project brief created' },
    ],
    '2026-05-01': [
      { path: 'personal/daily/2026-05-01.md', name: '2026-05-01.md', zone: 'personal', sub: 'Daily note' },
    ],
    '2026-04-30': [
      { path: 'personal/daily/2026-04-30.md', name: '2026-04-30.md', zone: 'personal', sub: 'Daily note' },
      { path: 'atlas/projects/workdesk/_status.md', name: '_status.md', zone: 'atlas', sub: 'v1.2.6 shipped' },
    ],
    '2026-04-29': [{ path: 'personal/daily/2026-04-29.md', name: '2026-04-29.md', zone: 'personal', sub: 'Daily note' }],
    '2026-04-28': [
      { path: 'personal/daily/2026-04-28.md', name: '2026-04-28.md', zone: 'personal', sub: 'Daily note' },
      { path: 'atlas/projects/workdesk/notes/2026-04-28-bug-list-v1.md', name: '2026-04-28-bug-list-v1', zone: 'atlas', sub: '28-item punch list' },
    ],
    '2026-04-27': [{ path: 'personal/daily/2026-04-27.md', name: '2026-04-27.md', zone: 'personal', sub: 'V1 shipped' }],
    '2026-04-25': [{ path: 'personal/daily/2026-04-25.md', name: '2026-04-25.md', zone: 'personal', sub: 'Daily note' }],
  };
  // Cells with a pip = whatever's in NOTES_BY_DATE (note: this overrides the
  // older DAYS_WITH_NOTES set so they stay in sync automatically).
  const DAYS_WITH_NOTES = new Set(Object.keys(NOTES_BY_DATE));

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DOW_SHORT_DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const DOW = ['Mo','Tu','We','Th','Fr','Sa','Su'];

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function ymd(y, m, d) { return `${y}-${pad2(m)}-${pad2(d)}`; }

  function renderCalendar() {
    const { y, m } = calCursor;
    // first of month, weekday Mon=0..Sun=6
    const first = new Date(y, m - 1, 1);
    const dow0 = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(y, m, 0).getDate();
    const prevDays = new Date(y, m - 1, 0).getDate();

    let cells = [];
    // leading prev-month
    for (let i = dow0 - 1; i >= 0; i--) {
      cells.push({ d: prevDays - i, y: m === 1 ? y - 1 : y, m: m === 1 ? 12 : m - 1, outOfMonth: true });
    }
    for (let d = 1; d <= daysInMonth; d++) cells.push({ d, y, m, outOfMonth: false });
    // trailing — fill to 6 rows × 7 cols = 42 cells
    let trail = 1;
    while (cells.length < 42) {
      cells.push({ d: trail++, y: m === 12 ? y + 1 : y, m: m === 12 ? 1 : m + 1, outOfMonth: true });
    }

    const headerHtml = `
      <div class="cal-head">
        <div>
          <span class="month">${MONTH_NAMES[m - 1]}</span><span class="year">${y}</span>
        </div>
        <div class="nav">
          <button class="icon-btn" id="cal-prev" title="Previous month">${svg('chevron', 12, 'style="transform: rotate(180deg)"')}</button>
          <button class="icon-btn" id="cal-today" title="Jump to today" style="width:auto;padding:0 8px;font-size:11px;font-weight:500">Today</button>
          <button class="icon-btn" id="cal-next" title="Next month">${svg('chevron', 12)}</button>
        </div>
      </div>`;

    const dowHtml = `<div class="cal-dow">${DOW.map((d) => `<div>${d}</div>`).join('')}</div>`;

    const gridHtml = `<div class="cal-grid">${cells.map((c) => {
      const dateStr = ymd(c.y, c.m, c.d);
      const isToday = (c.y === TODAY.y && c.m === TODAY.m && c.d === TODAY.d);
      const isSelected = (c.y === calSelected.y && c.m === calSelected.m && c.d === calSelected.d);
      const hasNote = DAYS_WITH_NOTES.has(dateStr);
      const classes = ['cal-cell'];
      if (c.outOfMonth) classes.push('out-of-month');
      if (isToday) classes.push('today');
      if (isSelected) classes.push('selected');
      if (hasNote) classes.push('has-note');
      return `<button class="${classes.join(' ')}" data-date="${dateStr}" data-d="${c.d}" data-y="${c.y}" data-m="${c.m}">
        ${c.d}${hasNote ? '<span class="pip"></span>' : ''}
      </button>`;
    }).join('')}</div>`;

    // Notes for the currently-selected day
    const selDateStr = ymd(calSelected.y, calSelected.m, calSelected.d);
    const selDow = new Date(calSelected.y, calSelected.m - 1, calSelected.d).getDay();
    const isSelToday = selDateStr === ymd(TODAY.y, TODAY.m, TODAY.d);
    const dayLabel = isSelToday
      ? `Today · ${MONTH_NAMES[calSelected.m - 1]} ${calSelected.d}`
      : `${DOW_SHORT_DAYS[selDow]}, ${MONTH_NAMES[calSelected.m - 1]} ${calSelected.d}`;
    const notes = NOTES_BY_DATE[selDateStr] || [];

    const notesHtml = `
      <div class="cal-section">
        <div class="cal-day-head">
          <div class="cal-day-label">${dayLabel}</div>
          <div class="cal-day-count">${notes.length} ${notes.length === 1 ? 'note' : 'notes'}</div>
        </div>
        ${notes.length
          ? notes.map((n) => `
              <div class="cal-note" data-path="${n.path}" data-name="${n.name}">
                <span class="dot" style="background: var(--ws-zone-${n.zone}-fg);"></span>
                <div class="cal-note-text">
                  <div class="cal-note-name">${n.name}</div>
                  <div class="cal-note-sub">${n.sub}</div>
                </div>
              </div>`).join('')
          : `<div class="cal-empty">
              <div class="cal-empty-glyph">${svg('feather', 18)}</div>
              <div class="cal-empty-msg">No notes on this day.</div>
              <button class="btn ghost cal-empty-cta" data-create-daily>${svg('plus', 13)} <span style="margin-left:6px">Create daily note</span></button>
            </div>`
        }
      </div>`;

    $('#calendar-body').innerHTML = headerHtml + dowHtml + gridHtml + notesHtml;

    // Wire nav
    $('#cal-prev').addEventListener('click', () => {
      calCursor.m -= 1;
      if (calCursor.m < 1) { calCursor.m = 12; calCursor.y -= 1; }
      renderCalendar();
    });
    $('#cal-next').addEventListener('click', () => {
      calCursor.m += 1;
      if (calCursor.m > 12) { calCursor.m = 1; calCursor.y += 1; }
      renderCalendar();
    });
    $('#cal-today').addEventListener('click', () => {
      calCursor = { y: TODAY.y, m: TODAY.m };
      calSelected = { ...TODAY };
      renderCalendar();
      openDailyForDate(ymd(TODAY.y, TODAY.m, TODAY.d));
    });
    // Wire day cells
    $$('#calendar-body .cal-cell').forEach((cell) => {
      cell.addEventListener('click', () => {
        calSelected = {
          y: parseInt(cell.dataset.y, 10),
          m: parseInt(cell.dataset.m, 10),
          d: parseInt(cell.dataset.d, 10),
        };
        // If cell is from prev/next month, jump the cursor too
        if (calSelected.y !== calCursor.y || calSelected.m !== calCursor.m) {
          calCursor = { y: calSelected.y, m: calSelected.m };
        }
        renderCalendar();
        openDailyForDate(cell.dataset.date);
      });
    });
    $$('#calendar-body .cal-note').forEach((n) => {
      n.addEventListener('click', () => {
        const path = n.dataset.path;
        const name = n.dataset.name;
        // Pick the zone from the path's first segment
        const z = (path || '').split('/')[0];
        if (z) setZone(z);
        selectFile(name, path);
      });
    });
    const createBtn = $('#calendar-body [data-create-daily]');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        const dateStr = ymd(calSelected.y, calSelected.m, calSelected.d);
        openDailyForDate(dateStr);
      });
    }
  }

  function openDailyForDate(dateStr) {
    // Only the existing seeded files have real content; others get a stub
    const name = `${dateStr}.md`;
    setZone('personal');
    selectFile(name, `personal/daily/${name}`);
  }

  // ── Backlinks view ────────────────────────────────────────────────────
  function renderBacklinks() {
    const links = [
      { name: 'plan.md',                  ctx: '… per the <em>_brief.md</em>, three forks ranked …', path: 'atlas/projects/workdesk' },
      { name: '_status.md',               ctx: 'See <em>_brief.md</em> for the locked DONE criterion …', path: 'atlas/projects/workdesk' },
      { name: '2026-05-13.md',            ctx: 'Shipped the <em>_brief.md</em> visual spec around 11am.', path: 'personal/daily' },
      { name: '2026-04-28-bug-list-v1.md',ctx: '… 28 items inherited from the <em>_brief</em> punch list …', path: 'atlas/projects/workdesk/notes' },
      { name: 'yvette-raven.md',          ctx: 'Owner of the dogfood test described in <em>_brief.md</em>.', path: 'atlas/people' },
    ];
    const unlinked = [
      { name: '2026-04-30 sync.md', ctx: '… we&apos;ll need a brief by Friday …' },
      { name: 'principles.md',      ctx: '… 12 carried, 3 dormant — see brief …' },
    ];
    $('#backlinks-body').innerHTML = `
      <div class="rp-section-label">${links.length} backlinks to _brief.md</div>
      ${links.map((l) => `
        <div class="rp-link">
          <span class="glyph">${svg('file', 13)}</span>
          <div>
            <div style="font-family:var(--ws-font-mono);font-size:12.5px">${l.name}</div>
            <div class="ctx">${l.ctx}</div>
          </div>
        </div>`).join('')}
      <div class="rp-section-label" style="margin-top:14px">${unlinked.length} mentioned, not linked</div>
      ${unlinked.map((l) => `
        <div class="rp-link">
          <span class="glyph">${svg('file', 13)}</span>
          <div>
            <div style="font-family:var(--ws-font-mono);font-size:12.5px;color:var(--text-muted)">${l.name}</div>
            <div class="ctx">${l.ctx}</div>
          </div>
        </div>`).join('')}
    `;
  }

  // ── Outline view ──────────────────────────────────────────────────────
  function renderOutline() {
    // Walk headings from the current editor body
    const headings = $$('#editor-body h1, #editor-body h2, #editor-body h3, #editor-body h4')
      .map((h) => ({ level: parseInt(h.tagName.substring(1), 10), text: h.textContent }));
    const rows = headings.length
      ? headings.map((h) => `<div class="rp-outline-row h${h.level}">${h.text}</div>`).join('')
      : `<div style="color: var(--text-faint); font-size: 13px; padding: 8px;">No headings in this file.</div>`;
    $('#outline-body').innerHTML = `<div class="rp-section-label">Document outline</div>${rows}`;
  }
  function renderTerminal() {
    // Designed against real xterm.js constraints:
    //  · monospace font (Geist Mono)
    //  · 16-color ANSI palette mapped to --ws-term-* tokens
    //  · flat background (no per-line fills, no rounded corners inside the
    //    output area, no inline widgets) — structure built from unicode
    //    box-drawing characters and ANSI-colored spans only.
    //  · cursor: a block caret colored from --ws-term-caret.
    // Chrome OUTSIDE the canvas (session header strip, statusbar) is fair
    // game — those are separate DOM nodes a plugin can render around xterm.js.
    $('#terminal-body').innerHTML = `
      <div class="term-session-head">
        <span class="scope">~/Workdesk-OS</span>
        <span class="term-box">·</span>
        <span class="branch">main</span>
        <div class="actions">
          <button class="action" id="t-menu"       title="Session menu"      aria-label="Session menu">${svg('more', 14)}</button>
          <button class="action" id="t-fullscreen" title="Toggle fullscreen" aria-label="Fullscreen">${svg('expand', 13)}</button>
        </div>
      </div>
      <div class="term-tabs" id="term-tabs">
        <button class="term-tab active" data-tab="0" data-status="waiting"><span class="tt-name">claude</span><span class="tt-x" aria-label="Close tab">×</span></button>
        <button class="term-tab" data-tab="1" data-status="working"><span class="tt-name">codex</span><span class="tt-x" aria-label="Close tab">×</span></button>
        <button class="term-tab" data-tab="2" data-status="idle"><span class="tt-name">scratch</span><span class="tt-x" aria-label="Close tab">×</span></button>
        <button class="term-tab tt-new" id="term-tab-new" aria-label="New terminal tab">${svg('plus', 12)}</button>
      </div>
      <div class="term-canvas" id="term-canvas" style="padding: var(--ws-space-3) var(--ws-space-4) var(--ws-space-4); font-family: var(--ws-font-mono); font-size: 13px; line-height: 1.65;">

        <div class="term-line"><span class="term-meta">claude code v0.42 · session 4d8a · started 11:02</span></div>
        <div class="term-line"><span class="term-success">●</span> <span class="term-claude">Vault root resolved · 18 skills · 11 rules · 3 agents</span></div>
        <div class="term-line">&nbsp;</div>

        <div class="term-line"><span class="term-prompt">▌</span> <span class="term-user">read ${activeFilePath} and tell me what's locked</span></div>
        <div class="term-line">&nbsp;</div>
        <div class="term-line"><span class="term-tool">●</span> <span class="term-claude">Read</span><span class="term-dim">(</span><span class="term-accent">${activeFilePath}</span><span class="term-dim">)</span></div>
        <div class="term-line"><span class="term-box">  ⎿</span>  <span class="term-dim">98 lines · 4.2 KB · last modified 09:14</span></div>
        <div class="term-line">&nbsp;</div>

        <div class="term-line"><span class="term-claude">I read the brief. Here are the locked decisions:</span></div>
        <div class="term-line">&nbsp;</div>
        <div class="term-line"><span class="term-claude">  <span class="term-box">•</span> <span class="term-accent">DONE criterion</span>: Yvette runs daily work for</span></div>
        <div class="term-line"><span class="term-claude">    2 weeks, no expert on call</span></div>
        <div class="term-line"><span class="term-claude">  <span class="term-box">•</span> 12 principles (3 dormant) carried over</span></div>
        <div class="term-line"><span class="term-claude">  <span class="term-box">•</span> Scope: install + onboarding + hardening + polish</span></div>
        <div class="term-line">&nbsp;</div>

        <div class="term-line"><span class="term-prompt">▌</span> <span class="term-user">what's the next action?</span></div>
        <div class="term-line">&nbsp;</div>
        <div class="term-line"><span class="term-tool">●</span> <span class="term-claude">Read</span><span class="term-dim">(</span><span class="term-accent">atlas/projects/workdesk/_status.md</span><span class="term-dim">)</span></div>
        <div class="term-line"><span class="term-box">  ⎿</span>  <span class="term-dim">42 lines · 1.1 KB</span></div>
        <div class="term-line">&nbsp;</div>

        <div class="term-line"><span class="term-claude">Three forks, ranked:</span></div>
        <div class="term-line">&nbsp;</div>
        <div class="term-line"><span class="term-claude">  1. <span class="term-success">✓</span> Khalil dogfoods WorkDesk      <span class="term-dim">← biggest lever</span></span></div>
        <div class="term-line"><span class="term-claude">  2. <span class="term-warn">◐</span> Yvette dogfood prep            <span class="term-dim">clearest path</span></span></div>
        <div class="term-line"><span class="term-claude">  3. <span class="term-dim">○</span> v1.2.7 hardening leftovers     <span class="term-dim">lowest risk</span></span></div>
        <div class="term-line">&nbsp;</div>

        <div class="term-line"><span class="term-prompt">▌</span> <span class="term-user">attach </span><span class="term-bracket">[[</span><span class="term-user">_brief</span></div>

        <div class="term-autocomplete">
          <div class="term-ac-row selected">${svg('file', 11)}<span>atlas/projects/workdesk/<strong>_brief</strong>.md</span></div>
          <div class="term-ac-row">${svg('file', 11)}<span>gtd/projects/ship-workdesk-v1.2.7/<strong>_brief</strong>.md</span></div>
          <div class="term-ac-row">${svg('file', 11)}<span>atlas/projects/dudley-msa-review/<strong>_brief</strong>.md</span></div>
          <div class="term-ac-footer"><kbd>↑↓</kbd> nav · <kbd>↵</kbd> insert · <kbd>esc</kbd> close</div>
        </div>

      </div>`;

    // Wire session-header buttons (visual only in prototype)
    const fs = $('#t-fullscreen'); if (fs) fs.addEventListener('click', () => toggleTermFullscreen());
    const mn = $('#t-menu'); if (mn) mn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSessionMenu(mn);
    });
    // Tabs
    $$('.term-tab[data-tab]').forEach((t) => {
      t.addEventListener('click', () => {
        $$('.term-tab').forEach((tt) => tt.classList.remove('active'));
        t.classList.add('active');
      });
      // Double-click to rename (matches the real plugin)
      t.addEventListener('dblclick', () => {
        const nameEl = t.querySelector('.tt-name');
        if (!nameEl) return;
        const next = prompt('Rename tab', nameEl.textContent);
        if (next) nameEl.textContent = next.trim();
      });
      // Right-click opens the same session menu (anchored to the tab)
      t.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        $$('.term-tab').forEach((tt) => tt.classList.remove('active'));
        t.classList.add('active');
        toggleSessionMenu(t);
      });
    });

    renderTerminalStatusbar();
  }

  function renderTerminalStatusbar() {
    const bar = $('#terminal-statusbar');
    if (!bar) return;
    const ctxPct = 38;
    bar.innerHTML = `
      <span class="seg model" title="Current model — switch via /model in the terminal">opus 4.7</span>
      <span class="seg">${svg('focus', 11)} ctx <span class="key">${ctxPct}%</span> <span class="ctx-bar"><span style="width:${ctxPct}%"></span></span></span>
      <span class="seg">${svg('clock', 11)} 5m 42s</span>
      <span class="seg">${svg('zap', 11)} $0.08</span>
      <span class="spacer"></span>
      <span class="seg">${svg('hash', 11)} 18 skills</span>
      <span class="seg" style="color: var(--ws-term-success)">${svg('check', 11)} ready</span>
    `;
  }

  // ── Resizable column splitters ────────────────────────────────────────
  function initSplitters() {
    // Restore saved widths
    try {
      const stored = JSON.parse(localStorage.getItem('wd-pane-widths') || '{}');
      if (stored.pane)  app.style.setProperty('--ws-pane-w',  stored.pane + 'px');
      if (stored.rpane) app.style.setProperty('--ws-rpane-w', stored.rpane + 'px');
    } catch (_) {}

    const RIBBON_W = 64;
    const MIN_PANE = 240, MAX_PANE = 560;
    const MIN_RPANE = 280, MAX_RPANE = 600;
    const MIN_EDITOR = 360; // editor needs at least this much for the 720-max column to feel right

    function attachDrag(splitter, side) {
      splitter.addEventListener('mousedown', (e) => {
        e.preventDefault();
        splitter.classList.add('dragging');
        document.body.classList.add('col-resizing');
        const onMove = (ev) => {
          if (side === 'left') {
            // pane width = mouseX - ribbon
            let w = ev.clientX - RIBBON_W;
            const editorAvail = window.innerWidth - RIBBON_W - w - parseFloat(getComputedStyle(app).getPropertyValue('--ws-rpane-w')) || 0;
            // Cap so the editor never shrinks below MIN_EDITOR
            const maxByEditor = window.innerWidth - RIBBON_W - MIN_EDITOR - parseFloat(getComputedStyle(app).getPropertyValue('--ws-rpane-w'));
            w = Math.max(MIN_PANE, Math.min(MAX_PANE, Math.min(maxByEditor, w)));
            app.style.setProperty('--ws-pane-w', w + 'px');
          } else {
            // rpane width = window - mouseX
            let w = window.innerWidth - ev.clientX;
            const maxByEditor = window.innerWidth - RIBBON_W - MIN_EDITOR - parseFloat(getComputedStyle(app).getPropertyValue('--ws-pane-w'));
            w = Math.max(MIN_RPANE, Math.min(MAX_RPANE, Math.min(maxByEditor, w)));
            app.style.setProperty('--ws-rpane-w', w + 'px');
          }
        };
        const onUp = () => {
          splitter.classList.remove('dragging');
          document.body.classList.remove('col-resizing');
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
          // Persist
          try {
            localStorage.setItem('wd-pane-widths', JSON.stringify({
              pane:  parseFloat(getComputedStyle(app).getPropertyValue('--ws-pane-w')),
              rpane: parseFloat(getComputedStyle(app).getPropertyValue('--ws-rpane-w')),
            }));
          } catch (_) {}
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      });
      // Double-click to reset to default
      splitter.addEventListener('dblclick', () => {
        if (side === 'left') app.style.removeProperty('--ws-pane-w');
        else app.style.removeProperty('--ws-rpane-w');
        try { localStorage.removeItem('wd-pane-widths'); } catch (_) {}
      });
    }
    document.querySelectorAll('.splitter[data-side]').forEach((s) => attachDrag(s, s.dataset.side));
  }
  // ── Toasts ────────────────────────────────────────────────────────────
  // Public API: window.showToast(message, severity?, opts?)
  //   severity: 'success' | 'error' | 'info' | 'loading' (default 'info')
  //   opts: { title?, sub?, duration? (ms, default 3500; 0 = sticky) }
  window.showToast = function (message, severity = 'info', opts = {}) {
    const stack = $('#toast-stack');
    if (!stack) return;
    const t = document.createElement('div');
    t.className = 'toast ' + severity;
    const glyphMap = { success: 'check', error: 'warn', info: 'help', loading: 'gear' };
    const inner = opts.title
      ? `<strong>${opts.title}</strong>${opts.sub ? `<div class="sub">${opts.sub}</div>` : ''}`
      : message + (opts.sub ? `<div class="sub">${opts.sub}</div>` : '');
    t.innerHTML = `
      <span class="glyph">${svg(glyphMap[severity] || 'help', 16)}</span>
      <div class="body">${inner}</div>
      <button class="close" aria-label="Dismiss">${svg('close', 12)}</button>
    `;
    t.querySelector('.close').addEventListener('click', () => dismiss(t));
    stack.appendChild(t);
    const dur = opts.duration != null ? opts.duration : (severity === 'loading' ? 0 : 3500);
    if (dur > 0) setTimeout(() => dismiss(t), dur);
    function dismiss(el) { el.classList.add('leaving'); setTimeout(() => el.remove(), 220); }
    return t;
  };

  // ── Generic right-click context menus ─────────────────────────────────
  function showContextMenu(x, y, items) {
    document.querySelectorAll('.ws-popover, .term-popover').forEach((p) => p.remove());
    const pop = document.createElement('div');
    pop.className = 'ws-popover';
    pop.style.left = x + 'px'; pop.style.top = y + 'px';
    pop.innerHTML = items.map((it) => {
      if (it.divider) return '<div class="ws-popover-divider"></div>';
      if (it.label) return `<div class="ws-popover-label">${it.label}</div>`;
      return `<div class="ws-popover-item ${it.danger ? 'danger' : ''}"><span class="glyph">${svg(it.icon || 'file', 13)}</span>${it.text}${it.kbd ? `<span class="kbd-hint">${it.kbd}</span>` : ''}</div>`;
    }).join('');
    document.body.appendChild(pop);
    const rect = pop.getBoundingClientRect();
    if (rect.right > window.innerWidth - 8) pop.style.left = (x - rect.width) + 'px';
    if (rect.bottom > window.innerHeight - 8) pop.style.top = (y - rect.height) + 'px';
    const itemEls = $$('.ws-popover-item', pop);
    items.filter((it) => !it.divider && !it.label).forEach((it, i) => {
      itemEls[i]?.addEventListener('click', () => { pop.remove(); if (it.act) it.act(); });
    });
    setTimeout(() => {
      const close = (e) => { if (!pop.contains(e.target)) { pop.remove(); document.removeEventListener('click', close); document.removeEventListener('keydown', esc); } };
      const esc = (e) => { if (e.key === 'Escape') { pop.remove(); document.removeEventListener('click', close); document.removeEventListener('keydown', esc); } };
      document.addEventListener('click', close);
      document.addEventListener('keydown', esc);
    }, 0);
  }

  function initContextMenus() {
    document.addEventListener('contextmenu', (e) => {
      const fileRow = e.target.closest('#object-list .row.is-file');
      const folderRow = e.target.closest('#object-list .row.is-folder');
      const link = e.target.closest('.editor-body .wikilink');
      if (fileRow) {
        e.preventDefault();
        const name = fileRow.dataset.name;
        showContextMenu(e.clientX, e.clientY, [
          { icon: 'pencil', text: 'Rename…', kbd: 'F2' },
          { icon: 'copy',   text: 'Duplicate' },
          { icon: 'upload', text: 'Reveal in Finder' },
          { divider: true },
          { icon: 'link',   text: 'Copy wikilink',     act: () => window.showToast('Wikilink copied to clipboard', 'success') },
          { icon: 'link',   text: 'Copy markdown link', act: () => window.showToast('Markdown link copied', 'success') },
          { divider: true },
          { icon: 'trash',  text: 'Delete ' + name, danger: true, act: () => window.showToast('Deleted ' + name, 'success', { sub: 'Undo in 5s' }) },
        ]);
      } else if (folderRow) {
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY, [
          { icon: 'newNote', text: 'New note here' },
          { icon: 'folder',  text: 'New folder' },
          { divider: true },
          { icon: 'pencil',  text: 'Rename…', kbd: 'F2' },
          { icon: 'upload',  text: 'Reveal in Finder' },
          { divider: true },
          { icon: 'trash',   text: 'Delete folder', danger: true },
        ]);
      } else if (link) {
        e.preventDefault();
        const target = link.textContent;
        showContextMenu(e.clientX, e.clientY, [
          { label: target },
          { icon: 'file',  text: 'Open', act: () => window.showToast('Opening ' + target, 'info') },
          { icon: 'files', text: 'Open in new pane' },
          { divider: true },
          { icon: 'copy',  text: 'Copy link text', act: () => window.showToast('Copied: ' + target, 'success') },
          { icon: 'pencil', text: 'Rename target…' },
          { divider: true },
          { icon: 'trash', text: 'Unlink', danger: true },
        ]);
      }
    });

    // Drag-drop on editor → insert path
    const editor = $('.editor-pane');
    if (editor) {
      ['dragenter', 'dragover'].forEach((ev) => editor.addEventListener(ev, (e) => { e.preventDefault(); editor.classList.add('dragging-over'); }));
      ['dragleave', 'drop'].forEach((ev) => editor.addEventListener(ev, (e) => {
        if (ev === 'drop') { e.preventDefault(); window.showToast('Inserted file reference', 'success'); }
        editor.classList.remove('dragging-over');
      }));
    }
    const rightPane = document.querySelector('.right-pane');
    if (rightPane) {
      ['dragenter', 'dragover'].forEach((ev) => rightPane.addEventListener(ev, (e) => { e.preventDefault(); rightPane.classList.add('term-drop-over'); }));
      ['dragleave', 'drop'].forEach((ev) => rightPane.addEventListener(ev, (e) => {
        if (ev === 'drop') { e.preventDefault(); window.showToast('Inserted path in terminal', 'success'); }
        rightPane.classList.remove('term-drop-over');
      }));
    }
  }

  function closeTermPopovers() {
    document.querySelectorAll('.term-popover').forEach((p) => p.remove());
  }
  function spawnPopover(anchor, html, kind) {
    closeTermPopovers();
    const rect = anchor.getBoundingClientRect();
    const pop = document.createElement('div');
    pop.className = 'term-popover ' + (kind || '');
    pop.style.top = (rect.bottom + 6) + 'px';
    pop.style.right = (window.innerWidth - rect.right) + 'px';
    pop.innerHTML = html;
    document.body.appendChild(pop);
    // Close on outside click + Esc
    setTimeout(() => {
      const close = (e) => {
        if (!pop.contains(e.target) && e.target !== anchor) {
          pop.remove();
          document.removeEventListener('click', close);
          document.removeEventListener('keydown', onEsc);
        }
      };
      const onEsc = (e) => { if (e.key === 'Escape') { pop.remove(); document.removeEventListener('click', close); document.removeEventListener('keydown', onEsc); } };
      document.addEventListener('click', close);
      document.addEventListener('keydown', onEsc);
    }, 0);
    return pop;
  }
  function toggleSessionMenu(anchor) {
    if (document.querySelector('.term-popover.session-menu')) { closeTermPopovers(); return; }
    spawnPopover(anchor, `
      <div class="term-popover-item" data-act="rename"><span class="glyph">${svg('pencil', 13)}</span>Rename tab<span class="kbd-hint">F2</span></div>
      <div class="term-popover-item" data-act="export"><span class="glyph">${svg('upload', 13)}</span>Export transcript…</div>
      <div class="term-popover-divider"></div>
      <div class="term-popover-item danger" data-act="end"><span class="glyph">${svg('trash', 13)}</span>End session</div>
    `, 'session-menu');
  }
  function toggleModelMenu(anchor) {
    if (document.querySelector('.term-popover.model-menu')) { closeTermPopovers(); return; }
    const pop = spawnPopover(anchor, `
      <div class="term-popover-label">Model</div>
      <div class="term-popover-item model-row" data-model="opus">
        <span class="model-dot" style="background:var(--ws-term-accent)"></span>
        <div class="model-text"><div class="model-name">opus 4.7</div><div class="model-sub">smartest · slowest · best for design + planning</div></div>
        <span class="check">${svg('check', 13)}</span>
      </div>
      <div class="term-popover-item model-row" data-model="sonnet">
        <span class="model-dot" style="background:var(--ws-term-success)"></span>
        <div class="model-text"><div class="model-name">sonnet 4.7</div><div class="model-sub">balanced · default for code + edits</div></div>
      </div>
      <div class="term-popover-item model-row" data-model="haiku">
        <span class="model-dot" style="background:var(--ws-term-warn)"></span>
        <div class="model-text"><div class="model-name">haiku 4</div><div class="model-sub">fastest · cheapest · good for triage</div></div>
      </div>
      <div class="term-popover-divider"></div>
      <div class="term-popover-item subtle"><span class="glyph">${svg('gear', 13)}</span>Configure models…</div>
    `, 'model-menu');
  }

  // ── Composer ──────────────────────────────────────────────────────────
  // Dedicated input bar that lives below the canvas. Single source of
  // typing — the canvas above is read-only history. In the real plugin
  // this forwards keystrokes to the PTY; here we just append to the
  // canvas to demonstrate the flow.
  let composerHistory = [];
  let composerHistoryIdx = -1;

  function initComposer() {
    const input = $('#composer-input');
    const sendBtn = $('#composer-send');
    const attachBtn = $('#composer-attach');
    if (!input || !sendBtn || !attachBtn) return;

    // Stamp icons
    sendBtn.innerHTML = svg('send', 13);
    attachBtn.innerHTML = svg('link', 14);

    function autoSize() {
      input.style.height = 'auto';
      input.style.height = Math.min(160, input.scrollHeight) + 'px';
      sendBtn.classList.toggle('has-input', input.value.trim().length > 0);
    }
    function sendMessage() {
      const text = input.value.trim();
      if (!text) return;
      composerHistory.push(text);
      composerHistoryIdx = composerHistory.length;
      // Append a new prompt line to the canvas, then a fake "thinking" indicator.
      const canvas = $('#term-canvas');
      if (canvas) {
        const promptLine = document.createElement('div');
        promptLine.className = 'term-line';
        promptLine.innerHTML = `<span class="term-prompt">▌</span> <span class="term-user">${text.replace(/</g, '&lt;')}</span>`;
        const blank = document.createElement('div');
        blank.className = 'term-line';
        blank.innerHTML = '&nbsp;';
        const thinking = document.createElement('div');
        thinking.className = 'term-line';
        thinking.innerHTML = `<span class="term-dim">  ${svg('clock', 11, 'style="display:inline-block;vertical-align:-2px;margin-right:4px"')}thinking…</span>`;
        canvas.appendChild(promptLine);
        canvas.appendChild(blank);
        canvas.appendChild(thinking);
        canvas.scrollTo({ top: canvas.scrollHeight, behavior: 'smooth' });
      }
      input.value = '';
      autoSize();
    }

    input.addEventListener('input', autoSize);
    input.addEventListener('keydown', (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (e.key === 'Enter' && mod) {
        e.preventDefault();
        sendMessage();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        // Plain Enter: also sends (matches Claude desktop default)
        e.preventDefault();
        sendMessage();
      } else if (e.key === 'ArrowUp' && input.value === '') {
        // Recall most recent
        if (composerHistory.length) {
          composerHistoryIdx = Math.max(0, composerHistoryIdx - 1);
          input.value = composerHistory[composerHistoryIdx] || '';
          autoSize();
        }
      } else if (e.key === 'ArrowDown' && composerHistoryIdx < composerHistory.length) {
        composerHistoryIdx = Math.min(composerHistory.length, composerHistoryIdx + 1);
        input.value = composerHistory[composerHistoryIdx] || '';
        autoSize();
      } else if (e.key === 'Escape') {
        input.blur();
      }
    });
    sendBtn.addEventListener('click', sendMessage);
    attachBtn.addEventListener('click', () => {
      // No-op visual; in real plugin would open a file picker
      input.value = (input.value ? input.value + ' ' : '') + '[[';
      input.focus();
      autoSize();
    });
    autoSize();
  }

  // ── Wire chrome buttons ───────────────────────────────────────────────
  $('#toggle-left').addEventListener('click', () => toggleLeft());
  $('#toggle-right').addEventListener('click', () => toggleRight());
  $('#toggle-theme').addEventListener('click', () => applyTheme(!document.body.classList.contains('theme-dark')));
  $('#collapse-right').addEventListener('click', () => toggleRight(true));
  $('#expand-left').addEventListener('click', () => toggleLeft(false));
  $('#expand-right').addEventListener('click', () => toggleRight(false));
  $('#open-cmd').addEventListener('click', openCmd);
  $('#open-settings').addEventListener('click', () => openModal('settings-scrim'));
  $('#collapse-all').addEventListener('click', () => $$('.obj').forEach((c) => c.classList.add('collapsed')));
  $('#demo-empty').addEventListener('click', (e) => {
    demoEmpty = !demoEmpty;
    e.currentTarget.classList.toggle('is-active', demoEmpty);
    renderZone(activeZone);
  });

  // ── Keyboard ──────────────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && !e.shiftKey && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault(); openCmd();
    } else if (mod && !e.shiftKey && (e.key === 't' || e.key === 'T')) {
      e.preventDefault();
      setZone('personal');
      selectFile('2026-05-13.md', 'personal/daily/2026-05-13.md');
    } else if (mod && !e.shiftKey && (e.key === 'j' || e.key === 'J')) {
      e.preventDefault(); toggleRight();
    } else if (mod && e.shiftKey && (e.key === 'm' || e.key === 'M')) {
      e.preventDefault(); openModal('qc-scrim');
    } else if (mod && e.shiftKey && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault(); toggleFocus();
    } else if (e.key === 'Escape') {
      if ($('.scrim.open')) closeAllModals();
      else if (app.classList.contains('term-fullscreen')) toggleTermFullscreen(false);
      else if (focusOn) toggleFocus();
    }
  });

  // ── URL params (for screens.html deep links + iframe embedding) ──────
  function readParams() {
    const u = new URLSearchParams(location.search);
    return {
      zone:    u.get('zone'),
      file:    u.get('file'),
      theme:   u.get('theme'),
      modal:   u.get('modal'),         // cmd | qc | settings | onboarding
      focus:   u.get('focus') === '1',
      noLeft:  u.get('left') === '0',
      noRight: u.get('right') === '0',
      empty:   u.get('empty') === '1',
      embed:   u.get('embed') === '1', // hide scrollbars when embedded
    };
  }
  function applyParams() {
    const p = readParams();
    if (p.theme) applyTheme(p.theme === 'dark');
    if (p.zone) setZone(p.zone);
    if (p.empty) { demoEmpty = true; $('#demo-empty').classList.add('is-active'); renderZone(activeZone); }
    if (p.file) {
      const fileMap = {
        '_brief.md':     ['atlas',    'atlas/projects/workdesk/_brief.md'],
        '_status.md':    ['atlas',    'atlas/projects/workdesk/_status.md'],
        '2026-05-13.md': ['personal', 'personal/daily/2026-05-13.md'],
        '_inbox.md':     ['gtd',      'gtd/inbox/_inbox.md'],
      };
      const m = fileMap[p.file];
      if (m) { setZone(p.zone || m[0]); selectFile(p.file, m[1]); }
      else { selectFile(p.file, p.file); }
    }
    if (p.noLeft)  app.classList.add('no-left');
    if (p.noRight) app.classList.add('no-right');
    if (p.focus && !focusOn) toggleFocus();
    if (p.modal) {
      const map = { cmd: 'cmd-scrim', qc: 'qc-scrim', settings: 'settings-scrim', onboarding: 'ob-scrim' };
      if (map[p.modal]) setTimeout(() => openModal(map[p.modal]), 60);
    }
    if (p.embed) document.body.classList.add('embedded');
  }

  // ── Boot ──────────────────────────────────────────────────────────────
  stampIcons();
  try { applyTheme(localStorage.getItem('wd-theme') === 'dark'); }
  catch (_) { applyTheme(false); }
  setZone('atlas');
  selectFile('_brief.md', 'atlas/projects/workdesk/_brief.md');
  renderSettings();
  renderOnboarding();
  renderTerminal();
  initComposer();
  initSplitters();
  initContextMenus();
  showRpTab('terminal');
  applyParams();
})();
