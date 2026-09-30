/* ==========================================================================
   StatLab — js/utils/charts.js
   Theme-aware Plotly wrappers. Every builder returns { traces, layout } so
   the same spec can be re-themed, re-rendered, or exported as a PNG.
   ========================================================================== */
(function (global) {
  'use strict';

  var C = {
    blue: '#2f5bd0', red: '#c8382c', amber: '#b8801a', teal: '#14807a', violet: '#7048b0',
    blueSoft: 'rgba(47,91,208,0.30)', redSoft: 'rgba(200,56,44,0.30)',
    grid: '#dfe3ea', ink: '#1b2330', muted: '#6b7787', paper: '#ffffff',
    zero: '#b9c0cc', tipBg: '#1b2330'
  };

  function theme() {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      dark: dark,
      paper: dark ? '#161b24' : '#ffffff',
      plot: dark ? '#161b24' : '#ffffff',
      ink: dark ? '#e6ebf2' : '#1b2330',
      muted: dark ? '#8b97a8' : '#6b7787',
      grid: dark ? '#2a323f' : '#e6eaf0',
      zero: dark ? '#3d4757' : '#c3cad6',
      series: dark ? ['#7ba0f5', '#f0837a', '#e8b45c', '#5fc9c0', '#a98ae8', '#67c4a0', '#e08fc0', '#c9a86a']
                  : ['#2f5bd0', '#c8382c', '#b8801a', '#14807a', '#7048b0', '#2e7d4f', '#a83a72', '#6b7787']
    };
  }

  function base(t, opts) {
    opts = opts || {};
    return {
      paper_bgcolor: t.plot,
      plot_bgcolor: t.plot,
      font: { family: 'inherit', color: t.ink, size: 12 },
      margin: { l: 56, r: 20, t: opts.title ? 44 : 18, b: opts.marginBottom || 48 },
      title: opts.title ? { text: opts.title, font: { size: 13, color: t.muted }, x: 0.01, xanchor: 'left' } : undefined,
      xaxis: { gridcolor: t.grid, zerolinecolor: t.zero, linecolor: t.grid, tickfont: { color: t.muted, size: 11 }, title: opts.xTitle ? { text: opts.xTitle, font: { color: t.muted, size: 11 } } : undefined },
      yaxis: { gridcolor: t.grid, zerolinecolor: t.zero, linecolor: t.grid, tickfont: { color: t.muted, size: 11 }, title: opts.yTitle ? { text: opts.yTitle, font: { color: t.muted, size: 11 } } : undefined },
      showlegend: !!opts.legend,
      legend: { font: { color: t.muted, size: 11 }, orientation: 'h', y: -0.18, x: 0 },
      hoverlabel: { bgcolor: t.dark ? '#222a36' : C.tipBg, font: { color: '#fff', size: 12 } },
      bargap: 0.25
    };
  }

  function histogram(values, name) {
    var t = theme();
    return {
      traces: [{ type: 'histogram', x: values, name: name, marker: { color: t.series[0], line: { color: t.plot, width: 1 } }, hovertemplate: '%{x}<br>%{y} cases<extra></extra>' }],
      layout: base(t, { title: 'Distribution of ' + name, xTitle: name, yTitle: 'Frequency' })
    };
  }

  function boxplot(values, name) {
    var t = theme();
    return {
      traces: [{ type: 'box', y: values, name: name, marker: { color: t.series[0] }, line: { color: t.muted, width: 1 }, fillcolor: t.series[0] + '22', boxpoints: 'all', jitter: 0.3, pointpos: 0, hovertemplate: '%{y}<extra></extra>' }],
      layout: base(t, { title: 'Boxplot of ' + name, yTitle: name, marginBottom: 30 })
    };
  }

  function groupedBox(groups) {
    var t = theme();
    return {
      traces: groups.map(function (g, i) {
        return {
          type: 'box', y: g.values, name: g.label, marker: { color: t.series[i % t.series.length] },
          line: { color: t.muted, width: 1 }, fillcolor: t.series[i % t.series.length] + '22',
          boxpoints: false, hovertemplate: '%{y}<extra>' + g.label + '</extra>'
        };
      }),
      layout: base(t, { title: 'Distribution by group', legend: true, marginBottom: 70 })
    };
  }

  function bar(labels, values, title, yTitle) {
    var t = theme();
    return {
      traces: [{ type: 'bar', x: labels, y: values, marker: { color: t.series[0], line: { color: t.plot, width: 1 } }, text: values.map(String), textposition: 'outside', textfont: { color: t.muted, size: 11 }, cliponaxis: false, hovertemplate: '%{x}<br>%{y}<extra></extra>' }],
      layout: base(t, { title: title, yTitle: yTitle || 'Count', marginBottom: 70 })
    };
  }

  function pie(labels, values) {
    var t = theme();
    return {
      traces: [{ type: 'pie', labels: labels, values: values, hole: 0.45, marker: { colors: t.series, line: { color: t.plot, width: 1.5 } }, textinfo: 'label+percent', textfont: { size: 11 }, hovertemplate: '%{label}: %{value} (%{percent})<extra></extra>' }],
      layout: base(t, { title: 'Share of responses', legend: true, marginBottom: 90 })
    };
  }

  function correlationHeatmap(matrix, labels) {
    var t = theme();
    return {
      traces: [{
        type: 'heatmap', z: matrix, x: labels, y: labels, zmin: -1, zmax: 1,
        colorscale: [[0, '#2f5bd0'], [0.5, t.dark ? '#2a323f' : '#e6eaf0'], [1, '#c8382c']],
        text: matrix.map(function (row) { return row.map(function (v) { return v.toFixed(2).replace('0.', '.'); }); }),
        texttemplate: '%{text}', textfont: { size: 11, color: t.dark ? '#e6ebf2' : '#1b2330' },
        hovertemplate: '%{y} / %{x}<br>r = %{z:.3f}<extra></extra>', hoverongaps: false
      }],
      layout: base(t, { title: 'Correlation matrix', marginBottom: 80, marginLeft: 90 })
    };
  }

  function scatter(x, y, xName, yName, fit) {
    var t = theme();
    var traces = [{
      type: 'scatter', mode: 'markers', x: x, y: y, name: 'Responses',
      marker: { color: t.series[0], size: 7, opacity: 0.65, line: { color: t.plot, width: 0.5 } },
      hovertemplate: '%{x}, %{y}<extra></extra>'
    }];
    if (fit) {
      traces.push({
        type: 'scatter', mode: 'lines', x: fit.x, y: fit.y, name: 'Fitted line',
        line: { color: t.series[1], width: 2 }
      });
    }
    return {
      traces: traces,
      layout: base(t, { title: yName + ' against ' + xName, xTitle: xName, yTitle: yName, legend: !!fit, marginBottom: fit ? 70 : 48 })
    };
  }

  function stackedBar(rowLabels, colLabels, table) {
    var t = theme();
    return {
      traces: colLabels.map(function (c, j) {
        return { type: 'bar', x: rowLabels, y: table.map(function (r) { return r[j]; }), name: c, marker: { color: t.series[j % t.series.length], line: { color: t.plot, width: 0.5 } }, hovertemplate: c + ': %{y}<extra></extra>' };
      }),
      layout: base(t, { title: 'Contingency table', yTitle: 'Count', legend: true, marginBottom: 80 })
    };
  }

  /** Q-Q plot: sample quantiles against normal theoretical quantiles. */
  function qq(values, name) {
    var t = theme();
    var s = values.slice().sort(function (a, b) { return a - b; });
    var n = s.length;
    var theo = [], obs = [];
    for (var i = 0; i < n; i++) {
      theo.push(Stats.normInv((i + 0.5) / n));
      obs.push(s[i]);
    }
    var m = Stats.mean(obs), sd = Stats.std(obs);
    var z = theo.slice();
    return {
      traces: [
        { type: 'scatter', mode: 'markers', x: theo, y: obs, name: 'Observed', marker: { color: t.series[0], size: 6, opacity: 0.7 }, hovertemplate: 'theoretical %{x:.2f}<br>observed %{y:.2f}<extra></extra>' },
        { type: 'scatter', mode: 'lines', x: z, y: z.map(function (q) { return m + sd * q; }), name: 'Normal reference', line: { color: t.series[1], width: 2, dash: 'dash' } }
      ],
      layout: base(t, { title: 'Normal Q-Q plot: ' + name, xTitle: 'Theoretical quantile', yTitle: 'Observed value', legend: true, marginBottom: 70 })
    };
  }

  /* ------------------------------------------------------------ rendering */

  function config() {
    return { displayModeBar: false, responsive: true, scrollZoom: false };
  }

  function draw(el, spec) {
    if (!el || !global.Plotly) return;
    var layout = JSON.parse(JSON.stringify(spec.layout));
    delete layout.template;
    global.Plotly.react(el, spec.traces, layout, config());
  }

  /** Helper used by controllers: replace an element's content with a plot. */
  function mount(el, spec) {
    if (!el) return;
    el.classList.add('chart');
    draw(el, spec);
  }

  function exportImage(el, width) {
    return global.Plotly.toImage(el, {
      format: 'png', width: width || 900, height: Math.round((width || 900) * 0.52), scale: 2
    });
  }

  /** Re-theme every live plot. Called on theme switch. */
  function redrawAll() {
    document.querySelectorAll('.chart').forEach(function (el) {
      if (el._spec) draw(el, el._spec);
    });
  }

  /** Keep the spec on the element so it survives a theme change. */
  function drawStored(el, spec) {
    if (!el) return;
    el._spec = spec;
    draw(el, spec);
  }

  global.Charts = {
    theme: theme, C: C,
    histogram: histogram, boxplot: boxplot, groupedBox: groupedBox,
    bar: bar, pie: pie, correlationHeatmap: correlationHeatmap,
    scatter: scatter, stackedBar: stackedBar, qq: qq,
    draw: drawStored, mount: mount, exportImage: exportImage, redrawAll: redrawAll
  };
})(window);
