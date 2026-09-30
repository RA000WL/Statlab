/* ==========================================================================
   StatLab — js/app.js
   Shell: sidebar routing, theme switching, keyboard shortcuts, and the
   per-section controllers.
   ========================================================================== */
(function (global) {
  'use strict';

  var el = UI.el;

  var SECTIONS = [
    { id: 'data', label: 'Data', icon: '▤', ctrl: 'DataController' },
    { id: 'descriptives', label: 'Descriptive Statistics', short: 'Descriptives', icon: '∿', ctrl: 'DescriptivesController' },
    { id: 'frequencies', label: 'Frequencies', icon: '▦', ctrl: 'FrequenciesController' },
    { id: 'ttest', label: 'T-Tests', icon: '⇄', ctrl: 'TTestController' },
    { id: 'anova', label: 'One-Way ANOVA', short: 'ANOVA', icon: '⋔', ctrl: 'ANOVAController' },
    { id: 'correlation', label: 'Correlation', icon: '⧉', ctrl: 'CorrelationController' },
    { id: 'chisquare', label: 'Chi-Square', icon: '⊞', ctrl: 'ChiSquareController' },
    { id: 'regression', label: 'Linear Regression', short: 'Regression', icon: '⟋', ctrl: 'RegressionController' },
    { id: 'export', label: 'Report', icon: '⎙', ctrl: 'ExportController' }
  ];

  var els = {};

  function boot() {
    els.nav = document.getElementById('nav');
    els.main = document.getElementById('main');
    els.meta = document.getElementById('dataset-meta');
    els.count = document.getElementById('result-count');
    els.themeBtn = document.getElementById('theme-toggle');
    els.menuBtn = document.getElementById('menu-toggle');

    applyTheme(localStorage.getItem('statlab-theme') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
    buildNav();
    els.themeBtn.addEventListener('click', function () {
      applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
    els.menuBtn.addEventListener('click', function () {
      document.body.classList.toggle('nav-open');
    });
    // Tapping the dimmed backdrop on a narrow screen closes the sidebar.
    document.addEventListener('click', function (e) {
      if (!document.body.classList.contains('nav-open')) return;
      if (e.target.closest('.sidebar') || e.target.closest('#menu-toggle')) return;
      document.body.classList.remove('nav-open');
    });

    // Re-render the active section when the dataset itself changes (upload,
    // clear, edit). addResult is emitted quietly so an analysis controller
    // cannot re-enter the router mid-render.
    var lastDataset = State.get().dataset;
    State.subscribe(function (s) {
      renderMeta();
      renderNav();
      if (s.dataset !== lastDataset) {
        lastDataset = s.dataset;
        go(s.active);
      }
    });
    document.addEventListener('keydown', onKey);

    /* Back/forward and manual hash edits should navigate too. go() replaces
       the hash with replaceState, which does not fire this event, so a guard
       keeps the two from bouncing. */
    window.addEventListener('hashchange', function () {
      var id = location.hash.replace('#', '') || 'data';
      if (id !== State.get().active) go(id);
    });

    renderMeta();
    go(location.hash.replace('#', '') || 'data');
  }

  function onKey(e) {
    if (e.target.closest('input, select, textarea')) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key >= '1' && e.key <= '9') {
      var s = SECTIONS[Number(e.key) - 1];
      if (s && (s.id === 'data' || State.hasData())) go(s.id);
    }
    if (e.key === '?') showHelp();
  }

  function showHelp() {
    alert('Keyboard shortcuts\n\n1–9  jump to a section\ng    toggle the sidebar');
  }

  /* ---------------------------------------------------------------- theme */

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('statlab-theme', theme);
    if (els.themeBtn) {
      els.themeBtn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      els.themeBtn.textContent = theme === 'dark' ? '☀' : '☾';
    }
    if (global.Charts) requestAnimationFrame(Charts.redrawAll);
  }

  /* ------------------------------------------------------------------ nav */

  function buildNav() {
    UI.clear(els.nav);
    var list = el('nav', { class: 'nav-list', 'aria-label': 'Analysis sections' });
    SECTIONS.forEach(function (s, i) {
      var btn = el('button', {
        class: 'nav-item', type: 'button', dataset: { id: s.id },
        onclick: function () { go(s.id); },
        title: s.label + '  (press ' + (i + 1) + ')'
      }, [
        el('span', { class: 'nav-icon', 'aria-hidden': 'true', text: s.icon }),
        el('span', { class: 'nav-text' }, [
          el('span', { class: 'nav-label', text: s.label }),
          el('span', { class: 'nav-num mono', text: String(i + 1) })
        ])
      ]);
      list.appendChild(btn);
    });
    els.nav.appendChild(el('div', { class: 'nav-brand' }, [
      el('span', { class: 'nav-brand-mark', 'aria-hidden': 'true', text: '∑' }),
      el('span', { class: 'nav-brand-text' }, [
        el('strong', { text: 'StatLab' }),
        el('span', { class: 'nav-brand-sub', text: 'Statistical analysis' })
      ])
    ]));
    els.nav.appendChild(list);
    els.nav.appendChild(el('div', { class: 'nav-foot' }, [
      el('p', { class: 'nav-privacy' }, [
        el('span', { class: 'dot' }),
        el('span', { text: 'Runs entirely in your browser' })
      ]),
      el('button', { class: 'nav-help', type: 'button', text: 'Keyboard shortcuts', onclick: showHelp })
    ]));
    renderNav();
  }

  function renderNav() {
    if (!els.nav) return;
    var active = State.get().active;
    var has = State.hasData();
    els.nav.querySelectorAll('.nav-item').forEach(function (b) {
      var id = b.dataset.id;
      b.classList.toggle('is-active', id === active);
      if (id === active) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
      b.disabled = !has && id !== 'data';
      b.classList.toggle('is-disabled', !has && id !== 'data');
    });
  }

  function renderMeta() {
    if (!els.meta) return;
    UI.clear(els.meta);
    var m = State.meta();
    if (!m) {
      els.meta.appendChild(el('span', { class: 'pill pill-empty', text: 'No dataset loaded' }));
    } else {
      els.meta.appendChild(el('span', { class: 'pill' }, [
        el('strong', { text: m.name }),
        el('span', { class: 'pill-sep', text: '·' }),
        el('span', { class: 'mono', text: m.rows + ' × ' + m.cols })
      ]));
    }
    var n = State.get().results.length;
    if (els.count) {
      els.count.textContent = n ? n + (n === 1 ? ' analysis' : ' analyses') : 'No analyses yet';
      els.count.classList.toggle('is-empty', !n);
    }
  }

  /* -------------------------------------------------------------- routing */

  function go(id) {
    var section = SECTIONS.filter(function (s) { return s.id === id; })[0] || SECTIONS[0];
    State.set({ active: section.id });
    if (location.hash.replace('#', '') !== section.id) history.replaceState(null, '', '#' + section.id);
    document.body.classList.remove('nav-open');
    renderMeta();
    renderNav();
    els.main.scrollTop = 0;
    UI.clear(els.main);
    var controller = global[section.ctrl];
    if (!controller) {
      els.main.appendChild(UI.empty('That section is not available yet.'));
      return;
    }
    if (section.id !== 'data' && !State.hasData()) {
      els.main.appendChild(el('div', { class: 'page-head' }, [
        el('h2', { class: 'page-title', text: section.label })
      ]));
      els.main.appendChild(UI.empty('Load a dataset before running an analysis.',
        UI.button('Go to Data', function () { go('data'); }, 'primary')));
      return;
    }
    controller.render(els.main);
  }

  global.App = { boot: boot, go: go, applyTheme: applyTheme, SECTIONS: SECTIONS };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
