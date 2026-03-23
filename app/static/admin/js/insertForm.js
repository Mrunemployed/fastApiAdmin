// insertForm.js
// Uses insertForm.html template for rendering

async function loadTemplate(path) {
    console.log('Loading template from:', path);
    try {
        const resp = await fetch(path);
        console.log('Template response status:', resp.status);
        console.log('Template response headers:', resp.headers);
        
        if (!resp.ok) {
            console.error('Template response not ok:', resp.status, resp.statusText);
            const errorText = await resp.text();
            console.error('Error response body:', errorText);
            throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        }
        
        const text = await resp.text();
        console.log('Template loaded successfully, length:', text.length);
        console.log('Template content preview:', text.substring(0, 200));
        return text;
    } catch (error) {
        console.error('Failed to load template:', error);
        throw error;
    }
}

// Test function to check template accessibility
async function testTemplateAccess() {
    console.log('Testing template access...');
    try {
        const testPath = '/starter_admin/xyz/templates/insertForm.html';
        console.log('Testing path:', testPath);
        const resp = await fetch(testPath);
        console.log('Test response status:', resp.status);
        if (resp.ok) {
            const text = await resp.text();
            console.log('Template accessible, length:', text.length);
            return true;
        } else {
            console.error('Template not accessible:', resp.status);
            return false;
        }
    } catch (error) {
        console.error('Template access test failed:', error);
        return false;
    }
}

function renderTemplate(template, data) {
    // Handle sections (arrays or booleans)
    template = template.replace(/{{#(\w+)}}([\s\S]*?){{\/\1}}/g, (m, key, content) => {
        const value = data[key];
        if (Array.isArray(value)) {
            return value.map(item => renderTemplate(content, item)).join('');
        } else if (value) {
            return renderTemplate(content, data);
        } else {
            return '';
        }
    });
    // Handle inverted sections (falsey)
    template = template.replace(/{{\^(\w+)}}([\s\S]*?){{\/\1}}/g, (m, key, content) => {
        const value = data[key];
        if (!value) {
            return renderTemplate(content, data);
        } else {
            return '';
        }
    });
    // Handle variables
    return template.replace(/{{(\w+)}}/g, (m, key) => (data[key] !== undefined ? data[key] : ''));
}

export async function renderInsertForm({ headers, primaryKey, tableName, onSubmit, onCancel, initialValues = {}, mode = 'insert', title = '', submitLabel = '' }) {
    console.log('renderInsertForm called with headers:', headers);
    // Remove any existing modal/overlay
    const oldOverlay = document.getElementById('insertFormModalOverlay');
    if (oldOverlay) oldOverlay.remove();
    const oldModal = document.getElementById('insertFormModal');
    if (oldModal) oldModal.remove();

    // Build fields array for template
    const fields = Object.keys(headers || {}).map(key => {
        const col = headers[key];
        const type = col.type || 'str';
        const isPK = col.is_primary_key;
        const isRequired = !col.nullable && !isPK;
        let inputType = 'text';
        if (type === 'int' || type === 'integer') inputType = 'number';
        if (type === 'float' || type === 'double') inputType = 'number';
        if (type === 'bool' || type === 'boolean') inputType = 'checkbox';
        if (type === 'dict') inputType = 'json';
        const rawValue = initialValues && Object.prototype.hasOwnProperty.call(initialValues, key)
            ? initialValues[key]
            : '';
        let displayValue = '';
        let checkedAttr = '';
        if (inputType === 'checkbox') {
            const isChecked = rawValue === true || rawValue === 'true' || rawValue === 1 || rawValue === '1';
            checkedAttr = isChecked ? 'checked' : '';
        } else if (inputType === 'json') {
            if (rawValue === null || rawValue === undefined) {
                displayValue = '';
            } else if (typeof rawValue === 'object') {
                try {
                    displayValue = JSON.stringify(rawValue);
                } catch {
                    displayValue = String(rawValue);
                }
            } else {
                displayValue = String(rawValue);
            }
        } else if (rawValue === null || rawValue === undefined) {
            displayValue = '';
        } else {
            displayValue = String(rawValue);
        }
        return {
            field_id: key,
            label: col.name || key,
            type,
            required: isRequired,
            pk: isPK,
            is_pk: isPK,
            is_json: inputType === 'json',
            is_checkbox: inputType === 'checkbox',
            is_input: !isPK && inputType !== 'json' && inputType !== 'checkbox',
            input_type: inputType,
            placeholder: `Enter ${col.name || key}`,
            maxlength: col.size || '',
            value: displayValue,
            checked: checkedAttr,
            error: '',
        };
    });

    // Load and render template for modal content only
    let modalContentHtml = '';
    try {
        const template = await loadTemplate('/starter_admin/xyz/templates/insertForm.html');
        modalContentHtml = renderTemplate(template, { fields });
    } catch (error) {
        console.error('Failed to load insert form template:', error);
        // fallback: use the old inline HTML (not shown here for brevity)
    }

    // Create overlay and modal containers
    const overlay = document.createElement('div');
    overlay.id = 'insertFormModalOverlay';
    overlay.className = 'fixed inset-0 bg-black bg-opacity-40 z-40 flex items-center justify-center';
    document.body.appendChild(overlay);

    const modal = document.createElement('div');
    modal.id = 'insertFormModal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center';
    modal.innerHTML = modalContentHtml;
    document.body.appendChild(modal);
    
    // Update title and submit label if provided
    const titleEl = modal.querySelector('#insertFormTitle');
    const submitBtnLabel = modal.querySelector('#submitInsertBtn');
    if (titleEl) {
        if (title) {
            titleEl.textContent = title;
        } else if (mode === 'edit') {
            titleEl.textContent = 'Edit Row';
        }
    }
    if (submitBtnLabel) {
        if (submitLabel) {
            submitBtnLabel.textContent = submitLabel;
        } else if (mode === 'edit') {
            submitBtnLabel.textContent = 'Update';
        }
    }

    // Validation helpers
    function showError(field, msg) {
        const err = modal.querySelector(`[data-err-for='${field}']`);
        if (err) err.textContent = msg;
    }
    function clearError(field) {
        const err = modal.querySelector(`[data-err-for='${field}']`);
        if (err) err.textContent = '';
    }

    // Submit button handler
    const submitBtn = modal.querySelector('#submitInsertBtn');
    if (submitBtn) {
        submitBtn.onclick = (e) => {
            e.preventDefault();
            let valid = true;
            const data = {};
            fields.forEach(f => {
                if (f.is_pk) return;
                const input = modal.querySelector(`[name='${f.field_id}']`);
                if (!input) return;
                let value = input.type === 'checkbox' ? input.checked : input.value;
                if (f.required && (value === '' || value === null || value === undefined)) {
                    showError(f.field_id, 'This field is required');
                    valid = false;
                    return;
                }
                if (f.type === 'int' || f.type === 'integer') {
                    if (value && !/^[-+]?\d+$/.test(value)) {
                        showError(f.field_id, 'Must be an integer');
                        valid = false;
                    } else {
                        clearError(f.field_id);
                    }
                } else if (f.type === 'float' || f.type === 'double') {
                    if (value && isNaN(Number(value))) {
                        showError(f.field_id, 'Must be a number');
                        valid = false;
                    } else {
                        clearError(f.field_id);
                    }
                } else if (f.type === 'dict') {
                    if (value) {
                        try {
                            JSON.parse(value);
                            clearError(f.field_id);
                        } catch {
                            showError(f.field_id, 'Invalid JSON');
                            valid = false;
                        }
                    } else {
                        clearError(f.field_id);
                    }
                } else {
                    clearError(f.field_id);
                }
                if (f.type === 'int' || f.type === 'integer') value = value !== '' ? parseInt(value, 10) : null;
                if (f.type === 'float' || f.type === 'double') value = value !== '' ? parseFloat(value) : null;
                if (f.type === 'dict') value = value ? JSON.parse(value) : null;
                data[f.field_id] = value;
            });
            if (valid) onSubmit(data);
        };
    }

    // Cancel and close button handlers
    const cancelBtn = modal.querySelector('#cancelInsertBtn');
    const closeBtn = modal.querySelector('#closeInsertFormModal');
    function closeModal() {
        modal.remove();
        overlay.remove();
        if (onCancel) onCancel();
    }
    if (cancelBtn) cancelBtn.onclick = (e) => { e.preventDefault(); closeModal(); };
    if (closeBtn) closeBtn.onclick = (e) => { e.preventDefault(); closeModal(); };
    overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

    // Accessibility: focus modal
    setTimeout(() => {
        modal.focus();
    }, 10);
} 
