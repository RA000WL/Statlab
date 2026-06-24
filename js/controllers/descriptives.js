const DescriptivesController = {
  renderForm() {
    const main = document.getElementById('main-content');
    const continuousCols = DataController.getContinuousColumns();

    if (continuousCols.length === 0) {
      main.innerHTML = `
        <div class="fade-in">
          <h2>Descriptive Statistics</h2>
          <div class="error-card">
            <p>No continuous variables detected. Please upload data first.</p>
          </div>
        </div>
      `;
      return;
    }

    main.innerHTML = `
      <div class="fade-in">
        <h2>Descriptive Statistics</h2>
        <div class="card">
          <h3>Select Variables</h3>
          <div class="form-group">
            <label>Continuous Variables (hold Ctrl/Cmd for multiple)</label>
            <select id="desc-vars" multiple class="multi-select">
              ${continuousCols.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
          <button class="btn btn-primary" id="desc-compute">Compute Statistics</button>
        </div>
        <div id="desc-results"></div>
      </div>
    `;

    document.getElementById('desc-compute').addEventListener('click', () => {
      this.compute();
    });
  },

  compute() {
    const select = document.getElementById('desc-vars');
    const selected = Array.from(select.selectedOptions).map(o => o.value);

    if (selected.length === 0) {
      this.showError('Please select at least one variable.');
      return;
    }

    const results = selected.map(col => {
      const data = DataController.getNumericColumnData(col);
      if (data.length === 0) return null;

      const normality = Stats.shapiroWilk(data);

      return {
        name: col,
        n: data.length,
        mean: Stats.mean(data),
        median: Stats.median(data),
        mode: Stats.computeMode(data),
        std: Stats.std(data),
        variance: Stats.variance(data),
        min: Stats.min(data),
        max: Stats.max(data),
        range: Stats.range(data),
        skewness: Stats.computeSkewness(data),
        kurtosis: Stats.computeKurtosis(data),
        ci95: Stats.computeCI95(data),
        normality,
        data: data
      };
    }).filter(r => r !== null);

    this.renderResults(results);
  },

  renderResults(results) {
    const container = document.getElementById('desc-results');
    let html = '';

    results.forEach((r, idx) => {
      const chartId = `desc-chart-${idx}`;
      const boxId = `desc-box-${idx}`;
      const qqId = `desc-qq-${idx}`;
      const normClass = r.normality.p >= 0.05 ? 'significant' : 'not-significant';
      const skewClass = Math.abs(r.skewness) > 1 ? 'not-significant' : '';
      const kurtClass = Math.abs(r.kurtosis) > 3 ? 'not-significant' : '';

      html += `
        <div class="card fade-in" style="margin-top: 1.5rem;">
          <h3>${r.name}</h3>
          <div class="table-wrapper">
            <table class="stats-table">
              <thead>
                <tr>
                  <th>N</th><th>Mean</th><th>Median</th><th>Mode</th>
                  <th>Std Dev</th><th>Variance</th><th>Min</th><th>Max</th>
                  <th>Range</th><th>Skewness</th><th>Kurtosis</th><th>95% CI</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${r.n}</td>
                  <td>${Stats.formatNumber(r.mean)}</td>
                  <td>${Stats.formatNumber(r.median)}</td>
                  <td>${r.mode.join(', ')}</td>
                  <td>${Stats.formatNumber(r.std)}</td>
                  <td>${Stats.formatNumber(r.variance)}</td>
                  <td>${Stats.formatNumber(r.min)}</td>
                  <td>${Stats.formatNumber(r.max)}</td>
                  <td>${Stats.formatNumber(r.range)}</td>
                  <td class="${skewClass}">${Stats.formatNumber(r.skewness)}</td>
                  <td class="${kurtClass}">${Stats.formatNumber(r.kurtosis)}</td>
                  <td>[${Stats.formatNumber(r.ci95[0])}, ${Stats.formatNumber(r.ci95[1])}]</td>
                </tr>
              </tbody>
            </table>
          </div>
          <h4>Normality Test (Shapiro-Wilk)</h4>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">W</div>
              <div class="stat-value">${Stats.formatNumber(r.normality.W)}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">p-value</div>
              <div class="stat-value ${normClass}">${Stats.formatP(r.normality.p)}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Interpretation</div>
              <div class="stat-value" style="font-size: 0.875rem;">${r.normality.p >= 0.05 ? 'Normal distribution (p ≥ .05)' : 'Non-normal distribution (p < .05)'}</div>
            </div>
          </div>
          <div class="charts-row">
            <div class="chart-container">
              <div id="${chartId}" class="chart"></div>
            </div>
            <div class="chart-container">
              <div id="${boxId}" class="chart"></div>
            </div>
          </div>
          <div class="charts-row" style="margin-top: 1rem;">
            <div class="chart-container">
              <div id="${qqId}" class="chart"></div>
            </div>
          </div>
        </div>
      `;

      state.sessionResults.push({
        type: 'descriptives',
        variable: r.name,
        stats: r,
        html: html
      });
    });

    container.innerHTML = html;

    results.forEach((r, idx) => {
      Charts.plotHistogram(`desc-chart-${idx}`, r.data, r.name);
      Charts.plotBoxplot(`desc-box-${idx}`, r.data, r.name);
      Charts.plotQQ(`desc-qq-${idx}`, r.data, r.name);
    });
  },

  showError(message) {
    const container = document.getElementById('desc-results');
    container.innerHTML = `<div class="error-card fade-in"><p>${message}</p></div>`;
  }
};
