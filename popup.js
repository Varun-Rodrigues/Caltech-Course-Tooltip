/**
 * Caltech Course Code Tooltip Extension - Popup Interface
 * 
 * This popup script provides the user interface for managing extension settings
 * and performing manual course lookups. It handles communication with the 
 * background script and content scripts for real-time configuration updates.
 * 
 * Features:
 * - Extension enable/disable toggle
 * - Individual tooltip content controls
 * - Real-time course code lookup
 * - Settings synchronization
 * - Collapsible accordion interface
 * - Error handling and validation
 * 
 * @fileoverview Popup interface for the Caltech Course Code Tooltip Extension
 * @author Varun Rodrigues <vrodrigu@caltech.edu>
 * @version 1.0.0
 * @since 1.0.0
 * @copyright 2024 Varun Rodrigues
 * @license MIT
 */

'use strict';

/**
 * Default settings configuration with robust fallback
 * @type {Object}
 * @const
 */
const DEFAULT_SETTINGS = (typeof window !== 'undefined' && window.CaltechExtensionConfig?.DEFAULT_SETTINGS) || {
  extensionEnabled: true,
  showName: true,
  showUnits: true,
  showTerms: true,
  showPrerequisites: true,
  showDescription: false,
  showInstructors: true
};

/**
 * Array of setting toggle IDs for efficient processing
 * @type {string[]}
 * @const
 */
const TOGGLE_IDS = Object.keys(DEFAULT_SETTINGS);

/**
 * Popup application class for managing the extension interface
 * @class PopupManager
 */
class PopupManager {
  /**
   * Initialize the popup manager
   * @constructor
   */
  constructor() {
    /**
     * Current extension settings
     * @type {Object}
     * @private
     */
    this.settings = { ...DEFAULT_SETTINGS };
    
    /**
     * Debounce timer for search input
     * @type {number|null}
     * @private
     */
    this.searchDebounceTimer = null;
    
    /**
     * Error tracking for analytics
     * @type {Array<Object>}
     * @private
     */
    this.errors = [];
    
    /**
     * Performance metrics
     * @type {Object}
     * @private
     */
    this.metrics = {
      startTime: Date.now(),
      lookupCount: 0,
      errorCount: 0
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  /**
   * Initialize the popup interface
   * @async
   * @private
   */
  async initialize() {
    try {
      // Load current settings and update UI
      this.settings = await this.loadSettings();
      this.updateUI(this.settings);
      this.updateStatus(this.settings.extensionEnabled);
      
      // Set up event handlers
      this.setupEventListeners(this.settings);
      this.initializeAccordions();
    } catch (error) {
      console.error('❌ Error initializing popup:', error);
      this.handleError(error, 'Popup initialization failed');
      this.updateStatus(false);
    }
  }

  /**
   * Load settings from Chrome storage with validation
   * @async
   * @returns {Promise<Object>} Current settings object
   * @private
   */
  async loadSettings() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        const storedSettings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
        return this.validateSettings(storedSettings);
      } else {
        console.warn('⚠️ Chrome storage not available, using defaults');
        return { ...DEFAULT_SETTINGS };
      }
    } catch (error) {
      console.warn('⚠️ Storage not available, using defaults:', error);
      this.handleError(error, 'Settings loading failed');
      return { ...DEFAULT_SETTINGS };
    }
  }

  /**
   * Validate settings object structure and types
   * @param {Object} settings - Settings to validate
   * @returns {Object} Validated settings object
   * @private
   */
  validateSettings(settings) {
    const validatedSettings = { ...DEFAULT_SETTINGS };
    
    // Validate each setting
    for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS)) {
      if (key in settings) {
        const value = settings[key];
        
        // Type validation
        if (typeof value === typeof defaultValue) {
          validatedSettings[key] = value;
        } else {
          console.warn(`⚠️ Invalid type for setting '${key}': expected ${typeof defaultValue}, got ${typeof value}`);
        }
      }
    }
    
    return validatedSettings;
  }

  /**
   * Set up all event listeners for the popup interface
   * @param {Object} settings - Current settings object
   * @private
   */
  setupEventListeners(settings) {
    // Set up toggle listeners
    TOGGLE_IDS.forEach(toggleId => {
      const toggle = document.getElementById(toggleId);
      if (toggle) {
        toggle.addEventListener('change', (e) => 
          this.handleToggleChange(toggleId, e.target.checked, settings)
        );
      } else {
        console.warn(`⚠️ Toggle element '${toggleId}' not found`);
      }
    });
    
    // Set up course lookup functionality
    this.setupCourseLookup(settings);
  }

  /**
   * Set up course lookup input and result handling
   * @param {Object} settings - Current settings object
   * @private
   */
  setupCourseLookup(settings) {
    const lookupInput = document.getElementById('course-lookup-input');
    const lookupResult = document.getElementById('course-lookup-result');
    
    if (!lookupInput || !lookupResult) {
      console.warn('⚠️ Course lookup elements not found');
      return;
    }
    
    // Debounced input handler for better performance
    lookupInput.addEventListener('input', (e) => {
      const courseCode = e.target.value.trim().toUpperCase();
      
      // Clear previous timer
      if (this.searchDebounceTimer) {
        clearTimeout(this.searchDebounceTimer);
      }
      
      // Set new timer with debounce
      this.searchDebounceTimer = setTimeout(() => {
        if (courseCode.length >= 2) {
          this.lookupCourse(courseCode, lookupResult, settings);
        } else {
          this.showDefaultLookupMessage(lookupResult);
        }
      }, 300); // 300ms debounce
    });

    // Initial message
    this.showDefaultLookupMessage(lookupResult);
  }

  /**
   * Show default message in lookup result area
   * @param {HTMLElement} resultDiv - Result container element
   * @private
   */
  showDefaultLookupMessage(resultDiv) {
    resultDiv.innerHTML = `
      <div style="color: #999; font-size: 12px; font-style: italic;">
        Enter a course code above to see course information.
        <br><br>
        <strong>Examples:</strong> CS 157, IDS 157, MA 108, ACM 95/100
      </div>
    `;
  }

  /**
   * Initialize accordion functionality for the settings interface
   * @private
   */
  initializeAccordions() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    
    accordionHeaders.forEach(header => {
      header.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        this.handleAccordionClick(header, accordionHeaders);
      });
    });
  }

  /**
   * Handle accordion header click events
   * @param {HTMLElement} clickedHeader - The clicked accordion header
   * @param {NodeList} allHeaders - All accordion headers
   * @private
   */
  handleAccordionClick(clickedHeader, allHeaders) {
    const targetId = clickedHeader.getAttribute('data-target');
    const content = document.getElementById(targetId);
    
    if (!content) {
      console.warn(`⚠️ Accordion target '${targetId}' not found`);
      return;
    }
    
    const isCurrentlyActive = clickedHeader.classList.contains('active');
    
    // Close all accordions first
    allHeaders.forEach(otherHeader => {
      const otherTargetId = otherHeader.getAttribute('data-target');
      const otherContent = document.getElementById(otherTargetId);
      
      if (otherContent) {
        otherHeader.classList.remove('active');
        otherContent.classList.remove('active');
      }
    });
    
    // If the clicked accordion wasn't active, open it
    if (!isCurrentlyActive) {
      clickedHeader.classList.add('active');
      content.classList.add('active');
    }
  }

  /**
   * Perform course lookup with multiple fallback strategies
   * @param {string} courseCode - Course code to look up
   * @param {HTMLElement} resultDiv - Element to display results
   * @param {Object} settings - Current settings for display preferences
   * @async
   * @private
   */
  async lookupCourse(courseCode, resultDiv, settings) {
    if (!courseCode || !resultDiv) {
      return;
    }
    
    this.metrics.lookupCount++;
    
    // Show loading indicator
    resultDiv.innerHTML = `
      <div style="color: #666; font-style: italic; font-size: 11px;">
        🔍 Searching for "${courseCode}"...
      </div>
    `;
    
    try {
      // Primary method: Try background script's course matching
      const response = await chrome.runtime.sendMessage({
        type: 'FIND_COURSE',
        courseCode: courseCode
      });
      
      if (response && response.success && response.courseInfo) {
        this.displayCourseInfo(response.courseInfo, resultDiv, settings);
        return;
      }
      
      // Fallback method: Try content script if available
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        const contentResponse = await chrome.tabs.sendMessage(tab.id, {
          type: 'LOOKUP_COURSE',
          courseCode: courseCode
        });
        
        if (contentResponse && contentResponse.success && contentResponse.courseInfo) {
          this.displayCourseInfo(contentResponse.courseInfo, resultDiv, settings);
          return;
        }
      } catch (contentScriptError) {
      }
      
      // No course found with any method
      this.displayCourseNotFound(courseCode, resultDiv);
      
    } catch (error) {
      console.error('❌ Error looking up course:', error);
      this.handleError(error, 'Course lookup failed');
      this.displayLookupError(resultDiv);
    }
  }

  /**
   * Display course information in the result area
   * @param {Object} courseInfo - Course data object
   * @param {HTMLElement} resultDiv - Element to display results
   * @param {Object} settings - Display preferences
   * @private
   */
  displayCourseInfo(courseInfo, resultDiv, settings) {
    // Handle synthetic courses (multi-section courses)
    if (this.isSyntheticCourse(courseInfo)) {
      this.displaySyntheticCourseInfo(courseInfo, resultDiv, settings);
      return;
    }
    
    // Regular course display
    let html = this.buildCourseHTML(courseInfo, settings);
    resultDiv.innerHTML = html;
  }

  /**
   * Check if a course is synthetic (multi-section placeholder)
   * @param {Object} courseInfo - Course information object
   * @returns {boolean} True if course is synthetic
   * @private
   */
  isSyntheticCourse(courseInfo) {
    return courseInfo.prerequisites === "See individual sections" ||
           courseInfo.is_synthetic === true;
  }

  /**
   * Display information for synthetic multi-section courses
   * @param {Object} courseInfo - Synthetic course data
   * @param {HTMLElement} resultDiv - Element to display results
   * @param {Object} settings - Display preferences
   * @private
   */
  displaySyntheticCourseInfo(courseInfo, resultDiv, settings) {
    const courseCode = courseInfo.course_code_original;
    const sections = this.generateSectionSuggestions(courseCode);
    
    let html = `<div class="course-code">${this.escapeHtml(courseCode)}</div>`;
    
    if (settings.showName && courseInfo.name) {
      html += `<div class="course-title">${this.escapeHtml(courseInfo.name)}</div>`;
    }
    
    // Helpful message for multi-section courses
    html += `
      <div class="description" style="color: #666; font-style: italic; margin-top: 8px;">
        This is a multi-section course. Search individual sections separately:
      </div>
    `;
    
    if (sections.length > 0) {
      html += `<div style="margin-top: 4px; font-size: 11px;">`;
      sections.forEach(section => {
        html += `<div style="margin: 2px 0;">"${this.escapeHtml(section)}"</div>`;
      });
      html += `</div>`;
    }
    
    resultDiv.innerHTML = html;
  }

  /**
   * Generate section suggestions for multi-section courses
   * @param {string} courseCode - Multi-section course code
   * @returns {string[]} Array of individual section codes
   * @private
   */
  generateSectionSuggestions(courseCode) {
    const match = courseCode.match(/^(.+?)\s+([a-z]+)$/i);
    if (!match) return [];
    
    const [, baseCourse, sectionPattern] = match;
    const sections = [];
    
    for (const letter of sectionPattern.toLowerCase()) {
      sections.push(`${baseCourse} ${letter}`);
    }
    
    return sections;
  }

  /**
   * Build HTML for regular course display
   * @param {Object} courseInfo - Course information
   * @param {Object} settings - Display preferences
   * @returns {string} HTML string
   * @private
   */
  buildCourseHTML(courseInfo, settings) {
    let html = `<div class="course-code">${this.escapeHtml(courseInfo.course_code_original)}</div>`;
    
    if (settings.showName && courseInfo.name) {
      html += `<div class="course-title">${this.escapeHtml(courseInfo.name)}</div>`;
    }
    
    // Combine units and terms into meta information
    const metaItems = [];
    if (settings.showUnits && courseInfo.units) {
      metaItems.push(this.escapeHtml(courseInfo.units));
    }
    if (settings.showTerms && courseInfo.terms) {
      metaItems.push(this.escapeHtml(courseInfo.terms));
    }
    
    if (metaItems.length > 0) {
      html += `<div class="course-meta">${metaItems.join(' | ')}</div>`;
    }
    
    if (settings.showPrerequisites && courseInfo.prerequisites) {
      html += `<div class="prerequisites">Prerequisites: ${this.escapeHtml(courseInfo.prerequisites)}</div>`;
    }
    
    if (settings.showDescription && courseInfo.description) {
      html += `<div class="description">${this.escapeHtml(courseInfo.description)}</div>`;
    }
    
    if (settings.showInstructors && courseInfo.instructors) {
      html += `<div class="instructors"><strong>Instructors:</strong> ${this.escapeHtml(courseInfo.instructors)}</div>`;
    }
    
    return html;
  }

  /**
   * Display course not found message
   * @param {string} courseCode - The searched course code
   * @param {HTMLElement} resultDiv - Element to display message
   * @private
   */
  displayCourseNotFound(courseCode, resultDiv) {
    resultDiv.innerHTML = `
      <div style="color: #999; font-style: italic; font-size: 10px;">
        Course "${this.escapeHtml(courseCode)}" not found in catalog.
        <br><br>
        <strong>Try these formats:</strong><br>
        • CS 157<br>
        • IDS 157<br>
        • MA 108<br>
        • ACM 95/100<br>
        • Ma/CS 6
      </div>
    `;
  }

  /**
   * Display lookup error message
   * @param {HTMLElement} resultDiv - Element to display message
   * @private
   */
  displayLookupError(resultDiv) {
    resultDiv.innerHTML = `
      <div style="color: #d14900; font-size: 11px;">
        ⚠️ Error loading course information.
        <br>Please try again.
      </div>
    `;
  }

  /**
   * Escape HTML to prevent XSS attacks
   * @param {string} text - Text to escape
   * @returns {string} Escaped HTML
   * @private
   */
  escapeHtml(text) {
    if (!text) return '';
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Handle toggle change events for settings
   * @param {string} toggleId - ID of the toggle that changed
   * @param {boolean} checked - New checked state
   * @param {Object} settings - Current settings object
   * @async
   * @private
   */
  async handleToggleChange(toggleId, checked, settings) {
    try {
      // Update local settings
      const newSettings = { ...settings, [toggleId]: checked };
      
      // Validate the updated settings
      const validatedSettings = this.validateSettings(newSettings);
      
      // Save to Chrome storage
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        await chrome.storage.sync.set(validatedSettings);
      }
      
      // Update local reference
      Object.assign(this.settings, validatedSettings);
      
      // Update UI if master toggle changed
      if (toggleId === 'extensionEnabled') {
        this.updateStatus(checked);
      }
      
      // Refresh course lookup if currently showing results
      await this.refreshLookupIfActive(validatedSettings);
      
      // Notify content script of settings change
      await this.notifyContentScript(validatedSettings);
    } catch (error) {
      console.error('❌ Error updating settings:', error);
      this.handleError(error, 'Settings update failed');
      
      // Revert UI state on error
      const toggle = document.getElementById(toggleId);
      if (toggle) {
        toggle.checked = !checked;
      }
    }
  }

  /**
   * Refresh course lookup display if currently active
   * @param {Object} newSettings - Updated settings
   * @async
   * @private
   */
  async refreshLookupIfActive(newSettings) {
    const lookupInput = document.getElementById('course-lookup-input');
    const lookupResult = document.getElementById('course-lookup-result');
    
    if (lookupInput && lookupResult && lookupInput.value.trim().length >= 2) {
      const courseCode = lookupInput.value.trim().toUpperCase();
      await this.lookupCourse(courseCode, lookupResult, newSettings);
    }
  }

  /**
   * Update the popup UI to reflect current settings
   * @param {Object} settings - Settings object
   * @private
   */
  updateUI(settings) {
    TOGGLE_IDS.forEach(toggleId => {
      const toggle = document.getElementById(toggleId);
      if (toggle) {
        toggle.checked = settings[toggleId];
      } else {
        console.warn(`⚠️ Toggle element '${toggleId}' not found during UI update`);
      }
    });
  }

  /**
   * Update the extension status display
   * @param {boolean} enabled - Whether extension is enabled
   * @private
   */
  updateStatus(enabled) {
    const headerSubtitle = document.getElementById('header-subtitle');
    const statusText = document.getElementById('status-text');
    
    if (headerSubtitle && statusText) {
      headerSubtitle.className = enabled ? 'header-subtitle enabled' : 'header-subtitle disabled';
      statusText.textContent = enabled ? 'Enabled' : 'Disabled';
    } else {
      console.warn('⚠️ Status elements not found');
    }
  }

  /**
   * Notify content script of settings changes
   * @param {Object} settings - Updated settings
   * @async
   * @private
   */
  async notifyContentScript(settings) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      await chrome.tabs.sendMessage(tab.id, {
        type: 'SETTINGS_UPDATED',
        settings
      });
      
    } catch (error) {
      // Content script might not be loaded, which is acceptable
    }
  }

  /**
   * Handle errors with consistent logging and user feedback
   * @param {Error} error - Error object
   * @param {string} context - Context where error occurred
   * @private
   */
  handleError(error, context) {
    this.metrics.errorCount++;
    
    const errorInfo = {
      message: error.message,
      context,
      timestamp: new Date().toISOString(),
      stack: error.stack
    };
    
    this.errors.push(errorInfo);
    
    // Keep error log reasonable size
    if (this.errors.length > 10) {
      this.errors.shift();
    }
    
    console.error(`❌ ${context}:`, error);
  }

  /**
   * Get performance metrics for debugging
   * @returns {Object} Performance metrics
   * @public
   */
  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.startTime,
      recentErrors: this.errors.slice(-5)
    };
  }
}

// Initialize the popup manager
const popupManager = new PopupManager();
