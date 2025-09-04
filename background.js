/**
 * Caltech Course Code Tooltip Extension - Background Service Worker
 * 
 * This service worker handles:
 * - Extension lifecycle management
 * - Course data loading and caching
 * - Message passing between content scripts and popup
 * - Settings synchronization
 * - Course matching utilities
 * 
 * @fileoverview Background service worker for the Caltech Course Code Tooltip Extension
 * @author Varun Rodrigues <vrodrigu@caltech.edu>
 * @version 1.0.0
 * @since 1.0.0
 * @copyright 2025 Varun Rodrigues
 * @license MIT
 */

'use strict';

/**
 * Default settings configuration
 * Fallback when window.CaltechExtensionConfig is not available
 * @type {Object}
 */
const DEFAULT_SETTINGS = {
  extensionEnabled: true,
  showName: true,
  showUnits: true,
  showTerms: true,
  showPrerequisites: true,
  showDescription: false,
  showInstructors: false
};

/**
 * Cache manager for storing course data and reducing API calls
 * Implements TTL (Time To Live) caching with automatic cleanup
 * @class CacheManager
 */
class CacheManager {
  /**
   * Initialize cache manager with TTL support
   * @param {number} ttl - Cache time-to-live in milliseconds (default: 5 minutes)
   */
  constructor(ttl = 300000) {
    this.cache = new Map();
    this.ttl = ttl;
    this.timers = new Map();
    
    // Setup periodic cleanup to prevent memory leaks
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, ttl);
  }

  /**
   * Store data in cache with automatic expiration
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   */
  set(key, value) {
    // Clear existing timer if present
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Store the value
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });

    // Set expiration timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, this.ttl);
    
    this.timers.set(key, timer);
  }

  /**
   * Retrieve data from cache
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null if expired/not found
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if entry is still valid
    if (Date.now() - entry.timestamp > this.ttl) {
      this.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Remove item from cache
   * @param {string} key - Cache key to remove
   */
  delete(key) {
    this.cache.delete(key);
    
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
  }

  /**
   * Clear all cached data
   */
  clear() {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    
    this.cache.clear();
    this.timers.clear();
  }

  /**
   * Clean up expired entries
   * @private
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      ttl: this.ttl,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Destroy cache manager and clean up resources
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

/**
 * Course matching utilities for sophisticated course code recognition
 * Handles various course code formats and variations
 * @class CourseMatchingUtils
 */
class CourseMatchingUtils {
  /**
   * Generate multiple variations of a course code for flexible matching
   * Handles different formatting styles and common typos
   * @param {string} courseCode - The course code to generate variations for
   * @returns {string[]} Array of course code variations
   */
  static generateCourseCodeVariations(courseCode) {
    if (!courseCode || typeof courseCode !== 'string') {
      return [];
    }

    const variations = new Set([
      courseCode,
      courseCode.replace(/\s+/g, ' ').trim(),         // Normalize spaces
      courseCode.replace(/\s+/g, '/'),                // Space to slash
      courseCode.replace(/[\/\s]+/g, ' '),            // Slash to space
      courseCode.replace(/\s+/g, ''),                 // Remove all spaces
      courseCode.replace(/(\w+)(\d+)/g, '$1 $2'),     // Add space between letters and numbers
      courseCode.replace(/(\w+)\s*(\d+)/g, '$1$2'),   // Remove space between letters and numbers
      courseCode.toUpperCase(),                       // Uppercase version
      courseCode.toLowerCase()                        // Lowercase version
    ]);
    
    return Array.from(variations).filter(Boolean);
  }
  
  /**
   * Check if a course matches any variation of the input code
   * Implements sophisticated matching logic for cross-listed and compound courses
   * @param {Object} course - Course object from catalog
   * @param {string[]} inputVariations - Array of input variations to match against
   * @returns {boolean} True if course matches any input variation
   */
  static doesCourseMatch(course, inputVariations) {
    if (!course?.course_code_original || !Array.isArray(inputVariations)) {
      return false;
    }

    const originalCode = course.course_code_original.toUpperCase().trim();
    
    for (const variation of inputVariations) {
      const upperVariation = variation.toUpperCase().trim();
      const normalizedOriginal = originalCode.replace(/[\/\s]+/g, '');
      const normalizedVariation = upperVariation.replace(/[\/\s]+/g, '');
      
      // Direct exact matches (fastest check first)
      if (originalCode === upperVariation ||
          originalCode.replace(/[\/\s]+/g, ' ') === upperVariation ||
          originalCode.replace(/[\/\s]+/g, '/') === upperVariation ||
          normalizedOriginal === normalizedVariation) {
        return true;
      }
      
      // Enhanced matching for cross-listed multi-number courses
      if (originalCode.includes('/')) {
        if (this.matchCrossListedCourse(originalCode, upperVariation)) {
          return true;
        }
      }
      
      // Handle single courses with letter suffixes
      if (this.matchSingleCourseWithLetters(originalCode, upperVariation)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Match cross-listed courses with complex patterns
   * Handles courses like "Ma/CS 6/106 abc" or "ACM/IDS 101 ab"
   * @param {string} originalCode - Original course code from catalog
   * @param {string} inputVariation - User input to match
   * @returns {boolean} True if courses match
   * @private
   */
  static matchCrossListedCourse(originalCode, inputVariation) {
    // Try to match complex cross-listed courses like "Ma/CS 6/106 abc"
    const complexMatch = originalCode.match(/^([A-Z]+(?:\/[A-Z]+)*)\s+(\d+)\/(\d+)\s*([A-Z]*)$/);
    if (complexMatch) {
      const [, coursePrefixes, firstNumber, secondNumber, courseLetters] = complexMatch;
      
      const inputMatch = inputVariation.match(/^([A-Z]+(?:\/[A-Z]+)*)\s*(\d+(?:\/\d+)?)\s*([A-Z]*)$/);
      if (inputMatch) {
        const [, inputPrefixes, inputNumbers, inputLetters] = inputMatch;
        
        if (this.checkPrefixCompatibility(coursePrefixes, inputPrefixes) &&
            this.checkNumberCompatibility(inputNumbers, firstNumber, secondNumber) &&
            this.checkLetterCompatibility(inputLetters, courseLetters)) {
          return true;
        }
      }
    }
    
    // Try simpler cross-listed courses (e.g., "ACM/IDS 101 ab")  
    const simpleMatch = originalCode.match(/^([A-Z]+(?:\/[A-Z]+)*)\s+(\d+)\s*([A-Z]*)$/);
    if (simpleMatch) {
      const [, coursePrefixes, courseNumber, courseLetters] = simpleMatch;
      
      const inputMatch = inputVariation.match(/^([A-Z]+(?:\/[A-Z]+)*)\s*(\d+)\s*([A-Z]*)$/);
      if (inputMatch) {
        const [, inputPrefixes, inputNumber, inputLetters] = inputMatch;
        
        if (this.checkPrefixCompatibility(coursePrefixes, inputPrefixes) &&
            inputNumber === courseNumber &&
            this.checkLetterCompatibility(inputLetters, courseLetters)) {
          return true;
        }
      }
    }
    
    // Fallback for other slash-containing formats
    const parts = originalCode.split('/');
    for (const part of parts) {
      const trimmedPart = part.trim();
      const normalizedPart = trimmedPart.replace(/[\/\s]+/g, '');
      const normalizedInput = inputVariation.replace(/[\/\s]+/g, '');
      
      if (trimmedPart === inputVariation ||
          normalizedPart === normalizedInput ||
          trimmedPart.replace(/\s+/g, '') === inputVariation.replace(/\s+/g, '')) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Match single courses with letter suffixes
   * @param {string} originalCode - Original course code
   * @param {string} inputVariation - Input to match
   * @returns {boolean} True if courses match
   * @private
   */
  static matchSingleCourseWithLetters(originalCode, inputVariation) {
    const inputMatch = inputVariation.match(/^([A-Z]+)\s*(\d+)\s*([A-Z]*)$/);
    const courseMatch = originalCode.match(/^([A-Z]+)\s*(\d+)\s*([A-Z]*)$/);
    
    if (inputMatch && courseMatch) {
      const [, inputPrefix, inputNumber, inputLetters] = inputMatch;
      const [, coursePrefix, courseNumber, courseLetters] = courseMatch;
      
      return inputPrefix === coursePrefix && 
             inputNumber === courseNumber && 
             this.checkLetterCompatibility(inputLetters, courseLetters);
    }
    
    return false;
  }

  /**
   * Check if input prefixes are compatible with course prefixes
   * @param {string} coursePrefixes - Course prefixes (e.g., "Ma/CS")
   * @param {string} inputPrefixes - Input prefixes
   * @returns {boolean} True if compatible
   * @private
   */
  static checkPrefixCompatibility(coursePrefixes, inputPrefixes) {
    const coursePrefixList = coursePrefixes.split('/');
    const inputPrefixList = inputPrefixes.split('/');
    
    // Input prefixes must be a subset of course prefixes
    return inputPrefixList.every(inputPrefix => 
      coursePrefixList.includes(inputPrefix.trim())
    );
  }

  /**
   * Check if input numbers are compatible with course numbers
   * @param {string} inputNumbers - Input numbers (e.g., "6" or "6/106")
   * @param {string} firstNumber - First course number
   * @param {string} secondNumber - Second course number
   * @returns {boolean} True if compatible
   * @private
   */
  static checkNumberCompatibility(inputNumbers, firstNumber, secondNumber) {
    if (inputNumbers.includes('/')) {
      // Input has both numbers - must match exactly
      return inputNumbers === `${firstNumber}/${secondNumber}`;
    } else {
      // Input has single number - must match either first or second
      return inputNumbers === firstNumber || inputNumbers === secondNumber;
    }
  }

  /**
   * Check if input letters are a subset of course letters
   * @param {string} inputLetters - Input letter suffix
   * @param {string} courseLetters - Course letter suffix
   * @returns {boolean} True if compatible
   * @private
   */
  static checkLetterCompatibility(inputLetters, courseLetters) {
    if (!inputLetters) return true;  // No letters specified matches any
    if (!courseLetters) return false; // Letters specified but course has none
    
    // Check if all letters in input are present in course letters
    return inputLetters.split('').every(letter => 
      courseLetters.includes(letter)
    );
  }
  
  /**
   * Find a course that matches the given course code
   * Main entry point for course matching with fallback strategies
   * @param {string} courseCode - Course code to search for
   * @param {Array} courses - Array of course objects
   * @returns {Object|null} Matching course object or null
   */
  static findCourseInCatalog(courseCode, courses) {
    if (!courseCode || !Array.isArray(courses)) {
      return null;
    }

    try {
      const variations = this.generateCourseCodeVariations(courseCode);
      
      // First, try to find a direct match
      const directMatch = courses.find(course => 
        this.doesCourseMatch(course, variations)
      );
      
      if (directMatch) {
        return directMatch;
      }
      
      // If no direct match found, check for section-based match
      const sectionMatch = this.findSectionBasedMatch(courseCode, courses);
      if (sectionMatch) {
        return sectionMatch;
      }
      
    } catch (error) {
      console.error('Error in course matching:', error);
    }
    
    return null;
  }
  
  /**
   * Create synthetic course entry for multi-section courses
   * When "EC 121 ab" is searched but only "EC 121 a" and "EC 121 b" exist
   * @param {string} courseCode - Multi-section course code
   * @param {Array} courses - Course catalog array
   * @returns {Object|null} Synthetic course object or null
   */
  static findSectionBasedMatch(courseCode, courses) {
    try {
      // Parse the course code to extract components
      const match = courseCode.match(/^([A-Za-z][a-zA-Z]{0,4}(?:\/[A-Za-z][a-zA-Z]{0,4})*)\s+(\d{1,3})\s*([a-z]+)?$/i);
      if (!match) {
        return null;
      }
      
      const [, department, number, letters] = match;
      
      // Only process multi-letter sections
      if (!letters || letters.length <= 1) {
        return null;
      }
      
      // Look for individual section courses
      const sectionCourses = [];
      for (const letter of letters) {
        const sectionCode = `${department} ${number} ${letter}`;
        const sectionCourse = courses.find(course => 
          this.doesCourseMatch(course, this.generateCourseCodeVariations(sectionCode))
        );
        
        if (sectionCourse) {
          sectionCourses.push(sectionCourse);
        }
      }
      
      // Create synthetic course if we found multiple sections
      if (sectionCourses.length >= 2) {
        const firstSection = sectionCourses[0];
        
        return {
          course_code_original: courseCode,
          name: this.generateSyntheticCourseName(firstSection.name, department, number),
          units: "See individual sections",
          terms: "See individual sections", 
          prerequisites: "See individual sections",
          description: `This course consists of multiple sections (${letters.split('').join(', ')}). Click repeatedly to cycle through individual sections for detailed information.`,
          instructors: "See individual sections",
          is_synthetic: true,
          section_courses: sectionCourses
        };
      }
      
    } catch (error) {
      console.error('Error in section-based matching:', error);
    }
    
    return null;
  }

  /**
   * Generate appropriate name for synthetic multi-section course
   * @param {string} originalName - Name from first section
   * @param {string} department - Department code
   * @param {string} number - Course number
   * @returns {string} Generated course name
   * @private
   */
  static generateSyntheticCourseName(originalName, department, number) {
    if (!originalName) {
      return `${department} ${number} (Multi-section)`;
    }
    
    // Remove roman numerals and section indicators
    const cleanedName = originalName
      .replace(/\s+[IVX]+$/, '')           // Remove trailing roman numerals
      .replace(/\s+\([abcdef]\)$/, '')     // Remove section letters in parentheses
      .replace(/\s+[abcdef]$/, '')         // Remove trailing section letters
      .trim();
    
    return cleanedName || `${department} ${number} (Multi-section)`;
  }
}

/**
 * Global cache manager instance
 * @type {CacheManager}
 */
const cacheManager = new CacheManager(300000); // 5 minute TTL

/**
 * Statistics tracking for monitoring extension performance
 * @type {Object}
 */
const stats = {
  courseLookups: 0,
  cacheHits: 0,
  cacheMisses: 0,
  errors: 0,
  startTime: Date.now()
};

/**
 * Load course catalog data with caching
 * @returns {Promise<Array>} Array of course objects
 */
async function loadCourseData() {
  const cacheKey = 'catalog_data';
  
  // Check cache first
  let catalogData = cacheManager.get(cacheKey);
  if (catalogData) {
    stats.cacheHits++;
    return catalogData;
  }
  
  stats.cacheMisses++;
  
  try {
    const response = await fetch(chrome.runtime.getURL('catalog.json'));
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    catalogData = await response.json();
    
    if (!Array.isArray(catalogData)) {
      throw new Error('Invalid catalog format: expected array');
    }
    
    // Cache the loaded data
    cacheManager.set(cacheKey, catalogData);
    
    return catalogData;
    
  } catch (error) {
    stats.errors++;
    console.error('Failed to load course catalog:', error);
    throw error;
  }
}

/**
 * Initialize extension settings on first install
 * Sets up default preferences if none exist
 */
async function initializeSettings() {
  try {
    const existingSettings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    
    // Only set defaults if no settings exist
    if (Object.keys(existingSettings).length === 0) {
      await chrome.storage.sync.set(DEFAULT_SETTINGS);
    }
    
  } catch (error) {
    console.error('❌ Error initializing settings:', error);
    stats.errors++;
  }
}

/**
 * Handle extension installation and updates
 */
chrome.runtime.onInstalled.addListener(async (details) => {

  try {
    await initializeSettings();
    
    // Preload catalog on install for better performance
    if (details.reason === 'install') {
      await loadCourseData();
    }
    
  } catch (error) {
    console.error('❌ Installation error:', error);
    stats.errors++;
  }
});

/**
 * Handle messages from content scripts and popup
 * Provides centralized communication hub for the extension
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Validate message structure
  if (!message || typeof message.type !== 'string') {
    sendResponse({ success: false, error: 'Invalid message format' });
    return false;
  }
  switch (message.type) {
    case 'GET_CATALOG_DATA':
      handleGetCatalogData(sendResponse);
      return true; // Async response
      
    case 'FIND_COURSE':
      handleFindCourse(message, sendResponse);
      return true; // Async response
      
    case 'GET_STATS':
      handleGetStats(sendResponse);
      return false; // Sync response
      
    case 'CLEAR_CACHE':
      handleClearCache(sendResponse);
      return false; // Sync response
      
    default:
      console.warn('⚠️ Unknown message type:', message.type);
      sendResponse({ success: false, error: 'Unknown message type' });
      return false;
  }
});

/**
 * Handle catalog data requests
 * @param {Function} sendResponse - Response callback
 */
async function handleGetCatalogData(sendResponse) {
  try {
    const data = await loadCourseData();
    sendResponse({ success: true, data });
  } catch (error) {
    console.error('❌ Error loading catalog data:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle course lookup requests
 * @param {Object} message - Message object containing courseCode
 * @param {Function} sendResponse - Response callback
 */
async function handleFindCourse(message, sendResponse) {
  try {
    if (!message.courseCode || typeof message.courseCode !== 'string') {
      throw new Error('Invalid course code provided');
    }
    
    stats.courseLookups++;
    
    const catalogData = await loadCourseData();
    const courseInfo = CourseMatchingUtils.findCourseInCatalog(message.courseCode, catalogData);
    
    sendResponse({ 
      success: true, 
      courseInfo,
      found: !!courseInfo 
    });
    
  } catch (error) {
    console.error('❌ Error finding course:', error);
    stats.errors++;
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle statistics requests
 * @param {Function} sendResponse - Response callback
 */
function handleGetStats(sendResponse) {
  const uptime = Date.now() - stats.startTime;
  const cacheStats = cacheManager.getStats();
  
  sendResponse({
    success: true,
    stats: {
      ...stats,
      uptime,
      cache: cacheStats
    }
  });
}

/**
 * Handle cache clearing requests
 * @param {Function} sendResponse - Response callback
 */
function handleClearCache(sendResponse) {
  try {
    cacheManager.clear();
    sendResponse({ success: true, message: 'Cache cleared successfully' });
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Cleanup when extension is suspended
 */
chrome.runtime.onSuspend.addListener(() => {
  if (cacheManager) {
    cacheManager.destroy();
  }
});

// Export for testing purposes (if in test environment)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CacheManager,
    CourseMatchingUtils,
    DEFAULT_SETTINGS,
    loadCourseData
  };
}
