const FrequenciesController = {
  renderForm() {
    const main = document.getElementById('main-content');
    const categoricalCols = DataController.getCategoricalColumns();

    if (categoricalCols.length === 0) {
      main.innerHTML = `
        <div class="fade-in">
          <h2>Frequencies</h2>
          <div class="error-card">
            <p>No categorical variables detected. Please upload data first.</p>
          </div>
        </div>
      `;
      return;
    }

    main.innerHTML = `
      <div class="fade-in">
        <h2>Frequencies</h2>
        <div class="card">
          <h3>Select Variable</h3>
          <div class="form-group">
            <label>Categorical Variable</label>
            <select id="freq-var" class="form-select">
              <option value="">-- Select a variable --</option>
              ${categoricalCols.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
          <button class="btn btn-primary" id="freq-compute">Compute Frequencies</button>
        </div>
        <div id="freq-results"></div>
      </div>
    `;

    document.getElementById('freq-compute').addEventListener('click', () => {
      this.compute();
    });
  },

  compute() {
    const select = document.getElementById('freq-var');
    const colName = select.value;

    if (!colName) {
      this.showError('Please select a variable.');
      return;
    }

    const data = DataController.getColumnData(colName);
    if (data.length === 0) {
      this.showError('No data found in selected variable.');
      return;
    }

    const freq = {};
    data.forEach(v => {
      freq[v] = (freq[v] || 0) + 1;
    });

    const total = data.length;
    let cumulative = 0;
    const table = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => {
        cumulative += count;
        return {
          value,
          count,
          percent: (count / total) * 100,
          cumulativePercent: (cumulative / total) * 100
        };
      });

    this.renderResults(colName, table, total);
  },

  renderResults(colName, table, total) {
    const container = document.getElementById('freq-results');
    const barId = `freq-bar-${Date.now()}`;
    const pieId = `freq-pie-${Date.now()}`;

    const html = `
      <div class="card fade-in" style="margin-top: 1.5rem;">
        <h3>Frequency Distribution: ${colName}</h3>
        <div class="table-wrapper">
          <table class="stats-table">
            <thead>
              <tr>
                <th>Value</th><th>Count</th><th>Percent</th><th>Cumulative %</th>
              </tr>
            </thead>
            <tbody>
              ${table.map(row => `
                <tr>
                  <td>${row.value}</td>
                  <td>${row.count}</td>
                  <td>${Stats.formatNumber(row.percent, 2)}%</td>
                  <td>${Stats.formatNumber(row.cumulativePercent, 2)}%</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td><strong>Total</strong></td>
                <td><strong>${total}</strong></td>
                <td><strong>100.00%</strong></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="charts-row">
          <div class="chart-container">
            <div id="${barId}" class="chart"></div>
          </div>
          <div class="chart-container">
            <div id="${pieId}" class="chart"></div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    Charts.plotBarChart(barId, table.map(r => r.value), table.map(r => r.count));
    Charts.plotPieChart(pieId, table.map(r => r.value), table.map(r => r.count));

    state.sessionResults.push({
      type: 'frequencies',
      variable: colName,
      table,
      total,
      html
    });
  },

  showError(message) {
    const container = document.getElementById('freq-results');
    container.innerHTML = `<div class="error-card fade-in"><p>${message}</p></div>`;
  }
};
