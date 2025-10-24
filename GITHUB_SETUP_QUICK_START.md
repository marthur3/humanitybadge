# GitHub Gist Setup - Quick Start Guide

## Why You Need This

Without a GitHub token, the extension uses **is.gd** (which works, but GitHub is better).

**Benefits of GitHub Gist:**
- ✅ Professional URLs (gist.github.com vs is.gd)
- ✅ More trusted (people trust GitHub links)
- ✅ Can view/manage all your Gists on GitHub
- ✅ More reliable than free URL shorteners

## Setup Steps (5 minutes)

### Step 1: Get GitHub Token

1. **Go to:** https://github.com/settings/tokens
2. **Click:** "Generate new token" → "Generate new token (classic)"
3. **Give it a name:** "Humanity Badge"
4. **Set expiration:** "No expiration" (or 1 year if you prefer)
5. **Select ONLY this scope:**
   - ☑️ `gist` (Create gists)
   - ☐ Leave everything else unchecked!
6. **Scroll down, click:** "Generate token"
7. **Copy the token** (starts with `ghp_` and looks like this):
   ```
   ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
   ⚠️ **Important:** Copy it now! You won't see it again.

### Step 2: Add Token to Extension

1. **Open extension popup** (click the Humanity Badge icon)
2. **Click:** ⚙️ Settings button (top right)
3. **Paste your token** in the "GitHub Personal Access Token" field
4. **Click:** "Validate Token" (optional, but recommended)
   - Should show: ✓ Token is valid! Connected as [your username]
5. **Click:** "Save Token"
   - Should show: ✓ Token saved successfully!

### Step 3: Test It

1. **Go to reddit.com** (or any site)
2. **Record a typing session**
3. **Check the share dialog:**
   - Should show: 🎯 **GitHub Gist** - Short, professional URL
   - URL should look like: `https://gist.github.com/username/abc123`

## ✅ Verification

### How to Know It's Working

**In Share Dialog:**
- You'll see a **green** banner that says:
  ```
  🎯 GitHub Gist - Short, professional URL
  ```

**Check Console:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for these messages:
   ```
   Attempting GitHub Gist upload...
   ✓ GitHub Gist upload successful: https://gist.github.com/...
   ```

### If Still Using is.gd

**You'll see a blue banner:**
```
🔗 Shortened URL (is.gd) - Works everywhere
```

**Why this happens:**
1. **No token configured** - Go to Settings and add it
2. **Invalid token** - Regenerate on GitHub
3. **GitHub API error** - Check console for errors
4. **Token missing `gist` scope** - Recreate with correct scope

## 🔍 Troubleshooting

### "Token validation failed"

**Solutions:**
1. Make sure you selected `gist` scope when creating token
2. Make sure you copied the entire token (starts with `ghp_`)
3. Try creating a new token
4. Check GitHub.com is accessible

### "Failed to upload to Gist"

**Check:**
1. Internet connection working?
2. GitHub.com accessible?
3. Token still valid? (Check https://github.com/settings/tokens)

**Fallback:**
- Extension automatically uses is.gd if GitHub fails
- Your recording is still saved and shareable

### Settings button doesn't work

1. Reload extension: chrome://extensions/ → Reload
2. Try right-clicking extension icon → Options
3. Check console for errors

## 🎯 Current Status (Without Token)

**What's Happening Now:**
- ✅ Extension working correctly
- ✅ is.gd shortening URLs automatically
- ✅ Links are shareable and work for everyone
- ⚠️ Not using GitHub Gist yet (requires token)

**What You're Getting:**
- URL: `https://is.gd/abc123`
- Length: ~20 characters
- Works: Everywhere

**What You'll Get with GitHub:**
- URL: `https://gist.github.com/username/abc123`
- Length: ~40-50 characters
- Looks: More professional
- Trust: Higher (GitHub brand)

## 📊 Comparison

| Feature | is.gd (Current) | GitHub Gist (After Setup) |
|---------|-----------------|---------------------------|
| Setup | ✅ None | ⚙️ 5 minutes one-time |
| URL Length | ~20 chars | ~45 chars |
| Professional | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| Trust Factor | Medium | High |
| Permanent | Yes | Yes |
| Can Delete | ❌ No | ✅ Yes |
| View History | ❌ No | ✅ On GitHub |

## ⚡ Quick Commands

```bash
# Check if extension sees your token
1. Open extension popup
2. Look at Settings page
3. Should show: "✓ Connected as [username]"

# Test GitHub upload manually
1. Record typing
2. Open DevTools Console (F12)
3. Look for "GitHub Gist upload successful"

# View all your Gists
https://gist.github.com/[your-username]
```

## 🎊 After Setup

Once configured, **every recording automatically:**
1. Uploads to GitHub Gist
2. Returns short professional URL
3. Appears in your GitHub Gists
4. Can be deleted from GitHub if needed

**No more steps required!** Just record and share.

## 💡 Pro Tips

**Manage Your Gists:**
- View all: https://gist.github.com/[your-username]
- Delete old ones you don't need
- Share multiple recordings without storage concerns

**Delete Local Recordings:**
- After sharing, delete from extension
- Link still works (stored on GitHub)
- Frees up local storage
- Verify unlimited posts!

**Token Security:**
- Token stored securely in Chrome
- Only has `gist` permission (safe)
- Can revoke anytime on GitHub
- Never share your token

## 🆘 Still Need Help?

1. **Check console logs:** F12 → Console tab
2. **Verify token works:** Settings → Validate Token
3. **Test without token:** Clear token, try is.gd
4. **Check GitHub status:** https://www.githubstatus.com/

The is.gd fallback means **you can share immediately** while you set up GitHub (or just keep using is.gd if you prefer)!
