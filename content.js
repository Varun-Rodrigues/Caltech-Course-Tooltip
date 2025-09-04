/**
 * Caltech Course Code Tooltip Extension - Content Script
 * 
 * This content script automatically detects Caltech course codes on web pages
 * and provides interactive tooltips with detailed course information. It supports
 * various course code formats including cross-listed courses, compound courses,
 * and shorthand notation.
 * 
 * Features:
 * - Hover tooltips for course information
 * - Click-to-pin functionality for persistent tooltips
 * - Multi-section course cycling
 * - Range course detection (e.g., "CS 120-122")
 * - Shorthand notation (e.g., "CS 15, 16, 17")
 * - Compound courses (e.g., "APh/EE 23/24")
 * - Real-time settings synchronization
 * - Accessibility support
 * 
 * @fileoverview Content script for the Caltech Course Code Tooltip Extension
 * @author Varun Rodrigues <vrodrigu@caltech.edu>
 * @version 2.1.0
 * @since 1.0.0
 * @copyright 2024 Varun Rodrigues
 * @license MIT
 */

'use strict';

/**
 * Main class for the Caltech Course Code Tooltip functionality
 * Handles course detection, tooltip management, and user interactions
 * @class CaltechCourseTooltip
 */
class CaltechCourseTooltip {

  /**
   * Initialize the tooltip extension with default configuration
   * Sets up state management, caching, and event handling
   * @constructor
   */
  constructor() {
    /**
     * Extension configuration with fallback to safe defaults
     * @type {Object}
     * @private
     */
    this.config = window.CaltechExtensionConfig || {
      DEFAULT_SETTINGS: {
        extensionEnabled: true,
        showName: true,
        showUnits: true,
        showTerms: true,
        showPrerequisites: true,
        showDescription: false,
        showInstructors: true
      },
      COURSE_CODE_PATTERN: /\b([A-Za-z][a-zA-Z]{1,4}(?:\/[A-Za-z][a-zA-Z]{1,4})*)\s*(\d{1,3}(?:\/\d{1,3})*)\s*([a-z]{0,3})(?=\s|$|[.,;!?()\[\]{}])/gi,
      TOOLTIP_CONFIG: {
        HOVER_DELAY: 300,
        HIDE_DELAY: 100,
        MAX_WIDTH: 450,
        Z_INDEX: 10000,
        FADE_DURATION: 200
      }
    };
    
    /**
     * Course catalog data cache
     * @type {Array<Object>}
     * @private
     */
    this.courses = [];
    
    /**
     * Tooltip DOM element
     * @type {HTMLElement|null}
     * @private
     */
    this.tooltip = null;
    
    /**
     * Hover delay timer
     * @type {number|null}
     * @private
     */
    this.hoverTimeout = null;
    
    /**
     * Hide delay timer
     * @type {number|null}
     * @private
     */
    this.hideTimeout = null;
    
    /**
     * Set of processed DOM nodes to prevent duplicate processing
     * @type {WeakSet<Node>}
     * @private
     */
    this.processedNodes = new WeakSet();
    
    /**
     * Current user settings
     * @type {Object}
     * @private
     */
    this.settings = { ...this.config.DEFAULT_SETTINGS };
    
    /**
     * Mutation observer for dynamic content
     * @type {MutationObserver|null}
     * @private
     */
    this.mutationObserver = null;
    
    // Tooltip state management properties
    
    /**
     * Currently pinned element (clicked to keep tooltip visible)
     * @type {HTMLElement|null}
     * @private
     */
    this.pinnedElement = null;
    
    /**
     * Currently hovered element
     * @type {HTMLElement|null}
     * @private
     */
    this.currentHoveredElement = null;
    
    /**
     * Whether a tooltip is currently pinned
     * @type {boolean}
     * @private
     */
    this.isPinned = false;
    
    // Section cycling state management
    
    /**
     * Map for tracking section cycling state per element
     * Maps element -> {sections: Array, currentIndex: number}
     * @type {Map<HTMLElement, Object>}
     * @private
     */
    this.sectionCycleState = new Map();
    
    // Performance tracking
    
    /**
     * Performance metrics for monitoring
     * @type {Object}
     * @private
     */
    this.performanceMetrics = {
      processedNodes: 0,
      tooltipsShown: 0,
      coursesMatched: 0,
      errors: 0,
      startTime: Date.now()
    };
    
    // Initialize the extension asynchronously
    this.init().catch(error => {
      console.error('🚨 Extension initialization failed:', error);
      this.performanceMetrics.errors++;
    });
  }

  /**
   * Initialize the extension with error handling and performance monitoring
   * Sets up course data loading, settings, and DOM processing
   * @async
   * @returns {Promise<void>}
   * @throws {Error} When initialization fails critically
   */
  async init() {
    console.log('🔧 Caltech Course Extension: Initializing...');
    
    try {
      // Validate Chrome extension environment
      if (!this.validateEnvironment()) {
        console.warn('⚠️ Chrome extension APIs not available. Initialization aborted.');
        return;
      }
      
      // Prevent multiple initializations on the same page
      if (this.checkExistingInitialization()) {
        console.log('⚠️ Extension already initialized, skipping...');
        return;
      }
      
      // Mark as initialized to prevent duplicate instances
      window.caltechExtensionInitialized = true;

      // Load extension data and settings in parallel for better performance
      const initPromises = [
        this.loadSettings(),
        this.loadCourseData()
      ];

      await Promise.all(initPromises);
      
      // Validate course data availability
      if (this.courses.length === 0) {
        console.warn('❌ No course data available. Extension functionality will be limited.');
        return;
      }
      
      console.log(`✅ Extension initialization complete. Loaded ${this.courses.length} courses.`);
      
      // Set up UI and event handling
      this.createTooltipElement();
      this.setupGlobalClickListener();
      this.setupMessageListener();
      
      // Begin content processing if extension is enabled
      if (this.settings.extensionEnabled) {
        console.log('🔍 Processing existing content and setting up observers...');
        await this.processExistingContent();
        this.setupMutationObserver();
      } else {
        console.log('⏸️ Extension is disabled in settings');
      }
      
      // Log successful initialization
      this.performanceMetrics.initTime = Date.now() - this.performanceMetrics.startTime;
      console.log(`🚀 Extension ready in ${this.performanceMetrics.initTime}ms`);
      
    } catch (error) {
      console.error('💥 Initialization failed:', error);
      this.performanceMetrics.errors++;
      throw new Error(`Extension initialization failed: ${error.message}`);
    }
  }

  /**
   * Validate that the extension is running in a proper Chrome extension environment
   * @returns {boolean} True if environment is valid
   * @private
   */
  validateEnvironment() {
    // Check if Chrome extension APIs are available
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      return false;
    }
    
    // Skip initialization in popup/extension pages
    if (window.location.protocol === 'chrome-extension:' && 
        window.location.href.includes('popup.html')) {
      return false;
    }

    return true;
  }

  /**
   * Check if extension has already been initialized on this page
   * @returns {boolean} True if already initialized
   * @private
   */
  checkExistingInitialization() {
    return window.caltechExtensionInitialized === true;
  }

  /**
   * Detect document type for specialized handling
   * @returns {Object} Document type information
   * @private
   */
  detectDocumentType() {
    const url = window.location.href;
    const isWordDoc = url.includes('.docx') || url.includes('.doc');
    const isPDF = url.includes('.pdf') || document.contentType === 'application/pdf';
    const isGoogleDoc = url.includes('docs.google.com');
    
    return {
      isWordDoc,
      isPDF,
      isGoogleDoc,
      type: isWordDoc ? 'Word Doc' : (isPDF ? 'PDF' : (isGoogleDoc ? 'Google Doc' : 'webpage'))
    };
  }

  /**
   * Load user settings from Chrome storage with error handling
   * @async
   * @returns {Promise<void>}
   * @private
   */
  async loadSettings() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        const storedSettings = await chrome.storage.sync.get(this.config.DEFAULT_SETTINGS);
        
        // Validate and merge settings
        this.settings = this.validateSettings(storedSettings);
        
        console.log('⚙️ Settings loaded successfully:', this.settings);
      } else {
        console.warn('⚠️ Chrome storage not available, using default settings');
        this.settings = { ...this.config.DEFAULT_SETTINGS };
      }
    } catch (error) {
      console.error('❌ Failed to load settings, using defaults:', error);
      this.settings = { ...this.config.DEFAULT_SETTINGS };
      this.performanceMetrics.errors++;
    }
  }

  /**
   * Validate settings object and ensure all required properties exist
   * @param {Object} settings - Settings object to validate
   * @returns {Object} Validated settings object
   * @private
   */
  validateSettings(settings) {
    const validatedSettings = { ...this.config.DEFAULT_SETTINGS };
    
    // Only override defaults with valid boolean values
    for (const [key, defaultValue] of Object.entries(this.config.DEFAULT_SETTINGS)) {
      if (key in settings && typeof settings[key] === typeof defaultValue) {
        validatedSettings[key] = settings[key];
      }
    }
    
    return validatedSettings;
  }

  /**
   * Load course catalog data with multiple fallback strategies
   * @async
   * @returns {Promise<void>}
   * @private
   */
  async loadCourseData() {
    try {
      // Primary method: Use chrome.runtime.getURL
      const catalogUrl = chrome.runtime.getURL('catalog.json');
      const response = await this.fetchWithTimeout(catalogUrl, 5000);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Validate catalog data structure
      if (!this.validateCatalogData(data)) {
        throw new Error('Invalid catalog format: expected array of course objects');
      }
      
      this.courses = data;
      console.log(`✅ Successfully loaded ${this.courses.length} courses from catalog`);
      
    } catch (fetchError) {
      console.warn('⚠️ Primary catalog fetch failed, trying background script fallback...');
      
      // Fallback method: Try via background script
      try {
        const backgroundResponse = await chrome.runtime.sendMessage({ 
          type: 'GET_CATALOG_DATA' 
        });
        
        if (backgroundResponse?.success && this.validateCatalogData(backgroundResponse.data)) {
          this.courses = backgroundResponse.data;
          console.log(`✅ Successfully loaded ${this.courses.length} courses via background script`);
        } else {
          throw new Error(backgroundResponse?.error || 'Background script returned invalid data');
        }
      } catch (backgroundError) {
        console.error('❌ All fallback methods failed to load course data:', backgroundError);
        this.courses = [];
        this.performanceMetrics.errors++;
      }
    }
  }

  /**
   * Fetch with timeout to prevent hanging requests
   * @param {string} url - URL to fetch
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Response>} Fetch response
   * @private
   */
  async fetchWithTimeout(url, timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Validate catalog data structure and content
   * @param {any} data - Data to validate
   * @returns {boolean} True if data is valid
   * @private
   */
  validateCatalogData(data) {
    if (!Array.isArray(data)) {
      return false;
    }
    
    // Check that at least some courses have required fields
    if (data.length === 0) {
      return false;
    }
    
    const sampleSize = Math.min(10, data.length);
    const validCourses = data.slice(0, sampleSize).filter(course => 
      course && 
      typeof course === 'object' &&
      typeof course.course_code_original === 'string' &&
      course.course_code_original.trim().length > 0
    );
    
    return validCourses.length > 0;
  }

  /**
   * Find course match using background script utilities with caching
   * @async
   * @param {string} courseText - Course code to search for
   * @returns {Promise<Object|null>} Course information or null if not found
   * @public
   */
  async findCourseMatch(courseText) {
    if (!courseText || typeof courseText !== 'string') {
      return null;
    }
    
    try {
      // Send request to background script for sophisticated matching
      const response = await chrome.runtime.sendMessage({
        type: 'FIND_COURSE',
        courseCode: courseText.trim()
      });
      
      if (response?.success && response.courseInfo) {
        this.performanceMetrics.coursesMatched++;
        return response.courseInfo;
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ Error finding course match:', error);
      this.performanceMetrics.errors++;
      return null;
    }
  }

  /**
   * Set up message listener for communication with popup and background script
   * Handles settings updates and course lookup requests
   * @private
   */
  setupMessageListener() {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        
        // Validate message structure
        if (!message || typeof message.type !== 'string') {
          sendResponse({ success: false, error: 'Invalid message format' });
          return false;
        }

        switch (message.type) {
          case 'SETTINGS_UPDATED':
            this.handleSettingsUpdate(message, sendResponse);
            return false; // Synchronous response
            
          case 'LOOKUP_COURSE':
            this.handleCourseLookup(message, sendResponse);
            return true; // Asynchronous response
            
          case 'GET_PERFORMANCE_METRICS':
            this.handlePerformanceMetricsRequest(sendResponse);
            return false; // Synchronous response
            
          default:
            console.warn('⚠️ Unknown message type:', message.type);
            sendResponse({ success: false, error: 'Unknown message type' });
            return false;
        }
      });
    }
  }

  /**
   * Handle settings update from popup
   * @param {Object} message - Message object containing new settings
   * @param {Function} sendResponse - Response callback
   * @private
   */
  handleSettingsUpdate(message, sendResponse) {
    try {
      if (!message.settings || typeof message.settings !== 'object') {
        throw new Error('Invalid settings object');
      }

      // Validate and update settings
      this.settings = this.validateSettings(message.settings);
      
      // Apply settings changes
      if (this.settings.extensionEnabled) {
        // Re-enable if it was disabled
        this.processExistingContent().then(() => {
          this.setupMutationObserver();
        }).catch(error => {
          console.error('❌ Error re-enabling extension:', error);
        });
      } else {
        // Disable by hiding tooltip and removing highlights
        this.hideTooltip();
        this.removeAllHighlights();
        
        // Disconnect mutation observer
        if (this.mutationObserver) {
          this.mutationObserver.disconnect();
          this.mutationObserver = null;
        }
      }
      
      console.log('⚙️ Settings updated successfully:', this.settings);
      sendResponse({ success: true });
      
    } catch (error) {
      console.error('❌ Error handling settings update:', error);
      this.performanceMetrics.errors++;
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * Handle course lookup request from popup
   * @param {Object} message - Message object containing course code
   * @param {Function} sendResponse - Response callback
   * @private
   */
  async handleCourseLookup(message, sendResponse) {
    try {
      if (!message.courseCode || typeof message.courseCode !== 'string') {
        throw new Error('Invalid course code provided');
      }
      
      const courseInfo = await this.findCourseMatch(message.courseCode);
      
      sendResponse({
        success: true,
        courseInfo: courseInfo,
        found: !!courseInfo
      });
      
    } catch (error) {
      console.error('❌ Error in course lookup:', error);
      this.performanceMetrics.errors++;
      sendResponse({ 
        success: false, 
        error: error.message 
      });
    }
  }

  /**
   * Handle performance metrics request
   * @param {Function} sendResponse - Response callback
   * @private
   */
  handlePerformanceMetricsRequest(sendResponse) {
    const currentTime = Date.now();
    const uptime = currentTime - this.performanceMetrics.startTime;
    
    sendResponse({
      success: true,
      metrics: {
        ...this.performanceMetrics,
        uptime,
        cacheSize: this.processedNodes ? 'WeakSet' : 0 // WeakSet doesn't have size property
      }
    });
  }

  /**
   * Remove all course code highlights from the document
   * Safely restores original text content and cleans up DOM
   * @private
   */
  removeAllHighlights() {
    try {
      const highlights = document.querySelectorAll('.caltech-course-highlight');
      
      if (highlights.length === 0) {
        return;
      }
      
      console.log(`🧹 Removing ${highlights.length} course highlights...`);
      
      highlights.forEach(highlight => {
        try {
          const parent = highlight.parentNode;
          
          if (!parent || !document.body.contains(highlight)) {
            return; // Skip if element is no longer in DOM
          }
          
          // Use stored original text if available, otherwise fall back to textContent
          const originalText = highlight.getAttribute('data-original-text') || highlight.textContent;
          
          // Create text node and replace highlight
          const textNode = document.createTextNode(originalText);
          parent.replaceChild(textNode, highlight);
          
          // Merge adjacent text nodes for cleaner DOM
          if (parent.normalize) {
            parent.normalize();
          }
          
        } catch (elementError) {
          console.warn('⚠️ Error removing individual highlight:', elementError);
        }
      });
      
      // Clear processed nodes cache since we've removed all highlights
      this.processedNodes = new WeakSet();
      
      console.log('✅ All course highlights removed successfully');
      
    } catch (error) {
      console.error('❌ Error removing highlights:', error);
      this.performanceMetrics.errors++;
    }
  }

  /**
   * Create and configure the tooltip DOM element
   * Sets up the tooltip with proper styling and accessibility attributes
   * @private
   */
  createTooltipElement() {
    console.log('🏗️ Creating tooltip element...');
    
    try {
      // Remove existing tooltip if present
      if (this.tooltip) {
        this.tooltip.remove();
        console.log('🗑️ Removed existing tooltip');
      }
      
      // Create new tooltip element
      this.tooltip = document.createElement('div');
      this.tooltip.className = 'caltech-tooltip';
      
      // Add accessibility attributes
      this.tooltip.setAttribute('role', 'tooltip');
      this.tooltip.setAttribute('aria-hidden', 'true');
      this.tooltip.setAttribute('aria-live', 'polite');
      
      // Set initial styling
      this.tooltip.style.position = 'absolute';
      this.tooltip.style.zIndex = this.config.TOOLTIP_CONFIG.Z_INDEX || '10000';
      this.tooltip.style.maxWidth = `${this.config.TOOLTIP_CONFIG.MAX_WIDTH || 450}px`;
      
      // Add to document
      document.body.appendChild(this.tooltip);
      
      console.log('✅ Tooltip element created and added to DOM');
      
    } catch (error) {
      console.error('❌ Error creating tooltip element:', error);
      this.performanceMetrics.errors++;
    }
  }

  /**
   * Set up global click listener for tooltip unpinning and accessibility
   * @private
   */
  setupGlobalClickListener() {
    console.log('🌐 Setting up global click listener...');
    
    try {
      document.addEventListener('click', (e) => {
        // Enhanced click handling with better event detection
        this.handleGlobalClick(e);
      }, { 
        passive: true,  // Performance optimization
        capture: false  // Don't interfere with normal event flow
      });
      
      // Add keyboard support for accessibility
      document.addEventListener('keydown', (e) => {
        this.handleGlobalKeyDown(e);
      }, { passive: false }); // Not passive because we might preventDefault
      
      console.log('✅ Global event listeners set up successfully');
      
    } catch (error) {
      console.error('❌ Error setting up global listeners:', error);
      this.performanceMetrics.errors++;
    }
  }

  /**
   * Handle global click events for tooltip management
   * @param {MouseEvent} e - Click event
   * @private
   */
  handleGlobalClick(e) {
    try {
      // Check if the clicked element is a course highlight
      if (e.target.classList && e.target.classList.contains('caltech-course-highlight')) {
        // This will be handled by the individual element's click listener
        return;
      }
      
      // Check if the clicked element is inside a pinned tooltip
      if (this.tooltip && this.tooltip.contains(e.target) && this.isPinned) {
        // Don't unpin if clicking inside a pinned tooltip
        return;
      }
      
      // Clicked outside - unpin any pinned tooltip
      if (this.isPinned) {
        console.log('🌐 Global click detected - unpinning tooltip');
        this.unpinTooltip();
      }
      
    } catch (error) {
      console.warn('⚠️ Error in global click handler:', error);
    }
  }

  /**
   * Handle global keyboard events for accessibility
   * @param {KeyboardEvent} e - Keyboard event
   * @private
   */
  handleGlobalKeyDown(e) {
    try {
      // ESC key unpins tooltip
      if (e.key === 'Escape' && this.isPinned) {
        e.preventDefault();
        console.log('⌨️ ESC key pressed - unpinning tooltip');
        this.unpinTooltip();
        return;
      }
      
      // Space or Enter on focused course highlight
      if ((e.key === ' ' || e.key === 'Enter') && 
          e.target.classList && 
          e.target.classList.contains('caltech-course-highlight')) {
        e.preventDefault();
        e.target.click(); // Trigger the click handler
        return;
      }
      
    } catch (error) {
      console.warn('⚠️ Error in global keyboard handler:', error);
    }
  }

  /**
   * Process all existing content on the page for course codes
   * @async
   * @returns {Promise<void>}
   * @private
   */
  async processExistingContent() {
    if (!this.settings.extensionEnabled) {
      return;
    }
    
    const startTime = Date.now();
    console.log('🔄 Processing existing page content...');
    
    try {
      // Remove existing highlights first to avoid conflicts
      this.removeAllHighlights();
      
      // Reset processed nodes tracking
      this.processedNodes = new WeakSet();
      
      // Create tree walker for efficient text node traversal
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (textNode) => this.shouldProcessTextNode(textNode)
        }
      );

      // Collect all text nodes first to avoid DOM modification during traversal
      const textNodes = [];
      let textNode;
      while (textNode = walker.nextNode()) {
        textNodes.push(textNode);
      }
      
      console.log(`📊 Found ${textNodes.length} text nodes to process`);
      
      // Process nodes in batches for better performance
      const batchSize = this.config.PERFORMANCE_CONFIG?.BATCH_SIZE || 50;
      let processedCount = 0;
      
      for (let i = 0; i < textNodes.length; i += batchSize) {
        const batch = textNodes.slice(i, i + batchSize);
        
        // Process batch with small delay to avoid blocking UI
        await this.processBatch(batch);
        processedCount += batch.length;
        
        // Yield control to browser between batches
        if (i + batchSize < textNodes.length) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }
      
      const processingTime = Date.now() - startTime;
      this.performanceMetrics.processedNodes = processedCount;
      
      console.log(`✅ Content processing complete. ${processedCount} nodes processed in ${processingTime}ms`);
      
    } catch (error) {
      console.error('❌ Error processing existing content:', error);
      this.performanceMetrics.errors++;
    }
  }

  /**
   * Determine if a text node should be processed for course codes
   * @param {Text} textNode - Text node to evaluate
   * @returns {number} NodeFilter constant
   * @private
   */
  shouldProcessTextNode(textNode) {
    // Skip empty text nodes
    if (!textNode.textContent.trim()) {
      return NodeFilter.FILTER_REJECT;
    }
    
    // Skip if parent element should be skipped
    if (this.shouldSkipElement(textNode.parentElement)) {
      return NodeFilter.FILTER_REJECT;
    }
    
    // Skip already processed nodes
    if (this.processedNodes.has(textNode)) {
      return NodeFilter.FILTER_REJECT;
    }
    
    return NodeFilter.FILTER_ACCEPT;
  }

  /**
   * Process a batch of text nodes
   * @param {Text[]} textNodes - Array of text nodes to process
   * @async
   * @returns {Promise<void>}
   * @private
   */
  async processBatch(textNodes) {
    for (const textNode of textNodes) {
      if (!this.processedNodes.has(textNode) && document.body.contains(textNode)) {
        try {
          await this.processTextNode(textNode);
          this.processedNodes.add(textNode);
        } catch (error) {
          console.warn('⚠️ Error processing text node:', error);
        }
      }
    }
  }

  async processElement(element) {
    // Process a specific element for course codes
    if (!element || this.processedNodes.has(element)) return;
    
    // Get all text nodes within this element
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (textNode) => {
          return textNode.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      }
    );
    
    let textNode;
    while (textNode = walker.nextNode()) {
      if (!this.processedNodes.has(textNode)) {
        await this.processTextNode(textNode);
        this.processedNodes.add(textNode);
      }
    }
    
    this.processedNodes.add(element);
  }

  setupMutationObserver() {
    if (!this.settings.extensionEnabled) return;
    
    // Clean up existing observer
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    
    this.mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach(async (node) => {
          if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
            await this.processNode(node);
          }
        });
      });
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  async processNode(node) {
    if (!this.settings.extensionEnabled) return;
    if (this.processedNodes.has(node)) {
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      await this.processTextNode(node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Skip processing certain elements
      if (this.shouldSkipElement(node)) {
        return;
      }
      
      // Process all text nodes within this element
      const walker = document.createTreeWalker(
        node,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (textNode) => {
            // Skip if parent is already processed or should be skipped
            if (this.shouldSkipElement(textNode.parentElement)) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      let textNode;
      let textNodeCount = 0;
      while (textNode = walker.nextNode()) {
        textNodeCount++;
        await this.processTextNode(textNode);
      }
    }

    this.processedNodes.add(node);
  }

  shouldSkipElement(element) {
    if (!element) return true;
    
    const skipTags = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT'];
    const skipClasses = ['caltech-tooltip', 'caltech-course-highlight'];
    
    // Check if element itself should be skipped
    if (skipTags.includes(element.tagName) ||
        skipClasses.some(cls => element.classList.contains(cls)) ||
        element.isContentEditable) {
      return true;
    }
    
    // Check if element is inside a tooltip by walking up the DOM tree
    let parent = element.parentElement;
    while (parent) {
      if (skipClasses.some(cls => parent.classList.contains(cls))) {
        return true;
      }
      parent = parent.parentElement;
    }
    
    return false;
  }

  // Detect course codes in text using the shared pattern
  async detectCourseInText(text) {
    console.log('🔍 Detecting courses in text:', text);
    const matches = [];
    
    // First detect range notation patterns like "EC 120-122"
    const rangeMatches = this.detectRangeCourses(text);
    if (rangeMatches.length > 0) {
      console.log('📊 Found range course patterns:', rangeMatches);
      matches.push(...rangeMatches);
    }
    
    // Then detect shorthand notation patterns like "Ge/Ay 132, 133, 137"
    const shorthandMatches = this.detectShorthandCourses(text);
    if (shorthandMatches.length > 0) {
      console.log('📝 Found shorthand course patterns:', shorthandMatches);
      matches.push(...shorthandMatches);
    }
    
    const pattern = new RegExp(this.config.COURSE_CODE_PATTERN.source, 'gi');
    let match;
    
    while ((match = pattern.exec(text)) !== null) {
      const [fullMatch, prefixes, numbers, letters = ''] = match;
      console.log('📋 Found course match:', {fullMatch, prefixes, numbers, letters, index: match.index});
      
      // Skip if this match overlaps with any shorthand matches we already found
      const matchStart = match.index;
      const matchEnd = match.index + fullMatch.length;
      const overlapsShorthand = shorthandMatches.some(shorthand => {
        return (matchStart < shorthand.index + shorthand.length && matchEnd > shorthand.index);
      });
      
      if (overlapsShorthand) {
        console.log('⏭️ Skipping match that overlaps with shorthand notation:', fullMatch);
        continue;
      }
      
      // Check if this is a compound course code (e.g., "APh/EE 23/24")
      if (numbers.includes('/')) {
        console.log('🔄 Expanding compound course code:', fullMatch);
        const expandedMatches = await this.expandCompoundCourseCode(match, prefixes, numbers, letters);
        console.log('📈 Expanded to:', expandedMatches);
        matches.push(...expandedMatches);
      } else {
        matches.push({
          fullMatch: fullMatch.trim(),
          index: match.index,
          length: fullMatch.length,
          prefixes,
          numbers,
          letters
        });
      }
    }
    
    console.log('✅ Total matches found:', matches);
    return matches;
  }

  // Detect shorthand course notation like "Ge/Ay 132, 133, 137" or "APh/EE 130, 131, and 132"
  detectShorthandCourses(text) {
    console.log('🔍 Detecting shorthand course patterns in:', text);
    const matches = [];
    
    // Pattern to match: Department(s) + first number + comma/and-separated additional numbers
    // e.g., "Ge/Ay 132, 133, 137" or "CS 15, 16, 17" or "APh/EE 23, 24" or "APh/EE 130, 131, and 132"
    const shorthandPattern = /\b([A-Za-z][a-zA-Z]{1,4}(?:\/[A-Za-z][a-zA-Z]{1,4})*)\s*(\d{1,3})([a-z]{0,3})\s*(?:,\s*(?:and\s+)?|,?\s+and\s+)(?:\d{1,3}[a-z]{0,3}\s*(?:,\s*(?:and\s+)?|,?\s+and\s+|$))+/gi;
    
    let match;
    while ((match = shorthandPattern.exec(text)) !== null) {
      const fullMatch = match[0];
      const prefixes = match[1];  // e.g., "Ge/Ay"
      const firstNumber = match[2];  // e.g., "132"
      const firstLetters = match[3] || '';  // e.g., "a" or ""
      
      console.log('📝 Found shorthand pattern:', {
        fullMatch,
        prefixes,
        firstNumber,
        firstLetters,
        index: match.index
      });
      
      // Extract all numbers from the pattern, but we need to carefully find their positions
      const numberPattern = /\d{1,3}([a-z]{0,3})/g;
      const allNumbers = [];
      let numberMatch;
      
      // Reset the regex to search within the full match
      numberPattern.lastIndex = 0;
      const tempText = fullMatch;
      while ((numberMatch = numberPattern.exec(tempText)) !== null) {
        allNumbers.push({
          text: numberMatch[0],
          indexInMatch: numberMatch.index,
          absoluteIndex: match.index + numberMatch.index
        });
      }
      
      console.log('🔢 All numbers found:', allNumbers.map(n => `${n.text} at ${n.absoluteIndex}`));
      
      // Create individual course matches for each number
      for (let i = 0; i < allNumbers.length; i++) {
        const numberInfo = allNumbers[i];
        const numberText = numberInfo.text; // e.g., "132" or "133a"
        const justNumber = numberText.match(/\d+/)[0];
        const letters = numberText.replace(/\d+/, '');
        
        let courseCode, displayText, highlightStart, highlightLength;
        
        if (i === 0) {
          // First number: show full course code and highlight from prefix start to number end
          courseCode = `${prefixes} ${numberText}`;
          displayText = `${prefixes} ${numberText}`;
          highlightStart = match.index; // Start from the prefix
          highlightLength = numberInfo.indexInMatch + numberText.length;
        } else {
          // Subsequent numbers: just highlight the number itself
          courseCode = `${prefixes} ${numberText}`;
          displayText = numberText;
          highlightStart = numberInfo.absoluteIndex;
          highlightLength = numberText.length;
        }
        
        console.log(`📋 Creating shorthand match ${i + 1}:`, {
          courseCode,
          displayText,
          highlightStart,
          highlightLength,
          originalText: text.slice(highlightStart, highlightStart + highlightLength)
        });
        
        matches.push({
          fullMatch: courseCode.trim(),
          index: highlightStart,
          length: highlightLength,
          prefixes,
          numbers: justNumber,
          letters,
          isShorthand: true,
          isFirstInShorthand: i === 0,
          shorthandDisplayText: displayText,
          originalText: text.slice(highlightStart, highlightStart + highlightLength),
          originalShorthandMatch: fullMatch
        });
      }
      
      // Mark this entire shorthand pattern as processed
      matches.shorthandSpan = {
        start: match.index,
        end: match.index + fullMatch.length
      };
    }
    
    console.log('✅ Shorthand matches found:', matches);
    return matches;
  }

  // Detect range course notation like "EC 120-122" 
  detectRangeCourses(text) {
    console.log('🔍 Detecting range course patterns in:', text);
    const matches = [];
    
    // Pattern to match: Department + start_number - end_number
    // e.g., "EC 120-122" or "CS 15-17" or "Math 1-3"
    const rangePattern = /\b([A-Za-z][a-zA-Z]{1,4}(?:\/[A-Za-z][a-zA-Z]{1,4})*)\s*(\d{1,3})\s*-\s*(\d{1,3})\b/gi;
    
    let match;
    while ((match = rangePattern.exec(text)) !== null) {
      const fullMatch = match[0];
      const department = match[1];  // e.g., "EC"
      const startNum = parseInt(match[2]);  // e.g., 120
      const endNum = parseInt(match[3]);    // e.g., 122
      
      console.log('📊 Found range pattern:', {
        fullMatch,
        department,
        startNum,
        endNum,
        index: match.index
      });
      
      // Validate range (start should be less than end, reasonable range size)
      if (startNum >= endNum || (endNum - startNum) > 20) {
        console.log('❌ Invalid range - skipping');
        continue;
      }
      
      // Generate all course codes in the range
      const rangeCourses = [];
      for (let num = startNum; num <= endNum; num++) {
        rangeCourses.push(`${department} ${num}`);
      }
      
      console.log('📋 Generated range courses:', rangeCourses);
      
      // Store this as a range match that will be processed later
      matches.push({
        fullMatch: fullMatch,
        index: match.index,
        length: fullMatch.length,
        department,
        startNum,
        endNum,
        rangeCourses,
        isRange: true,
        originalRangeMatch: fullMatch
      });
    }
    
    console.log('✅ Range matches found:', matches);
    return matches;
  }

  // Find individual section courses for a course with multiple sections
  // e.g., for "Ec 121 ab", find ["Ec 121 a", "Ec 121 b"]
  async findSectionCourses(courseCode) {
    console.log('🔍 Finding section courses for:', courseCode);
    
    // Parse the course code to extract department, number, and letters
    const match = courseCode.match(/^([A-Za-z][a-zA-Z]{0,4}(?:\/[A-Za-z][a-zA-Z]{0,4})*)\s+(\d{1,3})\s*([a-z]+)?$/i);
    if (!match) {
      console.log('❌ Could not parse course code:', courseCode);
      return [];
    }
    
    const [, department, number, letters] = match;
    console.log('📋 Parsed course code:', {department, number, letters});
    
    // If no letters or only one letter, no sections to cycle through
    if (!letters || letters.length <= 1) {
      console.log('⏭️ No multiple sections found');
      return [];
    }
    
    // Look for individual section courses
    const sectionCourses = [];
    for (const letter of letters) {
      const sectionCode = `${department} ${number} ${letter}`;
      console.log('🔍 Looking for section course:', sectionCode);
      
      const course = await this.findCourseMatch(sectionCode);
      if (course) {
        console.log('✅ Found section course:', sectionCode);
        sectionCourses.push({
          code: sectionCode,
          data: course,
          letter: letter
        });
      } else {
        console.log('❌ Section course not found:', sectionCode);
      }
    }
    
    console.log(`📊 Found ${sectionCourses.length} section courses:`, sectionCourses.map(s => s.code));
    return sectionCourses;
  }

  // Expand compound course codes like "APh/EE 23/24" into separate courses
  // But NOT for single courses with multiple numbers like "CS/MA 6/106"
  async expandCompoundCourseCode(originalMatch, prefixes, numbers, letters) {
    console.log('🚀 expandCompoundCourseCode called with:', {prefixes, numbers, letters});
    const expandedMatches = [];
    const [fullMatch] = originalMatch;
    const baseIndex = originalMatch.index;
    
    // Split the numbers (e.g., "23/24" -> ["23", "24"])
    const numberParts = numbers.split('/');
    console.log('🔢 Number parts:', numberParts);
    
    if (numberParts.length <= 1) {
      console.log('⚠️ Not compound, returning single match');
      // Not actually compound, return as single match
      return [{
        fullMatch: fullMatch.trim(),
        index: baseIndex,
        length: fullMatch.length,
        prefixes,
        numbers,
        letters
      }];
    }
    
    // Check the catalog to determine if this should be treated as:
    // 1. A single cross-listed course (e.g., "ACM 95/100 ab")
    // 2. Multiple separate courses (e.g., "APh/EE 23/24")
    
    console.log('🔍 Checking catalog for compound course pattern...');
    
    // First, check if the full compound course exists as a single course
    const fullCourseCode = `${prefixes} ${numbers}${letters}`.trim();
    console.log('🎯 Checking for full compound course:', fullCourseCode);
    const fullCourseMatch = await this.findCourseMatch(fullCourseCode);
    
    if (fullCourseMatch) {
      console.log('✅ Found full compound course in catalog - treating as single course');
      // Exists as single course, don't expand
      return [{
        fullMatch: fullMatch.trim(),
        index: baseIndex,
        length: fullMatch.length,
        prefixes,
        numbers,
        letters
      }];
    }
    
    // Check if individual courses exist
    console.log('🔍 Checking for individual courses...');
    const individualCourses = [];
    let allIndividualExist = true;
    
    for (const numberPart of numberParts) {
      const individualCourseCode = `${prefixes} ${numberPart}${letters}`.trim();
      console.log('🎯 Checking for individual course:', individualCourseCode);
      const individualMatch = await this.findCourseMatch(individualCourseCode);
      
      if (individualMatch) {
        console.log('✅ Found individual course:', individualCourseCode);
        individualCourses.push({
          courseCode: individualCourseCode,
          numberPart: numberPart,
          course: individualMatch
        });
      } else {
        console.log('❌ Individual course not found:', individualCourseCode);
        allIndividualExist = false;
      }
    }
    
    if (allIndividualExist && individualCourses.length > 1) {
      console.log('🔄 All individual courses exist - expanding to separate courses');
      
      // First part: "APh/EE 23" - includes the full prefix and first number
      const firstCourse = `${prefixes} ${numberParts[0]}${letters}`;
      
      // Find the end of the first number (before the slash that separates numbers)
      const firstNumberPattern = new RegExp(`\\b${prefixes.replace(/\//g, '\\/')}\\s*${numberParts[0]}${letters}`);
      const firstNumberMatch = fullMatch.match(firstNumberPattern);
      let firstPartEnd;
      
      if (firstNumberMatch) {
        firstPartEnd = firstNumberMatch[0].length;
      } else {
        // Fallback: find position after first number + letters
        const afterFirstNumber = fullMatch.indexOf(`${numberParts[0]}${letters}`) + `${numberParts[0]}${letters}`.length;
        firstPartEnd = afterFirstNumber;
      }
      
      console.log('🎯 First part details:', {
        firstCourse,
        firstPartEnd,
        fullMatch,
        extractedText: fullMatch.substring(0, firstPartEnd)
      });
      
      expandedMatches.push({
        fullMatch: firstCourse.trim(),
        index: baseIndex,
        length: firstPartEnd,
        prefixes,
        numbers: numberParts[0],
        letters,
        isExpanded: true,
        originalMatch: fullMatch
      });
      
      // Additional parts: "/24" but representing "APh/EE 24"
      for (let i = 1; i < numberParts.length; i++) {
        const currentNumber = numberParts[i];
        const courseCode = `${prefixes} ${currentNumber}${letters}`;
        
        // Find the start of this number part in the original string
        let searchPattern = `/${currentNumber}`;
        let startPos = fullMatch.indexOf(searchPattern, fullMatch.indexOf(`/${numberParts[i-1]}`));
        
        if (startPos !== -1) {
          expandedMatches.push({
            fullMatch: courseCode.trim(),
            index: baseIndex + startPos,
            length: searchPattern.length + letters.length,
            prefixes,
            numbers: currentNumber,
            letters,
            isExpanded: true,
            originalMatch: fullMatch,
            displayText: `/${currentNumber}${letters}` // What actually shows in the text
          });
        }
      }
      
      console.log('🎉 Final expanded matches:', expandedMatches);
      return expandedMatches;
    } else {
      console.log('⚠️ Not all individual courses exist - treating as single course');
      // Not all individual courses exist, treat as single course
      return [{
        fullMatch: fullMatch.trim(),
        index: baseIndex,
        length: fullMatch.length,
        prefixes,
        numbers,
        letters
      }];
    }
  }

  async processTextNode(textNode) {
    if (!this.settings.extensionEnabled) return;
    if (!textNode.textContent.trim()) return;

    // Safety checks
    const parentNode = textNode.parentNode;
    if (!parentNode || !document.body.contains(textNode)) {
      return;
    }

    const text = textNode.textContent;
    
    // Use the simple course detection function
    const allMatches = await this.detectCourseInText(text);
    
    if (allMatches.length === 0) return;

    // Check if any matches correspond to actual courses in our catalog
    const validMatches = [];
    for (const match of allMatches) {
      if (match.isRange) {
        // For range courses, check if any course in the range exists
        const validRangeCourses = [];
        
        for (const courseCode of match.rangeCourses) {
          const course = await this.findCourseMatch(courseCode);
          if (course !== null) {
            validRangeCourses.push({ courseCode, course });
          } else {
            // Also check for section-based courses (e.g., "EC 121 ab")
            const sectionCourses = await this.findSectionCourses(courseCode);
            if (sectionCourses.length > 0) {
              // Use the first section as the representative course
              validRangeCourses.push({ 
                courseCode: courseCode + ' (multi-section)', 
                course: sectionCourses[0].data,
                hasSections: true,
                sectionCourses: sectionCourses
              });
            }
          }
        }
        
        if (validRangeCourses.length > 0) {
          // Create a range match with the first valid course as primary
          const primaryCourse = validRangeCourses[0];
          match.validRangeCourses = validRangeCourses;
          match.currentRangeIndex = 0;
          validMatches.push({ 
            match, 
            course: primaryCourse.course,
            isRangeMatch: true
          });
        }
      } else {
        const course = await this.findCourseMatch(match.fullMatch);
        if (course !== null) {
          validMatches.push({ match, course });
        }
      }
    }

    if (validMatches.length === 0) return;

    // Sort matches by index to process them in order
    validMatches.sort((a, b) => a.match.index - b.match.index);

    // Replace text with highlighted spans
    const parent = textNode.parentNode;
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;

    validMatches.forEach(({ match, course }) => {
      const matchedText = match.fullMatch;
      
      console.log('Creating highlight for:', matchedText, '-> course:', course.course_code_original);
      
      // Add text before the match (only if we haven't already covered this area)
      if (match.index > lastIndex) {
        fragment.appendChild(
          document.createTextNode(text.slice(lastIndex, match.index))
        );
      }

      // Create highlighted span for the course code
      const span = document.createElement('span');
      span.className = 'caltech-course-highlight';
      
      // Handle different types of course matches
      let displayText, originalText;
      if (match.isRange) {
        // For range notation, show the range text and set up cycling data
        displayText = match.originalRangeMatch;
        originalText = text.slice(match.index, match.index + match.length);
        
        // Add range-specific data attributes
        span.setAttribute('data-range-courses', JSON.stringify(match.validRangeCourses));
        span.setAttribute('data-range-index', '0');
        span.setAttribute('data-is-range', 'true');
      } else if (match.isShorthand) {
        // For shorthand notation, use the shorthandDisplayText
        displayText = match.shorthandDisplayText;
        originalText = match.originalText || text.slice(match.index, match.index + match.length);
      } else if (match.displayText) {
        // For compound course parts like "/24"
        displayText = match.displayText;
        originalText = text.slice(match.index, match.index + match.length);
      } else {
        // Default: use the actual text from the original string
        displayText = text.slice(match.index, match.index + match.length);
        originalText = displayText;
      }
      
      span.textContent = displayText;
      
      span.setAttribute('data-course-code', matchedText);
      span.setAttribute('data-course-data', JSON.stringify(course));
      span.setAttribute('data-original-text', originalText); // Store original text for proper restoration
      
      if (match.isRange) {
        // Range elements get only the range click listener, not regular hover listeners
        this.addRangeClickListener(span);
        // Add just the hover behavior without the click behavior
        this.addRangeHoverListeners(span);
      } else {
        // Regular elements get normal hover and click listeners
        this.addHoverListeners(span);
      }
      fragment.appendChild(span);

      // Update lastIndex, but handle overlapping compound matches
      const newLastIndex = match.index + match.length;
      if (newLastIndex > lastIndex) {
        lastIndex = newLastIndex;
      }
    });

    // Add remaining text
    if (lastIndex < text.length) {
      fragment.appendChild(
        document.createTextNode(text.slice(lastIndex))
      );
    }

    // Safe DOM replacement
    try {
      if (parent && textNode.parentNode === parent && document.body.contains(textNode)) {
        parent.replaceChild(fragment, textNode);
        console.log('✅ Successfully highlighted course code');
      } else {
        console.log('⚠️ Cannot highlight - DOM structure changed', {
          hasParent: !!parent,
          nodeInParent: textNode.parentNode === parent,
          nodeInDocument: document.body.contains(textNode)
        });
      }
    } catch (error) {
      console.log('⚠️ Error highlighting:', error);
    }
  }

  addHoverListeners(element) {
    console.log('👂 Adding hover and click listeners to element:');
    
    // Click event for pinning/unpinning tooltip and section cycling
    element.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('🖱️ Element clicked:');
      
      if (this.pinnedElement === e.target) {
        // Clicking the same pinned element - check for section cycling
        console.log('🔄 Checking for section cycling...');
        
        const courseCode = e.target.getAttribute('data-course-code');
        let cycleState = this.sectionCycleState.get(e.target);
        
        if (!cycleState) {
          // First time clicking - check if this course has multiple sections
          console.log('🔍 First click - checking for sections');
          const sections = await this.findSectionCourses(courseCode);
          
          if (sections.length > 1) {
            // Initialize cycling state
            cycleState = {
              sections: sections,
              currentIndex: 0 // Start with first section
            };
            this.sectionCycleState.set(e.target, cycleState);
            
            console.log(`🔄 Initialized section cycling with ${sections.length} sections`);
            // Show first section
            this.showSectionTooltip(e.target, sections[0]);
            return;
          } else {
            // No sections to cycle through - unpin
            console.log('📌 No sections found - unpinning tooltip');
            this.unpinTooltip();
            return;
          }
        }
        
        // We have cycling state - advance to next section
        cycleState.currentIndex++;
        
        if (cycleState.currentIndex >= cycleState.sections.length) {
          // Reached the end - unpin and clear cycle state
          console.log('🔄 Reached end of sections - unpinning tooltip');
          this.sectionCycleState.delete(e.target);
          this.unpinTooltip();
        } else {
          // Show next section
          const currentSection = cycleState.sections[cycleState.currentIndex];
          console.log(`🔄 Cycling to section ${cycleState.currentIndex + 1}/${cycleState.sections.length}: ${currentSection.code}`);
          this.showSectionTooltip(e.target, currentSection);
        }
      } else {
        // Clicking a different element - clear any existing cycle state and pin this one
        console.log('📌 Pinning tooltip to new element');
        this.sectionCycleState.clear(); // Clear all cycle states
        this.pinTooltip(e.target);
      }
    });
    
    // Hover events
    element.addEventListener('mouseenter', (e) => {
      console.log('🖱️ Mouse entered element:');
      this.currentHoveredElement = e.target;
      this.clearTimeouts();
      
      if (!this.isPinned || this.pinnedElement !== e.target) {
        this.hoverTimeout = setTimeout(() => {
          console.log('⏰ Hover delay elapsed, showing tooltip');
          this.showHoverTooltip(e.target);
        }, this.config.TOOLTIP_CONFIG.HOVER_DELAY);
      }
    });

    element.addEventListener('mouseleave', (e) => {
      console.log('🖱️ Mouse left element:');
      this.currentHoveredElement = null;
      this.clearTimeouts();
      
      this.hideTimeout = setTimeout(() => {
        console.log('⏰ Hide delay elapsed, checking tooltip state');
        this.handleMouseLeave(e.target);
      }, this.config.TOOLTIP_CONFIG.HIDE_DELAY);
    });
  }

  addRangeClickListener(element) {
    console.log('🎯 Adding range click listener to element:');
    console.log('🎯 Range courses data:', element.getAttribute('data-range-courses'));
    
    let lastClickTime = 0;
    
    element.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Prevent rapid successive clicks (debounce)
      const now = Date.now();
      if (now - lastClickTime < 150) {
        console.log('🚫 Ignoring rapid successive click (debounced)');
        return;
      }
      lastClickTime = now;
      
      console.log('🖱️ Range element clicked:');
      console.log('🖱️ Current pinned element:');
      console.log('🖱️ Is this element pinned?', this.pinnedElement === e.target);
      
      // Debug: show current range index before processing
      const currentRangeIndex = e.target.getAttribute('data-range-index');
      console.log('🔍 Current range index at start of click:', currentRangeIndex);
      
      if (this.pinnedElement === e.target) {
        // Clicking the same pinned range element - cycle to next course
        console.log('🔄 Range element already pinned - cycling...');
        
        const rangeCourses = JSON.parse(e.target.getAttribute('data-range-courses'));
        let currentIndex = parseInt(e.target.getAttribute('data-range-index'));
        
        console.log('📋 Current range courses:', rangeCourses);
        console.log('📍 BEFORE increment - Current index:', currentIndex);
        console.log('📍 BEFORE increment - Element attribute:', e.target.getAttribute('data-range-index'));
        
        // Move to next course in range
        currentIndex++;
        console.log('📍 AFTER increment - New index:', currentIndex);
        
        // Update the element attribute BEFORE checking bounds
        e.target.setAttribute('data-range-index', currentIndex.toString());
        console.log('� AFTER setting attribute - Element attribute:', e.target.getAttribute('data-range-index'));
        
        console.log('�📊 Range length:', rangeCourses.length);
        
        if (currentIndex >= rangeCourses.length) {
          // Reached the end - unpin and reset
          console.log('🔄 Reached end of range - unpinning tooltip');
          e.target.setAttribute('data-range-index', '0');
          console.log('📍 RESET - Element attribute after reset:', e.target.getAttribute('data-range-index'));
          this.unpinTooltip();
          return;
        }
        
        // Show next course
        const nextCourse = rangeCourses[currentIndex];
        console.log(`🔄 Showing range course ${currentIndex + 1}/${rangeCourses.length}:`, nextCourse.courseCode);
        
        if (nextCourse.hasSections) {
          // Start with first section of multi-section course
          e.target.setAttribute('data-section-index', '0');
          const firstSection = nextCourse.sectionCourses[0];
          this.showRangeTooltip(e.target, {
            courseCode: firstSection.code,
            course: firstSection.data
          });
        } else {
          // Regular single course
          this.showRangeTooltip(e.target, nextCourse);
        }
      } else {
        // First click - pin and show first course
        console.log('📌 Pinning range tooltip - first click');
        
        const rangeCourses = JSON.parse(e.target.getAttribute('data-range-courses'));
        const firstCourse = rangeCourses[0];
        
        // Explicitly set the range index to 0 for first click
        console.log('📍 FIRST CLICK - Before setting index, current attribute:', e.target.getAttribute('data-range-index'));
        e.target.setAttribute('data-range-index', '0');
        console.log('� FIRST CLICK - After setting index to 0, attribute:', e.target.getAttribute('data-range-index'));
        
        this.pinTooltip(e.target);
        
        console.log('📌 First course in range:', firstCourse);
        
        if (firstCourse.hasSections) {
          // Start with first section of multi-section course
          e.target.setAttribute('data-section-index', '0');
          const firstSection = firstCourse.sectionCourses[0];
          console.log('📌 Showing first range course (section 1):', firstSection.code);
          this.showRangeTooltip(e.target, {
            courseCode: firstSection.code,
            course: firstSection.data
          });
        } else {
          // Regular single course
          console.log('📌 Showing first range course:', firstCourse.courseCode);
          this.showRangeTooltip(e.target, firstCourse);
        }
        
        console.log('📍 FIRST CLICK - At end of first click, final attribute:', e.target.getAttribute('data-range-index'));
      }
    });
  }

  addRangeHoverListeners(element) {
    console.log('👂 Adding hover listeners (no click) to range element:');
    
    // Mouse enter event
    element.addEventListener('mouseenter', (e) => {
      console.log('🖱️ Mouse entered range element:');
      this.currentHoveredElement = e.target;
      this.clearTimeouts();
      
      if (!this.isPinned || this.pinnedElement !== e.target) {
        this.hoverTimeout = setTimeout(() => {
          console.log('⏰ Hover delay elapsed, showing tooltip');
          this.showHoverTooltip(e.target);
        }, this.config.TOOLTIP_CONFIG.HOVER_DELAY);
      }
    });

    // Mouse leave event
    element.addEventListener('mouseleave', (e) => {
      console.log('🖱️ Mouse left range element:');
      
      this.clearTimeouts();
      
      this.hideTimeout = setTimeout(() => {
        console.log('⏰ Hide delay elapsed, checking tooltip state');
        this.handleMouseLeave(e.target);
      }, this.config.TOOLTIP_CONFIG.HIDE_DELAY);
    });
  }

  clearTimeouts() {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }

  showTooltip(element, isPinned = false) {
    console.log('🎯 showTooltip called for element:', 'pinned:', isPinned);
    if (!this.settings.extensionEnabled) {
      console.log('❌ Extension disabled, not showing tooltip');
      return;
    }
    
    const courseDataStr = element.getAttribute('data-course-data');
    if (!courseDataStr) {
      console.log('❌ No course data found on element');
      return;
    }
    
    console.log('📊 Course data found:');
    const course = JSON.parse(courseDataStr);
    
    // Get display code - use original format if available, otherwise construct from course_code object
    let displayCode;
    if (course.course_code_original) {
      displayCode = course.course_code_original;
    } else if (course.course_code && typeof course.course_code === 'object') {
      // Construct from the structured format
      const prefixes = course.course_code.prefixes.join('/');
      const numbers = course.course_code.numbers.join('/');
      const letters = course.course_code.letters.join('');
      displayCode = prefixes + ' ' + numbers + (letters ? ' ' + letters : '');
    } else {
      displayCode = 'UNKNOWN';
    }
    
    // Build tooltip content based on settings using new CSS classes
    let content = '';
    
    // Course code (always shown)
    content += `<div class="course-code">${displayCode}</div>`;
    
    // Course name/title
    if (this.settings.showName && course.name) {
      content += `<div class="course-title">${course.name}</div>`;
    }
    
    // Course meta information (units and terms)
    const metaInfo = [];
    if (this.settings.showUnits && course.units) {
      metaInfo.push(`Units: ${course.units}`);
    }
    if (this.settings.showTerms && course.terms) {
      metaInfo.push(`Terms: ${course.terms}`);
    }
    
    if (metaInfo.length > 0) {
      content += `<div class="course-meta">${metaInfo.join(' | ')}</div>`;
    }
    
    // Prerequisites
    if (this.settings.showPrerequisites && course.prerequisites) {
      content += `<div class="prerequisites">Prerequisites: ${course.prerequisites}</div>`;
    }
    
    // Description
    if (this.settings.showDescription && course.description) {
      content += `<div class="description">${course.description}</div>`;
    }
    
    // Instructors
    if (this.settings.showInstructors && course.instructors) {
      content += `<div class="instructors"><strong>Instructors:</strong> ${course.instructors}</div>`;
    }
    
    this.tooltip.innerHTML = content;
    this.tooltip.classList.add('visible');
    
    if (isPinned) {
      this.tooltip.classList.add('pinned');
      console.log('✅ Tooltip content set with visible and pinned classes added');
    } else {
      this.tooltip.classList.remove('pinned');
      console.log('✅ Tooltip content set with visible class added (not pinned)');
    }
    
    // Position tooltip once based on element position (not mouse position)
    const rect = element.getBoundingClientRect();
    this.positionTooltipFixed(rect);
    console.log('📍 Tooltip positioned at:', rect);
  }

  positionTooltipFixed(elementRect) {
    const tooltipRect = this.tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Center horizontally on the element
    let left = elementRect.left + elementRect.width / 2 - tooltipRect.width / 2;
    // Position above the element
    let top = elementRect.top - tooltipRect.height - 10;
    let isAbove = true;

    // Adjust horizontal position to stay within viewport
    if (left < 10) {
      left = 10;
    } else if (left + tooltipRect.width > viewportWidth - 10) {
      left = viewportWidth - tooltipRect.width - 10;
    }

    // Adjust vertical position if tooltip would go above viewport
    if (top < 10) {
      top = elementRect.bottom + 10; // Show below element instead
      isAbove = false;
    }

    // Update arrow direction based on position
    this.tooltip.classList.remove('above', 'below');
    this.tooltip.classList.add(isAbove ? 'above' : 'below');

    this.tooltip.style.left = `${left + window.scrollX}px`;
    this.tooltip.style.top = `${top + window.scrollY}px`;
  }

  positionTooltip(mouseEvent) {
    const tooltipRect = this.tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let left = mouseEvent.clientX - tooltipRect.width / 2;
    let top = mouseEvent.clientY - tooltipRect.height - 10;

    // Adjust horizontal position to stay within viewport
    if (left < 10) {
      left = 10;
    } else if (left + tooltipRect.width > viewportWidth - 10) {
      left = viewportWidth - tooltipRect.width - 10;
    }

    // Adjust vertical position if tooltip would go above viewport
    if (top < 10) {
      top = mouseEvent.clientY + 20; // Show below cursor instead
    }

    this.tooltip.style.left = `${left + window.scrollX}px`;
    this.tooltip.style.top = `${top + window.scrollY}px`;
  }

  hideTooltip() {
    this.tooltip.classList.remove('visible');
    this.tooltip.classList.remove('pinned');
  }

  showHoverTooltip(element) {
    console.log('🎯 showHoverTooltip called for element:');
    this.showTooltip(element, false); // false means not pinned
  }

  pinTooltip(element) {
    console.log('📌 Pinning tooltip to element:');
    
    // Safety check: ensure element still exists in DOM
    if (!element || !document.body.contains(element)) {
      console.log('⚠️ Element no longer in DOM, cannot pin tooltip');
      return;
    }
    
    this.clearTimeouts();
    this.pinnedElement = element;
    this.isPinned = true;
    this.showTooltip(element, true); // true means pinned
  }

  showSectionTooltip(element, sectionData) {
    console.log('🔄 Showing section tooltip:', sectionData.code);
    
    // Safety check: ensure element still exists in DOM
    if (!element || !document.body.contains(element)) {
      console.log('⚠️ Element no longer in DOM, cannot show section tooltip');
      return;
    }
    
    this.clearTimeouts();
    this.pinnedElement = element;
    this.isPinned = true;
    
    // Temporarily update the element's data attribute with the section data
    element.setAttribute('data-course-data', JSON.stringify(sectionData.data));
    
    this.showTooltip(element, true); // true means pinned
  }

  showRangeTooltip(element, rangeData) {
    console.log('🎯 Showing range tooltip:', rangeData.courseCode);
    console.log('🎯 Range data:', rangeData);
    
    // Safety check: ensure element still exists in DOM
    if (!element || !document.body.contains(element)) {
      console.log('⚠️ Element no longer in DOM, cannot show range tooltip');
      return;
    }
    
    this.clearTimeouts();
    this.pinnedElement = element;
    this.isPinned = true;
    
    // Temporarily update the element's data attributes with the current range course
    element.setAttribute('data-course-data', JSON.stringify(rangeData.course));
    element.setAttribute('data-course-code', rangeData.courseCode);
    
    console.log('🎯 Updated element attributes for range tooltip');
    
    this.showTooltip(element, true); // true means pinned
  }

  unpinTooltip() {
    console.log('📌 Unpinning tooltip');
    
    // Clear section cycle state for the unpinned element
    if (this.pinnedElement) {
      this.sectionCycleState.delete(this.pinnedElement);
      
      // For range elements, restore the original range data and reset index
      if (this.pinnedElement.getAttribute('data-is-range') === 'true') {
        console.log('🎯 Restoring range element to original state');
        this.pinnedElement.setAttribute('data-range-index', '0');
        this.pinnedElement.removeAttribute('data-section-index');
        
        // Restore original course data (first course in range)
        const rangeCourses = JSON.parse(this.pinnedElement.getAttribute('data-range-courses'));
        if (rangeCourses && rangeCourses.length > 0) {
          const firstCourse = rangeCourses[0];
          this.pinnedElement.setAttribute('data-course-data', JSON.stringify(firstCourse.course));
          this.pinnedElement.setAttribute('data-course-code', firstCourse.courseCode);
        }
      } else {
        // Restore original course data for regular elements if it was changed for section cycling
        const elementToRestore = this.pinnedElement; // Store reference before setting to null
        const originalCourseCode = elementToRestore.getAttribute('data-course-code');
        if (originalCourseCode) {
          this.findCourseMatch(originalCourseCode).then(course => {
            if (course && elementToRestore && document.body.contains(elementToRestore)) {
              elementToRestore.setAttribute('data-course-data', JSON.stringify(course));
            }
          }).catch(error => {
            console.log('⚠️ Error restoring course data:', error);
          });
        }
      }
    }
    
    this.pinnedElement = null;
    this.isPinned = false;
    this.hideTooltip();
  }

  handleMouseLeave(element) {
    console.log('🚪 Handling mouse leave for element:');
    
    if (this.isPinned && this.pinnedElement === element) {
      // Don't hide if this is the pinned element
      console.log('📌 Not hiding - element is pinned');
      return;
    }
    
    if (this.isPinned && this.pinnedElement !== element) {
      // Hide hover tooltip and show pinned tooltip
      console.log('📌 Hiding hover tooltip, showing pinned tooltip');
      this.showTooltip(this.pinnedElement, true);
    } else {
      // No pinned tooltip, just hide
      console.log('❌ Hiding tooltip completely');
      this.hideTooltip();
    }
  }

}

// Initialize the extension
(() => {
  const init = () => {
    window.caltechTooltipExtension = new CaltechCourseTooltip();
    return window.caltechTooltipExtension;
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Expose global function for debugging
  window.reprocessCaltechCourses = () => {
    if (window.caltechTooltipExtension) {
      window.caltechTooltipExtension.processExistingContent();
      console.log('🔄 Reprocessing courses...');
    }
  };
})();
