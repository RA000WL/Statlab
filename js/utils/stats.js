/* ==========================================================================
   StatLab — js/utils/stats.js
   Pure statistical computation. No DOM access anywhere in this file.
   Depends on the global `jStat` (loaded from CDN before this script).
   Every formula follows the standard reference implementation so that
   results line up with SPSS / JASP / R to three decimals.
   ========================================================================== */
(function (global) {
  'use strict';

  var jStat = global.jStat;

  /* ---------------------------------------------------------------- utils */

  var DASH = '\u2014';

  function isNum(v) {
    return typeof v === 'number' && isFinite(v);
  }

  /** Keep only usable numbers, preserving order. */
  function clean(arr) {
    var out = [];
    for (var i = 0; i < arr.length; i++) if (isNum(arr[i])) out.push(arr[i]);
    return out;
  }

  function sum(a) {
    var s = 0;
    for (var i = 0; i < a.length; i++) s += a[i];
    return s;
  }

  function mean(a) {
    return a.length ? sum(a) / a.length : NaN;
  }

  function asc(x, y) { return x - y; }

  function sorted(a) {
    return a.slice().sort(asc);
  }

  /** Type-7 quantile (linear interpolation) — matches R's default. */
  function quantileSorted(s, q) {
    var n = s.length;
    if (n === 0) return NaN;
    if (n === 1) return s[0];
    var h = (n - 1) * q;
    var lo = Math.floor(h), hi = Math.ceil(h);
    return s[lo] + (h - lo) * (s[hi] - s[lo]);
  }

  function quantile(a, q) { return quantileSorted(sorted(a), q); }

  function median(a) { return quantile(a, 0.5); }

  function min(a) { return a.length ? Math.min.apply(null, a) : NaN; }
  function max(a) { return a.length ? Math.max.apply(null, a) : NaN; }
  function range(a) { return a.length ? max(a) - min(a) : NaN; }

  function variance(a) {
    var n = a.length;
    if (n < 2) return NaN;
    var m = mean(a), s = 0;
    for (var i = 0; i < n; i++) { var d = a[i] - m; s += d * d; }
    return s / (n - 1);
  }

  function std(a) { return Math.sqrt(variance(a)); }
  function sem(a) { return std(a) / Math.sqrt(a.length); }
  function iqr(a) { return quantile(a, 0.75) - quantile(a, 0.25); }

  /** Every value occurring the most often. [] when all values are unique. */
  function mode(a) {
    if (!a.length) return [];
    var counts = Object.create(null);
    var best = 0;
    for (var i = 0; i < a.length; i++) {
      var k = a[i];
      counts[k] = (counts[k] || 0) + 1;
      if (counts[k] > best) best = counts[k];
    }
    if (best === 1) return [];
    var out = [];
    for (var key in counts) if (counts[key] === best) out.push(Number(key));
    return out.sort(asc);
  }

  /** Adjusted Fisher-Pearson skewness (G1). 0 for a symmetric sample. */
  function skewness(a) {
    var n = a.length;
    if (n < 3) return NaN;
    var m = mean(a), s = std(a);
    if (!s) return 0;
    var m3 = 0;
    for (var i = 0; i < n; i++) m3 += Math.pow((a[i] - m) / s, 3);
    m3 /= n;
    return Math.sqrt(n * (n - 1)) / (n - 2) * m3;
  }

  /** Adjusted excess kurtosis (G2). 0 for a normal sample. */
  function kurtosis(a) {
    var n = a.length;
    if (n < 4) return NaN;
    var m = mean(a), s = std(a);
    if (!s) return 0;
    var m4 = 0;
    for (var i = 0; i < n; i++) m4 += Math.pow((a[i] - m) / s, 4);
    m4 /= n;
    var g2 = m4 - 3;
    return (n - 1) / ((n - 2) * (n - 3)) * ((n + 1) * g2 + 6);
  }

  /** 95% confidence interval for the mean (Student-t). */
  function meanCI(a, level) {
    var n = a.length;
    if (n < 2) return [NaN, NaN];
    level = level || 0.95;
    var se = sem(a);
    var tc = jStat.studentt.inv(1 - (1 - level) / 2, n - 1);
    var m = mean(a);
    return [m - tc * se, m + tc * se];
  }

  /* ------------------------------------------------ normality (K^2 test) */
  /* D'Agostino & Pearson (1973). K^2 = Z1^2 + Z2^2 ~ chi-square(2),
     combining the skewness and kurtosis tests. Requires n >= 8.        */
  function dAgostinoPearson(a) {
    var n = a.length;
    if (n < 8) {
      return { applicable: false, n: n, reason: 'Needs at least 8 observations.' };
    }
    var m = mean(a), m2 = 0, m3 = 0, m4 = 0;
    for (var i = 0; i < n; i++) {
      var d = a[i] - m;
      m2 += d * d; m3 += d * d * d; m4 += d * d * d * d;
    }
    m2 /= n; m3 /= n; m4 /= n;

    var b1 = m3 / Math.pow(m2, 1.5);   // biased skewness
    var b2 = m4 / (m2 * m2);           // biased kurtosis (Pearson, normal = 3)

    // --- Z1: skewness
    var y = b1 * Math.sqrt(((n + 1) * (n + 3)) / (6 * (n - 2)));
    var beta2 = 3 * (n * n + 27 * n - 70) * (n + 1) * (n + 3) /
                ((n - 2) * (n + 5) * (n + 7) * (n + 9));
    var W2 = -1 + Math.sqrt(2 * (beta2 - 1));
    var delta = 1 / Math.sqrt(0.5 * Math.log(W2));
    var alpha = Math.sqrt(2 / (W2 - 1));
    if (y === 0) y = 1;
    var Z1 = delta * Math.log(y / alpha + Math.sqrt(Math.pow(y / alpha, 2) + 1));

    // --- Z2: kurtosis
    var E = 3 * (n - 1) / (n + 1);
    var varb2 = 24 * n * (n - 2) * (n - 3) /
                ((n + 1) * (n + 1) * (n + 3) * (n + 5));
    var xx = (b2 - E) / Math.sqrt(varb2);
    var sqrtbeta1 = 6 * (n * n - 5 * n + 2) / ((n + 7) * (n + 9)) *
                    Math.sqrt(6 * (n + 3) * (n + 5) / (n * (n - 2) * (n - 3)));
    var A = 6 + 8 / sqrtbeta1 * (2 / sqrtbeta1 +
                  Math.sqrt(1 + 4 / (sqrtbeta1 * sqrtbeta1)));
    var term1 = 1 - 2 / (9 * A);
    var denom = 1 + xx * Math.sqrt(2 / (A - 4));
    var term2 = Math.sign(denom) * Math.cbrt((1 - 2 / A) / Math.abs(denom));
    var Z2 = (term1 - term2) / Math.sqrt(2 / (9 * A));

    var K2 = Z1 * Z1 + Z2 * Z2;
    return {
      applicable: true,
      n: n, K2: K2,
      p: 1 - jStat.chisquare.cdf(K2, 2),
      Z1: Z1, Z2: Z2,
      skewness: b1, kurtosis: b2 - 3
    };
  }

  /* ------------------------------------------------------- normal helpers */

  function normPdf(z) { return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI); }
  function normCdf(z) { return jStat.normal.cdf(z, 0, 1); }
  function normInv(p) { return jStat.normal.inv(p, 0, 1); }
  function tanh(z) { var e = Math.exp(2 * z); return (e - 1) / (e + 1); }

  /** Composite Simpson's rule on [a, b] with n (even) subintervals. */
  function simpson(f, a, b, n) {
    var h = (b - a) / n, s = f(a) + f(b), i;
    for (i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * f(a + i * h);
    return s * h / 3;
  }

  /* ------------------------------------------- studentized range (Tukey) */
  /* The range R of k iid N(0,1) variables has density
       f_R(r) = k(k-1) * INT phi(z) phi(z+r) [Phi(z+r) - Phi(z)]^(k-2) dz
     and the studentized range statistic used by Tukey's HSD is Q = R / S
     with S = sqrt(chi2_df / df) independent of R. Both integrals below are
     evaluated numerically, which keeps the p-values exact enough to match
     published critical values to four decimals.                        */

  /* The direct integral for P(range > r) is smooth in r but would be far too
     slow to re-evaluate at every node of the studentized-range quadrature
     below. Instead each k gets a table of P(range <= r) on a 0.01 grid,
     computed once on first use and then linearly interpolated. */
  var RANGE_STEP = 0.01;
  var RANGE_MAX = 8;
  var _rangeTables = Object.create(null);

  function buildRangeTable(k) {
    var n = Math.round(RANGE_MAX / RANGE_STEP) + 1;
    var t = new Float64Array(n + 1);
    /* P(range > r): condition on the minimum sitting at x (unique a.s., so
       summing over which variable attains it counts each outcome once), then
       subtract the cases where every other value also falls inside [x, x+r).
         P(R > r) = k INT phi(x) [ Q(x)^(k-1) - (Phi(x+r) - Phi(x))^(k-1) ] dx
       Dropping the second term is the intuitive shortcut but it is wrong: it
       double counts whenever the minimum is not the only value below x+r. */
    var f = function (x, r) {
      var p = normPdf(x);
      if (p < 1e-15) return 0;
      var q = 1 - normCdf(x);
      var inside = normCdf(x + r) - normCdf(x);
      if (inside < 0) inside = 0;
      var tail = Math.pow(q, k - 1) - Math.pow(inside, k - 1);
      return p * (tail > 0 ? tail : 0);
    };
    for (var i = 0; i <= n; i++) {
      var r = i * RANGE_STEP;
      if (r === 0) { t[0] = 0; continue; }
      t[i] = Math.max(0, Math.min(1, 1 - k * simpson(function (x) { return f(x, r); }, -13, 13, 300)));
    }
    _rangeTables[k] = t;
    return t;
  }

  function rangeTable(k) {
    return _rangeTables[k] || buildRangeTable(k);
  }

  function rangeCDFGeneral(r, k) {
    if (!(r > 0)) return 0;
    if (r >= RANGE_MAX) return 1;
    var t = rangeTable(k);
    var pos = r / RANGE_STEP;
    var lo = Math.floor(pos);
    var frac = pos - lo;
    if (lo >= t.length - 1) return t[t.length - 1];
    return t[lo] + (t[lo + 1] - t[lo]) * frac;
  }

  /** Closed form for k = 2: P(|Z1 - Z2| <= r). Acts as a fast path and as the
      reference the general integrator is checked against in testing. */
  function rangeCDFClosed(r, k) {
    if (!(r > 0)) return 0;
    if (k === 2) return Math.max(0, Math.min(1, 2 * normCdf(r / Math.SQRT2) - 1));
    return rangeCDFGeneral(r, k);
  }

  function rangeCDF(r, k) {
    if (k === 2) return rangeCDFClosed(r, k);   // closed form, no table needed
    return rangeCDFGeneral(r, k);                // interpolated from the k table
  }

  /* Memoised on a Map with a hit counter rather than by measuring the cache
     size with Object.keys() on every call, which turns a hot path into O(n). */
  var _srqCache = new Map();
  function studentizedRangeP(q, k, df) {
    if (!(q > 0)) return 1;
    if (k < 2 || df < 1) return NaN;
    var key = k + '|' + df + '|' + Math.round(q * 1e5);
    var hit = _srqCache.get(key);
    if (hit !== undefined) return hit;

    var scale = Math.sqrt(2 * df);
    var gln = jStat.gammaln(df / 2);
    // Integrate over the chi-square variate standardised to mean 0 / sd 1 so
    // the integrand stays O(1) even when df is in the thousands.
    var f = function (t) {
      var v = df + t * scale;
      if (v <= 0) return 0;
      var lpdf = (df / 2 - 1) * Math.log(v) - v / 2 - (df / 2) * Math.LN2 - gln;
      if (lpdf < -700) return 0;
      return Math.exp(lpdf) * scale * rangeCDF(q * Math.sqrt(v / df), k);
    };
    var cdf = Math.max(0, Math.min(1, simpson(f, -10, 10, 120)));
    var p = Math.max(0, 1 - cdf);
    if (_srqCache.size > 50000) _srqCache.clear();
    _srqCache.set(key, p);
    return p;
  }

  var _critCache = new Map();
  function studentizedRangeCrit(k, df, alpha) {
    var key = k + '|' + df + '|' + alpha;
    if (_critCache.has(key)) return _critCache.get(key);
    /* The critical value solves P(Q > q) = alpha, so the root is where the
       decreasing P crosses alpha. Bracket by growing hi until P has fallen to
       alpha, then bisect: P(mid) > alpha means mid sits below the root. */
    var target = alpha;
    var lo = 0, hi = 0.5, guard = 0;
    while (studentizedRangeP(hi, k, df) > target && hi < 200 && guard++ < 40) hi *= 1.5;
    for (var i = 0; i < 40; i++) {
      var mid = (lo + hi) / 2;
      // P decreases with q, so P(mid) > alpha puts the root above mid.
      if (studentizedRangeP(mid, k, df) > target) lo = mid; else hi = mid;
    }
    var v = (lo + hi) / 2;
    _critCache.set(key, v);
    return v;
  }

  /* -------------------------------------------------------------- ranks  */

  /** Average ranks, so tied values share the midpoint of their rank block. */
  function rank(a) {
    var idx = a.map(function (v, i) { return [v, i]; }).sort(function (p, q) { return p[0] - q[0]; });
    var r = new Array(a.length), i = 0;
    while (i < idx.length) {
      var j = i;
      while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
      var avg = (i + j) / 2 + 1;
      for (var k = i; k <= j; k++) r[idx[k][1]] = avg;
      i = j + 1;
    }
    return r;
  }

  /* -------------------------------------------------------- correlation  */

  function pearsonR(x, y) {
    var n = Math.min(x.length, y.length);
    if (n < 3) return NaN;
    var mx = mean(x.slice(0, n)), my = mean(y.slice(0, n));
    var sxy = 0, sxx = 0, syy = 0;
    for (var i = 0; i < n; i++) {
      var dx = x[i] - mx, dy = y[i] - my;
      sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
    }
    if (sxx === 0 || syy === 0) return NaN;
    return sxy / Math.sqrt(sxx * syy);
  }

  function spearmanRho(x, y) {
    var n = Math.min(x.length, y.length);
    if (n < 3) return NaN;
    return pearsonR(rank(x.slice(0, n)), rank(y.slice(0, n)));
  }

  /** Two-sided p-value for a correlation coefficient. */
  function corrP(r, n) {
    if (!isNum(r) || n <= 2) return NaN;
    if (Math.abs(r) >= 1) return 0;
    var t = r * Math.sqrt((n - 2) / (1 - r * r));
    return 2 * (1 - jStat.studentt.cdf(Math.abs(t), n - 2));
  }

  /** Fisher z confidence interval for a correlation coefficient. */
  function corrCI(r, n, level) {
    level = level || 0.95;
    if (!isNum(r) || n <= 3 || Math.abs(r) >= 1) return null;
    var z = 0.5 * Math.log((1 + r) / (1 - r));
    var se = 1 / Math.sqrt(n - 3);
    var zc = normInv(1 - (1 - level) / 2);
    return [tanh(z - zc * se), tanh(z + zc * se)];
  }

  /** Cohen's benchmarks, so results can be read without a lookup table. */
  function rLabel(r) {
    var a = Math.abs(r);
    if (a >= 0.9) return 'very strong';
    if (a >= 0.7) return 'strong';
    if (a >= 0.5) return 'moderate';
    if (a >= 0.3) return 'small';
    if (a >= 0.1) return 'very small';
    return 'negligible';
  }

  function dLabel(d) {
    var a = Math.abs(d);
    if (a >= 0.8) return 'large';
    if (a >= 0.5) return 'medium';
    if (a >= 0.2) return 'small';
    return 'negligible';
  }

  function etaLabel(e) {
    if (e >= 0.14) return 'large';
    if (e >= 0.06) return 'medium';
    if (e >= 0.01) return 'small';
    return 'negligible';
  }

  function vLabel(v) {
    if (v >= 0.6) return 'strong';
    if (v >= 0.4) return 'moderate';
    if (v >= 0.2) return 'weak';
    return 'very weak';
  }

  /* --------------------------------------------------------- t-tests      */

  function independentT(a, b, equalVariances) {
    var n1 = a.length, n2 = b.length;
    if (n1 < 2 || n2 < 2) return null;
    var m1 = mean(a), m2 = mean(b), v1 = variance(a), v2 = variance(b);
    var se, df, t;
    if (equalVariances) {
      df = n1 + n2 - 2;
      var sp2 = ((n1 - 1) * v1 + (n2 - 1) * v2) / df;
      se = Math.sqrt(sp2 * (1 / n1 + 1 / n2));
    } else {
      se = Math.sqrt(v1 / n1 + v2 / n2);
      var top = Math.pow(v1 / n1 + v2 / n2, 2);
      var bot = (v1 * v1) / (n1 * n1 * (n1 - 1)) + (v2 * v2) / (n2 * n2 * (n2 - 1));
      df = bot > 0 ? top / bot : n1 + n2 - 2;
    }
    t = se > 0 ? (m1 - m2) / se : 0;
    var p = 2 * (1 - jStat.studentt.cdf(Math.abs(t), df));
    var tc = jStat.studentt.inv(0.975, df);
    return {
      t: t, df: df, p: p, se: se,
      mean1: m1, mean2: m2, diff: m1 - m2,
      sd1: Math.sqrt(v1), sd2: Math.sqrt(v2),
      n1: n1, n2: n2,
      ci: [m1 - m2 - tc * se, m1 - m2 + tc * se],
      pooled: !!equalVariances
    };
  }

  function pairedT(a, b) {
    var n = Math.min(a.length, b.length);
    var d = [], before = [], after = [];
    for (var i = 0; i < n; i++) {
      if (isNum(a[i]) && isNum(b[i])) { before.push(a[i]); after.push(b[i]); d.push(a[i] - b[i]); }
    }
    if (d.length < 2) return null;
    var md = mean(d), vd = variance(d);
    var se = Math.sqrt(vd / d.length);
    var t = se > 0 ? md / se : 0;
    var df = d.length - 1;
    var p = 2 * (1 - jStat.studentt.cdf(Math.abs(t), df));
    var tc = jStat.studentt.inv(0.975, df);
    return {
      t: t, df: df, p: p, se: se,
      meanDiff: md, sdDiff: Math.sqrt(vd),
      meanBefore: mean(before), meanAfter: mean(after),
      ci: [md - tc * se, md + tc * se],
      n: d.length, diffs: d, before: before, after: after,
      dropped: n - d.length
    };
  }

  function cohensD(a, b) {
    var n1 = a.length, n2 = b.length;
    if (n1 < 2 || n2 < 2) return NaN;
    var sp = Math.sqrt(((n1 - 1) * variance(a) + (n2 - 1) * variance(b)) / (n1 + n2 - 2));
    if (!sp) return 0;
    return (mean(a) - mean(b)) / sp;
  }

  function hedgesG(a, b) {
    var d = cohensD(a, b), n1 = a.length, n2 = b.length;
    if (!isNum(d)) return NaN;
    return d * (1 - 3 / (4 * (n1 + n2) - 9));
  }

  /** Approximate 95% CI for Cohen's d (Cooper / Hedges approximation). */
  function dCI(d, n1, n2) {
    if (!isNum(d) || n1 < 2 || n2 < 2) return null;
    var se = Math.sqrt((n1 + n2) / (n1 * n2) + (d * d) / (2 * (n1 + n2)));
    return [d - 1.959964 * se, d + 1.959964 * se];
  }

  /** Brown-Forsythe form of Levene's test (median-centred, more robust). */
  function leveneTest(groups) {
    var gs = [];
    for (var g = 0; g < groups.length; g++) if (groups[g].length) gs.push(groups[g]);
    var k = gs.length;
    if (k < 2) return null;
    var meds = gs.map(median);
    var z = gs.map(function (grp, i) { return grp.map(function (v) { return Math.abs(v - meds[i]); }); });
    var all = [].concat.apply([], z);
    var N = all.length;
    if (N - k < 1) return null;
    var grand = mean(all), ssb = 0, ssw = 0;
    z.forEach(function (arr) {
      var m = mean(arr);
      ssb += arr.length * Math.pow(m - grand, 2);
      arr.forEach(function (v) { ssw += Math.pow(v - m, 2); });
    });
    var df1 = k - 1, df2 = N - k;
    if (ssw <= 0) return { F: 0, df1: df1, df2: df2, p: 1, equal: true };
    var F = (ssb / df1) / (ssw / df2);
    return { F: F, df1: df1, df2: df2, p: 1 - jStat.centralF.cdf(F, df1, df2), equal: false };
  }

  /* ------------------------------------------------------------- ANOVA    */

  function oneWayAnova(groups) {
    var gs = [];
    for (var g = 0; g < groups.length; g++) if (groups[g].length) gs.push(groups[g]);
    var k = gs.length;
    if (k < 2) return null;
    var all = [].concat.apply([], gs);
    var N = all.length;
    if (N - k < 1) return null;
    var grand = mean(all);
    var ssb = 0, ssw = 0, means = [];
    gs.forEach(function (arr) {
      var m = mean(arr);
      means.push(m);
      ssb += arr.length * Math.pow(m - grand, 2);
      arr.forEach(function (v) { ssw += Math.pow(v - m, 2); });
    });
    var df1 = k - 1, df2 = N - k;
    var msb = ssb / df1, msw = ssw / df2;
    var F = msw > 0 ? msb / msw : 0;
    var p = 1 - jStat.centralF.cdf(F, df1, df2);
    var ssTot = ssb + ssw;
    var etaSq = ssTot > 0 ? ssb / ssTot : 0;
    var omegaSq = Math.max(0, (ssb - (k - 1) * msw) / (ssTot + msw));
    return {
      F: F, df1: df1, df2: df2, p: p,
      ssBetween: ssb, ssWithin: ssw, ssTotal: ssTot,
      msBetween: msb, msWithin: msw,
      grandMean: grand, means: means,
      ns: gs.map(function (a2) { return a2.length; }),
      sds: gs.map(std), groups: gs,
      n: N, k: k,
      etaSq: etaSq, omegaSq: omegaSq,
      etaSqCI: etaSqCI(etaSq, df1, N)
    };
  }

  function etaSqCI(etaSq, df1, n) {
    var se = Math.sqrt(2 * (1 - etaSq) * etaSq * etaSq / (df1 * (n - 1)));
    return [Math.max(0, etaSq - 1.959964 * se), Math.min(1, etaSq + 1.959964 * se)];
  }

  function tukeyHSD(groups, alpha) {
    alpha = alpha || 0.05;
    var gs = [];
    for (var g = 0; g < groups.length; g++) if (groups[g].length) gs.push(groups[g]);
    var k = gs.length;
    if (k < 2) return null;
    var all = [].concat.apply([], gs);
    var N = all.length;
    var df = N - k;
    if (df < 1) return null;
    var grand = mean(all);
    var ssw = 0;
    gs.forEach(function (arr) {
      var m = mean(arr);
      arr.forEach(function (v) { ssw += Math.pow(v - m, 2); });
    });
    var mse = ssw / df;
    var means = gs.map(mean), ns = gs.map(function (a2) { return a2.length; });
    var crit = studentizedRangeCrit(k, df, alpha);
    var pairs = [];
    for (var i = 0; i < k; i++) {
      for (var j = i + 1; j < k; j++) {
        var diff = means[i] - means[j];
        var se = Math.sqrt(mse * (1 / ns[i] + 1 / ns[j]));
        var q = se > 0 ? Math.abs(diff) / se : 0;
        var p = studentizedRangeP(q, k, df);
        pairs.push({
          i: i, j: j, meanDiff: diff, se: se, q: q, p: p,
          ci: [diff - crit * se, diff + crit * se],
          significant: p < alpha
        });
      }
    }
    return { mse: mse, df: df, k: k, crit: crit, alpha: alpha, means: means, ns: ns, pairs: pairs };
  }

  /* ------------------------------------------------------------ chi-square */

  function chiSquareIndependence(table) {
    var R = table.length, C = table[0].length;
    if (R < 2 || C < 2) return null;
    var rowT = [], colT = new Array(C), i, j;
    for (i = 0; i < R; i++) { var s = 0; for (j = 0; j < C; j++) s += table[i][j]; rowT.push(s); }
    for (j = 0; j < C; j++) { var s2 = 0; for (i = 0; i < R; i++) s2 += table[i][j]; colT[j] = s2; }
    var N = rowT.reduce(function (a, b) { return a + b; }, 0);
    if (N === 0) return null;

    var expected = [], chi2 = 0, minExp = Infinity, below5 = 0, cells = 0;
    for (i = 0; i < R; i++) {
      expected.push([]);
      for (j = 0; j < C; j++) {
        var e = rowT[i] * colT[j] / N;
        expected[i].push(e);
        if (e > 0) {
          cells++;
          if (e < minExp) minExp = e;
          if (e < 5) below5++;
          chi2 += Math.pow(table[i][j] - e, 2) / e;
        }
      }
    }
    var df = (R - 1) * (C - 1);
    var p = 1 - jStat.chisquare.cdf(chi2, df);
    var V = Math.sqrt(chi2 / (N * Math.min(R - 1, C - 1)));
    return {
      chi2: chi2, df: df, p: p, N: N,
      expected: expected, rowTotals: rowT, colTotals: colT,
      cramersV: V, minExpected: cells ? minExp : NaN,
      cellsBelow5: below5, totalCells: cells,
      rows: R, cols: C
    };
  }

  /* ---------------------------------------------------------- regression  */

  /** Gauss-Jordan elimination with partial pivoting. null when singular. */
  function invertMatrix(m) {
    var n = m.length, i, j, col, row;
    var a = m.map(function (r, ri) { return r.concat(Array.apply(null, Array(n)).map(function (_, j2) { return ri === j2 ? 1 : 0; })); });
    for (col = 0; col < n; col++) {
      var maxRow = col;
      for (row = col + 1; row < n; row++) {
        if (Math.abs(a[row][col]) > Math.abs(a[maxRow][col])) maxRow = row;
      }
      if (Math.abs(a[maxRow][col]) < 1e-12) return null;
      var tmp = a[col]; a[col] = a[maxRow]; a[maxRow] = tmp;
      var pivot = a[col][col];
      for (j = 0; j < 2 * n; j++) a[col][j] /= pivot;
      for (row = 0; row < n; row++) {
        if (row === col) continue;
        var f = a[row][col];
        if (f === 0) continue;
        for (j = 0; j < 2 * n; j++) a[row][j] -= f * a[col][j];
      }
    }
    return a.map(function (r) { return r.slice(n); });
  }

  function rSquaredCI(r2, n) {
    if (!isNum(r2) || n <= 3) return null;
    var r = Math.sqrt(Math.max(0, Math.min(1, r2)));
    var ci = corrCI(r, n);
    if (!ci) return null;
    /* Square the endpoints of the r interval. When the lower endpoint is
       negative it carries no information about |r|, so the R-squared interval
       starts at 0 rather than at the square of that negative number. */
    return [ci[0] <= 0 ? 0 : ci[0] * ci[0], Math.min(1, ci[1] * ci[1])];
  }

  /** Pairs of (x, y) where both cells are usable numbers. */
  function pairUp(x, y) {
    var n = Math.min(x.length, y.length), out = [];
    for (var i = 0; i < n; i++) if (isNum(x[i]) && isNum(y[i])) out.push([x[i], y[i]]);
    return out;
  }

  function simpleRegression(x, y) {
    var pairs = pairUp(x, y);
    var m = pairs.length;
    if (m < 3) return null;
    var mx = mean(pairs.map(function (p) { return p[0]; }));
    var my = mean(pairs.map(function (p) { return p[1]; }));
    var sxy = 0, sxx = 0, syy = 0, i;
    for (i = 0; i < m; i++) {
      var dx = pairs[i][0] - mx, dy = pairs[i][1] - my;
      sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
    }
    if (sxx === 0) return null;
    var b1 = sxy / sxx, b0 = my - b1 * mx;
    var ssRes = 0, fitted = [];
    for (i = 0; i < m; i++) {
      var yh = b0 + b1 * pairs[i][0];
      fitted.push(yh);
      ssRes += Math.pow(pairs[i][1] - yh, 2);
    }
    var ssTot = syy;
    var r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
    var df = m - 2;
    var mse = ssRes / df;
    var seB1 = Math.sqrt(mse / sxx);
    var t1 = seB1 > 0 ? b1 / seB1 : 0;
    var F = (1 - r2) > 0 ? (r2 / (1 - r2)) * df : 0;
    return {
      intercept: b0, slope: b1,
      seIntercept: Math.sqrt(mse * (1 / m + mx * mx / sxx)), seSlope: seB1,
      tIntercept: (mse * (1 / m + mx * mx / sxx)) > 0 ? b0 / Math.sqrt(mse * (1 / m + mx * mx / sxx)) : 0,
      t: t1,
      pSlope: 2 * (1 - jStat.studentt.cdf(Math.abs(t1), df)),
      pIntercept: 2 * (1 - jStat.studentt.cdf(Math.abs(b0 / Math.sqrt(mse * (1 / m + mx * mx / sxx))), df)),
      r: pearsonR(pairs.map(function (p) { return p[0]; }), pairs.map(function (p) { return p[1]; })),
      rSquared: r2,
      adjR2: 1 - (1 - r2) * (m - 1) / df,
      r2CI: rSquaredCI(r2, m),
      seEstimate: Math.sqrt(mse),
      F: F, modelP: 1 - jStat.centralF.cdf(F, 1, df),
      n: m, df: df,
      ssRes: ssRes, ssTot: ssTot, msRes: mse,
      x: pairs.map(function (p) { return p[0]; }),
      y: pairs.map(function (p) { return p[1]; }),
      fitted: fitted,
      dropped: Math.min(x.length, y.length) - m
    };
  }

  /**
   * Multiple linear regression by ordinary least squares.
   * X: array of rows, each an array of continuous predictors (no intercept).
   */
  function multipleRegression(X, y, labels) {
    if (!X.length) return null;
    var p = X[0].length;
    var rows = [], i, j;
    for (i = 0; i < y.length; i++) {
      var row = X[i];
      if (!row || row.length !== p || !isNum(y[i])) continue;
      var ok = true;
      for (j = 0; j < p; j++) if (!isNum(row[j])) { ok = false; break; }
      if (ok) rows.push([1].concat(row, [y[i]]));
    }
    var m = rows.length;
    if (m <= p + 1) return null;

    // Each row is [1, x1..xp, y], so the outcome sits at column p + 1.
    var yIdx = p + 1;
    var A = [], b = [];
    for (i = 0; i <= p; i++) {
      A.push([]);
      for (j = 0; j <= p; j++) {
        var s = 0;
        for (var r = 0; r < m; r++) s += rows[r][i] * rows[r][j];
        A[i].push(s);
      }
      var s2 = 0;
      for (r = 0; r < m; r++) s2 += rows[r][i] * rows[r][yIdx];
      b.push(s2);
    }
    var inv = invertMatrix(A);
    if (!inv) return null;

    var beta = [];
    for (i = 0; i <= p; i++) {
      var s3 = 0;
      for (j = 0; j <= p; j++) s3 += inv[i][j] * b[j];
      beta.push(s3);
    }

    var ys = rows.map(function (r2) { return r2[yIdx]; });
    var ybar = mean(ys);
    var ssRes = 0, fitted = [], residuals = [];
    rows.forEach(function (r2) {
      var yh = 0;
      for (var k = 0; k <= p; k++) yh += beta[k] * r2[k];
      fitted.push(yh);
      residuals.push(r2[yIdx] - yh);
      ssRes += Math.pow(r2[yIdx] - yh, 2);
    });
    var ssTot = 0;
    ys.forEach(function (v) { ssTot += Math.pow(v - ybar, 2); });

    var dfRes = m - p - 1, dfMod = p;
    var r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
    var msRes = ssRes / dfRes;
    var msModel = (ssTot - ssRes) / dfMod;
    var F = msRes > 0 ? msModel / msRes : 0;
    var modelP = 1 - jStat.centralF.cdf(F, dfMod, dfRes);

    // Standardised betas: b_k * sd(X_k) / sd(y), so predictors measured on
    // different scales can be compared directly.
    var ysd = std(ys);
    var xsd = [];
    for (var c = 0; c < p; c++) {
      var colVals = rows.map(function (r2) { return r2[c + 1]; });
      xsd.push(std(colVals));
    }

    var names = ['(Constant)'].concat(labels || []);
    var coefs = beta.map(function (bi, k) {
      var se = Math.sqrt(msRes * inv[k][k]);
      var t = se > 0 ? bi / se : 0;
      return {
        label: names[k] || ('X' + k), b: bi, se: se, t: t,
        p: 2 * (1 - jStat.studentt.cdf(Math.abs(t), dfRes)),
        betaStd: k === 0 || !xsd[k - 1] || !ysd ? NaN : bi * xsd[k - 1] / ysd
      };
    });

    return {
      coefs: coefs, rSquared: r2,
      adjR2: 1 - (1 - r2) * (m - 1) / dfRes,
      r2CI: rSquaredCI(r2, m),
      F: F, df1: dfMod, df2: dfRes, modelP: modelP,
      n: m, p: p,
      ssRes: ssRes, ssTot: ssTot, ssModel: ssTot - ssRes,
      msRes: msRes, msModel: msModel,
      seEstimate: Math.sqrt(msRes),
      y: ys, fitted: fitted, residuals: residuals,
      dropped: y.length - m,
      vifs: vifList(X, p)
    };
  }

  /** Variance inflation factor for each predictor column of X. */
  function vifList(X, p) {
    var out = [];
    for (var j = 0; j < p; j++) {
      var others = X.map(function (row) { return row.filter(function (_, k) { return k !== j; }); });
      if (!others[0].length) { out.push(1); continue; }
      var target = X.map(function (row) { return row[j]; });
      var res = multipleRegression(others, target, []);
      var v = res && res.rSquared < 1 ? 1 / (1 - res.rSquared) : NaN;
      out.push(v);
    }
    return out;
  }

  /* ---------------------------------------------------------- formatting  */

  function fmt(x, d) {
    if (typeof x !== 'number' || !isFinite(x)) return DASH;
    return x.toFixed(d === undefined ? 3 : d);
  }

  /** APA-style p-value: no leading zero, "< .001" for very small values. */
  function fmtP(p) {
    if (typeof p !== 'number' || !isFinite(p)) return DASH;
    if (p < 0.001) return '< .001';
    var s = p.toFixed(3);
    if (s.indexOf('0.') === 0) s = s.slice(1);
    return s;
  }

  /**
   * A p-value ready to follow "p": "p < .001" or "p = .042". Using fmtP
   * directly after an "=" would produce the nonsensical "p = < .001".
   */
  function fmtPWith(p) {
    if (typeof p !== 'number' || !isFinite(p)) return DASH;
    return (p < 0.001 ? 'p < .001' : 'p = ' + p.toFixed(3).replace(/^0/, '')) + stars(p);
  }

  /** As fmtPWith but without the significance stars, for running prose. */
  function fmtPBare(p) {
    if (typeof p !== 'number' || !isFinite(p)) return DASH;
    return p < 0.001 ? 'p < .001' : 'p = ' + p.toFixed(3).replace(/^0/, '');
  }

  function stars(p) {
    if (typeof p !== 'number' || !isFinite(p)) return '';
    return p < 0.001 ? '***' : p < 0.01 ? '**' : p < 0.05 ? '*' : '';
  }

  function verdict(p, alpha) {
    alpha = alpha || 0.05;
    if (typeof p !== 'number' || !isFinite(p)) return { text: 'Not enough data to test', state: 'none' };
    if (p < alpha) return { text: 'Statistically significant', state: 'yes' };
    return { text: 'Not statistically significant', state: 'no' };
  }

  global.Stats = {
    // helpers
    isNum: isNum, clean: clean, sum: sum, mean: mean, sorted: sorted,
    quantile: quantile, median: median, min: min, max: max, range: range,
    variance: variance, std: std, sem: sem, iqr: iqr, mode: mode,
    skewness: skewness, kurtosis: kurtosis, meanCI: meanCI, rank: rank,
    // distributions
    normPdf: normPdf, normCdf: normCdf, normInv: normInv, simpson: simpson,
    rangeCDF: rangeCDF, rangeCDFGeneral: rangeCDFGeneral, rangeCDFClosed: rangeCDFClosed,
    studentizedRangeP: studentizedRangeP, studentizedRangeCrit: studentizedRangeCrit,
    // analysis
    dAgostinoPearson: dAgostinoPearson,
    pearsonR: pearsonR, spearmanRho: spearmanRho, corrP: corrP, corrCI: corrCI,
    independentT: independentT, pairedT: pairedT, cohensD: cohensD, hedgesG: hedgesG,
    dCI: dCI, leveneTest: leveneTest,
    oneWayAnova: oneWayAnova, tukeyHSD: tukeyHSD, etaSqCI: etaSqCI,
    chiSquareIndependence: chiSquareIndependence,
    simpleRegression: simpleRegression, multipleRegression: multipleRegression,
    invertMatrix: invertMatrix, rSquaredCI: rSquaredCI,
    // labels + formatting
    rLabel: rLabel, dLabel: dLabel, etaLabel: etaLabel, vLabel: vLabel,
    fmt: fmt, fmtP: fmtP, fmtPWith: fmtPWith, fmtPBare: fmtPBare,
    stars: stars, verdict: verdict, DASH: DASH
  };
})(typeof window !== 'undefined' ? window : globalThis);
