/**
 * Global Configuration for Caltech Course Code Tooltip Extension
 * ============================================================
 * 
 * This file contains all shared configuration constants and settings used
 * throughout the extension. It serves as a centralized configuration source
 * that ensures consistency across all extension components.
 * 
 * Why Global Configuration:
 * - Avoids module import complexities in Chrome extension environment
 * - Provides single source of truth for all settings
 * - Enables easy maintenance and updates
 * - Ensures consistency across content scripts, popup, and background
 * 
 * Usage:
 * - Loaded first in all contexts where configuration is needed
 * - Accessed via window.CaltechExtensionConfig object
 * - Falls back gracefully if this file fails to load
 * 
 * @author Varun Rodrigues
 * @version 2.0
 * @since 2025
 */

/**
 * Global configuration object for the Caltech Course Code Tooltip Extension
 * 
 * This object contains all configuration constants used throughout the extension,
 * organized into logical sections for easy maintenance and understanding.
 */
window.CaltechExtensionConfig = {
  
  /**
   * Default Settings Configuration
   * 
   * These settings control what information is displayed in tooltips and
   * the overall behavior of the extension. Users can modify these through
   * the popup interface, but these serve as the initial defaults.
   */
  DEFAULT_SETTINGS: {
    extensionEnabled: true,        // Master toggle - controls all extension functionality
    showName: true,                // Display course name/title in tooltips
    showUnits: true,               // Display unit count (e.g., "3 units")
    showTerms: true,               // Display terms offered (e.g., "W, Sp")
    showPrerequisites: true,       // Display prerequisite course information
    showDescription: false,        // Display full course description (default off for space)
    showInstructors: true          // Display instructor names and information
  },

  /**
   * Course Code Detection Pattern
   * 
   * Advanced regex pattern that detects various Caltech course code formats:
   * - Simple codes: "CS 156", "Ma 108", "SEC 10"
   * - Cross-listed: "ACM/CS 156", "Ae/APh/CE/ME 101", "APh/Ph/MS 152"
   * - Multi-number: "Ma 6/106", "Ph 2/12", "ACM 95/100"
   * - With sections: "Ph 12 abc", "CS 156 a", "ACM 95/100 ab"
   * - Combined formats: "Ma/CS 6/106 abc"
   * - Comma-separated: "APh/EE 130, 131, and 132" (matches each individually)
   * 
   * Fixed issues:
   * - Support for 2-letter departments like "SEC"
   * - Support for triple cross-listings like "APh/Ph/MS"
   * - Proper word boundaries that don't include following words
   * - Better separation between numbers and section letters
   * - Improved handling of multi-number courses with sections
   * - Fixed "APh 200 do" issue by moving word boundary in lookahead
   */
  COURSE_CODE_PATTERN: /\b([A-Za-z][a-zA-Z]{1,4}(?:\/[A-Za-z][a-zA-Z]{1,4})*(?:\/[A-Za-z][a-zA-Z]{1,4})*)\s+(\d{1,3}(?:\/\d{1,3})*)\s*([a-z]{1,3})?(?=\s*[.,;!?()\[\]{}]|$|\s+(?:and|or)\s+[A-Za-z])/gi,

  /**
   * Additional pattern for comma-separated course lists
   * 
   * This pattern handles cases like "APh/EE 130, 131, and 132" by detecting
   * subsequent numbers that should be combined with the department prefix.
   * Used in conjunction with the main pattern for comprehensive detection.
   */
  COMMA_SEPARATED_PATTERN: /\b(\d{1,3})\s*([a-z]{1,3})?\b(?=\s*[,]|\s+and\s+\d)/gi,

  /**
   * Tooltip Display Configuration
   * 
   * Controls the timing and appearance behavior of tooltips to provide
   * optimal user experience without being intrusive.
   */
  TOOLTIP_CONFIG: {
    HOVER_DELAY: 300,             // Milliseconds to wait before showing tooltip on hover
    HIDE_DELAY: 100,              // Milliseconds to wait before hiding tooltip when not hovering
    MAX_WIDTH: 450                // Maximum tooltip width in pixels
  },

  /**
   * Extension Metadata
   * 
   * Information about the extension itself, used for display purposes
   * and to maintain consistency across different components.
   */
  EXTENSION_INFO: {
    NAME: 'Caltech Course Code Tooltip',    // Extension display name
    AUTHOR: 'Varun Rodrigues',              // Extension author
    CLASS: '2029',                          // Author's graduation class
    CATALOG_YEAR: '2025-2026'               // Academic year of the course catalog
  }
};

// End of global configuration
