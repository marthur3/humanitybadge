# Enable Device Flow for Your GitHub App

## ⚠️ Important: Required Configuration

As of March 2022, **Device Flow must be manually enabled** for all GitHub Apps and OAuth Apps.

If you see this error:
```
device_flow_disabled
```

Or this message:
```
Device Flow must be enabled in your GitHub App settings
```

**You need to enable Device Flow in your GitHub App settings.**

## How to Enable Device Flow

### Step 1: Go to Your GitHub App Settings

1. Open your browser and go to: https://github.com/settings/apps
2. Find your app in the list (e.g., "Humanity Badge")
3. Click **Edit** next to your app name

### Step 2: Enable Device Flow

1. Scroll down to the **"Device Flow"** section
2. You'll see a checkbox labeled:
   ```
   ☐ Enable Device Flow
   ```
3. **Check this box** ✓
4. Click **"Save changes"** at the bottom of the page

### Step 3: Verify It's Enabled

1. Reload your app settings page
2. The checkbox should now be checked: ✓ Enable Device Flow
3. You're done!

## What is Device Flow?

Device Flow (OAuth 2.0 Device Authorization Grant) is a secure way to authenticate users on devices that don't have a web browser or have limited input capabilities, such as:

- CLI tools (like GitHub CLI)
- Browser extensions (like Humanity Badge)
- IoT devices
- Desktop apps

**How it works:**
1. App requests a device code from GitHub
2. User is shown a short code (e.g., "ABCD-1234")
3. User enters this code on GitHub.com to authorize
4. App polls GitHub and receives an access token when authorization is complete

**Why it's secure:**
- No client_secret needed (safe for public clients like browser extensions)
- User authorizes directly on GitHub.com (can't be phished)
- Short expiration times (codes expire in 15 minutes)
- Designed for this exact use case

## Why Did GitHub Require Manual Enable?

From GitHub's changelog (March 16, 2022):

> "This change reduces the likelihood of Apps being used in phishing attacks."

By requiring developers to explicitly enable Device Flow, GitHub ensures that only apps that actually need it can use it, reducing the attack surface.

## Troubleshooting

### "I don't see a Device Flow option in my app settings"

**Possible causes:**
1. You have an **OAuth App** instead of a **GitHub App**
   - OAuth Apps show Device Flow as "Enable Device Authorization Flow"
   - GitHub Apps show it as "Enable Device Flow"
   - Both work the same way

2. You're looking at the wrong settings page
   - Make sure you're at: https://github.com/settings/apps (GitHub Apps)
   - Not: https://github.com/settings/developers (OAuth Apps)

3. The UI changed
   - GitHub may have moved or renamed the setting
   - Look for anything related to "Device", "OAuth", or "Authorization"

### "Device Flow is enabled but I still get errors"

**Check these:**

1. **Reload the extension** after enabling Device Flow
   - Go to `chrome://extensions/`
   - Click the reload button on Humanity Badge

2. **Clear the device code** if you started OAuth before enabling Device Flow
   - Open browser console (F12)
   - Run: `chrome.storage.local.clear()`
   - Try OAuth flow again

3. **Check your Client ID** is correct in `github-oauth.js`
   - Open `github-oauth.js`
   - Line 17 should have your real Client ID (starts with `Ov23...` or similar)
   - Not a placeholder like `YOUR_GITHUB_OAUTH_CLIENT_ID`

4. **Check browser console** for detailed error messages
   - Press F12 to open DevTools
   - Go to Console tab
   - Look for `[OAuth Debug]` messages
   - Share any error messages you see

## Testing After Enabling

Once you've enabled Device Flow:

1. **Reload the extension**
   - Go to `chrome://extensions/`
   - Click reload on Humanity Badge

2. **Open the extension popup**
   - Click the extension icon

3. **Start OAuth flow**
   - Click "Connect with GitHub"
   - You should see a device code (e.g., "ABCD-1234")

4. **Authorize on GitHub**
   - Click "Open GitHub & Enter Code"
   - Enter the code on GitHub.com
   - Authorize the app

5. **Watch browser console**
   - Open DevTools (F12) → Console tab
   - You should see:
   ```
   [OAuth Debug] Poll response status: 200
   [OAuth Debug] Poll response data: { "access_token": "ghu_...", ... }
   [OAuth Debug] ✓ Access token received from GitHub
   [OAuth Debug] Token saved successfully
   ```

6. **Verify persistence**
   - Reload the extension
   - Open popup again
   - Should show "Connected as [username]"
   - No new device code should appear

## Expected Console Output

### ✅ Success (Device Flow Enabled)

```
[OAuth Debug] Starting GitHub Device Flow...
[OAuth Debug] Device code obtained. User code: ABCD-1234
[OAuth Debug] Polling for token...
[OAuth Debug] Poll response status: 200
[OAuth Debug] Poll response data: {
  "access_token": "ghu_16C7e42F292c6912E7710c838347Ae178B4a",
  "token_type": "bearer",
  "scope": "",
  "expires_in": 28800,
  "refresh_token": "ghr_...",
  "refresh_token_expires_in": 15811200
}
[OAuth Debug] ✓ Access token received from GitHub
[OAuth Debug] Token type: bearer
[OAuth Debug] Scope: (empty - GitHub App)
[OAuth Debug] Has refresh token: true
[OAuth Debug] Expires in: 28800s (8h)
[OAuth Debug] Token saved successfully
[OAuth Debug] ✓ User authenticated as: yourusername
```

### ❌ Error (Device Flow Disabled)

```
[OAuth Debug] Starting GitHub Device Flow...
[OAuth Debug] Device code obtained. User code: ABCD-1234
[OAuth Debug] Polling for token...
[OAuth Debug] Poll response status: 400
[OAuth Debug] Poll response data: {
  "error": "device_flow_disabled",
  "error_description": "Device flow is not enabled for this app"
}
[OAuth Debug] Error in response: device_flow_disabled
[OAuth Debug] ⚠️  Device Flow is not enabled for this GitHub App
```

**Solution:** Enable Device Flow in your GitHub App settings (see instructions above)

## GitHub App vs OAuth App

Both types support Device Flow:

| Feature | GitHub App | OAuth App |
|---------|-----------|-----------|
| Device Flow | ✓ Supported | ✓ Supported |
| Setting Name | "Enable Device Flow" | "Enable Device Authorization Flow" |
| Token Prefix | `ghu_` | `gho_` |
| Token Expiration | 8 hours (default) | Never |
| Refresh Tokens | ✓ Yes | ✗ No |
| Permissions | Fine-grained | Scopes |
| Scope Field | Empty string | Actual scopes |

**Humanity Badge works with both!** The code automatically handles the differences.

## Need Help?

If you're still having issues:

1. **Check the debug console output** - Most issues are visible in the logs
2. **Verify Device Flow is enabled** - This is the #1 cause of issues
3. **Try with a fresh OAuth App** - Create a new one and enable Device Flow from the start
4. **Check GitHub status** - Visit https://www.githubstatus.com/ to see if GitHub's OAuth service is down

## Summary

✅ **Required:** Enable Device Flow in your GitHub App/OAuth App settings
✅ **Location:** https://github.com/settings/apps → Edit your app → Check "Enable Device Flow"
✅ **Test:** Try OAuth flow and check console for success messages
✅ **Verify:** Reload extension and confirm connection persists

**That's it!** Once enabled, Device Flow works seamlessly for all users of your extension.
