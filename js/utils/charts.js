const Charts = {
  getThemeColors() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    return {
      paper_bgcolor: isLight ? '#ffffff' : '#1e2433',
      plot_bgcolor: isLight ? '#f8fafc' : '#1e2433',
      fontColor: isLight ? '#1e293b' : '#e2e8f0',
      gridColor: isLight ? '#e2e8f0' : '#2a3144',
      mainColor: isLight ? '#3b82f6' : '#4f8ef7',
      dangerColor: isLight ? '#dc2626' : '#ef4444'
    };
  },

  getDefaultLayout() {
    const c = this.getThemeColors();
    return {
      paper_bgcolor: c.paper_bgcolor,
      plot_bgcolor: c.plot_bgcolor,
      font: { color: c.fontColor, family: 'DM Sans' },
      margin: { l: 50, r: 20, t: 40, b: 50 },
      xaxis: { gridcolor: c.gridColor, zerolinecolor: c.gridColor },
      yaxis: { gridcolor: c.gridColor, zerolinecolor: c.gridColor }
    };
  },

  defaultConfig: {
    responsive: true,
    displayModeBar: false
  },

  plotHistogram(divId, data, label) {
    const c = this.getThemeColors();
    const trace = {
      x: data,
      type: 'histogram',
      marker: { color: c.mainColor, line: { color: c.paper_bgcolor, width: 1 } },
      opacity: 0.85
    };
    const layout = {
      ...this.getDefaultLayout(),
      title: { text: `Distribution of ${label}`, font: { size: 14, color: c.fontColor } },
      xaxis: { ...this.getDefaultLayout().xaxis, title: label },
      yaxis: { ...this.getDefaultLayout().yaxis, title: 'Frequency' }
    };
    Plotly.newPlot(divId, [trace], layout, this.defaultConfig);
  },

  plotBoxplot(divId, data, labels) {
    const c = this.getThemeColors();
    const trace = {
      y: data,
      type: 'box',
      name: labels || '',
      marker: { color: c.mainColor },
      line: { color: c.fontColor },
      fillcolor: c.mainColor + '33'
    };
    const layout = {
      ...this.getDefaultLayout(),
      title: { text: `Boxplot of ${labels}`, font: { size: 14, color: c.fontColor } },
      yaxis: { ...this.getDefaultLayout().yaxis, title: labels }
    };
    Plotly.newPlot(divId, [trace], layout, this.defaultConfig);
  },

  plotGroupedBoxplot(divId, groups) {
    const c = this.getThemeColors();
    const colors = [c.mainColor, '#22c55e', c.dangerColor, '#f59e0b', '#8b5cf6'];
    const traces = groups.map((group, i) => ({
      y: group.data,
      type: 'box',
      name: group.label,
      marker: { color: colors[i % 5] },
      line: { color: c.fontColor },
      fillcolor: colors[i % 5] + '33'
    }));
    const layout = {
      ...this.getDefaultLayout(),
      title: { text: 'Grouped Boxplot', font: { size: 14, color: c.fontColor } },
      showlegend: false
    };
    Plotly.newPlot(divId, traces, layout, this.defaultConfig);
  },

  plotBarChart(divId, labels, values) {
    const c = this.getThemeColors();
    const trace = {
      x: labels,
      y: values,
      type: 'bar',
      marker: { color: c.mainColor },
      text: values.map(v => v.toFixed(1)),
      textposition: 'auto',
      textfont: { color: c.fontColor }
    };
    const layout = {
      ...this.getDefaultLayout(),
      title: { text: 'Frequency Distribution', font: { size: 14, color: c.fontColor } },
      xaxis: { ...this.getDefaultLayout().xaxis, title: 'Value' },
      yaxis: { ...this.getDefaultLayout().yaxis, title: 'Count' }
    };
    Plotly.newPlot(divId, [trace], layout, this.defaultConfig);
  },

  plotPieChart(divId, labels, values) {
    const c = this.getThemeColors();
    const trace = {
      labels: labels,
      values: values,
      type: 'pie',
      hole: 0.4,
      marker: {
        colors: [c.mainColor, '#22c55e', c.dangerColor, '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']
      },
      textinfo: 'label+percent',
      textfont: { color: c.fontColor }
    };
    const layout = {
      ...this.getDefaultLayout(),
      title: { text: 'Distribution', font: { size: 14, color: c.fontColor } },
      showlegend: true,
      legend: { font: { color: c.fontColor } }
    };
    Plotly.newPlot(divId, [trace], layout, this.defaultConfig);
  },

  plotCorrelationMatrix(divId, matrix, labels) {
    const c = this.getThemeColors();
    const trace = {
      z: matrix,
      x: labels,
      y: labels,
      type: 'heatmap',
      colorscale: [
        [0, c.dangerColor],
        [0.5, '#ffffff'],
        [1, c.mainColor]
      ],
      zmin: -1,
      zmax: 1,
      text: matrix.map(row => row.map(v => v.toFixed(3))),
      texttemplate: '%{text}',
      textfont: { color: c.paper_bgcolor },
      hoverongaps: false
    };
    const layout = {
      ...this.getDefaultLayout(),
      title: { text: 'Correlation Matrix', font: { size: 14, color: c.fontColor } },
      xaxis: { ...this.getDefaultLayout().xaxis, tickangle: -45 },
      yaxis: { ...this.getDefaultLayout().yaxis, autorange: 'reversed' },
      margin: { l: 80, r: 20, t: 40, b: 80 }
    };
    Plotly.newPlot(divId, [trace], layout, this.defaultConfig);
  },

  plotScatter(divId, x, y, xLabel, yLabel, regressionLine) {
    const c = this.getThemeColors();
    const traces = [{
      x: x,
      y: y,
      mode: 'markers',
      type: 'scatter',
      marker: { color: c.mainColor, size: 6, opacity: 0.7 },
      name: 'Data'
    }];
    if (regressionLine) {
      traces.push({
        x: regressionLine.x,
        y: regressionLine.y,
        mode: 'lines',
        type: 'scatter',
        line: { color: c.dangerColor, width: 2 },
        name: 'Regression Line'
      });
    }
    const layout = {
      ...this.getDefaultLayout(),
      title: { text: `${yLabel} vs ${xLabel}`, font: { size: 14, color: c.fontColor } },
      xaxis: { ...this.getDefaultLayout().xaxis, title: xLabel },
      yaxis: { ...this.getDefaultLayout().yaxis, title: yLabel },
      showlegend: regressionLine ? true : false,
      legend: { font: { color: c.fontColor } }
    };
    Plotly.newPlot(divId, traces, layout, this.defaultConfig);
  },

  plotStackedBar(divId, contingencyTable, rowLabels, colLabels) {
    const c = this.getThemeColors();
    const traces = colLabels.map((col, i) => ({
      x: rowLabels,
      y: contingencyTable.map(row => row[i]),
      name: col,
      type: 'bar'
    }));
    const layout = {
      ...this.getDefaultLayout(),
      title: { text: 'Contingency Table', font: { size: 14, color: c.fontColor } },
      barmode: 'stack',
      xaxis: { ...this.getDefaultLayout().xaxis },
      yaxis: { ...this.getDefaultLayout().yaxis, title: 'Count' },
      legend: { font: { color: c.fontColor } }
    };
    Plotly.newPlot(divId, traces, layout, this.defaultConfig);
  },

  plotQQ(divId, data, label) {
    const c = this.getThemeColors();
    const n = data.length;
    const sorted = [...data].sort((a, b) => a - b);
    const theoretical = [];
    const observed = [];
    for (let i = 0; i < n; i++) {
      const p = (i + 0.5) / n;
      const z = this._invNorm(p);
      theoretical.push(z);
      observed.push(sorted[i]);
    }
    const mean = observed.reduce((a, b) => a + b, 0) / n;
    const sd = Math.sqrt(observed.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1));
    const lineX = [-3, 3];
    const lineY = sd === 0 ? [mean, mean] : [mean - 3 * sd, mean + 3 * sd];

    const traces = [
      {
        x: theoretical,
        y: observed,
        mode: 'markers',
        type: 'scatter',
        marker: { color: c.mainColor, size: 6, opacity: 0.7 },
        name: 'Data'
      },
      {
        x: lineX,
        y: lineY,
        mode: 'lines',
        type: 'scatter',
        line: { color: c.dangerColor, width: 2, dash: 'dash' },
        name: 'Normal'
      }
    ];
    const layout = {
      ...this.getDefaultLayout(),
      title: { text: `Q-Q Plot: ${label}`, font: { size: 14, color: c.fontColor } },
      xaxis: { ...this.getDefaultLayout().xaxis, title: 'Theoretical Quantiles' },
      yaxis: { ...this.getDefaultLayout().yaxis, title: 'Sample Quantiles' },
      showlegend: true,
      legend: { font: { color: c.fontColor } }
    };
    Plotly.newPlot(divId, traces, layout, this.defaultConfig);
  },

  _invNorm(p) {
    if (p <= 0) return -4;
    if (p >= 1) return 4;
    if (p === 0.5) return 0;
    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
      1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
      6.680131188771972e+01, -1.328068155288572e+01];
    const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
      -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];

    const pLow = 0.02425, pHigh = 1 - pLow;
    let q, r2;
    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
             ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
    } else if (p <= pHigh) {
      q = p - 0.5;
      r2 = q * q;
      return (((((a[0]*r2+a[1])*r2+a[2])*r2+a[3])*r2+a[4])*r2+a[5])*q /
             (((((b[0]*r2+b[1])*r2+b[2])*r2+b[3])*r2+b[4])*r2+1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
              ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
    }
  }
};
