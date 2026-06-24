# StatLab

A free, browser-based statistical analysis platform designed for undergraduate students and researchers. No installation, no server, no coding required — just open the link and start analyzing.

**Live:** https://ra000wl.github.io/Statlab/

---

## About

StatLab brings professional-grade statistical analysis to the browser. Built for students in Nepal and similar contexts where access to tools like SPSS or JASP is limited by cost, infrastructure, or technical barriers. Upload your data, pick an analysis, and get results with charts, effect sizes, and plain-English interpretations — all in seconds.

Runs entirely client-side. No data leaves your browser.

---

## Features

### Data Management
- **Upload** — Drag-and-drop CSV and XLSX files with automatic column type detection
- **Create Table** — Build datasets manually with an editable spreadsheet interface
- **Edit Data** — Modify uploaded data directly in the app
- **Save CSV** — Download your (edited) data as a CSV file
- **Variable Badges** — Instant visual identification of continuous vs. categorical variables

### Statistical Analysis
- **Descriptive Statistics** — Mean, median, mode, standard deviation, variance, skewness, kurtosis, 95% CI, with normality testing and Q-Q plots
- **Frequency Tables** — Counts, percentages, cumulative percentages for categorical variables
- **T-Test** — Independent samples and paired samples, with Cohen's d effect size and 95% CI
- **One-Way ANOVA** — F-test, eta-squared with CI, Tukey HSD post-hoc tests
- **Correlation** — Pearson and Spearman matrices with p-values and 95% CIs
- **Chi-Square** — Test of independence with Cramér's V
- **Linear Regression** — Simple (1 predictor) and multiple (2+ predictors) with R², adjusted R², F-test, coefficient tables

### Visualizations
- Histograms, boxplots, grouped boxplots
- Bar charts, pie charts, stacked bar charts
- Scatter plots with regression lines
- Correlation heatmaps
- Q-Q plots for normality assessment

### Export & UI
- **Export Report** — Download all session results as a standalone HTML report
- **Dark/Light Theme** — Toggle with localStorage persistence
- **Collapsible Sidebar** — Maximize screen space when needed
- **Responsive Design** — Works on desktop, tablet, and mobile

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| Statistics | [jStat](https://github.com/jstat/jstat) |
| Charts | [Plotly.js](https://plotly.com/javascript/) |
| XLSX Parsing | [SheetJS](https://sheetjs.com/) |
| Hosting | [GitHub Pages](https://pages.github.com/) |

No npm, no bundler, no build step. 16 static files.

---

## File Structure

```
index.html              — App shell, CDN links, script loading
css/style.css           — All styles, dark/light theme, responsive
js/
├── state.js            — Global state (rawData, columns, sessionResults)
├── app.js              — Navigation, section routing
├── utils/
│   ├── stats.js        — All statistical computations
│   └── charts.js       — Plotly.js wrappers with theme support
└── controllers/
    ├── data.js         — Upload, create table, edit, CSV export
    ├── descriptives.js — Descriptive statistics + normality tests
    ├── frequencies.js  — Frequency analysis
    ├── ttest.js        — T-tests (independent + paired)
    ├── anova.js        — One-way ANOVA + Tukey HSD
    ├── correlation.js  — Correlation matrix + scatter plots
    ├── chisquare.js    — Chi-square test
    ├── regression.js   — Simple + multiple regression
    └── export.js       — HTML report export
```

---

## Running Locally

```bash
# Option 1: Just open the file
open index.html

# Option 2: Local server (if needed)
python3 -m http.server 8080
# Then visit http://localhost:8080
```

---

## License

MIT
