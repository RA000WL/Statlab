const App = {
  sections: [
    { id: 'data', label: 'Data', icon: '📊', controller: DataController },
    { id: 'descriptives', label: 'Descriptive Statistics', icon: '📈', controller: DescriptivesController },
    { id: 'frequencies', label: 'Frequencies', icon: '📋', controller: FrequenciesController },
    { id: 'ttest', label: 'T-Test', icon: '🔬', controller: TTestController },
    { id: 'anova', label: 'One-Way ANOVA', icon: '📊', controller: ANOVAController },
    { id: 'correlation', label: 'Correlation', icon: '🔗', controller: CorrelationController },
    { id: 'chisquare', label: 'Chi-Square', icon: '🧮', controller: ChiSquareController },
    { id: 'regression', label: 'Linear Regression', icon: '📐', controller: RegressionController },
    { id: 'export', label: 'Export Report', icon: '💾', controller: ExportController }
  ],

  activeSection: 'data',

  init() {
    this.renderSidebar();
    this.wireNavClicks();
    this.renderSection('data');
  },

  renderSidebar() {
    const nav = document.getElementById('sidebar-nav');
    nav.innerHTML = this.sections.map(s => `
      <a href="#" class="nav-item ${s.id === this.activeSection ? 'active' : ''}" data-section="${s.id}">
        <span class="nav-icon">${s.icon}</span>
        <span class="nav-label">${s.label}</span>
      </a>
    `).join('');
  },

  wireNavClicks() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;
        this.renderSection(section);
      });
    });
  },

  renderSection(name) {
    this.activeSection = name;

    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.section === name);
    });

    const main = document.getElementById('main-content');
    main.innerHTML = '';

    const section = this.sections.find(s => s.id === name);
    if (section && section.controller) {
      section.controller.renderForm();
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
