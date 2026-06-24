# AGENTS.md

## Project overview

Statlab — a vanilla JavaScript web application for quantitative research statistical analysis (SPSS/JASP-like). No build tools, no bundler, no framework. Static files served directly. Works on GitHub Pages.

## File structure

```
index.html            — HTML shell with CDN links + script loading
css/style.css         — All styles (dark theme, layout, responsive)
js/
├── state.js          — Global state (rawData, columns, sessionResults)
├── app.js            — App init, sidebar nav wiring, section routing
├── utils/
│   ├── stats.js      — Pure statistical functions (jStat-based)
│   └── charts.js     — Plotly.js wrapper functions (dark theme)
└── controllers/
    ├── data.js       — CSV/XLSX upload, type detection, preview
    ├── descriptives.js — Descriptive statistics (N, mean, median, etc.)
    ├── frequencies.js — Frequency tables for categorical variables
    ├── ttest.js      — Independent & paired samples t-tests
    ├── anova.js      — One-way ANOVA
    ├── correlation.js — Pearson/Spearman correlation matrix
    ├── chisquare.js  — Chi-square test of independence
    ├── regression.js — Simple linear regression
    └── export.js     — Export session results to HTML report
```

## Architecture

- Pure vanilla JS — no npm, no imports, no transpilation. Scripts load via `<script>` tags.
- **Script load order matters**: `state.js` → `utils/stats.js` → `utils/charts.js` → controllers → `app.js`
- `state.js` is the single source of truth. All controllers read/write through `window.state`.
- `app.js` initializes on DOMContentLoaded, renders sidebar, wires nav clicks to controller `renderForm()` methods.
- Controllers are self-contained: each has `renderForm()`, `compute()`, `renderResults()`.

## CDN dependencies

All loaded in `<head>` before local scripts:
- **Danfo.js** 1.1.2 — dataframe ops (used for type detection)
- **jStat** 1.9.6 — statistical distributions (t, F, chi-square)
- **Plotly.js** 2.27.0 — all charts and visualizations
- **SheetJS** 0.20.1 — XLSX file parsing
- **DM Sans** + **DM Mono** fonts

## Key patterns

- **Error handling**: Every controller shows styled error cards, never silent failures
- **Result tracking**: All controllers push to `state.sessionResults[]` for export
- **Column type detection**: >80% numeric → continuous (blue badge), else categorical (orange badge)
- **Statistical significance**: p < 0.05 gets green `.significant` class, else `.not-significant`
- **Interpretation strings**: Every test generates a plain English interpretation paragraph
- **Chart dark theme**: All Plotly layouts use `paper_bgcolor: '#1e2433'`, `font: { color: '#e2e8f0' }`

## Conventions

- No module bundler — coordinate script load order in `index.html` manually
- State mutations go through `state.js`, not directly in controllers
- Chart rendering centralized in `utils/charts.js`. Controllers call into it, never Plotly directly
- Statistical functions live in `utils/stats.js`. Keep computation pure (no DOM side effects)
- CSS variables at `:root` for theme colors — dark theme by default

## Gotchas

- Script load order in `index.html` matters: `state.js` must load before anything that depends on it
- No TypeScript — no type checking step. Manual testing only
- No test framework. If adding tests, confirm with the user first
- `jStat` is loaded globally via CDN — use `jStat.studentt`, `jStat.centralF`, `jStat.chisquare`
- `Plotly` is global — use `Plotly.newPlot()`, `Plotly.toImage()` directly
- `XLSX` is global from SheetJS — use `XLSX.read()`, `XLSX.utils.sheet_to_json()`
