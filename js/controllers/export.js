/* ==========================================================================
   StatLab — js/controllers/export.js
   Builds a standalone HTML report of every analysis run this session, with
   chart images embedded as base64 PNG so the file works offline.
   ========================================================================== */
(function (global) {
  'use strict';

  var el = UI.el;

  function render(host) {
    UI.clear(host);
    host.appendChild(el('div', { class: 'page-head' }, [
      el('h2', { class: 'page-title', text: 'Report' }),
      el('p', { class: 'page-lede', text: 'Collect every analysis you have run and save it as one shareable HTML file.' })
    ]));

    var results = State.get().results.slice();
    var m = State.meta();

    if (!results.length) {
      host.appendChild(UI.empty('No analyses yet. Run a test from any other section and it will be collected here.',
        UI.button('Back to Data', function () { App.go('data'); }, 'ghost')));
      return;
    }

    var summary = UI.card('Session summary', [
      UI.statGrid([
        ['Analyses', String(results.length)],
        ['Dataset', m ? m.name : '—'],
        ['Rows', m ? String(m.rows) : '—'],
        ['Columns', m ? String(m.cols) : '—']
      ]),
      UI.table([
        { key: 'n', label: '#' },
        { key: 'kind', label: 'Analysis', align: 'left', mono: false },
        { key: 'title', label: 'Variables', align: 'left', mono: false },
        { key: 'meta', label: 'Detail', align: 'left', mono: false }
      ], results.map(function (r, i) {
        return { n: i + 1, kind: r.kind, title: r.title, meta: r.meta || '' };
      }), { rowClass: function () { return 'row-total'; } })
    ]);

    var actions = UI.card('Export', [
      el('p', { class: 'muted', text: 'The report is a single self-contained HTML file. Charts are embedded as images, so it opens on any computer with no internet and no software to install.' }),
      UI.buttonRow([
        UI.button('Download HTML report', build, 'primary'),
        UI.button('Download as Markdown', downloadMarkdown, 'ghost'),
        UI.button('Clear all results', function () { State.clearResults(); }, 'ghost danger')
      ])
    ]);

    var preview = el('div', { class: 'stack' });
    results.forEach(function (r) {
      preview.appendChild(resultCard(r));
    });

    host.appendChild(el('div', { class: 'stack' }, [summary, actions, el('h3', { class: 'section-head', text: 'Analyses in this session' }), preview]));
  }

  function resultCard(r) {
    var body = [];
    if (r.table && r.table.length) {
      body.push(UI.table(
        [{ key: 'k', label: r.table[0][0] || 'Statistic', align: 'left', mono: false },
         { key: 'v', label: r.table[0][1] || 'Value', align: 'left', mono: false }],
        r.table.slice(1).map(function (row) { return { k: row[0], v: row[1] }; })
      ));
    }
    if (r.narrative) body.push(UI.interpretation(r.narrative));
    if (r.chart) body.push(UI.chartBox(r.chart));
    return UI.card(r.kind, body, r.meta);
  }

  /* ---------------------------------------------------------- HTML build */

  function build() {
    var results = State.get().results;
    var m = State.meta();
    var btn = document.querySelector('#export-build');
    if (btn) { btn.disabled = true; btn.textContent = 'Building report…'; }

    // Charts must be rendered somewhere before they can be turned into images.
    var scratch = el('div', { class: 'scratch', style: 'position:fixed;left:-99999px;top:0;width:1000px;' });
    document.body.appendChild(scratch);

    var jobs = results.map(function (r) {
      if (!r.chart) return Promise.resolve(null);
      var holder = el('div', { style: 'width:1000px;height:520px;' });
      scratch.appendChild(holder);
      return new Promise(function (resolve) {
        // The report is a printed-style document, so the chart is re-themed to
        // a light palette regardless of the current on-screen theme.
        var spec = JSON.parse(JSON.stringify(r.chart));
        if (spec.layout) {
          spec.layout.paper_bgcolor = '#ffffff';
          spec.layout.plot_bgcolor = '#ffffff';
          if (spec.layout.font) spec.layout.font.color = '#1b2330';
          if (spec.layout.hoverlabel) delete spec.layout.hoverlabel;
          ['xaxis', 'yaxis'].forEach(function (ax) {
            if (spec.layout[ax]) {
              spec.layout[ax].gridcolor = '#e6eaf0';
              spec.layout[ax].tickfont = { color: '#6b7787' };
            }
          });
          if (spec.layout.legend) spec.layout.legend.font = { color: '#6b7787' };
        }
        if (spec.layout && spec.layout.title) spec.layout.title = { text: '', font: { color: '#6b7787' } };
        Plotly.newPlot(holder, spec.traces, spec.layout, { displayModeBar: false, staticPlot: true })
          .then(function () { return Charts.exportImage(holder, 1000); })
          .then(function (url) { resolve({ id: r.id, url: url }); })
          .catch(function () { resolve(null); });
      });
    });

    Promise.all(jobs).then(function (images) {
      document.body.removeChild(scratch);
      var map = {};
      images.forEach(function (im) { if (im) map[im.id] = im.url; });
      var html = reportHtml(results, m, map);
      var slug = (m && m.name ? m.name : 'statlab').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      UI.download('statlab-report-' + slug + '.html', html, 'text/html;charset=utf-8');
      if (btn) { btn.disabled = false; btn.textContent = 'Download HTML report'; }
    });
  }

  function reportCss() {
    return [
      ':root{--ink:#16202e;--muted:#5c6a7c;--rule:#dde3ec;--accent:#2f5bd0;--bg:#f6f8fb;--card:#fff}',
      '*{box-sizing:border-box}',
      'body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 "Segoe UI",system-ui,-apple-system,sans-serif}',
      '.wrap{max-width:900px;margin:0 auto;padding:40px 24px 80px}',
      'header.doc{border-bottom:2px solid var(--ink);padding-bottom:20px;margin-bottom:32px}',
      '.brand{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);font-weight:700}',
      'h1{font-size:30px;margin:8px 0 6px;letter-spacing:-.01em}',
      '.sub{color:var(--muted);font-size:14px;margin:0}',
      '.facts{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}',
      '.fact{background:#fff;border:1px solid var(--rule);border-radius:6px;padding:6px 12px;font-size:13px}',
      '.fact b{font-variant-numeric:tabular-nums}',
      'section{background:var(--card);border:1px solid var(--rule);border-radius:8px;padding:22px 24px;margin-bottom:20px}',
      'h2{font-size:19px;margin:0 0 4px}',
      '.kind{color:var(--accent);font-size:12px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;margin:0 0 2px}',
      '.meta{color:var(--muted);font-size:13px;margin:0 0 16px}',
      'h3{font-size:15px;margin:22px 0 8px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}',
      'table{width:100%;border-collapse:collapse;font-size:14px;margin:4px 0 8px}',
      'th,td{padding:7px 10px;text-align:left;border-bottom:1px solid var(--rule)}',
      'thead th{border-bottom:2px solid var(--ink);font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}',
      'tbody td{font-variant-numeric:tabular-nums}',
      'tbody td:first-child{font-variant-numeric:normal;color:var(--muted)}',
      'p.narr{background:#f2f6fd;border-left:3px solid var(--accent);padding:12px 16px;margin:14px 0 0;font-size:15px;border-radius:0 6px 6px 0}',
      'img.chart{display:block;width:100%;height:auto;margin-top:14px;border:1px solid var(--rule);border-radius:6px}',
      'footer{color:var(--muted);font-size:13px;text-align:center;padding-top:24px;border-top:1px solid var(--rule)}',
      '@media print{body{background:#fff}.wrap{max-width:none;padding:0}section{break-inside:avoid;border-color:#bbb}header.doc{break-after:avoid}}'
    ].join('');
  }

  function reportHtml(results, m, images) {
    var E = UI.escapeHtml;
    var sections = results.map(function (r, i) {
      var table = '';
      if (r.table && r.table.length) {
        table = '<h3>Results</h3><table><thead><tr><th>' + E(r.table[0][0] || 'Statistic') +
          '</th><th>' + E(r.table[0][1] || 'Value') + '</th></tr></thead><tbody>' +
          r.table.slice(1).map(function (row) {
            return '<tr><td>' + E(row[0]) + '</td><td>' + E(row[1]) + '</td></tr>';
          }).join('') + '</tbody></table>';
      }
      var narrative = r.narrative ? '<p class="narr">' + E(r.narrative) + '</p>' : '';
      var img = images[r.id] ? '<img class="chart" alt="' + E(r.kind) + ' chart" src="' + images[r.id] + '">' : '';
      return '<section><p class="kind">' + (i + 1) + '. ' + E(r.kind) + '</p><h2>' + E(r.title) + '</h2>' +
        (r.meta ? '<p class="meta">' + E(r.meta) + '</p>' : '') + table + narrative + img + '</section>';
    }).join('');

    var toc = results.map(function (r, i) {
      return '<li>' + (i + 1) + '. ' + E(r.kind) + ' — ' + E(r.title) + '</li>';
    }).join('');

    return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
      '<title>StatLab report' + (m ? ' — ' + E(m.name) : '') + '</title>\n' +
      '<style>' + reportCss() + '</style>\n</head>\n<body>\n<div class="wrap">\n' +
      '<header class="doc">\n<p class="brand">StatLab</p>\n<h1>Statistical analysis report</h1>\n' +
      '<p class="sub">Generated ' + E(new Date().toLocaleString()) + '</p>\n' +
      '<div class="facts">' +
      (m ? '<span class="fact">Dataset <b>' + E(m.name) + '</b></span>' : '') +
      (m ? '<span class="fact">Rows <b>' + m.rows + '</b></span>' : '') +
      (m ? '<span class="fact">Variables <b>' + m.cols + '</b></span>' : '') +
      '<span class="fact">Analyses <b>' + results.length + '</b></span>' +
      '</div>\n</header>\n' +
      (toc ? '<section><p class="kind">Contents</p><h2>Analyses in this report</h2><ol>' + toc + '</ol></section>' : '') +
      sections +
      '<footer>Produced with <strong>StatLab</strong> — a browser-based statistical tool for undergraduate research. All data was processed in the browser and never uploaded to a server.</footer>\n' +
      '</div>\n</body>\n</html>';
  }

  function downloadMarkdown() {
    var results = State.get().results;
    var m = State.meta();
    var L = [];
    L.push('# StatLab analysis report');
    L.push('');
    L.push('_Generated ' + new Date().toLocaleString() + '_');
    L.push('');
    if (m) {
      L.push('- **Dataset:** ' + m.name);
      L.push('- **Rows:** ' + m.rows);
      L.push('- **Variables:** ' + m.cols);
    }
    L.push('- **Analyses:** ' + results.length);
    L.push('');
    results.forEach(function (r, i) {
      L.push('## ' + (i + 1) + '. ' + r.kind);
      L.push('');
      L.push('**' + r.title + '**' + (r.meta ? ' — ' + r.meta : ''));
      L.push('');
      if (r.table && r.table.length > 1) {
        L.push('| ' + (r.table[0][0] || 'Statistic') + ' | ' + (r.table[0][1] || 'Value') + ' |');
        L.push('| --- | --- |');
        r.table.slice(1).forEach(function (row) {
          L.push('| ' + String(row[0]).replace(/\|/g, '\\|') + ' | ' + String(row[1]).replace(/\|/g, '\\|') + ' |');
        });
        L.push('');
      }
      if (r.narrative) { L.push('> ' + r.narrative); L.push(''); }
    });
    L.push('---');
    L.push('Produced with StatLab. All data was processed in the browser and never uploaded to a server.');
    UI.download('statlab-report.md', L.join('\n'), 'text/markdown;charset=utf-8');
  }

  global.ExportController = { render: render, reportHtml: reportHtml, reportCss: reportCss };
})(window);
