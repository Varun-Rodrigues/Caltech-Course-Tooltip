/**
 * Background Service Worker for Caltech Course Code Tooltip Extension
 * 
 * This background script serves as the communication hub for the extension, handling:
 * - Message passing between content scripts and popup
 * - Course catalog data retrieval and caching
 * - Complex course code matching logic for cross-listed courses
 * - Extension settings initialization
 * 
 * Key Features:
 * - Supports complex course formats like "Ma/CS 6/106 abc"
 * - Handles partial course code matching (e.g., "CS 156" matches "ACM/CS 156")
 * - Creates synthetic course entries for multi-section courses
 * - Provides fallback matching for various input formats
 * 
 * @author Varun Rodrigues
 * @version 2.0
 * @since 2025
 */

/**
 * Default extension settings configuration
 * Note: Defined here because service workers don't have access to window object
 * These settings control what information is displayed in tooltips
 */
const DEFAULT_SETTINGS = {
  extensionEnabled: true,      // Master toggle for extension functionality
  showName: true,              // Display course name/title
  showUnits: true,             // Display unit count
  showTerms: true,             // Display terms offered
  showPrerequisites: true,     // Display prerequisite information
  showDescription: true,       // Display course description
  showInstructors: true        // Display instructor information
};

/**
 * Utility class for sophisticated course code matching algorithms
 * 
 * This class handles the complex logic needed to match user input against
 * Caltech's diverse course code formats, including:
 * - Cross-listed courses (e.g., "ACM/CS 156")
 * - Multi-number courses (e.g., "Ma/CS 6/106")
 * - Section-based courses (e.g., "Ph 12 abc")
 * - Partial matches and fuzzy matching
 * 
 * All methods are static as this is a utility class without state
 */
class CourseMatchingUtils {
  /**
   * Generate multiple formatting variations of a course code for robust matching
   * 
   * Creates variations to handle different spacing, separator styles, and formatting
   * that users might input or that appear in different contexts.
   * 
   * @param {string} courseCode - The original course code to generate variations for
   * @returns {string[]} Array of unique course code variations for matching
   * 
   * @example
   * generateCourseCodeVariations("CS 156") returns:
   * ["CS 156", "CS/156", "CS156", etc.]
   */
  static generateCourseCodeVariations(courseCode) {
    const variations = [
      courseCode,                                          // Original format
      courseCode.replace(/\s+/g, ' '),                    // Normalize spaces
      courseCode.replace(/\s+/g, '/'),                    // Space to slash
      courseCode.replace(/[\/\s]+/g, ' '),                // Slash to space
      courseCode.replace(/\s+/g, ''),                     // Remove all spaces
      courseCode.replace(/(\w+)(\d+)/g, '$1 $2'),         // Add space between letters and numbers
      courseCode.replace(/(\w+)\s*(\d+)/g, '$1$2')        // Remove space between letters and numbers
    ];
    
    return [...new Set(variations)]; // Remove duplicates using Set
  }
  
  /**
   * Determine if a course matches any variation of the user's input
   * 
   * This is the core matching algorithm that handles:
   * - Exact matches with various formatting
   * - Cross-listed course matching (e.g., "CS 156" matches "ACM/CS 156")
   * - Multi-number course matching (e.g., "6" matches "Ma/CS 6/106")
   * - Section letter matching (e.g., "a" matches "abc", but "d" doesn't match "abc")
   * 
   * @param {Object} course - Course object containing course_code_original field
   * @param {string[]} inputVariations - Array of input variations to test against
   * @returns {boolean} True if the course matches any input variation
   */
  static doesCourseMatch(course, inputVariations) {
    const originalCode = course.course_code_original?.toUpperCase() || '';
    
    for (const variation of inputVariations) {
      const upperVariation = variation.toUpperCase();
      const normalizedOriginal = originalCode.replace(/[\/\s]+/g, '');
      const normalizedVariation = upperVariation.replace(/[\/\s]+/g, '');
      
      // Exact matches
      if (originalCode === upperVariation ||
          originalCode.replace(/[\/\s]+/g, ' ') === upperVariation ||
          originalCode.replace(/[\/\s]+/g, '/') === upperVariation ||
          normalizedOriginal === normalizedVariation) {
        return true;
      }
      
      // Enhanced matching for cross-listed multi-number courses
      // Example: Input "CS 6" should match "Ma/CS 6/106 abc"
      // Example: Input "Ma/CS 6" should match "Ma/CS 6/106 abc"
      if (originalCode.includes('/')) {
        // Try to match complex cross-listed courses like "Ma/CS 6/106 abc"
        // This handles courses with multiple departments and multiple numbers
        const complexMatch = originalCode.match(/^([A-Z]+(?:\/[A-Z]+)*)\s+(\d+)\/(\d+)\s*([A-Z]*)$/);
        if (complexMatch) {
          const [, coursePrefixes, firstNumber, secondNumber, courseLetters] = complexMatch;
          
          // Parse user input with flexible formatting
          // User might input "CS 6", "Ma/CS 6", "CS 6/106", etc.
          const inputMatch = upperVariation.match(/^([A-Z]+(?:\/[A-Z]+)*)\s*(\d+(?:\/\d+)?)\s*([A-Z]*)$/);
          if (inputMatch) {
            const [, inputPrefixes, inputNumbers, inputLetters] = inputMatch;
            
            // Check prefix compatibility - input prefixes must be subset of course prefixes
            // e.g., "CS" is subset of "Ma/CS", but "Ph" is not subset of "Ma/CS"
            const coursePrefixList = coursePrefixes.split('/');
            const inputPrefixList = inputPrefixes.split('/');
            
            // Input prefixes must be a subset of course prefixes
            const prefixMatches = inputPrefixList.every(inputPrefix => 
              coursePrefixList.includes(inputPrefix)
            );
            
            if (prefixMatches) {
              // Check number compatibility for multi-number courses
              let numberMatches = false;
              
              if (inputNumbers.includes('/')) {
                // Input has both numbers (e.g., "6/106") - must match exactly
                numberMatches = inputNumbers === `${firstNumber}/${secondNumber}`;
              } else {
                // Input has single number - must match either first or second number
                // e.g., "6" matches "6/106", "106" matches "6/106"
                numberMatches = inputNumbers === firstNumber || inputNumbers === secondNumber;
              }
              
              if (numberMatches) {
                // Check letter compatibility - input letters must be subset of course letters
                if (inputLetters) {
                  // Input letters must be a subset of course letters
                  // e.g., "a" matches "abc", "ab" matches "abc", but "d" doesn't match "abc"
                  if (courseLetters && this.isLetterSubset(inputLetters, courseLetters)) {
                    return true;
                  }
                } else {
                  // No letters specified - match any course with this prefix/number combination
                  return true;
                }
              }
            }
          }
        }
        
        // Try simpler cross-listed courses (e.g., "ACM/IDS 101 ab")
        // This handles standard cross-listed courses with single numbers
        const simpleMatch = originalCode.match(/^([A-Z]+(?:\/[A-Z]+)*)\s+(\d+)\s*([A-Z]*)$/);
        if (simpleMatch) {
          const [, coursePrefixes, courseNumber, courseLetters] = simpleMatch;
          
          const inputMatch = upperVariation.match(/^([A-Z]+(?:\/[A-Z]+)*)\s*(\d+)\s*([A-Z]*)$/);
          if (inputMatch) {
            const [, inputPrefixes, inputNumber, inputLetters] = inputMatch;
            
            // Check prefix compatibility (same logic as complex courses)
            const coursePrefixList = coursePrefixes.split('/');
            const inputPrefixList = inputPrefixes.split('/');
            
            const prefixMatches = inputPrefixList.every(inputPrefix => 
              coursePrefixList.includes(inputPrefix)
            );
            
            // Check number and letter matching
            if (prefixMatches && inputNumber === courseNumber) {
              if (inputLetters) {
                if (courseLetters && this.isLetterSubset(inputLetters, courseLetters)) {
                  return true;
                }
              } else {
                return true;
              }
            }
          }
        }
        
        // Fallback matching for other slash-containing formats
        // Split on slashes and try to match individual parts
        // This catches edge cases not handled by the regex patterns above
        const parts = originalCode.split('/');
        for (const part of parts) {
          const trimmedPart = part.trim();
          const normalizedPart = trimmedPart.replace(/[\/\s]+/g, '');
          
          if (trimmedPart === upperVariation ||
              normalizedPart === normalizedVariation ||
              trimmedPart.replace(/\s+/g, '') === upperVariation.replace(/\s+/g, '')) {
            return true;
          }
        }
      }
      
      // Handle single courses with letter suffixes (e.g., "Ph 12 abc")
      // This is for non-cross-listed courses with section letters
      const inputMatch = upperVariation.match(/^([A-Z]+)\s*(\d+)\s*([A-Z]*)$/);
      const courseMatch = originalCode.match(/^([A-Z]+)\s*(\d+)\s*([A-Z]*)$/);
      
      if (inputMatch && courseMatch) {
        const [, inputPrefix, inputNumber, inputLetters] = inputMatch;
        const [, coursePrefix, courseNumber, courseLetters] = courseMatch;
        
        // Department and number must match exactly
        if (inputPrefix === coursePrefix && inputNumber === courseNumber) {
          if (inputLetters) {
            // Check if input letters are subset of course letters
            if (courseLetters && this.isLetterSubset(inputLetters, courseLetters)) {
              return true;
            }
          } else {
            // No letters specified - match the course regardless of its letters
            return true;
          }
        }
      }
    }
    
    return false;
  }
  
  /**
   * Check if input letters are a subset of course letters
   * 
   * This handles section letter matching where users can specify partial sections.
   * For example, "a" should match "abc", "ab" should match "abc", but "d" should not match "abc".
   * 
   * @param {string} inputLetters - Letters specified by user (e.g., "a", "ab")
   * @param {string} courseLetters - Letters available in course (e.g., "abc", "xyz")
   * @returns {boolean} True if all input letters are found in course letters
   * 
   * @example
   * isLetterSubset("a", "abc") → true
   * isLetterSubset("ab", "abc") → true
   * isLetterSubset("d", "abc") → false
   */
  static isLetterSubset(inputLetters, courseLetters) {
    if (!inputLetters) return true;  // Empty input matches anything
    if (!courseLetters) return false; // Non-empty input can't match empty course letters
    
    // Check if all letters in input are present in course letters
    for (const letter of inputLetters) {
      if (!courseLetters.includes(letter)) {
        return false;
      }
    }
    return true;
  }
  
  /**
   * Find a course in the catalog that matches the given course code
   * 
   * This is the main entry point for course matching. It tries direct matching first,
   * then falls back to section-based matching for multi-section courses.
   * 
   * @param {string} courseCode - The course code to search for
   * @param {Array} courses - Array of course objects to search in
   * @returns {Object|null} Matching course object or null if no match found
   */
  static findCourseInCatalog(courseCode, courses) {
    const variations = this.generateCourseCodeVariations(courseCode);
    
    // First, try to find a direct match in the catalog
    const directMatch = courses.find(course => this.doesCourseMatch(course, variations));
    if (directMatch) {
      return directMatch;
    }
    
    // If no direct match found, check if this might be a multi-section course
    // where only individual sections exist (e.g., "Ec 121 ab" but only "Ec 121 a" and "Ec 121 b" exist)
    const sectionMatch = this.findSectionBasedMatch(courseCode, courses);
    if (sectionMatch) {
      return sectionMatch;
    }
    
    return null; // No match found
  }
  
  /**
   * Create synthetic course entries for multi-section courses
   * 
   * When users search for "Ph 12 abc" but only "Ph 12 a", "Ph 12 b", "Ph 12 c" exist
   * individually in the catalog, this function creates a combined course entry.
   * The synthetic course allows users to cycle through individual sections.
   * 
   * @param {string} courseCode - The multi-section course code to find
   * @param {Array} courses - Array of course objects to search in
   * @returns {Object|null} Synthetic course object or null if insufficient sections found
   */
  static findSectionBasedMatch(courseCode, courses) {
    // Parse the course code to extract department, number, and letters
    const match = courseCode.match(/^([A-Za-z][a-zA-Z]{0,4}(?:\/[A-Za-z][a-zA-Z]{0,4})*)\s+(\d{1,3})\s*([a-z]+)?$/i);
    if (!match) {
      return null;
    }
    
    const [, department, number, letters] = match;
    
    // If no letters or only one letter, not a multi-section course
    if (!letters || letters.length <= 1) {
      return null;
    }
    
    // Look for individual section courses in the catalog
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
    
    // If we found at least 2 section courses, create a synthetic combined course
    if (sectionCourses.length >= 2) {
      const firstSection = sectionCourses[0];
      
      // Create a synthetic course that represents the combined sections
      return {
        course_code_original: courseCode,
        name: firstSection.name ? firstSection.name.replace(/\s+[IVX]+$/, '') : `${department} ${number} (Multi-section)`, // Remove roman numerals like "I", "II"
        units: "See individual sections",
        terms: "See individual sections", 
        prerequisites: "See individual sections",
        description: `This course consists of multiple sections (${letters.split('').join(', ')}). Click repeatedly to cycle through individual sections for detailed information.`,
        instructors: "See individual sections",
        is_synthetic: true, // Flag to indicate this is a synthetic course
        section_courses: sectionCourses // Include the actual section courses for cycling
      };
    }
    
    return null; // Insufficient sections found
  }
}

/**
 * Extension lifecycle management
 * Initialize default settings when the extension is first installed
 */
chrome.runtime.onInstalled.addListener(async () => {
  try {
    // Check if settings already exist to avoid overwriting user preferences
    const existingSettings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    
    // Only set defaults if settings don't exist (fresh install)
    if (Object.keys(existingSettings).length === 0) {
      await chrome.storage.sync.set(DEFAULT_SETTINGS);
      console.log('✅ Default extension settings initialized');
    } else {
      console.log('⚙️ Existing settings found, preserving user preferences');
    }
  } catch (error) {
    console.error('❌ Error initializing extension settings:', error);
  }
});

/**
 * Message handler for communication between extension components
 * 
 * Handles requests from:
 * - Content scripts requesting catalog data
 * - Popup requesting course lookups
 * - Content scripts requesting course matching
 * 
 * All responses are sent asynchronously to avoid blocking
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Validate message structure to prevent errors
  if (!message || typeof message !== 'object' || !message.type) {
    sendResponse({ success: false, error: 'Invalid message format' });
    return;
  }

  if (message.type === 'GET_CATALOG_DATA') {
    // Content script requesting the full catalog data
    fetchCatalogData()
      .then(data => {
        sendResponse({ success: true, data: data });
      })
      .catch(error => {
        console.error('❌ Background script failed to load catalog:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Indicate async response
  }
  
  if (message.type === 'FIND_COURSE') {
    // Popup or content script requesting specific course lookup
    if (!message.courseCode) {
      sendResponse({ success: false, error: 'Missing courseCode parameter' });
      return;
    }

    findCourseInCatalog(message.courseCode)
      .then(courseInfo => {
        sendResponse({ 
          success: true, 
          courseInfo: courseInfo,
          found: !!courseInfo 
        });
      })
      .catch(error => {
        console.error('❌ Background script failed to find course:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Indicate async response
  }

  // Unknown message type
  sendResponse({ success: false, error: `Unknown message type: ${message.type}` });
});

/**
 * Helper function to fetch catalog data from extension resources
 * @returns {Promise<Array>} Promise resolving to catalog data array
 */
async function fetchCatalogData() {
  const response = await fetch(chrome.runtime.getURL('catalog.json'));
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return await response.json();
}

/**
 * Helper function to find a course using the matching utilities
 * @param {string} courseCode - Course code to search for
 * @returns {Promise<Object|null>} Promise resolving to course info or null
 */
async function findCourseInCatalog(courseCode) {
  const data = await fetchCatalogData();
  return CourseMatchingUtils.findCourseInCatalog(courseCode, data);
}
