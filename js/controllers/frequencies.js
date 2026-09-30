/* ==========================================================================
   StatLab — js/controllers/frequencies.js
   Counts, percentages and cumulative percentages for categorical variables.
   ========================================================================== */
(function (global) {
  'use strict';

  var el = UI.el;
  var selected = [];

  function render(host) {
    UI.clear(host);
    host.appendChild(el('div', { class: 'page-head' }, [
      el('h2', { class: 'page-title', text: 'Frequencies' }),
      el('p', { class: 'page-lede', text: 'How often each category appears, with percentages and charts.' })
    ]));

    if (!State.hasData()) {
      host.appendChild(UI.empty('Load a dataset first.', UI.button('Go to Data', function () { App.go('data'); }, 'ghost')));
      return;
    }

    var cat = State.categorical();
    if (!cat.length) {
      host.appendChild(UI.empty('No categorical variables found. Open Data and mark at least one variable as "Categorical".',
        UI.button('Go to Data', function () { App.go('data'); }, 'ghost')));
      return;
    }
    if (!selected.length) selected = cat.slice(0, Math.min(2, cat.length));

    var out = el('div', { class: 'stack' });
    out.appendChild(UI.card('Choose variables', [
      UI.checkboxList(cat.map(function (c) { return { value: c, label: c }; }), selected, function () {
        selected = Array.prototype.slice.call(host.querySelectorAll('.checklist input:checked')).map(function (i) { return i.value; });
        refresh();
      })
    ]));

    var results = el('div', { class: 'stack' });
    out.appendChild(results);

    function refresh() {
      UI.clear(results);
      if (!selected.length) { results.appendChild(UI.empty('Pick at least one variable above.')); return; }
      selected.forEach(function (name) { results.appendChild(varCard(name)); });
    }

    refresh();
    host.appendChild(out);
  }

  function table(name) {
    var vals = State.values(name);
    var counts = Object.create(null), order = [];
    var missing = 0;
    vals.forEach(function (v) {
      if (State.isMissing(v)) { missing++; return; }
      var s = String(v).trim();
      if (!(s in counts)) { counts[s] = 0; order.push(s); }
      counts[s]++;
    });
    order.sort(function (a, b) { return counts[b] - counts[a] || a.localeCompare(b); });
    var total = order.reduce(function (a, k) { return a + counts[k]; }, 0);
    var cum = 0;
    var rows = order.map(function (k) {
      var pct = total ? (counts[k] / total) * 100 : 0;
      cum += pct;
      return { value: k, count: counts[k], percent: pct, cumulative: cum, bar: pct, missing: 0 };
    });
    rows.push({ value: 'Missing', count: missing, percent: vals.length ? (missing / vals.length) * 100 : 0, cumulative: 100, bar: 0, missing: 1, total: true });
    return { rows: rows, total: total, order: order, counts: counts, missing: missing, n: vals.length };
  }

  function varCard(name) {
    var t = table(name);
    var valid = t.rows.filter(function (r) { return !r.total; });
    var top = valid.slice(0, 1)[0];

    var cols = [
      { key: 'value', label: 'Value', align: 'left', mono: false },
      { key: 'count', label: 'Count' },
      { key: 'percent', label: 'Percent', render: function (r) { return el('span', { class: 'mono', text: Stats.fmt(r.percent, 1) + '%' }); } },
      { key: 'cumulative', label: 'Cumulative %', render: function (r) { return el('span', { class: 'mono', text: Stats.fmt(r.cumulative, 1) + '%' }); } },
      { key: 'bar', label: 'Share', align: 'left', mono: false, render: function (r) {
          if (r.total) return el('span', { class: 'muted', text: '—' });
          return el('div', { class: 'bar-cell' }, el('div', { class: 'bar-fill', style: 'width:' + Math.max(0.5, r.percent) + '%' }));
        }
      }
    ];

    var body = [
      UI.table(cols, t.rows, { rowClass: function (r) { return r.total ? 'row-total' : ''; } }),
      el('div', { class: 'chart-grid' }, [
        UI.chartBox(Charts.bar(t.order, t.order.map(function (k) { return t.counts[k]; }), 'Frequency of ' + name, 'Respondents')),
        UI.chartBox(Charts.pie(t.order, t.order.map(function (k) { return t.counts[k]; })))
      ]),
      UI.interpretation('Valid responses: ' + t.total + ' of ' + t.n + ' rows.' +
        (top ? ' "' + top.value + '" is the most common response at ' + Stats.fmt(top.percent, 1) + '% (' + top.count + ' respondents).' : '') +
        (valid.length > 2 ? ' There are ' + valid.length + ' distinct categories.' : ''))
    ];

    if (t.missing > 0) {
      body.splice(1, 0, UI.note('warn', t.missing + ' row' + (t.missing === 1 ? '' : 's') + ' had a blank or NA value for ' + name + '. Those rows are counted as Missing and excluded from the percentages above.'));
    }
    if (t.order.length > 20) {
      body.splice(1, 0, UI.note('info', name + ' has ' + t.order.length + ' distinct values, which usually means it was detected as continuous by mistake. Open Data and set it to Continuous.'));
    }

    return UI.card(name, body, t.order.length + ' categories');
  }

  global.FrequenciesController = { render: render, table: table };
})(window);
