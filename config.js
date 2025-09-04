/**
 * Caltech Course Code Tooltip Extension - Global Configuration
 * 
 * This file contains all configuration constants, settings, and patterns used
 * throughout the extension. It provides a centralized location for managing
 * extension behavior and ensures consistency across all components.
 * 
 * @fileoverview Global configuration for the Caltech Course Code Tooltip Extension
 * @author Varun Rodrigues <vrodrigu@caltech.edu>
 * @version 1.0.0
 * @since 1.0.0
 * @copyright 2025 Varun Rodrigues
 * @license MIT
 */

// Use IIFE to prevent global namespace pollution and ensure proper encapsulation
(function(global) {
  'use strict';

  /**
   * Main configuration object for the Caltech Course Code Tooltip Extension
   * Contains all settings, patterns, and metadata used across the extension
   * @namespace CaltechExtensionConfig
   */
  const CaltechExtensionConfig = {
    
    /**
     * Default user preference settings
     * These control what information is displayed in tooltips and extension behavior
     * @type {Object}
     * @property {boolean} extensionEnabled - Whether the extension is active
     * @property {boolean} showName - Display course name/title
     * @property {boolean} showUnits - Display unit information
     * @property {boolean} showTerms - Display term availability
     * @property {boolean} showPrerequisites - Display prerequisite information
     * @property {boolean} showDescription - Display course description
     * @property {boolean} showInstructors - Display instructor information
     */
    DEFAULT_SETTINGS: {
      extensionEnabled: true,      // Extension master toggle
      showName: true,              // Course title display
      showUnits: true,             // Credit units display
      showTerms: true,             // Term offered display
      showPrerequisites: true,     // Prerequisites display
      showDescription: false,      // Full description display (disabled by default for performance)
      showInstructors: true        // Instructor information display
    },

    /**
     * Regular expression pattern for detecting course codes in text
     * Matches patterns like:
     * - "CS 156" (standard format)
     * - "Ae/APh/CE/ME 101" (cross-listed courses)
     * - "Ma 108 abc" (courses with letter suffixes)
     * - "ACM 95/100" (compound number courses)
     * 
     * Pattern breakdown:
     * - ([A-Za-z][a-zA-Z]{1,4}(?:\/[A-Za-z][a-zA-Z]{1,4})*(?:\/[A-Za-z][a-zA-Z]{1,4})*) - Department prefix(es)
     * - \s+ - Required whitespace (at least one space)
     * - (\d{1,3}(?:\/\d{1,3})*) - Course number(s)
     * - \s* - Optional whitespace
     * - ([a-z]{1,3})? - Optional letter suffix (1-3 letters)
     * - (?=\s*[.,;!?()\[\]{}]|$|\s*\n|\s+(?:and|or)(?:\s|$)) - Positive lookahead with word boundary detection
     * 
     * @type {RegExp}
     */
    COURSE_CODE_PATTERN: /\b([A-Za-z][a-zA-Z]{1,4}(?:\/[A-Za-z][a-zA-Z]{1,4})*(?:\/[A-Za-z][a-zA-Z]{1,4})*)\s+(\d{1,3}(?:\/\d{1,3})*)\s*([a-z]{1,3})?(?=\s*[.,;!?()\[\]{}]|$|\s*\n|\s+(?:and|or)(?:\s|$))/gi,

    /**
     * Tooltip behavior and display configuration
     * Controls timing, positioning, and visual properties of tooltips
     * @type {Object}
     * @property {number} HOVER_DELAY - Milliseconds before showing tooltip on hover
     * @property {number} HIDE_DELAY - Milliseconds before hiding tooltip after mouse leave
     * @property {number} MAX_WIDTH - Maximum tooltip width in pixels
     * @property {number} Z_INDEX - CSS z-index for tooltip layering
     * @property {number} FADE_DURATION - Animation duration for fade in/out
     */
    TOOLTIP_CONFIG: {
      HOVER_DELAY: 300,           // Delay before showing tooltip (prevents flicker)
      HIDE_DELAY: 100,            // Delay before hiding tooltip (smooth UX)
      MAX_WIDTH: 450,             // Maximum tooltip width
      Z_INDEX: 10000,             // High z-index to appear above other content
      FADE_DURATION: 200          // Fade animation duration in milliseconds
    },

    /**
     * Performance optimization settings
     * Controls caching, throttling, and resource management
     * @type {Object}
     */
    PERFORMANCE_CONFIG: {
      CACHE_TTL: 300000,          // Cache time-to-live: 5 minutes
      DEBOUNCE_DELAY: 150,        // Debounce delay for rapid events
      MAX_CONCURRENT_REQUESTS: 5,  // Maximum simultaneous API requests
      BATCH_SIZE: 50,             // Maximum nodes to process per batch
      INTERSECTION_THRESHOLD: 0.1  // Intersection observer threshold
    },

    /**
     * Error handling and retry configuration
     * Controls how the extension handles and recovers from errors
     * @type {Object}
     */
    ERROR_CONFIG: {
      MAX_RETRIES: 3,             // Maximum retry attempts for failed requests
      RETRY_DELAY: 1000,          // Base delay between retries (exponential backoff)
      TIMEOUT_DURATION: 5000,     // Request timeout in milliseconds
      LOG_LEVEL: 'warn'           // Minimum log level ('debug', 'info', 'warn', 'error')
    },

    /**
     * Data source configuration
     * Defines where and how course data is loaded
     * @type {Object}
     */
    DATA_CONFIG: {
      CATALOG_URL: 'catalog.json',           // Primary catalog data source
      FALLBACK_SOURCES: [],                  // Alternative data sources
      VALIDATION_SCHEMA: {                   // Expected data structure
        required: ['course_code_original', 'name'],
        optional: ['units', 'terms', 'prerequisites', 'description', 'instructors']
      }
    },

    /**
     * Extension metadata and branding information
     * Contains version info, author details, and catalog information
     * @type {Object}
     * @property {string} NAME - Extension display name
     * @property {string} VERSION - Current version number
     * @property {string} AUTHOR - Primary author
     * @property {string} EMAIL - Contact email
     * @property {string} CLASS - Author's Caltech class year
     * @property {string} CATALOG_YEAR - Academic year of course catalog
     * @property {string} HOMEPAGE - Extension homepage URL
     */
    EXTENSION_INFO: {
      NAME: 'Caltech Course Code Tooltip',
      VERSION: '1.0.0',
      AUTHOR: 'Varun Rodrigues',
      EMAIL: 'vrodrigu@caltech.edu',
      CLASS: '2029',
      CATALOG_YEAR: '2025-2026',
      HOMEPAGE: 'https://github.com/Varun-Rodrigues/Caltech-Course-Tooltip'
    },

    /**
     * Accessibility configuration
     * Settings for screen readers, keyboard navigation, and inclusive design
     * @type {Object}
     */
    ACCESSIBILITY_CONFIG: {
      FOCUS_VISIBLE: true,        // Show focus indicators
      HIGH_CONTRAST: 'auto',      // High contrast mode ('auto', 'always', 'never')
      REDUCED_MOTION: 'respect',  // Respect user's motion preferences
      SCREEN_READER: true,        // Enable screen reader support
      KEYBOARD_NAV: true          // Enable keyboard navigation
    },

    /**
     * Feature flags for experimental or optional functionality
     * Allows for gradual rollout and A/B testing of new features
     * @type {Object}
     */
    FEATURE_FLAGS: {
      CLICK_TO_PIN: true,         // Click to pin tooltips
      SECTION_CYCLING: true,      // Cycle through course sections
      RANGE_COURSES: true,        // Support for course ranges (e.g., "CS 120-122")
      COMPOUND_COURSES: true,     // Support for compound courses (e.g., "APh/EE 23/24")
      SHORTHAND_NOTATION: true,   // Support for shorthand (e.g., "CS 15, 16, 17")
      DARK_MODE: true,            // Automatic dark mode detection
      ANALYTICS: false            // Usage analytics (disabled for privacy)
    }
  };

  // Freeze the configuration object to prevent runtime modifications
  // This ensures configuration integrity and prevents accidental changes
  Object.freeze(CaltechExtensionConfig.DEFAULT_SETTINGS);
  Object.freeze(CaltechExtensionConfig.TOOLTIP_CONFIG);
  Object.freeze(CaltechExtensionConfig.PERFORMANCE_CONFIG);
  Object.freeze(CaltechExtensionConfig.ERROR_CONFIG);
  Object.freeze(CaltechExtensionConfig.DATA_CONFIG);
  Object.freeze(CaltechExtensionConfig.EXTENSION_INFO);
  Object.freeze(CaltechExtensionConfig.ACCESSIBILITY_CONFIG);
  Object.freeze(CaltechExtensionConfig.FEATURE_FLAGS);
  Object.freeze(CaltechExtensionConfig);

  // Expose configuration to global scope for access by other scripts
  // Check for existing window object (content script) or self (service worker)
  if (typeof window !== 'undefined') {
    window.CaltechExtensionConfig = CaltechExtensionConfig;
  } else if (typeof self !== 'undefined') {
    self.CaltechExtensionConfig = CaltechExtensionConfig;
  } else if (typeof global !== 'undefined') {
    global.CaltechExtensionConfig = CaltechExtensionConfig;
  }

  // Return configuration for module systems if needed
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CaltechExtensionConfig;
  }

})(typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : this);
