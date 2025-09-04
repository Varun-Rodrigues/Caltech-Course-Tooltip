# 🔍 Caltech Course Tooltip - Chrome Extension

**Current Version**: v1.0.0 | **Manifest Version**: 3 | **Platform**: Chrome/Chromium

A sleek Chrome extension that automatically detects Caltech course codes on web pages and displays helpful tooltips with course information. Perfect for students, faculty, and staff navigating course catalogs, schedules, and academic discussions.

## ✨ Features

- 🎯 **Smart Course Detection**: Automatically finds course codes like "CS 156", "Ma 3", or "ACM 95/100"
- 📝 **Google Docs Support**: Works seamlessly in Google Docs for collaborative work
- 🎨 **Clean Tooltips**: Elegant design matching Caltech's visual identity
- ⚡ **Fast & Lightweight**: Minimal impact on page loading
- 🔧 **Customizable**: Adjustable tooltip delay and toggle functionality
- 🎓 **Comprehensive Coverage**: Supports all Caltech departments and course formats

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

## ⚙️ Settings

Access settings by clicking the extension icon:

- **Enable Extension**: Toggle course detection on/off
- **Tooltip Delay**: Adjust hover delay (0-2000ms)
- **Reset Settings**: Restore default configuration

## 🛠️ Development

### Technical Architecture

- **Manifest V3**: Modern Chrome extension platform
- **ES6+ JavaScript**: Clean, modular code with proper error handling
- **TypeScript-style JSDoc**: Comprehensive documentation
- **Modular Design**: Separated concerns for maintainability

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

- **v1.0**: Initial release with basic course detection including cross listing and detection for shorthand notations. Includes popup panel for configuration and course search

## 📄 License

This project is created for educational purposes as part of the Caltech student experience. Course data is sourced from official Caltech publications.

## 📞 Contact

**Varun Rodrigues** - vrodrigu@caltech.edu

For bug reports or feature requests, please contact the author or open an issue in the repository.

---

*Made with ❤️ for the Caltech community*
