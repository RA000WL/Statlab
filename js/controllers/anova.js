const ANOVAController = {
  renderForm() {
    const main = document.getElementById('main-content');
    const continuousCols = DataController.getContinuousColumns();
    const categoricalCols = DataController.getCategoricalColumns();

    if (continuousCols.length === 0 || categoricalCols.length === 0) {
      main.innerHTML = `
        <div class="fade-in">
          <h2>One-Way ANOVA</h2>
          <div class="error-card">
            <p>Need both continuous and categorical variables. Please upload data first.</p>
          </div>
        </div>
      `;
      return;
    }

    main.innerHTML = `
      <div class="fade-in">
        <h2>One-Way ANOVA</h2>
        <div class="card">
          <h3>Select Variables</h3>
          <div class="form-group">
            <label>Dependent Variable (Continuous)</label>
            <select id="anova-dep" class="form-select">
              <option value="">-- Select a variable --</option>
              ${continuousCols.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Factor (Categorical)</label>
            <select id="anova-factor" class="form-select">
              <option value="">-- Select a variable --</option>
              ${categoricalCols.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
          <button class="btn btn-primary" id="anova-compute">Run ANOVA</button>
        </div>
        <div id="anova-results"></div>
      </div>
    `;

    document.getElementById('anova-compute').addEventListener('click', () => {
      this.compute();
    });
  },

  compute() {
    const depName = document.getElementById('anova-dep').value;
    const factorName = document.getElementById('anova-factor').value;

    if (!depName || !factorName) {
      this.showError('Please select both variables.');
      return;
    }

    const groups = DataController.getGroupsByColumn(factorName);
    const groupNames = Object.keys(groups);

    if (groupNames.length < 2) {
      this.showError('Factor must have at least 2 groups.');
      return;
    }

    const groupData = groupNames.map(name => {
      const groupValues = [];
      state.rawData.forEach(row => {
        if (String(row[factorName]) === name) {
          const val = parseFloat(row[depName]);
          if (!isNaN(val)) {
            groupValues.push(val);
          }
        }
      });
      return groupValues;
    });

    const validGroups = groupData.filter(g => g.length >= 2);
    if (validGroups.length < 2) {
      this.showError('At least 2 groups must have 2 or more observations.');
      return;
    }

    const result = Stats.anova(validGroups);
    const groupMeans = validGroups.map((g, i) => ({
      name: groupNames[i],
      n: g.length,
      mean: Stats.mean(g),
      std: Stats.std(g)
    }));

    let tukey = null;
    if (result.p < 0.05 && validGroups.length > 2) {
      tukey = Stats.tukeyHSD(validGroups);
      tukey.groupNames = groupNames;
    }

    const etaCI = Stats.etaSqCI(result.etaSq, result.dfBetween, result.dfWithin, groupData.flat().length);

    this.renderResults(depName, factorName, result, groupMeans, validGroups, groupNames, tukey, etaCI);
  },

  renderResults(depName, factorName, result, groupMeans, validGroups, groupNames, tukey, etaCI) {
    const container = document.getElementById('anova-results');
    const boxId = `anova-box-${Date.now()}`;
    const sigClass = result.p < 0.05 ? 'significant' : 'not-significant';

    let postHocHTML = '';
    if (tukey) {
      postHocHTML = `
        <h4>Post-Hoc Tests (Tukey HSD)</h4>
        <div class="table-wrapper">
          <table class="stats-table">
            <thead>
              <tr><th>Comparison</th><th>Mean Diff</th><th>SE</th><th>q</th><th>p</th><th>Sig.</th></tr>
            </thead>
            <tbody>
              ${tukey.pairwise.map(pw => `
                <tr>
                  <td>${tukey.groupNames[pw.group1]} vs ${tukey.groupNames[pw.group2]}</td>
                  <td>${Stats.formatNumber(pw.meanDiff)}</td>
                  <td>${Stats.formatNumber(pw.se)}</td>
                  <td>${Stats.formatNumber(pw.q)}</td>
                  <td class="${pw.significant ? 'significant' : ''}">${Stats.formatP(pw.p)}</td>
                  <td class="${pw.significant ? 'significant' : ''}">${pw.significant ? '*' : ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else if (result.p < 0.05 && validGroups.length <= 2) {
      postHocHTML = `
        <h4>Post-Hoc Tests</h4>
        <p class="text-muted" style="font-size: 0.875rem;">Only 2 groups — pairwise comparison not needed.</p>
      `;
    }

    const html = `
      <div class="card fade-in" style="margin-top: 1.5rem;">
        <h3>One-Way ANOVA: ${depName} by ${factorName}</h3>
        <h4>ANOVA Summary</h4>
        <div class="table-wrapper">
          <table class="stats-table">
            <thead>
              <tr><th>Source</th><th>SS</th><th>df</th><th>MS</th><th>F</th><th>p-value</th><th>η²</th><th>η² 95% CI</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>Between Groups</td>
                <td>${Stats.formatNumber(result.ssBetween)}</td>
                <td>${result.dfBetween}</td>
                <td>${Stats.formatNumber(result.msBetween)}</td>
                <td>${Stats.formatNumber(result.F)}</td>
                <td class="${sigClass}">${Stats.formatP(result.p)}</td>
                <td>${Stats.formatNumber(result.etaSq)}</td>
                <td>[${Stats.formatNumber(etaCI.lower)}, ${Stats.formatNumber(etaCI.upper)}]</td>
              </tr>
              <tr>
                <td>Within Groups</td>
                <td>${Stats.formatNumber(result.ssWithin)}</td>
                <td>${result.dfWithin}</td>
                <td>${Stats.formatNumber(result.msWithin)}</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
        <h4>Group Means</h4>
        <div class="table-wrapper">
          <table class="stats-table">
            <thead>
              <tr><th>Group</th><th>n</th><th>Mean</th><th>Std Dev</th></tr>
            </thead>
            <tbody>
              ${groupMeans.map(g => `
                <tr>
                  <td>${g.name}</td>
                  <td>${g.n}</td>
                  <td>${Stats.formatNumber(g.mean)}</td>
                  <td>${Stats.formatNumber(g.std)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${postHocHTML}
        <div class="chart-container">
          <div id="${boxId}" class="chart"></div>
        </div>
        <div class="interpretation">
          <p><strong>Interpretation:</strong> A one-way ANOVA was conducted to compare the effect of ${factorName} on ${depName}. The effect was ${Stats.interpretP(result.p)} (F(${result.dfBetween}, ${result.dfWithin}) = ${Stats.formatNumber(result.F)}, p = ${Stats.formatP(result.p)}, η² = ${Stats.formatNumber(result.etaSq)}, 95% CI [${Stats.formatNumber(etaCI.lower)}, ${Stats.formatNumber(etaCI.upper)}]). ${result.etaSq < 0.01 ? 'The effect size is negligible.' : result.etaSq < 0.06 ? 'The effect size is small.' : result.etaSq < 0.14 ? 'The effect size is medium.' : 'The effect size is large.'}${tukey ? ` Post-hoc comparisons using Tukey HSD indicated significant differences between: ${tukey.pairwise.filter(p => p.significant).map(p => `${tukey.groupNames[p.group1]} and ${tukey.groupNames[p.group2]}`).join(', ') || 'none'}.` : ''}</p>
        </div>
      </div>
    `;

    container.innerHTML = html;

    Charts.plotGroupedBoxplot(boxId, validGroups.map((g, i) => ({
      label: groupNames[i],
      data: g
    })));

    state.sessionResults.push({
      type: 'anova',
      dependent: depName,
      factor: factorName,
      result,
      groupMeans,
      tukey,
      etaCI,
      html
    });
  },

  showError(message) {
    const container = document.getElementById('anova-results');
    container.innerHTML = `<div class="error-card fade-in"><p>${message}</p></div>`;
  }
};
