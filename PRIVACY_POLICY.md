# Privacy Policy for Humanity Badge

**Last Updated: January 2, 2026**

## Overview

Humanity Badge ("the Extension") is a browser extension that records and verifies authentic human typing. This privacy policy explains what data we collect, how we use it, and your rights regarding your data.

## Data Collection & Usage

### What We Collect

The Extension collects the following data **locally on your device only**:

1. **Typing Recordings**
   - Keystroke timestamps
   - Key values pressed
   - Text content you type
   - Typing metrics (WPM, duration, character count)
   - URL/domain where recording was made
   - Recording date and time

2. **Extension Settings**
   - Extension enabled/disabled state
   - GitHub connection status (if you choose to connect)
   - User preferences

3. **GitHub OAuth Token** (Optional)
   - If you choose to connect GitHub, we store your OAuth access token
   - Token is encrypted and stored by Chrome
   - Token is only used to create GitHub Gists for sharing
   - Token has minimal scope (`gist` only)

### What We DO NOT Collect

- **No server-side tracking**: We do not send any data to external servers for tracking or analytics
- **No personal information**: We do not collect names, emails, or other identifying information
- **No browsing history**: We do not track which websites you visit
- **No keystroke logging outside recordings**: We only record when you explicitly start a recording
- **No passwords**: We do not capture password fields or sensitive form data
- **No third-party analytics**: No Google Analytics, no tracking pixels, no telemetry

## Data Storage

### Local Storage
- All recordings are stored in **Chrome's local storage** on your device
- This data never leaves your computer unless you explicitly share it
- You can view and delete all recordings at any time via the extension popup
- Storage limit: 5 MB (Chrome's local storage quota)

### Sync Storage
- Extension settings and GitHub OAuth token are stored in **Chrome's sync storage**
- This allows your settings to sync across devices where you're signed into Chrome
- Chrome encrypts this data
- Storage limit: 100 KB

### GitHub (Optional)
- If you connect GitHub, we may upload your recordings to GitHub Gist
- This only happens when you share a recording
- Gists are created under your GitHub account
- You control the privacy of these Gists (secret by default)
- You can delete Gists from your GitHub account at any time

## Data Sharing

### User-Initiated Sharing Only
The Extension **never automatically shares your data**. Sharing only occurs when you:

1. **Share a recording link** - The recording data is embedded in the URL or uploaded to GitHub Gist (your choice)
2. **Download HTML export** - You manually download a file containing the recording
3. **Copy formatted text** - You copy pre-formatted text with a link to your recording

### Who Can Access Shared Recordings
- Anyone with the share link can view the recording
- Recipients do NOT need to install the extension
- Recordings do not contain personal information (unless you typed it)
- You control who receives the links

### No Third-Party Data Sharing
- We do not sell data to third parties
- We do not share data with advertisers
- We do not provide data to analytics companies
- The Extension is completely standalone

## Third-Party Services

### GitHub (Optional)
- **Used for**: Creating Gists to host shareable recordings
- **Data sent**: Recording data when you choose to share via GitHub
- **Authorization**: You explicitly authorize via OAuth
- **Scope**: Minimal (`gist` only - cannot access your repos or code)
- **Privacy**: Governed by [GitHub's Privacy Policy](https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement)

### is.gd URL Shortener (Fallback)
- **Used for**: Shortening long URLs when GitHub is not connected
- **Data sent**: Long URL containing recording data
- **Privacy**: Governed by [is.gd Privacy Policy](https://is.gd/privacy.php)
- **Alternative**: You can opt to use direct URLs instead

## Your Rights & Control

### Access Your Data
- View all recordings in the extension popup
- Export all data as JSON from Settings

### Delete Your Data
- Delete individual recordings from the popup
- Clear all recordings from Settings
- Uninstall the extension to remove all local data
- Delete GitHub Gists from your GitHub account

### Revoke GitHub Access
- Disconnect GitHub from Settings
- Revoke access from [GitHub Settings](https://github.com/settings/applications)
- Deletes stored OAuth token immediately

### Disable Extension
- Toggle extension OFF from popup
- Temporarily stops all recording functionality
- Does not delete existing recordings

## Security Measures

### Data Protection
- OAuth tokens encrypted by Chrome
- No plaintext passwords stored
- All data processing happens locally
- Minimal permissions requested

### Code Transparency
- Extension source code is open source
- Available for public audit
- No obfuscated or minified code in production

### Permissions Explained

The Extension requests the following Chrome permissions:

1. **`storage`** - To save recordings and settings locally on your device
2. **`activeTab`** - To access the current tab when you click the extension button
3. **`scripting`** - To inject the recording button on web pages
4. **`identity`** (optional) - For GitHub OAuth authentication
5. **`notifications`** (optional) - To show connection prompts
6. **Host permissions** (`https://api.github.com/*`, `https://is.gd/*`) - To communicate with GitHub API and URL shortener

All permissions are necessary for core functionality.

## Children's Privacy

The Extension does not knowingly collect data from children under 13. If you are under 13, please do not use this Extension without parental consent.

## Changes to This Policy

We may update this privacy policy from time to time. Changes will be indicated by updating the "Last Updated" date at the top of this document.

Significant changes will be communicated via:
- Extension update notes
- In-app notification
- GitHub repository announcement

## Data Retention

- **Local recordings**: Stored indefinitely until you delete them
- **GitHub Gists**: Stored until you delete them from GitHub
- **Settings**: Stored until you change them or uninstall the extension

## International Data Transfers

- All data is stored locally on your device (no transfers)
- If you use GitHub Gist, data is transferred to GitHub's servers (see GitHub's privacy policy)
- If you use is.gd, data is transferred to is.gd's servers (see is.gd's privacy policy)

## Contact & Support

For privacy questions or concerns:
- **GitHub Issues**: [github.com/marthur3/humanitybadge/issues](https://github.com/marthur3/humanitybadge/issues)
- **Email**: contact.givemethanks@gmail.com

For data deletion requests or privacy rights inquiries, please contact us via the channels above.

## Legal Basis for Processing (GDPR)

For users in the European Union:
- **Consent**: You explicitly authorize data collection by using the Extension
- **Legitimate Interest**: Processing is necessary for the Extension's core functionality
- **Your Rights**: Access, rectification, erasure, restriction, portability, and objection

To exercise your GDPR rights, contact us via the support channels above.

## California Privacy Rights (CCPA)

For California residents:
- **Right to Know**: You can request what data we collect
- **Right to Delete**: You can delete all data via Settings or uninstall
- **Right to Opt-Out**: You can disable the Extension at any time
- **No Sale of Data**: We do not sell personal information

## Compliance

This Extension complies with:
- Chrome Web Store Developer Program Policies
- General Data Protection Regulation (GDPR)
- California Consumer Privacy Act (CCPA)
- Children's Online Privacy Protection Act (COPPA)

---

**Summary**: Humanity Badge is privacy-first. All data stays on your device unless you explicitly share it. No tracking, no analytics, no third-party data sharing. You have complete control.
