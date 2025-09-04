/**
 * Popup Interface for Caltech Course Code Tooltip Extension
 * ========================================================
 * 
 * This script manages the extension's popup interface, providing users with:
 * - Real-time course lookup functionality
 * - Extension settings configuration
 * - Status monitoring and feedback
 * - Accordion-style UI for organized information display
 * 
 * Key Features:
 * - Interactive course search with instant results
 * - Toggle switches for all tooltip display options
 * - Settings persistence using Chrome storage API
 * - Real-time communication with content scripts
 * - User-friendly accordion interface
 * - Comprehensive error handling and fallbacks
 * 
 * Architecture:
 * - Event-driven design with DOM event listeners
 * - Asynchronous communication with background script
 * - Robust storage management with fallbacks
 * - Modular function design for maintainability
 * 
 * @author Varun Rodrigues
 * @version 2.0
 * @since 2025
 */

/**
 * Default settings configuration with fallback support
 * 
 * Loads settings from global configuration object if available,
 * otherwise falls back to hardcoded defaults to ensure extension
 * functionality even if config.js fails to load.
 */
const DEFAULT_SETTINGS = (typeof window !== 'undefined' && window.CaltechExtensionConfig?.DEFAULT_SETTINGS) || {
  extensionEnabled: true,      // Master toggle for extension functionality
  showName: true,              // Display course name/title in tooltips
  showUnits: true,             // Display unit count in tooltips
  showTerms: true,             // Display terms offered in tooltips
  showPrerequisites: true,     // Display prerequisite information
  showDescription: false,      // Display course description (default off for space)
  showInstructors: true        // Display instructor information
};

// Extract setting keys for dynamic toggle handling
const TOGGLE_IDS = Object.keys(DEFAULT_SETTINGS);

/**
 * Main popup initialization
 * 
 * Executed when the DOM is fully loaded. Coordinates the entire popup setup process
 * including settings loading, UI updates, event listener setup, and error handling.
 */
document.addEventListener('DOMContentLoaded', initializePopup);

/**
 * Initialize popup interface and functionality
 * 
 * This function orchestrates the popup startup sequence:
 * 1. Load user settings from storage
 * 2. Update UI to reflect current settings
 * 3. Display extension status
 * 4. Set up event listeners for user interactions
 * 5. Initialize accordion interface
 * 
 * Includes comprehensive error handling to ensure popup remains functional
 * even if individual components fail.
 */
async function initializePopup() {
  try {
    const settings = await loadSettings();
    updateUI(settings);
    updateStatus(settings.extensionEnabled);
    setupEventListeners(settings);
    initializeAccordions(); // Initialize accordion functionality
  } catch (error) {
    console.error('❌ Error initializing popup:', error);
    updateStatus(false); // Show disabled status on error
  }
}

/**
 * Load extension settings from Chrome storage with fallback
 * 
 * Attempts to load user settings from Chrome's sync storage. If storage
 * is unavailable (e.g., in development or if permissions are missing),
 * falls back to default settings to maintain functionality.
 * 
 * @returns {Promise<Object>} Promise resolving to settings object
 */
async function loadSettings() {
  try {
    return await chrome.storage.sync.get(DEFAULT_SETTINGS);
  } catch (error) {
    console.warn('⚠️ Chrome storage not available, using defaults:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Set up event listeners for all interactive elements
 * 
 * Configures event handling for:
 * - Toggle switches for settings
 * - Course lookup input and interactions
 * - Any dynamic UI elements
 * 
 * @param {Object} settings - Current extension settings
 */
function setupEventListeners(settings) {
  // Set up toggle switch event listeners
  TOGGLE_IDS.forEach(toggleId => {
    const toggle = document.getElementById(toggleId);
    if (toggle) {
      toggle.addEventListener('change', (e) => 
        handleToggleChange(toggleId, e.target.checked, settings)
      );
    }
  });
  
  // Set up course lookup functionality
  setupCourseLookup(settings);
}

function setupCourseLookup(settings) {
  const lookupInput = document.getElementById('course-lookup-input');
  const lookupResult = document.getElementById('course-lookup-result');
  
  if (lookupInput && lookupResult) {
    lookupInput.addEventListener('input', (e) => {
      const courseCode = e.target.value.trim().toUpperCase();
      if (courseCode.length >= 2) {
        lookupCourse(courseCode, lookupResult, settings);
      } else {
        lookupResult.innerHTML = '<span style="font-size: 12px;">Enter a course code above to see course information.</span>';
      }
    });
  }
}

function initializeAccordions() {
  const accordionHeaders = document.querySelectorAll('.accordion-header');
  
  accordionHeaders.forEach(header => {
    header.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const targetId = this.getAttribute('data-target');
      const content = document.getElementById(targetId);
      
      if (content) {
        const isCurrentlyActive = this.classList.contains('active');
        
        // Close all accordions first
        accordionHeaders.forEach(otherHeader => {
          const otherTargetId = otherHeader.getAttribute('data-target');
          const otherContent = document.getElementById(otherTargetId);
          
          if (otherContent) {
            otherHeader.classList.remove('active');
            otherContent.classList.remove('active');
          }
        });
        
        // If the clicked accordion wasn't active, open it
        if (!isCurrentlyActive) {
          this.classList.add('active');
          content.classList.add('active');
        }
      }
    });
  });
}

async function lookupCourse(courseCode, resultDiv, settings) {
  try {
    // First try the background script's shared utility
    const response = await chrome.runtime.sendMessage({
      type: 'FIND_COURSE',
      courseCode: courseCode
    });
    
    if (response && response.success && response.courseInfo) {
      displayCourseInfo(response.courseInfo, resultDiv, settings);
      return;
    }
    
    // Fallback: Send course lookup request to content script for sophisticated matching
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    try {
      const contentResponse = await chrome.tabs.sendMessage(tab.id, {
        type: 'LOOKUP_COURSE',
        courseCode: courseCode
      });
      
      if (contentResponse && contentResponse.success && contentResponse.courseInfo) {
        displayCourseInfo(contentResponse.courseInfo, resultDiv, settings);
        return;
      }
    } catch (contentScriptError) {
      console.log('Content script not available, using background script fallback');
    }
    
    // If no course found
    resultDiv.innerHTML = `
      <div style="color: #999; font-style: italic; font-size: 10px;">
        Course "${courseCode}" not found in catalog.
        <br><br>
        Try formats like: CS 157, IDS 157, MATH 108
      </div>
    `;
    
  } catch (error) {
    console.error('Error looking up course:', error);
    resultDiv.innerHTML = '<div style="color: #999;">Error loading course information.</div>';
  }
}

function displayCourseInfo(courseInfo, resultDiv, settings) {
  // Check if this is a synthetic course
  const isSyntheticCourse = courseInfo.prerequisites === "See individual sections";
  
  if (isSyntheticCourse) {
    // For synthetic courses, show a helpful message about searching individual sections
    const courseCode = courseInfo.course_code_original;
    const sections = [];
    
    // Extract the base course code and generate section suggestions
    const match = courseCode.match(/^(.+?)\s+([a-z]+)$/i);
    if (match) {
      const baseCourse = match[1];
      const sectionPattern = match[2].toLowerCase();
      
      // Generate individual section names
      for (const letter of sectionPattern) {
        sections.push(`${baseCourse} ${letter}`);
      }
    }
    
    let html = `<div class="course-code">
      ${courseCode}
    </div>`;
    
    if (settings.showName && courseInfo.name) {
      html += `<div class="course-title">
        ${courseInfo.name}
      </div>`;
    }
    
    // Show helpful message for synthetic courses
    html += `<div class="description" style="color: #666; font-style: italic; margin-top: 8px;">
      This is a multi-section course. Search individual sections separately:
    </div>`;
    
    if (sections.length > 0) {
      html += `<div style="margin-top: 4px; font-size: 11px;">`;
      sections.forEach((section, index) => {
        html += `<div style="margin: 2px 0;">"${section}"</div>`;
      });
      html += `</div>`;
    }
    
    resultDiv.innerHTML = html;
    return;
  }
  
  // Regular course display
  let html = `<div class="course-code">
    ${courseInfo.course_code_original}
  </div>`;
  
  if (settings.showName && courseInfo.name) {
    html += `<div class="course-title">
      ${courseInfo.name}
    </div>`;
  }
  
  // Combine units and terms into one line
  const unitsInfo = (settings.showUnits && courseInfo.units) ? courseInfo.units : '';
  const termsInfo = (settings.showTerms && courseInfo.terms) ? courseInfo.terms : '';
  
  if (unitsInfo || termsInfo) {
    const combinedInfo = [unitsInfo, termsInfo].filter(info => info).join(' | ');
    html += `<div class="course-meta">
      ${combinedInfo}
    </div>`;
  }
  
  if (settings.showPrerequisites && courseInfo.prerequisites) {
    html += `<div class="prerequisites">
      Prerequisites: ${courseInfo.prerequisites}
    </div>`;
  }
  
  if (settings.showDescription && courseInfo.description) {
    html += `<div class="description">
      ${courseInfo.description}
    </div>`;
  }
  
  if (settings.showInstructors && courseInfo.instructors) {
    html += `<div class="instructors">
      <strong>Instructors:</strong> ${courseInfo.instructors}
    </div>`;
  }
  
  resultDiv.innerHTML = html;
}

async function handleToggleChange(toggleId, checked, settings) {
  const newSettings = { ...settings, [toggleId]: checked };
  
  try {
    await chrome.storage.sync.set(newSettings);
    Object.assign(settings, newSettings);
    
    if (toggleId === 'extensionEnabled') {
      updateStatus(checked);
    }
    
    // Refresh the lookup result if it's currently showing something
    const lookupInput = document.getElementById('course-lookup-input');
    const lookupResult = document.getElementById('course-lookup-result');
    if (lookupInput && lookupResult && lookupInput.value.trim().length >= 2) {
      lookupCourse(lookupInput.value.trim().toUpperCase(), lookupResult, newSettings);
    }
    
    await notifyContentScript(newSettings);
  } catch (error) {
    console.error('Error updating settings:', error);
  }
}

function updateUI(settings) {
  TOGGLE_IDS.forEach(toggleId => {
    const toggle = document.getElementById(toggleId);
    if (toggle) {
      toggle.checked = settings[toggleId];
    }
  });
}

function updateStatus(enabled) {
  const headerSubtitle = document.getElementById('header-subtitle');
  const statusText = document.getElementById('status-text');
  
  if (headerSubtitle && statusText) {
    headerSubtitle.className = enabled ? 'header-subtitle enabled' : 'header-subtitle disabled';
    statusText.textContent = enabled ? 'Enabled' : 'Disabled';
  }
}

async function notifyContentScript(settings) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tab.id, {
      type: 'SETTINGS_UPDATED',
      settings
    });
  } catch (error) {
    // Content script might not be loaded, that's okay
    console.log('Could not notify content script:', error);
  }
}
