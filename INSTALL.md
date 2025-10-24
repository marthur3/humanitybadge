# 🚀 Humanity Badge Extension - Installation Guide

## Step-by-Step Installation

### 1. Open Chrome Extensions Page
1. Open Google Chrome
2. Type `chrome://extensions/` in the address bar and press Enter
3. OR click the three dots menu → More tools → Extensions

### 2. Enable Developer Mode
1. In the top-right corner, toggle **"Developer mode"** to ON
2. You should see three new buttons appear: "Load unpacked", "Pack extension", "Update"

### 3. Load the Extension
1. Click **"Load unpacked"**
2. Navigate to your project directory: `/Users/michaelarthur/Desktop/humanitybadge`
3. Select the `humanitybadge` folder and click **"Select"**

### 4. Verify Installation
The extension should now appear in your extensions list with:
- ✅ Name: "Humanity Badge - Verified Human Typing"
- ✅ Version: 2.0
- ✅ Status: Enabled (toggle should be blue/on)

### 5. Test the Extension
1. Open `tests/simple-test.html` in Chrome:
   ```
   file:///Users/michaelarthur/Desktop/humanitybadge/tests/simple-test.html
   ```
2. You should see:
   - ✅ "Extension working! Found X button(s)" status
   - ✅ Green checkmark (✓) buttons next to textareas
   - ✅ Console messages starting with "HumanityBadge:"

## 🛠️ Troubleshooting

### Problem: "Extension not detected after timeout"

**Step 1: Check Extension Status**
1. Go to `chrome://extensions/`
2. Find "Humanity Badge - Verified Human Typing"
3. Make sure it's **enabled** (toggle is blue)
4. Check for any error messages in red

**Step 2: Check Console for Errors**
1. Open the test page: `tests/simple-test.html`
2. Press `F12` to open Developer Tools
3. Click the **Console** tab
4. Look for messages starting with "HumanityBadge:"
5. Look for any red error messages

**Step 3: Reload the Extension**
1. Go to `chrome://extensions/`
2. Click the **reload button** (circular arrow) on the Humanity Badge extension
3. Refresh your test page

**Step 4: Check File Permissions**
1. Make sure all files are readable:
   ```bash
   ls -la /Users/michaelarthur/Desktop/humanitybadge/
   ```
2. Key files should exist:
   - `manifest.json`
   - `content.js`
   - `content.css`
   - `background.js`

### Problem: Buttons Don't Appear

**Check Console Messages:**
```javascript
// In browser console, run:
window.checkHumanityBadge()
```

This should return:
```javascript
{
  loaded: true,
  recorder: true,
  buttons: 2,  // or however many textareas exist
  textareas: 2,
  wrappers: 2
}
```

**Force Button Attachment:**
```javascript
// In browser console, run:
if (window.HumanityBadgeRecorder) {
  window.HumanityBadgeRecorder.attachToTextAreas();
}
```

### Problem: Extension Shows as Loaded but No Functionality

1. **Check manifest.json syntax:**
   ```bash
   cat manifest.json | python -m json.tool
   ```

2. **Check content.js for syntax errors:**
   - Open `chrome://extensions/`
   - Click "Details" on Humanity Badge
   - Click "Inspect views: background page" (if available)
   - Check for JavaScript errors

3. **Check content script injection:**
   - Go to test page
   - Open Developer Tools (F12)
   - Go to Sources tab → Content Scripts
   - Look for `content.js` under your extension ID

## 🔍 Advanced Debugging

### Use Debug Console
Open `tests/debug-console.html` for advanced debugging with:
- Real-time extension monitoring
- DOM change detection
- Console log capture
- Metrics dashboard

### Manual Testing Steps
1. **Load Extension** → Check extensions page shows it enabled
2. **Open Test Page** → `tests/simple-test.html`
3. **Check Console** → Look for "HumanityBadge: Content script executing..."
4. **Verify Buttons** → Should see ✓ buttons next to textareas
5. **Test Recording** → Click button, type, see overlay
6. **Test Paste Block** → Try pasting during recording

### Common Chrome Extension Issues

**Manifest V3 Requirements:**
- ✅ Uses `manifest_version: 3`
- ✅ Uses `service_worker` instead of background page
- ✅ Content scripts properly declared

**File Locations:**
```
humanitybadge/
├── manifest.json          ← Extension configuration
├── content.js             ← Main functionality
├── content.css            ← Styling
├── background.js          ← Background service worker
├── popup.html/js          ← Extension popup
├── replay.html/js/css     ← Replay viewer
├── tests/                 ← Test files
└── icons/                 ← Extension icons
```

## 🎯 Success Indicators

When everything works correctly, you should see:

1. **In Chrome Extensions:**
   - Extension listed and enabled
   - No error messages

2. **In Test Page Console:**
   ```
   HumanityBadge: Content script executing...
   HumanityBadge: Content script loaded {readyState: "complete", ...}
   HumanityBadge: DOM already ready, initializing immediately
   HumanityBadge: Initializing Humanity Badge extension
   HumanityBadge: TypingRecorder created successfully
   ```

3. **In Test Page:**
   - Green checkmark buttons (✓) appear next to textareas
   - Status shows "✅ Extension working!"
   - Buttons are clickable and show recording overlay

If you're still having issues, check the browser console for specific error messages and share them for further debugging.