/* ==========================================================================
   StatLab — js/state.js
   Single source of truth for the dataset, detected column types, and the
   list of analyses the student has run this session. Subscribers re-render
   when state changes so no analysis module has to know about the others.
   ========================================================================== */
(function (global) {
  'use strict';

  var listeners = [];

  var state = {
    dataset: null,          // { name, columns: [{name, type, levels}], rows: [[cell,...]] }
    results: [],            // analysis records produced this session
    active: 'data'          // current sidebar section
  };

  var MISSING = ['', 'na', 'n/a', 'nan', 'null', '.', '-', 'missing', '#n/a'];

  function isMissing(v) {
    if (v === null || v === undefined) return true;
    return MISSING.indexOf(String(v).trim().toLowerCase()) !== -1;
  }

  function num(v) {
    if (isMissing(v)) return NaN;
    var n = typeof v === 'number' ? v : Number(String(v).trim().replace(/,/g, ''));
    return isFinite(n) ? n : NaN;
  }

  function subscribe(fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; }

  function emit() { listeners.forEach(function (fn) { fn(state); }); }

  /**
   * Merge a patch into state and notify subscribers.
   * `opts.quiet` updates state without notifying — used by addResult, which
   * runs from inside a controller's own render and must not trigger a
   * re-render of that controller.
   */
  function set(patch, opts) {
    for (var k in patch) if (Object.prototype.hasOwnProperty.call(patch, k)) state[k] = patch[k];
    if (opts && opts.quiet) return;
    emit();
  }

  /* ------------------------------------------------------- type detection */
  /* A column is treated as continuous when almost every non-empty cell parses
     as a number and the values are not a small set of integer codes. The
     second rule is what separates Likert items and gender codes (categorical)
     from measurements like study hours (continuous).                        */

  function detectColumn(values) {
    var nonEmpty = 0, numeric = 0, distinct = Object.create(null), distinctCount = 0;
    var codeLike = 0, allText = true;
    for (var i = 0; i < values.length; i++) {
      var v = values[i];
      if (isMissing(v)) continue;
      nonEmpty++;
      var s = String(v).trim();
      if (!(s in distinct)) { distinct[s] = 1; distinctCount++; }
      if (isFinite(Number(s.replace(/,/g, '')))) numeric++;
      else allText = false;
      // "007", "R01", "S-12": a zero-padded or prefixed code is a label, not a
      // quantity, even though Number() can read part of it.
      if (/^0\d/.test(s) || /^[A-Za-z][A-Za-z]?-?\d/.test(s)) codeLike++;
    }
    if (nonEmpty === 0) return { type: 'categorical', levels: [], numericRatio: 0, distinctCount: 0, nonEmpty: 0 };
    var numericRatio = numeric / nonEmpty;

    // A handful of integer codes (1-5 scale, yes/no, gender) reads as a
    // label rather than a measurement, so it stays categorical.
    var integers = 0;
    for (var j = 0; j < values.length; j++) {
      if (isMissing(values[j])) continue;
      if (/^-?\d+$/.test(String(values[j]).trim())) integers++;
    }
    var allIntegers = integers / nonEmpty > 0.95;
    var smallCodeSet = allIntegers && distinctCount <= 6;

    // A column where almost every value is unique and prefixed ("R001", "S12")
    // is a respondent or record identifier, not a variable to analyse.
    var identifier = codeLike / nonEmpty > 0.9 && distinctCount / nonEmpty > 0.9;

    var type = 'categorical';
    if (identifier) type = 'identifier';
    else if (numericRatio >= 0.9 && !smallCodeSet) type = 'continuous';

    return {
      type: type,
      numericRatio: numericRatio,
      distinctCount: distinctCount,
      nonEmpty: nonEmpty,
      identifier: identifier,
      levels: type === 'categorical' ? Object.keys(distinct).sort() : []
    };
  }

  /** Re-run detection across every column after an edit. */
  function detectAll(names, rows) {
    return names.map(function (name, ci) {
      var col = rows.map(function (r) { return r[ci]; });
      var d = detectColumn(col);
      return {
        name: name, type: d.type, levels: d.levels,
        numericRatio: d.numericRatio, distinctCount: d.distinctCount,
        nonEmpty: d.nonEmpty, identifier: !!d.identifier
      };
    });
  }

  /* ---------------------------------------------------------- data access */

  function values(colName) {
    if (!state.dataset) return [];
    var ci = columnIndex(colName);
    if (ci < 0) return [];
    return state.dataset.rows.map(function (r) { return r[ci]; });
  }

  /** Numeric values of a column, missing cells removed. */
  function numeric(colName) {
    return values(colName).map(num).filter(function (v) { return isFinite(v); });
  }

  /** Column names of a given type. Identifier columns are excluded. */
  function byType(type) {
    if (!state.dataset) return [];
    return state.dataset.columns.filter(function (c) { return c.type === type; }).map(function (c) { return c.name; });
  }

  function continuous() { return byType('continuous'); }
  function categorical() { return byType('categorical'); }
  function identifiers() { return byType('identifier'); }

  function columnIndex(colName) {
    if (!state.dataset) return -1;
    for (var i = 0; i < state.dataset.columns.length; i++) if (state.dataset.columns[i].name === colName) return i;
    return -1;
  }

  /** Groups of numeric values keyed by the level of a categorical column.
      Rows with a missing level or a missing value are dropped pairwise. */
  function groupBy(dependent, factor) {
    var dc = columnIndex(dependent), fc = columnIndex(factor);
    if (dc < 0 || fc < 0) return [];
    var map = Object.create(null), order = [];
    for (var i = 0; i < state.dataset.rows.length; i++) {
      var row = state.dataset.rows[i];
      var level = row[fc], value = num(row[dc]);
      if (isMissing(level) || !isFinite(value)) continue;
      var key = String(level).trim();
      if (!(key in map)) { map[key] = []; order.push(key); }
      map[key].push(value);
    }
    return order.map(function (k) { return { label: k, values: map[k] }; });
  }

  /** Numeric values of two columns zipped, missing cells removed. */
  function pairColumns(a, b) {
    var ai = columnIndex(a), bi = columnIndex(b);
    if (ai < 0 || bi < 0) return { xs: [], ys: [], dropped: 0 };
    var xs = [], ys = [], dropped = 0;
    for (var i = 0; i < state.dataset.rows.length; i++) {
      var x = num(state.dataset.rows[i][ai]), y = num(state.dataset.rows[i][bi]);
      if (isFinite(x) && isFinite(y)) { xs.push(x); ys.push(y); }
      else dropped++;
    }
    return { xs: xs, ys: ys, dropped: dropped };
  }

  function rowCount() { return state.dataset ? state.dataset.rows.length : 0; }
  function colCount() { return state.dataset ? state.dataset.columns.length : 0; }

  /* -------------------------------------------------------------- setters */

  function setDataset(name, columns, rows) {
    var detected = detectAll(columns, rows);
    set({ dataset: { name: name, columns: detected, rows: rows }, results: [] });
  }

  function clearDataset() { set({ dataset: null, results: [] }); }

  function setColumnType(colName, type) {
    if (!state.dataset) return;
    var cols = state.dataset.columns.map(function (c) {
      if (c.name !== colName) return c;
      var levels = type === 'categorical' ? uniqueLevels(state.dataset.rows, colName) : [];
      return {
        name: c.name, type: type, levels: levels,
        numericRatio: c.numericRatio, distinctCount: c.distinctCount,
        nonEmpty: c.nonEmpty, identifier: false
      };
    });
    set({ dataset: Object.assign({}, state.dataset, { columns: cols }) });
  }

  function uniqueLevels(rows, colName) {
    var ci = columnIndex(colName), seen = Object.create(null), out = [];
    for (var i = 0; i < rows.length; i++) {
      var v = rows[i][ci];
      if (isMissing(v)) continue;
      var s = String(v).trim();
      if (!(s in seen)) { seen[s] = 1; out.push(s); }
    }
    return out.sort();
  }

  function updateCell(rowIndex, colName, value) {
    if (!state.dataset) return;
    var ci = columnIndex(colName);
    var rows = state.dataset.rows.map(function (r, i) {
      if (i !== rowIndex) return r.slice();
      var copy = r.slice();
      copy[ci] = value;
      return copy;
    });
    set({ dataset: Object.assign({}, state.dataset, { rows: rows, columns: detectAll(state.dataset.columns.map(function (c) { return c.name; }), rows) }) });
  }

  function addRow() {
    if (!state.dataset) return;
    var blank = state.dataset.columns.map(function () { return ''; });
    set({ dataset: Object.assign({}, state.dataset, { rows: state.dataset.rows.concat([blank]) }) });
  }

  function deleteRow(i) {
    if (!state.dataset) return;
    var rows = state.dataset.rows.filter(function (_, k) { return k !== i; });
    set({ dataset: Object.assign({}, state.dataset, { rows: rows, columns: detectAll(state.dataset.columns.map(function (c) { return c.name; }), rows) }) });
  }

  /* Quiet: controllers call this while rendering, so notifying subscribers here
     would re-enter the router and rebuild the page mid-render. Keyed on analysis
     kind: re-running with different variables refreshes that entry, so the report
     shows what each analysis currently says rather than every intermediate
     selection passed through on the way there. Simple and multiple regression
     are separate kinds, so both are kept. */
  function addResult(record) {
    var sig = record.kind || '';
    var entry = Object.assign({
      id: 'r' + Date.now() + Math.random().toString(36).slice(2, 6),
      at: new Date(),
      sig: sig
    }, record);
    // Refresh in place so the report keeps the order analyses were first run
    // rather than moving an updated result to the end.
    var results = state.results.slice();
    var at = -1;
    for (var i = 0; i < results.length; i++) {
      if (results[i].sig === sig) { at = i; break; }
    }
    if (at === -1) results.push(entry); else results[at] = entry;
    set({ results: results }, { quiet: true });
  }

  function clearResults() { set({ results: [] }); }
  function removeResult(id) {
    set({ results: state.results.filter(function (r) { return r.id !== id; }) });
  }

  function hasData() { return !!(state.dataset && state.dataset.rows.length); }

  function meta() {
    if (!state.dataset) return null;
    var rows = state.dataset.rows, missing = 0, total = rows.length * state.dataset.columns.length;
    for (var i = 0; i < rows.length; i++) for (var j = 0; j < rows[i].length; j++) if (isMissing(rows[i][j])) missing++;
    return {
      name: state.dataset.name,
      rows: rows.length,
      cols: state.dataset.columns.length,
      missing: missing,
      total: total,
      continuous: continuous().length,
      categorical: categorical().length,
      identifiers: identifiers().length
    };
  }

  global.State = {
    get: function () { return state; },
    subscribe: subscribe, set: set, emit: emit,
    isMissing: isMissing, num: num,
    detectColumn: detectColumn,
    values: values, numeric: numeric, byType: byType,
    continuous: continuous, categorical: categorical, identifiers: identifiers,
    columnIndex: columnIndex, groupBy: groupBy, pairColumns: pairColumns,
    rowCount: rowCount, colCount: colCount,
    setDataset: setDataset, clearDataset: clearDataset, setColumnType: setColumnType,
    updateCell: updateCell, addRow: addRow, deleteRow: deleteRow,
    uniqueLevels: uniqueLevels,
    addResult: addResult, clearResults: clearResults, removeResult: removeResult,
    hasData: hasData, meta: meta
  };
})(window);
