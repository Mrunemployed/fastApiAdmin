import { apiClient } from './apiClient.js';
import { renderInsertForm } from './insertForm.js';

// Make apiClient globally available for debugging
window.apiClient = apiClient;

console.log('dashboard.js loaded, apiClient:', apiClient);

document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard initialized');
    console.log('ApiClient available globally:', window.apiClient);
    console.log('ApiClient from import:', apiClient);
    
    // --- UI Manager ---
    const UIMgr = {
        elements: {
            loadingScreen: document.getElementById('loadingScreen'),
            dashboardContent: document.getElementById('dashboardContent'),
            loading: document.getElementById('loadingState'),
            error: document.getElementById('errorState'),
            grid: document.getElementById('tablesGrid'),
            toastContainer: document.getElementById('toastContainer'),
            table: document.getElementById('tableModal'),
            record: document.getElementById('recordModal'),
            delete: document.getElementById('deleteModal'),
            profileBtn: document.getElementById('profileBtn'),
            profilePanel: document.getElementById('profilePanel'),
        },
        show(element) { 
            if (element) element.classList.remove('hidden'); 
        },
        hide(element) { 
            if (element) element.classList.add('hidden'); 
        },
        showLoading() { 
            this.hide(this.elements.error); 
            this.hide(this.elements.grid); 
            this.show(this.elements.loading); 
        },
        showGrid() { 
            this.hide(this.elements.loading); 
            this.hide(this.elements.error); 
            this.show(this.elements.grid); 
        },
        showError(message) {
            this.hide(this.elements.loading); 
            this.hide(this.elements.grid); 
            this.show(this.elements.error);
            const errorElement = document.getElementById('errorMessage');
            if (errorElement) errorElement.textContent = message;
        },
        showTableModal() { this.show(this.elements.table); },
        hideTableModal() { this.hide(this.elements.table); },
        showRecordModal() { this.show(this.elements.record); },
        hideRecordModal() { this.hide(this.elements.record); },
        showDeleteModal() { this.show(this.elements.delete); },
        hideDeleteModal() { this.hide(this.elements.delete); },
        showDashboard() {
            this.hide(this.elements.loadingScreen);
            this.show(this.elements.dashboardContent);
        },
        toggleProfilePanel() {
            const panel = this.elements.profilePanel;
            const profileBtn = this.elements.profileBtn;
            
            if (panel && profileBtn) {
                const isVisible = !panel.classList.contains('hidden');
                
                if (isVisible) {
                    this.hide(panel);
                } else {
                    // Calculate position for fixed dropdown
                    const btnRect = profileBtn.getBoundingClientRect();
                    const panelWidth = 320; // w-80 = 320px
                    
                    // Position the panel below the button, aligned to the right
                    panel.style.top = `${btnRect.bottom + 8}px`; // 8px gap
                    panel.style.right = `${window.innerWidth - btnRect.right}px`;
                    
                    // Ensure it doesn't go off-screen
                    if (btnRect.right + panelWidth > window.innerWidth) {
                        panel.style.right = '16px'; // 16px from right edge
                    }
                    
                    // Force the highest z-index
                    panel.style.zIndex = '99999';
                    panel.style.position = 'fixed';
                    
                    this.show(panel);
                    
                    console.log('Profile panel positioned:', {
                        top: panel.style.top,
                        right: panel.style.right,
                        zIndex: panel.style.zIndex,
                        position: panel.style.position
                    });
                }
                console.log('Profile panel toggled, visible:', !isVisible);
            } else {
                console.error('Profile panel or button not found:', { panel, profileBtn });
            }
        },
        showToast(message, type = 'info') {
            const toast = document.createElement('div');
            const bgColor = type === 'success' ? 'bg-green-500' : (type === 'error' ? 'bg-red-500' : 'bg-blue-500');
            const icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle');
            toast.className = `toast p-4 rounded-xl text-white ${bgColor} shadow-xl backdrop-blur-sm border border-white/20 flex items-center justify-between`;
            toast.innerHTML = `
                <div class="flex items-center gap-3">
                    <i class="fas ${icon} text-lg"></i>
                    <span class="font-medium">${message}</span>
                </div>
                <button class="toast-close-btn ml-3 text-white/80 hover:text-white transition-colors duration-200" onclick="this.parentElement.remove()">
                    <i class="fas fa-times text-sm"></i>
                </button>
            `;
            this.elements.toastContainer.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100%)';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    };

    // --- Authentication & User Management ---
    const Auth = {
        init() {
            console.log('Initializing Auth component');
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', this.handleLogout.bind(this));
            }
            
            // Add profile panel functionality
            const profileBtn = document.getElementById('profileBtn');
            if (profileBtn) {
                profileBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    UIMgr.toggleProfilePanel();
                });
            }
            
            // Close profile panel when clicking outside
            document.addEventListener('click', (e) => {
                const profilePanel = document.getElementById('profilePanel');
                const profileBtn = document.getElementById('profileBtn');
                if (profilePanel && !profilePanel.contains(e.target) && !profileBtn.contains(e.target)) {
                    UIMgr.hide(profilePanel);
                }
            });
            
            // Close profile panel when window is resized
            window.addEventListener('resize', () => {
                const profilePanel = document.getElementById('profilePanel');
                if (profilePanel && !profilePanel.classList.contains('hidden')) {
                    UIMgr.hide(profilePanel);
                }
            });
            
            this.checkAuth();
        },
        async checkAuth() {
            console.log('Checking authentication...');
            if (!apiClient.isAuthenticated()) {
                console.log('User not authenticated, redirecting to login');
                window.location.href = '/starter_admin/xyz/';
                return;
            }

            try {
                // Test the token by fetching tables
                const tables = await apiClient.getAllTables();
                console.log('Auth check successful, tables response:', tables);
                if (tables && tables.all) {
                    this.updateUserInfo();
                    UIMgr.showDashboard();
                    TableManager.loadTables();
                } else {
                    throw new Error('Invalid response from server');
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                apiClient.clearToken();
                UIMgr.showToast('Session expired. Please login again.', 'error');
                setTimeout(() => {
                    window.location.href = '/starter_admin/xyz/';
                }, 2000);
            }
        },
        updateUserInfo() {
            const userDetails = apiClient.userDetails;
            console.log('Updating user info with:', userDetails);
            
            // Update profile panel
            const userName = document.getElementById('userName');
            const userEmail = document.getElementById('userEmail');
            const userType = document.getElementById('userType');
            const userId = document.getElementById('userId');
            const planExpiry = document.getElementById('planExpiry');
            
            if (userName) userName.textContent = userDetails.name || 'Admin User';
            if (userEmail) userEmail.textContent = userDetails.email || 'admin@example.com';
            if (userType) userType.textContent = userDetails.user_type || 'admin';
            if (userId) userId.textContent = userDetails.user_id || 'N/A';
            if (planExpiry) {
                const expiry = userDetails.plan_expiry;
                if (expiry) {
                    const date = new Date(expiry);
                    planExpiry.textContent = date.toLocaleDateString();
                } else {
                    planExpiry.textContent = 'N/A';
                }
            }
        },
        handleLogout() {
            console.log('Logging out...');
            apiClient.clearToken();
            UIMgr.showToast('Logged out successfully.', 'info');
            setTimeout(() => {
                window.location.href = '/starter_admin/xyz/';
            }, 1000);
        }
    };

    // --- Table Manager Component ---
    const TableManager = {
        currentTable: null,
        currentData: { headers: {}, data: [] },
        recordToDelete: null,
        
        init() {
            console.log('Initializing TableManager component');
            const retryBtn = document.getElementById('retryBtn');
            const closeTableModal = document.getElementById('closeTableModal');
            const closeRecordModal = document.getElementById('closeRecordModal');
            const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
            const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
            const recordModal = document.getElementById('recordModal');
            
            if (retryBtn) retryBtn.addEventListener('click', this.loadTables.bind(this));
            if (closeTableModal) closeTableModal.addEventListener('click', () => UIMgr.hideTableModal());
            if (closeRecordModal) closeRecordModal.addEventListener('click', () => UIMgr.hideRecordModal());
            if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', this.confirmDelete.bind(this));
            if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', this.cancelDelete.bind(this));
            if (recordModal) {
                recordModal.addEventListener('click', (event) => {
                    if (event.target === recordModal) {
                        UIMgr.hideRecordModal();
                    }
                });
            }
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape' && UIMgr.elements.record && !UIMgr.elements.record.classList.contains('hidden')) {
                    UIMgr.hideRecordModal();
                }
            });
        },

        async loadTables() {
            console.log('Loading tables...');
            UIMgr.showLoading();
            try {
                const response = await apiClient.getAllTables();
                console.log('Tables response:', response);
                
                // Handle different response structures
                let tables = [];
                if (response && response.all) {
                    tables = response.all;
                } else if (Array.isArray(response)) {
                    tables = response;
                } else if (response && typeof response === 'object') {
                    tables = Object.keys(response);
                }
                
                console.log('Processed tables:', tables);
                this.renderTableGrid(tables);
                UIMgr.showGrid();
                UIMgr.showToast(`Loaded ${tables.length} tables successfully.`, 'success');
            } catch (error) {
                console.error('Failed to load tables:', error);
                UIMgr.showError(error.message || 'Failed to load tables');
            }
        },

        renderTableGrid(tables) {
            console.log('Rendering table grid with tables:', tables);
            const container = document.getElementById('tablesGrid');
            if (!container) {
                console.error('Tables grid container not found!');
                return;
            }
            
            container.innerHTML = '';
            
            if (!tables || tables.length === 0) {
                container.innerHTML = `
                    <div class="col-span-full text-center py-12">
                        <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-md mx-auto">
                            <i class="fas fa-database text-4xl text-gray-400 mb-4"></i>
                            <h3 class="text-xl font-semibold text-white mb-2">No Tables Found</h3>
                            <p class="text-white/70">No database tables are available to display.</p>
                        </div>
                    </div>`;
                return;
            }
            
            tables.forEach(name => {
                const card = document.createElement('div');
                card.className = 'p-6 table-card cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105';
                card.innerHTML = `
                    <div class="flex items-start justify-between">
                        <div class="flex-1 min-w-0">
                            <h3 class="text-sm font-semibold text-gray-800 mb-2 break-words leading-tight">${name}</h3>
                            <p class="text-xs text-gray-600">Click to view table data</p>
                        </div>
                        <div class="text-blue-500 ml-4 flex-shrink-0">
                            <i class="fas fa-table text-xl"></i>
                        </div>
                    </div>
                `;
                card.addEventListener('click', () => this.viewTable(name));
                container.appendChild(card);
            });
        },

        async viewTable(name) {
            console.log('Viewing table:', name);
            this.currentTable = name;
            UIMgr.showTableModal();
            const titleElement = document.getElementById('tableModalTitle');
            if (titleElement) titleElement.textContent = `Table: ${name}`;
            
            const tableBody = document.getElementById('tableBody');
            if (tableBody) tableBody.innerHTML = `
                <tr>
                    <td colspan="100%" class="p-8 text-center">
                        <div class="flex flex-col items-center">
                            <div class="spinner mb-4"></div>
                            <p class="text-gray-500">Loading table data...</p>
                        </div>
                    </td>
                </tr>`;
            
            try {
                const response = await apiClient.getTableData(name);
                console.log('Table data response:', response);
                
                // Handle the new response structure
                let headers = {};
                let data = [];
                let primaryKey = null;
                
                if (response && response.headers) {
                    headers = response.headers;
                    
                    // Handle data - it might be null for empty tables
                    if (response.data) {
                        // Extract the primary key field name
                        if (response.data.primary_key) {
                            primaryKey = response.data.primary_key;
                        }
                        
                        // Convert the data object to an array of rows
                        // Filter out the 'primary_key' field from the data object
                        const dataObj = response.data;
                        data = Object.keys(dataObj)
                            .filter(key => key !== 'primary_key')
                            .map(key => dataObj[key]);
                    } else {
                        // Empty table - data is null, but we still have headers
                        data = [];
                        // Try to find primary key in headers
                        Object.keys(headers).forEach(key => {
                            if (headers[key] && headers[key].is_primary_key) {
                                primaryKey = key;
                            }
                        });
                    }
                        
                } else if (response && response.columns && response.rows) {
                    headers = response.columns;
                    data = response.rows;
                } else if (Array.isArray(response) && response.length > 0) {
                    // If response is an array of objects, create headers from first object
                    const firstRow = response[0];
                    headers = Object.keys(firstRow).reduce((acc, key) => {
                        acc[key] = { name: key, type: 'text' };
                        return acc;
                    }, {});
                    data = response;
                }
                
                console.log('Processed table data:', { headers, data, primaryKey });
                this.renderTable(headers, data, primaryKey);
            } catch (error) {
                console.error('Failed to load table data:', error);
                UIMgr.showToast(`Error loading table: ${error.message}`, 'error');
                UIMgr.hideTableModal();
            }
        },

        renderTable(headers, data, primaryKey) {
            console.log('Rendering table with headers:', headers, 'and data:', data, 'primaryKey:', primaryKey);
            
            // Store current data for edit functionality
            this.currentData = { headers, data, primaryKey };
            
            const header = document.getElementById('tableHeader');
            const body = document.getElementById('tableBody');
            const meta = document.getElementById('tableMeta');
            
            if (!header || !body) {
                console.error('Table header or body elements not found!');
                return;
            }
            
            // --- Render Column Metadata ---
            if (meta) {
                meta.innerHTML = '';
                const metaGrid = document.createElement('div');
                metaGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
                Object.keys(headers).forEach(key => {
                    const col = headers[key];
                    const isPK = col.is_primary_key;
                    const isFK = col.is_foreign_key;
                    const type = col.type || 'unknown';
                    const size = col.size;
                    const label = col.name || key;
                    
                    const card = document.createElement('div');
                    card.className = 'bg-gray-900 text-white rounded-xl p-4 flex flex-col gap-2 shadow border border-gray-800';
                    
                    // Column name
                    const nameRow = document.createElement('div');
                    nameRow.className = 'flex items-center gap-2';
                    nameRow.innerHTML = `<span class="font-mono text-base">${label}</span>`;
                    if (isPK) {
                        nameRow.innerHTML += '<span class="ml-2 px-2 py-0.5 rounded bg-blue-600 text-xs font-semibold flex items-center gap-1"><i class="fas fa-key mr-1"></i>Primary Key</span>';
                    }
                    if (isFK) {
                        nameRow.innerHTML += '<span class="ml-2 px-2 py-0.5 rounded bg-green-600 text-xs font-semibold flex items-center gap-1"><i class="fas fa-link mr-1"></i>Foreign Key</span>';
                    }
                    card.appendChild(nameRow);
                    
                    // Type and size
                    const metaRow = document.createElement('div');
                    metaRow.className = 'flex items-center gap-2 mt-1';
                    metaRow.innerHTML = `<span class="px-2 py-0.5 rounded bg-gray-800 text-green-200 text-xs font-mono flex items-center gap-1"><i class="fas fa-font mr-1"></i>${type}</span>`;
                    if (size) {
                        metaRow.innerHTML += `<span class="px-2 py-0.5 rounded bg-gray-800 text-blue-200 text-xs font-mono flex items-center gap-1"><i class="fas fa-ruler-horizontal mr-1"></i>${size}</span>`;
                    }
                    card.appendChild(metaRow);
                    
                    metaGrid.appendChild(card);
                });
                meta.appendChild(metaGrid);
            }
            
            if (!headers || Object.keys(headers).length === 0) {
                header.innerHTML = '<tr><th class="p-4 text-left bg-gray-50 border-b font-semibold text-gray-700">No columns found</th></tr>';
                body.innerHTML = '<tr><td class="p-8 text-center text-gray-500">No data available</td></tr>';
                return;
            }
            
            // Create header row
            const headerRow = document.createElement('tr');
            const headerKeys = Object.keys(headers);
            
            headerKeys.forEach((key, index) => {
                const th = document.createElement('th');
                th.className = 'p-4 text-left bg-gray-50 border-b font-semibold text-gray-700';
                // Use the name from the header metadata if available
                const headerInfo = headers[key];
                th.textContent = headerInfo && headerInfo.name ? headerInfo.name : key;
                
                // Add sticky positioning for first and last columns
                if (index === 0) {
                    th.classList.add('sticky', 'left-0', 'z-10');
                } else if (index === headerKeys.length - 1) {
                    th.classList.add('sticky', 'right-0', 'z-10');
                }
                
                headerRow.appendChild(th);
            });
            
            // Add actions column
            const actionsTh = document.createElement('th');
            actionsTh.className = 'p-4 text-center bg-gray-50 border-b font-semibold text-gray-700 w-32 sticky right-0 z-10';
            actionsTh.textContent = 'Actions';
            headerRow.appendChild(actionsTh);
            header.innerHTML = '';
            header.appendChild(headerRow);
            
            // Create data rows
            body.innerHTML = '';
            if (!data || data.length === 0) {
                const noDataRow = document.createElement('tr');
                noDataRow.innerHTML = `
                    <td colspan="${Object.keys(headers).length + 1}" class="p-8 text-center">
                        <div class="flex flex-col items-center">
                            <i class="fas fa-inbox text-4xl text-gray-300 mb-2"></i>
                            <p class="text-gray-500">No data available in this table</p>
                        </div>
                    </td>`;
                body.appendChild(noDataRow);
                return;
            }
            
            data.forEach((row, index) => {
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-gray-50 border-b transition-colors cursor-pointer';
                
                headerKeys.forEach((key, colIndex) => {
                    const td = document.createElement('td');
                    td.className = 'p-4 border-b text-sm';
                    const value = row[key] || '';
                    
                    // Add sticky positioning for first and last columns
                    if (colIndex === 0) {
                        td.classList.add('sticky', 'left-0', 'z-10', 'bg-white');
                    } else if (colIndex === headerKeys.length - 1) {
                        td.classList.add('sticky', 'right-0', 'z-10', 'bg-white');
                    }
                    
                    // Format the value based on type
                    if (value === null || value === undefined) {
                        td.innerHTML = '<span class="text-gray-400 italic">null</span>';
                    } else if (typeof value === 'object') {
                        // Handle objects (including JSON objects)
                        try {
                            const jsonString = JSON.stringify(value, null, 2);
                            td.innerHTML = `<code class="text-xs bg-gray-100 px-2 py-1 rounded whitespace-pre-wrap">${jsonString}</code>`;
                        } catch (e) {
                            td.innerHTML = `<code class="text-xs bg-gray-100 px-2 py-1 rounded">${String(value)}</code>`;
                        }
                    } else if (typeof value === 'boolean') {
                        td.innerHTML = value ? 
                            '<span class="text-green-600"><i class="fas fa-check"></i></span>' : 
                            '<span class="text-red-600"><i class="fas fa-times"></i></span>';
                    } else {
                        td.textContent = String(value);
                    }
                    tr.appendChild(td);
                });
                
                // Add edit and delete buttons
                const actionsTd = document.createElement('td');
                actionsTd.className = 'p-4 border-b text-center sticky right-0 z-10 bg-white';
                actionsTd.addEventListener('click', (event) => {
                    event.stopPropagation();
                });
                
                // Edit button
                const editBtn = document.createElement('button');
                editBtn.className = 'btn btn-primary btn-sm px-2 py-1 text-xs mr-1';
                editBtn.innerHTML = '<i class="fas fa-edit"></i>';
                editBtn.title = 'Edit record';
                editBtn.addEventListener('click', (event) => {
                    event.stopPropagation();
                    this.handleEdit(row, headers, primaryKey, tr);
                });
                actionsTd.appendChild(editBtn);
                
                // Delete button
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-danger btn-sm px-2 py-1 text-xs';
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                deleteBtn.title = 'Delete record';
                deleteBtn.addEventListener('click', (event) => {
                    event.stopPropagation();
                    this.handleDelete(row, headers, primaryKey);
                });
                actionsTd.appendChild(deleteBtn);
                
                tr.appendChild(actionsTd);
                
                tr.addEventListener('click', (event) => {
                    if (tr.dataset.editing === 'true') {
                        return;
                    }
                    if (event.target.closest('button') || event.target.closest('input') || event.target.closest('textarea') || event.target.closest('select')) {
                        return;
                    }
                    this.showRecordModal(row, headers);
                });
                
                // Add hover effect for sticky columns
                tr.addEventListener('mouseenter', () => {
                    const stickyCells = tr.querySelectorAll('td.sticky');
                    stickyCells.forEach(cell => {
                        cell.style.backgroundColor = '#f3f4f6';
                    });
                });
                
                tr.addEventListener('mouseleave', () => {
                    const stickyCells = tr.querySelectorAll('td.sticky');
                    stickyCells.forEach(cell => {
                        cell.style.backgroundColor = '#ffffff';
                    });
                });
                
                body.appendChild(tr);
            });
            
            // Check if horizontal scrolling is needed and add visual indicator
            setTimeout(() => {
                this.checkHorizontalScroll();
            }, 100);
        },

        showRecordModal(row, headers) {
            const title = document.getElementById('recordModalTitle');
            const subtitle = document.getElementById('recordModalSubtitle');
            const body = document.getElementById('recordModalBody');
            
            if (title) title.textContent = 'Record Details';
            const headerKeys = Object.keys(headers || {});
            const rowKeys = Object.keys(row || {});
            const displayKeys = headerKeys.length ? headerKeys : rowKeys;
            
            if (subtitle) {
                const tableName = this.currentTable || 'Table';
                subtitle.textContent = `${tableName} • ${displayKeys.length} fields`;
            }
            
            if (!body) {
                console.error('Record modal body not found');
                return;
            }
            
            body.innerHTML = '';
            const grid = document.createElement('div');
            grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';
            
            displayKeys.forEach((key) => {
                const headerInfo = headers && headers[key] ? headers[key] : {};
                const label = headerInfo.name || key;
                const type = headerInfo.type || '';
                const value = row[key];
                
                const card = document.createElement('div');
                card.className = 'bg-white/60 border border-white/20 rounded-xl p-4';
                
                const headerRow = document.createElement('div');
                headerRow.className = 'flex items-center justify-between mb-2';
                
                const labelEl = document.createElement('div');
                labelEl.className = 'text-sm font-semibold text-gray-700';
                labelEl.textContent = label;
                headerRow.appendChild(labelEl);
                
                if (type) {
                    const typeEl = document.createElement('span');
                    typeEl.className = 'text-xs font-mono text-gray-500 bg-white/80 px-2 py-0.5 rounded';
                    typeEl.textContent = type;
                    headerRow.appendChild(typeEl);
                }
                
                const valueEl = document.createElement('div');
                valueEl.className = 'text-sm text-gray-800 break-words';
                
                if (value === null || value === undefined) {
                    const nullEl = document.createElement('span');
                    nullEl.className = 'text-gray-400 italic';
                    nullEl.textContent = 'null';
                    valueEl.appendChild(nullEl);
                } else if (typeof value === 'object') {
                    const codeEl = document.createElement('pre');
                    codeEl.className = 'text-xs bg-gray-100 px-2 py-1 rounded whitespace-pre-wrap';
                    try {
                        codeEl.textContent = JSON.stringify(value, null, 2);
                    } catch (e) {
                        codeEl.textContent = String(value);
                    }
                    valueEl.appendChild(codeEl);
                } else if (typeof value === 'boolean') {
                    valueEl.textContent = value ? 'true' : 'false';
                } else {
                    valueEl.textContent = String(value);
                }
                
                card.appendChild(headerRow);
                card.appendChild(valueEl);
                grid.appendChild(card);
            });
            
            body.appendChild(grid);
            UIMgr.showRecordModal();
        },
        
        checkHorizontalScroll() {
            const scrollContainer = document.querySelector('.table-scroll-container');
            const scrollIndicator = document.getElementById('scrollIndicator');
            
            if (scrollContainer) {
                const hasOverflow = scrollContainer.scrollWidth > scrollContainer.clientWidth;
                if (hasOverflow) {
                    scrollContainer.classList.add('has-overflow');
                    if (scrollIndicator) {
                        scrollIndicator.classList.remove('hidden');
                    }
                } else {
                    scrollContainer.classList.remove('has-overflow');
                    if (scrollIndicator) {
                        scrollIndicator.classList.add('hidden');
                    }
                }
            }
        },
        
        handleDelete(row, headers, primaryKey) {
            console.log('handleDelete called with:', { row, headers, primaryKey });
            console.log('Current table:', this.currentTable);
            
            // First, try to find the primary key field from the metadata
            let pkField = Object.keys(headers).find(key => 
                headers[key] && headers[key].is_primary_key === true
            );
            console.log('Primary key field from metadata:', pkField);
            
            // If not found in metadata, use the primaryKey parameter if provided
            if (!pkField && primaryKey) {
                pkField = primaryKey;
                console.log('Using primaryKey parameter:', pkField);
            }
            
            // Fallback to common naming patterns
            if (!pkField) {
                pkField = Object.keys(headers).find(key => 
                    key.toLowerCase().includes('id') || 
                    key.toLowerCase().includes('pk') || 
                    key.toLowerCase().includes('primary')
                ) || Object.keys(headers)[0];
                console.log('Using fallback primary key field:', pkField);
            }
            
            console.log('Final primary key field:', pkField);
            console.log('Available headers:', headers);
            console.log('Row data:', row);
            
            if (!pkField) {
                UIMgr.showToast('No primary key found for this table.', 'error');
                return;
            }
            
            const pkValue = row[pkField];
            console.log('Primary key value:', pkValue, 'for field:', pkField);
            
            if (pkValue === undefined || pkValue === null) {
                UIMgr.showToast('Cannot delete record: missing primary key value.', 'error');
                return;
            }
            
            this.recordToDelete = { 
                pkValue: pkValue, 
                pkField: pkField, 
                table: this.currentTable 
            };
            
            console.log('Deleting record:', this.recordToDelete);
            UIMgr.showDeleteModal();
        },

        handleEdit(row, headers, primaryKey, tr) {
            console.log('handleEdit called with:', { row, headers, primaryKey });
            console.log('Current table:', this.currentTable);
            
            const pkField = resolvePrimaryKeyField(headers, primaryKey);
            if (!pkField) {
                UIMgr.showToast('No primary key found for this table.', 'error');
                return;
            }
            
            const pkValue = row[pkField];
            if (pkValue === undefined || pkValue === null) {
                UIMgr.showToast('Cannot edit record: missing primary key value.', 'error');
                return;
            }
            
            openEditModal({
                headers,
                tableName: this.currentTable,
                row,
                pkField,
                pkValue
            });
        },

        async handleSave(row, headers, primaryKey, tr) {
            console.log('handleSave called');
            
            // Find the primary key field
            let pkField = Object.keys(headers).find(key => 
                headers[key] && headers[key].is_primary_key === true
            );
            
            if (!pkField && primaryKey) {
                pkField = primaryKey;
            }
            
            if (!pkField) {
                pkField = Object.keys(headers).find(key => 
                    key.toLowerCase().includes('id') || 
                    key.toLowerCase().includes('pk') || 
                    key.toLowerCase().includes('primary')
                ) || Object.keys(headers)[0];
            }
            
            const pkValue = row[pkField];
            
            // Collect updated values from input fields
            const updatedValues = {};
            const inputs = tr.querySelectorAll('input[data-field]');
            
            inputs.forEach(input => {
                const field = input.dataset.field;
                const value = input.value.trim();
                updatedValues[field] = value;
            });
            
            console.log('Updated values:', updatedValues);
            
            try {
                // Call the update API
                const result = await apiClient.updateRecord(pkValue, pkField, this.currentTable, updatedValues);
                console.log('Update result:', result);
                
                if (result === true) {
                    UIMgr.showToast('Record updated successfully.', 'success');
                    tr.classList.remove('editing');
                    // Refresh the table to show updated data
                    this.viewTable(this.currentTable);
                } else {
                    UIMgr.showToast('Update failed.', 'error');
                }
            } catch (error) {
                console.error('Update failed:', error);
                UIMgr.showToast(`Update failed: ${error.message}`, 'error');
            }
        },

        handleCancelEdit(tr) {
            console.log('handleCancelEdit called');
            
            // Restore original row data
            const originalRow = JSON.parse(tr.dataset.originalRow);
            delete tr.dataset.editing;
            delete tr.dataset.originalRow;
            tr.classList.remove('editing');
            
            // Re-render the row with original data
            const cells = tr.querySelectorAll('td:not(:last-child)');
            const headerKeys = Object.keys(this.currentData.headers);
            
            cells.forEach((cell, index) => {
                const key = headerKeys[index];
                const value = originalRow[key] || '';
                
                // Format the value based on type
                if (value === null || value === undefined) {
                    cell.innerHTML = '<span class="text-gray-400 italic">null</span>';
                } else if (typeof value === 'object') {
                    // Handle objects (including JSON objects)
                    try {
                        const jsonString = JSON.stringify(value, null, 2);
                        cell.innerHTML = `<code class="text-xs bg-gray-100 px-2 py-1 rounded whitespace-pre-wrap">${jsonString}</code>`;
                    } catch (e) {
                        cell.innerHTML = `<code class="text-xs bg-gray-100 px-2 py-1 rounded">${String(value)}</code>`;
                    }
                } else if (typeof value === 'boolean') {
                    cell.innerHTML = value ? 
                        '<span class="text-green-600"><i class="fas fa-check"></i></span>' : 
                        '<span class="text-red-600"><i class="fas fa-times"></i></span>';
                } else {
                    cell.textContent = String(value);
                }
            });
            
            // Restore action buttons
            const actionsTd = tr.querySelector('td:last-child');
            actionsTd.innerHTML = '';
            
            // Edit button
            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-primary btn-sm px-2 py-1 text-xs mr-1';
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
            editBtn.title = 'Edit record';
            editBtn.addEventListener('click', () => this.handleEdit(originalRow, this.currentData.headers, this.currentData.primaryKey, tr));
            actionsTd.appendChild(editBtn);
            
            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-danger btn-sm px-2 py-1 text-xs';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.title = 'Delete record';
            deleteBtn.addEventListener('click', () => this.handleDelete(originalRow, this.currentData.headers, this.currentData.primaryKey));
            actionsTd.appendChild(deleteBtn);
        },

        async confirmDelete() {
            if (!this.recordToDelete) {
                console.error('No record to delete');
                return;
            }
            const { pkValue, pkField, table } = this.recordToDelete;
            
            console.log('confirmDelete called with:', { pkValue, pkField, table });
            console.log('About to call apiClient.deleteRecord with:', { pkValue, pkField, table });
            console.log('apiClient object:', apiClient);
            console.log('apiClient.deleteRecord method:', apiClient.deleteRecord);
            console.log('apiClient.deleteRecord.toString():', apiClient.deleteRecord.toString().substring(0, 100) + '...');
            
            try {
                // Make the delete request directly to bypass any module loading issues
                const url = `/starter_admin/delete-data-from-table?primary_id=${encodeURIComponent(pkValue)}&primary_field=${encodeURIComponent(pkField)}&table_name=${encodeURIComponent(table)}`;
                const fullUrl = `${window.location.origin}${url}`;
                
                console.log('Making direct delete request to:', fullUrl);
                
                const headers = { 'accept': 'application/json' };
                if (apiClient.token) {
                    headers['Authorization'] = `Bearer ${apiClient.token}`;
                }
                
                const response = await fetch(fullUrl, {
                    method: 'POST',
                    headers: headers,
                    body: '' // Empty body as per the curl example
                });
                
                console.log('Direct delete response status:', response.status);
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.error('Direct delete error response:', errorData);
                    throw new Error(errorData.detail?.message || errorData.message || `HTTP error ${response.status}`);
                }
                
                const result = await response.json();
                console.log('Direct delete result:', result);
                UIMgr.showToast('Record deleted successfully.', 'success');
                this.viewTable(table);
            } catch (error) {
                console.error('Delete failed:', error);
                console.error('Error details:', {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                });
                UIMgr.showToast(`Delete failed: ${error.message}`, 'error');
            } finally {
                this.cancelDelete();
            }
        },

        cancelDelete() {
            this.recordToDelete = null;
            UIMgr.hideDeleteModal();
        }
    };

    // Patch TableManager to store last headers/primaryKey/tableName for insert
    if (!window.TableManager) window.TableManager = {};
    TableManager._lastHeaders = null;
    TableManager._lastPrimaryKey = null;
    TableManager._lastTableName = null;
    const origRenderTable = TableManager.renderTable;
    TableManager.renderTable = function(headers, data, primaryKey) {
        TableManager._lastHeaders = headers;
        TableManager._lastPrimaryKey = primaryKey;
        TableManager._lastTableName = TableManager.currentTable || '';
        if (origRenderTable) origRenderTable.call(TableManager, headers, data, primaryKey);
    };
    // Patch viewTable to set currentTable
    const origViewTable = TableManager.viewTable;
    TableManager.viewTable = function(name) {
        TableManager.currentTable = name;
        if (origViewTable) origViewTable.call(TableManager, name);
    };

    // --- Debug Functions ---
    window.testApiConnection = async function() {
        try {
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'test@test.com', password: 'test' })
            });
            document.getElementById('debugLastCall').textContent = `Auth test: ${response.status}`;
        } catch (error) {
            document.getElementById('debugLastCall').textContent = `Error: ${error.message}`;
        }
    };

    // Debug panel toggle functionality
    function initDebugPanel() {
        const debugToggle = document.getElementById('debugToggle');
        const debugContent = document.getElementById('debugContent');
        const debugClose = document.getElementById('debugClose');
        
        if (debugToggle) {
            debugToggle.addEventListener('click', () => {
                debugToggle.classList.add('hidden');
                debugContent.classList.remove('hidden');
            });
        }
        
        if (debugClose) {
            debugClose.addEventListener('click', () => {
                debugContent.classList.add('hidden');
                debugToggle.classList.remove('hidden');
            });
        }
    }

    function updateDebugInfo() {
        const debugBaseUrl = document.getElementById('debugBaseUrl');
        const debugPath = document.getElementById('debugPath');
        const debugAuth = document.getElementById('debugAuth');
        
        if (debugBaseUrl) debugBaseUrl.textContent = window.location.origin;
        if (debugPath) debugPath.textContent = window.location.pathname;
        if (debugAuth) debugAuth.textContent = localStorage.getItem('adminToken') ? 'Authenticated' : 'Not Authenticated';
    }

    function resolvePrimaryKeyField(headers, primaryKey) {
        if (!headers) return primaryKey || null;
        let pkField = Object.keys(headers).find(key => 
            headers[key] && headers[key].is_primary_key === true
        );
        if (!pkField && primaryKey) {
            pkField = primaryKey;
        }
        if (!pkField) {
            pkField = Object.keys(headers).find(key => 
                key.toLowerCase().includes('id') || 
                key.toLowerCase().includes('pk') || 
                key.toLowerCase().includes('primary')
            ) || Object.keys(headers)[0];
        }
        return pkField || null;
    }

    // --- Insert Modal Logic ---
    let lastInsertHeaders = null;
    let lastInsertPrimaryKey = null;
    let lastInsertTableName = null;
    let lastEditHeaders = null;
    let lastEditTableName = null;
    let lastEditPkField = null;
    let lastEditPkValue = null;

    function closeDynamicFormModal() {
        const modal = document.getElementById('insertFormModal');
        const overlay = document.getElementById('insertFormModalOverlay');
        if (modal) modal.remove();
        if (overlay) overlay.remove();
    }

    function openInsertModal(headers, primaryKey, tableName) {
        console.log('Opening insert modal with:', { headers, primaryKey, tableName });
        lastInsertHeaders = headers;
        lastInsertPrimaryKey = primaryKey;
        lastInsertTableName = tableName;
        const insertModal = document.getElementById('insertModal');
        if (!insertModal) {
            console.error('Insert modal not found');
            return;
        }
        console.log('Found insert modal, rendering form...');
        renderInsertForm({
            headers,
            primaryKey,
            tableName,
            onSubmit: handleInsertSubmit,
            onCancel: closeInsertModal
        }).then(() => {
            console.log('Form rendered successfully');
            insertModal.classList.remove('hidden');
        }).catch(error => {
            console.error('Failed to render insert form:', error);
            UIMgr.showToast('Failed to load insert form', 'error');
        });
    }
    function closeInsertModal() {
        closeDynamicFormModal();
        const insertModal = document.getElementById('insertModal');
        if (insertModal) insertModal.classList.add('hidden');
    }
    async function handleInsertSubmit(data) {
        // Send POST request
        try {
            const token = apiClient.token || '';
            const resp = await fetch(`/starter_admin/insert-data-in-table?primary_field=${encodeURIComponent(lastInsertPrimaryKey)}&table_name=${encodeURIComponent(lastInsertTableName)}`, {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            const result = await resp.json();
            if (result === true) {
                UIMgr.showToast('Row inserted successfully!', 'success');
                closeInsertModal();
                // Reload table
                if (window.TableManager && TableManager.viewTable) {
                    TableManager.viewTable(lastInsertTableName);
                }
            } else {
                UIMgr.showToast('Insert failed.', 'error');
            }
        } catch (err) {
            UIMgr.showToast('Insert failed: ' + err.message, 'error');
        }
    }

    function openEditModal({ headers, tableName, row, pkField, pkValue }) {
        console.log('Opening edit modal with:', { headers, tableName, pkField, pkValue, row });
        lastEditHeaders = headers;
        lastEditTableName = tableName;
        lastEditPkField = pkField;
        lastEditPkValue = pkValue;
        renderInsertForm({
            headers,
            primaryKey: pkField,
            tableName,
            initialValues: row,
            mode: 'edit',
            title: 'Edit Row',
            submitLabel: 'Update',
            onSubmit: handleEditSubmit,
            onCancel: closeEditModal
        }).catch(error => {
            console.error('Failed to render edit form:', error);
            UIMgr.showToast('Failed to load edit form', 'error');
        });
    }

    function closeEditModal() {
        closeDynamicFormModal();
    }

    async function handleEditSubmit(data) {
        try {
            const result = await apiClient.updateRecord(lastEditPkValue, lastEditPkField, lastEditTableName, data);
            if (result === true) {
                UIMgr.showToast('Record updated successfully.', 'success');
                closeEditModal();
                if (window.TableManager && TableManager.viewTable) {
                    TableManager.viewTable(lastEditTableName);
                }
            } else {
                UIMgr.showToast('Update failed.', 'error');
            }
        } catch (error) {
            console.error('Update failed:', error);
            UIMgr.showToast(`Update failed: ${error.message}`, 'error');
        }
    }
    // Insert button event
    document.addEventListener('click', (e) => {
        if (e.target.closest('#insertRowBtn')) {
            console.log('Insert button clicked');
            // Use last loaded table headers/primaryKey
            if (window.TableManager && TableManager._lastHeaders && TableManager._lastPrimaryKey && TableManager._lastTableName) {
                console.log('Table data available, opening insert modal');
                openInsertModal(TableManager._lastHeaders, TableManager._lastPrimaryKey, TableManager._lastTableName);
            } else {
                console.error('Table data not available:', {
                    hasTableManager: !!window.TableManager,
                    hasHeaders: !!TableManager._lastHeaders,
                    hasPrimaryKey: !!TableManager._lastPrimaryKey,
                    hasTableName: !!TableManager._lastTableName
                });
                UIMgr.showToast('No table data available. Please view a table first.', 'error');
            }
        }
        if (e.target.closest('#cancelInsertBtn')) {
            closeInsertModal();
        }
    });

    // --- Initializer ---
    function init() {
        console.log('Starting dashboard initialization...');
        Auth.init();
        TableManager.init();
        
        // Update debug info
        updateDebugInfo();
        setInterval(updateDebugInfo, 2000);
        
        // Initialize debug panel toggle functionality
        initDebugPanel();
        
        // Add window resize listener for horizontal scroll detection
        window.addEventListener('resize', () => {
            if (TableManager.checkHorizontalScroll) {
                TableManager.checkHorizontalScroll();
            }
        });
        
        console.log('Dashboard initialization complete');
    }

    init();
}); 
