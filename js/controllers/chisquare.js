/* ==========================================================================
   StatLab — js/controllers/chisquare.js
   Chi-square test of independence between two categorical variables.
   ========================================================================== */
(function (global) {
  'use strict';

  var el = UI.el;
  var cfg = { row: '', col: '', alpha: 0.05 };

  function render(host) {
    UI.clear(host);
    host.appendChild(el('div', { class: 'page-head' }, [
      el('h2', { class: 'page-title', text: 'Chi-Square Test' }),
      el('p', { class: 'page-lede', text: 'Test whether two categorical variables are associated.' })
    ]));

    if (!State.hasData()) {
      host.appendChild(UI.empty('Load a dataset first.', UI.button('Go to Data', function () { App.go('data'); }, 'ghost')));
      return;
    }
    var cats = State.categorical();
    if (cats.length < 2) {
      host.appendChild(UI.empty('This test needs two categorical variables. Open Data and mark at least two as "Categorical".',
        UI.button('Go to Data', function () { App.go('data'); }, 'ghost')));
      return;
    }
    if (!cfg.row || cats.indexOf(cfg.row) === -1) cfg.row = cats[0];
    if (!cfg.col || cats.indexOf(cfg.col) === -1 || cfg.col === cfg.row) cfg.col = cats[1];

    var out = el('div', { class: 'stack' });
    out.appendChild(UI.card('Analysis', [el('div', { class: 'stack' }, [
      UI.field('Row variable', UI.select(cats.map(function (v) { return { value: v, label: v }; }), cfg.row, function (v) { cfg.row = v; run(); })),
      UI.field('Column variable', UI.select(cats.map(function (v) { return { value: v, label: v }; }), cfg.col, function (v) { cfg.col = v; run(); })),
      UI.field('Significance level', UI.select([
        { value: '0.01', label: '0.01 (99% confidence)' },
        { value: '0.05', label: '0.05 (95% confidence)' },
        { value: '0.10', label: '0.10 (90% confidence)' }
      ], String(cfg.alpha), function (v) { cfg.alpha = Number(v); run(); })),
      UI.buttonRow([UI.button('Run chi-square', run, 'primary')])
    ])]));

    var results = el('div', { class: 'stack', id: 'results-chi' });
    out.appendChild(results);
    host.appendChild(out);
    run();
  }

  /** Build the contingency table, dropping rows with either value missing. */
  function buildTable(rowVar, colVar) {
    var ri = State.columnIndex(rowVar), ci = State.columnIndex(colVar);
    var rows = State.get().dataset.rows;
    var rowLevels = [], colLevels = [];
    var seenR = Object.create(null), seenC = Object.create(null);
    var cells = Object.create(null);
    var dropped = 0;
    rows.forEach(function (r) {
      var a = r[ri], b = r[ci];
      if (State.isMissing(a) || State.isMissing(b)) { dropped++; return; }
      var ka = String(a).trim(), kb = String(b).trim();
      if (!(ka in seenR)) { seenR[ka] = 1; rowLevels.push(ka); }
      if (!(kb in seenC)) { seenC[kb] = 1; colLevels.push(kb); }
      cells[ka + '\u0000' + kb] = (cells[ka + '\u0000' + kb] || 0) + 1;
    });
    var order = function (a) { return a.slice().sort(); };
    rowLevels = order(rowLevels);
    colLevels = order(colLevels);
    var table = rowLevels.map(function (r) {
      return colLevels.map(function (c) { return cells[r + '\u0000' + c] || 0; });
    });
    return { table: table, rowLevels: rowLevels, colLevels: colLevels, dropped: dropped };
  }

  function run() {
    var host = document.getElementById('results-chi');
    if (!host) return;
    UI.clear(host);
    var t = buildTable(cfg.row, cfg.col);
    if (t.rowLevels.length < 2 || t.colLevels.length < 2) {
      host.appendChild(UI.empty('The crosstab needs at least two levels in each variable. "' + cfg.row + '" has ' + t.rowLevels.length + ' and "' + cfg.col + '" has ' + t.colLevels.length + '.'));
      return;
    }
    var r = Stats.chiSquareIndependence(t.table);
    if (!r) { host.appendChild(UI.empty('Not enough data to run this test.')); return; }

    var body = [];
    body.push(UI.statGrid([
      ['χ²', Stats.fmt(r.chi2)],
      ['df', String(r.df)],
      ['p', Stats.fmtP(r.p) + Stats.stars(r.p)],
      ["Cramér's V", Stats.fmt(r.cramersV) + ' (' + Stats.vLabel(r.cramersV) + ')'],
      ['N', String(r.N)],
      ['Min. expected', Stats.fmt(r.minExpected, 2)]
    ]));

    body.push(el('h4', { class: 'sub-head', text: 'Contingency table' }));
    var cols = [{ key: 'row', label: cfg.row + ' \\ ' + cfg.col, align: 'left', mono: false }]
      .concat(t.colLevels.map(function (c, j) { return { key: 'c' + j, label: c }; }))
      .concat([{ key: 'total', label: 'Total' }]);
    var rows = t.rowLevels.map(function (rl, i) {
      var o = { row: rl, total: r.rowTotals[i] };
      t.colLevels.forEach(function (cl, j) { o['c' + j] = t.table[i][j]; });
      return o;
    });
    var totalRow = { row: 'Total', total: r.N };
    t.colLevels.forEach(function (cl, j) { totalRow['c' + j] = r.colTotals[j]; });
    rows.push(totalRow);
    body.push(UI.table(cols, rows, { rowClass: function (row) { return row.row === 'Total' ? 'row-total' : ''; } }));

    body.push(el('h4', { class: 'sub-head', text: 'Expected counts' }));
    body.push(UI.note('info', 'These are the counts you would expect if the two variables were unrelated. Cells far from the expected value are what drives the chi-square statistic.'));
    var expCols = [{ key: 'row', label: cfg.row + ' \\ ' + cfg.col, align: 'left', mono: false }]
      .concat(t.colLevels.map(function (c, j) {
        return {
          key: 'c' + j, label: c, render: function (row) {
            var e = row.exp[j];
            return el('span', { class: 'mono' + (e < 5 ? ' is-low' : ''), text: Stats.fmt(e, 1) });
          }
        };
      }));
    body.push(UI.table(expCols, t.rowLevels.map(function (rl, i) {
      var o = { row: rl, exp: r.expected[i] };
      t.colLevels.forEach(function (cl, j) { o['c' + j] = String(r.expected[i][j]); });
      return o;
    })));

    if (r.cellsBelow5 > 0) {
      var pct = Math.round((r.cellsBelow5 / r.totalCells) * 100);
      body.push(UI.note(r.cellsBelow5 / r.totalCells > 0.2 ? 'warn' : 'info',
        r.cellsBelow5 + ' of ' + r.totalCells + ' expected counts (' + pct + '%) are below 5. ' +
        (r.cellsBelow5 / r.totalCells > 0.2
          ? 'That is above the usual 20% guideline, so the chi-square approximation is not reliable for this table. Combine sparse categories or report the result with caution.'
          : 'The rule of thumb is that no more than 20% of cells should be below 5, so this table is acceptable.')));
    } else {
      body.push(UI.note('info', 'All expected counts are 5 or more, so the chi-square approximation is appropriate for this table.'));
    }

    body.push(UI.verdict(r.p, cfg.alpha));
    body.push(UI.interpretation(prose(r, t, cfg)));
    body.push(UI.chartBox(Charts.stackedBar(t.rowLevels, t.colLevels, t.table),
      'Each bar is one level of ' + cfg.row + ', split by level of ' + cfg.col + '.'));

    if (t.dropped) {
      body.push(UI.note('info', t.dropped + ' row' + (t.dropped === 1 ? '' : 's') + ' had a blank value in one of the two variables and were excluded from the crosstab.'));
    }

    host.appendChild(UI.card('Chi-square test of independence', body, cfg.row + ' × ' + cfg.col + ' · ' + t.rowLevels.length + '×' + t.colLevels.length + ' · N = ' + r.N));

    State.addResult({
      kind: 'Chi-Square Test of Independence',
      title: cfg.row + ' × ' + cfg.col,
      meta: t.rowLevels.length + '×' + t.colLevels.length + ' table · N = ' + r.N,
      table: [
        ['Statistic', 'Value'],
        ['χ²', Stats.fmt(r.chi2)],
        ['df', String(r.df)],
        ['p', Stats.fmtP(r.p) + Stats.stars(r.p)],
        ["Cramér's V", Stats.fmt(r.cramersV)]
      ],
      narrative: prose(r, t, cfg),
      chart: Charts.stackedBar(t.rowLevels, t.colLevels, t.table)
    });
  }

  function prose(r, t, c) {
    var s = '';
    if (r.p < c.alpha) {
      s += c.row + ' and ' + c.col + ' are associated (χ²(' + r.df + ', N = ' + r.N + ') = ' + Stats.fmt(r.chi2) + ', ' + Stats.fmtPWith(r.p) + '). ';
      s += "Cramér's V of " + Stats.fmt(r.cramersV) + ' indicates a ' + Stats.vLabel(r.cramersV) + ' association. ';
      s += 'The null hypothesis of independence is rejected, so knowing a respondent\u2019s ' + c.row + ' gives you useful information about their ' + c.col + '. ';
    } else {
      s += c.row + ' and ' + c.col + ' are not associated (χ²(' + r.df + ', N = ' + r.N + ') = ' + Stats.fmt(r.chi2) + ', ' + Stats.fmtPWith(r.p) + '). ';
      s += 'There is not enough evidence to conclude the two variables are related. This is not proof that they are unrelated; the sample may be too small to detect a real association. ';
    }
    if (r.cellsBelow5 > 0) s += 'Note that ' + r.cellsBelow5 + ' expected count' + (r.cellsBelow5 === 1 ? ' is' : 's are') + ' below 5, which weakens the approximation. ';
    return s.trim();
  }

  global.ChiSquareController = { render: render, buildTable: buildTable };
})(window);
