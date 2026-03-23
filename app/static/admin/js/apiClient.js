class ApiClient {
    constructor() {
        try {
            // Get the base URL for API calls by removing the static file path
            const currentPath = window.location.pathname;
            if (currentPath.startsWith('/starter_admin/xyz')) {
                // If we're in the admin UI, the API base is the root
                this.baseUrl = window.location.origin;
            } else {
                // Fallback to current origin
                this.baseUrl = window.location.origin;
            }
            
            this.token = localStorage.getItem('adminToken');
            
            // More robust handling of userDetails
            const userDetailsStr = localStorage.getItem('adminUserDetails');
            console.log('Raw userDetails from localStorage:', userDetailsStr);
            
            if (userDetailsStr && userDetailsStr !== 'null' && userDetailsStr !== 'undefined') {
                try {
                    this.userDetails = JSON.parse(userDetailsStr);
                } catch (parseError) {
                    console.error('Failed to parse userDetails:', parseError);
                    this.userDetails = {};
                }
            } else {
                this.userDetails = {};
            }
            
            console.log('ApiClient initialized with baseUrl:', this.baseUrl);
            console.log('Token available:', !!this.token);
            console.log('User details:', this.userDetails);
        } catch (error) {
            console.error('Error initializing ApiClient:', error);
            // Set defaults
            this.baseUrl = window.location.origin;
            this.token = null;
            this.userDetails = {};
        }
    }

    setToken(token, userDetails = null) {
        this.token = token;
        if (userDetails) {
            this.userDetails = userDetails;
            localStorage.setItem('adminUserDetails', JSON.stringify(userDetails));
        }
        localStorage.setItem('adminToken', token);
    }

    clearToken() {
        this.token = null;
        this.userDetails = {};
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUserDetails');
    }

    getHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = { headers: this.getHeaders(), ...options };
        
        console.log('Making API request to:', url, config);
        
        try {
            const response = await fetch(url, config);
            console.log('API response status:', response.status);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('API error response:', errorData);
                throw new Error(errorData.detail?.message || errorData.message || `HTTP error ${response.status}`);
            }
            
            const data = await response.json();
            console.log('API response data:', data);
            return data;
        } catch (error) {
            console.error('API Request Failed:', error);
            throw error;
        }
    }

    login(email, password) { 
        return this.request('/auth/login', { 
            method: 'POST', 
            body: JSON.stringify({ email, password }) 
        }); 
    }
    
    getAllTables() { 
        return this.request('/starter_admin/all-tables'); 
    }
    
    getTableData(tableName) { 
        return this.request(`/starter_admin/get-data-from-table/${tableName}`); 
    }
    
    updateRecord(pk, pkField, table, values) { 
        // Build the URL with query parameters for primary_id, primary_field, and table_name
        const url = `/starter_admin/update-data-in-table?primary_id=${encodeURIComponent(pk)}&primary_field=${encodeURIComponent(pkField)}&table_name=${encodeURIComponent(table)}`;
        
        return this.request(url, { 
            method: 'POST', 
            body: JSON.stringify(values)  // Send values directly as the request body
        }); 
    }
    
    insertRecord(pkField, table, values) { 
        // Build the URL with query parameters
        const url = `/starter_admin/insert-data-in-table?primary_field=${encodeURIComponent(pkField)}&table_name=${encodeURIComponent(table)}`;
        
        return this.request(url, { 
            method: 'POST', 
            body: JSON.stringify(values)  // Send values directly as the request body
        }); 
    }
    
    deleteRecord(pk, pkField, table) { 
        console.log('=== DELETE RECORD METHOD CALLED ===');
        console.log('deleteRecord called with:', { pk, pkField, table });
        console.log('This is the custom deleteRecord method, not the generic request method');
        
        // Build the URL with query parameters
        const url = `/starter_admin/delete-data-from-table?primary_id=${encodeURIComponent(pk)}&primary_field=${encodeURIComponent(pkField)}&table_name=${encodeURIComponent(table)}`;
        
        console.log('Delete URL:', url);
        
        // Create headers without Content-Type since we're sending empty body
        const headers = { 'accept': 'application/json' };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        console.log('Delete headers:', headers);
        
        // Make the request directly to avoid header conflicts
        const fullUrl = `${this.baseUrl}${url}`;
        console.log('Full delete URL:', fullUrl);
        console.log('Request method: POST');
        console.log('Request body: (empty string)');
        
        return fetch(fullUrl, { 
            method: 'POST',
            headers: headers,
            body: '' // Empty body as per the curl example
        }).then(response => {
            console.log('Delete API response status:', response.status);
            console.log('Delete API response headers:', response.headers);
            
            if (!response.ok) {
                return response.json().then(errorData => {
                    console.error('Delete API error response:', errorData);
                    throw new Error(errorData.detail?.message || errorData.message || `HTTP error ${response.status}`);
                }).catch(() => {
                    throw new Error(`HTTP error ${response.status}`);
                });
            }
            
            return response.json().then(data => {
                console.log('Delete API response data:', data);
                return data;
            });
        }).catch(error => {
            console.error('Delete API Request Failed:', error);
            throw error;
        });
    }
    
    isAuthenticated() { 
        return !!this.token; 
    }
    
    isAdmin() { 
        return this.userDetails.user_type === 'admin'; 
    }
}

export const apiClient = new ApiClient(); 

// Test function to verify deleteRecord method
window.testDeleteRecord = function() {
    console.log('Testing deleteRecord method...');
    console.log('apiClient.deleteRecord:', apiClient.deleteRecord);
    console.log('apiClient.deleteRecord.toString():', apiClient.deleteRecord.toString().substring(0, 100) + '...');
    
    // Test the method with dummy data
    apiClient.deleteRecord('test', 'test_field', 'test_table')
        .then(result => {
            console.log('deleteRecord test result:', result);
        })
        .catch(error => {
            console.log('deleteRecord test error:', error);
        });
};

// Fallback: Make sure apiClient is available globally
if (typeof window !== 'undefined') {
    window.apiClient = apiClient;
    console.log('ApiClient made available globally');
} 