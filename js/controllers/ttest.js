/* ==========================================================================
   StatLab — js/controllers/ttest.js
   Independent-samples and paired-samples t-tests, with Welch's option,
   Levene's check, effect size and confidence interval on the mean difference.
   ========================================================================== */
(function (global) {
  'use strict';

  var el = UI.el;

  var mode = 'independent';
  var root = null;
  var cfg = {
    independent: { dependent: '', factor: '', groupA: '', groupB: '', equalVariances: true, alpha: 0.05 },
    paired: { before: '', after: '', alpha: 0.05 }
  };

  function render(host) {
    root = host;
    UI.clear(host);
    host.appendChild(el('div', { class: 'page-head' }, [
      el('h2', { class: 'page-title', text: 't-Tests' }),
      el('p', { class: 'page-lede', text: 'Compare the average of one continuous variable either between two groups or within the same respondents.' })
    ]));

    if (!State.hasData()) {
      host.appendChild(UI.empty('Load a dataset first.', UI.button('Go to Data', function () { App.go('data'); }, 'ghost')));
      return;
    }
    var cont = State.continuous();
    if (cont.length < 2) {
      host.appendChild(UI.empty('You need at least two continuous variables. Open Data and check the variable types.',
        UI.button('Go to Data', function () { App.go('data'); }, 'ghost')));
      return;
    }

    // Default to the first continuous variable (and a second one for paired
    // tests) so the page is useful the moment it opens.
    var ic = cfg.independent, pc = cfg.paired;
    if (!ic.dependent || cont.indexOf(ic.dependent) === -1) ic.dependent = cont[0];
    if (!pc.before || cont.indexOf(pc.before) === -1) pc.before = cont[0];
    if (!pc.after || cont.indexOf(pc.after) === -1) pc.after = cont[1];

    var out = el('div', { class: 'stack' });
    out.appendChild(UI.card('Analysis', [el('div', { class: 'stack' }, [
      UI.radioList('ttest_mode', [
        { value: 'independent', label: 'Independent samples — compare two different groups' },
        { value: 'paired', label: 'Paired samples — compare the same respondents twice' }
      ], mode, function (v) { mode = v; render(host); }),
      mode === 'independent' ? independentForm(cont) : pairedForm(cont)
    ])]));

    var results = el('div', { class: 'stack', id: 'results-ttest' });
    out.appendChild(results);
    host.appendChild(out);
    refresh(results);
  }

  function independentForm(cont) {
    var cats = State.categorical();
    var c = cfg.independent;
    var levels = c.factor ? State.uniqueLevels(State.get().dataset.rows, c.factor) : [];
    if (c.factor && levels.length < 2) {
      return UI.note('warn', '"' + c.factor + '" has ' + levels.length + ' level. An independent-samples t-test needs a grouping variable with at least two groups.');
    }
    var box = el('div', { class: 'stack' }, [
      UI.field('Continuous variable', UI.select(cont.map(function (v) { return { value: v, label: v }; }), c.dependent, function (v) { c.dependent = v; }, { disabled: !c.factor })),
      UI.field('Grouping variable', UI.select([{ value: '', label: '— choose a group —' }].concat(cats.map(function (v) { return { value: v, label: v }; })), c.factor, function (v) { c.factor = v; c.groupA = ''; c.groupB = ''; render(root); }, { disabled: !cats.length })),
      cats.length ? null : UI.note('info', 'No categorical variable available, so there is nothing to group by. Open Data and mark one variable as Categorical.')
    ]);
    if (!c.factor) return box;

    if (levels.length > 2) {
      box.appendChild(UI.note('info', '"' + c.factor + '" has ' + levels.length + ' levels. The t-test compares only the two you pick. To compare every group at once, use One-Way ANOVA.'));
    }
    // Default to the first two levels so results appear without extra clicks.
    if (levels.indexOf(c.groupA) === -1) c.groupA = levels[0];
    if (levels.indexOf(c.groupB) === -1 || c.groupB === c.groupA) c.groupB = levels[1];
    box.appendChild(UI.field('Group 1', UI.select(levels.map(function (l) { return { value: l, label: l }; }), c.groupA, function (v) { c.groupA = v; run(); })));
    box.appendChild(UI.field('Group 2', UI.select(levels.map(function (l) { return { value: l, label: l }; }), c.groupB, function (v) { c.groupB = v; run(); })));
    box.appendChild(UI.field('Variance assumption', UI.radioList('ttest_var', [
      { value: 'equal', label: "Student's t-test — assume equal variances" },
      { value: 'welch', label: "Welch's t-test — do not assume equal variances" }
    ], c.equalVariances ? 'equal' : 'welch', function (v) { c.equalVariances = v === 'equal'; run(); })));
    box.appendChild(UI.field('Significance level', alphaSelect(c.alpha, function (v) { c.alpha = Number(v); run(); })));
    box.appendChild(UI.buttonRow([UI.button('Run t-test', function () { run(); }, 'primary')]));
    return box;
  }

  function pairedForm(cont) {
    var c = cfg.paired;
    return el('div', { class: 'stack' }, [
      UI.field('Before (first measurement)', UI.select(cont.map(function (v) { return { value: v, label: v }; }), c.before, function (v) { c.before = v; run(); })),
      UI.field('After (second measurement)', UI.select(cont.map(function (v) { return { value: v, label: v }; }), c.after, function (v) { c.after = v; run(); })),
      UI.field('Significance level', alphaSelect(c.alpha, function (v) { c.alpha = Number(v); run(); })),
      UI.buttonRow([UI.button('Run t-test', function () { run(); }, 'primary')]),
      UI.note('info', 'Both variables must come from the same respondents in the same row order. StatLab pairs them row by row and drops rows where either value is blank.')
    ]);
  }

  function alphaSelect(value, onchange) {
    return UI.select([
      { value: '0.01', label: '0.01 (99% confidence)' },
      { value: '0.05', label: '0.05 (95% confidence)' },
      { value: '0.10', label: '0.10 (90% confidence)' }
    ], String(value), onchange);
  }

  /* ------------------------------------------------------------ running */

  function run() {
    var host = document.getElementById('results-ttest');
    if (!host) return;
    UI.clear(host);
    if (mode === 'independent') runIndependent(host); else runPaired(host);
  }

  function refresh(resultsHost) {
    if (mode === 'independent') {
      var c = cfg.independent;
      if (c.factor && c.groupA && c.groupB && c.groupA !== c.groupB) runInto(resultsHost);
      else resultsHost.appendChild(UI.empty('Pick two different groups above and the result appears here automatically.'));
    } else if (cfg.paired.before && cfg.paired.after && cfg.paired.before !== cfg.paired.after) {
      runInto(resultsHost);
    } else {
      resultsHost.appendChild(UI.empty('Choose two different variables above and the result appears here automatically.'));
    }
  }

  function runInto(resultsHost) {
    if (mode === 'independent') runIndependent(resultsHost); else runPaired(resultsHost);
  }

  function runIndependent(host) {
    var c = cfg.independent;
    var a = State.groupBy(c.dependent, c.factor).filter(function (g) { return g.label === c.groupA; })[0];
    var b = State.groupBy(c.dependent, c.factor).filter(function (g) { return g.label === c.groupB; })[0];
    if (!a || !b || a.values.length < 2 || b.values.length < 2) {
      host.appendChild(UI.empty('Each group needs at least two usable values. Check for blanks in ' + c.dependent + '.'));
      return;
    }
    var A = a.values, B = b.values;
    var r = Stats.independentT(A, B, c.equalVariances);
    if (!r) { host.appendChild(UI.empty('Not enough data to run this test.')); return; }

    var d = Stats.cohensD(A, B);
    var g = Stats.hedgesG(A, B);
    var dci = Stats.dCI(d, A.length, B.length);
    var lev = Stats.leveneTest([A, B]);
    var lost = State.rowCount() - A.length - B.length;

    var summary = [
      UI.statGrid([
        ['t', Stats.fmt(r.t)],
        ['df', Stats.fmt(r.df, 2)],
        ['p', Stats.fmtP(r.p) + Stats.stars(r.p)],
        ['Mean difference', Stats.fmt(r.diff)],
        ['95% CI', '[' + Stats.fmt(r.ci[0]) + ', ' + Stats.fmt(r.ci[1]) + ']'],
        ["Cohen's d", Stats.fmt(d) + ' (' + Stats.dLabel(d) + ')']
      ]),
      el('h4', { class: 'sub-head', text: 'Group summaries' }),
      UI.table([
        { key: 'g', label: 'Group', align: 'left', mono: false },
        { key: 'n', label: 'N' },
        { key: 'mean', label: 'Mean' },
        { key: 'sd', label: 'Std. deviation' },
        { key: 'sem', label: 'Std. error' }
      ], [
        { g: c.groupA + ' (' + c.dependent + ')', n: A.length, mean: Stats.fmt(r.mean1), sd: Stats.fmt(r.sd1), sem: Stats.fmt(Stats.sem(A)) },
        { g: c.groupB + ' (' + c.dependent + ')', n: B.length, mean: Stats.fmt(r.mean2), sd: Stats.fmt(r.sd2), sem: Stats.fmt(Stats.sem(B)) }
      ])
    ];

    if (!c.equalVariances) {
      summary.push(UI.note('info', "Welch's t-test does not assume the two groups have the same spread, which is the safer choice when group sizes or variances differ."));
    }
    if (lev) {
      summary.push(UI.note(lev.p < 0.05 ? 'warn' : 'info',
        "Levene's test of equal variances: F(" + lev.df1 + ', ' + lev.df2 + ') = ' + Stats.fmt(lev.F) + ', ' + Stats.fmtPBare(lev.p) + '. ' +
        (lev.p < 0.05
          ? 'The group variances differ significantly, so Welch\'s t-test is the appropriate result here.'
          : 'No evidence that the variances differ, so the equal-variances assumption is reasonable.')));
    }

    summary.push(el('h4', { class: 'sub-head', text: 'Effect size' }));
    summary.push(UI.table([
      { key: 'k', label: 'Measure', align: 'left', mono: false },
      { key: 'v', label: 'Value' },
      { key: 'note', label: 'Interpretation', align: 'left', mono: false, render: function (row) { return el('span', { class: 'muted', text: row.note }); } }
    ], [
      { k: "Cohen's d", v: Stats.fmt(d), note: 'Groups differ by ' + Stats.dLabel(d) + ' standard deviations. ' + (dci ? '95% CI [' + Stats.fmt(dci[0]) + ', ' + Stats.fmt(dci[1]) + '].' : '') },
      { k: "Hedges' g", v: Stats.fmt(g), note: "Cohen's d with a small-sample correction. Prefer this when either group has fewer than about 20 respondents." }
    ]));

    summary.push(UI.verdict(r.p, c.alpha));
    summary.push(UI.interpretation(prose(r.p, c.alpha, r.diff, r.ci, c.dependent, c.groupA, c.groupB, d, lev, c.equalVariances)));
    summary.push(UI.chartBox(Charts.groupedBox([
      { label: c.groupA, values: A }, { label: c.groupB, values: B }
    ]), 'Boxes show the middle 50% of each group; the line inside is the median.'));

    if (lost > 0) {
      summary.splice(1, 0, UI.note('info', lost + ' row' + (lost === 1 ? '' : 's') + ' were left out because ' + c.dependent + ' was blank or the row was not in either selected group.'));
    }

    host.appendChild(UI.card('Independent-samples t-test', summary,
      c.dependent + ': ' + c.groupA + ' (n=' + A.length + ') vs ' + c.groupB + ' (n=' + B.length + ')'));

    State.addResult({
      kind: 'Independent-samples t-test',
      title: c.dependent + ': ' + c.groupA + ' vs ' + c.groupB,
      meta: 'n = ' + (A.length + B.length) + ' · ' + (c.equalVariances ? "Student's" : "Welch's") + ' t-test',
      table: [
        ['Statistic', 'Value'],
        ['t', Stats.fmt(r.t)],
        ['df', Stats.fmt(r.df, 2)],
        ['p', Stats.fmtP(r.p) + Stats.stars(r.p)],
        ['Mean ' + c.groupA, Stats.fmt(r.mean1)],
        ['Mean ' + c.groupB, Stats.fmt(r.mean2)],
        ['Mean difference', Stats.fmt(r.diff)],
        ['95% CI', '[' + Stats.fmt(r.ci[0]) + ', ' + Stats.fmt(r.ci[1]) + ']'],
        ["Cohen's d", Stats.fmt(d) + (dci ? '  [' + Stats.fmt(dci[0]) + ', ' + Stats.fmt(dci[1]) + ']' : '')]
      ],
      narrative: prose(r.p, c.alpha, r.diff, r.ci, c.dependent, c.groupA, c.groupB, d, lev, c.equalVariances),
      chart: Charts.groupedBox([{ label: c.groupA, values: A }, { label: c.groupB, values: B }])
    });
  }

  function runPaired(host) {
    var c = cfg.paired;
    var p = State.pairColumns(c.before, c.after);
    if (p.xs.length < 2) {
      host.appendChild(UI.empty('Only ' + p.xs.length + ' complete pair' + (p.xs.length === 1 ? '' : 's') + ' found. Both variables need numbers in the same row.'));
      return;
    }
    var r = Stats.pairedT(p.xs, p.ys);
    if (!r) { host.appendChild(UI.empty('Not enough complete pairs to run this test.')); return; }
    var d = Stats.cohensD(p.xs, p.ys);
    var dci = Stats.dCI(d, p.xs.length, p.ys.length);
    var diffs = r.diffs;
    var normalDiff = Stats.dAgostinoPearson(diffs);

    var body = [
      UI.statGrid([
        ['t', Stats.fmt(r.t)],
        ['df', Stats.fmt(r.df, 2)],
        ['p', Stats.fmtP(r.p) + Stats.stars(r.p)],
        ['Mean difference', Stats.fmt(r.meanDiff)],
        ['95% CI', '[' + Stats.fmt(r.ci[0]) + ', ' + Stats.fmt(r.ci[1]) + ']'],
        ["Cohen's d", Stats.fmt(d) + ' (' + Stats.dLabel(d) + ')']
      ]),
      el('h4', { class: 'sub-head', text: 'Condition summaries' }),
      UI.table([
        { key: 'g', label: 'Measurement', align: 'left', mono: false },
        { key: 'n', label: 'N' },
        { key: 'mean', label: 'Mean' },
        { key: 'sd', label: 'Std. deviation' },
        { key: 'sem', label: 'Std. error' }
      ], [
        { g: c.before, n: p.xs.length, mean: Stats.fmt(r.meanBefore), sd: Stats.fmt(Stats.std(p.xs)), sem: Stats.fmt(Stats.sem(p.xs)) },
        { g: c.after, n: p.ys.length, mean: Stats.fmt(r.meanAfter), sd: Stats.fmt(Stats.std(p.ys)), sem: Stats.fmt(Stats.sem(p.ys)) }
      ]),
      UI.note('info', 'A paired test looks at the difference within each respondent, so the two columns must line up row by row. ' + r.n + ' complete pairs were used' + (r.dropped ? ', ' + r.dropped + ' dropped' : '') + '.'),
      el('h4', { class: 'sub-head', text: 'Assumption check on the differences' }),
      normalDiff.applicable
        ? UI.verdict(normalDiff.p, 0.05, 'K² = ' + Stats.fmt(normalDiff.K2) + ', ' + Stats.fmtPWith(normalDiff.p))
        : UI.note('info', 'D\'Agostino-Pearson needs at least 8 differences; there are ' + normalDiff.n + '. Inspect the histogram and Q-Q plot below instead.'),
      normalDiff.applicable
        ? UI.interpretation(normalDiff.p < 0.05
          ? 'The differences are not normally distributed, so this t-test result should be treated with caution. A Wilcoxon signed-rank test would be the safer alternative.'
          : 'The differences are consistent with a normal distribution, so the paired t-test is appropriate here.')
        : null,
      el('h4', { class: 'sub-head', text: 'Effect size' }),
      UI.table([
        { key: 'k', label: 'Measure', align: 'left', mono: false },
        { key: 'v', label: 'Value' },
        { key: 'note', label: 'Interpretation', align: 'left', mono: false, render: function (row) { return el('span', { class: 'muted', text: row.note }); } }
      ], [{ k: "Cohen's d", v: Stats.fmt(d), note: 'The change is ' + Stats.dLabel(d) + ' standard deviations.' + (dci ? ' 95% CI [' + Stats.fmt(dci[0]) + ', ' + Stats.fmt(dci[1]) + '].' : '') }]),
      UI.verdict(r.p, c.alpha),
      UI.interpretation(pairedProse(r.p, c.alpha, r.meanDiff, r.ci, c.before, c.after, d, r.n)),
      UI.chartBox(Charts.histogram(diffs, 'Difference (' + c.before + ' − ' + c.after + ')'),
        'The paired t-test is really a one-sample test on these differences.'),
      r.dropped ? UI.note('warn', r.dropped + ' row' + (r.dropped === 1 ? '' : 's') + ' were dropped because one of the two values was blank.') : null
    ];

    host.appendChild(UI.card('Paired-samples t-test', body, c.before + ' vs ' + c.after + ' · n = ' + r.n));

    State.addResult({
      kind: 'Paired-samples t-test',
      title: c.before + ' vs ' + c.after,
      meta: 'n = ' + r.n + ' pairs',
      table: [
        ['Statistic', 'Value'],
        ['t', Stats.fmt(r.t)],
        ['df', Stats.fmt(r.df, 2)],
        ['p', Stats.fmtP(r.p) + Stats.stars(r.p)],
        ['Mean ' + c.before, Stats.fmt(r.meanBefore)],
        ['Mean ' + c.after, Stats.fmt(r.meanAfter)],
        ['Mean difference', Stats.fmt(r.meanDiff)],
        ['95% CI', '[' + Stats.fmt(r.ci[0]) + ', ' + Stats.fmt(r.ci[1]) + ']'],
        ["Cohen's d", Stats.fmt(d)]
      ],
      narrative: pairedProse(r.p, c.alpha, r.meanDiff, r.ci, c.before, c.after, d, r.n),
      chart: Charts.histogram(diffs, 'Difference')
    });
  }

  /* --------------------------------------------------------------- prose */

  function prose(p, alpha, diff, ci, dep, gA, gB, d, lev, pooled) {
    var higher = diff > 0;
    var s = 'The mean ' + dep + ' was ' + Stats.fmt(Math.abs(diff)) + ' points ' +
      (higher ? 'higher' : 'lower') + ' in ' + (higher ? gA : gB) + ' than in ' +
      (higher ? gB : gA) + ' (95% CI ' + Stats.fmt(ci[0]) + ' to ' + Stats.fmt(ci[1]) + '). ';
    if (p < alpha) {
      s += 'The difference is statistically significant at the ' + alpha + ' level (' + Stats.stars(p) + '), so it is unlikely to be due to sampling chance alone. ';
      s += "Cohen's d of " + Stats.fmt(d) + ' puts the gap at ' + Stats.dLabel(d) +
        ' in size, which means the groups differ ' +
        (Math.abs(d) >= 0.8 ? 'a great deal' : Math.abs(d) >= 0.5 ? 'clearly' : Math.abs(d) >= 0.2 ? 'a little' : 'only marginally') +
        ' in practical terms. ';
    } else {
      s += 'The difference is not statistically significant at the ' + alpha + ' level (' + Stats.fmtPBare(p) +
        '), so there is not enough evidence to conclude the two groups really differ. This does not prove the groups are identical; the sample may simply be too small to detect a difference. ';
    }
    if (!pooled) {
      s += "Welch's test was used, so the unequal-variance assumption does not need to hold. ";
      if (lev && lev.p < 0.05) {
        s += 'Note that Levene\'s test did flag a variance difference, so treat this result with some caution. ';
      }
    }
    return s.trim();
  }

  function pairedProse(p, alpha, md, ci, before, after, d, n) {
    var dir = md > 0 ? 'increased' : 'decreased';
    var s = 'From ' + before + ' to ' + after + ', the average score ' + dir + ' by ' + Stats.fmt(Math.abs(md)) +
      ' points across ' + n + ' respondents (95% CI ' + Stats.fmt(ci[0]) + ' to ' + Stats.fmt(ci[1]) + '). ';
    if (p < alpha) {
      s += 'This change is statistically significant at the ' + alpha + ' level (' + Stats.stars(p) + '). ';
      s += "Cohen's d of " + Stats.fmt(d) + ' describes the change as ' + Stats.dLabel(d) + ' relative to the variability of the scores. ';
    } else {
      s += 'This change is not statistically significant at the ' + alpha + ' level (' + Stats.fmtPBare(p) + '), so the evidence does not support a real change. ';
    }
    return s.trim();
  }

  global.TTestController = { render: render, reset: function () { cfg.independent = { dependent: '', factor: '', equalVariances: true, alpha: 0.05 }; cfg.paired = { before: '', after: '', alpha: 0.05 }; } };
})(window);
