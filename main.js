/**
 * main.js - Theme management and keyboard accessibility
 * 
 * This script handles:
 * - Dark/light theme toggling and persistence
 * - Keyboard shortcuts and navigation
 * - Help overlay for keyboard shortcuts
 * - Focus management and accessibility
 */

(function() {
  'use strict';

  // Storage keys
  const THEME_STORAGE_KEY = 'miiboard_theme';
  
  // Initialize theme on page load
  function initTheme() {
    const storedTheme = getStoredTheme();
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = storedTheme || (prefersDark ? 'dark' : 'light');
    
    applyTheme(theme);
    updateThemeToggle(theme);
  }

  // Get stored theme from localStorage
  function getStoredTheme() {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  // Store theme in localStorage
  function storeTheme(theme) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (e) {
      // Ignore storage errors
    }
  }

  // Apply theme to document
  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }

  // Toggle theme
  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    applyTheme(newTheme);
    storeTheme(newTheme);
    updateThemeToggle(newTheme);
  }

  // Update theme toggle button state
  function updateThemeToggle(theme) {
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
      toggleBtn.textContent = theme === 'dark' ? '🌙' : '☀️';
      toggleBtn.setAttribute('aria-label', 
        theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
      );
    }
  }

  // Initialize theme toggle button
  function initThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle');
    if (!toggleBtn) return;

    toggleBtn.addEventListener('click', toggleTheme);
    
    // Keyboard activation
    toggleBtn.addEventListener('keydown', function(event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleTheme();
      }
    });
  }

  // Help overlay management
  let helpOverlay = null;

  function createHelpOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'help-overlay';
    overlay.id = 'help-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'help-title');

    overlay.innerHTML = `
      <div class="help-panel">
        <div class="help-header">
          <h2 class="help-title" id="help-title">Keyboard Shortcuts</h2>
          <button class="help-close" id="help-close" aria-label="Close help overlay">✕</button>
        </div>
        <div class="help-content">
          <div class="help-section">
            <h3 class="help-section-title">General</h3>
            <div class="help-shortcut">
              <span class="help-key">Tab</span>
              <span class="help-description">Navigate between interactive elements</span>
            </div>
            <div class="help-shortcut">
              <span class="help-key">Enter</span>
              <span class="help-description">Activate focused element</span>
            </div>
            <div class="help-shortcut">
              <span class="help-key">Space</span>
              <span class="help-description">Activate focused button or control</span>
            </div>
            <div class="help-shortcut">
              <span class="help-key">Esc</span>
              <span class="help-description">Close overlays and dialogs</span>
            </div>
          </div>
          <div class="help-section">
            <h3 class="help-section-title">Actions</h3>
            <div class="help-shortcut">
              <span class="help-key">T</span>
              <span class="help-description">Toggle dark/light theme</span>
            </div>
            <div class="help-shortcut">
              <span class="help-key">?</span>
              <span class="help-description">Show this help overlay</span>
            </div>
          </div>
          <div class="help-section">
            <h3 class="help-section-title">Navigation</h3>
            <div class="help-shortcut">
              <span class="help-key">1</span>
              <span class="help-description">Go to Home page</span>
            </div>
            <div class="help-shortcut">
              <span class="help-key">2</span>
              <span class="help-description">Go to Stats page</span>
            </div>
            <div class="help-shortcut">
              <span class="help-key">3</span>
              <span class="help-description">Go to Transfer page</span>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    return overlay;
  }

  function showHelpOverlay() {
    if (!helpOverlay) {
      helpOverlay = createHelpOverlay();
      
      const closeBtn = document.getElementById('help-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', hideHelpOverlay);
        closeBtn.addEventListener('keydown', function(event) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            hideHelpOverlay();
          }
        });
      }

      // Close on overlay click (but not panel click)
      helpOverlay.addEventListener('click', function(event) {
        if (event.target === helpOverlay) {
          hideHelpOverlay();
        }
      });
    }

    helpOverlay.classList.add('is-visible');
    
    // Focus the close button
    const closeBtn = document.getElementById('help-close');
    if (closeBtn) {
      setTimeout(() => closeBtn.focus(), 100);
    }
  }

  function hideHelpOverlay() {
    if (helpOverlay) {
      helpOverlay.classList.remove('is-visible');
    }
  }

  // Global keyboard shortcuts
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', function(event) {
      // Don't trigger shortcuts when typing in input fields
      if (event.target.tagName === 'INPUT' || 
          event.target.tagName === 'TEXTAREA' || 
          event.target.isContentEditable) {
        return;
      }

      // Esc - close overlays
      if (event.key === 'Escape') {
        hideHelpOverlay();
        // Close corn wallet if open
        const cornBalance = document.getElementById('corn-balance');
        const cornWallet = document.getElementById('corn-wallet');
        if (cornBalance && cornWallet && cornBalance.getAttribute('aria-expanded') === 'true') {
          cornBalance.click();
        }
        return;
      }

      // ? or / - show help
      if (event.key === '?' || event.key === '/') {
        event.preventDefault();
        showHelpOverlay();
        return;
      }

      // t - toggle theme (only if no modifier keys)
      if (event.key === 't' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        toggleTheme();
        return;
      }

      // Number keys for navigation
      if (event.key === '1' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        window.location.href = 'index.html';
        return;
      }
      if (event.key === '2' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        window.location.href = 'stats.html';
        return;
      }
      if (event.key === '3' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        window.location.href = 'transfer.html';
        return;
      }
    });
  }

  // Ensure all custom controls are keyboard accessible
  function ensureKeyboardAccessibility() {
    // Find all elements with role="button" that don't have tabindex
    const buttons = document.querySelectorAll('[role="button"]:not([tabindex])');
    buttons.forEach(function(btn) {
      if (!btn.hasAttribute('tabindex')) {
        btn.setAttribute('tabindex', '0');
      }
    });

    // Add Enter/Space activation for custom buttons
    buttons.forEach(function(btn) {
      // Check if already has keyboard handler
      if (!btn.hasAttribute('data-kb-handler')) {
        btn.setAttribute('data-kb-handler', 'true');
        btn.addEventListener('keydown', function(event) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            btn.click();
          }
        });
      }
    });
  }

  // Initialize everything when DOM is ready
  function init() {
    initTheme();
    initThemeToggle();
    initKeyboardShortcuts();
    ensureKeyboardAccessibility();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', function(e) {
        // Only apply system preference if user hasn't set a preference
        if (!getStoredTheme()) {
          applyTheme(e.matches ? 'dark' : 'light');
          updateThemeToggle(e.matches ? 'dark' : 'light');
        }
      });
    }
  }

  // Run initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export functions for testing (optional)
  window.MiiBoardAccessibility = {
    toggleTheme: toggleTheme,
    showHelp: showHelpOverlay,
    hideHelp: hideHelpOverlay
  };
})();
