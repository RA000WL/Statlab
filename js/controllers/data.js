const DataController = {
  renderForm() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
      <div class="fade-in">
        <h2>Data Upload</h2>
        <div class="card">
          <div class="upload-zone" id="upload-zone">
            <div class="upload-icon">📊</div>
            <p>Drag & drop your data file here</p>
            <p class="text-muted">or</p>
            <label class="btn btn-primary">
              Choose File
              <input type="file" id="file-input" accept=".csv,.xlsx,.xls" style="display:none">
            </label>
            <p class="text-muted" style="margin-top: 1rem; font-size: 0.85rem;">Supports CSV and XLSX files</p>
          </div>
        </div>
        <div id="data-preview"></div>
      </div>
    `;
    this.setupEventListeners();
  },

  setupEventListeners() {
    const fileInput = document.getElementById('file-input');
    const uploadZone = document.getElementById('upload-zone');

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleFileUpload(e.target.files[0]);
      }
    });

    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('drag-over');
    });

    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('drag-over');
    });

    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('drag-over');
      if (e.dataTransfer.files.length > 0) {
        this.handleFileUpload(e.dataTransfer.files[0]);
      }
    });
  },

  handleFileUpload(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'csv') {
      this.parseCSV(file);
    } else if (ext === 'xlsx' || ext === 'xls') {
      this.parseXLSX(file);
    } else {
      this.showError('Unsupported file format. Please upload CSV or XLSX.');
    }
  },

  parseCSV(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          this.showError('File appears to be empty or has no data rows.');
          return;
        }
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const row = {};
          headers.forEach((h, i) => { row[h] = values[i] || ''; });
          return row;
        });
        this.processData(headers, data, file.name);
      } catch (err) {
        this.showError('Error parsing CSV file: ' + err.message);
      }
    };
    reader.readAsText(file);
  },

  parseXLSX(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        if (jsonData.length === 0) {
          this.showError('File appears to be empty.');
          return;
        }
        const headers = Object.keys(jsonData[0]);
        this.processData(headers, jsonData, file.name);
      } catch (err) {
        this.showError('Error parsing XLSX file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  },

  processData(headers, data, fileName) {
    state.rawData = data;
    state.columns = this.detectColumnTypes(headers, data);
    this.renderDataPreview(headers, data);
    this.renderVariableList();
    this.showSuccess(`Successfully loaded "${fileName}" with ${data.length} rows and ${headers.length} columns.`);
  },

  detectColumnTypes(headers, data) {
    return headers.map(header => {
      const values = data.map(row => row[header]).filter(v => v !== '' && v !== null && v !== undefined);
      const numericCount = values.filter(v => !isNaN(parseFloat(v)) && isFinite(v)).length;
      const ratio = values.length === 0 ? 0 : numericCount / values.length;
      return {
        name: header,
        type: ratio > 0.8 ? 'continuous' : 'categorical'
      };
    });
  },

  renderDataPreview(headers, data) {
    const preview = document.getElementById('data-preview');
    const rows = data.slice(0, 10);
    let tableHTML = `
      <div class="card fade-in" style="margin-top: 1.5rem;">
        <h3>Data Preview (first 10 rows)</h3>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${rows.map(row => `
                <tr>${headers.map(h => `<td>${row[h] !== undefined ? row[h] : ''}</td>`).join('')}</tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    preview.innerHTML = tableHTML;
  },

  renderVariableList() {
    const sidebar = document.getElementById('variable-list');
    if (!sidebar) return;
    sidebar.innerHTML = state.columns.map(col => `
      <div class="variable-badge ${col.type === 'continuous' ? 'continuous' : 'categorical'}">
        <span class="badge-type">${col.type === 'continuous' ? 'CONT' : 'CAT'}</span>
        <span class="badge-name">${col.name}</span>
      </div>
    `).join('');
  },

  showError(message) {
    const main = document.getElementById('main-content');
    const existing = main.querySelector('.error-card');
    if (existing) existing.remove();
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-card fade-in';
    errorDiv.innerHTML = `<p>${message}</p>`;
    main.prepend(errorDiv);
  },

  showSuccess(message) {
    const main = document.getElementById('main-content');
    const existing = main.querySelector('.success-card');
    if (existing) existing.remove();
    const successDiv = document.createElement('div');
    successDiv.className = 'success-card fade-in';
    successDiv.innerHTML = `<p>${message}</p>`;
    main.prepend(successDiv);
  },

  getContinuousColumns() {
    return state.columns.filter(c => c.type === 'continuous').map(c => c.name);
  },

  getCategoricalColumns() {
    return state.columns.filter(c => c.type === 'categorical').map(c => c.name);
  },

  getColumnData(colName) {
    return state.rawData.map(row => row[colName]).filter(v => v !== '' && v !== null && v !== undefined);
  },

  getNumericColumnData(colName) {
    return this.getColumnData(colName)
      .map(v => parseFloat(v))
      .filter(v => !isNaN(v));
  },

  getGroupsByColumn(colName) {
    const data = state.rawData;
    const groups = {};
    data.forEach(row => {
      const key = String(row[colName]);
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });
    return groups;
  }
};
