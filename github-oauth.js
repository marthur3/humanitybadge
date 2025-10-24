// GitHub OAuth integration using Device Flow for Humanity Badge
// Device Flow is perfect for browser extensions (no client_secret needed)
// Docs: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow

class GitHubOAuth {
  constructor() {
    // SETUP: Register your GitHub OAuth App at https://github.com/settings/developers
    // Instructions: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app
    // 1. Go to https://github.com/settings/developers
    // 2. Click "New OAuth App"
    // 3. Fill in:
    //    - Application name: "Humanity Badge"
    //    - Homepage URL: Your repo or website
    //    - Callback URL: http://localhost (not used by Device Flow)
    // 4. Click "Register application"
    // 5. Copy your Client ID and paste below:
    this.clientId = 'Ov23ctzXIYPS1Am2Otdm';

    this.deviceCodeEndpoint = 'https://github.com/login/device/code';
    this.tokenEndpoint = 'https://github.com/login/oauth/access_token';
    this.scope = 'gist';
    this.storageKey = 'githubOAuthToken';

    // Validate Client ID configuration
    this.isConfigured = this.validateClientId();
    if (!this.isConfigured) {
      console.warn('⚠️  GitHub OAuth not configured. Users will need to use manual Personal Access Tokens.');
      console.warn('📖 Setup guide: See comments in github-oauth.js or visit https://github.com/settings/developers');
    }
  }

  /**
   * Validate that Client ID is properly configured
   */
  validateClientId() {
    if (!this.clientId) return false;
    if (this.clientId === 'YOUR_GITHUB_OAUTH_CLIENT_ID') return false;
    if (this.clientId.startsWith('YOUR_')) return false;
    if (this.clientId.length < 10) return false;
    return true;
  }

  /**
   * Check if OAuth is available (Client ID configured)
   */
  isOAuthAvailable() {
    return this.isConfigured;
  }


  /**
   * Check if user is authenticated via OAuth
   */
  async isAuthenticated() {
    try {
      console.log('[OAuth Debug] Checking authentication...');
      console.log('[OAuth Debug] Storage key:', this.storageKey);

      const result = await chrome.storage.sync.get([this.storageKey]);
      console.log('[OAuth Debug] Storage result:', result);

      const hasToken = !!(result[this.storageKey] && result[this.storageKey].access_token);
      console.log('[OAuth Debug] Has token:', hasToken);

      if (hasToken) {
        console.log('[OAuth Debug] Token found, created at:', new Date(result[this.storageKey].created_at));
      }

      return hasToken;
    } catch (error) {
      console.error('[OAuth Debug] Error checking authentication:', error);
      return false;
    }
  }

  /**
   * Get stored OAuth access token
   * Automatically refreshes if expired (GitHub Apps)
   */
  async getAccessToken() {
    try {
      const result = await chrome.storage.sync.get([this.storageKey]);
      const tokenData = result[this.storageKey];

      if (!tokenData || !tokenData.access_token) {
        return null;
      }

      // Check if token is expired (GitHub Apps only)
      if (tokenData.expires_at) {
        const now = Date.now();
        const timeUntilExpiry = tokenData.expires_at - now;

        // If token expires in less than 5 minutes, refresh it
        if (timeUntilExpiry < 5 * 60 * 1000) {
          console.log('[OAuth Debug] Token expired or expiring soon, refreshing...');
          const refreshResult = await this.refreshAccessToken();

          if (refreshResult.success) {
            // Get the new token
            const newResult = await chrome.storage.sync.get([this.storageKey]);
            return newResult[this.storageKey]?.access_token || null;
          } else {
            console.error('[OAuth Debug] Token refresh failed, returning expired token');
            // Return the expired token anyway, let the API call fail and trigger re-auth
            return tokenData.access_token;
          }
        }
      }

      return tokenData.access_token;
    } catch (error) {
      console.error('Error getting OAuth token:', error);
      return null;
    }
  }

  /**
   * Get user info from GitHub API using OAuth token
   */
  async getUserInfo(token) {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.ok) {
        return await response.json();
      } else {
        console.error('Failed to get user info:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error getting user info:', error);
      return null;
    }
  }

  /**
   * Initiate OAuth flow using GitHub Device Flow
   * This is perfect for browser extensions - no client_secret needed!
   * Returns access token or null if user cancels/fails
   */
  async initiateOAuth() {
    try {
      // Check if OAuth is configured
      if (!this.isConfigured) {
        return {
          success: false,
          error: 'OAUTH_NOT_CONFIGURED',
          message: 'GitHub OAuth is not set up. Please use manual Personal Access Token instead, or contact the extension developer to set up OAuth.',
          userMessage: 'GitHub sign-in is not available. Please use the manual token option in Settings.'
        };
      }

      console.log('Starting GitHub Device Flow...');

      // Step 1: Request device and user codes
      const deviceCodeData = await this.requestDeviceCode();

      if (!deviceCodeData || !deviceCodeData.device_code) {
        throw new Error('Failed to get device code');
      }

      const {
        device_code,
        user_code,
        verification_uri,
        expires_in,
        interval
      } = deviceCodeData;

      console.log('Device code obtained. User code:', user_code);

      // Step 2: Show user code and verification URL
      // Return this to UI so it can display to user
      const userPrompt = {
        userCode: user_code,
        verificationUri: verification_uri,
        expiresIn: expires_in
      };

      // Store device_code for polling
      await chrome.storage.local.set({
        'oauth_device_code': device_code,
        'oauth_polling_interval': interval,
        'oauth_expires_at': Date.now() + (expires_in * 1000)
      });

      return {
        success: true,
        step: 'awaiting_authorization',
        userPrompt: userPrompt
      };

    } catch (error) {
      console.error('OAuth flow error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Request device code from GitHub
   */
  async requestDeviceCode() {
    try {
      const response = await fetch(this.deviceCodeEndpoint, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: this.clientId,
          scope: this.scope
        })
      });

      const data = await response.json();

      if (response.ok) {
        return data;
      } else {
        // GitHub returned an error - log details for debugging
        console.error('GitHub Device Code Error:', {
          status: response.status,
          error: data.error,
          description: data.error_description,
          message: data.message
        });

        // Throw detailed error
        const errorMsg = data.error_description || data.message || data.error || `HTTP ${response.status}`;
        throw new Error(`GitHub OAuth Error: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Error requesting device code:', error);
      throw error; // Propagate error instead of returning null
    }
  }

  /**
   * Poll for access token after user authorizes
   * Call this after user has visited verification_uri and entered user_code
   */
  async pollForToken() {
    try {
      const stored = await chrome.storage.local.get([
        'oauth_device_code',
        'oauth_polling_interval',
        'oauth_expires_at'
      ]);

      const deviceCode = stored.oauth_device_code;
      const interval = stored.oauth_polling_interval || 5;
      const expiresAt = stored.oauth_expires_at;

      if (!deviceCode) {
        throw new Error('No device code found. Start OAuth flow first.');
      }

      if (Date.now() > expiresAt) {
        await chrome.storage.local.remove([
          'oauth_device_code',
          'oauth_polling_interval',
          'oauth_expires_at'
        ]);
        throw new Error('Device code expired. Please try again.');
      }

      console.log('Polling for token...');

      // Poll GitHub for token
      const response = await fetch(this.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: this.clientId,
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        })
      });

      const data = await response.json();

      // Log raw response for debugging
      console.log('[OAuth Debug] Poll response status:', response.status);
      console.log('[OAuth Debug] Poll response data:', JSON.stringify(data, null, 2));

      if (data.error) {
        console.log('[OAuth Debug] Error in response:', data.error);

        if (data.error === 'authorization_pending') {
          // User hasn't authorized yet, continue polling
          return {
            success: false,
            status: 'pending',
            message: 'Waiting for user to authorize...'
          };
        } else if (data.error === 'slow_down') {
          // We're polling too fast - GitHub tells us the new interval to use
          console.log('[OAuth Debug] ⚠️  Polling too fast. GitHub suggests interval:', data.interval, 'seconds');
          return {
            success: false,
            status: 'slow_down',
            interval: data.interval || 10, // GitHub specifies new interval in response
            message: `Polling too fast, slowing down to ${data.interval || 10}s intervals...`
          };
        } else if (data.error === 'expired_token') {
          // Device code expired
          await chrome.storage.local.remove([
            'oauth_device_code',
            'oauth_polling_interval',
            'oauth_expires_at'
          ]);
          return {
            success: false,
            status: 'expired',
            message: 'Authorization expired. Please try again.'
          };
        } else if (data.error === 'access_denied') {
          // User denied access
          await chrome.storage.local.remove([
            'oauth_device_code',
            'oauth_polling_interval',
            'oauth_expires_at'
          ]);
          return {
            success: false,
            status: 'denied',
            message: 'Authorization denied by user.'
          };
        } else if (data.error === 'device_flow_disabled') {
          // Device Flow not enabled in GitHub App settings
          await chrome.storage.local.remove([
            'oauth_device_code',
            'oauth_polling_interval',
            'oauth_expires_at'
          ]);
          console.error('[OAuth Debug] ⚠️  Device Flow is not enabled for this GitHub App');
          return {
            success: false,
            status: 'not_enabled',
            error: 'DEVICE_FLOW_DISABLED',
            message: 'Device Flow must be enabled in your GitHub App settings. Go to your app settings on GitHub and check "Enable Device Flow".',
            userMessage: 'GitHub App configuration error. Device Flow must be enabled in app settings.'
          };
        } else {
          console.error('[OAuth Debug] Unexpected error:', data.error, data.error_description);
          throw new Error(`OAuth error: ${data.error}${data.error_description ? ' - ' + data.error_description : ''}`);
        }
      }

      // Success! We have the token
      if (data.access_token) {
        console.log('[OAuth Debug] ✓ Access token received from GitHub');
        console.log('[OAuth Debug] Token type:', data.token_type);
        console.log('[OAuth Debug] Scope:', data.scope || '(empty - GitHub App)');
        console.log('[OAuth Debug] Has refresh token:', !!data.refresh_token);
        console.log('[OAuth Debug] Expires in:', data.expires_in ? `${data.expires_in}s (${data.expires_in / 3600}h)` : 'never');

        // Prepare token data (include refresh token for GitHub Apps)
        const tokenData = {
          access_token: data.access_token,
          token_type: data.token_type || 'bearer',
          scope: data.scope,
          created_at: Date.now()
        };

        // Add GitHub App specific fields if present
        if (data.refresh_token) {
          tokenData.refresh_token = data.refresh_token;
          tokenData.refresh_token_expires_in = data.refresh_token_expires_in;
        }
        if (data.expires_in) {
          tokenData.expires_in = data.expires_in;
          tokenData.expires_at = Date.now() + (data.expires_in * 1000);
        }

        console.log('[OAuth Debug] Saving token to storage with key:', this.storageKey);
        console.log('[OAuth Debug] Token data:', {
          ...tokenData,
          access_token: '***' + tokenData.access_token.slice(-4),
          refresh_token: tokenData.refresh_token ? '***' + tokenData.refresh_token.slice(-4) : undefined
        });

        // Store token
        await chrome.storage.sync.set({
          [this.storageKey]: tokenData
        });

        console.log('[OAuth Debug] Token saved successfully');

        // Verify it was saved
        const verification = await chrome.storage.sync.get([this.storageKey]);
        console.log('[OAuth Debug] Verification - token in storage:', !!verification[this.storageKey]);
        if (verification[this.storageKey]) {
          console.log('[OAuth Debug] Verification - has access_token:', !!verification[this.storageKey].access_token);
          console.log('[OAuth Debug] Verification - has refresh_token:', !!verification[this.storageKey].refresh_token);
        }

        // Get user info
        const userInfo = await this.getUserInfo(data.access_token);
        console.log('[OAuth Debug] User info retrieved:', userInfo?.login);

        // Clean up temporary storage
        await chrome.storage.local.remove([
          'oauth_device_code',
          'oauth_polling_interval',
          'oauth_expires_at'
        ]);

        console.log('[OAuth Debug] ✓ OAuth authentication successful!');

        return {
          success: true,
          status: 'authorized',
          username: userInfo?.login,
          name: userInfo?.name,
          avatarUrl: userInfo?.avatar_url
        };
      }

      // If we get here, we didn't get an access_token or an error
      console.error('[OAuth Debug] ⚠️  Unexpected response - no access_token and no error');
      console.error('[OAuth Debug] Full response:', data);
      return {
        success: false,
        status: 'unknown',
        message: 'Unexpected response from GitHub. Check console for details.'
      };

    } catch (error) {
      console.error('[OAuth Debug] Error polling for token:', error);
      return {
        success: false,
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Revoke OAuth access and clear stored token
   */
  async revokeAccess() {
    try {
      await chrome.storage.sync.remove([this.storageKey]);
      console.log('OAuth access revoked');
      return { success: true };
    } catch (error) {
      console.error('Error revoking OAuth access:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Refresh access token using refresh token (GitHub Apps only)
   * GitHub App tokens expire after 8 hours by default
   */
  async refreshAccessToken() {
    try {
      const result = await chrome.storage.sync.get([this.storageKey]);
      const tokenData = result[this.storageKey];

      if (!tokenData || !tokenData.refresh_token) {
        console.log('[OAuth Debug] No refresh token available');
        return { success: false, error: 'No refresh token' };
      }

      console.log('[OAuth Debug] Refreshing access token...');

      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: this.clientId,
          grant_type: 'refresh_token',
          refresh_token: tokenData.refresh_token
        })
      });

      const data = await response.json();

      if (data.error) {
        console.error('[OAuth Debug] Token refresh failed:', data.error);
        // If refresh fails, clear the token
        await this.revokeAccess();
        return { success: false, error: data.error };
      }

      if (data.access_token) {
        console.log('[OAuth Debug] ✓ Access token refreshed');

        // Update token data
        const newTokenData = {
          access_token: data.access_token,
          token_type: data.token_type || 'bearer',
          scope: data.scope,
          created_at: Date.now()
        };

        if (data.refresh_token) {
          newTokenData.refresh_token = data.refresh_token;
          newTokenData.refresh_token_expires_in = data.refresh_token_expires_in;
        }
        if (data.expires_in) {
          newTokenData.expires_in = data.expires_in;
          newTokenData.expires_at = Date.now() + (data.expires_in * 1000);
        }

        // Save refreshed token
        await chrome.storage.sync.set({
          [this.storageKey]: newTokenData
        });

        console.log('[OAuth Debug] Refreshed token saved');
        return { success: true };
      }

      return { success: false, error: 'No access token in response' };

    } catch (error) {
      console.error('[OAuth Debug] Error refreshing token:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Debug utility: Inspect all storage related to OAuth
   */
  async inspectStorage() {
    console.log('=== OAuth Storage Inspector ===');

    // Check sync storage
    const syncStorage = await chrome.storage.sync.get(null);
    console.log('Chrome storage.sync (all keys):', Object.keys(syncStorage));
    console.log('OAuth token key exists:', this.storageKey in syncStorage);

    if (this.storageKey in syncStorage) {
      const tokenData = syncStorage[this.storageKey];
      console.log('Token data:', {
        has_access_token: !!tokenData.access_token,
        token_type: tokenData.token_type,
        scope: tokenData.scope || '(empty - GitHub App)',
        created_at: new Date(tokenData.created_at),
        access_token_preview: tokenData.access_token ? '***' + tokenData.access_token.slice(-4) : 'null',
        // GitHub App specific fields
        has_refresh_token: !!tokenData.refresh_token,
        refresh_token_preview: tokenData.refresh_token ? '***' + tokenData.refresh_token.slice(-4) : undefined,
        expires_in: tokenData.expires_in ? `${tokenData.expires_in}s (${tokenData.expires_in / 3600}h)` : 'never',
        expires_at: tokenData.expires_at ? new Date(tokenData.expires_at) : undefined,
        is_expired: tokenData.expires_at ? Date.now() > tokenData.expires_at : false
      });
    } else {
      console.log('❌ No token found in storage');
    }

    // Check local storage for device codes
    const localStorage = await chrome.storage.local.get([
      'oauth_device_code',
      'oauth_polling_interval',
      'oauth_expires_at'
    ]);
    console.log('Local storage (device flow):', {
      has_device_code: !!localStorage.oauth_device_code,
      polling_interval: localStorage.oauth_polling_interval,
      expires_at: localStorage.oauth_expires_at ? new Date(localStorage.oauth_expires_at) : null
    });

    console.log('=== End Storage Inspector ===');

    return syncStorage;
  }

  /**
   * Get OAuth status with user info
   */
  async getStatus() {
    try {
      console.log('[OAuth Debug] Getting OAuth status...');

      const isAuth = await this.isAuthenticated();
      console.log('[OAuth Debug] Is authenticated:', isAuth);

      if (!isAuth) {
        console.log('[OAuth Debug] Not authenticated, returning false');
        return { authenticated: false };
      }

      const token = await this.getAccessToken();
      console.log('[OAuth Debug] Got access token:', token ? ('***' + token.slice(-4)) : 'null');

      if (!token) {
        console.log('[OAuth Debug] No token found despite isAuthenticated=true');
        return { authenticated: false };
      }

      console.log('[OAuth Debug] Fetching user info from GitHub...');
      const userInfo = await this.getUserInfo(token);
      console.log('[OAuth Debug] User info response:', userInfo);

      if (userInfo) {
        console.log('[OAuth Debug] ✓ User authenticated as:', userInfo.login);
        return {
          authenticated: true,
          username: userInfo.login,
          name: userInfo.name,
          avatarUrl: userInfo.avatar_url,
          method: 'oauth'
        };
      } else {
        // Token invalid, clear it
        console.log('[OAuth Debug] ⚠️  Token invalid, clearing...');
        await this.revokeAccess();
        return { authenticated: false };
      }
    } catch (error) {
      console.error('[OAuth Debug] Error getting OAuth status:', error);
      return { authenticated: false };
    }
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.GitHubOAuth = GitHubOAuth;
}

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GitHubOAuth;
}
