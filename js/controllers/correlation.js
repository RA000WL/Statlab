const CorrelationController = {
  renderForm() {
    const main = document.getElementById('main-content');
    const continuousCols = DataController.getContinuousColumns();

    if (continuousCols.length < 2) {
      main.innerHTML = `
        <div class="fade-in">
          <h2>Correlation</h2>
          <div class="error-card">
            <p>Need at least 2 continuous variables. Please upload data first.</p>
          </div>
        </div>
      `;
      return;
    }

    main.innerHTML = `
      <div class="fade-in">
        <h2>Correlation</h2>
        <div class="card">
          <h3>Select Variables</h3>
          <div class="form-group">
            <label>Continuous Variables (hold Ctrl/Cmd for multiple, min 2)</label>
            <select id="corr-vars" multiple class="multi-select">
              ${continuousCols.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Method</label>
            <select id="corr-method" class="form-select">
              <option value="pearson">Pearson</option>
              <option value="spearman">Spearman</option>
            </select>
          </div>
          <button class="btn btn-primary" id="corr-compute">Compute Correlation</button>
        </div>
        <div id="corr-results"></div>
      </div>
    `;

    document.getElementById('corr-compute').addEventListener('click', () => {
      this.compute();
    });
  },

  compute() {
    const select = document.getElementById('corr-vars');
    const selected = Array.from(select.selectedOptions).map(o => o.value);
    const method = document.getElementById('corr-method').value;

    if (selected.length < 2) {
      this.showError('Please select at least 2 variables.');
      return;
    }

    const datasets = selected.map(col => ({
      name: col,
      data: DataController.getNumericColumnData(col)
    }));

    const minLength = Math.min(...datasets.map(d => d.data.length));
    if (minLength < 3) {
      this.showError('Need at least 3 observations for correlation.');
      return;
    }

    const matrix = [];
    const pMatrix = [];
    selected.forEach((col1, i) => {
      matrix[i] = [];
      pMatrix[i] = [];
      selected.forEach((col2, j) => {
        const d1 = datasets[i].data.slice(0, minLength);
        const d2 = datasets[j].data.slice(0, minLength);
        const r = method === 'pearson' ? Stats.pearsonR(d1, d2) : Stats.spearmanRho(d1, d2);
        const p = Stats.correlationPValue(r, minLength);
        matrix[i][j] = r;
        pMatrix[i][j] = p;
      });
    });

    this.renderResults(selected, matrix, pMatrix, method, datasets, minLength);
  },

  renderResults(labels, matrix, pMatrix, method, datasets, n) {
    const container = document.getElementById('corr-results');
    const matrixId = `corr-matrix-${Date.now()}`;
    const scatterId = `corr-scatter-${Date.now()}`;

    const html = `
      <div class="card fade-in" style="margin-top: 1.5rem;">
        <h3>Correlation Matrix (${method === 'pearson' ? 'Pearson' : 'Spearman'})</h3>
        <div class="chart-container">
          <div id="${matrixId}" class="chart"></div>
        </div>
        <h4>Correlation Values</h4>
        <div class="table-wrapper">
          <table class="stats-table correlation-table">
            <thead>
              <tr>
                <th></th>
                ${labels.map(l => `<th>${l}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${labels.map((l, i) => `
                <tr>
                  <th>${l}</th>
                  ${labels.map((_, j) => {
                    const r = matrix[i][j];
                    const p = pMatrix[i][j];
                    const color = this.getCorrelationColor(r);
                    const rci = i !== j ? Stats.rCI(r, n) : null;
                    return `<td style="background-color: ${color}; color: ${Math.abs(r) > 0.5 ? '#0f1117' : '#e2e8f0'}">
                      ${i === j ? '—' : Stats.formatNumber(r)}${i !== j ? `<br><span class="p-value">${Stats.formatP(p)}</span><br><span class="p-value">[${Stats.formatNumber(rci.lower)}, ${Stats.formatNumber(rci.upper)}]</span>` : ''}
                    </td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <h4>Scatter Plot</h4>
        <div class="form-group">
          <label>Variable 1</label>
          <select id="corr-scatter-x" class="form-select">
            ${labels.map((l, i) => `<option value="${i}">${l}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Variable 2</label>
          <select id="corr-scatter-y" class="form-select">
            ${labels.map((l, i) => `<option value="${i}" ${i === 1 ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-secondary" id="corr-scatter-btn">Update Scatter</button>
        <div id="${scatterId}" class="chart" style="margin-top: 1rem;"></div>
      </div>
    `;

    container.innerHTML = html;

    Charts.plotCorrelationMatrix(matrixId, matrix, labels);

    const updateScatter = () => {
      const xIdx = parseInt(document.getElementById('corr-scatter-x').value);
      const yIdx = parseInt(document.getElementById('corr-scatter-y').value);
      const xData = datasets[xIdx].data.slice(0, n);
      const yData = datasets[yIdx].data.slice(0, n);
      const r = matrix[xIdx][yIdx];
      const regLine = {
        x: [Math.min(...xData), Math.max(...xData)],
        y: [
          Stats.mean(yData) + r * (Stats.std(yData) / Stats.std(xData)) * (Math.min(...xData) - Stats.mean(xData)),
          Stats.mean(yData) + r * (Stats.std(yData) / Stats.std(xData)) * (Math.max(...xData) - Stats.mean(xData))
        ]
      };
      Charts.plotScatter(scatterId, xData, yData, labels[xIdx], labels[yIdx], regLine);
    };

    updateScatter();
    document.getElementById('corr-scatter-btn').addEventListener('click', updateScatter);

    state.sessionResults.push({
      type: 'correlation',
      method,
      labels,
      matrix,
      pMatrix,
      html
    });
  },

  getCorrelationColor(r) {
    const abs = Math.abs(r);
    if (r > 0) {
      const intensity = Math.floor(abs * 200);
      return `rgba(79, 142, 247, ${0.1 + abs * 0.9})`;
    } else {
      return `rgba(239, 68, 68, ${0.1 + abs * 0.9})`;
    }
  },

  showError(message) {
    const container = document.getElementById('corr-results');
    container.innerHTML = `<div class="error-card fade-in"><p>${message}</p></div>`;
  }
};
