const ExportController = {
  renderForm() {
    const main = document.getElementById('main-content');
    const results = state.sessionResults;

    if (results.length === 0) {
      main.innerHTML = `
        <div class="fade-in">
          <h2>Export Report</h2>
          <div class="card">
            <div class="empty-state">
              <p>No analyses run yet.</p>
              <p class="text-muted">Run some analyses first, then come back to export your report.</p>
            </div>
          </div>
        </div>
      `;
      return;
    }

    main.innerHTML = `
      <div class="fade-in">
        <h2>Export Report</h2>
        <div class="card">
          <h3>Analyses in This Session</h3>
          <div class="analysis-list">
            ${results.map((r, i) => `
              <div class="analysis-item">
                <span class="analysis-type">${this.getTypeLabel(r.type)}</span>
                <span class="analysis-name">${this.getAnalysisName(r)}</span>
              </div>
            `).join('')}
          </div>
          <button class="btn btn-primary" id="export-btn" style="margin-top: 1.5rem;">
            Download Report (HTML)
          </button>
          <p class="text-muted" style="margin-top: 0.5rem; font-size: 0.85rem;">
            Charts will be embedded as images. Report opens in any browser.
          </p>
        </div>
      </div>
    `;

    document.getElementById('export-btn').addEventListener('click', () => {
      this.generateReport();
    });
  },

  getTypeLabel(type) {
    const labels = {
      'descriptives': 'Descriptives',
      'frequencies': 'Frequencies',
      'ttest-independent': 'Independent T-Test',
      'ttest-paired': 'Paired T-Test',
      'anova': 'ANOVA',
      'correlation': 'Correlation',
      'chisquare': 'Chi-Square',
      'regression': 'Regression'
    };
    return labels[type] || type;
  },

  getAnalysisName(result) {
    switch (result.type) {
      case 'descriptives': return result.variable;
      case 'frequencies': return result.variable;
      case 'ttest-independent': return `${result.variable} by ${result.grouping}`;
      case 'ttest-paired': return `${result.variable1} vs ${result.variable2}`;
      case 'anova': return `${result.dependent} by ${result.factor}`;
      case 'correlation': return result.labels.join(', ');
      case 'chisquare': return `${result.rowVar} × ${result.colVar}`;
      case 'regression': return `${result.yName} ~ ${result.xName}`;
      default: return '';
    }
  },

  async generateReport() {
    const btn = document.getElementById('export-btn');
    btn.disabled = true;
    btn.textContent = 'Generating...';

    try {
      let chartsConverted = 0;
      const totalCharts = document.querySelectorAll('.chart').length;

      const chartImages = {};
      const chartDivs = document.querySelectorAll('.chart');
      for (const div of chartDivs) {
        if (div.data && div.data.length > 0) {
          try {
            const img = await Plotly.toImage(div, { format: 'png', width: 600, height: 400 });
            chartImages[div.id] = img;
            chartsConverted++;
            btn.textContent = `Converting charts... (${chartsConverted}/${totalCharts})`;
          } catch (e) {
            console.warn('Failed to convert chart:', div.id, e);
          }
        }
      }

      const html = this.buildReportHTML(chartImages);
      this.downloadFile(html, 'statlab-report.html', 'text/html');

      btn.textContent = 'Report Downloaded!';
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = 'Download Report (HTML)';
      }, 2000);
    } catch (err) {
      console.error('Export error:', err);
      btn.textContent = 'Error - Try Again';
      btn.disabled = false;
    }
  },

  buildReportHTML(chartImages) {
    const results = state.sessionResults;
    const sections = results.map(r => this.buildSection(r, chartImages)).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StatLab Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f1117; color: #e2e8f0; padding: 2rem; line-height: 1.6; }
    h1 { text-align: center; margin-bottom: 0.5rem; color: #4f8ef7; }
    .subtitle { text-align: center; color: #64748b; margin-bottom: 2rem; }
    .section { background: #1e2433; border: 1px solid #2a3144; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; }
    .section h2 { color: #4f8ef7; margin-bottom: 1rem; font-size: 1.2rem; }
    .section h3 { color: #e2e8f0; margin: 1rem 0 0.5rem; font-size: 1rem; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid #2a3144; }
    th { background: #161b27; color: #4f8ef7; font-weight: 600; }
    td { font-family: 'Consolas', 'Monaco', monospace; }
    .significant { color: #22c55e; font-weight: 600; }
    .not-significant { color: #64748b; }
    .interpretation { background: #161b27; padding: 1rem; border-radius: 6px; margin-top: 1rem; border-left: 3px solid #4f8ef7; }
    .interpretation p { margin: 0; }
    .chart-img { max-width: 100%; height: auto; margin: 1rem 0; border-radius: 6px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin: 1rem 0; }
    .stat-card { background: #161b27; padding: 1rem; border-radius: 6px; text-align: center; }
    .stat-label { font-size: 0.85rem; color: #64748b; }
    .stat-value { font-size: 1.25rem; font-weight: 600; color: #e2e8f0; margin-top: 0.25rem; }
  </style>
</head>
<body>
  <h1>StatLab Report</h1>
  <p class="subtitle">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
  ${sections}
</body>
</html>`;
  },

  buildSection(result, chartImages) {
    let content = '';

    switch (result.type) {
      case 'descriptives':
        content = this.buildDescriptivesSection(result, chartImages);
        break;
      case 'frequencies':
        content = this.buildFrequenciesSection(result, chartImages);
        break;
      case 'ttest-independent':
        content = this.buildTTestIndependentSection(result, chartImages);
        break;
      case 'ttest-paired':
        content = this.buildTTestPairedSection(result, chartImages);
        break;
      case 'anova':
        content = this.buildANOVASection(result, chartImages);
        break;
      case 'correlation':
        content = this.buildCorrelationSection(result, chartImages);
        break;
      case 'chisquare':
        content = this.buildChiSquareSection(result, chartImages);
        break;
      case 'regression':
        content = this.buildRegressionSection(result, chartImages);
        break;
    }

    return `<div class="section">${content}</div>`;
  },

  buildDescriptivesSection(result, chartImages) {
    const s = result.stats;
    return `
      <h2>Descriptive Statistics: ${result.variable}</h2>
      <table>
        <thead>
          <tr><th>N</th><th>Mean</th><th>Median</th><th>Std Dev</th><th>Min</th><th>Max</th><th>Skewness</th><th>Kurtosis</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>${s.n}</td>
            <td>${Stats.formatNumber(s.mean)}</td>
            <td>${Stats.formatNumber(s.median)}</td>
            <td>${Stats.formatNumber(s.std)}</td>
            <td>${Stats.formatNumber(s.min)}</td>
            <td>${Stats.formatNumber(s.max)}</td>
            <td>${Stats.formatNumber(s.skewness)}</td>
            <td>${Stats.formatNumber(s.kurtosis)}</td>
          </tr>
        </tbody>
      </table>
    `;
  },

  buildFrequenciesSection(result, chartImages) {
    return `
      <h2>Frequency Distribution: ${result.variable}</h2>
      <table>
        <thead>
          <tr><th>Value</th><th>Count</th><th>Percent</th><th>Cumulative %</th></tr>
        </thead>
        <tbody>
          ${result.table.map(row => `
            <tr>
              <td>${row.value}</td>
              <td>${row.count}</td>
              <td>${Stats.formatNumber(row.percent, 2)}%</td>
              <td>${Stats.formatNumber(row.cumulativePercent, 2)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  },

  buildTTestIndependentSection(result, chartImages) {
    const r = result.result;
    const sigClass = r.p < 0.05 ? 'significant' : 'not-significant';
    return `
      <h2>Independent Samples T-Test: ${result.variable} by ${result.grouping}</h2>
      <table>
        <thead>
          <tr><th>t-statistic</th><th>df</th><th>p-value</th><th>Cohen's d</th><th>Significance</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>${Stats.formatNumber(r.t)}</td>
            <td>${r.df}</td>
            <td class="${sigClass}">${Stats.formatP(r.p)}</td>
            <td>${Stats.formatNumber(result.d)}</td>
            <td class="${sigClass}">${Stats.interpretP(r.p)}</td>
          </tr>
        </tbody>
      </table>
    `;
  },

  buildTTestPairedSection(result, chartImages) {
    const r = result.result;
    const sigClass = r.p < 0.05 ? 'significant' : 'not-significant';
    return `
      <h2>Paired Samples T-Test: ${result.variable1} vs ${result.variable2}</h2>
      <table>
        <thead>
          <tr><th>t-statistic</th><th>df</th><th>p-value</th><th>Mean Diff</th><th>Cohen's d</th><th>Significance</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>${Stats.formatNumber(r.t)}</td>
            <td>${r.df}</td>
            <td class="${sigClass}">${Stats.formatP(r.p)}</td>
            <td>${Stats.formatNumber(r.meanDiff)}</td>
            <td>${Stats.formatNumber(result.d)}</td>
            <td class="${sigClass}">${Stats.interpretP(r.p)}</td>
          </tr>
        </tbody>
      </table>
    `;
  },

  buildANOVASection(result, chartImages) {
    const r = result.result;
    const sigClass = r.p < 0.05 ? 'significant' : 'not-significant';
    return `
      <h2>One-Way ANOVA: ${result.dependent} by ${result.factor}</h2>
      <table>
        <thead>
          <tr><th>Source</th><th>SS</th><th>df</th><th>MS</th><th>F</th><th>p-value</th><th>η²</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Between</td>
            <td>${Stats.formatNumber(r.ssBetween)}</td>
            <td>${r.dfBetween}</td>
            <td>${Stats.formatNumber(r.msBetween)}</td>
            <td>${Stats.formatNumber(r.F)}</td>
            <td class="${sigClass}">${Stats.formatP(r.p)}</td>
            <td>${Stats.formatNumber(r.etaSq)}</td>
          </tr>
          <tr>
            <td>Within</td>
            <td>${Stats.formatNumber(r.ssWithin)}</td>
            <td>${r.dfWithin}</td>
            <td>${Stats.formatNumber(r.msWithin)}</td>
            <td></td><td></td><td></td>
          </tr>
        </tbody>
      </table>
      <h3>Group Means</h3>
      <table>
        <thead>
          <tr><th>Group</th><th>n</th><th>Mean</th><th>Std Dev</th></tr>
        </thead>
        <tbody>
          ${result.groupMeans.map(g => `
            <tr><td>${g.name}</td><td>${g.n}</td><td>${Stats.formatNumber(g.mean)}</td><td>${Stats.formatNumber(g.std)}</td></tr>
          `).join('')}
        </tbody>
      </table>
    `;
  },

  buildCorrelationSection(result, chartImages) {
    return `
      <h2>Correlation Matrix (${result.method === 'pearson' ? 'Pearson' : 'Spearman'})</h2>
      <table>
        <thead>
          <tr><th></th>${result.labels.map(l => `<th>${l}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${result.labels.map((l, i) => `
            <tr>
              <th>${l}</th>
              ${result.labels.map((_, j) => {
                const r = result.matrix[i][j];
                const p = result.pMatrix[i][j];
                return `<td class="${i !== j && p < 0.05 ? 'significant' : ''}">${i === j ? '—' : Stats.formatNumber(r)}</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  },

  buildChiSquareSection(result, chartImages) {
    const r = result.result;
    const sigClass = r.p < 0.05 ? 'significant' : 'not-significant';
    return `
      <h2>Chi-Square Test: ${result.rowVar} × ${result.colVar}</h2>
      <table>
        <thead>
          <tr><th></th>${result.colValues.map(cv => `<th>${cv}</th>`).join('')}<th>Total</th></tr>
        </thead>
        <tbody>
          ${result.contingencyTable.map((row, i) => `
            <tr>
              <th>${result.rowValues[i]}</th>
              ${row.map(cell => `<td>${cell}</td>`).join('')}
              <td><strong>${row.reduce((a, b) => a + b, 0)}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-label">χ²</div><div class="stat-value">${Stats.formatNumber(r.chi2)}</div></div>
        <div class="stat-card"><div class="stat-label">df</div><div class="stat-value">${r.df}</div></div>
        <div class="stat-card"><div class="stat-label">p-value</div><div class="stat-value ${sigClass}">${Stats.formatP(r.p)}</div></div>
        <div class="stat-card"><div class="stat-label">Cramér's V</div><div class="stat-value">${Stats.formatNumber(r.cramersV)}</div></div>
      </div>
    `;
  },

  buildRegressionSection(result, chartImages) {
    const r = result.result;
    const sigClass = r.p < 0.05 ? 'significant' : 'not-significant';
    return `
      <h2>Simple Linear Regression: ${result.yName} ~ ${result.xName}</h2>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-label">R²</div><div class="stat-value">${Stats.formatNumber(r.rSquared)}</div></div>
        <div class="stat-card"><div class="stat-label">Adjusted R²</div><div class="stat-value">${Stats.formatNumber(r.adjR2)}</div></div>
        <div class="stat-card"><div class="stat-label">F</div><div class="stat-value">${Stats.formatNumber(r.F)}</div></div>
        <div class="stat-card"><div class="stat-label">Model p</div><div class="stat-value ${r.modelP < 0.05 ? 'significant' : ''}">${Stats.formatP(r.modelP)}</div></div>
      </div>
      <table>
        <thead>
          <tr><th>Predictor</th><th>B</th><th>SE</th><th>t</th><th>p-value</th></tr>
        </thead>
        <tbody>
          <tr><td>Intercept</td><td>${Stats.formatNumber(r.intercept)}</td><td>—</td><td>—</td><td>—</td></tr>
          <tr><td>${result.xName}</td><td>${Stats.formatNumber(r.slope)}</td><td>${Stats.formatNumber(r.seB)}</td><td>${Stats.formatNumber(r.t)}</td><td class="${sigClass}">${Stats.formatP(r.p)}</td></tr>
        </tbody>
      </table>
    `;
  },

  downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
