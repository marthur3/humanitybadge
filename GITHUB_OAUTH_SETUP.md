# GitHub OAuth Setup Guide - Register Your OAuth App

## Why This is Needed

The extension currently shows: **"GitHub sign-in is not available"**

This is because you need to register a GitHub OAuth App to enable the GitHub integration feature.

**Don't worry - this is standard practice!** GitHub CLI, VS Code, Vercel, and all professional GitHub integrations work this way.

## What You're Setting Up

- **ONE** GitHub OAuth App (takes 5 minutes)
- **ALL** your users will authorize this app with their GitHub accounts
- Each user gets their own access token (secure and isolated)
- Your users get professional `gist.github.com/username/abc123` URLs

## Step-by-Step Instructions

### Step 1: Go to GitHub Developer Settings

Open this URL in your browser:
```
https://github.com/settings/developers
```

### Step 2: Create New OAuth App

1. Click the **"New OAuth App"** button (green button, top right)
2. You'll see a form titled "Register a new OAuth application"

### Step 3: Fill in the Form

**Application name:**
```
Humanity Badge
```
(Or any name you prefer)

**Homepage URL:**
```
https://github.com/yourusername/humanitybadge
```
(Use your actual repository URL, or your personal website)

**Application description:** (Optional)
```
Browser extension that verifies authentic human typing with anti-paste protection
```

**Authorization callback URL:**
```
http://localhost
```
**Important:** For GitHub Device Flow, this field is **required but not used**. Just enter `http://localhost` - it won't actually be called.

### Step 4: Register the Application

Click the **"Register application"** button at the bottom of the form.

### Step 5: Copy Your Client ID

After registering, you'll see your OAuth app details page.

You'll see:
- **Client ID:** A string like `Ov23liABCDEF1234567` (this is what you need!)
- **Client secrets:** (ignore this - we don't need it for Device Flow)

**Copy your Client ID** - you'll need it in the next step.

### Step 6: Update the Extension Code

1. Open `github-oauth.js` in your code editor
2. Find line 17 (in the constructor)
3. Replace this:
   ```javascript
   this.clientId = 'YOUR_GITHUB_OAUTH_CLIENT_ID';
   ```

   With your actual Client ID:
   ```javascript
   this.clientId = 'Ov23liABCDEF1234567';  // Your real Client ID here
   ```

4. Save the file

### Step 7: Reload the Extension

1. Go to `chrome://extensions/`
2. Find "Humanity Badge"
3. Click the **reload** button (circular arrow icon)

### Step 8: Test It!

1. Click the extension icon
2. Onboarding should appear
3. Click **"Connect with GitHub"**
4. You should see a device code (e.g., "ABCD-1234")
5. Click the GitHub link
6. Enter the code on GitHub.com
7. Authorize the app
8. Extension should auto-detect and say "Connected!"

**If it works:** ✅ You're done! All users can now sign in with GitHub!

**If you see errors:** Check the browser console (F12) for details - the improved error messages will help debug.

## What Happens After Setup

### For You:
- ✅ OAuth is configured
- ✅ Extension works with GitHub Gist
- ✅ Ready to publish

### For Your Users:
- They install the extension
- Click "Connect with GitHub"
- Authorize YOUR app (one-time)
- Get professional Gist URLs
- Super simple!

## Security Notes

### Is it Safe to Share the Client ID?

**YES!** The Client ID is designed to be public. It will be embedded in your extension code and visible to anyone who inspects it.

**This is normal and secure because:**
- Client ID is public by design (like an API key that's meant to be shared)
- GitHub Device Flow doesn't use a client_secret (so nothing sensitive to leak)
- Each user authorizes individually with their own GitHub account
- Each user gets their own isolated access token

### How GitHub CLI Does It

GitHub's own CLI tool has their Client ID publicly visible in the source code:
```
https://github.com/cli/cli/blob/trunk/pkg/cmd/auth/login.go
```

Your implementation is the same pattern!

## Troubleshooting

### "Application name has already been taken"

The name "Humanity Badge" might be taken by someone else. Try:
- `Humanity Badge Extension`
- `Humanity Badge - Your Name`
- Any unique name you want

### "Invalid Client ID"

After updating `github-oauth.js`:
1. Make sure you saved the file
2. Reload the extension in chrome://extensions/
3. Clear browser cache if needed
4. Check the Client ID has no typos

### Still Getting "GitHub sign-in is not available"

Check the browser console:
1. Open DevTools (F12)
2. Go to Console tab
3. Look for: `⚠️  GitHub OAuth not configured`
4. This means the Client ID validation failed

Common reasons:
- Client ID is still `YOUR_GITHUB_OAUTH_CLIENT_ID`
- Client ID has typos
- File wasn't saved
- Extension wasn't reloaded

## Alternative: Skip OAuth and Use Manual Tokens

If you don't want to set up OAuth, users can still use the extension with manual Personal Access Tokens:

1. Leave `github-oauth.js` as-is (with `YOUR_GITHUB_OAUTH_CLIENT_ID`)
2. Extension will detect OAuth is not configured
3. Users can go to Settings → Advanced → Manual token entry
4. Users create their own GitHub token at https://github.com/settings/tokens
5. Still works great!

**Pros:** No OAuth app needed
**Cons:** Users must manually create tokens (higher friction)

## Summary

1. ✅ Register GitHub OAuth App at https://github.com/settings/developers
2. ✅ Copy your Client ID
3. ✅ Update `github-oauth.js` line 17
4. ✅ Reload extension
5. ✅ Test - should work!

**Estimated time:** 5-10 minutes

**Questions?** Check the console logs - they'll show exactly what's wrong.
