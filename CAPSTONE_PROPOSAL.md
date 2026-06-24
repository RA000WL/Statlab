# Capstone Project Proposal

## StatLab: A Browser-Based Statistical Analysis Platform for Undergraduate Research in Nepal

---

**Student:** Rahul Magar
**Symbol No:** 79218008
**Program:** Bachelor of Information and Communication Technology in Education (BICTE)
**Institution:** Janta Multiple Campus, Itahari
**Supervisor:** Dr. Tolnath Kafle

---

## 1. Introduction

Quantitative research analysis is a core skill in academic education, yet students in growing urban centers like Itahari, Nepal face significant barriers to accessing professional-grade statistical tools. Commercial software like SPSS requires expensive licenses, while open-source alternatives like JASP and R demand local installation and technical configuration that exceeds many undergraduates' technical literacy.

This capstone project presents **StatLab**, a browser-based statistical analysis platform designed to eliminate these barriers. StatLab runs entirely in the web browser with zero backend infrastructure, making it deployable on free hosting platforms like GitHub Pages. It provides a user-friendly interface for the statistical analyses most commonly required in undergraduate research: descriptive statistics, t-tests, ANOVA, correlation, chi-square, and regression — all without requiring installation, configuration, or server access.

## 2. Problem Statement

Undergraduate students in BICTE and similar programs in Nepal encounter the following obstacles when conducting quantitative research:

1. **Software accessibility:** SPSS licenses cost $99–$349/year per student, placing them beyond reach for most Nepali undergraduates. JASP and jamovi require desktop installation, which depends on personal computer availability and technical setup knowledge.

2. **Technical barriers:** Existing free tools (R, Python) require programming skills, command-line familiarity, and library management — competencies that fall outside the scope of most education-focused undergraduate programs.

3. **Context gap:** Most statistical tools are designed for Western academic contexts. Students in Nepal need tools that work offline, on low-bandwidth connections, and on shared or mobile devices.

4. **Learning disconnect:** Students learn statistical concepts in coursework but lack accessible tools to apply them in their own research projects, creating a gap between theory and practice.

## 3. Objectives

### 3.1 General Objective

To design, develop, and evaluate a browser-based statistical analysis tool that enables undergraduate students to perform quantitative research analysis without software installation or server infrastructure.

### 3.2 Specific Objectives

1. To develop a single-page web application implementing the statistical analyses most commonly required in undergraduate education research: descriptive statistics, frequency analysis, independent and paired t-tests, one-way ANOVA, Pearson/Spearman correlation, chi-square test of independence, and simple/multiple linear regression.

2. To implement a zero-dependency deployment model using static files and CDN-loaded libraries, enabling free hosting on GitHub Pages with no backend server.

3. To provide an intuitive graphical interface that allows students with no programming background to upload data, select variables, run analyses, and interpret results through plain-language output.

4. To include diagnostic tools (normality tests, Q-Q plots, effect size confidence intervals) that teach students proper assumption checking — a skill often neglected in introductory statistics courses.

5. To evaluate the tool's usability and effectiveness through user testing with undergraduate students.

## 4. Scope and Delimitations

### 4.1 In Scope

- Data import from CSV and XLSX files
- Descriptive statistics with normality testing (D'Agostino-Pearson)
- Frequency analysis for categorical variables
- Independent samples t-test with Cohen's d and 95% CI
- Paired samples t-test with effect size CI
- One-way ANOVA with Tukey HSD post-hoc tests and η² with CI
- Pearson and Spearman correlation with matrix visualization and 95% CIs
- Chi-square test of independence with Cramér's V
- Simple linear regression (1 predictor)
- Multiple linear regression (2+ predictors) with model diagnostics
- Q-Q plots for visual normality assessment
- Export of session results to standalone HTML reports
- Responsive design for mobile and desktop
- Dark/light theme toggle
- Zero backend — fully client-side processing

### 4.2 Delimitations

- The tool does not support non-parametric alternatives (Mann-Whitney U, Kruskal-Wallis)
- Factor analysis, MANOVA, and logistic regression are not included
- No data editing capability (data must be prepared before upload)
- No longitudinal or multilevel modeling
- Sample data must be pre-cleaned (no automatic missing value imputation)
- Evaluation is limited to usability testing, not comparative effectiveness studies

## 5. Technical Architecture

### 5.1 Technology Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Structure | HTML5 | Semantic markup, accessibility |
| Styling | Pure CSS3 with CSS variables | No framework dependency, theme support |
| Logic | Vanilla JavaScript (ES6+) | No build tools, direct browser execution |
| Statistics | jStat 1.9.6 (CDN) | Proven statistical distributions library |
| Visualization | Plotly.js 2.27.0 (CDN) | Interactive charts, export capability |
| Data Parsing | SheetJS 0.20.1 (CDN) | XLSX/CSV parsing in browser |
| Hosting | GitHub Pages | Free, HTTPS, custom domain support |

### 5.2 Architecture Pattern

The application follows a controller-based MVC pattern without frameworks:

```
┌─────────────────────────────────────────────┐
│                 index.html                  │
│  (CDN scripts → local scripts → app.js)    │
└─────────────────────────────────────────────┘
                      │
    ┌─────────────────┼─────────────────┐
    ▼                 ▼                 ▼
┌────────┐     ┌──────────┐     ┌──────────┐
│ state  │     │ utils/   │     │controllers│
│  .js   │     │stats.js  │     │ /*.js     │
│        │     │charts.js │     │           │
└────────┘     └──────────┘     └──────────┘
```

- **state.js** — Global state management (rawData, columns, sessionResults)
- **stats.js** — Pure statistical functions (no DOM access)
- **charts.js** — Plotly.js wrapper functions with theme support
- **controllers/** — Self-contained modules per analysis type

### 5.3 Deployment Model

```
GitHub Repository → GitHub Pages → HTTPS URL
       ↓
Static files only (no server-side processing)
       ↓
CDN libraries loaded at runtime
       ↓
All computation runs in browser
```

## 6. Implementation Plan

### 6.1 Development Phases

| Phase | Duration | Activities | Deliverables |
|-------|----------|------------|--------------|
| 1: Foundation | Weeks 1–2 | Project setup, HTML structure, CSS theme, state management | Working shell with sidebar navigation |
| 2: Data Layer | Weeks 3–4 | CSV/XLSX upload, type detection, preview, variable management | Functional data upload and preview |
| 3: Core Statistics | Weeks 5–8 | Descriptives, frequencies, t-tests, ANOVA, correlation, chi-square, regression | All statistical modules operational |
| 4: Advanced Features | Weeks 9–10 | Multiple regression, normality tests, post-hoc tests, effect size CIs, Q-Q plots | Diagnostic and advanced analysis tools |
| 5: Polish | Weeks 11–12 | Export functionality, responsive design, dark/light theme, error handling | Production-ready application |
| 6: Evaluation | Weeks 13–14 | Usability testing, bug fixes, documentation, capstone report | Final submission |

### 6.2 Key Technical Decisions

1. **No build tools:** Scripts load via `<script>` tags in dependency order. This eliminates Node.js, webpack, or any toolchain — critical for a tool that must run on any computer with a browser.

2. **CDN-only dependencies:** All external libraries load from jsDelivr/CDN. No npm install, no node_modules, no bundle step. The entire application is 16 static files.

3. **Global state pattern:** `window.state` serves as single source of truth. Controllers read/write through it. This is simpler than event-driven patterns for an application of this scope.

4. **Controller-per-analysis:** Each statistical test is a self-contained controller with `renderForm()`, `compute()`, and `renderResults()`. This makes the codebase modular without requiring a module bundler.

## 7. Statistical Methods Implemented

### 7.1 Descriptive Statistics
- Central tendency: mean, median, mode
- Dispersion: standard deviation, variance, range
- Distribution shape: skewness, kurtosis (excess)
- Confidence intervals: 95% CI for the mean
- Normality: D'Agostino-Pearson test (skewness + kurtosis based, works for any n)

### 7.2 T-Tests
- **Independent samples:** Welch's t-test for two-group comparisons
  - Effect size: Cohen's d with 95% CI
  - Assumption: tested via normality check in descriptives
- **Paired samples:** Paired t-test for within-subjects comparisons
  - Effect size: Cohen's d with 95% CI

### 7.3 One-Way ANOVA
- F-test for comparing means across 3+ groups
- Effect size: η² with 95% CI
- Post-hoc: Tukey HSD for pairwise comparisons (when F is significant and k > 2)

### 7.4 Correlation
- Pearson r for linear associations
- Spearman ρ for monotonic/ordinal associations
- Significance test for each correlation
- 95% CI for r using Fisher z-transformation

### 7.5 Chi-Square
- χ² test of independence for two categorical variables
- Effect size: Cramér's V with interpretation

### 7.6 Regression
- **Simple:** Y = β₀ + β₁X + ε
  - R², adjusted R², F-test, coefficient tests
  - R² 95% CI
- **Multiple:** Y = β₀ + β₁X₁ + β₂X₂ + ... + βₖXₖ + ε
  - Full coefficient table (B, SE, t, p)
  - Model R², adjusted R², F-test
  - Multicollinearity detection (singular matrix → error message)

## 8. Evaluation Plan

### 8.1 Usability Testing

**Participants:** 10–15 undergraduate students from BICTE program at JMC

**Method:** Task-based usability testing
- Task 1: Upload a CSV file and identify variable types
- Task 2: Compute descriptive statistics for a continuous variable
- Task 3: Run an independent t-test comparing two groups
- Task 4: Perform a correlation analysis between two variables
- Task 5: Run a multiple regression and interpret results

**Metrics:**
- Task completion rate
- Time on task
- Error rate
- System Usability Scale (SUS) score
- Qualitative feedback (open-ended questions)

### 8.2 Technical Evaluation

- Cross-browser testing (Chrome, Firefox, Safari, Edge)
- Mobile responsiveness testing (iOS Safari, Android Chrome)
- Performance testing with datasets up to 10,000 rows
- Accessibility audit (WCAG 2.1 basic compliance)

### 8.3 Statistical Accuracy Verification

- Compare StatLab outputs against JASP for identical datasets
- Verify all test statistics, p-values, and effect sizes match within rounding tolerance
- Test edge cases: small samples, constant data, single-group data

## 9. Expected Outcomes

1. A fully functional web application accessible at https://ra000wl.github.io/Statlab/
2. A tool that enables students to perform 8 types of statistical analyses without software installation
3. Demonstrated usability through task-based testing with real undergraduate students
4. A deployment model (GitHub Pages) that can be replicated by other educators at zero cost
5. Documentation sufficient for other institutions to adopt or extend the tool

## 10. Significance of the Study

### 10.1 Academic Contribution

This project demonstrates that professional-grade statistical analysis can be delivered as a static web application, eliminating the infrastructure barriers that limit research capacity in resource-constrained educational settings.

### 10.2 Practical Impact

- **For students:** Immediate access to analysis tools from any device with a browser
- **For educators:** A free, deployable platform for teaching statistics without lab software
- **For institutions:** Zero-cost alternative to SPSS licensing
- **For Nepal:** Locally relevant tool that can support the growing emphasis on evidence-based education research

### 10.3 Scalability

The GitHub Pages deployment model means any institution worldwide can fork the repository, customize it, and host it for free. No server administration, no database management, no ongoing costs.

## 11. Limitations

1. Client-side processing limits maximum dataset size (browser memory constraints)
2. No server-side computation means no persistent storage or multi-user collaboration
3. The D'Agostino-Pearson normality test is an approximation; for publication-quality research, dedicated statistical software may be preferred
4. No support for complex designs (mixed ANOVA, MANOVA, structural equation modeling)
5. Self-reported usability data may be subject to social desirability bias

## 12. References

Al-Rahmi, W., & Othman, M. (2013). The impact of social media use on academic performance among university students: A pilot study.

Apuke, O. D., & Omar, B. (2021). Social media and academic performance among undergraduate students at Taraba State University, Nigeria.

Bhandarkar, A. M., Pandey, A. K., Nayak, R., Prasad, B., & Roche, M. (2021). Impact of social media on the academic performance of undergraduate medical students. *Indian Journal of Otolaryngology and Head & Neck Surgery*, 73(1), 104–108.

Clement, J. (2020). *Impact of COVID-19 on social media usage worldwide*. Statista.

Global Digital Report. (2023). Digital 2023: Global overview report.

Mushtaq, A. J., & Benraghda, A. (2018). The effects of social media on the undergraduate students' academic performances. *Library Philosophy and Practice*, 4(1), 1–17.

Nepal Telecommunication Authority. (2023). Annual report 2022/2023. Government of Nepal.

---

**Appendix A: Application Screenshot**

The application is live at: https://ra000wl.github.io/Statlab/

**Appendix B: Source Code Repository**

https://github.com/RA000WL/Statlab
