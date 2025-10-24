# Reddit & LinkedIn Integration Guide

## 🎉 What's New

Humanity Badge now makes it **super easy** to share your verified typing proof on Reddit and LinkedIn!

### Key Features

1. **Platform-Specific Formatting** - Auto-generated share text for Reddit and LinkedIn
2. **Smart Tab Detection** - Automatically shows Reddit or LinkedIn tab based on where you're typing
3. **One-Click Copy** - Copy formatted proof text instantly
4. **Standalone HTML Export** - Download HTML files that work anywhere (no extension needed)
5. **No Auto-Close** - Share dialog stays open until you close it

## 🚀 How to Use

### On Reddit

1. **Write your Reddit comment/post** normally with the extension active
2. **Click the green ✓ button** to start recording
3. **Type your comment** (paste is blocked for verification)
4. **Click the red ⏹️ button** to stop
5. **Share dialog opens** - Reddit tab is auto-selected!
6. **Click "📋 Copy Reddit Format"**
7. **Paste at the end of your Reddit post/comment**

**Result:**
```
Your comment text here...

✓ Verified Human - 85 WPM [Watch Replay](link)
```

### On LinkedIn

1. **Write your LinkedIn post** with the extension active
2. **Click green ✓ button** to start recording
3. **Type your post**
4. **Click red ⏹️ button** to stop
5. **Share dialog opens** - LinkedIn tab is auto-selected!
6. **Click "📋 Copy LinkedIn Format"**
7. **Paste at the end of your LinkedIn post**

**Result:**
```
Your post text here...

✓ Humanity Badge Verified - Authentic human writing
View typing proof: [link]
```

### On Other Sites

The share dialog includes these tabs:
- **Link** - Copy the replay URL directly
- **Download** - Get standalone HTML file

## 📦 Standalone HTML Export

### What is it?

A self-contained HTML file that includes:
- Your typing replay
- All CSS and JavaScript (no external dependencies)
- Works in any browser
- No extension needed to view

### How to share:

1. Click **Download** tab in share dialog
2. Click **💾 Download HTML File**
3. Upload to:
   - **GitHub Gist** (free, easy, public URL)
   - **Dropbox** (get public link)
   - **Google Drive** (share with link)
   - **Any web hosting**
4. Share the public URL!

**Anyone can view your replay** - they don't need the extension!

## 🧪 Testing

### Test the Share Formatting

1. Open `tests/share-format-test.html` in your browser
2. Verify all tests pass (5/5 should be green ✓)
3. Check the formatted output for Reddit and LinkedIn

### Test the Extension

1. Go to `chrome://extensions/`
2. Click "Reload" on Humanity Badge extension
3. Go to reddit.com or linkedin.com
4. Test the recording flow
5. Verify the share dialog shows the correct default tab

### Test Standalone HTML

1. Record a test typing session
2. Download the HTML file from the Download tab
3. Open the HTML file in a different browser (or incognito)
4. Verify the replay works without the extension

## 📊 File Changes

### New Files
- `share-formatter.js` - Platform-specific text formatting
- `standalone-replay.html` - Self-contained replay template
- `tests/share-format-test.html` - Unit tests for formatting

### Modified Files
- `background.js` - Implemented `generateStandaloneHTML()`
- `content.js` - New tabbed share dialog with platform detection
- `manifest.json` - Added new files to web_accessible_resources

## 🎯 User Flow Examples

### Example 1: Reddit Comment

```
User on r/technology:
1. Reads article about AI
2. Writes thoughtful comment
3. Clicks ✓ button, types comment
4. Clicks ⏹️ button
5. Reddit tab auto-selected
6. Clicks "Copy Reddit Format"
7. Pastes: "✓ Verified Human - 95 WPM [Watch Replay](link)"
8. Posts comment with proof
```

### Example 2: LinkedIn Post

```
Professional on LinkedIn:
1. Writes post about industry insights
2. Clicks ✓ button, types post
3. Clicks ⏹️ button
4. LinkedIn tab auto-selected
5. Clicks "Copy LinkedIn Format"
6. Adds to end of post
7. Publishes with verification badge
```

## 🔧 Technical Details

### Platform Detection

```javascript
const hostname = window.location.hostname.toLowerCase();
const isReddit = hostname.includes('reddit.com');
const isLinkedIn = hostname.includes('linkedin.com');
const defaultTab = isReddit ? 'reddit' : (isLinkedIn ? 'linkedin' : 'link');
```

### Share Text Format

**Reddit:**
- Minimal: `✓ Verified Human [proof](url)`
- Standard: `✓ Verified Human - 85 WPM [Watch Replay](url)`
- Detailed: `✓ Humanity Badge: 234 chars in 45s at 85 WPM [Proof](url)`

**LinkedIn:**
- Standard: `✓ Humanity Badge Verified - Authentic human writing\nView typing proof: url`

### HTML Export

- Template: `standalone-replay.html`
- Data embedded in `<script>` tag as JSON
- All CSS/JS inlined (no external dependencies)
- File size: ~50-150KB per recording
- Works on any static file host

## 🐛 Troubleshooting

### Share Dialog Not Showing

1. Check extension is enabled in popup
2. Reload the page
3. Check browser console for errors

### Platform Tab Not Auto-Selected

- Verify you're on reddit.com or linkedin.com
- Check console logs for platform detection
- Should see correct defaultTab in dialog

### Download Button Not Working

1. Check browser allows downloads from extensions
2. Verify `htmlExport` is not null in response
3. Check console for errors

### Standalone HTML Not Playing

1. Open browser console (F12)
2. Look for JavaScript errors
3. Verify recording data in `<script id="recording-data">`
4. Check JSON is valid

## 📈 Next Steps (Future Enhancements)

Potential additions if needed:
- [ ] Twitter/X integration
- [ ] Custom share text templates
- [ ] Badge image generation (PNG/SVG)
- [ ] Public gallery (requires backend)
- [ ] Challenge links with WPM targets
- [ ] QR code generation

## 🎊 Impact

This integration makes sharing proof of authentic human typing:
- **10x easier** on Reddit (one-click copy)
- **Universal** - works without extension (HTML export)
- **Professional** - LinkedIn-ready formatting
- **Viral-ready** - encourages sharing and challenges

Users can now:
1. Prove authenticity in Reddit arguments
2. Verify professional content on LinkedIn
3. Share replays with anyone, anywhere
4. Build trust and credibility

**No more**: "This was definitely written by ChatGPT"
**Instead**: "✓ Verified Human - 85 WPM [Watch Replay]"
