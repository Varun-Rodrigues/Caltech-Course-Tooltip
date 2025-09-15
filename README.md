# 🔍 Caltech Course Tooltip - Chrome Extension

**Current Version**: v1.1.0 | **Manifest Version**: 3 | **Platform**: Chrome/Chromium

A sleek Chrome extension that automatically detects Caltech course codes on web pages and displays helpful tooltips with course information. Perfect for students, faculty, and staff navigating course catalogs, schedules, and academic discussions.

## ✨ Features

### 🎯 **Advanced Course Detection**
- **Smart Pattern Recognition**: Automatically finds course codes like "CS 156", "Ma 3", or "ACM 95/100"
- **Complex Format Support**: Handles cross-listed courses, compound numbers, and section letters
- **Range Detection**: Recognizes course ranges like "EC 120-122"
- **Shorthand Notation**: Supports "CS 15, 16, 17" style listings
- **No-Space Format**: Detects concatenated codes like "CS156ab"
- **Edge Case Handling**: Special support for courses with unique letter patterns

### 📝 **Enhanced User Experience**
- **Google Docs Support**: Works seamlessly in Google Docs for collaborative work
- **Click-to-Pin**: Click course codes to keep tooltips visible
- **Section Cycling**: Navigate through multi-section courses
- **Accessibility**: Full keyboard navigation and screen reader support
- **Performance Optimized**: Minimal impact on page loading with smart caching

### 🎨 **Professional Styling**
- **Clean Tooltips**: Elegant design matching Caltech's visual identity
- **Responsive Design**: Adapts to different screen sizes and orientations
- **Dark Mode Support**: Automatic detection and adaptation
- **Visual Indicators**: Clear highlighting with subtle animations

### 🔧 **Customizable Settings**
- **Granular Controls**: Toggle individual information fields
- **Flexible Display**: Choose what information to show (name, units, terms, prerequisites, etc.)
- **Manual Lookup**: Built-in course search functionality
- **Real-time Updates**: Settings apply immediately without page refresh

## 🚀 Quick Start

### Installation

1. **Download the Extension**:
   - Clone this repository or download as ZIP
   - Extract to your desired location

2. **Load in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the project directory

3. **Activate**:
   - The extension icon will appear in your toolbar
   - Click to access settings and toggle functionality

### Usage

Once installed, the extension works automatically:

1. **Browse any website** with Caltech course codes
2. **Course codes are highlighted** with a subtle blue background
3. **Hover over highlighted codes** to see detailed course information
4. **Google Docs support**: Works in collaborative documents too!

## 🎯 Course Detection Examples

The extension recognizes these course code patterns:

| Format | Example | Description |
|--------|---------|-------------|
| Standard | `CS 1`, `Ma 108` | Department + number |
| Cross-listed | `ESE/Ge 142` | Multiple departments |
| Primary/Secondary | `Ma 3/103` | Undergrad/grad versions |
| Complex | `ACM 95/100 ab` | With section letters |
| Multi-dept | `Ma/CS 6/106` | Cross-listed with numbers |
| Range Notation | `EC 120-122` | Course number ranges |
| Shorthand | `CS 15, 16, 17` | Comma-separated sequences |
| No-Space | `CS156ab` | Concatenated format |
| Edge Cases | `Bi 1x`, `Ma 1d` | Special letter variants |

### 🆕 New in v1.1.0
- **Enhanced Pattern Recognition**: Improved detection of complex course formats
- **Performance Improvements**: Faster processing with better caching
- **Click-to-Pin Tooltips**: Click any course code to keep its tooltip visible
- **Section Cycling**: Navigate through multi-section courses easily
- **Manual Course Lookup**: Search for courses directly in the popup
- **Better Error Handling**: More robust operation with improved error recovery
- **Accessibility Enhancements**: Full keyboard support and screen reader compatibility

## ⚙️ Settings

Access settings by clicking the extension icon:

### Display Options
- **Extension Toggle**: Master on/off switch for course detection
- **Course Name**: Toggle course title display
- **Units**: Show/hide credit unit information
- **Terms**: Display term availability
- **Prerequisites**: Show prerequisite information
- **Description**: Toggle full course descriptions
- **Instructors**: Display instructor information

### Interactive Features
- **Click-to-Pin**: Click course codes to pin tooltips
- **Manual Lookup**: Search for courses using the built-in search box
- **Section Cycling**: Navigate through multi-section courses
- **Keyboard Navigation**: Full accessibility support

### Performance
- **Smart Caching**: Automatically manages memory and performance
- **Real-time Updates**: Settings apply immediately without page refresh

## 🛠️ Development

### Technical Architecture

- **Manifest V3**: Modern Chrome extension platform
- **ES6+ JavaScript**: Clean, modular code with proper error handling
- **TypeScript-style JSDoc**: Comprehensive documentation
- **Modular Design**: Separated concerns for maintainability
- **Performance Optimized**: Smart caching and efficient DOM processing
- **Memory Management**: Automatic cleanup and resource optimization
- **Error Recovery**: Robust error handling and graceful degradation

### Code Quality Features
- **Refactored Codebase**: v1.1.0 features completely refactored code for better performance
- **Reduced Redundancy**: Eliminated duplicate code and improved efficiency
- **Enhanced Error Handling**: Better error recovery and user feedback
- **Improved Documentation**: Comprehensive inline documentation
- **Consistent Patterns**: Standardized coding patterns across all files

### File Structure

```
caltech-course-tooltip/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for extension lifecycle
├── content.js             # Main course detection logic
├── config.js              # Global configuration and patterns
├── popup.html/js/css      # Settings interface
├── styles.css             # Tooltip and highlight styling
├── catalog.json           # Course database
└── images/                # Extension images
```

### Setup for Development

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd caltech-course-tooltip
   ```

2. **Load in Chrome**:
   - Navigate to `chrome://extensions/`
   - Enable Developer Mode
   - Click "Load unpacked"
   - Select the project directory

### Code Quality

- ✅ Modern JavaScript (ES6+) with proper error handling
- ✅ TypeScript-style JSDoc annotations
- ✅ Python code with full type hints
- ✅ Comprehensive documentation
- ✅ Modular, maintainable architecture

## 🐛 Troubleshooting

### Common Issues

**Course codes not being detected?**
- Check the browser console for error messages
- Verify the extension is enabled in `chrome://extensions/`
- Try refreshing the page or reloading the extension

**Tooltips not appearing?**
- Adjust tooltip delay in settings
- Check if course codes are properly highlighted
- Verify hover functionality on standard web pages first

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and test thoroughly
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📚 Version History

- **v1.1.0**: Major refactoring and feature enhancement
  - ✨ Click-to-pin tooltips functionality
  - 🔄 Section cycling for multi-section courses
  - 🔍 Manual course lookup in popup
  - 🎯 Enhanced course detection patterns (ranges, shorthand, no-space formats)
  - ⚡ Performance improvements with better caching
  - 🛠️ Complete code refactoring for maintainability
  - ♿ Accessibility enhancements (keyboard navigation, screen reader support)
  - 🐛 Improved error handling and recovery
  - 📚 Enhanced documentation and code comments

- **v1.0.0**: Initial release with basic course detection including cross listing and detection for shorthand notations. Includes popup panel for configuration and course search

## 📄 License

This project is created for educational purposes as part of the Caltech student experience. Course data is sourced from official Caltech publications.

## 📞 Contact

**Varun Rodrigues** - vrodrigu@caltech.edu

For bug reports or feature requests, please contact the author or open an issue in the repository.

---

*Made with ❤️ for the Caltech community*
