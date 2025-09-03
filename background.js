/**
 * Background script for Caltech Course Code Tooltip extension
 * Handles message passing and course matching utilities
 * 
 * @author Varun Rodrigues
 * @version 2.0
 */

// Define DEFAULT_SETTINGS directly in background script (service workers don't have window object)
const DEFAULT_SETTINGS = {
  extensionEnabled: true,
  showName: true,
  showUnits: true,
  showTerms: true,
  showPrerequisites: true,
  showDescription: false,
  showInstructors: false
};

// Shared course matching utilities
class CourseMatchingUtils {
  /**
   * Generate variations of a course code for matching
   * @param {string} courseCode - The course code to generate variations for
   * @returns {string[]} Array of course code variations
   */
  static generateCourseCodeVariations(courseCode) {
    const variations = [
      courseCode,
      courseCode.replace(/\s+/g, ' '),
      courseCode.replace(/\s+/g, '/'),
      courseCode.replace(/[\/\s]+/g, ' '),
      courseCode.replace(/\s+/g, ''), // Remove all spaces
      courseCode.replace(/(\w+)(\d+)/g, '$1 $2'), // Add space between letters and numbers
      courseCode.replace(/(\w+)\s*(\d+)/g, '$1$2') // Remove space between letters and numbers
    ];
    
    return [...new Set(variations)]; // Remove duplicates
  }
  
  /**
   * Check if a course matches any variation of the input
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
      
      // Enhanced matching for cross-listed multi-number courses with comprehensive letter support
      if (originalCode.includes('/')) {
        // Try to match complex cross-listed courses like "Ma/CS 6/106 abc"
        const complexMatch = originalCode.match(/^([A-Z]+(?:\/[A-Z]+)*)\s+(\d+)\/(\d+)\s*([A-Z]*)$/);
        if (complexMatch) {
          const [, coursePrefixes, firstNumber, secondNumber, courseLetters] = complexMatch;
          
          // Parse user input with flexible formatting
          const inputMatch = upperVariation.match(/^([A-Z]+(?:\/[A-Z]+)*)\s*(\d+(?:\/\d+)?)\s*([A-Z]*)$/);
          if (inputMatch) {
            const [, inputPrefixes, inputNumbers, inputLetters] = inputMatch;
            
            // Check prefix compatibility
            const coursePrefixList = coursePrefixes.split('/');
            const inputPrefixList = inputPrefixes.split('/');
            
            // Input prefixes must be a subset of course prefixes
            const prefixMatches = inputPrefixList.every(inputPrefix => 
              coursePrefixList.includes(inputPrefix)
            );
            
            if (prefixMatches) {
              // Check number compatibility
              let numberMatches = false;
              
              if (inputNumbers.includes('/')) {
                // Input has both numbers (e.g., "6/106") - must match exactly
                numberMatches = inputNumbers === `${firstNumber}/${secondNumber}`;
              } else {
                // Input has single number - must match either first or second number
                numberMatches = inputNumbers === firstNumber || inputNumbers === secondNumber;
              }
              
              if (numberMatches) {
                // Check letter compatibility
                if (inputLetters) {
                  // Input letters must be a subset of course letters
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
        const simpleMatch = originalCode.match(/^([A-Z]+(?:\/[A-Z]+)*)\s+(\d+)\s*([A-Z]*)$/);
        if (simpleMatch) {
          const [, coursePrefixes, courseNumber, courseLetters] = simpleMatch;
          
          const inputMatch = upperVariation.match(/^([A-Z]+(?:\/[A-Z]+)*)\s*(\d+)\s*([A-Z]*)$/);
          if (inputMatch) {
            const [, inputPrefixes, inputNumber, inputLetters] = inputMatch;
            
            // Check prefix compatibility
            const coursePrefixList = coursePrefixes.split('/');
            const inputPrefixList = inputPrefixes.split('/');
            
            const prefixMatches = inputPrefixList.every(inputPrefix => 
              coursePrefixList.includes(inputPrefix)
            );
            
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
        
        // Fallback for other slash-containing formats
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
      
      // Handle single courses with letter suffixes
      const inputMatch = upperVariation.match(/^([A-Z]+)\s*(\d+)\s*([A-Z]*)$/);
      const courseMatch = originalCode.match(/^([A-Z]+)\s*(\d+)\s*([A-Z]*)$/);
      
      if (inputMatch && courseMatch) {
        const [, inputPrefix, inputNumber, inputLetters] = inputMatch;
        const [, coursePrefix, courseNumber, courseLetters] = courseMatch;
        
        if (inputPrefix === coursePrefix && inputNumber === courseNumber) {
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
    
    return false;
  }
  
  /**
   * Check if input letters are a subset of course letters
   * E.g., "A" is subset of "AB", "AB" is subset of "ABC"
   */
  static isLetterSubset(inputLetters, courseLetters) {
    if (!inputLetters) return true;
    if (!courseLetters) return false;
    
    // Check if all letters in input are present in course letters
    for (const letter of inputLetters) {
      if (!courseLetters.includes(letter)) {
        return false;
      }
    }
    return true;
  }
  
  /**
   * Find a course that matches the given course code
   */
  static findCourseInCatalog(courseCode, courses) {
    const variations = this.generateCourseCodeVariations(courseCode);
    
    // First, try to find a direct match
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
    
    return null;
  }
  
  /**
   * Check if a course code with multiple sections has individual section courses
   * and create a synthetic combined course entry
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
        section_courses: sectionCourses // Include the actual section courses
      };
    }
    
    return null;
  }
}

// Initialize extension on install
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const existingSettings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    
    // Only set defaults if settings don't exist
    if (Object.keys(existingSettings).length === 0) {
      await chrome.storage.sync.set(DEFAULT_SETTINGS);
      console.log('Default settings initialized');
    }
  } catch (error) {
    console.error('Error initializing settings:', error);
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_CATALOG_DATA') {
    // Try to fetch catalog data and send it back
    fetch(chrome.runtime.getURL('catalog.json'))
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        sendResponse({ success: true, data: data });
      })
      .catch(error => {
        console.error('Background script failed to load catalog:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    // Return true to indicate we will send response asynchronously
    return true;
  }
  
  if (message.type === 'FIND_COURSE') {
    // Handle course lookup using shared utilities
    fetch(chrome.runtime.getURL('catalog.json'))
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        const courseInfo = CourseMatchingUtils.findCourseInCatalog(message.courseCode, data);
        sendResponse({ 
          success: true, 
          courseInfo: courseInfo,
          found: !!courseInfo 
        });
      })
      .catch(error => {
        console.error('Background script failed to find course:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    // Return true to indicate we will send response asynchronously
    return true;
  }
});
