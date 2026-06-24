const TTestController = {
  currentTab: 'independent',

  renderForm() {
    const main = document.getElementById('main-content');
    const continuousCols = DataController.getContinuousColumns();
    const categoricalCols = DataController.getCategoricalColumns();

    if (continuousCols.length === 0) {
      main.innerHTML = `
        <div class="fade-in">
          <h2>T-Test</h2>
          <div class="error-card">
            <p>No continuous variables detected. Please upload data first.</p>
          </div>
        </div>
      `;
      return;
    }

    main.innerHTML = `
      <div class="fade-in">
        <h2>T-Test</h2>
        <div class="card">
          <div class="tab-bar">
            <button class="tab-btn active" data-tab="independent">Independent Samples</button>
            <button class="tab-btn" data-tab="paired">Paired Samples</button>
          </div>
          <div id="tt-form-content"></div>
        </div>
        <div id="tt-results"></div>
      </div>
    `;

    this.renderIndependentForm();

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.currentTab = e.target.dataset.tab;
        if (this.currentTab === 'independent') {
          this.renderIndependentForm();
        } else {
          this.renderPairedForm();
        }
      });
    });
  },

  renderIndependentForm() {
    const container = document.getElementById('tt-form-content');
    const continuousCols = DataController.getContinuousColumns();
    const categoricalCols = DataController.getCategoricalColumns();

    if (categoricalCols.length === 0) {
      container.innerHTML = `
        <div class="error-card">
          <p>No categorical variables found for grouping. Need exactly 2 groups.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="form-group">
        <label>Test Variable (Continuous)</label>
        <select id="tt-ind-var" class="form-select">
          <option value="">-- Select a variable --</option>
          ${continuousCols.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Grouping Variable (Categorical)</label>
        <select id="tt-ind-group" class="form-select">
          <option value="">-- Select a variable --</option>
          ${categoricalCols.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-primary" id="tt-ind-compute">Run Independent T-Test</button>
    `;

    document.getElementById('tt-ind-compute').addEventListener('click', () => {
      this.computeIndependent();
    });
  },

  renderPairedForm() {
    const container = document.getElementById('tt-form-content');
    const continuousCols = DataController.getContinuousColumns();

    container.innerHTML = `
      <div class="form-group">
        <label>Variable 1</label>
        <select id="tt-pair-var1" class="form-select">
          <option value="">-- Select a variable --</option>
          ${continuousCols.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Variable 2</label>
        <select id="tt-pair-var2" class="form-select">
          <option value="">-- Select a variable --</option>
          ${continuousCols.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-primary" id="tt-pair-compute">Run Paired T-Test</button>
    `;

    document.getElementById('tt-pair-compute').addEventListener('click', () => {
      this.computePaired();
    });
  },

  computeIndependent() {
    const varName = document.getElementById('tt-ind-var').value;
    const groupName = document.getElementById('tt-ind-group').value;

    if (!varName || !groupName) {
      this.showError('Please select both a test variable and a grouping variable.');
      return;
    }

    const groups = DataController.getGroupsByColumn(groupName);
    const groupNames = Object.keys(groups);

    if (groupNames.length !== 2) {
      this.showError(`Grouping variable must have exactly 2 groups. Found ${groupNames.length}.`);
      return;
    }

    const g1 = [];
    const g2 = [];
    state.rawData.forEach(row => {
      const val = parseFloat(row[varName]);
      if (!isNaN(val)) {
        if (String(row[groupName]) === groupNames[0]) {
          g1.push(val);
        } else if (String(row[groupName]) === groupNames[1]) {
          g2.push(val);
        }
      }
    });

    if (g1.length < 2 || g2.length < 2) {
      this.showError('Each group must have at least 2 observations.');
      return;
    }

    const result = Stats.tTestIndependent(g1, g2);
    const d = Stats.cohensD(g1, g2);
    const dCI = Stats.effectSizeCI(d, Math.min(g1.length, g2.length));
    const m1 = Stats.mean(g1);
    const m2 = Stats.mean(g2);

    this.renderIndependentResults(varName, groupName, groupNames, g1, g2, m1, m2, result, d, dCI);
  },

  renderIndependentResults(varName, groupName, groupNames, g1, g2, m1, m2, result, d, dCI) {
    const container = document.getElementById('tt-results');
    const boxId = `tt-box-${Date.now()}`;
    const sigClass = result.p < 0.05 ? 'significant' : 'not-significant';

    const html = `
      <div class="card fade-in" style="margin-top: 1.5rem;">
        <h3>Independent Samples T-Test: ${varName} by ${groupName}</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">${groupNames[0]} (n=${g1.length})</div>
            <div class="stat-value">${Stats.formatNumber(m1)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">${groupNames[1]} (n=${g2.length})</div>
            <div class="stat-value">${Stats.formatNumber(m2)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Mean Difference</div>
            <div class="stat-value">${Stats.formatNumber(m1 - m2)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Cohen's d</div>
            <div class="stat-value">${Stats.formatNumber(d)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">d 95% CI</div>
            <div class="stat-value" style="font-size: 0.875rem;">[${Stats.formatNumber(dCI.lower)}, ${Stats.formatNumber(dCI.upper)}]</div>
          </div>
        </div>
        <div class="table-wrapper">
          <table class="stats-table">
            <thead>
              <tr><th>t-statistic</th><th>df</th><th>p-value</th><th>Significance</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>${Stats.formatNumber(result.t)}</td>
                <td>${result.df}</td>
                <td class="${sigClass}">${Stats.formatP(result.p)}</td>
                <td class="${sigClass}">${Stats.interpretP(result.p)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="chart-container">
          <div id="${boxId}" class="chart"></div>
        </div>
        <div class="interpretation">
          <p><strong>Interpretation:</strong> An independent samples t-test was conducted to compare ${varName} between ${groupNames[0]} and ${groupNames[1]}. The difference was ${Stats.interpretP(result.p)} (t(${result.df}) = ${Stats.formatNumber(result.t)}, p = ${Stats.formatP(result.p)}). Cohen's d = ${Stats.formatNumber(d)}, 95% CI [${Stats.formatNumber(dCI.lower)}, ${Stats.formatNumber(dCI.upper)}], indicating a ${d < 0.2 ? 'negligible' : d < 0.5 ? 'small' : d < 0.8 ? 'medium' : 'large'} effect size.</p>
        </div>
      </div>
    `;

    container.innerHTML = html;

    Charts.plotGroupedBoxplot(boxId, [
      { label: groupNames[0], data: g1 },
      { label: groupNames[1], data: g2 }
    ]);

    state.sessionResults.push({
      type: 'ttest-independent',
      variable: varName,
      grouping: groupName,
      result,
      d,
      html
    });
  },

  computePaired() {
    const var1Name = document.getElementById('tt-pair-var1').value;
    const var2Name = document.getElementById('tt-pair-var2').value;

    if (!var1Name || !var2Name) {
      this.showError('Please select both variables.');
      return;
    }

    if (var1Name === var2Name) {
      this.showError('Please select two different variables.');
      return;
    }

    const data1 = DataController.getNumericColumnData(var1Name);
    const data2 = DataController.getNumericColumnData(var2Name);
    const minLength = Math.min(data1.length, data2.length);
    const g1 = data1.slice(0, minLength);
    const g2 = data2.slice(0, minLength);

    if (minLength < 2) {
      this.showError('Need at least 2 paired observations.');
      return;
    }

    const result = Stats.tTestPaired(g1, g2);
    const d = Stats.cohensD(g1, g2);
    const dCI = Stats.effectSizeCI(d, minLength);

    this.renderPairedResults(var1Name, var2Name, g1, g2, result, d, dCI);
  },

  renderPairedResults(var1Name, var2Name, g1, g2, result, d, dCI) {
    const container = document.getElementById('tt-results');
    const boxId = `tt-pair-box-${Date.now()}`;
    const sigClass = result.p < 0.05 ? 'significant' : 'not-significant';

    const html = `
      <div class="card fade-in" style="margin-top: 1.5rem;">
        <h3>Paired Samples T-Test: ${var1Name} vs ${var2Name}</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">${var1Name} Mean</div>
            <div class="stat-value">${Stats.formatNumber(Stats.mean(g1))}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">${var2Name} Mean</div>
            <div class="stat-value">${Stats.formatNumber(Stats.mean(g2))}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Mean Difference</div>
            <div class="stat-value">${Stats.formatNumber(result.meanDiff)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Cohen's d</div>
            <div class="stat-value">${Stats.formatNumber(d)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">d 95% CI</div>
            <div class="stat-value" style="font-size: 0.875rem;">[${Stats.formatNumber(dCI.lower)}, ${Stats.formatNumber(dCI.upper)}]</div>
          </div>
        </div>
        <div class="table-wrapper">
          <table class="stats-table">
            <thead>
              <tr><th>t-statistic</th><th>df</th><th>p-value</th><th>Significance</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>${Stats.formatNumber(result.t)}</td>
                <td>${result.df}</td>
                <td class="${sigClass}">${Stats.formatP(result.p)}</td>
                <td class="${sigClass}">${Stats.interpretP(result.p)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="chart-container">
          <div id="${boxId}" class="chart"></div>
        </div>
        <div class="interpretation">
          <p><strong>Interpretation:</strong> A paired samples t-test was conducted to compare ${var1Name} and ${var2Name}. The difference was ${Stats.interpretP(result.p)} (t(${result.df}) = ${Stats.formatNumber(result.t)}, p = ${Stats.formatP(result.p)}). The mean difference was ${Stats.formatNumber(result.meanDiff)} (Cohen's d = ${Stats.formatNumber(d)}, 95% CI [${Stats.formatNumber(dCI.lower)}, ${Stats.formatNumber(dCI.upper)}], ${d < 0.2 ? 'negligible' : d < 0.5 ? 'small' : d < 0.8 ? 'medium' : 'large'} effect).</p>
        </div>
      </div>
    `;

    container.innerHTML = html;

    Charts.plotGroupedBoxplot(boxId, [
      { label: var1Name, data: g1 },
      { label: var2Name, data: g2 }
    ]);

    state.sessionResults.push({
      type: 'ttest-paired',
      variable1: var1Name,
      variable2: var2Name,
      result,
      d,
      html
    });
  },

  showError(message) {
    const container = document.getElementById('tt-results');
    container.innerHTML = `<div class="error-card fade-in"><p>${message}</p></div>`;
  }
};
