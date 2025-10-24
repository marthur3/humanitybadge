# Debugging OAuth Persistence Issue

## Problem
- OAuth connects successfully
- User authorizes on GitHub
- But after reloading extension, shows as not connected
- Generates new code instead of recognizing existing token

## Debug Steps

### Step 1: Open Browser Console
1. Open Chrome DevTools (F12)
2. Go to **Console** tab
3. Keep this open during testing

### Step 2: Test OAuth Flow
1. Click extension icon
2. Click "Connect with GitHub"
3. **Watch the console** for debug messages

You should see:
```
[OAuth Debug] Starting GitHub Device Flow...
[OAuth Debug] Device code obtained. User code: ABCD-1234
```

### Step 3: Complete Authorization
1. Click "Open GitHub & Enter Code"
2. Enter the code on GitHub.com
3. Authorize the app
4. **Watch console for token save messages**

You should see:
```
[OAuth Debug] ✓ Access token received from GitHub
[OAuth Debug] Token type: bearer
[OAuth Debug] Scope: gist
[OAuth Debug] Saving token to storage with key: githubOAuthToken
[OAuth Debug] Token saved successfully
[OAuth Debug] Verification - token in storage: true
[OAuth Debug] User info retrieved: yourusername
[OAuth Debug] ✓ OAuth authentication successful!
```

### Step 4: Verify Storage
In the console, run this command:
```javascript
const oauth = new GitHubOAuth();
await oauth.inspectStorage();
```

You should see:
```
=== OAuth Storage Inspector ===
Chrome storage.sync (all keys): ["githubOAuthToken", ...]
OAuth token key exists: true
Token data: {
  has_access_token: true,
  token_type: "bearer",
  scope: "gist",
  created_at: [timestamp],
  access_token_preview: "***abcd"
}
=== End Storage Inspector ===
```

### Step 5: Test Reload
1. **WITHOUT closing DevTools**, reload the extension:
   - Go to chrome://extensions/
   - Click reload button on Humanity Badge

2. Click extension icon again

3. **Watch console** - you should see:
```
[OAuth Debug] Getting OAuth status...
[OAuth Debug] Checking authentication...
[OAuth Debug] Storage key: githubOAuthToken
[OAuth Debug] Storage result: {githubOAuthToken: {...}}
[OAuth Debug] Has token: true
[OAuth Debug] Token found, created at: [timestamp]
[OAuth Debug] Is authenticated: true
[OAuth Debug] Got access token: ***abcd
[OAuth Debug] Fetching user info from GitHub...
[OAuth Debug] User info response: {login: "yourusername", ...}
[OAuth Debug] ✓ User authenticated as: yourusername
```

## GitHub Apps vs OAuth Apps

**Important:** The extension now supports both GitHub Apps and OAuth Apps. They work slightly differently:

| Feature | GitHub App | OAuth App |
|---------|-----------|-----------|
| Token Prefix | `ghu_` | `gho_` |
| Refresh Token | Yes (`ghr_` prefix) | No |
| Token Expiration | 8 hours (default) | Never |
| Scope Field | Empty string | Actual scopes |
| Device Flow Required | Must enable in settings | Must enable in settings |

**Console output differences:**
- GitHub Apps show: `Scope: (empty - GitHub App)`
- GitHub Apps show: `Has refresh token: true`
- GitHub Apps show: `Expires in: 28800s (8h)`

## Possible Issues & Solutions

### Issue 0: Device Flow Not Enabled ⚠️
**Symptom:** Error `device_flow_disabled` or status code 400

**Console shows:**
```
[OAuth Debug] Poll response data: {
  "error": "device_flow_disabled",
  "error_description": "Device flow is not enabled for this app"
}
[OAuth Debug] ⚠️  Device Flow is not enabled for this GitHub App
```

**Solution:** Enable Device Flow in your GitHub App settings
1. Go to https://github.com/settings/apps
2. Edit your app
3. Check "Enable Device Flow"
4. Save changes
5. Reload extension and try again

**See:** `ENABLE_DEVICE_FLOW.md` for detailed instructions

### Issue 1: Token Not Being Saved
**Symptom:** Console shows "Token saved" but inspection shows no token

**Check:**
```javascript
// Run this immediately after authorization
chrome.storage.sync.get('githubOAuthToken', (result) => {
  console.log('Direct storage check:', result);
});
```

**Possible causes:**
- chrome.storage.sync quota exceeded
- Extension permissions issue
- Async timing issue

**Solution:** Try using `chrome.storage.local` instead:
1. Edit `github-oauth.js` line 22
2. Change: `this.storageKey = 'githubOAuthToken';`
3. Add: `this.storageType = chrome.storage.local;` // instead of sync

### Issue 2: Token Saved But Not Retrieved
**Symptom:** Inspection shows token exists, but isAuthenticated() returns false

**Check console logs:**
- Look for: `[OAuth Debug] Storage result:`
- Is it empty or does it have the token?

**Possible cause:** Storage key mismatch

**Solution:** Verify storage key is consistent:
```javascript
// In console after saving token
const oauth = new GitHubOAuth();
console.log('Storage key:', oauth.storageKey);
// Should be: "githubOAuthToken"
```

### Issue 3: Token Retrieved But getUserInfo() Fails
**Symptom:** Token exists but user info fails

**Check console:**
- Look for: `[OAuth Debug] User info response:`
- Is it `null`?

**Possible causes:**
- Token invalid
- GitHub API rate limit
- Wrong authorization header format

**Solution:** Test the token manually:
```javascript
const oauth = new GitHubOAuth();
const token = await oauth.getAccessToken();
console.log('Token:', token);

// Test it directly
const response = await fetch('https://api.github.com/user', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github.v3+json'
  }
});
console.log('Status:', response.status);
console.log('Response:', await response.json());
```

If status is 401: Token is invalid
If status is 200: Token works but something else is wrong

### Issue 4: chrome.storage.sync Size Limit
**Symptom:** Token sometimes saves, sometimes doesn't

**Check quota:**
```javascript
chrome.storage.sync.getBytesInUse(null, (bytes) => {
  console.log('Sync storage used:', bytes, 'bytes');
  console.log('Max:', chrome.storage.sync.QUOTA_BYTES, 'bytes');
});
```

**Solution if over quota:** Use chrome.storage.local instead
- Line 22: Change storage location
- Or clear old data

## Common Fixes

### Fix 1: Switch to Local Storage
Edit `github-oauth.js`:

```javascript
// Around line 76-78 in isAuthenticated()
// Change FROM:
const result = await chrome.storage.sync.get([this.storageKey]);

// Change TO:
const result = await chrome.storage.local.get([this.storageKey]);
```

```javascript
// Around line 327-330 in pollForToken()
// Change FROM:
await chrome.storage.sync.set({
  [this.storageKey]: tokenData
});

// Change TO:
await chrome.storage.local.set({
  [this.storageKey]: tokenData
});
```

```javascript
// Around line 381 in revokeAccess()
// Change FROM:
await chrome.storage.sync.remove([this.storageKey]);

// Change TO:
await chrome.storage.local.remove([this.storageKey]);
```

### Fix 2: Add Retry Logic
If token retrieval is flaky:

```javascript
async isAuthenticated() {
  for (let i = 0; i < 3; i++) {
    try {
      const result = await chrome.storage.sync.get([this.storageKey]);
      if (result[this.storageKey]) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Retry', i, error);
    }
  }
  return false;
}
```

## Expected Console Output

### On First Authorization
```
Starting GitHub Device Flow...
Device code obtained. User code: ABCD-1234
[User enters code on GitHub]
[OAuth Debug] ✓ Access token received from GitHub
[OAuth Debug] Saving token to storage with key: githubOAuthToken
[OAuth Debug] Token saved successfully
[OAuth Debug] Verification - token in storage: true
```

### On Extension Reload (Should Remember)
```
[OAuth Debug] Getting OAuth status...
[OAuth Debug] Checking authentication...
[OAuth Debug] Has token: true
[OAuth Debug] ✓ User authenticated as: yourusername
```

### On Extension Reload (If Broken)
```
[OAuth Debug] Getting OAuth status...
[OAuth Debug] Checking authentication...
[OAuth Debug] Has token: false
[OAuth Debug] Not authenticated, returning false
```

If you see the "broken" output, run `oauth.inspectStorage()` to see if token actually exists.

## Next Steps

1. Follow debug steps above
2. Share console output
3. We'll identify exact failure point
4. Apply appropriate fix

The debug logging will tell us exactly where the flow breaks!
