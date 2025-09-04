# Caltech Course Tooltip Extension - Documentation

## Overview

The Caltech Course Tooltip Extension is a Chrome browser extension that automatically detects Caltech course codes on web pages and displays interactive tooltips with detailed course information. It supports various course code formats and provides a seamless experience for students, faculty, and staff navigating academic content.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [File Structure](#file-structure)
3. [Core Components](#core-components)
4. [Course Detection System](#course-detection-system)
5. [Configuration](#configuration)
6. [API Reference](#api-reference)
7. [Development Guidelines](#development-guidelines)
8. [Troubleshooting](#troubleshooting)

## Architecture Overview

The extension follows a standard Chrome Extension Manifest V3 architecture with the following components:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Background    │    │   Content       │    │     Popup       │
│   Service       │◄──►│   Script        │    │   Interface     │
│   Worker        │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Course Data   │    │   DOM           │    │   Settings      │
│   Processing    │    │   Manipulation  │    │   Management    │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Design Principles

- **Modular Architecture**: Separated concerns between content detection, data processing, and UI
- **Performance Optimized**: Efficient DOM traversal and minimal memory usage
- **User Privacy**: No external data transmission, all processing done locally
- **Accessibility**: Full keyboard navigation and screen reader support

## File Structure

```
caltech-course-tooltip/
├── manifest.json                 # Extension configuration
├── background.js                 # Service worker for data processing
├── content.js                    # Main course detection and tooltip logic
├── config.js                     # Global configuration constants
├── popup.html                    # Settings interface HTML
├── popup.js                      # Settings interface logic
├── popup.css                     # Settings interface styling
├── styles.css                    # Tooltip and highlight styling
├── catalog.json                  # Course database (5000+ courses)
├── images/                      # Extension images
│   ├── caltech-icon.png         # Main extension icon
│   └── icon-*.png               # Various UI icons
├── catalog_processor.py         # Course data processing script
├── README.md                    # User documentation
└── documentation.md             # This file
```

## Core Components

### 1. Background Service Worker (`background.js`)

The background script handles:
- Course data loading and caching
- Message passing between content script and popup
- Course matching algorithms
- Performance monitoring

**Key Functions:**
- `loadCourseData()` - Loads and validates course catalog
- `findCourseMatch()` - Intelligent course code matching
- `handleMessage()` - Inter-script communication

### 2. Content Script (`content.js`)

The content script is responsible for:
- DOM monitoring and course code detection
- Tooltip creation and positioning
- User interaction handling
- Real-time content processing

**Key Classes:**
- `CaltechCourseTooltip` - Main extension class
- Course detection methods
- Tooltip management system
- Event handling system

### 3. Configuration (`config.js`)

Global configuration object containing:
- Course code regex patterns
- Tooltip styling constants
- Performance settings
- Default user preferences

## Course Detection System

### Supported Course Code Formats

| Format | Example | Description |
|--------|---------|-------------|
| Standard | `CS 1`, `Ma 108` | Department code + number |
| Cross-listed | `ESE/Ge 142` | Multiple departments |
| Primary/Secondary | `Ma 3/103` | Undergrad/grad versions |
| Complex | `ACM 95/100 ab` | With section letters |
| Multi-department | `Ma/CS 6/106` | Cross-listed with numbers |
| Range | `EC 120-122` | Course number ranges |
| Shorthand | `CS 15, 16, 17` | Comma-separated sequences |

### Detection Algorithm

1. **Text Node Traversal**: Uses `TreeWalker` for efficient DOM traversal
2. **Pattern Matching**: Multi-stage regex matching for different formats
3. **Validation**: Checks against course catalog for actual existence
4. **DOM Modification**: Creates highlighted spans with event listeners

### Performance Optimizations

- **Batch Processing**: Processes text nodes in batches to avoid UI blocking
- **Caching**: WeakSet for tracking processed nodes
- **Debouncing**: Prevents excessive processing during rapid DOM changes
- **Lazy Loading**: Course data loaded asynchronously

## Configuration

### User Settings

Settings are stored in Chrome's sync storage and include:

```javascript
{
  extensionEnabled: true,          // Master on/off toggle
  showName: true,                  // Show course name
  showUnits: true,                 // Show unit information
  showTerms: true,                 // Show term availability
  showPrerequisites: true,         // Show prerequisites
  showDescription: false,          // Show course description
  showInstructors: true,           // Show instructor information
  tooltipDelay: 300               // Hover delay in milliseconds
}
```

### Course Code Pattern

The main regex pattern for course detection:

```javascript
COURSE_CODE_PATTERN: /\b([A-Za-z][a-zA-Z]{1,4}(?:\/[A-Za-z][a-zA-Z]{1,4})*)\s+(\d{1,3}(?:\/\d{1,3})*)\s*([a-z]{0,3})(?=\s|$|[.,;!?()\[\]{}])/gi
```

### Tooltip Configuration

```javascript
TOOLTIP_CONFIG: {
  HOVER_DELAY: 300,               // Default hover delay
  HIDE_DELAY: 100,                // Hide delay after mouse leave
  MAX_WIDTH: 450,                 // Maximum tooltip width
  Z_INDEX: 10000,                 // Tooltip z-index
  FADE_DURATION: 200              // CSS transition duration
}
```

## API Reference

### Content Script API

#### Main Class: `CaltechCourseTooltip`

```javascript
class CaltechCourseTooltip {
  constructor()                                    // Initialize extension
  async init()                                     // Setup and start processing
  async findCourseMatch(courseText)               // Find course in catalog
  async processExistingContent()                   // Process page content
  setupMutationObserver()                         // Monitor DOM changes
  showTooltip(element, isPinned = false)          // Display tooltip
  hideTooltip()                                   // Hide tooltip
  pinTooltip(element)                             // Pin tooltip
  unpinTooltip()                                  // Unpin tooltip
}
```

#### Course Detection Methods

```javascript
async detectCourseInText(text)                    // Main detection function
detectRangeCourses(text)                         // Range notation (e.g., "CS 1-3")
detectShorthandCourses(text)                     // Shorthand (e.g., "CS 1, 2, 3")
async expandCompoundCourseCode(match, ...)       // Handle compound codes
async findSectionCourses(courseCode)             // Find course sections
```

### Background Script API

#### Message Types

```javascript
// From content script to background
{
  type: 'FIND_COURSE',
  courseCode: 'CS 156'
}

// From popup to content script
{
  type: 'SETTINGS_UPDATED',
  settings: { ... }
}

// Performance metrics request
{
  type: 'GET_PERFORMANCE_METRICS'
}
```

### Storage API

Settings are managed through Chrome's storage API:

```javascript
// Get settings
chrome.storage.sync.get(defaultSettings, (result) => {
  // Handle settings
});

// Update settings
chrome.storage.sync.set(newSettings, () => {
  // Settings saved
});
```

## Development Guidelines

### Code Style

- **ES6+ JavaScript**: Modern syntax with proper error handling
- **JSDoc Comments**: Comprehensive documentation for all functions
- **Error Handling**: Graceful degradation and user-friendly error messages
- **Performance**: Efficient algorithms and minimal DOM manipulation

### Testing Strategy

1. **Unit Testing**: Test individual functions and methods
2. **Integration Testing**: Test component interactions
3. **Browser Testing**: Cross-browser compatibility
4. **Performance Testing**: Memory usage and execution time
5. **User Testing**: Real-world usage scenarios

### Adding New Features

1. **Update manifest.json** if new permissions are needed
2. **Extend configuration** in `config.js` for new settings
3. **Add UI elements** in `popup.html` for user controls
4. **Implement logic** in appropriate script files
5. **Update documentation** and README

### Course Data Updates

Course data is stored in `catalog.json` and can be updated using:

1. **Manual editing**: Direct JSON modification
2. **Python script**: Use `catalog_processor.py` for batch updates
3. **Automated scraping**: Implement scraping for official sources

## Troubleshooting

### Common Issues

#### Course Codes Not Detected

**Symptoms**: Course codes on page are not highlighted
**Causes**:
- Extension disabled in settings
- Course not in catalog database
- Complex DOM structure preventing detection
- JavaScript errors blocking execution

**Solutions**:
1. Check extension is enabled in Chrome and in popup settings
2. Verify course exists in catalog.json
3. Check browser console for errors
4. Refresh page or reload extension

#### Tooltips Not Appearing

**Symptoms**: Highlighted course codes don't show tooltips on hover
**Causes**:
- Tooltip delay set too high
- CSS conflicts with page styles
- JavaScript errors in tooltip rendering
- Popup blocked by page CSP

**Solutions**:
1. Reduce tooltip delay in settings
2. Check for CSS conflicts in developer tools
3. Review console for JavaScript errors
4. Test on different websites

#### Performance Issues

**Symptoms**: Page loading slowly or browser freezing
**Causes**:
- Large documents with many course codes
- Inefficient processing algorithms
- Memory leaks in DOM references
- Excessive mutation observer callbacks

**Solutions**:
1. Implement batch processing with delays
2. Optimize regex patterns and algorithms
3. Use WeakSet/WeakMap for DOM references
4. Throttle mutation observer events

### Debug Mode

Enable debug mode by setting in browser console:

```javascript
window.CALTECH_EXTENSION_DEBUG = true;
```

This enables additional console logging for troubleshooting.

### Performance Monitoring

The extension includes built-in performance metrics:

```javascript
{
  processedNodes: 0,              // Number of DOM nodes processed
  tooltipsShown: 0,               // Number of tooltips displayed
  coursesMatched: 0,              // Number of courses found
  errors: 0,                      // Number of errors encountered
  uptime: 0,                      // Extension uptime in milliseconds
  initTime: 0                     // Initialization time
}
```

## Browser Compatibility

### Supported Browsers

- **Chrome**: 88+ (Manifest V3 support)
- **Chromium**: 88+ (Edge, Brave, Opera)
- **Firefox**: Not supported (different extension format)

### Required Permissions

- `activeTab`: Access to current tab content
- `storage`: Settings persistence
- `host_permissions`: Access to all websites for course detection

## Security Considerations

- **No External Requests**: All data processed locally
- **Minimal Permissions**: Only essential permissions requested
- **Content Security Policy**: Follows strict CSP guidelines
- **Input Sanitization**: All user input properly sanitized
- **XSS Prevention**: Proper DOM manipulation practices

## Future Enhancements

### Planned Features

1. **Google Sheets Integration**: Detect course codes in spreadsheets
2. **Course Planning Tools**: Schedule building assistance
3. **Grade Distribution**: Historical grade data
4. **Professor Ratings**: Integration with course evaluation data
5. **Mobile Support**: Extension for mobile browsers
6. **Accessibility**: Enhanced screen reader support

### Technical Improvements

1. **Web Components**: Modernize tooltip implementation
2. **Service Worker Optimization**: Better caching strategies
3. **TypeScript Migration**: Type safety and better tooling
4. **Automated Testing**: Comprehensive test suite
5. **CI/CD Pipeline**: Automated building and deployment

---

*For additional support, please refer to the README.md or contact the development team.*
