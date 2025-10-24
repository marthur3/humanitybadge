# 🎯 Humanity Badge - Verified Human Typing Extension

A lightweight browser extension that verifies authentic human typing with comprehensive anti-paste protection. Works on all websites with a simple fixed button interface.

## 🚀 Features

### ✅ **Human Typing Verification**
- Real-time keystroke recording
- WPM calculation and validation (10-200 WPM range)
- Minimum typing duration requirements (5+ seconds)
- Cryptographic proof of typing authenticity

### 🚫 **Comprehensive Paste Prevention**
- Blocks all paste operations (`Ctrl+V`, `Cmd+V`, right-click paste)
- Prevents drag-and-drop text insertion
- Visual feedback when paste attempts are blocked

### 🎖️ **Humanity Badge System**
- Proof of typing authenticity
- Visual verification display
- Shareable replay links
- Detailed typing metrics (WPM, duration, character count)

### 🌐 **Universal Compatibility**
- Works on **all websites**
- Single fixed button (bottom-right corner)
- Automatically detects input fields
- Support for textareas, contenteditable, and text inputs

## 📦 Installation

### For Development
1. Clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the project directory

## 🏗️ Architecture

### Core Files (Simplified)
```
/humanitybadge
├── manifest.json         - Extension configuration
├── content.js           - Main recorder (387 lines)
├── content.css          - UI styling
├── background.js        - Storage management (102 lines)
├── popup.html/js        - Extension popup (156 lines)
├── replay.html/js/css   - Typing replay viewer
└── /icons              - Extension icons
```

### How It Works

1. **Button Injection** - A green ✓ button appears in the bottom-right corner of every page
2. **Recording** - Click to start recording keystrokes with paste protection
3. **Verification** - Automatic validation of typing speed and duration
4. **Storage** - Recordings saved to browser storage with unique IDs
5. **Replay** - View and share typing replays with verification details

## 🎯 Universal Input Detection

The extension automatically finds and records from:
- `textarea` elements
- `[contenteditable="true"]` elements
- `div[role="textbox"]` elements (rich text editors)
- `input[type="text"]` elements

## ⚙️ Usage

1. **Enable/Disable** - Use the extension popup to toggle on/off
2. **Start Recording** - Click the green ✓ button on any page
3. **Type Normally** - Your text remains visible, no interference
4. **Stop Recording** - Click the red ⏹️ button to stop and verify
5. **View Results** - See verification status and metrics
6. **Manage Recordings** - View, replay, or delete from the popup

## 📊 Verification Criteria

### Authentic Typing Indicators
- **Minimum Duration**: 5 seconds
- **Realistic WPM**: Between 10-200 words per minute
- **No Paste Events**: All paste operations blocked during recording

### Verification Failures
- Too fast (< 5 seconds)
- Unrealistic typing speed (< 10 or > 200 WPM)
- No typing data recorded

## 🔧 Development

### File Structure
```
content.js    - 387 lines (reduced from 1540 - 75% smaller)
popup.js      - 156 lines (reduced from 172)
background.js - 102 lines (unchanged - already optimal)
Total         - ~750 lines (down from ~2200)
```

### Key Improvements
- **Single button strategy** - Fixed position, works everywhere
- **Generic selectors** - 4 selectors instead of 30+
- **Simplified verification** - Essential checks only
- **Removed complexity** - No DevTools detection, no debug code
- **Better maintainability** - 66% less code to maintain

## 🛠️ Testing

### Manual Testing
1. Open any website
2. Look for the green ✓ button in bottom-right
3. Click to start recording
4. Type at least 5 seconds of text
5. Click red ⏹️ to stop
6. Check verification results

### Test Files
Available in `/tests` directory for advanced testing scenarios.

## 🛡️ Privacy

- All recordings stored **locally** in browser storage
- No data sent to external servers
- Recordings only accessible within your browser
- Delete anytime from the popup

## ⚡ Performance

- Minimal memory footprint
- Single initialization strategy
- Efficient event handling
- No background polling
- Optimized DOM queries

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Keep code simple and maintainable
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues and support:
- Check the extension popup for status
- Ensure extension is enabled
- Refresh the page if button doesn't appear
- Check browser console for errors

---

**Simplified and refactored for maximum clarity and reliability**

Made with ❤️ for authentic human communication on the internet
