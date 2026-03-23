import { apiClient } from './apiClient.js';

// Make apiClient globally available for debugging
window.apiClient = apiClient;

console.log('main.js loaded, apiClient:', apiClient);

document.addEventListener('DOMContentLoaded', () => {
    console.log('Admin UI initialized');
    console.log('ApiClient available globally:', window.apiClient);
    console.log('ApiClient from import:', apiClient);

    // --- UI Manager ---
    const UIMgr = {
        elements: {
            main: document.getElementById('mainContent'),
            login: document.getElementById('loginModal'),
            table: document.getElementById('tableModal'),
            add: document.getElementById('addRecordModal'),
            delete: document.getElementById('deleteModal'),
            loading: document.getElementById('loadingState'),
            error: document.getElementById('errorState'),
            grid: document.getElementById('tablesGrid'),
            toastContainer: document.getElementById('toastContainer'),
        },
        show(element) { 
            if (element) element.classList.remove('hidden'); 
        },
        hide(element) { 
            if (element) element.classList.add('hidden'); 
        },
        showLogin() { 
            this.show(this.elements.login); 
            this.hide(this.elements.main); 
        },
        showMain() { 
            this.hide(this.elements.login); 
            this.show(this.elements.main); 
        },
        showTableModal() { this.show(this.elements.table); },
        hideTableModal() { this.hide(this.elements.table); },
        showDeleteModal() { this.show(this.elements.delete); },
        hideDeleteModal() { this.hide(this.elements.delete); },
        showLoading() { 
            this.showMain(); 
            this.show(this.elements.loading); 
            this.hide(this.elements.grid); 
            this.hide(this.elements.error); 
        },
        showGrid() { 
            this.showMain(); 
            this.hide(this.elements.loading); 
            this.show(this.elements.grid); 
            this.hide(this.elements.error); 
        },
        showError(message) {
            this.showMain();
            this.hide(this.elements.loading); 
            this.hide(this.elements.grid); 
            this.show(this.elements.error);
            const errorElement = document.getElementById('errorMessage');
            if (errorElement) errorElement.textContent = message;
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

    // --- Authentication Component ---
    const Auth = {
        init() {
            console.log('Initializing Auth component');
            const loginForm = document.getElementById('loginForm');
            const logoutBtn = document.getElementById('logoutBtn');
            
            if (loginForm) {
                console.log('Login form found, adding event listener');
                loginForm.addEventListener('submit', this.handleLogin.bind(this));
                
                // Also add a direct click handler to the submit button as backup
                const submitBtn = loginForm.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.addEventListener('click', (e) => {
                        console.log('Submit button clicked');
                        e.preventDefault();
                        this.handleLogin(e);
                    });
                }
            } else {
                console.error('Login form not found!');
            }
            
            if (logoutBtn) {
                logoutBtn.addEventListener('click', this.handleLogout.bind(this));
            }
            
            this.checkAuth();
        },
        async checkAuth() {
            console.log('Checking authentication...');
            if (apiClient.isAuthenticated()) {
                console.log('User is authenticated, checking token validity...');
                try {
                    // Test the token by fetching tables
                    const tables = await apiClient.getAllTables();
                    console.log('Auth check successful, tables response:', tables);
                    if (tables && tables.all) {
                        UIMgr.showMain();
                        const userInfo = apiClient.userDetails.name || apiClient.userDetails.email || 'Admin User';
                        const userInfoElement = document.getElementById('userInfo');
                        if (userInfoElement) userInfoElement.textContent = `Welcome, ${userInfo}`;
                        TableManager.loadTables();
                    }
                } catch (error) {
                    console.error('Auth check failed:', error);
                    apiClient.clearToken();
                    UIMgr.showLogin();
                }
            } else {
                console.log('User not authenticated, showing login');
                UIMgr.showLogin();
            }
        },
        async handleLogin(e) {
            e.preventDefault();
            console.log('Login form submitted');
            
            const emailInput = document.getElementById('loginEmail');
            const passwordInput = document.getElementById('loginPassword');
            
            if (!emailInput || !passwordInput) {
                console.error('Login form inputs not found!');
                UIMgr.showToast('Login form error', 'error');
                return;
            }
            
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            
            console.log('Attempting login with email:', email);
            
            if (!email || !password) {
                UIMgr.showToast('Please enter both email and password', 'error');
                return;
            }
            
            // Show loader
            const submitBtn = document.querySelector('#loginForm button[type="submit"]');
            if (!submitBtn) {
                console.error('Submit button not found!');
                UIMgr.showToast('Login form error', 'error');
                return;
            }
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            submitBtn.disabled = true;
            
            try {
                console.log('Making login API call...');
                const data = await apiClient.login(email, password);
                console.log('Login API response:', data);
                
                // Handle different possible response structures
                const userDetails = data.details || data.user || data;
                const accessToken = data.access_token || data.token;
                
                if (!accessToken) {
                    throw new Error('No access token received');
                }
                
                if (userDetails.user_type !== 'admin') {
                    throw new Error('Admin access required.');
                }
                
                apiClient.setToken(accessToken, userDetails);
                UIMgr.showToast('Login successful! Redirecting...', 'success');
                
                // Redirect to dashboard after a short delay
                setTimeout(() => {
                    window.location.href = '/starter_admin/xyz/dashboard';
                }, 1500);
                
            } catch (error) {
                console.error('Login error:', error);
                UIMgr.showToast(error.message || 'Login failed', 'error');
                
                // Reset button
                if (submitBtn) {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            }
        },
        handleLogout() {
            console.log('Logging out...');
            apiClient.clearToken();
            UIMgr.showToast('Logged out successfully.', 'info');
            UIMgr.showLogin();
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
            const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
            const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
            
            if (retryBtn) retryBtn.addEventListener('click', this.loadTables.bind(this));
            if (closeTableModal) closeTableModal.addEventListener('click', () => UIMgr.hideTableModal());
            if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', this.confirmDelete.bind(this));
            if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', this.cancelDelete.bind(this));
        },

        async loadTables() {
            console.log('Loading tables...');
            UIMgr.showLoading();
            try {
                const response = await apiClient.getAllTables();
                console.log('Tables response:', response);
                const tables = response.all || response;
                this.renderTableGrid(tables);
                UIMgr.showGrid();
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
                            <h3 class="text-lg font-semibold text-gray-800 mb-2 break-words leading-tight">${name}</h3>
                            <p class="text-sm text-gray-600">Click to view table data</p>
                        </div>
                        <div class="text-blue-500 ml-4 flex-shrink-0">
                            <i class="fas fa-table text-2xl"></i>
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
            if (tableBody) tableBody.innerHTML = `<tr><td colspan="100%" class="p-4 text-center text-gray-500">Loading table data...</td></tr>`;
            
            try {
                const response = await apiClient.getTableData(name);
                console.log('Table data response:', response);
                const { headers, data } = response;
                this.renderTable(headers, data);
            } catch (error) {
                console.error('Failed to load table data:', error);
                UIMgr.showToast(`Error loading table: ${error.message}`, 'error');
                UIMgr.hideTableModal();
            }
        },

        renderTable(headers, data) {
            console.log('Rendering table with headers:', headers, 'and data:', data);
            const header = document.getElementById('tableHeader');
            const body = document.getElementById('tableBody');
            
            if (!header || !body) {
                console.error('Table header or body elements not found!');
                return;
            }
            
            if (!headers || Object.keys(headers).length === 0) {
                header.innerHTML = '<tr><th class="p-2 text-left">No columns found</th></tr>';
                body.innerHTML = '<tr><td class="p-2 text-center text-gray-500">No data available</td></tr>';
                return;
            }
            
            // Create header row
            const headerRow = document.createElement('tr');
            Object.keys(headers).forEach(key => {
                const th = document.createElement('th');
                th.className = 'p-3 text-left bg-gray-50 border-b font-semibold text-gray-700';
                th.textContent = key;
                headerRow.appendChild(th);
            });
            // Add actions column
            const actionsTh = document.createElement('th');
            actionsTh.className = 'p-3 text-center bg-gray-50 border-b font-semibold text-gray-700';
            actionsTh.textContent = 'Actions';
            headerRow.appendChild(actionsTh);
            header.innerHTML = '';
            header.appendChild(headerRow);
            
            // Create data rows
            body.innerHTML = '';
            if (!data || data.length === 0) {
                const noDataRow = document.createElement('tr');
                noDataRow.innerHTML = `<td colspan="${Object.keys(headers).length + 1}" class="p-4 text-center text-gray-500">No data available</td>`;
                body.appendChild(noDataRow);
                return;
            }
            
            data.forEach(row => {
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-gray-50 border-b';
                
                Object.values(headers).forEach(headerInfo => {
                    const td = document.createElement('td');
                    td.className = 'p-3 border-b text-sm';
                    const value = row[headerInfo.name] || row[headerInfo] || '';
                    td.textContent = typeof value === 'object' ? JSON.stringify(value) : String(value);
                    tr.appendChild(td);
                });
                
                // Add delete button
                const actionsTd = document.createElement('td');
                actionsTd.className = 'p-3 border-b text-center';
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-danger btn-sm px-3 py-1 text-xs';
                deleteBtn.textContent = 'Delete';
                deleteBtn.addEventListener('click', () => this.handleDelete(row, headers));
                actionsTd.appendChild(deleteBtn);
                tr.appendChild(actionsTd);
                
                body.appendChild(tr);
            });
        },
        
        handleDelete(row, headers) {
            const pkInfo = Object.values(headers).find(h => h.is_primary_key);
            if (!pkInfo) {
                UIMgr.showToast('No primary key defined for this table.', 'error');
                return;
            }
            this.recordToDelete = { 
                pkValue: row[pkInfo.name], 
                pkField: pkInfo.name, 
                table: this.currentTable 
            };
            UIMgr.showDeleteModal();
        },

        async confirmDelete() {
            if (!this.recordToDelete) return;
            const { pkValue, pkField, table } = this.recordToDelete;
            try {
                await apiClient.deleteRecord(pkValue, pkField, table);
                UIMgr.showToast('Record deleted successfully.', 'success');
                this.viewTable(table);
            } catch (error) {
                console.error('Delete failed:', error);
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

    // --- Initializer ---
    function init() {
        console.log('Starting admin UI initialization...');
        Auth.init();
        TableManager.init();
        console.log('Admin UI initialization complete');
    }

    init();
}); 