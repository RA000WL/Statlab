# StatLab

A browser-based statistical analysis tool for undergraduate research.

StatLab is a single web page. It runs entirely in the browser, needs no
installation and no server, and is hosted on GitHub Pages. Students upload a
CSV or Excel file, choose an analysis, and get results they can read and
export.

All data is processed locally. Nothing is uploaded anywhere.

## Running it

Open `index.html` in any modern browser. That is the whole deployment: there
is no build step, no package manager, and no backend.

To serve it locally instead (useful when testing Excel import, which some
browsers restrict on `file://`):

```
python -m http.server 8000
```

Then visit `http://127.0.0.1:8000/`.

### Deploying to GitHub Pages

Push the folder to a repository, then in **Settings → Pages** set the source
to the branch root. The site is served from the repository root, so
`index.html` is the entry point.

## What it does

| Section | Analysis |
| --- | --- |
| Data | CSV and XLSX import, automatic column type detection, in-browser cell editing, CSV export |
| Descriptive statistics | N, mean, median, mode, standard deviation, variance, standard error, min, max, range, IQR, skewness, kurtosis, 95% CI, D'Agostino-Pearson normality test, histogram, boxplot, Q-Q plot |
| Frequencies | Counts, percentages, cumulative percentages, bar and donut charts |
| T-tests | Independent samples (Student's and Welch's) and paired samples, with Cohen's d, Hedges' g, confidence intervals, and Levene's test |
| One-way ANOVA | F-test, variance table, eta-squared and omega-squared with confidence intervals, Tukey HSD post-hoc comparisons |
| Correlation | Pearson and Spearman matrices with p-values and confidence intervals, pairwise detail table, scatter plot with fitted line |
| Chi-square | Test of independence with contingency and expected-count tables, Cramér's V, stacked bar chart |
| Linear regression | Simple and multiple regression, coefficient tables with standardised betas and VIF, model summary, residual diagnostics |
| Report | Standalone HTML report with base64-embedded chart images, or Markdown |

## Preparing data

One row per respondent, one column per variable, with a header row. StatLab
detects whether each column is a continuous measurement or a category, and
marks identifier columns (a column of unique codes like `R001`) so they are
excluded from analysis. Any of these can be overridden on the Data screen.

Leave a cell empty, or enter `NA`, when a value is missing. StatLab drops that
value rather than guessing at it, and reports how many rows it dropped.

## How the numbers are computed

`js/utils/stats.js` is a pure computation module with no DOM access. It
follows the standard reference implementations so results agree with SPSS,
JASP, and R to three decimals.

Two pieces are worth noting because they are easy to get wrong:

- **Normality.** The D'Agostino-Pearson K² test follows SciPy's formulation,
  combining the skewness and kurtosis tests. It needs at least 8 observations.
- **Tukey HSD.** The studentized range distribution has no closed form, so its
  p-values are computed by numerical integration. `P(range > r)` conditions on
  the minimum and subtracts the cases where all other values also fall inside
  the window; a shorter-looking formula double counts. Values are checked
  against published critical-value tables and, for k = 2, against the exact
  identity `q = √2 · t`.

## Project structure

```
index.html                     Application shell, CDN imports, script loading
css/style.css                  All styles, dark/light themes, responsive layout
js/state.js                    Dataset, column types, session results
js/app.js                      Sidebar navigation and section routing
js/utils/stats.js              Statistical computation (no DOM)
js/utils/charts.js             Plotly wrappers, theme-aware
js/utils/dom.js                DOM construction helpers
js/controllers/data.js         Upload, parsing, type detection, editing
js/controllers/descriptives.js Descriptive statistics and normality
js/controllers/frequencies.js  Frequency tables
js/controllers/ttest.js        Independent and paired t-tests
js/controllers/anova.js        One-way ANOVA and Tukey HSD
js/controllers/correlation.js  Pearson and Spearman correlation
js/controllers/chisquare.js    Chi-square test of independence
js/controllers/regression.js   Simple and multiple linear regression
js/controllers/export.js       HTML and Markdown report export
```

Each controller exposes `render(host)` and keeps its own form state, so
switching sections does not lose your variable selections.

## Libraries

Loaded from a CDN, no bundler involved.

| Library | Version | Purpose |
| --- | --- | --- |
| [jStat](https://github.com/jstat/jstat) | 1.9.6 | Distribution functions for p-values and critical values |
| [Plotly.js](https://plotly.com/javascript/) | 2.27.0 | Interactive charts |
| [SheetJS](https://sheetjs.com/) | 0.20.1 | XLSX parsing |

A connection is needed the first time to fetch these. After the browser
caches them, analyses continue to work offline.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `1`–`9` | Jump to a section |
| `?` | Show the shortcut list |

## Limitations

- One-way ANOVA only. No factorial, repeated-measures, or mixed designs.
- Regression predictors must be continuous. There is no dummy coding for
  categorical predictors and no interaction terms.
- No non-parametric alternatives (Mann-Whitney U, Wilcoxon, Kruskal-Wallis),
  so a violated normality assumption has to be reported rather than tested
  around. Assumption checks are shown for every test so the situation is
  visible.
- No data transformation or missing-value imputation. Blanks are dropped
  pairwise.
- Datasets above roughly 10,000 rows may be slow, since everything is held in
  browser memory.
