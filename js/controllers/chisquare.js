const ChiSquareController = {
  renderForm() {
    const main = document.getElementById('main-content');
    const categoricalCols = DataController.getCategoricalColumns();

    if (categoricalCols.length < 2) {
      main.innerHTML = `
        <div class="fade-in">
          <h2>Chi-Square Test</h2>
          <div class="error-card">
            <p>Need at least 2 categorical variables. Please upload data first.</p>
          </div>
        </div>
      `;
      return;
    }

    main.innerHTML = `
      <div class="fade-in">
        <h2>Chi-Square Test of Independence</h2>
        <div class="card">
          <h3>Select Variables</h3>
          <div class="form-group">
            <label>Row Variable (Categorical)</label>
            <select id="chi-row" class="form-select">
              <option value="">-- Select a variable --</option>
              ${categoricalCols.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Column Variable (Categorical)</label>
            <select id="chi-col" class="form-select">
              <option value="">-- Select a variable --</option>
              ${categoricalCols.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
          <button class="btn btn-primary" id="chi-compute">Run Chi-Square Test</button>
        </div>
        <div id="chi-results"></div>
      </div>
    `;

    document.getElementById('chi-compute').addEventListener('click', () => {
      this.compute();
    });
  },

  compute() {
    const rowVar = document.getElementById('chi-row').value;
    const colVar = document.getElementById('chi-col').value;

    if (!rowVar || !colVar) {
      this.showError('Please select both variables.');
      return;
    }

    if (rowVar === colVar) {
      this.showError('Please select two different variables.');
      return;
    }

    const data = state.rawData;
    const rowValues = [...new Set(data.map(r => String(r[rowVar])))].sort();
    const colValues = [...new Set(data.map(r => String(r[colVar])))].sort();

    const contingencyTable = rowValues.map(rv => {
      return colValues.map(cv => {
        return data.filter(r => String(r[rowVar]) === rv && String(r[colVar]) === cv).length;
      });
    });

    const result = Stats.chiSquareTest(contingencyTable);

    this.renderResults(rowVar, colVar, rowValues, colValues, contingencyTable, result, data.length);
  },

  renderResults(rowVar, colVar, rowValues, colValues, table, result, totalN) {
    const container = document.getElementById('chi-results');
    const stackedId = `chi-stacked-${Date.now()}`;
    const sigClass = result.p < 0.05 ? 'significant' : 'not-significant';

    const html = `
      <div class="card fade-in" style="margin-top: 1.5rem;">
        <h3>Chi-Square Test: ${rowVar} × ${colVar}</h3>
        <h4>Contingency Table</h4>
        <div class="table-wrapper">
          <table class="stats-table">
            <thead>
              <tr>
                <th></th>
                ${colValues.map(cv => `<th>${cv}</th>`).join('')}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${table.map((row, i) => `
                <tr>
                  <th>${rowValues[i]}</th>
                  ${row.map(cell => `<td>${cell}</td>`).join('')}
                  <td><strong>${row.reduce((a, b) => a + b, 0)}</strong></td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <th>Total</th>
                ${colValues.map((_, j) => `<td><strong>${table.reduce((sum, row) => sum + row[j], 0)}</strong></td>`).join('')}
                <td><strong>${totalN}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        <h4>Chi-Square Summary</h4>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">χ²</div>
            <div class="stat-value">${Stats.formatNumber(result.chi2)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">df</div>
            <div class="stat-value">${result.df}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">p-value</div>
            <div class="stat-value ${sigClass}">${Stats.formatP(result.p)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Cramér's V</div>
            <div class="stat-value">${Stats.formatNumber(result.cramersV)}</div>
          </div>
        </div>
        <div class="chart-container">
          <div id="${stackedId}" class="chart"></div>
        </div>
        <div class="interpretation">
          <p><strong>Interpretation:</strong> A chi-square test of independence was performed to examine the relationship between ${rowVar} and ${colVar}. The association was ${Stats.interpretP(result.p)} (χ²(${result.df}) = ${Stats.formatNumber(result.chi2)}, p = ${Stats.formatP(result.p)}, Cramér's V = ${Stats.formatNumber(result.cramersV)}). ${result.cramersV < 0.1 ? 'The effect size is negligible.' : result.cramersV < 0.3 ? 'The effect size is small.' : result.cramersV < 0.5 ? 'The effect size is medium.' : 'The effect size is large.'}</p>
        </div>
      </div>
    `;

    container.innerHTML = html;

    Charts.plotStackedBar(stackedId, table, rowValues, colValues);

    state.sessionResults.push({
      type: 'chisquare',
      rowVar,
      colVar,
      result,
      contingencyTable: table,
      rowValues,
      colValues,
      html
    });
  },

  showError(message) {
    const container = document.getElementById('chi-results');
    container.innerHTML = `<div class="error-card fade-in"><p>${message}</p></div>`;
  }
};
