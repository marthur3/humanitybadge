# Humanity Badge - Complete User Experience Documentation

## Overview
Humanity Badge is a Chrome browser extension that verifies authentic human typing with comprehensive anti-paste protection. It provides shareable proof that content was typed by a real human, not AI or copied/pasted.

## Target Use Cases
- **Reddit**: Prove authenticity in debates and comments
- **LinkedIn**: Verify human authorship of professional posts
- **General**: Any platform where proving human writing matters

---

## Complete User Journey

### 1. Installation & First Launch

#### Installing the Extension
1. User visits Chrome Web Store
2. Clicks "Add to Chrome"
3. Extension installs silently
4. Green checkmark icon appears in browser toolbar

#### First-Time Onboarding (Auto-Opens)
When user first installs, `onboarding.html` automatically opens:

**Welcome Screen:**
- **Header**: "✓ Humanity Badge - Verify Your Human Authenticity"
- **Welcome message**: "Let's Get You Set Up"
- **Three key benefits**:
  - 🎯 Professional Sharing (via GitHub)
  - ♾️ Unlimited Verifications
  - 🔒 Secure & Private

**Primary CTA**: "Connect with GitHub (Recommended)"
- Clicking this starts GitHub OAuth Device Flow
- Benefits: Short professional URLs, unlimited storage, trusted domain

**Secondary Option**: "Skip for now - I'll use basic URLs"
- Uses is.gd URL shortening instead
- No GitHub required
- Can connect later via Settings

#### GitHub OAuth Flow (If User Chooses)
1. Click "Connect with GitHub"
2. **Device Code Screen** appears:
   - Shows large verification code (e.g., "ABCD-1234")
   - "Open GitHub & Enter Code" button
   - Instructions displayed clearly
3. User clicks button → Opens github.com/login/device
4. User enters code on GitHub
5. User authorizes "Humanity Badge" with `gist` scope
6. Extension polls GitHub (every 5 seconds)
7. **Success Screen** appears automatically:
   - "🎉 All Set!"
   - Confirmation message
   - "Start Using Humanity Badge" button
8. Onboarding closes

#### Skipping GitHub
1. User clicks "Skip for now"
2. **Success Screen** appears:
   - "🎉 All Set!"
   - "You'll use basic URLs via is.gd"
   - "Start Using Humanity Badge" button
3. Onboarding closes

---

### 2. Daily Usage - Recording Typing

#### On Any Website

**Visual Indicator:**
- Fixed button in **bottom-right corner** of every webpage
- **Idle state**: Green gradient circle with white ✓
- Size: 60×60px
- Always visible (z-index 2147483647)
- Hovers over all page content

**Starting a Recording:**
1. User navigates to any site (e.g., Reddit comment section)
2. Green ✓ button is visible in corner
3. User clicks the ✓ button
4. Button transforms:
   - Icon changes to ⏹️ (stop button)
   - Color changes to red gradient
   - Tooltip: "Recording - Click to stop"
5. **Recording indicator** appears at top center:
   - Black semi-transparent banner
   - Pulsing red dot
   - Text: "RECORDING - Type normally"

**While Recording:**
- User types naturally in any input field
- Extension captures:
  - Each keystroke with timestamp
  - Key pressed
  - Text value at each point
  - Timing between keystrokes
- **Paste protection active**:
  - Ctrl+V / Cmd+V blocked
  - Right-click paste blocked
  - Drag-and-drop blocked
  - Shows warning: "⚠️ Paste blocked - Type manually for verification"

**Stopping Recording:**
1. User clicks red ⏹️ button
2. Recording stops immediately
3. Button returns to green ✓ state
4. Recording indicator disappears
5. **Verification runs automatically**:
   - Checks duration (minimum 5 seconds)
   - Calculates WPM (words per minute)
   - Validates WPM range (10-200 WPM)
   - Determines if typing is authentic

**Share Dialog Appears:**
The dialog is context-aware based on current website...

---

### 3. Share Dialog Experience

The share dialog adapts to the platform and provides multiple sharing options.

#### Dialog Layout

**Top Section - Verification Status:**
- **If verified**: Green banner with ✅
  - "✅ Recording Saved!"
  - "✓ Humanity Badge Verified"
  - Stats: "85 WPM • 12s • 245 chars"
- **If failed**: Red banner with ❌
  - "❌ Verification Failed"
  - Reason: "Too fast - minimum 5 seconds required"

**Share Method Indicator:**
Shows which URL generation method was used:
- 🎯 **GitHub Gist**: "Short, professional URL" (green)
- 🔗 **Shortened URL**: "Works everywhere" (blue)
- 📦 **Direct Link**: "May be long for some platforms" (orange)
- 💾 **Download Required**: "Too large for URL" (red)

**Tab Navigation:**
Four tabs available:
1. **Reddit** (auto-selected on reddit.com)
2. **LinkedIn** (auto-selected on linkedin.com)
3. **Link** (default on other sites)
4. **Download**

#### Tab 1: Reddit

**Purpose**: Pre-formatted text for Reddit posts/comments

**Content:**
- Instruction: "Add this to the end of your Reddit comment or post:"
- Text area with formatted text:
  ```
  ✓ Verified Human - 85 WPM [Watch Replay](https://gist.github.com/...)
  ```
- **Orange "📋 Copy Reddit Format" button**
- Tip: "Paste at the end of your comment to prove authenticity!"

**User Flow:**
1. User types Reddit comment as normal
2. Records typing with extension
3. Copies formatted text
4. Pastes at end of Reddit comment
5. Posts comment with verification proof

#### Tab 2: LinkedIn

**Purpose**: Professional formatting for LinkedIn posts

**Content:**
- Instruction: "Add this to your LinkedIn post:"
- Text area with formatted text:
  ```
  ✓ Humanity Badge Verified - Authentic human writing
  View typing proof: https://gist.github.com/...
  ```
- **Blue "📋 Copy LinkedIn Format" button**
- Tip: "Add at the end of posts to verify authentic human writing."

**User Flow:**
1. User writes LinkedIn post
2. Records typing
3. Copies formatted text
4. Adds to end of post
5. Publishes with verification

#### Tab 3: Link

**Purpose**: Raw URL for manual sharing

**Content:**
- Shows full URL in read-only input field
- **Green "📋 Copy Link" button**
- **Blue "👁️ View Replay" button** (opens in new tab)
- Confirmation: "✓ Works for anyone - No extension needed!"

**User Flow:**
1. Copy link
2. Share anywhere (email, DM, etc.)
3. Recipients can view without installing extension

#### Tab 4: Download

**Purpose**: Export standalone HTML file

**Content:**
- Instruction: "Download standalone HTML file (works anywhere, no extension needed):"
- **Purple "💾 Download HTML File" button**
- Instructions box:
  ```
  How to share:
  1. Download the HTML file
  2. Upload to GitHub Gist, Dropbox, or any file host
  3. Share the public link
  4. Anyone can view without the extension!
  ```

**User Flow:**
1. Click download button
2. File saves: `humanity-badge-{id}.html`
3. Upload to file host (Gist, Dropbox, Google Drive)
4. Share public URL
5. Works forever, no extension dependency

#### Closing the Dialog
- Click "Close" button (bottom right)
- Click outside dialog (on dark overlay)
- Dialog disappears

---

### 4. Viewing Shared Replays

#### As a Recipient (No Extension Needed)

**Opening a Shared Link:**
1. User receives link (from Reddit, LinkedIn, etc.)
2. Clicks link → Opens `replay.html` page
3. **Replay viewer loads**:
   - Shows verification badge
   - Displays stats (WPM, duration, chars)
   - Shows typing metrics

**Replay Viewer Interface:**
- **Header**: "✓ Humanity Badge - Typing Replay"
- **Verification Status**:
  - If verified: Green badge "✅ Verified Human"
  - If failed: Red badge "❌ Not Verified" with reason
- **Metrics Display**:
  - Words Per Minute (WPM)
  - Duration (seconds)
  - Character count
  - Word count
- **Playback Controls**:
  - Play/Pause button
  - Timeline scrubber
  - Speed controls (0.5x, 1x, 2x)
- **Text Display**:
  - Shows text being typed in real-time
  - Cursor animation
  - Highlights current position
- **Metadata**:
  - Recording date/time
  - Domain where recorded
  - Original URL (if available)

**User Experience:**
- Click Play → Watch keystroke-by-keystroke replay
- See natural human typing rhythm
- Impossible to fake (timing signatures are unique)
- Builds trust in authenticity

---

### 5. Extension Popup Interface

**Accessing Popup:**
- Click extension icon in Chrome toolbar
- Or right-click extension → "Popup"

**Popup Layout:**

**Header:**
- "✓ Humanity Badge" title
- "⚙️ Settings" button (top right)

**Extension Toggle:**
- Switch control: ON/OFF
- Status text:
  - When ON: "✅ Active - Buttons will appear on Reddit"
  - When OFF: "⛔ Disabled - No buttons will show"

**Current Status:**
- Shows real-time recording state:
  - If recording: "🔴 Recording in progress..."
  - If idle: "Ready to verify human typing"

**Instructions Box:**
```
How to use:
1. Toggle the extension ON/OFF above
2. Navigate to Reddit comment sections
3. Look for green ✓ buttons when extension is ON
4. Click button to start verification
5. Type normally to earn your badge!
```

**Your Verified Recordings:**
- List of all saved recordings
- Each item shows:
  - Domain/URL
  - Date/time
  - Verification status (✅ or ❌)
  - WPM if verified
  - Action buttons:
    - **👁️ View**: Opens replay in new tab
    - **📋 Copy**: Copies share URL
    - **🗑️ Delete**: Removes recording

**Empty State:**
- If no recordings: "No recordings yet. Start typing in a comment section to create your first replay!"

---

### 6. Settings Page

**Accessing Settings:**
- Click "⚙️ Settings" in popup
- Or right-click extension → "Options"

**Settings Sections:**

#### GitHub Connection
**If Not Connected:**
- **Primary CTA**: "Connect with GitHub" button
- Description: "Get short, professional URLs for your verifications"
- Benefits list:
  - Short gist.github.com URLs
  - Unlimited storage
  - Trusted domain
  - Professional appearance

**If Connected:**
- **Status**: "✅ Connected as @username"
- Shows GitHub avatar
- **"Disconnect" button**
- Stats: "X recordings uploaded to GitHub"

#### Advanced Settings (Collapsed by Default)
- **Manual Token Entry**:
  - For users who prefer manual setup
  - Input field for GitHub Personal Access Token
  - Instructions link
  - "Save Token" button

#### URL Shortening Options
- **Radio buttons**:
  - ○ Prefer GitHub Gist (recommended)
  - ○ Use is.gd shortener
  - ○ Use direct URLs only
- Shows pros/cons of each method

#### Recording Settings
- **Minimum Duration**: Slider (5-30 seconds)
- **WPM Range**: Min/Max sliders (default 10-200)
- **Auto-delete old recordings**: Checkbox (30/60/90 days)

#### Privacy & Data
- **Clear All Recordings**: Button
- Shows storage usage: "2.4 MB / 5 MB used"
- **Export All Data**: Downloads JSON
- **Delete All Data**: Removes everything

---

### 7. Error Handling & Edge Cases

#### Common Errors & Solutions

**"No input field found on this page"**
- Shown when: User clicks button on page with no input fields
- Solution: Navigate to a page with text inputs

**"Extension was reloaded. Please refresh this page and try again."**
- Shown when: Extension is updated/reloaded during recording
- Solution: Refresh page, start new recording

**"Too fast - minimum 5 seconds required"**
- Shown when: Recording duration < 5 seconds
- Solution: Type more content for longer

**"Unrealistic speed: 250 WPM"**
- Shown when: Typing speed outside 10-200 WPM range
- Suggests: Paste detection or bot behavior
- Solution: Type at natural human speed

**"GitHub connection failed"**
- Shown when: OAuth flow times out or fails
- Solutions:
  - Try again
  - Use "Skip for now" option
  - Use manual token in Settings

**"Failed to save recording"**
- Shown when: Chrome storage fails
- Solution: Check storage quota, delete old recordings

#### Extension Disabled State
When extension is toggled OFF:
- All buttons disappear from pages
- Active recordings stop immediately
- No new recordings can be started
- Existing recordings remain accessible

#### Input Field Detection
Extension finds inputs in this priority:
1. `<textarea>` elements
2. `[contenteditable="true"]` elements
3. `div[role="textbox"]` elements
4. `input[type="text"]` elements

Works on:
- Reddit comment boxes
- LinkedIn post editor
- Gmail compose
- Twitter/X composer
- Most modern web apps

---

### 8. Viral Growth Mechanisms

#### Reddit Integration
**Discovery:**
- Users see "✓ Verified Human - 85 WPM [Watch Replay]" at end of comments
- Curiosity drives clicks
- Replay link shows impressive typing visualization
- Others want to prove authenticity too

**Usage Pattern:**
1. User types thoughtful Reddit comment
2. Adds verification at end
3. Posts comment
4. Readers see verification badge
5. Click replay → See proof
6. Some readers install extension
7. They add verification to their comments
8. Cycle repeats (viral)

**Triggers:**
- Heated debates (prove you're not a bot)
- Long thoughtful posts (prove authenticity)
- Controversial opinions (build credibility)

#### LinkedIn Integration
**Discovery:**
- Professionals see "Humanity Badge Verified" in posts
- Differentiates from AI-generated content
- Builds trust in thought leadership
- Others want same credibility

**Usage Pattern:**
1. Thought leader writes LinkedIn post
2. Adds verification proof
3. Posts with verification link
4. Followers see badge
5. Click to verify → Impressed by proof
6. Some install to verify their content
7. Viral in professional network

**Triggers:**
- AI-heavy discourse (prove human authorship)
- Professional credibility
- Thought leadership posts
- Original research/insights

#### Standalone HTML Sharing
**Advantage:**
- Works anywhere without extension
- Permanent proof
- No dependency on service
- Easy to host anywhere

**Use Cases:**
- Email signature links
- Portfolio websites
- Academic papers (prove human writing)
- Job applications
- Legal affidavits

---

### 9. Privacy & Security

#### What's Collected
- Keystroke timing (timestamps only)
- Text content (stored locally only)
- Domain/URL where recorded
- Verification metrics (WPM, duration, etc.)

#### What's NOT Collected
- No analytics sent to external servers
- No user tracking
- No third-party integrations (except GitHub if user opts in)
- No passwords or sensitive data

#### Data Storage
- **Chrome Storage Local**: All recordings
- **Chrome Storage Sync**: Settings, OAuth token
- **GitHub Gist** (optional): Exported recordings
- No external databases

#### Data Sharing
- Recordings only shared via explicit user action
- Share URLs contain full recording data (no server)
- Recipients can view without creating account
- User controls all sharing

#### Security Measures
- OAuth token encrypted by Chrome
- No plaintext passwords
- Minimal permissions required
- Open source (auditable)

---

### 10. Performance & Technical Specs

#### Resource Usage
- **Memory**: ~5-10 MB per tab
- **Storage**: ~50-150 KB per recording
- **CPU**: Minimal (event listeners only)
- **Network**: Only when sharing (GitHub API or is.gd)

#### Browser Compatibility
- Chrome 88+ (Manifest V3)
- Edge 88+ (Chromium-based)
- Brave (Chromium-based)
- Not supported: Firefox (Manifest V2), Safari

#### Limitations
- **Chrome Storage**: 5 MB total (local)
- **URL Length**: ~2000 chars (browser dependent)
- **Recording Size**: Unlimited count, but storage limited
- **GitHub Rate Limits**: 5000 requests/hour (authenticated)

---

## Summary: Why Users Love It

1. **Instant credibility** - Prove you're human in seconds
2. **Works everywhere** - Universal ✓ button on all sites
3. **Beautiful replays** - Impressive visualization impresses viewers
4. **Easy sharing** - One-click copy for Reddit/LinkedIn
5. **No setup required** - Works out of box (GitHub optional)
6. **Privacy-first** - All data stays local unless shared
7. **Viral mechanics** - Seeing is believing, drives adoption
8. **Professional URLs** - GitHub Gist integration (optional)
9. **Permanent proof** - Standalone HTML files last forever
10. **Free & unlimited** - No payments, no limits

The user experience is designed to be **frictionless, viral, and trustworthy** - making it easy to prove authenticity and naturally encouraging spread through social proof.
