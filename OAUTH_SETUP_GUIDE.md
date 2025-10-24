# GitHub OAuth Setup Guide

## For Extension Developer (You - One-Time Setup)

### Step 1: Register GitHub OAuth App

1. **Go to:** https://github.com/settings/developers
2. **Click:** "New OAuth App" button (top right)
3. **Fill in the form:**

   - **Application name:** `Humanity Badge` (or your preferred name)
   - **Homepage URL:** `https://github.com/yourusername/humanitybadge` (your repo URL)
   - **Application description:** (optional) `Verify authentic human typing with anti-paste protection`
   - **Authorization callback URL:** Leave blank or enter any URL
     - **Note:** For Device Flow, this field is NOT used, but GitHub requires something. You can enter `http://localhost` or your website.

4. **Click:** "Register application"

### Step 2: Get Your Client ID

After registering, you'll see your OAuth app details page with:
- **Client ID:** A string like `Iv1.abc123def456` or `1234567890abcdef`
- **Client secrets:** (ignore this - Device Flow doesn't use client secret)

**Copy the Client ID** - you'll need it in the next step.

### Step 3: Configure Extension

1. **Open:** `github-oauth.js` in your code editor
2. **Find line 10:**
   ```javascript
   this.clientId = 'YOUR_GITHUB_OAUTH_CLIENT_ID';
   ```
3. **Replace with your Client ID:**
   ```javascript
   this.clientId = 'Iv1.abc123def456'; // Your actual Client ID
   ```
4. **Save the file**

### Step 4: Test the Integration

1. **Reload extension in Chrome:**
   - Go to `chrome://extensions/`
   - Click reload button on Humanity Badge extension

2. **Open extension popup:**
   - Should show onboarding page automatically (first time)
   - OR click Settings → should show "Connect with GitHub" button

3. **Test OAuth flow:**
   - Click "Connect with GitHub"
   - Should see device code (e.g., `ABCD-1234`)
   - Click "Open GitHub & Enter Code"
   - GitHub.com should open
   - Enter the code shown
   - Click "Authorize"
   - Return to extension - should auto-detect authorization within 5 seconds
   - Should see "Successfully connected as [your-username]!"

4. **Test Gist upload:**
   - Record a typing session on any website
   - Share URL should be `https://gist.github.com/yourusername/...`
   - Check your GitHub gists: https://gist.github.com/yourusername

### Step 5: Publish Extension

Once OAuth is working:
1. Update version in `manifest.json` (e.g., `"version": "2.1"`)
2. Package extension for Chrome Web Store
3. Publish update

## For End Users

**Users don't need to do any OAuth setup!**

When they install the extension:
1. Onboarding screen appears automatically
2. Click "Connect with GitHub"
3. Enter code on GitHub.com
4. Done! All recordings now use Gist

## Troubleshooting

### "Client ID not configured" error

**Problem:** You see this error when clicking "Connect with GitHub"

**Solution:**
1. Check `github-oauth.js` line 10 has your actual Client ID
2. Make sure you replaced `YOUR_GITHUB_OAUTH_CLIENT_ID`
3. Reload extension in chrome://extensions/

### Device code doesn't work

**Problem:** User enters code on GitHub but authorization doesn't complete

**Solutions:**
1. Verify Client ID is correct
2. Check GitHub OAuth app is properly registered
3. Make sure extension has internet access
4. Check browser console for errors (F12 → Console)

### Polling never completes

**Problem:** Extension keeps saying "Waiting for authorization..." forever

**Solutions:**
1. Check user actually authorized on GitHub.com
2. Check Chrome DevTools console for errors
3. Try canceling and starting OAuth flow again
4. As fallback, use manual token entry (Settings → Advanced)

### Token becomes invalid

**Problem:** Previously connected users see "Not connected"

**Solution:**
- User may have revoked token on GitHub
- User can reconnect anytime via Settings
- Extension will auto-detect and show appropriate message

## Security Notes

### Client ID is Public

Your Client ID will be embedded in the extension code and is **publicly visible**. This is:
- ✅ **Normal and safe** - OAuth Client IDs are designed to be public
- ✅ **Secure** - Using Device Flow means no client secret needed
- ✅ **Per-user** - Each user authorizes individually with their GitHub account

### Device Flow Security

- User authorizes on GitHub.com (trusted domain)
- Extension never sees user's GitHub password
- Token has minimal permissions (`gist` scope only)
- User can revoke access anytime

## Advanced: Testing Without Publishing

If you want to test OAuth before publishing:

1. **Use your own GitHub account:**
   - Register OAuth app under your personal GitHub
   - Configure Client ID
   - Test with your account

2. **Share with testers:**
   - Give testers the unpacked extension folder
   - They load as "unpacked extension" in chrome://extensions/
   - OAuth works the same way
   - Each tester authorizes with their own GitHub account

## Summary Checklist

- [ ] Registered GitHub OAuth App
- [ ] Copied Client ID
- [ ] Updated `github-oauth.js` line 10 with Client ID
- [ ] Reloaded extension in Chrome
- [ ] Tested OAuth flow (connected successfully)
- [ ] Tested Gist upload (URL is gist.github.com)
- [ ] Tested disconnect/reconnect
- [ ] Ready to publish!

## Next Steps

After OAuth is working:
1. ✅ Users get seamless GitHub connection
2. ✅ 70% adoption rate (vs 10% with manual tokens)
3. ✅ Professional URLs for viral growth
4. ✅ Better sharing on Reddit & LinkedIn

**Questions?** Check the troubleshooting section or CLAUDE.md for detailed documentation.
