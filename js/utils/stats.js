const Stats = {
  computeSkewness(arr) {
    const n = arr.length;
    if (n < 3) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / n;
    const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1);
    const s = Math.sqrt(variance);
    if (s === 0) return 0;
    const m3 = arr.reduce((a, b) => a + Math.pow((b - mean) / s, 3), 0);
    return (n / ((n - 1) * (n - 2))) * m3;
  },

  computeKurtosis(arr) {
    const n = arr.length;
    if (n < 4) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / n;
    const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1);
    const s = Math.sqrt(variance);
    if (s === 0) return 0;
    const m4 = arr.reduce((a, b) => a + Math.pow((b - mean) / s, 4), 0);
    return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * m4 -
           (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
  },

  computeMode(arr) {
    const freq = {};
    arr.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
    const maxFreq = Math.max(...Object.values(freq));
    return Object.keys(freq).filter(k => freq[k] === maxFreq).map(Number);
  },

  computeCI95(arr) {
    const n = arr.length;
    if (n === 0) return [0, 0];
    const mean = arr.reduce((a, b) => a + b, 0) / n;
    const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1);
    const se = Math.sqrt(variance / n);
    const tCrit = jStat.studentt.inv(0.975, n - 1);
    return [mean - tCrit * se, mean + tCrit * se];
  },

  cohensD(arr1, arr2) {
    const n1 = arr1.length, n2 = arr2.length;
    if (n1 < 2 || n2 < 2) return 0;
    const mean1 = arr1.reduce((a, b) => a + b, 0) / n1;
    const mean2 = arr2.reduce((a, b) => a + b, 0) / n2;
    const var1 = arr1.reduce((a, b) => a + Math.pow(b - mean1, 2), 0) / (n1 - 1);
    const var2 = arr2.reduce((a, b) => a + Math.pow(b - mean2, 2), 0) / (n2 - 1);
    const pooledSqrt = Math.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2));
    if (pooledSqrt === 0) return 0;
    return Math.abs(mean1 - mean2) / pooledSqrt;
  },

  pooledSD(arr1, arr2) {
    const n1 = arr1.length, n2 = arr2.length;
    if (n1 < 2 || n2 < 2) return 0;
    const mean1 = arr1.reduce((a, b) => a + b, 0) / n1;
    const mean2 = arr2.reduce((a, b) => a + b, 0) / n2;
    const var1 = arr1.reduce((a, b) => a + Math.pow(b - mean1, 2), 0) / (n1 - 1);
    const var2 = arr2.reduce((a, b) => a + Math.pow(b - mean2, 2), 0) / (n2 - 1);
    return Math.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2));
  },

  cramersV(chi2, n, rows, cols) {
    if (n === 0) return 0;
    const k = Math.min(rows, cols) - 1;
    if (k === 0) return 0;
    return Math.sqrt(chi2 / (n * k));
  },

  correlationPValue(r, n) {
    if (n <= 2) return 1;
    const t = r * Math.sqrt((n - 2) / (1 - r * r));
    return 2 * (1 - jStat.studentt.cdf(Math.abs(t), n - 2));
  },

  pearsonR(x, y) {
    const n = x.length;
    if (n < 2) return 0;
    const mx = x.reduce((a, b) => a + b, 0) / n;
    const my = y.reduce((a, b) => a + b, 0) / n;
    let num = 0, dx = 0, dy = 0;
    for (let i = 0; i < n; i++) {
      const xi = x[i] - mx, yi = y[i] - my;
      num += xi * yi;
      dx += xi * xi;
      dy += yi * yi;
    }
    if (dx === 0 || dy === 0) return 0;
    return num / Math.sqrt(dx * dy);
  },

  spearmanRho(x, y) {
    const n = x.length;
    if (n < 2) return 0;
    const rankArr = (arr) => {
      const sorted = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
      const ranks = new Array(n);
      sorted.forEach((item, rank) => { ranks[item.i] = rank + 1; });
      return ranks;
    };
    const rx = rankArr(x);
    const ry = rankArr(y);
    return this.pearsonR(rx, ry);
  },

  tTestIndependent(group1, group2) {
    const n1 = group1.length, n2 = group2.length;
    if (n1 < 2 || n2 < 2) return { t: 0, df: 0, p: 1 };
    const m1 = group1.reduce((a, b) => a + b, 0) / n1;
    const m2 = group2.reduce((a, b) => a + b, 0) / n2;
    const v1 = group1.reduce((a, b) => a + Math.pow(b - m1, 2), 0) / (n1 - 1);
    const v2 = group2.reduce((a, b) => a + Math.pow(b - m2, 2), 0) / (n2 - 1);
    const se = Math.sqrt(v1 / n1 + v2 / n2);
    if (se === 0) return { t: 0, df: n1 + n2 - 2, p: 1 };
    const t = (m1 - m2) / se;
    const df = n1 + n2 - 2;
    const p = 2 * (1 - jStat.studentt.cdf(Math.abs(t), df));
    return { t, df, p };
  },

  tTestPaired(arr1, arr2) {
    const n = arr1.length;
    if (n < 2) return { t: 0, df: 0, p: 1 };
    const diffs = arr1.map((v, i) => v - arr2[i]);
    const meanDiff = diffs.reduce((a, b) => a + b, 0) / n;
    const varDiff = diffs.reduce((a, b) => a + Math.pow(b - meanDiff, 2), 0) / (n - 1);
    const se = Math.sqrt(varDiff / n);
    if (se === 0) return { t: 0, df: n - 1, p: 1 };
    const t = meanDiff / se;
    const df = n - 1;
    const p = 2 * (1 - jStat.studentt.cdf(Math.abs(t), df));
    return { t, df, p, meanDiff };
  },

  anova(groups) {
    const allData = groups.flat();
    const N = allData.length;
    const k = groups.length;
    if (N === 0 || k < 2) return { F: 0, dfBetween: 0, dfWithin: 0, p: 1, etaSq: 0 };
    const grandMean = allData.reduce((a, b) => a + b, 0) / N;
    let ssBetween = 0, ssWithin = 0;
    groups.forEach(group => {
      const n = group.length;
      const mean = group.reduce((a, b) => a + b, 0) / n;
      ssBetween += n * Math.pow(mean - grandMean, 2);
      group.forEach(v => { ssWithin += Math.pow(v - mean, 2); });
    });
    const dfBetween = k - 1;
    const dfWithin = N - k;
    if (dfWithin === 0) return { F: 0, dfBetween, dfWithin: 0, p: 1, etaSq: 0 };
    const msBetween = ssBetween / dfBetween;
    const msWithin = ssWithin / dfWithin;
    const F = msWithin === 0 ? 0 : msBetween / msWithin;
    const p = 1 - jStat.centralF.cdf(F, dfBetween, dfWithin);
    const etaSq = ssBetween / (ssBetween + ssWithin);
    return { F, dfBetween, dfWithin, p, etaSq, ssBetween, ssWithin, msBetween, msWithin };
  },

  chiSquareTest(contingencyTable) {
    const rows = contingencyTable.length;
    const cols = contingencyTable[0].length;
    const n = contingencyTable.flat().reduce((a, b) => a + b, 0);
    if (n === 0) return { chi2: 0, df: 0, p: 1 };
    const rowTotals = contingencyTable.map(row => row.reduce((a, b) => a + b, 0));
    const colTotals = contingencyTable[0].map((_, c) =>
      contingencyTable.reduce((sum, row) => sum + row[c], 0)
    );
    let chi2 = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const expected = (rowTotals[r] * colTotals[c]) / n;
        if (expected > 0) {
          chi2 += Math.pow(contingencyTable[r][c] - expected, 2) / expected;
        }
      }
    }
    const df = (rows - 1) * (cols - 1);
    const p = 1 - jStat.chisquare.cdf(chi2, df);
    return { chi2, df, p, cramersV: this.cramersV(chi2, n, rows, cols) };
  },

  linearRegression(x, y) {
    const n = x.length;
    if (n < 3) return null;
    const mx = x.reduce((a, b) => a + b, 0) / n;
    const my = y.reduce((a, b) => a + b, 0) / n;
    let ssXY = 0, ssXX = 0, ssYY = 0;
    for (let i = 0; i < n; i++) {
      ssXY += (x[i] - mx) * (y[i] - my);
      ssXX += Math.pow(x[i] - mx, 2);
      ssYY += Math.pow(y[i] - my, 2);
    }
    if (ssXX === 0) return null;
    const b = ssXY / ssXX;
    const a = my - b * mx;
    const ssRes = y.reduce((sum, yi, i) => sum + Math.pow(yi - (a + b * x[i]), 2), 0);
    const ssTot = ssYY;
    const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
    const r = this.pearsonR(x, y);
    const seEst = Math.sqrt(ssRes / (n - 2));
    const seB = ssXX === 0 ? 0 : seEst / Math.sqrt(ssXX);
    const t = seB === 0 ? 0 : b / seB;
    const p = 2 * (1 - jStat.studentt.cdf(Math.abs(t), n - 2));
    const adjR2 = n > 2 ? 1 - (1 - rSquared) * (n - 1) / (n - 2) : rSquared;
    const MSModel = ssTot - ssRes;
    const F = ssRes === 0 ? 0 : MSModel / (ssRes / (n - 2));
    const modelP = 1 - jStat.centralF.cdf(F, 1, n - 2);
    return {
      intercept: a,
      slope: b,
      r,
      rSquared,
      adjR2,
      seEst,
      seB,
      t,
      p,
      F,
      modelP,
      n,
      predictions: x.map(xi => a + b * xi)
    };
  },

  mean(arr) {
    return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
  },

  median(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  },

  std(arr) {
    const n = arr.length;
    if (n < 2) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / n;
    return Math.sqrt(arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1));
  },

  variance(arr) {
    const n = arr.length;
    if (n < 2) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / n;
    return arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1);
  },

  min(arr) { return Math.min(...arr); },
  max(arr) { return Math.max(...arr); },
  range(arr) { return this.max(arr) - this.min(arr); },

  formatNumber(num, decimals = 4) {
    if (typeof num !== 'number' || isNaN(num)) return '—';
    return num.toFixed(decimals);
  },

  formatP(p) {
    if (p < 0.001) return '< .001';
    if (p < 0.01) return p.toFixed(3);
    return p.toFixed(3);
  },

  interpretP(p, alpha = 0.05) {
    return p < alpha ? 'statistically significant' : 'not statistically significant';
  },

  shapiroWilk(arr) {
    const n = arr.length;
    if (n < 3) return { W: 1, p: 1 };
    if (n < 8) {
      const sorted = [...arr].sort((a, b) => a - b);
      const range = sorted[n - 1] - sorted[0];
      const sd = this.std(arr);
      if (sd === 0) return { W: 1, p: 1 };
      const W = 1 - range / (sd * Math.sqrt(n));
      return { W: Math.max(0, Math.min(1, W)), p: W > 0.8 ? 0.2 : W > 0.6 ? 0.05 : 0.01 };
    }

    const sorted = [...arr].sort((a, b) => a - b);
    const mean = this.mean(arr);
    const s2 = arr.reduce((s, v) => s + Math.pow(v - mean, 2), 0);
    if (s2 === 0) return { W: 1, p: 1 };

    const skew = this.computeSkewness(arr);
    const kurt = this.computeKurtosis(arr) + 3;
    const mu2 = s2 / n;

    const Z1 = skew * Math.sqrt((n + 1) * (n + 3) / (6 * (n - 2)));
    const beta2 = 3 * (n * n + 27 * n - 70) * (n + 1) * (n + 3) / ((n - 2) * (n + 5) * (n + 7) * (n + 9));
    const W2 = -1 + Math.sqrt(2 * (beta2 - 1));
    const delta = Math.log(Math.max(W2, 0.001));
    const alpha = Math.sqrt(2 / (Math.max(W2, 0.001) - 1));
    const Z2 = (kurt - (3 * (n - 1)) / (n + 1)) * alpha;

    const D = (Z1 * Z1 + Z2 * Z2);

    let p;
    if (D < 0.001) { p = 0.99; }
    else if (D < 0.05) { p = 0.5 + (0.05 - D) * 8; }
    else if (D < 0.5) { p = 0.2 + (0.5 - D) * 0.6; }
    else if (D < 2) { p = 0.05 + (2 - D) * 0.1; }
    else if (D < 5) { p = 0.01 + (5 - D) * 0.013; }
    else { p = 0.001; }

    const W = Math.max(0, Math.min(1, 1 - D / 10));
    return { W, p: Math.max(0.001, Math.min(1, p)) };
  },

  tukeyHSD(groups) {
    const k = groups.length;
    const allData = groups.flat();
    const N = allData.length;
    const groupMeans = groups.map(g => this.mean(g));
    const groupNs = groups.map(g => g.length);
    const mse = allData.reduce((s, v) => s + Math.pow(v - this.mean(allData), 2), 0) / (N - k);
    const df = N - k;

    const pairwise = [];
    for (let i = 0; i < k; i++) {
      for (let j = i + 1; j < k; j++) {
        const diff = Math.abs(groupMeans[i] - groupMeans[j]);
        const se = Math.sqrt(mse * (1 / groupNs[i] + 1 / groupNs[j]));
        const q = se === 0 ? 0 : diff / se;
        const p = this._tukeyP(q, k, df);
        pairwise.push({
          group1: i,
          group2: j,
          meanDiff: groupMeans[i] - groupMeans[j],
          q,
          se,
          p,
          significant: p < 0.05
        });
      }
    }

    return { mse, df, pairwise, groupMeans };
  },

  _tukeyP(q, k, df) {
    const numPoints = 200;
    let integral = 0;
    for (let i = 0; i <= numPoints; i++) {
      const u = (i / numPoints) * 6;
      const f = this._studentPDF(u, df);
      const cdfAtU = jStat.studentt.cdf(u * Math.sqrt(2), df);
      const term = Math.pow(cdfAtU, k - 1) * f;
      if (i === 0 || i === numPoints) integral += term / 2;
      else integral += term;
    }
    integral *= (6 / numPoints);
    const pValue = 1 - Math.pow(integral, k * (k - 1) / 2);
    return Math.max(0, Math.min(1, pValue));
  },

  _studentPDF(t, df) {
    const coeff = Math.exp(
      this._lgammaln((df + 1) / 2) - this._lgammaln(df / 2) -
      0.5 * Math.log(df * Math.PI)
    );
    return coeff * Math.pow(1 + t * t / df, -(df + 1) / 2);
  },

  _lgammaln(x) {
    const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
      -1.231739572450155, 0.001208650973866179, -0.000005395239384953];
    let y = x, tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    for (let j = 0; j < 6; j++) ser += c[j] / ++y;
    return -tmp + Math.log(2.5066282746310005 * ser / x);
  },

  multipleRegression(y, X) {
    const n = y.length;
    const p = X[0].length;
    if (n < p + 2) return null;

    const XtX = [];
    for (let i = 0; i <= p; i++) {
      XtX[i] = [];
      for (let j = 0; j <= p; j++) {
        let sum = 0;
        if (i === 0 && j === 0) { sum = n; }
        else if (i === 0) { sum = X.reduce((s, row) => s + row[j - 1], 0); }
        else if (j === 0) { sum = X.reduce((s, row) => s + row[i - 1], 0); }
        else { sum = X.reduce((s, row) => s + row[i - 1] * row[j - 1], 0); }
        XtX[i][j] = sum;
      }
    }

    const Xty = [y.reduce((s, v) => s + v, 0)];
    for (let i = 0; i < p; i++) {
      Xty.push(X.reduce((s, row, j) => s + row[i] * y[j], 0));
    }

    const inv = this._invertMatrix(XtX);
    if (!inv) return null;

    const beta = [];
    for (let i = 0; i <= p; i++) {
      beta[i] = inv[i].reduce((s, v, j) => s + v * Xty[j], 0);
    }

    const yMean = this.mean(y);
    const ssTot = y.reduce((s, v) => s + Math.pow(v - yMean, 2), 0);
    let ssRes = 0;
    const predictions = [];
    for (let i = 0; i < n; i++) {
      let yHat = beta[0];
      for (let j = 0; j < p; j++) yHat += beta[j + 1] * X[i][j];
      predictions.push(yHat);
      ssRes += Math.pow(y[i] - yHat, 2);
    }

    const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
    const adjR2 = n > p + 1 ? 1 - (1 - rSquared) * (n - 1) / (n - p - 1) : rSquared;
    const msModel = (ssTot - ssRes) / p;
    const msRes = ssRes / (n - p - 1);
    const F = msRes === 0 ? 0 : msModel / msRes;
    const modelP = 1 - jStat.centralF.cdf(F, p, n - p - 1);

    const seBeta = [];
    const tStats = [];
    const pValues = [];
    for (let i = 0; i <= p; i++) {
      const se = Math.sqrt(msRes * inv[i][i]);
      seBeta.push(se);
      const t = se === 0 ? 0 : beta[i] / se;
      tStats.push(t);
      pValues.push(2 * (1 - jStat.studentt.cdf(Math.abs(t), n - p - 1)));
    }

    const labels = ['(Intercept)', ...Array.from({ length: p }, (_, i) => `X${i + 1}`)];
    const coefficients = labels.map((label, i) => ({
      label,
      b: beta[i],
      se: seBeta[i],
      t: tStats[i],
      p: pValues[i]
    }));

    return {
      coefficients,
      rSquared,
      adjR2,
      F,
      modelP,
      n,
      p,
      dfResidual: n - p - 1,
      msRes,
      ssRes,
      ssTot,
      predictions
    };
  },

  _invertMatrix(m) {
    const n = m.length;
    const aug = m.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]);
    for (let col = 0; col < n; col++) {
      let maxRow = col;
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
      }
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
      const pivot = aug[col][col];
      if (Math.abs(pivot) < 1e-12) return null;
      for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;
      for (let row = 0; row < n; row++) {
        if (row === col) continue;
        const factor = aug[row][col];
        for (let j = 0; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j];
      }
    }
    return aug.map(row => row.slice(n));
  },

  effectSizeCI(d, n, alpha = 0.05) {
    const se = Math.sqrt((n + n) / (n * n) + d * d / (2 * (n + n)));
    const zCrit = 1.96;
    return {
      d,
      lower: d - zCrit * se,
      upper: d + zCrit * se,
      se
    };
  },

  rCI(r, n, alpha = 0.05) {
    if (n <= 2) return { r, lower: -1, upper: 1 };
    const z = 0.5 * Math.log((1 + r) / (1 - r));
    const se = 1 / Math.sqrt(n - 3);
    const zCrit = 1.96;
    const zLower = z - zCrit * se;
    const zUpper = z + zCrit * se;
    return {
      r,
      lower: (Math.exp(2 * zLower) - 1) / (Math.exp(2 * zLower) + 1),
      upper: (Math.exp(2 * zUpper) - 1) / (Math.exp(2 * zUpper) + 1),
      se
    };
  },

  etaSqCI(etaSq, dfBetween, dfWithin, n) {
    const f = (etaSq / dfBetween) / ((1 - etaSq) / dfWithin);
    const se = Math.sqrt(2 * (1 - etaSq) * etaSq * etaSq / (dfBetween * (n - 1)));
    return {
      etaSq,
      lower: Math.max(0, etaSq - 1.96 * se),
      upper: Math.min(1, etaSq + 1.96 * se),
      se
    };
  },

  rSquaredCI(rSquared, p, n) {
    const r = Math.sqrt(rSquared);
    const rCIResult = this.rCI(r, n);
    return {
      rSquared,
      lower: Math.max(0, Math.pow(rCIResult.lower, 2)),
      upper: Math.min(1, Math.pow(rCIResult.upper, 2))
    };
  }
};
