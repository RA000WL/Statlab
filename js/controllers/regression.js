const RegressionController = {
  renderForm() {
    const main = document.getElementById('main-content');
    const continuousCols = DataController.getContinuousColumns();

    if (continuousCols.length < 2) {
      main.innerHTML = `
        <div class="fade-in">
          <h2>Linear Regression</h2>
          <div class="error-card">
            <p>Need at least 2 continuous variables. Please upload data first.</p>
          </div>
        </div>
      `;
      return;
    }

    main.innerHTML = `
      <div class="fade-in">
        <h2>Linear Regression</h2>
        <div class="card">
          <div class="tab-bar">
            <button class="tab-btn active" data-tab="simple">Simple (1 Predictor)</button>
            <button class="tab-btn" data-tab="multiple">Multiple (2+ Predictors)</button>
          </div>
          <div id="reg-form-content"></div>
        </div>
        <div id="reg-results"></div>
      </div>
    `;

    this.renderSimpleForm();

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        document.getElementById('reg-results').innerHTML = '';
        if (e.target.dataset.tab === 'simple') {
          this.renderSimpleForm();
        } else {
          this.renderMultipleForm();
        }
      });
    });
  },

  renderSimpleForm() {
    const container = document.getElementById('reg-form-content');
    const continuousCols = DataController.getContinuousColumns();

    container.innerHTML = `
      <div class="form-group">
        <label>Dependent Variable (Y)</label>
        <select id="reg-y" class="form-select">
          <option value="">-- Select a variable --</option>
          ${continuousCols.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Predictor Variable (X)</label>
        <select id="reg-x" class="form-select">
          <option value="">-- Select a variable --</option>
          ${continuousCols.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-primary" id="reg-compute">Run Simple Regression</button>
    `;

    document.getElementById('reg-compute').addEventListener('click', () => {
      this.computeSimple();
    });
  },

  renderMultipleForm() {
    const container = document.getElementById('reg-form-content');
    const continuousCols = DataController.getContinuousColumns();

    container.innerHTML = `
      <div class="form-group">
        <label>Dependent Variable (Y)</label>
        <select id="reg-y-multi" class="form-select">
          <option value="">-- Select a variable --</option>
          ${continuousCols.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Predictor Variables (X) — hold Ctrl/Cmd for multiple</label>
        <select id="reg-x-multi" multiple class="multi-select">
          ${continuousCols.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-primary" id="reg-multi-compute">Run Multiple Regression</button>
    `;

    document.getElementById('reg-multi-compute').addEventListener('click', () => {
      this.computeMultiple();
    });
  },

  computeSimple() {
    const yName = document.getElementById('reg-y').value;
    const xName = document.getElementById('reg-x').value;

    if (!yName || !xName) {
      this.showError('Please select both variables.');
      return;
    }
    if (yName === xName) {
      this.showError('Please select two different variables.');
      return;
    }

    const yData = DataController.getNumericColumnData(yName);
    const xData = DataController.getNumericColumnData(xName);
    const n = Math.min(yData.length, xData.length);
    if (n < 3) { this.showError('Need at least 3 observations.'); return; }

    const x = xData.slice(0, n);
    const y = yData.slice(0, n);
    const result = Stats.linearRegression(x, y);
    if (!result) { this.showError('Could not compute regression.'); return; }

    const rCI = Stats.rCI(result.r, n);
    result.rCI = rCI;
    result.r2CI = Stats.rSquaredCI(result.rSquared, 1, n);
    this.renderSimpleResults(yName, [xName], result, x, y);
  },

  computeMultiple() {
    const yName = document.getElementById('reg-y-multi').value;
    const select = document.getElementById('reg-x-multi');
    const xNames = Array.from(select.selectedOptions).map(o => o.value);

    if (!yName) { this.showError('Please select a dependent variable.'); return; }
    if (xNames.length < 2) { this.showError('Select at least 2 predictor variables.'); return; }
    if (xNames.includes(yName)) { this.showError('Dependent variable cannot be a predictor.'); return; }

    const yData = DataController.getNumericColumnData(yName);
    const xDatas = xNames.map(name => DataController.getNumericColumnData(name));
    const n = Math.min(yData.length, ...xDatas.map(d => d.length));
    if (n < xNames.length + 3) { this.showError(`Need at least ${xNames.length + 3} observations.`); return; }

    const y = yData.slice(0, n);
    const X = [];
    for (let i = 0; i < n; i++) {
      X.push(xDatas.map(d => d[i]));
    }

    const result = Stats.multipleRegression(y, X);
    if (!result) { this.showError('Could not compute regression. Check for multicollinearity.'); return; }

    result.r2CI = Stats.rSquaredCI(result.rSquared, result.p, n);

    result.coefficients.forEach((c, i) => {
      if (i === 0) {
        c.label = '(Intercept)';
      } else {
        c.label = xNames[i - 1];
      }
    });

    this.renderMultipleResults(yName, xNames, result, y);
  },

  renderSimpleResults(yName, xNames, result, x, y) {
    const container = document.getElementById('reg-results');
    const scatterId = `reg-scatter-${Date.now()}`;
    const sigClass = result.p < 0.05 ? 'significant' : 'not-significant';
    const modelSigClass = result.modelP < 0.05 ? 'significant' : 'not-significant';

    const html = `
      <div class="card fade-in" style="margin-top: 1.5rem;">
        <h3>Simple Linear Regression: ${yName} ~ ${xNames[0]}</h3>
        <h4>Model Summary</h4>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">R</div>
            <div class="stat-value">${Stats.formatNumber(result.r)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">R 95% CI</div>
            <div class="stat-value" style="font-size: 0.875rem;">[${Stats.formatNumber(result.rCI.lower)}, ${Stats.formatNumber(result.rCI.upper)}]</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">R²</div>
            <div class="stat-value">${Stats.formatNumber(result.rSquared)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">R² 95% CI</div>
            <div class="stat-value" style="font-size: 0.875rem;">[${Stats.formatNumber(result.r2CI.lower)}, ${Stats.formatNumber(result.r2CI.upper)}]</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Adjusted R²</div>
            <div class="stat-value">${Stats.formatNumber(result.adjR2)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">F(1, ${result.n - 2})</div>
            <div class="stat-value">${Stats.formatNumber(result.F)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Model p</div>
            <div class="stat-value ${modelSigClass}">${Stats.formatP(result.modelP)}</div>
          </div>
        </div>
        <h4>Coefficients</h4>
        <div class="table-wrapper">
          <table class="stats-table">
            <thead>
              <tr><th>Predictor</th><th>B</th><th>SE</th><th>β</th><th>t</th><th>p</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>(Intercept)</td>
                <td>${Stats.formatNumber(result.intercept)}</td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
              </tr>
              <tr>
                <td>${xNames[0]}</td>
                <td>${Stats.formatNumber(result.slope)}</td>
                <td>${Stats.formatNumber(result.seB)}</td>
                <td>${Stats.formatNumber(result.r * (Stats.std(y) / Stats.std(x)))}</td>
                <td>${Stats.formatNumber(result.t)}</td>
                <td class="${sigClass}">${Stats.formatP(result.p)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="chart-container">
          <div id="${scatterId}" class="chart"></div>
        </div>
        <div class="interpretation">
          <p><strong>Interpretation:</strong> A simple linear regression was calculated to predict ${yName} based on ${xNames[0]}. ${result.modelP < 0.05 ? 'A significant' : 'A non-significant'} regression equation was found (F(1, ${result.n - 2}) = ${Stats.formatNumber(result.F)}, p = ${Stats.formatP(result.modelP)}), with R² = ${Stats.formatNumber(result.rSquared)} (95% CI [${Stats.formatNumber(result.r2CI.lower)}, ${Stats.formatNumber(result.r2CI.upper)}]). ${xNames[0]} ${result.p < 0.05 ? 'significantly' : 'did not significantly'} predict ${yName} (B = ${Stats.formatNumber(result.slope)}, p = ${Stats.formatP(result.p)}). ${result.slope > 0 ? 'Positive' : 'Negative'} relationship: for each unit increase in ${xNames[0]}, ${yName} ${result.slope > 0 ? 'increases' : 'decreases'} by ${Stats.formatNumber(Math.abs(result.slope))} units.</p>
        </div>
      </div>
    `;

    container.innerHTML = html;

    Charts.plotScatter(scatterId, x, y, xNames[0], yName, {
      x: [Math.min(...x), Math.max(...x)],
      y: [result.intercept + result.slope * Math.min(...x), result.intercept + result.slope * Math.max(...x)]
    });

    state.sessionResults.push({ type: 'regression', subtype: 'simple', yName, xNames, result, html });
  },

  renderMultipleResults(yName, xNames, result, y) {
    const container = document.getElementById('reg-results');
    const modelSigClass = result.modelP < 0.05 ? 'significant' : 'not-significant';

    const html = `
      <div class="card fade-in" style="margin-top: 1.5rem;">
        <h3>Multiple Regression: ${yName} ~ ${xNames.join(' + ')}</h3>
        <h4>Model Summary</h4>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">R²</div>
            <div class="stat-value">${Stats.formatNumber(result.rSquared)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">R² 95% CI</div>
            <div class="stat-value" style="font-size: 0.875rem;">[${Stats.formatNumber(result.r2CI.lower)}, ${Stats.formatNumber(result.r2CI.upper)}]</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Adjusted R²</div>
            <div class="stat-value">${Stats.formatNumber(result.adjR2)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">F(${result.p}, ${result.dfResidual})</div>
            <div class="stat-value">${Stats.formatNumber(result.F)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Model p</div>
            <div class="stat-value ${modelSigClass}">${Stats.formatP(result.modelP)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">N</div>
            <div class="stat-value">${result.n}</div>
          </div>
        </div>
        <h4>Coefficients</h4>
        <div class="table-wrapper">
          <table class="stats-table">
            <thead>
              <tr><th>Predictor</th><th>B</th><th>SE</th><th>t</th><th>p</th><th>Sig.</th></tr>
            </thead>
            <tbody>
              ${result.coefficients.map(c => {
                const cSig = c.p < 0.05 ? 'significant' : '';
                return `<tr>
                  <td>${c.label}</td>
                  <td>${Stats.formatNumber(c.b)}</td>
                  <td>${Stats.formatNumber(c.se)}</td>
                  <td>${Stats.formatNumber(c.t)}</td>
                  <td class="${cSig}">${Stats.formatP(c.p)}</td>
                  <td class="${cSig}">${c.p < 0.05 ? '*' : ''}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div class="interpretation">
          <p><strong>Interpretation:</strong> A multiple regression was calculated to predict ${yName} from ${xNames.join(', ')}. ${result.modelP < 0.05 ? 'The overall model was significant' : 'The overall model was not significant'} (F(${result.p}, ${result.dfResidual}) = ${Stats.formatNumber(result.F)}, p = ${Stats.formatP(result.modelP)}), accounting for ${Stats.formatNumber(result.rSquared * 100)}% of variance in ${yName} (Adjusted R² = ${Stats.formatNumber(result.adjR2)}). ${result.coefficients.filter((c, i) => i > 0 && c.p < 0.05).map(c => `${c.label} was a significant predictor (B = ${Stats.formatNumber(c.b)}, p = ${Stats.formatP(c.p)})`).join('. ') || 'No individual predictors reached statistical significance.'}</p>
        </div>
      </div>
    `;

    container.innerHTML = html;

    state.sessionResults.push({ type: 'regression', subtype: 'multiple', yName, xNames, result, html });
  },

  showError(message) {
    const container = document.getElementById('reg-results');
    container.innerHTML = `<div class="error-card fade-in"><p>${message}</p></div>`;
  }
};
