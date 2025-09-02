// Pattern Manager for saving and managing text extraction patterns
class PatternManager {
    constructor() {
        this.patterns = [];
        this.currentEditingIndex = -1;
        this.bindEvents();
    }
    
    bindEvents() {
        // Modal events
        document.addEventListener('click', (e) => {
            if (e.target.id === 'patternManagerModal') {
                this.closeModal();
            }
        });
        
        // Pattern editor events
        document.getElementById('savePatternEdit').addEventListener('click', () => this.savePattern());
        document.getElementById('cancelPatternEdit').addEventListener('click', () => this.cancelEdit());
        
        // Form validation
        document.getElementById('editPatternName').addEventListener('input', () => this.validateForm());
        document.getElementById('editPatternRegex').addEventListener('input', () => this.validateForm());
    }
    
    openModal(patterns) {
        this.patterns = [...patterns];
        this.currentEditingIndex = -1;
        
        this.renderPatternList();
        this.clearEditor();
        
        const modal = document.getElementById('patternManagerModal');
        modal.classList.add('active');
    }
    
    closeModal() {
        const modal = document.getElementById('patternManagerModal');
        modal.classList.remove('active');
        
        // Refresh patterns in main app
        if (window.app) {
            window.app.refreshPatterns();
        }
    }
    
    renderPatternList() {
        const patternListFull = document.getElementById('patternListFull');
        
        if (this.patterns.length === 0) {
            patternListFull.innerHTML = `
                <div class="empty-patterns" style="padding: 2rem; text-align: center; color: #6c757d;">
                    <i class="fas fa-bookmark" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p>No patterns saved yet</p>
                    <small>Create patterns by selecting text from PDFs</small>
                </div>
            `;
            return;
        }
        
        patternListFull.innerHTML = this.patterns.map((pattern, index) => `
            <div class="pattern-item-full" data-index="${index}">
                <div class="pattern-header">
                    <div class="pattern-name">${this.escapeHtml(pattern.name)}</div>
                    <div class="pattern-actions">
                        <button class="btn btn-sm btn-secondary" onclick="patternManager.editPattern(${index})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="patternManager.testPattern(${index})">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="patternManager.deletePattern(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="pattern-regex">
                    <code>${this.escapeHtml(pattern.regex)}</code>
                </div>
                <div class="pattern-description">
                    ${this.escapeHtml(pattern.description || 'No description')}
                </div>
                <div class="pattern-meta">
                    <small>Created: ${new Date(pattern.created).toLocaleDateString()}</small>
                </div>
            </div>
        `).join('');
    }
    
    editPattern(index) {
        this.currentEditingIndex = index;
        const pattern = this.patterns[index];
        
        document.getElementById('editPatternName').value = pattern.name;
        document.getElementById('editPatternRegex').value = pattern.regex;
        document.getElementById('editPatternDescription').value = pattern.description || '';
        
        this.validateForm();
        
        // Scroll to editor
        document.getElementById('patternEditor').scrollIntoView({ behavior: 'smooth' });
    }
    
    savePattern() {
        const name = document.getElementById('editPatternName').value.trim();
        const regex = document.getElementById('editPatternRegex').value.trim();
        const description = document.getElementById('editPatternDescription').value.trim();
        
        if (!name || !regex) {
            alert('Please enter both pattern name and regex');
            return;
        }
        
        // Validate regex
        try {
            new RegExp(regex);
        } catch (error) {
            alert('Invalid regular expression: ' + error.message);
            return;
        }
        
        const pattern = {
            name: name,
            regex: regex,
            description: description,
            created: this.currentEditingIndex >= 0 ? this.patterns[this.currentEditingIndex].created : new Date().toISOString(),
            modified: new Date().toISOString()
        };
        
        if (this.currentEditingIndex >= 0) {
            // Update existing pattern
            this.patterns[this.currentEditingIndex] = pattern;
        } else {
            // Add new pattern
            this.patterns.push(pattern);
        }
        
        // Save to localStorage
        this.savePatterns();
        
        // Refresh UI
        this.renderPatternList();
        this.clearEditor();
        
        // Show success message
        this.showMessage(`Pattern "${name}" saved successfully`, 'success');
    }
    
    cancelEdit() {
        this.clearEditor();
    }
    
    clearEditor() {
        this.currentEditingIndex = -1;
        document.getElementById('editPatternName').value = '';
        document.getElementById('editPatternRegex').value = '';
        document.getElementById('editPatternDescription').value = '';
        this.validateForm();
    }
    
    validateForm() {
        const name = document.getElementById('editPatternName').value.trim();
        const regex = document.getElementById('editPatternRegex').value.trim();
        const saveBtn = document.getElementById('savePatternEdit');
        
        let isValid = name && regex;
        
        // Validate regex
        if (regex) {
            try {
                new RegExp(regex);
                document.getElementById('editPatternRegex').style.borderColor = '';
            } catch (error) {
                document.getElementById('editPatternRegex').style.borderColor = '#dc3545';
                isValid = false;
            }
        }
        
        saveBtn.disabled = !isValid;
    }
    
    deletePattern(index) {
        const pattern = this.patterns[index];
        
        if (confirm(`Are you sure you want to delete the pattern "${pattern.name}"?`)) {
            this.patterns.splice(index, 1);
            this.savePatterns();
            this.renderPatternList();
            
            // Clear editor if editing deleted pattern
            if (this.currentEditingIndex === index) {
                this.clearEditor();
            } else if (this.currentEditingIndex > index) {
                this.currentEditingIndex--;
            }
            
            this.showMessage(`Pattern "${pattern.name}" deleted`, 'info');
        }
    }
    
    testPattern(index) {
        const pattern = this.patterns[index];
        
        if (!window.app || !window.app.selectedFile) {
            alert('Please select a PDF file to test the pattern against');
            return;
        }
        
        const text = window.app.selectedFile.text;
        if (!text) {
            alert('No text available in the selected PDF');
            return;
        }
        
        try {
            const regex = new RegExp(pattern.regex, 'gi');
            const matches = [];
            let match;
            
            while ((match = regex.exec(text)) !== null) {
                matches.push({
                    match: match[0],
                    groups: match.slice(1),
                    index: match.index
                });
                
                // Prevent infinite loop for zero-length matches
                if (match.index === regex.lastIndex) {
                    regex.lastIndex++;
                }
            }
            
            if (matches.length > 0) {
                const results = matches.map((m, i) => 
                    `Match ${i + 1}: "${m.match}"${m.groups.length > 0 ? ` (Groups: ${m.groups.join(', ')})` : ''}`
                ).join('\n');
                
                alert(`Pattern "${pattern.name}" found ${matches.length} match(es):\n\n${results}`);
            } else {
                alert(`Pattern "${pattern.name}" did not match any text in the current PDF`);
            }
            
        } catch (error) {
            alert('Error testing pattern: ' + error.message);
        }
    }
    
    savePatterns() {
        try {
            localStorage.setItem('aura-pdf-patterns', JSON.stringify(this.patterns));
        } catch (error) {
            console.error('Error saving patterns:', error);
            alert('Error saving patterns: ' + error.message);
        }
    }
    
    showMessage(message, type = 'info') {
        // Create a temporary message element
        const messageEl = document.createElement('div');
        messageEl.className = `alert alert-${type}`;
        messageEl.style.position = 'fixed';
        messageEl.style.top = '20px';
        messageEl.style.right = '20px';
        messageEl.style.zIndex = '10000';
        messageEl.style.maxWidth = '300px';
        messageEl.textContent = message;
        
        document.body.appendChild(messageEl);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 3000);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Export/Import functionality
    exportPatterns() {
        if (this.patterns.length === 0) {
            alert('No patterns to export');
            return;
        }
        
        const dataStr = JSON.stringify(this.patterns, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const exportFileDefaultName = 'aura-pdf-patterns.json';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        this.showMessage('Patterns exported successfully', 'success');
    }
    
    importPatterns() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedPatterns = JSON.parse(e.target.result);
                    
                    if (!Array.isArray(importedPatterns)) {
                        throw new Error('Invalid pattern file format');
                    }
                    
                    // Validate patterns
                    importedPatterns.forEach((pattern, index) => {
                        if (!pattern.name || !pattern.regex) {
                            throw new Error(`Pattern ${index + 1} is missing required fields`);
                        }
                        
                        // Test regex
                        new RegExp(pattern.regex);
                    });
                    
                    // Ask user what to do
                    const action = confirm(
                        `Import ${importedPatterns.length} pattern(s)?\n\n` +
                        'OK = Replace all patterns\n' +
                        'Cancel = Merge with existing patterns'
                    );
                    
                    if (action) {
                        // Replace all patterns
                        this.patterns = importedPatterns;
                    } else {
                        // Merge patterns
                        importedPatterns.forEach(importedPattern => {
                            const existingIndex = this.patterns.findIndex(p => p.name === importedPattern.name);
                            if (existingIndex >= 0) {
                                this.patterns[existingIndex] = importedPattern;
                            } else {
                                this.patterns.push(importedPattern);
                            }
                        });
                    }
                    
                    this.savePatterns();
                    this.renderPatternList();
                    this.showMessage(`Imported ${importedPatterns.length} pattern(s)`, 'success');
                    
                } catch (error) {
                    alert('Error importing patterns: ' + error.message);
                }
            };
            
            reader.readAsText(file);
        });
        
        input.click();
    }
    
    // Pattern suggestions
    suggestPatterns() {
        if (!window.app || !window.app.selectedFile) {
            alert('Please select a PDF file to analyze for pattern suggestions');
            return;
        }
        
        const text = window.app.selectedFile.text;
        if (!text) {
            alert('No text available in the selected PDF');
            return;
        }
        
        const suggestions = this.analyzeTextForPatterns(text);
        
        if (suggestions.length === 0) {
            alert('No common patterns found in the current PDF');
            return;
        }
        
        // Show suggestions dialog
        this.showPatternSuggestions(suggestions);
    }
    
    analyzeTextForPatterns(text) {
        const suggestions = [];
        
        // Common patterns to look for
        const patterns = [
            {
                name: 'Invoice Number',
                regex: /invoice\s*#?\s*:?\s*([A-Z0-9-]+)/i,
                description: 'Extracts invoice numbers'
            },
            {
                name: 'Date (YYYY-MM-DD)',
                regex: /(\d{4}-\d{2}-\d{2})/,
                description: 'Extracts dates in YYYY-MM-DD format'
            },
            {
                name: 'Date (MM/DD/YYYY)',
                regex: /(\d{1,2}\/\d{1,2}\/\d{4})/,
                description: 'Extracts dates in MM/DD/YYYY format'
            },
            {
                name: 'Reference Number',
                regex: /ref(?:erence)?\s*#?\s*:?\s*([A-Z0-9-]+)/i,
                description: 'Extracts reference numbers'
            },
            {
                name: 'Document ID',
                regex: /(?:doc|document)\s*(?:id|number)?\s*#?\s*:?\s*([A-Z0-9-]+)/i,
                description: 'Extracts document IDs'
            },
            {
                name: 'Order Number',
                regex: /order\s*#?\s*:?\s*([A-Z0-9-]+)/i,
                description: 'Extracts order numbers'
            },
            {
                name: 'Account Number',
                regex: /account\s*#?\s*:?\s*([A-Z0-9-]+)/i,
                description: 'Extracts account numbers'
            },
            {
                name: 'Email Address',
                regex: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
                description: 'Extracts email addresses'
            },
            {
                name: 'Phone Number',
                regex: /(\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/,
                description: 'Extracts phone numbers'
            },
            {
                name: 'Currency Amount',
                regex: /\$([0-9,]+\.?[0-9]*)/,
                description: 'Extracts dollar amounts'
            }
        ];
        
        patterns.forEach(pattern => {
            const matches = text.match(new RegExp(pattern.regex, 'gi'));
            if (matches && matches.length > 0) {
                suggestions.push({
                    ...pattern,
                    matches: matches.slice(0, 3), // Show first 3 matches
                    totalMatches: matches.length
                });
            }
        });
        
        return suggestions;
    }
    
    showPatternSuggestions(suggestions) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-lightbulb"></i> Pattern Suggestions</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p>Found ${suggestions.length} potential pattern(s) in the current PDF:</p>
                    <div class="suggestion-list">
                        ${suggestions.map((suggestion, index) => `
                            <div class="suggestion-item">
                                <div class="suggestion-header">
                                    <strong>${this.escapeHtml(suggestion.name)}</strong>
                                    <button class="btn btn-sm btn-success" onclick="patternManager.addSuggestedPattern(${index}, this)">
                                        <i class="fas fa-plus"></i> Add
                                    </button>
                                </div>
                                <div class="suggestion-regex">
                                    <code>${this.escapeHtml(suggestion.regex.toString())}</code>
                                </div>
                                <div class="suggestion-description">
                                    ${this.escapeHtml(suggestion.description)}
                                </div>
                                <div class="suggestion-matches">
                                    <strong>Matches (${suggestion.totalMatches}):</strong>
                                    ${suggestion.matches.map(match => `<span class="match-example">${this.escapeHtml(match)}</span>`).join(', ')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
                </div>
            </div>
        `;
        
        // Store suggestions for later use
        modal._suggestions = suggestions;
        
        document.body.appendChild(modal);
    }
    
    addSuggestedPattern(index, button) {
        const modal = button.closest('.modal');
        const suggestion = modal._suggestions[index];
        
        // Check if pattern already exists
        if (this.patterns.find(p => p.name === suggestion.name)) {
            if (!confirm(`Pattern "${suggestion.name}" already exists. Replace it?`)) {
                return;
            }
        }
        
        const pattern = {
            name: suggestion.name,
            regex: suggestion.regex.source,
            description: suggestion.description,
            created: new Date().toISOString()
        };
        
        // Add or replace pattern
        const existingIndex = this.patterns.findIndex(p => p.name === pattern.name);
        if (existingIndex >= 0) {
            this.patterns[existingIndex] = pattern;
        } else {
            this.patterns.push(pattern);
        }
        
        this.savePatterns();
        this.renderPatternList();
        
        // Update button
        button.innerHTML = '<i class="fas fa-check"></i> Added';
        button.disabled = true;
        button.className = 'btn btn-sm btn-secondary';
        
        this.showMessage(`Pattern "${pattern.name}" added`, 'success');
    }
}

// Initialize pattern manager
// NOTE: This manager is no longer used since we consolidated into the main Files & Patterns tab
// let patternManager;
// document.addEventListener('DOMContentLoaded', () => {
//     patternManager = new PatternManager();
//     window.patternManager = patternManager;
// });

// Close modal function
function closePatternManagerModal() {
    patternManager.closeModal();
}

// Add styles for pattern manager
const patternManagerStyles = document.createElement('style');
patternManagerStyles.textContent = `
    .pattern-item-full {
        border: 1px solid #dee2e6;
        border-radius: 6px;
        padding: 1rem;
        margin-bottom: 1rem;
        background: #f8f9fa;
    }
    
    .pattern-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }
    
    .pattern-name {
        font-weight: 600;
        color: #495057;
    }
    
    .pattern-actions {
        display: flex;
        gap: 0.25rem;
    }
    
    .pattern-regex {
        margin: 0.5rem 0;
        padding: 0.5rem;
        background: #ffffff;
        border: 1px solid #dee2e6;
        border-radius: 4px;
        font-family: 'Courier New', monospace;
        font-size: 0.875rem;
        word-break: break-all;
    }
    
    .pattern-description {
        color: #6c757d;
        font-size: 0.875rem;
        margin-bottom: 0.5rem;
    }
    
    .pattern-meta {
        color: #adb5bd;
        font-size: 0.75rem;
    }
    
    .suggestion-list {
        max-height: 400px;
        overflow-y: auto;
    }
    
    .suggestion-item {
        border: 1px solid #dee2e6;
        border-radius: 6px;
        padding: 1rem;
        margin-bottom: 1rem;
        background: #f8f9fa;
    }
    
    .suggestion-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }
    
    .suggestion-regex {
        margin: 0.5rem 0;
        padding: 0.5rem;
        background: #ffffff;
        border: 1px solid #dee2e6;
        border-radius: 4px;
        font-family: 'Courier New', monospace;
        font-size: 0.875rem;
    }
    
    .suggestion-description {
        color: #6c757d;
        font-size: 0.875rem;
        margin-bottom: 0.5rem;
    }
    
    .suggestion-matches {
        font-size: 0.875rem;
    }
    
    .match-example {
        background: #e3f2fd;
        padding: 0.125rem 0.25rem;
        border-radius: 3px;
        font-family: monospace;
        font-size: 0.8rem;
    }
`;
document.head.appendChild(patternManagerStyles);
