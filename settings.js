// Settings page logic

class SettingsManager {
  constructor() {
    this.gistUploader = new GistUploader();
    this.githubOAuth = new GitHubOAuth();
    this.pollingInterval = null;
    this.pollingIntervalMs = 5000; // Start with 5 seconds
    this.init();
  }

  async init() {
    // Load current OAuth status
    await this.updateOAuthStatus();

    // Load current token status (manual)
    await this.updateTokenStatus();

    // Load storage info
    await this.updateStorageInfo();

    // Setup event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    // OAuth Connect button
    document.getElementById('connect-oauth-btn')?.addEventListener('click', () => {
      this.startOAuthFlow();
    });

    // OAuth Disconnect button
    document.getElementById('disconnect-github-btn')?.addEventListener('click', () => {
      this.disconnectGitHub();
    });

    // Cancel device flow button
    document.getElementById('cancel-device-flow-btn')?.addEventListener('click', () => {
      this.cancelDeviceFlow();
    });

    // Manual token - Validate token button
    document.getElementById('validate-token-btn').addEventListener('click', () => {
      this.validateToken();
    });

    // Manual token - Save token button
    document.getElementById('save-token-btn').addEventListener('click', () => {
      this.saveToken();
    });

    // Manual token - Clear token button
    document.getElementById('clear-token-btn').addEventListener('click', () => {
      this.clearToken();
    });

    // Show/hide token toggle
    const tokenInput = document.getElementById('github-token');
    tokenInput.addEventListener('focus', () => {
      tokenInput.type = 'text';
    });
    tokenInput.addEventListener('blur', () => {
      if (tokenInput.value) {
        tokenInput.type = 'password';
      }
    });
  }

  async updateOAuthStatus() {
    try {
      const tokenSource = await this.gistUploader.getTokenSource();
      const oauthStatus = document.getElementById('oauth-status');
      const oauthConnected = document.getElementById('oauth-connected');
      const oauthDisconnected = document.getElementById('oauth-disconnected');

      if (tokenSource === 'oauth') {
        // Get OAuth status
        const status = await this.githubOAuth.getStatus();

        if (status.authenticated) {
          // Show connected state
          oauthStatus.style.display = 'none';
          oauthConnected.style.display = 'block';
          oauthDisconnected.style.display = 'none';

          // Update username
          document.getElementById('github-username').textContent = status.username || 'Unknown';

          // Update avatar if available
          if (status.avatarUrl) {
            const avatar = document.getElementById('github-avatar');
            avatar.src = status.avatarUrl;
            avatar.style.display = 'block';
          }

          // Update source label
          document.getElementById('token-source-label').textContent = 'Using OAuth authentication';
        } else {
          // Not connected
          this.showOAuthDisconnected();
        }
      } else if (tokenSource === 'manual') {
        // Show as connected but with manual token
        oauthStatus.style.display = 'none';
        oauthConnected.style.display = 'block';
        oauthDisconnected.style.display = 'none';

        // Get username from manual token validation
        const token = await this.gistUploader.getToken();
        const validation = await this.gistUploader.validateToken(token);

        if (validation.valid) {
          document.getElementById('github-username').textContent = validation.username || 'Unknown';
          document.getElementById('token-source-label').textContent = 'Using manual Personal Access Token';
        }

      } else {
        // Not connected at all
        this.showOAuthDisconnected();
      }

    } catch (error) {
      console.error('Error updating OAuth status:', error);
      this.showOAuthDisconnected();
    }
  }

  showOAuthDisconnected() {
    document.getElementById('oauth-status').style.display = 'block';
    document.getElementById('oauth-connected').style.display = 'none';
    document.getElementById('oauth-disconnected').style.display = 'block';
  }

  async startOAuthFlow() {
    const btn = document.getElementById('connect-oauth-btn');
    btn.disabled = true;
    btn.textContent = 'Connecting...';

    try {
      // Initiate OAuth device flow
      const result = await this.githubOAuth.initiateOAuth();

      if (result.success && result.step === 'awaiting_authorization') {
        // Show device code section
        this.showDeviceCodeSection(result.userPrompt);

        // Start polling
        this.startPolling();
      } else {
        throw new Error(result.error || 'Failed to start OAuth');
      }

    } catch (error) {
      console.error('OAuth error:', error);
      alert('Failed to connect: ' + error.message);
      btn.disabled = false;
      btn.textContent = 'Connect with GitHub';
    }
  }

  showDeviceCodeSection(userPrompt) {
    // Hide connect button
    document.getElementById('connect-oauth-btn').parentElement.style.display = 'none';

    // Show device code section
    const deviceCodeSection = document.getElementById('device-code-section');
    deviceCodeSection.style.display = 'block';

    // Display code and link
    document.getElementById('device-code-display').textContent = userPrompt.userCode;
    document.getElementById('github-verification-link').href = userPrompt.verificationUri;

    console.log('Device code:', userPrompt.userCode);
  }

  async startPolling(pollImmediately = true) {
    // Poll at the current interval (default 5s, but can increase if GitHub says slow_down)
    this.pollingInterval = setInterval(async () => {
      await this.pollForToken();
    }, this.pollingIntervalMs);

    // Check immediately on first start, but not when restarting due to slow_down
    if (pollImmediately) {
      await this.pollForToken();
    }
  }

  async pollForToken() {
    try {
      const result = await this.githubOAuth.pollForToken();
      const pollingMessage = document.getElementById('polling-message');

      if (result.success && result.status === 'authorized') {
        // Success!
        this.stopPolling();
        this.hideDeviceCodeSection();

        // Update UI
        await this.updateOAuthStatus();

        // Show success message
        alert(`Successfully connected as ${result.username}!`);

      } else if (result.status === 'pending') {
        pollingMessage.textContent = 'Waiting for authorization...';

      } else if (result.status === 'slow_down') {
        // Polling too fast, GitHub told us to slow down
        const newInterval = result.interval || 10; // GitHub suggests new interval
        console.log(`[Settings] ⚠️ Polling too fast. Slowing down from ${this.pollingIntervalMs / 1000}s to ${newInterval}s`);

        // Update interval and restart polling WITHOUT polling immediately
        this.pollingIntervalMs = newInterval * 1000;
        this.stopPolling();
        this.startPolling(false); // false = don't poll immediately

        pollingMessage.textContent = `Waiting ${newInterval}s before next check...`;

      } else if (result.status === 'expired' || result.status === 'denied') {
        this.stopPolling();
        this.hideDeviceCodeSection();
        alert(result.message || 'Authorization failed');

      } else if (result.status === 'error') {
        this.stopPolling();
        this.hideDeviceCodeSection();
        alert('Error: ' + (result.error || 'Unknown error'));
      }

    } catch (error) {
      console.error('Polling error:', error);
      this.stopPolling();
      this.hideDeviceCodeSection();
      alert('Connection error: ' + error.message);
    }
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  hideDeviceCodeSection() {
    // Hide device code section
    document.getElementById('device-code-section').style.display = 'none';

    // Show connect button again
    const connectBtn = document.getElementById('connect-oauth-btn');
    connectBtn.parentElement.style.display = 'block';
    connectBtn.disabled = false;
    connectBtn.textContent = 'Connect with GitHub';
  }

  cancelDeviceFlow() {
    this.stopPolling();
    this.hideDeviceCodeSection();
  }

  async disconnectGitHub() {
    if (!confirm('Disconnect from GitHub? You can always reconnect later.')) {
      return;
    }

    try {
      // Clear OAuth token
      await this.githubOAuth.revokeAccess();

      // Clear manual token too (if any)
      await this.gistUploader.clearToken();

      // Update UI
      await this.updateOAuthStatus();
      await this.updateTokenStatus();

      alert('Disconnected from GitHub. You can reconnect anytime.');

    } catch (error) {
      console.error('Disconnect error:', error);
      alert('Error disconnecting: ' + error.message);
    }
  }

  async updateTokenStatus() {
    const hasToken = await this.gistUploader.hasToken();
    const statusEl = document.getElementById('token-status');
    const clearBtn = document.getElementById('clear-token-btn');

    if (hasToken) {
      const token = await this.gistUploader.getToken();

      // Validate the existing token
      const validation = await this.gistUploader.validateToken(token);

      if (validation.valid) {
        statusEl.className = 'token-status configured';
        statusEl.textContent = `✓ Connected as ${validation.username}`;
        clearBtn.style.display = 'inline-block';

        // Optionally pre-fill (masked)
        document.getElementById('github-token').placeholder = '••••••••••••••••••••••••••••••••••••••••';
      } else {
        statusEl.className = 'token-status not-configured';
        statusEl.textContent = '⚠️ Token invalid or expired';
        clearBtn.style.display = 'inline-block';
      }
    } else {
      statusEl.className = 'token-status not-configured';
      statusEl.textContent = '⚠️ No GitHub token configured';
      clearBtn.style.display = 'none';
    }
  }

  async updateStorageInfo() {
    try {
      const result = await chrome.storage.local.getBytesInUse(null);
      const usedMB = (result / (1024 * 1024)).toFixed(2);
      const limitMB = 5; // Chrome default limit
      const percentage = ((result / (limitMB * 1024 * 1024)) * 100).toFixed(1);

      document.getElementById('storage-used').textContent =
        `${usedMB} MB / ${limitMB} MB (${percentage}%)`;

      // Get recordings count
      const recordings = await chrome.runtime.sendMessage({ action: 'getRecordings' });
      const count = recordings.recordings ? recordings.recordings.length : 0;
      document.getElementById('recordings-count').textContent = count;

    } catch (error) {
      console.error('Error getting storage info:', error);
      document.getElementById('storage-used').textContent = 'Error loading';
      document.getElementById('recordings-count').textContent = 'Error loading';
    }
  }

  async validateToken() {
    const tokenInput = document.getElementById('github-token');
    const messageEl = document.getElementById('token-message');
    const validateBtn = document.getElementById('validate-token-btn');

    const token = tokenInput.value.trim();

    if (!token) {
      this.showMessage('error', 'Please enter a token first');
      return;
    }

    // Disable button and show loading
    validateBtn.disabled = true;
    validateBtn.textContent = 'Validating...';
    messageEl.style.display = 'none';

    // Validate
    const result = await this.gistUploader.validateToken(token);

    // Re-enable button
    validateBtn.disabled = false;
    validateBtn.textContent = 'Validate Token';

    if (result.valid) {
      this.showMessage('success', `✓ Token is valid! Connected as ${result.username} (${result.name || 'No name'})`);
    } else {
      this.showMessage('error', `✗ Token validation failed: ${result.error}`);
    }
  }

  async saveToken() {
    const tokenInput = document.getElementById('github-token');
    const messageEl = document.getElementById('token-message');
    const saveBtn = document.getElementById('save-token-btn');

    const token = tokenInput.value.trim();

    if (!token) {
      this.showMessage('error', 'Please enter a token first');
      return;
    }

    // Disable button and show loading
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    messageEl.style.display = 'none';

    // Validate before saving
    const validation = await this.gistUploader.validateToken(token);

    if (!validation.valid) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Token';
      this.showMessage('error', `Cannot save invalid token: ${validation.error}`);
      return;
    }

    // Save token
    const result = await this.gistUploader.saveToken(token);

    // Re-enable button
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Token';

    if (result.success) {
      this.showMessage('success', `✓ Token saved successfully! Connected as ${validation.username}`);

      // Clear input
      tokenInput.value = '';
      tokenInput.type = 'password';

      // Update status
      await this.updateTokenStatus();
    } else {
      this.showMessage('error', `✗ Failed to save token: ${result.error}`);
    }
  }

  async clearToken() {
    if (!confirm('Are you sure you want to remove your GitHub token? You can always add it back later.')) {
      return;
    }

    const messageEl = document.getElementById('token-message');
    const clearBtn = document.getElementById('clear-token-btn');

    // Disable button and show loading
    clearBtn.disabled = true;
    clearBtn.textContent = 'Clearing...';
    messageEl.style.display = 'none';

    // Clear token
    const result = await this.gistUploader.clearToken();

    // Re-enable button
    clearBtn.disabled = false;
    clearBtn.textContent = 'Clear Token';

    if (result.success) {
      this.showMessage('info', 'Token removed. You can add a new one anytime.');

      // Clear input
      document.getElementById('github-token').value = '';

      // Update status
      await this.updateTokenStatus();
    } else {
      this.showMessage('error', `Failed to clear token: ${result.error}`);
    }
  }

  showMessage(type, text) {
    const messageEl = document.getElementById('token-message');
    messageEl.className = `status-message ${type}`;
    messageEl.textContent = text;
    messageEl.style.display = 'block';

    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
      setTimeout(() => {
        messageEl.style.display = 'none';
      }, 5000);
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new SettingsManager());
} else {
  new SettingsManager();
}
