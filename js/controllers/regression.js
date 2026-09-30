/* ==========================================================================
   StatLab — js/controllers/regression.js
   Simple and multiple linear regression by ordinary least squares, with
   coefficient tables, a residual plot, and collinearity checks.
   ========================================================================== */
(function (global) {
  'use strict';

  var el = UI.el;
  var cfg = { y: '', xs: [], alpha: 0.05, showResiduals: true };

  function render(host) {
    UI.clear(host);
    host.appendChild(el('div', { class: 'page-head' }, [
      el('h2', { class: 'page-title', text: 'Linear Regression' }),
      el('p', { class: 'page-lede', text: 'Predict one continuous variable from one or more other continuous variables.' })
    ]));

    if (!State.hasData()) {
      host.appendChild(UI.empty('Load a dataset first.', UI.button('Go to Data', function () { App.go('data'); }, 'ghost')));
      return;
    }
    var cont = State.continuous();
    if (cont.length < 2) {
      host.appendChild(UI.empty('Regression needs at least two continuous variables. Open Data to check the types.',
        UI.button('Go to Data', function () { App.go('data'); }, 'ghost')));
      return;
    }
    if (!cfg.y || cont.indexOf(cfg.y) === -1) cfg.y = cont[0];
    cfg.xs = cfg.xs.filter(function (v) { return cont.indexOf(v) !== -1 && v !== cfg.y; });
    if (!cfg.xs.length) {
      var first = cont.filter(function (v) { return v !== cfg.y; })[0];
      cfg.xs = first ? [first] : [];
    }

    var out = el('div', { class: 'stack' });
    out.appendChild(UI.card('Analysis', [el('div', { class: 'stack' }, [
      UI.field('Outcome (the variable you want to predict)', UI.select(cont.map(function (v) { return { value: v, label: v }; }), cfg.y, function (v) {
        cfg.y = v;
        cfg.xs = cfg.xs.filter(function (x) { return x !== v; });
        render(host);
      })),
      UI.field('Predictors (one for simple, two or more for multiple)', UI.checkboxList(
        cont.filter(function (v) { return v !== cfg.y; }).map(function (v) { return { value: v, label: v }; }),
        cfg.xs,
        function () {
          cfg.xs = Array.prototype.slice.call(host.querySelectorAll('.checklist input:checked')).map(function (i) { return i.value; });
          run();
        }
      )),
      UI.buttonRow([
        UI.button('Run regression', run, 'primary'),
        UI.button(cfg.showResiduals ? 'Residual plot: on' : 'Residual plot: off', function () { cfg.showResiduals = !cfg.showResiduals; run(); }, 'ghost')
      ]),
      UI.note('info', cfg.xs.length <= 1
        ? 'With one predictor this is simple linear regression. Tick a second predictor to fit a multiple regression.'
        : 'With ' + cfg.xs.length + ' predictors this is multiple linear regression. Rows with a blank value in the outcome or any predictor are dropped, so watch the N.')
    ])]));

    var results = el('div', { class: 'stack', id: 'results-reg' });
    out.appendChild(results);
    host.appendChild(out);
    run();
  }

  function run() {
    var host = document.getElementById('results-reg');
    if (!host) return;
    UI.clear(host);
    if (!cfg.xs.length) { host.appendChild(UI.empty('Choose at least one predictor above.')); return; }

    var r;
    if (cfg.xs.length === 1) {
      var p = State.pairColumns(cfg.y, cfg.xs[0]);
      r = Stats.simpleRegression(p.xs, p.ys);
    } else {
      // Complete-case matrix: a row is used only when the outcome and every
      // predictor have a number, so the sample is identical for all terms.
      var cols = cfg.xs.map(function () { return []; });
      var ys = [];
      var rows = State.get().dataset.rows;
      var yi = State.columnIndex(cfg.y);
      var xis = cfg.xs.map(function (v) { return State.columnIndex(v); });
      var dropped = 0;
      rows.forEach(function (r2) {
        var yv = State.num(r2[yi]);
        if (!isFinite(yv)) { dropped++; return; }
        var ok = true, tmp = [];
        for (var c = 0; c < xis.length; c++) {
          var xv = State.num(r2[xis[c]]);
          if (!isFinite(xv)) { ok = false; break; }
          tmp.push(xv);
        }
        if (!ok) { dropped++; return; }
        ys.push(yv);
        tmp.forEach(function (v, c) { cols[c].push(v); });
      });
      var X = [];
      for (var i = 0; i < ys.length; i++) {
        X.push(cols.map(function (cc) { return cc[i]; }));
      }
      r = Stats.multipleRegression(X, ys, cfg.xs);
      if (r) r.dropped = dropped;
    }

    if (!r) {
      host.appendChild(UI.empty('Not enough complete rows to fit this model. StatLab needs at least ' + (cfg.xs.length + 2) + ' rows with no blanks in the outcome or any predictor.'));
      return;
    }

    var body = [];
    var simple = cfg.xs.length === 1;
    var r2ci = ciText(r.r2CI);

    body.push(UI.statGrid(simple ? [
      ['R²', Stats.fmt(r.rSquared)],
      ['R² 95% CI', r2ci],
      ['Adjusted R²', Stats.fmt(r.adjR2)],
      ['r', Stats.fmt(r.r)],
      ['F', Stats.fmt(r.F) + ' (' + (r.n - 2) + ')'],
      ['Model p', Stats.fmtP(r.modelP) + Stats.stars(r.modelP)]
    ] : [
      ['R²', Stats.fmt(r.rSquared)],
      ['R² 95% CI', r2ci],
      ['Adjusted R²', Stats.fmt(r.adjR2)],
      ['F', Stats.fmt(r.F) + ' (' + r.df1 + ', ' + r.df2 + ')'],
      ['Model p', Stats.fmtP(r.modelP) + Stats.stars(r.modelP)],
      ['N', String(r.n)]
    ]));

    body.push(el('h4', { class: 'sub-head', text: 'Model' }));
    body.push(UI.note('info', simple
      ? 'With one predictor the fitted line is ' + cfg.y + ' = ' + Stats.fmt(r.intercept) + ' + ' + Stats.fmt(r.slope) + ' × ' + cfg.xs[0] + '.'
      : 'The model is ' + modelEquation(r) + '. Compare adjusted R² rather than R² when comparing models with different numbers of predictors.'));

    body.push(el('h4', { class: 'sub-head', text: 'Coefficients' }));
    var coefRows = simple ? [
      { name: '(Intercept)', b: r.intercept, se: r.seIntercept, t: r.tIntercept, p: r.pIntercept, beta: NaN, sig: r.pIntercept < cfg.alpha },
      { name: cfg.xs[0], b: r.slope, se: r.seSlope, t: r.t, p: r.pSlope, beta: r.r >= 0 ? Math.sqrt(Math.max(0, r.rSquared)) : -Math.sqrt(Math.max(0, r.rSquared)), sig: r.pSlope < cfg.alpha }
    ] : r.coefs.map(function (c, i) {
        return { name: c.label, b: c.b, se: c.se, t: c.t, p: c.p, beta: c.betaStd, sig: c.p < cfg.alpha, vif: i === 0 ? NaN : r.vifs[i - 1] };
      });

    var coefCols = [
      { key: 'name', label: 'Term', align: 'left', mono: false },
      { key: 'b', label: 'B', dp: 3 },
      { key: 'se', label: 'Std. error', dp: 3 },
      { key: 't', label: 't', dp: 2 },
      { key: 'p', label: 'p', stars: true }
    ];
    if (!simple) {
      coefCols.splice(4, 0, { key: 'beta', label: 'Standardised β', dp: 3 });
      coefCols.push({ key: 'vif', label: 'VIF', dp: 2 });
    }
    body.push(UI.table(coefCols, coefRows, { rowClass: function (row) { return row.sig ? 'row-sig' : ''; } }));

    if (!simple) {
      var bad = r.vifs.filter(function (v) { return isFinite(v) && v > 5; });
      body.push(UI.note(bad.length ? 'warn' : 'info',
        'VIF (variance inflation factor) measures how much each predictor is inflated by its correlation with the other predictors. ' +
        (bad.length
          ? bad.length + ' predictor' + (bad.length === 1 ? ' has' : 's have') + ' a VIF above 5, which means multicollinearity is blurring the individual coefficients. Consider dropping the least important predictor.'
          : 'All VIF values are 5 or below, so multicollinearity is not a serious problem here.')));
    }

    body.push(el('h4', { class: 'sub-head', text: 'Variance table' }));
    if (simple) {
      body.push(UI.table([
        { key: 's', label: 'Source', align: 'left', mono: false },
        { key: 'ss', label: 'SS' }, { key: 'df', label: 'df' }, { key: 'ms', label: 'MS' }, { key: 'f', label: 'F' }, { key: 'p', label: 'p' }
      ], [
        { s: 'Regression', ss: Stats.fmt(r.ssTot - r.ssRes), df: 1, ms: Stats.fmt(r.ssTot - r.ssRes), f: Stats.fmt(r.F), p: Stats.fmtP(r.modelP) + Stats.stars(r.modelP) },
        { s: 'Residual', ss: Stats.fmt(r.ssRes), df: r.n - 2, ms: Stats.fmt(r.msRes), f: '', p: '' },
        { s: 'Total', ss: Stats.fmt(r.ssTot), df: r.n - 1, ms: '', f: '', p: '' }
      ]));
    } else {
      body.push(UI.table([
        { key: 's', label: 'Source', align: 'left', mono: false },
        { key: 'ss', label: 'SS' }, { key: 'df', label: 'df' }, { key: 'ms', label: 'MS' }, { key: 'f', label: 'F' }, { key: 'p', label: 'p' }
      ], [
        { s: 'Regression', ss: Stats.fmt(r.ssModel), df: r.df1, ms: Stats.fmt(r.msModel), f: Stats.fmt(r.F), p: Stats.fmtP(r.modelP) + Stats.stars(r.modelP) },
        { s: 'Residual', ss: Stats.fmt(r.ssRes), df: r.df2, ms: Stats.fmt(r.msRes), f: '', p: '' },
        { s: 'Total', ss: Stats.fmt(r.ssTot), df: r.n - 1, ms: '', f: '', p: '' }
      ]));
    }

    body.push(UI.verdict(r.modelP, cfg.alpha));
    body.push(UI.interpretation(prose(r, simple)));

    // Plots
    if (simple) {
      var lo = Stats.min(r.x), hi = Stats.max(r.x);
      body.push(UI.chartBox(Charts.scatter(r.x, r.y, cfg.xs[0], cfg.y, {
        x: [lo, hi], y: [r.intercept + r.slope * lo, r.intercept + r.slope * hi]
      }), 'The red line is the least-squares fit. The relationship looks strong when the points form a tight band around it.'));
    } else {
      body.push(UI.note('info', 'With ' + cfg.xs.length + ' predictors the fitted surface cannot be drawn in two dimensions. The residual plot below is the standard check instead.'));
    }
    if (cfg.showResiduals) {
      body.push(el('h4', { class: 'sub-head', text: 'Residual diagnostics' }));
      body.push(UI.chartBox(Charts.scatter(r.fitted, r.residuals, 'Fitted value', 'Residual'),
        'A good model leaves no pattern here. A curve or a funnel shape means the model is missing something.'));
      body.push(residualNote(r, simple));
    }

    if (r.dropped) {
      body.push(UI.note('info', r.dropped + ' row' + (r.dropped === 1 ? '' : 's') + ' had a blank value in ' + (r.dropped === 1 ? 'a variable' : 'one or more variables') + ' used by this model and were dropped. N = ' + r.n + '.'));
    }

    host.appendChild(UI.card(simple ? 'Simple linear regression' : 'Multiple linear regression', body,
      cfg.y + ' predicted from ' + cfg.xs.join(', ') + ' · N = ' + r.n));

    State.addResult({
      kind: simple ? 'Simple Linear Regression' : 'Multiple Linear Regression',
      title: cfg.y + ' ~ ' + cfg.xs.join(' + '),
      meta: 'N = ' + r.n + ' · ' + (simple ? '1 predictor' : cfg.xs.length + ' predictors'),
      table: [
        ['Statistic', 'Value'],
        ['R²', Stats.fmt(r.rSquared)],
        ['Adjusted R²', Stats.fmt(r.adjR2)],
        ['F', Stats.fmt(r.F)],
        ['Model p', Stats.fmtP(r.modelP) + Stats.stars(r.modelP)]
      ].concat(coefRows.map(function (row) {
        return [row.name, 'B = ' + Stats.fmt(row.b) + ', SE = ' + Stats.fmt(row.se) + ', t = ' + Stats.fmt(row.t) + ', ' + Stats.fmtPWith(row.p)];
      })),
      narrative: prose(r, simple),
      chart: simple
        ? Charts.scatter(r.x, r.y, cfg.xs[0], cfg.y, { x: [Stats.min(r.x), Stats.max(r.x)], y: [r.intercept + r.slope * Stats.min(r.x), r.intercept + r.slope * Stats.max(r.x)] })
        : Charts.scatter(r.fitted, r.residuals, 'Fitted value', 'Residual')
    });
  }

  /** An interval pair as text, or an em dash when the sample is too small. */
  function ciText(ci) {
    return ci ? '[' + Stats.fmt(ci[0]) + ', ' + Stats.fmt(ci[1]) + ']' : '—';
  }

  function modelEquation(r) {
    var terms = r.coefs.map(function (c, i) {
      if (i === 0) return Stats.fmt(c.b);
      return (c.b < 0 ? ' − ' : ' + ') + Stats.fmt(Math.abs(c.b)) + ' × ' + c.label;
    });
    return cfg.y + ' = ' + terms.join('');
  }

  function residualNote(r, simple) {
    var res = r.residuals || [];
    if (res.length < 8) return UI.note('info', 'Too few residuals for a meaningful normality check. More rows would help.');
    var norm = Stats.dAgostinoPearson(res);
    if (!norm.applicable) return UI.note('info', 'Residuals: ' + res.length + ' values. A D\'Agostino-Pearson check needs at least 8.');
    return UI.verdict(norm.p, 0.05, 'Residuals K² = ' + Stats.fmt(norm.K2) + ', ' + Stats.fmtPWith(norm.p));
  }

  function prose(r, simple) {
    var s = 'The model explains ' + Stats.fmt(r.rSquared * 100, 1) + '% of the variation in ' + cfg.y + ' (R² = ' + Stats.fmt(r.rSquared) + ', adjusted R² = ' + Stats.fmt(r.adjR2) + '). ';
    if (r.modelP < cfg.alpha) {
      s += 'The model as a whole is statistically significant at the ' + cfg.alpha + ' level (F = ' + Stats.fmt(r.F) + ', ' + Stats.fmtPWith(r.modelP) + '), so the predictors together explain more than chance would. ';
    } else {
      s += 'The model as a whole is not statistically significant at the ' + cfg.alpha + ' level (F = ' + Stats.fmt(r.F) + ', ' + Stats.fmtPWith(r.modelP) + '), so the predictors together do not explain ' + cfg.y + ' any better than guessing the mean would. ';
    }
    if (simple) {
      var dir = r.slope > 0 ? 'higher' : 'lower';
      s += 'Holding nothing else constant, each extra unit of ' + cfg.xs[0] + ' is associated with a ' + Stats.fmt(Math.abs(r.slope)) + ' point ' + dir + ' value of ' + cfg.y + '. ';
      s += r.pSlope < cfg.alpha
        ? 'That relationship is statistically significant, so ' + cfg.xs[0] + ' is a useful predictor.'
        : 'That relationship is not statistically significant (' + Stats.fmtPBare(r.pSlope) + '), so it does not add reliable predictive power. ';
    } else {
      var strong = r.coefs.filter(function (c, i) { return i > 0 && c.p < cfg.alpha; });
      s += strong.length
        ? 'The significant predictor' + (strong.length === 1 ? ' is ' : 's are ') + strong.map(function (c) { return c.label; }).join(', ') + '; the others do not add reliable predictive power once these are accounted for. '
        : 'No individual predictor reaches significance, so the predictors do not reliably explain ' + cfg.y + ' on their own. ';
    }
    s += 'Remember that a significant association does not establish cause.';
    return s.trim();
  }

  global.RegressionController = { render: render };
})(window);
