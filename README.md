# StatLab

Browser-based statistical analysis tool for quantitative research. No backend required — runs entirely on GitHub Pages.

**Live:** https://ra000wl.github.io/Statlab/

## Features

- **Data Upload** — CSV/XLSX with drag-and-drop, auto column type detection
- **Descriptive Statistics** — Mean, median, mode, SD, variance, skewness, kurtosis, 95% CI, normality tests (D'Agostino-Pearson), Q-Q plots
- **Frequency Tables** — Counts, percentages, cumulative percentages, bar/pie charts
- **T-Test** — Independent samples & paired samples with Cohen's d and 95% CI
- **One-Way ANOVA** — F-test, η² with CI, Tukey HSD post-hoc tests
- **Correlation** — Pearson/Spearman matrix with p-values and 95% CIs, scatter plots
- **Chi-Square** — Test of independence with Cramér's V, stacked bar charts
- **Linear Regression** — Simple (1 predictor) and multiple (2+ predictors) with R², adjusted R², F-test, coefficient CIs
- **Export** — Download all session results as a standalone HTML report

## Tech Stack

Pure vanilla JavaScript — no npm, no bundler, no framework. CDN dependencies:

- [Plotly.js](https://plotly.com/javascript/) — Charts
- [jStat](https://github.com/jstat/jstat) — Statistical distributions
- [SheetJS](https://sheetjs.com/) — XLSX parsing
- [Danfo.js](https://danfo.js.org/) — DataFrame operations

## File Structure

```
index.html
css/style.css
js/
├── state.js
├── app.js
├── utils/
│   ├── stats.js
│   └── charts.js
└── controllers/
    ├── data.js
    ├── descriptives.js
    ├── frequencies.js
    ├── ttest.js
    ├── anova.js
    ├── correlation.js
    ├── chisquare.js
    ├── regression.js
    └── export.js
```

## Running Locally

Open `index.html` in a browser. No server needed.

## License

MIT
