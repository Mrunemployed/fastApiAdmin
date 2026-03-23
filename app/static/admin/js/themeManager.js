// themeManager.js - Handles dark/light theme switching
class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('adminTheme') || 'light';
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.setupThemeToggle();
    }

    applyTheme(theme) {
        const root = document.documentElement;
        
        if (theme === 'dark') {
            root.classList.add('dark-theme');
            root.classList.remove('light-theme');
        } else {
            root.classList.add('light-theme');
            root.classList.remove('dark-theme');
        }
        
        this.currentTheme = theme;
        localStorage.setItem('adminTheme', theme);
        
        // Update theme toggle button if it exists
        const themeToggle = document.getElementById('themeToggleBtn');
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (icon) {
                icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            }
        }
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
    }

    setupThemeToggle() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('#themeToggleBtn')) {
                this.toggleTheme();
            }
        });
    }

    getCurrentTheme() {
        return this.currentTheme;
    }
}

// Initialize theme manager
const themeManager = new ThemeManager();

// Make it available globally for debugging
window.themeManager = themeManager; 