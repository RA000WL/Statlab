/* ==========================================================================
   StatLab — js/controllers/descriptives.js
   Descriptive statistics per continuous variable, with a D'Agostino-Pearson
   normality test, histogram, boxplot and Q-Q plot.
   ========================================================================== */
(function (global) {
  'use strict';

  var el = UI.el;
  var SUP2 = 'K²';
  var selected = [];

  function render(host) {
    UI.clear(host);
    host.appendChild(el('div', { class: 'page-head' }, [
      el('h2', { class: 'page-title', text: 'Descriptive statistics' }),
      el('p', { class: 'page-lede', text: 'Centre, spread and shape for each measurement in your data.' })
    ]));

    if (!State.hasData()) {
      host.appendChild(UI.empty('Load a dataset first.', UI.button('Go to Data', function () { App.go('data'); }, 'ghost')));
      return;
    }

    var cont = State.continuous();
    if (!cont.length) {
      host.appendChild(UI.empty('None of your columns are marked as continuous measurements. Open Data and set at least one variable to Continuous.',
        UI.button('Go to Data', function () { App.go('data'); }, 'ghost')));
      return;
    }
    if (!selected.length) selected = cont.slice(0, Math.min(3, cont.length));
    selected = selected.filter(function (v) { return cont.indexOf(v) !== -1; });
    if (!selected.length) selected = cont.slice(0, Math.min(3, cont.length));

    var out = el('div', { class: 'stack' });
    out.appendChild(UI.card('Choose variables', [
      UI.checkboxList(cont.map(function (c) { return { value: c, label: c }; }), selected, function () {
        selected = Array.prototype.slice.call(host.querySelectorAll('.checklist input:checked')).map(function (i) { return i.value; });
        refresh();
      })
    ], 'the first column of each table is the variable name'));

    var results = el('div', { class: 'stack' });
    out.appendChild(results);

    function refresh() {
      UI.clear(results);
      if (!selected.length) { results.appendChild(UI.empty('Pick at least one variable above.')); return; }
      selected.forEach(function (name) {
        var values = State.numeric(name);
        if (values.length < 2) {
          results.appendChild(UI.card(name, [UI.note('warn', 'This variable has ' + values.length +
            ' usable numeric value' + (values.length === 1 ? '' : 's') + '. At least 2 are needed.')]));
          return;
        }
        results.appendChild(varCard(name, values));
      });
    }

    refresh();
    host.appendChild(out);
  }

  function varCard(name, x) {
    var s = describe(x);
    var norm = Stats.dAgostinoPearson(x);

    var body = [
      UI.table([
        { key: 'label', label: 'Statistic', align: 'left', mono: false },
        { key: 'value', label: 'Value', render: function (r) { return intervalCell(r.value, r.ci); } },
        { key: 'about', label: 'What it tells you', align: 'left', mono: false, render: function (r) { return el('span', { class: 'muted', text: r.about }); } }
      ], s)
    ];

    body.push(el('h4', { class: 'sub-head', text: 'Distribution check' }));
    if (norm.applicable) {
      body.push(UI.verdict(norm.p, 0.05, SUP2 + ' = ' + Stats.fmt(norm.K2) + ', ' + Stats.fmtPWith(norm.p)));
      body.push(UI.interpretation(norm.p < 0.05
        ? 'The shape differs from a bell curve, so this variable is not normally distributed. Parametric tests that assume normality (t-test, ANOVA, regression) are risky here. Look at the Q-Q plot below; if the points bend away from the dashed line in the tails, say so in your write-up and consider a non-parametric alternative.'
        : 'No evidence against normality. Tests that assume a normal distribution (t-test, ANOVA, regression) are reasonable to use on this variable.'));
    } else {
      body.push(UI.note('info', "D'Agostino-Pearson needs at least 8 observations; this variable has " + norm.n +
        '. Read the Q-Q plot and the skewness and kurtosis values above instead.'));
    }

    body.push(el('div', { class: 'chart-grid' }, [
      UI.chartBox(Charts.histogram(x, name)),
      UI.chartBox(Charts.boxplot(x, name)),
      UI.chartBox(Charts.qq(x, name), 'Points close to the dashed line indicate a normal shape.')
    ]));

    return UI.card(name, body, x.length + ' values');
  }

  function intervalCell(text, ci) {
    var frag = document.createDocumentFragment();
    frag.appendChild(document.createTextNode(text));
    if (ci) {
      frag.appendChild(el('span', { class: 'ci mono', text: '  [' + Stats.fmt(ci[0]) + ', ' + Stats.fmt(ci[1]) + ']' }));
    }
    return frag;
  }

  function describe(x) {
    var n = x.length;
    var m = Stats.mean(x), md = Stats.median(x), sd = Stats.std(x);
    var mds = Stats.mode(x);
    var ci = Stats.meanCI(x);
    var sk = Stats.skewness(x), ku = Stats.kurtosis(x);
    return [
      { label: 'N', value: String(n), about: 'How many values were usable after dropping blanks.' },
      { label: 'Missing', value: String(State.get().dataset.rows.length - n), about: 'Rows dropped for this variable. Other variables can still use them.' },
      { label: 'Mean', value: Stats.fmt(m), ci: ci, about: 'Arithmetic average. Sensitive to extreme values.' },
      { label: 'Median', value: Stats.fmt(md), about: 'Middle value. A better centre when the distribution is skewed.' },
      { label: 'Mode', value: mds.length ? mds.slice(0, 3).map(function (v) { return Stats.fmt(v); }).join(', ') : 'none', about: 'Most frequent value. Meaningful mainly for categories and small scales.' },
      { label: 'Std. deviation', value: Stats.fmt(sd), about: 'Typical distance from the mean. Larger means more spread out.' },
      { label: 'Variance', value: Stats.fmt(Stats.variance(x)), about: 'Squared standard deviation. The same information in different units.' },
      { label: 'Std. error', value: Stats.fmt(Stats.sem(x)), about: 'How precisely the mean is estimated. Falls as N rises.' },
      { label: 'Minimum', value: Stats.fmt(Stats.min(x)), about: 'Smallest observed value.' },
      { label: 'Maximum', value: Stats.fmt(Stats.max(x)), about: 'Largest observed value.' },
      { label: 'Range', value: Stats.fmt(Stats.range(x)), about: 'Maximum minus minimum.' },
      { label: 'IQR', value: Stats.fmt(Stats.iqr(x)), about: 'Spread of the middle 50% of values. Robust against outliers.' },
      { label: '95% CI for mean', value: Stats.fmt(m) + ' ± ' + Stats.fmt((ci[1] - ci[0]) / 2), ci: ci, about: 'If you repeated this study many times, 95% of the intervals would contain the true mean.' },
      { label: 'Skewness', value: Stats.fmt(sk), about: skewWord(sk) },
      { label: 'Kurtosis', value: Stats.fmt(ku), about: kurtWord(ku) }
    ];
  }

  function skewWord(s) {
    if (!isFinite(s)) return 'Not defined for this sample size.';
    if (Math.abs(s) < 0.5) return 'Roughly symmetric.';
    return s > 0
      ? 'Right skewed: a long tail of high values pulls the mean above the median.'
      : 'Left skewed: a long tail of low values pulls the mean below the median.';
  }

  function kurtWord(k) {
    if (!isFinite(k)) return 'Not defined for this sample size.';
    if (k > 1) return 'Very peaked with heavy tails: a few extreme values are likely.';
    if (k > 0.5) return 'Slightly more peaked than a normal distribution.';
    if (k < -1) return 'Flatter than normal: values are spread evenly across the range.';
    if (k < -0.5) return 'Slightly flatter than a normal distribution.';
    return 'Close to the kurtosis of a normal distribution.';
  }

  global.DescriptivesController = { render: render, describe: describe };
})(window);
