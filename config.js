/**
 * Shared configuration constants for the Caltech Course Code Tooltip Extension
 */

// Create global configuration object to avoid module import issues
window.CaltechExtensionConfig = {
  // Default settings configuration
  DEFAULT_SETTINGS: {
    extensionEnabled: true,
    showName: true,
    showUnits: true,
    showTerms: true,
    showPrerequisites: true,
    showDescription: false,
    showInstructors: true
  },

  // Course detection pattern - matches course codes like "CS 156", "Ae/APh/CE/ME 101 abc", etc.
  COURSE_CODE_PATTERN: /\b([A-Za-z][a-zA-Z]{1,4}(?:\/[A-Za-z][a-zA-Z]{1,4})*)\s*(\d{1,3}(?:\/\d{1,3})*)\s*([abcdegimx]{1,3})?(?=\s|$|[.,;!?()\[\]{}])/gi,

  // Tooltip display settings
  TOOLTIP_CONFIG: {
    HOVER_DELAY: 300,
    HIDE_DELAY: 100,
    MAX_WIDTH: 450
  },

  // Extension metadata
  EXTENSION_INFO: {
    NAME: 'Caltech Course Code Tooltip',
    AUTHOR: 'Varun Rodrigues',
    CLASS: '2029',
    CATALOG_YEAR: '2025-2026'
  }
};
