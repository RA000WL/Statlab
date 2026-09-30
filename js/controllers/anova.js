/* ==========================================================================
   StatLab — js/controllers/anova.js
   One-way ANOVA with eta-squared, Tukey HSD post-hoc pairs, and a
   homogeneity check.
   ========================================================================== */
(function (global) {
  'use strict';

  var el = UI.el;
  var cfg = { dependent: '', factor: '', alpha: 0.05, tukey: true };
  var lastSig = null;

  function render(host) {
    UI.clear(host);
    host.appendChild(el('div', { class: 'page-head' }, [
      el('h2', { class: 'page-title', text: 'One-Way ANOVA' }),
      el('p', { class: 'page-lede', text: 'Compare the average of one continuous variable across three or more groups.' })
    ]));

    if (!State.hasData()) {
      host.appendChild(UI.empty('Load a dataset first.', UI.button('Go to Data', function () { App.go('data'); }, 'ghost')));
      return;
    }
    var cont = State.continuous(), cats = State.categorical();
    if (!cont.length || !cats.length) {
      host.appendChild(UI.empty('ANOVA needs one continuous variable and one categorical variable. Open Data to check the types.',
        UI.button('Go to Data', function () { App.go('data'); }, 'ghost')));
      return;
    }
    if (!cfg.dependent || cont.indexOf(cfg.dependent) === -1) cfg.dependent = cont[0];
    if (!cfg.factor || cats.indexOf(cfg.factor) === -1) cfg.factor = cats[0];

    var out = el('div', { class: 'stack' });
    out.appendChild(UI.card('Analysis', [el('div', { class: 'stack' }, [
      UI.field('Continuous variable (the outcome)', UI.select(cont.map(function (v) { return { value: v, label: v }; }), cfg.dependent, function (v) { cfg.dependent = v; run(); })),
      UI.field('Grouping variable (the factor)', UI.select(cats.map(function (v) { return { value: v, label: v }; }), cfg.factor, function (v) { cfg.factor = v; run(); })),
      UI.field('Significance level', UI.select([
        { value: '0.01', label: '0.01 (99% confidence)' },
        { value: '0.05', label: '0.05 (95% confidence)' },
        { value: '0.10', label: '0.10 (90% confidence)' }
      ], String(cfg.alpha), function (v) { cfg.alpha = Number(v); run(); })),
      UI.buttonRow([
        UI.button('Run ANOVA', run, 'primary'),
        UI.button(cfg.tukey ? 'Tukey post-hoc: on' : 'Tukey post-hoc: off', function () { cfg.tukey = !cfg.tukey; run(); }, 'ghost')
      ])
    ])]));

    var results = el('div', { class: 'stack', id: 'results-anova' });
    out.appendChild(results);
    host.appendChild(out);
    run();
  }

  function run() {
    var host = document.getElementById('results-anova');
    if (!host) return;
    UI.clear(host);
    var groups = State.groupBy(cfg.dependent, cfg.factor);
    var usable = groups.filter(function (g) { return g.values.length > 0; });
    if (usable.length < 2) {
      host.appendChild(UI.empty('"' + cfg.factor + '" needs at least two groups with values. It currently has ' + usable.length + '.'));
      return;
    }
    var singles = usable.filter(function (g) { return g.values.length < 2; });
    if (singles.length) {
      host.appendChild(UI.note('warn', singles.map(function (g) { return '"' + g.label + '" (n = ' + g.values.length + ')'; }).join(', ') + ' ' + (singles.length === 1 ? 'has' : 'have') + ' fewer than two values and ' + (singles.length === 1 ? 'was' : 'were') + ' left out of the analysis.'));
    }
    var a = Stats.oneWayAnova(usable.map(function (g) { return g.values; }));
    if (!a) { host.appendChild(UI.empty('Not enough data to run an ANOVA here.')); return; }

    lastSig = a.p < cfg.alpha;
    var body = [];

    body.push(UI.statGrid([
      ['F', Stats.fmt(a.F)],
      ['df between', String(a.df1)],
      ['df within', String(a.df2)],
      ['p', Stats.fmtP(a.p) + Stats.stars(a.p)],
      ['η²', Stats.fmt(a.etaSq) + ' (' + Stats.etaLabel(a.etaSq) + ')'],
      ['ω²', Stats.fmt(a.omegaSq)]
    ]));

    body.push(el('h4', { class: 'sub-head', text: 'Group summaries' }));
    body.push(UI.table([
      { key: 'g', label: 'Group', align: 'left', mono: false },
      { key: 'n', label: 'N' },
      { key: 'm', label: 'Mean', dp: 3 },
      { key: 'sd', label: 'Std. deviation', dp: 3 },
      { key: 'sem', label: 'Std. error', dp: 3 }
    ], usable.map(function (g, i) {
      return { g: g.label, n: g.values.length, m: a.means[i], sd: a.sds[i], sem: Stats.sem(g.values) };
    }).concat([{ g: 'Total', n: a.n, m: a.grandMean, sd: Math.sqrt(a.ssTotal / (a.n - 1)), sem: NaN }])));

    body.push(el('h4', { class: 'sub-head', text: 'Variance table' }));
    body.push(UI.table([
      { key: 's', label: 'Source', align: 'left', mono: false },
      { key: 'ss', label: 'SS' }, { key: 'df', label: 'df' }, { key: 'ms', label: 'MS' }, { key: 'f', label: 'F' }, { key: 'p', label: 'p' }
    ], [
      { s: 'Between groups', ss: Stats.fmt(a.ssBetween), df: a.df1, ms: Stats.fmt(a.msBetween), f: Stats.fmt(a.F), p: Stats.fmtP(a.p) + Stats.stars(a.p) },
      { s: 'Within groups', ss: Stats.fmt(a.ssWithin), df: a.df2, ms: Stats.fmt(a.msWithin), f: '', p: '' },
      { s: 'Total', ss: Stats.fmt(a.ssTotal), df: a.n - 1, ms: '', f: '', p: '' }
    ]));

    body.push(el('h4', { class: 'sub-head', text: 'Effect size' }));
    body.push(UI.table([
      { key: 'k', label: 'Measure', align: 'left', mono: false },
      { key: 'v', label: 'Value' },
      { key: 'note', label: 'What it means', align: 'left', mono: false, render: function (r) { return el('span', { class: 'muted', text: r.note }); } }
    ], [
      { k: 'η² (eta squared)', v: Stats.fmt(a.etaSq), note: 'The factor explains ' + Stats.fmt(a.etaSq * 100, 1) + '% of the variation in ' + cfg.dependent + '. Size: ' + Stats.etaLabel(a.etaSq) + '.' },
      { k: 'η² 95% CI', v: '[' + Stats.fmt(a.etaSqCI[0]) + ', ' + Stats.fmt(a.etaSqCI[1]) + ']', note: 'The plausible range for the true effect size given this sample size.' },
      { k: 'ω² (omega squared)', v: Stats.fmt(a.omegaSq), note: 'A less biased alternative to η². Prefer this for a small sample, where η² tends to overstate the effect.' }
    ]));

    var lev = Stats.leveneTest(usable.map(function (g) { return g.values; }));
    if (lev) {
      body.push(UI.note(lev.p < 0.05 ? 'warn' : 'info',
        "Levene's test of equal variances: F(" + lev.df1 + ', ' + lev.df2 + ') = ' + Stats.fmt(lev.F) + ', ' + Stats.fmtPWith(lev.p).replace('***','') + '. ' +
        (lev.p < 0.05
          ? 'Group variances differ, so the ANOVA F-test is less reliable. Inspect the boxplot; if the spread is very unequal, consider a non-parametric alternative such as Kruskal-Wallis.'
          : 'No evidence of unequal variances, so the ANOVA assumption holds.')));
    }

    body.push(UI.verdict(a.p, cfg.alpha));
    body.push(UI.interpretation(anovaProse(a, usable, lastSig)));
    body.push(UI.chartBox(Charts.groupedBox(usable.map(function (g) { return { label: g.label, values: g.values }; })),
      'Overlapping boxes suggest similar groups; separated boxes suggest a real difference.'));

    if (cfg.tukey) {
      var tuk = Stats.tukeyHSD(usable.map(function (g) { return g.values; }), cfg.alpha);
      if (tuk) {
        body.push(el('h4', { class: 'sub-head', text: 'Tukey HSD post-hoc comparisons' }));
        if (!lastSig) {
          body.push(UI.note('info', 'The overall F-test is not significant, so Tukey comparisons are not reported. StatLab follows the convention of only running post-hoc tests after a significant omnibus test.'));
        } else {
          body.push(UI.table([
            { key: 'pair', label: 'Comparison', align: 'left', mono: false },
            { key: 'diff', label: 'Mean difference' },
            { key: 'ci', label: '95% CI', align: 'left', mono: false },
            { key: 'q', label: 'q' },
            { key: 'p', label: 'p (Tukey)' },
            { key: 'sig', label: '', align: 'left', mono: false, render: function (r) { return r.significant ? el('span', { class: 'tag tag-sig', text: 'differs' }) : el('span', { class: 'muted', text: 'n.s.' }); } }
          ], tuk.pairs.map(function (p) {
            return {
              pair: usable[p.i].label + ' vs ' + usable[p.j].label,
              diff: Stats.fmt(p.meanDiff),
              ci: '[' + Stats.fmt(p.ci[0]) + ', ' + Stats.fmt(p.ci[1]) + ']',
              q: Stats.fmt(p.q), p: Stats.fmtP(p.p) + Stats.stars(p.p), significant: p.significant
            };
          }), { rowClass: function (r) { return r.significant ? 'row-sig' : ''; } }));
          var sigPairs = tuk.pairs.filter(function (p) { return p.significant; });
          body.push(UI.interpretation(sigPairs.length
            ? sigPairs.length + ' of ' + tuk.pairs.length + ' pairs differ significantly after Tukey\'s correction: ' +
              sigPairs.map(function (p) { return usable[p.i].label + ' vs ' + usable[p.j].label; }).join(', ') + '.'
            : 'Even with a significant overall F-test, no individual pair separates once Tukey\'s correction for multiple comparisons is applied. The overall effect is driven by the pattern across all groups rather than by one contrast.'));
        }
      }
    }

    host.appendChild(UI.card('One-way ANOVA', body, cfg.dependent + ' by ' + cfg.factor + ' · k = ' + a.k + ' groups · N = ' + a.n));

    State.addResult({
      kind: 'One-Way ANOVA',
      title: cfg.dependent + ' by ' + cfg.factor,
      meta: 'k = ' + a.k + ' groups · N = ' + a.n,
      table: [
        ['Statistic', 'Value'],
        ['F', Stats.fmt(a.F)],
        ['df between', String(a.df1)],
        ['df within', String(a.df2)],
        ['p', Stats.fmtP(a.p) + Stats.stars(a.p)],
        ['η²', Stats.fmt(a.etaSq)],
        ['η² 95% CI', '[' + Stats.fmt(a.etaSqCI[0]) + ', ' + Stats.fmt(a.etaSqCI[1]) + ']'],
        ['ω²', Stats.fmt(a.omegaSq)]
      ].concat(usable.map(function (g, i) {
        return ['Mean — ' + g.label, Stats.fmt(a.means[i]) + ' (n = ' + g.values.length + ')'];
      })),
      narrative: anovaProse(a, usable, lastSig),
      chart: Charts.groupedBox(usable.map(function (g) { return { label: g.label, values: g.values }; }))
    });
  }

  function anovaProse(a, groups, sig) {
    var ranked = groups.map(function (g, i) { return { label: g.label, mean: a.means[i], n: g.values.length }; })
      .sort(function (x, y) { return y.mean - x.mean; });
    var s = 'Across ' + a.k + ' groups the mean ' + cfg.dependent + ' ranged from ' +
      Stats.fmt(ranked[ranked.length - 1].mean) + ' in ' + ranked[ranked.length - 1].label + ' to ' +
      Stats.fmt(ranked[0].mean) + ' in ' + ranked[0].label + '. ';
    if (sig) {
      s += 'The F-test is significant at the ' + cfg.alpha + ' level (F(' + a.df1 + ', ' + a.df2 + ') = ' + Stats.fmt(a.F) + ', ' + Stats.fmtPWith(a.p) + '), so at least one group mean differs from the others. ';
      s += 'Eta squared of ' + Stats.fmt(a.etaSq) + ' means group membership accounts for ' + Stats.fmt(a.etaSq * 100, 1) + '% of the variation in ' + cfg.dependent + ' — a ' + Stats.etaLabel(a.etaSq) + ' effect. ';
    } else {
      s += 'The F-test is not significant at the ' + cfg.alpha + ' level (F(' + a.df1 + ', ' + a.df2 + ') = ' + Stats.fmt(a.F) + ', ' + Stats.fmtPWith(a.p) + '), so there is no evidence that the group means really differ. The observed spread is consistent with random variation. ';
    }
    return s.trim();
  }

  global.ANOVAController = { render: render };
})(window);
