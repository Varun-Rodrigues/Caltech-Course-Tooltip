# Caltech Course Tooltip - Chrome Extension

**Current Version**: v1.1.0 | **Manifest Version**: 3 | **Platform**: Chrome/Chromium

A Chrome extension that automatically detects Caltech course codes on web pages and displays tooltips with course information. Designed for students, faculty, and staff navigating course catalogs, schedules, and academic discussions.

## Features

### Advanced Course Detection

The extension recognizes course codes in multiple formats:

- Standard notation: "CS 1", "Ma 108"
- Cross-listed courses: "ESE/Ge 142"
- Primary/secondary numbering: "Ma 3/103"
- Complex formats: "ACM 95/100 ab"
- Multi-department courses: "Ma/CS 6/106"
- Range notation: "EC 120-122"
- Concatenated format: "CS156ab"
- Special cases: "Bi 1x", "Ma 1d"

### User Experience

- **Click-to-pin tooltips**: Click any course code to keep its tooltip visible
- **Section cycling**: Navigate through multi-section courses
- **Optimized performance**: Smart caching minimizes page load impact
- **Customizable display**: Toggle individual information fields through settings
- **Manual lookup**: Built-in course search functionality

## Quick Start

### Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Search for "Caltech Course Tooltip"
3. Download and install the extension
4. Pin the extension to your toolbar for easy access

### Usage

The extension works automatically once installed:

1. Browse any website containing Caltech course codes
2. Course codes are highlighted with a subtle blue background
3. Hover over highlighted codes to view course information
4. Click codes to pin tooltips or use manual search in the popup

## Settings

Access settings by clicking the extension icon in your toolbar.

### Display Options

Control what information appears in tooltips:
- Course name
- Credit units
- Term availability
- Prerequisites
- Full descriptions
- Instructor information

### Additional Controls

- Master toggle for enabling/disabling course detection
- Manual course lookup via search box
- Real-time settings updates without page refresh

## What's New in v1.1.0

- Enhanced pattern recognition for complex course formats
- Performance improvements with better caching
- Click-to-pin tooltip functionality
- Section cycling for multi-section courses
- Manual course lookup in popup interface
- Improved error handling and recovery
- Complete code refactoring for maintainability
- Enhanced accessibility with keyboard navigation
- Better documentation and code comments

## Development

### Technical Architecture

Built with modern web technologies:
- Manifest V3 extension platform
- ES6+ JavaScript with modular design
- JSDoc annotations for code documentation
- Smart caching and efficient DOM processing
- Automatic memory management and cleanup
- Robust error handling

### File Structure

```
caltech-course-tooltip/
├── manifest.json          # Extension configuration
├── background.js          # Service worker
├── content.js             # Course detection logic
├── config.js              # Global configuration
├── popup.html/js/css      # Settings interface
├── styles.css             # Tooltip styling
├── catalog.json           # Course database
└── images/                # Extension assets
```

### Setup for Development

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd caltech-course-tooltip
   ```

2. Load in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable Developer Mode
   - Click "Load unpacked"
   - Select the project directory

## Troubleshooting

**Course codes not being detected?**
- Check if the extension is enabled in `chrome://extensions/`
- Look for error messages in the browser console
- Try refreshing the page or reloading the extension

**Tooltips not appearing?**
- Verify that course codes are highlighted
- Check tooltip delay settings
- Test hover functionality on other web pages

## Contributing

Contributions are welcome. To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Test your changes thoroughly
4. Commit with clear messages (`git commit -m 'Add feature description'`)
5. Push to your branch (`git push origin feature/your-feature`)
6. Open a Pull Request

## Version History

**v1.1.0** - Major refactoring and feature enhancement
- Click-to-pin tooltips
- Section cycling for multi-section courses
- Manual course lookup
- Enhanced course detection patterns
- Performance improvements
- Code refactoring for maintainability
- Accessibility enhancements
- Improved error handling

**v1.0.0** - Initial release
- Basic course detection including cross-listing
- Shorthand notation detection
- Configuration popup panel
- Course search functionality

## License

Created for educational purposes as part of the Caltech student experience. Course data sourced from official Caltech publications.

## Contact

**Varun Rodrigues** - vrodrigu@caltech.edu

For bug reports or feature requests, please contact the author or fork the repository and submit a pull request.