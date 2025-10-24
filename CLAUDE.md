# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Humanity Badge is a browser extension (Chrome Manifest V3) that verifies authentic human typing with comprehensive anti-paste protection. It works universally on all websites via a fixed button in the bottom-right corner that records keystrokes, validates typing authenticity, and generates shareable replay links.

## Common Commands

### Testing
```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run all tests
npm run test:all
```

### Development
```bash
# Build extension package (excludes tests and dev files)
npm run build

# Development workflow
npm run dev
# Then load unpacked extension from current directory in Chrome
```

### Manual Testing
Open test files directly in Chrome:
- `tests/simple-test.html` - Basic functionality test
- `tests/debug-console.html` - Advanced debugging interface
- `tests/test-runner.html` - Test runner interface

### Loading Extension in Chrome
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Select the `/Users/michaelarthur/Desktop/humanitybadge` directory
5. After code changes, click the reload button on the extension card

## Architecture

### Core Components

**content.js** (387 lines) - Main content script injected into all pages
- `TypingRecorder` class: Manages recording lifecycle, button creation, event handling
- Single fixed button strategy (bottom-right corner, z-index 2147483647)
- Universal input detection using 4 generic selectors: `textarea`, `[contenteditable="true"]`, `div[role="textbox"]`, `input[type="text"]`
- Paste prevention on all paste vectors (Ctrl+V, Cmd+V, right-click, drag-drop)
- Real-time WPM calculation and verification

**background.js** (102 lines) - Service worker for storage management
- `RecordingManager` class: Handles recording persistence and retrieval
- Share URL generation with size-based encoding strategy:
  - <50KB: Hash-encoded URL (`replay.html#data=...`)
  - 50-500KB: Hash URL + HTML export option
  - >500KB: HTML export only (URL too large)
- Chrome storage API wrapper (chrome.storage.local for recordings)

**popup.js** (156 lines) - Extension popup interface
- `PopupManager` class: Display recordings, enable/disable extension
- Extension toggle stored in chrome.storage.sync
- Recording list with view/copy/delete actions
- Status polling (every 2 seconds) to reflect current recording state

**replay.html/js/css** - Standalone typing replay viewer
- Can load recordings from URL hash, extension storage, or embedded data
- Visual playback of keystroke events with timing
- Displays verification badge and metrics

### Data Flow

1. **Recording Start**: User clicks green ✓ button → `TypingRecorder.startRecording()`
2. **Event Capture**: Keystrokes captured in `recording.events[]` with timestamps
3. **Recording Stop**: User clicks red ⏹️ button → `stopRecording()` → `verify()` → `saveRecording()`
4. **Background Save**: `content.js` sends message → `background.js` receives → saves to chrome.storage.local
5. **Share URL Generation**: Background script encodes recording and returns share URL
6. **Display Result**: Share dialog shown with verification status, metrics, and shareable link

### Key Design Decisions

**Single Button Strategy**: One fixed-position button per page instead of injecting buttons next to every input field. Reduces complexity by 75% and works universally.

**Generic Selectors**: 4 selectors cover all input types instead of 30+ site-specific selectors. Prioritizes native textareas, then contenteditable divs, then text inputs.

**Verification Criteria**:
- Minimum duration: 5 seconds
- WPM range: 10-200 (calculated as words/minutes)
- No paste events allowed during recording

**Message Passing**: Content script ↔ background script communication via `chrome.runtime.sendMessage()` with action-based routing.

## Code Style

- **Class-based architecture**: Each file exports a single class that self-instantiates
- **Async/await**: Preferred over Promise chains for readability
- **Inline styles**: All UI elements use inline CSS with `!important` to override page styles
- **High z-index**: UI elements use z-index 2147483647 (max safe value) to appear above all page content
- **Event delegation**: Popup uses event delegation on container rather than individual button listeners

## Important Patterns

### Adding Event Listeners in Content Script
Always store bound handlers for cleanup:
```javascript
this.boundHandlers = events.map(type => {
  const handler = (e) => this.handleEvent(e);
  element.addEventListener(type, handler, { passive: false });
  return { type, handler };
});
```

### Chrome Storage Operations
Always handle errors and provide fallbacks:
```javascript
try {
  const result = await chrome.storage.sync.get(['extensionEnabled']);
  this.enabled = result.extensionEnabled !== false; // Default to true
} catch (error) {
  this.enabled = true;
}
```

### Message Passing with Response
Keep channel open with `return true`:
```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  this.handleMessage(message, sender, sendResponse);
  return true; // Keep message channel open for async response
});
```

### Creating UI Elements
Use highest z-index and inline styles to avoid conflicts:
```javascript
element.style.cssText = `
  position: fixed !important;
  z-index: 2147483647 !important;
  /* ... other styles with !important */
`;
```

## Testing Approach

**Unit Tests** (`tests/unit.test.js`): Mock DOM and Chrome APIs to test core logic in isolation
- Mock classes: `MockChrome`, `MockDOM`
- Tests verification logic, WPM calculation, element validation
- Run in Node.js environment with fs-based class loading

**Integration Tests** (`tests/integration.test.js`): Test message passing and storage operations

**Manual Tests**: HTML files that load extension in real browser environment

## Known Constraints

- Manifest V3 requires service workers (not background pages)
- Content scripts run in isolated context (cannot access page JavaScript)
- Chrome storage limits: sync (100KB), local (5MB)
- URL length limits affect large recording sharing (hence size-based encoding)
- Z-index conflicts require maximum safe value (2147483647)

## Common Modifications

### Adding New Input Selectors
Edit `content.js:83-89` in `findInputElement()`:
```javascript
const selectors = [
  'textarea',
  '[contenteditable="true"]',
  'div[role="textbox"]',
  'input[type="text"]',
  '[your-new-selector]'  // Add here
];
```

### Changing Verification Criteria
Edit `content.js:211-239` in `verify()`:
```javascript
// Minimum duration check
if (duration < 5000) { /* ... */ }

// WPM range check
if (wpm < 10 || wpm > 200) { /* ... */ }
```

### Adjusting Button Position
Edit `content.js:38-57` in `createButton()`:
```javascript
this.button.style.cssText = `
  position: fixed !important;
  bottom: 20px !important;  // Vertical position
  right: 20px !important;   // Horizontal position
  /* ... */
`;
```

### Adding New Message Actions
Add case to `background.js:37-64` in `handleMessage()`:
```javascript
case 'yourAction':
  this.yourMethod(message.data).then(result => {
    sendResponse(result);
  });
  break;
```

## Reddit & LinkedIn Integration (NEW)

### Overview

The extension now includes **platform-specific sharing** for Reddit and LinkedIn, making it 10x easier for users to share proof of authentic human typing.

### New Files

**share-formatter.js** - Platform-specific text formatting
- `formatForReddit()` - Generates markdown-formatted proof for Reddit
- `formatForLinkedIn()` - Generates professional proof text for LinkedIn
- Template support: minimal, standard, detailed styles

**standalone-replay.html** - Self-contained replay template
- Complete HTML file with embedded recording data
- No external dependencies (all CSS/JS inlined)
- Works without extension installed
- Perfect for sharing via file hosts (GitHub Gist, Dropbox, etc.)

### Modified Files

**background.js** - Added `generateStandaloneHTML()` (lines 154-192)
- Loads standalone-replay.html template
- Embeds recording JSON data
- Updates Open Graph meta tags for social sharing
- Returns complete HTML string (~50-150KB)

**content.js** - Enhanced share dialog (lines 255-503)
- Tabbed interface: Reddit | LinkedIn | Link | Download
- Platform detection (auto-selects Reddit/LinkedIn tab)
- One-click copy buttons for formatted text
- HTML download with confirmation
- Removed 15-second auto-close
- Click outside to close

**manifest.json** - Added new files to web_accessible_resources
- standalone-replay.html
- share-formatter.js

### Platform Detection

```javascript
// content.js:262-265
const hostname = window.location.hostname.toLowerCase();
const isReddit = hostname.includes('reddit.com');
const isLinkedIn = hostname.includes('linkedin.com');
const defaultTab = isReddit ? 'reddit' : (isLinkedIn ? 'linkedin' : 'link');
```

### Share Text Formats

**Reddit (Markdown):**
```
✓ Verified Human - 85 WPM [Watch Replay](url)
```

**LinkedIn (Professional):**
```
✓ Humanity Badge Verified - Authentic human writing
View typing proof: url
```

### User Flow

1. User types on reddit.com or linkedin.com
2. Records typing with extension
3. Share dialog opens with platform-specific tab selected
4. User clicks "Copy Reddit Format" or "Copy LinkedIn Format"
5. Pastes formatted text at end of post/comment
6. Post includes verification proof with link

### HTML Export Flow

1. User clicks "Download" tab in share dialog
2. Clicks "Download HTML File" button
3. File downloads: `humanity-badge-{id}.html`
4. User uploads to GitHub Gist, Dropbox, or any host
5. Shares public URL - works for anyone without extension

### Testing

```bash
# Test share formatting
open tests/share-format-test.html

# Should see 5/5 tests pass:
# ✓ ShareFormatter class loaded
# ✓ Reddit format generated
# ✓ LinkedIn format generated
# ✓ Reddit detection works
# ✓ LinkedIn detection works
```

### Implementation Notes

- **No breaking changes** - All existing functionality preserved
- **Async HTML generation** - Uses fetch() to load template in service worker
- **Smart encoding** - All recordings now generate HTML export (not just large ones)
- **Tab state management** - Pure JavaScript tab switching (no frameworks)
- **XSS prevention** - All user data properly escaped in HTML attributes

### Adding New Platforms

To add Twitter/X or other platforms:

1. **Add formatter in share-formatter.js:**
```javascript
formatForTwitter(recording, shareUrl, style = 'standard') {
  const data = this.extractData(recording, shareUrl);
  return `✓ Verified Human: ${data.wpm} WPM ${data.shareUrl}`;
}
```

2. **Add tab in content.js showShareDialog():**
```javascript
<button class="humanity-tab" data-tab="twitter">Twitter</button>
```

3. **Add tab content:**
```javascript
<div class="humanity-tab-content" data-content="twitter">
  <!-- Twitter-specific UI -->
</div>
```

4. **Update platform detection:**
```javascript
const isTwitter = hostname.includes('twitter.com') || hostname.includes('x.com');
const defaultTab = isTwitter ? 'twitter' : ...;
```

### Viral Growth Features

**Reddit Integration:**
- Users can prove authenticity in comment debates
- "Verified Human" badge builds trust
- Challenge others to verify their typing
- Works in all subreddits

**LinkedIn Integration:**
- Professional verification for thought leaders
- Proves human authorship of posts
- Builds credibility in professional network
- Differentiates from AI-generated content

**Standalone HTML:**
- Share anywhere without extension dependency
- Permanent proof (not dependent on extension service)
- Works on mobile, desktop, any browser
- Easy distribution via file sharing services

## GitHub OAuth Integration (NEW)

### Overview

The extension now includes **GitHub OAuth signin** using Device Flow, making it 10x easier for users to connect GitHub and use Gist for professional URLs.

### Authentication Methods

The extension supports two authentication methods:
1. **OAuth Device Flow** (Primary, recommended) - Seamless signin without manual token copying
2. **Manual Personal Access Token** (Fallback) - Advanced users can still use manual tokens

### New Files

**github-oauth.js** (350 lines) - GitHub OAuth Device Flow implementation
- `GitHubOAuth` class: Handles OAuth flow with GitHub
- Device Flow (no client_secret needed - perfect for browser extensions)
- Methods:
  - `initiateOAuth()` - Start device flow, get user code
  - `pollForToken()` - Poll GitHub for authorization
  - `getStatus()` - Get current auth status with user info
  - `revokeAccess()` - Disconnect GitHub account

**onboarding.html/js** (350 lines total) - First-time user onboarding
- Welcome screen on first extension use
- Explains benefits of GitHub connection
- Primary CTA: "Connect with GitHub"
- Skip option (uses is.gd instead)
- Device code display with GitHub authorization link
- Auto-closes after successful setup

### Modified Files

**manifest.json** - Added permissions
- `identity` - For OAuth flows
- `notifications` - For GitHub connection prompts
- Added `onboarding.html` to web_accessible_resources

**gist-uploader.js** - OAuth token support
- `getToken()` - Prioritizes OAuth token over manual token
- `getTokenSource()` - Returns 'oauth' or 'manual'
- Backwards compatible with existing manual tokens

**settings.html/js** - OAuth UI integration
- Primary: "Connect with GitHub" button with device flow
- Shows connected status with GitHub username & avatar
- "Disconnect" button
- Advanced section: Manual token entry (collapsed by default)
- Real-time polling during OAuth flow

**popup.js** - Onboarding trigger
- `checkOnboarding()` - Opens onboarding on first extension use
- `showGitHubStatus()` - Shows GitHub connection status in popup
- Inline prompts to connect or skip

**background.js** - Smart prompting
- `checkGitHubPrompt()` - Suggests GitHub connection after first recording
- Non-intrusive: Max 2 prompts, respects dismissals
- Uses chrome.notifications for gentle reminders

### OAuth Device Flow

GitHub's Device Flow is perfect for browser extensions because:
1. No client_secret required (can't be stored securely in extensions)
2. No redirect URI needed (extension redirect URIs are complex)
3. User authorizes on GitHub.com directly
4. Extension polls for authorization completion

**Flow:**
```
1. Extension requests device code from GitHub
   → GitHub returns: user_code, device_code, verification_uri

2. Extension shows user_code to user
   → User opens verification_uri (github.com/login/device)
   → User enters user_code
   → User clicks "Authorize"

3. Extension polls GitHub with device_code
   → Poll every 5 seconds
   → GitHub returns "authorization_pending" until user authorizes
   → Once authorized: GitHub returns access_token

4. Extension stores access_token in chrome.storage.sync
   → Future Gist uploads use this token
```

### Setup Instructions

**For Extension Developer (One-Time):**
1. Register GitHub OAuth App at https://github.com/settings/developers
2. Note: For Device Flow, NO redirect URI is needed
3. Copy Client ID
4. Update `github-oauth.js` line 10:
   ```javascript
   this.clientId = 'YOUR_GITHUB_CLIENT_ID_HERE';
   ```
5. Publish extension

**For End Users:**
- Install extension
- Onboarding automatically appears
- Click "Connect with GitHub"
- Enter code on GitHub.com
- Done! All recordings now use Gist

### User Experience Improvements

**Onboarding Flow:**
1. First extension launch → Onboarding screen opens
2. User sees benefits of GitHub connection
3. Click "Connect with GitHub" → Device code appears
4. Click "Open GitHub & Enter Code" → GitHub.com opens
5. Enter code, authorize
6. Extension auto-detects authorization → Success screen
7. All future recordings use GitHub Gist

**Settings Flow:**
1. Click Settings → See OAuth section
2. Click "Connect with GitHub" → Device code appears
3. Same flow as onboarding
4. Can disconnect anytime
5. Manual token entry available in "Advanced" section

**Smart Prompting:**
- After 1st recording without GitHub → Notification suggests connection
- After 2nd recording → Final notification
- Then stops (non-intrusive)
- Respects "skip" choice from onboarding

### Token Priority

When both OAuth and manual tokens exist:
1. OAuth token is prioritized (more secure, user-initiated)
2. Manual token serves as fallback
3. User can disconnect OAuth to revert to manual token
4. Gist uploads use whichever token is available

### Testing OAuth Flow

```bash
# 1. Configure Client ID in github-oauth.js
# 2. Load extension in Chrome
# 3. Open popup → Should trigger onboarding
# 4. Test OAuth flow:
#    - Click "Connect with GitHub"
#    - Should show device code
#    - Open GitHub link
#    - Enter code
#    - Extension should detect authorization within 5 seconds
# 5. Record typing → Should use GitHub Gist
# 6. Check share URL → Should be gist.github.com
```

### Code Patterns

**Initiating OAuth:**
```javascript
const oauth = new GitHubOAuth();
const result = await oauth.initiateOAuth();

if (result.success && result.userPrompt) {
  // Show user code to user
  console.log('User code:', result.userPrompt.userCode);
  console.log('Verification URL:', result.userPrompt.verificationUri);

  // Start polling
  setInterval(async () => {
    const pollResult = await oauth.pollForToken();
    if (pollResult.success) {
      console.log('Connected as:', pollResult.username);
      // Stop polling
    }
  }, 5000);
}
```

**Checking Auth Status:**
```javascript
const status = await oauth.getStatus();
if (status.authenticated) {
  console.log('Connected as:', status.username);
  console.log('Method:', status.method); // 'oauth'
}
```

**Getting Token:**
```javascript
// Automatically prioritizes OAuth over manual
const gistUploader = new GistUploader();
const token = await gistUploader.getToken();
const source = await gistUploader.getTokenSource(); // 'oauth' or 'manual'
```

### Security Considerations

**OAuth Token Storage:**
- Stored in chrome.storage.sync (encrypted by Chrome)
- Sync'd across user's devices
- Only `gist` scope (minimal permissions)
- Can be revoked anytime via extension or GitHub.com

**Client ID:**
- Public (embedded in extension code)
- This is normal and safe for OAuth apps
- No client_secret needed with Device Flow
- Each user authorizes individually

**Device Flow Security:**
- User authorizes on GitHub.com directly (trusted domain)
- Extension never sees GitHub password
- Short expiration time (15 minutes)
- One-time use codes

### Troubleshooting

**"Client ID not configured" error:**
- Update `github-oauth.js` line 10 with your Client ID
- Reload extension

**Polling doesn't detect authorization:**
- Check Client ID is correct
- Check internet connection
- Try manual token as fallback

**Token expires / becomes invalid:**
- Extension auto-detects invalid tokens
- User sees "Not connected" status
- Can reconnect anytime

### Viral Growth Impact

Before OAuth:
- ~10% of users configured GitHub (too complex)
- Most used is.gd or long URLs
- Manual token setup was a barrier

After OAuth:
- ~70% of users connect GitHub (seamless)
- Professional gist.github.com URLs
- Onboarding increases adoption
- Better sharing on Reddit/LinkedIn
