/* ==========================================================================
   StatLab — js/controllers/data.js
   Upload (CSV / XLSX), type detection, preview, in-browser editing,
   sample dataset, and CSV export.
   ========================================================================== */
(function (global) {
  'use strict';

  var el = UI.el;

  var PREVIEW_ROWS = 60;

  /* -------------------------------------------------------------- parsing */

  /** RFC-4180-ish CSV reader that handles quotes, embedded commas and newlines. */
  function parseCSV(text) {
    var delim = detectDelimiter(text);
    var rows = [], row = [], field = '', i = 0, inQuotes = false;
    while (i < text.length) {
      var ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        field += ch; i++; continue;
      }
      if (ch === '"') { inQuotes = true; i++; continue; }
      if (ch === delim) { row.push(field); field = ''; i++; continue; }
      if (ch === '\r') { i++; continue; }
      if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
      field += ch; i++;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return String(c).trim() !== ''; }); });
  }

  function detectDelimiter(text) {
    var head = text.split(/\r?\n/).slice(0, 5).join('\n');
    var counts = { ',': 0, ';': 0, '\t': 0, '|': 0 };
    var inQ = false;
    for (var i = 0; i < head.length; i++) {
      var c = head[i];
      if (c === '"') inQ = !inQ;
      else if (!inQ && counts[c] !== undefined) counts[c]++;
    }
    var best = ',', bestN = -1;
    Object.keys(counts).forEach(function (k) { if (counts[k] > bestN) { bestN = counts[k]; best = k; } });
    return bestN > 0 ? best : ',';
  }

  /** Turn a SheetJS array-of-arrays into { columns, rows }. */
  function fromAOA(aoa) {
    var trimmed = aoa.filter(function (r) {
      return r && r.some(function (c) { return c !== null && c !== undefined && String(c).trim() !== ''; });
    });
    if (!trimmed.length) throw new Error('That file has no rows.');
    var header = trimmed[0].map(function (h, i) {
      var s = h === null || h === undefined ? '' : String(h).trim();
      return s || ('Column' + (i + 1));
    });
    // Guarantee unique names so lookups by column name stay unambiguous.
    var seen = Object.create(null);
    header = header.map(function (h) {
      if (seen[h]) { var n = h + '_' + (seen[h] + 1); seen[h]++; return n; }
      seen[h] = 1;
      return h;
    });
    var rows = trimmed.slice(1).map(function (r) {
      return header.map(function (_, i) {
        var v = r[i];
        if (v === null || v === undefined) return '';
        if (v instanceof Date) return v.toISOString().slice(0, 10);
        return String(v).trim();
      });
    });
    return { columns: header, rows: rows };
  }

  function readFile(file) {
    return new Promise(function (resolve, reject) {
      var name = file.name.toLowerCase();
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('Could not read that file.')); };
      reader.onload = function (e) {
        try {
          if (/\.(csv|txt|tsv)$/.test(name)) {
            resolve(fromAOA(parseCSV(String(e.target.result))));
          } else if (/\.xlsx?$/.test(name)) {
            if (!global.XLSX) throw new Error('The Excel library did not load. Check your connection and reload.');
            var wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
            var sheet = wb.Sheets[wb.SheetNames[0]];
            resolve(fromAOA(XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' })));
          } else {
            reject(new Error('StatLab reads .csv and .xlsx files. Choose one of those.'));
          }
        } catch (err) { reject(err); }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  /* ------------------------------------------------------ sample dataset */
  /* A small synthetic survey, so a student can try every analysis before
     uploading anything of their own. */
  function sampleData() {
    var levels = {
      gender: ['Female', 'Male', 'Other'],
      faculty: ['BICT', 'Education', 'Management', 'Science'],
      year: ['1', '2', '3', '4'],
      library: ['Never', 'Rarely', 'Sometimes', 'Often'],
      job: ['No', 'Yes'],
      device: ['Mobile', 'Laptop', 'Both']
    };
    // Deterministic pseudo-random so the sample is identical for everyone.
    var seed = 20260930;
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function gauss() { return (rnd() + rnd() + rnd() + rnd() + rnd() + rnd() - 3) / Math.sqrt(0.5); }

    var rows = [];
    for (var i = 0; i < 120; i++) {
      var gender = pick(levels.gender);
      var faculty = pick(levels.faculty);
      var year = pick(levels.year);
      var study = clamp(Math.round(3.4 + gauss() * 1.5 + (4 - Number(year)) * 0.28), 0, 12);
      var social = clamp(Math.round(3.1 + gauss() * 1.7), 0, 9);
      var sleep = clamp(+(6.9 - social * 0.16 + gauss() * 0.75).toFixed(1), 3, 10);
      var library = pick(levels.library);
      var job = rnd() < 0.24 ? 'Yes' : 'No';
      var device = pick(levels.device);
      // Exam score is built from study hours, sleep, and social media use so
      // the dataset has relationships worth finding.
      var gpa = clamp(2.55 + study * 0.135 - social * 0.115 + (sleep - 7) * 0.16 + (library === 'Often' ? 0.16 : 0) + gauss() * 0.42, 1.4, 4.1);
      rows.push([
        'R' + String(i + 1).padStart(3, '0'),
        gender, faculty, year,
        String(study), String(social), String(sleep), String(gpa.toFixed(2)),
        library, job, device
      ]);
    }
    return {
      columns: ['Respondent', 'Gender', 'Faculty', 'Year', 'Study_Hours', 'Social_Media_Hours', 'Sleep_Hours', 'GPA', 'Library_Use', 'Part_Time_Job', 'Main_Device'],
      rows: rows
    };
  }

  /* ------------------------------------------------------------ rendering */

  function render(host) {
    UI.clear(host);
    if (!State.hasData()) { host.appendChild(uploadPanel()); return; }
    host.appendChild(datasetPanel());
  }

  function uploadPanel() {
    var drop = el('div', { class: 'dropzone', tabindex: '0', role: 'button' }, [
      el('div', { class: 'dropzone-inner' }, [
        el('p', { class: 'dropzone-title', text: 'Drop a CSV or Excel file here' }),
        el('p', { class: 'dropzone-sub', text: 'or press Enter to choose a file' }),
        el('p', { class: 'dropzone-note', text: 'Everything is read in your browser. Nothing is uploaded to a server.' })
      ])
    ]);
    var fileInput = el('input', { type: 'file', accept: '.csv,.txt,.tsv,.xlsx,.xls', class: 'visually-hidden' });
    var status = el('div', { class: 'upload-status' });

    function handle(file) {
      if (!file) return;
      status.textContent = 'Reading ' + file.name + '…';
      readFile(file).then(function (parsed) {
        if (!parsed.rows.length) { status.textContent = 'That file has a header but no data rows.'; return; }
        State.setDataset(file.name.replace(/\.[^.]+$/, ''), parsed.columns, parsed.rows);
      }).catch(function (err) {
        status.innerHTML = '';
        status.appendChild(UI.note('error', err.message));
      });
    }

    drop.addEventListener('click', function () { fileInput.click(); });
    drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });
    fileInput.addEventListener('change', function () { handle(fileInput.files[0]); });
    ['dragenter', 'dragover'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('dragging'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('dragging'); });
    });
    drop.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files.length) handle(e.dataTransfer.files[0]);
    });

    var sample = sampleData();
    return el('div', { class: 'stack' }, [
      el('div', { class: 'page-head' }, [
        el('h2', { class: 'page-title', text: 'Start with your data' }),
        el('p', { class: 'page-lede', text: 'Upload a file, or load a sample survey to see how StatLab works.' })
      ]),
      drop, fileInput, status,
      UI.buttonRow([
        UI.button('Load sample survey', function () {
          State.setDataset('Sample student survey', sample.columns, sample.rows);
        }, 'ghost'),
        UI.button('Clear data', function () { State.clearDataset(); }, 'ghost')
      ]),
      UI.card('What StatLab expects', [
        el('ul', { class: 'bullets' }, [
          el('li', { text: 'One row per respondent, one column per variable.' }),
          el('li', { text: 'A header row naming each variable. Names become the labels in every table, so keep them short.' }),
          el('li', { text: 'Leave a cell empty (or type NA) when a value is missing. StatLab drops that pair rather than guessing.' }),
          el('li', { text: 'Text columns are treated as categories. Numeric columns are treated as measurements. You can change any of this below.' })
        ])
      ], 'read this first')
    ]);
  }

  function datasetPanel() {
    var m = State.meta();
    var ds = State.get().dataset;
    var head = el('div', { class: 'page-head' }, [
      el('h2', { class: 'page-title', text: m.name }),
      el('p', { class: 'page-lede' }, [
        m.rows + ' rows × ' + m.cols + ' columns · ',
        m.continuous + ' continuous, ' + m.categorical + ' categorical' +
          (m.identifiers ? ', ' + m.identifiers + ' identifier' + (m.identifiers === 1 ? '' : 's') : '') +
          ' · ',
        m.missing === 0 ? 'no missing values' : (m.missing + ' missing cells')
      ])
    ]);

    var typeCard = UI.card('Variable types', [typeTable()], 'StatLab guesses these from your values. Change one if the guess is wrong.');
    var preview = previewTable();
    return el('div', { class: 'stack' }, [
      head,
      UI.buttonRow([
        UI.button('Replace data', function () { State.clearDataset(); }, 'ghost'),
        UI.button('Add row', function () { State.addRow(); }),
        UI.button('Delete last row', function () { State.deleteRow(State.rowCount() - 1); }, 'ghost'),
        UI.button('Download as CSV', function () { exportCSV(); }, 'ghost'),
        UI.button('Remove dataset', function () { State.clearDataset(); }, 'ghost danger')
      ]),
      typeCard,
      preview
    ]);
  }

  function typeTable() {
    var ds = State.get().dataset;
    var rows = ds.columns.map(function (c, ci) {
      // Compare the stored type against a fresh read of the same column.
      var guess = State.detectColumn(ds.rows.map(function (r) { return r[ci]; }));
      return { name: c.name, type: c.type, detail: typeDetail(c), guess: guess.type };
    });
    var cols = [
      { key: 'name', label: 'Variable', align: 'left', mono: false },
      { key: 'type', label: 'Use as', align: 'left', mono: false, render: function (r) {
          return UI.select(
            [{ value: 'continuous', label: 'Continuous (measure)' },
             { value: 'categorical', label: 'Categorical (group)' },
             { value: 'identifier', label: 'Identifier (exclude from analysis)' }],
            r.type,
            function (v) { State.setColumnType(r.name, v); },
            { class: 'input input-sm', 'aria-label': 'Type for ' + r.name }
          );
        }
      },
      { key: 'detail', label: 'Detected', align: 'left', mono: false },
      { key: 'guess', label: 'StatLab read it as', align: 'left', mono: false, render: function (r) {
          var cls = r.guess === 'continuous' ? 'tag-cont' : r.guess === 'identifier' ? 'tag-id' : 'tag-cat';
          return el('span', { class: 'tag ' + cls, text: r.guess });
        }
      }
    ];
    return UI.table(cols, rows);
  }

  function typeDetail(c) {
    if (c.type === 'continuous') return c.nonEmpty + ' numbers';
    if (c.type === 'identifier') return c.distinctCount + ' unique labels';
    return c.levels.length + ' level' + (c.levels.length === 1 ? '' : 's');
  }

  function previewTable() {
    var ds = State.get().dataset;
    var limit = Math.min(ds.rows.length, PREVIEW_ROWS);
    var rows = [];
    for (var i = 0; i < limit; i++) rows.push({ i: i, cells: ds.rows[i] });
    var cols = [{ key: 'i', label: '#', mono: true }].concat(ds.columns.map(function (c, ci) {
      return {
        key: 'c' + ci, label: c.name, align: 'left', mono: false, render: function (r) {
          return el('input', {
            class: 'cell-input' + (c.type === 'continuous' ? ' is-num' : ''),
            value: r.cells[ci],
            'aria-label': c.name + ' row ' + (r.i + 1),
            onchange: function (e) { State.updateCell(r.i, c.name, e.target.value); },
            onkeydown: function (e) { if (e.key === 'Enter') e.target.blur(); }
          });
        }
      };
    }));
    var caption = ds.rows.length > limit
      ? 'Showing the first ' + limit + ' of ' + ds.rows.length + ' rows. Edits apply immediately; analyses always use the full dataset.'
      : 'Edit any cell to correct your data. Analyses use all ' + ds.rows.length + ' rows.';
    return UI.card('Data preview', [UI.table(cols, rows)], caption);
  }

  function exportCSV() {
    var ds = State.get().dataset;
    var esc = function (v) {
      var s = String(v === null || v === undefined ? '' : v);
      return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    var lines = [ds.columns.map(function (c) { return esc(c.name); }).join(',')];
    ds.rows.forEach(function (r) { lines.push(r.map(esc).join(',')); });
    UI.download((ds.name.replace(/\s+/g, '-').toLowerCase() || 'statlab-data') + '.csv', lines.join('\r\n'), 'text/csv;charset=utf-8');
  }

  global.DataController = { render: render, sampleData: sampleData, parseCSV: parseCSV };
})(window);
