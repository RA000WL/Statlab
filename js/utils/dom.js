/* ==========================================================================
   StatLab — js/utils/dom.js
   Small DOM helpers shared by every controller. Builds elements from a plain
   description so controllers stay readable and XSS-safe: all text goes
   through textContent, never innerHTML.
   ========================================================================== */
(function (global) {
  'use strict';

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k === 'html') node.innerHTML = v;   // only ever used with literals we author
        else if (k === 'dataset') Object.keys(v).forEach(function (d) { node.dataset[d] = v[d]; });
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);
        else if (v === true) node.setAttribute(k, '');
        else node.setAttribute(k, v);
      });
    }
    append(node, children);
    return node;
  }

  function append(parent, children) {
    if (children === null || children === undefined) return parent;
    (Array.isArray(children) ? children : [children]).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      parent.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return parent;
  }

  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); return node; }

  /* ------------------------------------------------------------- controls */

  /**
   * A labelled control row. `control` is the input element.
   * `hint` renders as small help text under the control.
   */
  function field(labelText, control, hint) {
    return el('div', { class: 'field' }, [
      el('label', { class: 'field-label', text: labelText }),
      control,
      hint ? el('p', { class: 'field-hint', text: hint }) : null
    ]);
  }

  function select(options, value, onchange, attrs) {
    var s = el('select', Object.assign({ class: 'input' }, attrs || {}));
    options.forEach(function (o) {
      var opt = el('option', { value: o.value, text: o.label });
      if (String(o.value) === String(value)) opt.selected = true;
      s.appendChild(opt);
    });
    if (onchange) s.addEventListener('change', function () { onchange(s.value); });
    return s;
  }

  /** Multi-select with checkbox rows; better for choosing several variables. */
  function checkboxList(options, selected, onchange) {
    var wrap = el('div', { class: 'checklist' });
    options.forEach(function (o) {
      var id = 'chk_' + Math.random().toString(36).slice(2, 9);
      var input = el('input', { type: 'checkbox', id: id, value: o.value });
      if (selected.indexOf(o.value) !== -1) input.checked = true;
      input.addEventListener('change', onchange);
      wrap.appendChild(el('label', { class: 'checkitem', for: id }, [input, el('span', { text: o.label })]));
    });
    return wrap;
  }

  function radioList(name, options, value, onchange) {
    var wrap = el('div', { class: 'checklist' });
    options.forEach(function (o) {
      var id = 'rad_' + name + '_' + Math.random().toString(36).slice(2, 7);
      var input = el('input', { type: 'radio', name: name, id: id, value: o.value });
      if (String(o.value) === String(value)) input.checked = true;
      input.addEventListener('change', function () { onchange(o.value); });
      wrap.appendChild(el('label', { class: 'checkitem', for: id }, [input, el('span', { text: o.label })]));
    });
    return wrap;
  }

  function button(labelText, onclick, variant) {
    return el('button', { class: 'btn' + (variant ? ' btn-' + variant : ''), type: 'button', text: labelText, onclick: onclick });
  }

  function buttonRow(children) { return el('div', { class: 'btn-row' }, children); }

  /* ---------------------------------------------------------------- output */

  function card(titleText, children, subtitle) {
    return el('section', { class: 'card' }, [
      titleText ? el('div', { class: 'card-head' }, [
        el('h3', { class: 'card-title', text: titleText }),
        subtitle ? el('span', { class: 'card-sub', text: subtitle }) : null
      ]) : null,
      el('div', { class: 'card-body' }, children)
    ]);
  }

  /**
   * Academic-style table. `columns` is [{key, label, align, mono}],
   * `rows` is an array of objects keyed by column key, or a function
   * returning a DOM node for the whole row.
   */
  function table(columns, rows, opts) {
    opts = opts || {};
    var thead = el('thead', null, el('tr', null, columns.map(function (c) {
      return el('th', { class: (c.align === 'left' ? 'ta-l' : 'ta-r'), scope: 'col', text: c.label });
    })));
    var tbody = el('tbody');
    rows.forEach(function (r) {
      var tr = el('tr', { class: opts.rowClass ? opts.rowClass(r) : null });
      columns.forEach(function (c) {
        var cell = el(c.key === '_label' ? 'th' : 'td', {
          class: (c.align === 'left' ? 'ta-l ' : 'ta-r ') + (c.mono === false ? '' : 'mono'),
          scope: c.key === '_label' ? 'row' : null
        });
        var raw = r[c.key];
        var isNumCell = typeof raw === 'number';
        // A numeric column with `dp` is formatted and padded; anything that
        // is not a finite number (NaN, undefined) becomes an em dash so a
        // coefficient table never shows a raw "NaN".
        if (c.render) {
          append(cell, c.render(r));
        } else if (c.star) {
          cell.textContent = isNumCell && isFinite(raw) ? Stats.fmt(raw, c.dp) : '—';
          var st = Stats.stars(r[c.star]);
          if (st && isNumCell) cell.appendChild(el('sup', { class: 'stars', text: st }));
        } else if (c.stars) {
          // Significance-star column, where the value is a p-value.
          cell.textContent = Stats.fmtP(raw) + Stats.stars(raw);
        } else if (c.dp !== undefined || (c.mono !== false && isNumCell)) {
          if (isNumCell && !isFinite(raw)) {
            cell.textContent = '—';           // NaN / Infinity read as a dash
          } else if (!isNumCell) {
            cell.textContent = raw === null || raw === undefined ? '—' : String(raw);
          } else if (c.dp !== undefined) {
            cell.textContent = Stats.fmt(raw, c.dp);
          } else {
            // Counts and degrees of freedom read better without decimals.
            cell.textContent = Number.isInteger(raw) ? String(raw) : Stats.fmt(raw, 3);
          }
        } else {
          cell.textContent = raw === null || raw === undefined ? '—' : String(raw);
        }
        tr.appendChild(cell);
      });
      tbody.appendChild(tr);
    });
    return el('div', { class: 'table-wrap' }, el('table', { class: 'stat-table' }, [thead, tbody]));
  }

  /** A labelled number, the workhorse of the results area. */
  function stat(labelText, value, note) {
    return el('div', { class: 'stat' }, [
      el('span', { class: 'stat-label', text: labelText }),
      el('span', { class: 'stat-value mono', text: value }),
      note ? el('span', { class: 'stat-note', text: note }) : null
    ]);
  }

  function statGrid(items) { return el('div', { class: 'stat-grid' }, items.map(function (i) { return stat(i[0], i[1], i[2]); })); }

  /** Coloured band that states the decision in plain language. */
  function verdict(p, alpha, extra) {
    var v = Stats.verdict(p, alpha);
    return el('div', { class: 'verdict verdict-' + v.state }, [
      el('span', { class: 'verdict-dot' }),
      el('div', null, [
        el('strong', { text: v.text }),
        el('span', { class: 'verdict-p mono', text: extra || (Stats.fmtPWith(p)) })
      ])
    ]);
  }

  /** Interpretive sentence under a test, written for a student audience. */
  function interpretation(text) {
    return el('p', { class: 'interpretation', text: text });
  }

  function note(kind, text) { return el('p', { class: 'note note-' + (kind || 'info'), text: text }); }

  function empty(message, action) {
    return el('div', { class: 'empty' }, [
      el('p', { class: 'empty-msg', text: message }),
      action || null
    ]);
  }

  function chartBox(spec, caption) {
    var holder = el('div', { class: 'chart-box' });
    var inner = el('div', { class: 'chart' });
    holder.appendChild(inner);
    if (caption) holder.appendChild(el('p', { class: 'chart-caption', text: caption }));
    // Defer until attached so Plotly can measure the container.
    requestAnimationFrame(function () { Charts.draw(inner, spec); });
    return holder;
  }

  function spacer(h) { return el('div', { style: 'height:' + (h || 16) + 'px' }); }

  function download(filename, content, mime) {
    var blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = el('a', { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /** Escape a value for safe interpolation into exported HTML. */
  function escapeHtml(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  global.UI = {
    el: el, append: append, clear: clear, field: field, select: select,
    checkboxList: checkboxList, radioList: radioList, button: button, buttonRow: buttonRow,
    card: card, table: table, stat: stat, statGrid: statGrid, verdict: verdict,
    interpretation: interpretation, note: note, empty: empty, chartBox: chartBox,
    spacer: spacer, download: download, escapeHtml: escapeHtml
  };
})(window);
