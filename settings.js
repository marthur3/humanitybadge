class SettingsManager {
  constructor() {
    this.gistUploader = new GistUploader();
    this.githubOAuth = new GitHubOAuth();
    this.pollingInterval = null;
    this.pollingIntervalMs = 5000;
    this.init();
  }

  async init() {
    await this.updateOAuthStatus();
    await this.updateTokenStatus();
    await this.updateStorageInfo();
    this.setupEventListeners();
  }

  setupEventListeners() {
    document.getElementById('connect-oauth-btn')?.addEventListener('click', () => {
      this.startOAuthFlow();
    });

    document.getElementById('disconnect-github-btn')?.addEventListener('click', () => {
      this.disconnectGitHub();
    });

    document.getElementById('cancel-device-flow-btn')?.addEventListener('click', () => {
      this.cancelDeviceFlow();
    });

    document.getElementById('validate-token-btn').addEventListener('click', () => {
      this.validateToken();
    });

    document.getElementById('save-token-btn').addEventListener('click', () => {
      this.saveToken();
    });

    document.getElementById('clear-token-btn').addEventListener('click', () => {
      this.clearToken();
    });

    const tokenInput = document.getElementById('github-token');
    tokenInput.addEventListener('focus', () => { tokenInput.type = 'text'; });
    tokenInput.addEventListener('blur', () => {
      if (tokenInput.value) tokenInput.type = 'password';
    });
  }

  async updateOAuthStatus() {
    try {
      const tokenSource = await this.gistUploader.getTokenSource();
      const oauthStatus = document.getElementById('oauth-status');
      const oauthConnected = document.getElementById('oauth-connected');
      const oauthDisconnected = document.getElementById('oauth-disconnected');

      if (tokenSource === 'oauth') {
        const status = await this.githubOAuth.getStatus();

        if (status.authenticated) {
          oauthStatus.className = 'status-chip connected';
          oauthStatus.innerHTML = '<span style="font-size:16px">&#9679;</span> Connected';
          oauthConnected.style.display = 'block';
          oauthDisconnected.style.display = 'none';

          document.getElementById('github-username').textContent = status.username || 'Unknown';
          document.getElementById('token-source-label').textContent = 'OAuth authentication';

          if (status.avatarUrl) {
            const avatar = document.getElementById('github-avatar');
            avatar.src = status.avatarUrl;
            avatar.style.display = 'block';
          }
        } else {
          this.showOAuthDisconnected();
        }
      } else if (tokenSource === 'manual') {
        const token = await this.gistUploader.getToken();
        const validation = await this.gistUploader.validateToken(token);

        if (validation.valid) {
          oauthStatus.className = 'status-chip connected';
          oauthStatus.innerHTML = '<span style="font-size:16px">&#9679;</span> Connected';
          oauthConnected.style.display = 'block';
          oauthDisconnected.style.display = 'none';

          document.getElementById('github-username').textContent = validation.username || 'Unknown';
          document.getElementById('token-source-label').textContent = 'Personal Access Token';
        } else {
          this.showOAuthDisconnected();
        }
      } else {
        this.showOAuthDisconnected();
      }
    } catch (error) {
      console.error('Error updating OAuth status:', error);
      this.showOAuthDisconnected();
    }
  }

  showOAuthDisconnected() {
    document.getElementById('oauth-status').className = 'status-chip disconnected';
    document.getElementById('oauth-status').innerHTML = '<span style="font-size:16px">&#9679;</span> Not connected';
    document.getElementById('oauth-connected').style.display = 'none';
    document.getElementById('oauth-disconnected').style.display = 'block';
  }

  async startOAuthFlow() {
    const btn = document.getElementById('connect-oauth-btn');
    btn.disabled = true;
    btn.textContent = 'Connecting...';

    try {
      const result = await this.githubOAuth.initiateOAuth();

      if (result.success && result.step === 'awaiting_authorization') {
        this.showDeviceCodeSection(result.userPrompt);
        this.startPolling();
      } else {
        throw new Error(result.userMessage || result.error || 'Failed to start OAuth');
      }
    } catch (error) {
      console.error('OAuth error:', error);
      this.showAlert('token-message', 'error', error.message);
      btn.disabled = false;
      btn.textContent = 'Connect with GitHub';
    }
  }

  showDeviceCodeSection(userPrompt) {
    document.getElementById('connect-oauth-btn').style.display = 'none';

    const section = document.getElementById('device-code-section');
    section.style.display = 'block';
    document.getElementById('device-code-display').textContent = userPrompt.userCode;
    document.getElementById('github-verification-link').href = userPrompt.verificationUri;
  }

  async startPolling(pollImmediately = true) {
    this.pollingInterval = setInterval(async () => {
      await this.pollForToken();
    }, this.pollingIntervalMs);

    if (pollImmediately) {
      await this.pollForToken();
    }
  }

  async pollForToken() {
    try {
      const result = await this.githubOAuth.pollForToken();
      const pollingMessage = document.getElementById('polling-message');

      if (result.success && result.status === 'authorized') {
        this.stopPolling();
        this.hideDeviceCodeSection();
        await this.updateOAuthStatus();
      } else if (result.status === 'pending') {
        pollingMessage.textContent = 'Waiting for authorization...';
      } else if (result.status === 'slow_down') {
        const newInterval = result.interval || 10;
        this.pollingIntervalMs = newInterval * 1000;
        this.stopPolling();
        this.startPolling(false);
        pollingMessage.textContent = `Retrying in ${newInterval}s...`;
      } else if (result.status === 'expired' || result.status === 'denied') {
        this.stopPolling();
        this.hideDeviceCodeSection();
        this.showAlert('token-message', 'error', result.message || 'Authorization failed');
      } else if (result.status === 'error') {
        this.stopPolling();
        this.hideDeviceCodeSection();
        this.showAlert('token-message', 'error', result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Polling error:', error);
      this.stopPolling();
      this.hideDeviceCodeSection();
    }
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  hideDeviceCodeSection() {
    document.getElementById('device-code-section').style.display = 'none';
    const connectBtn = document.getElementById('connect-oauth-btn');
    connectBtn.style.display = '';
    connectBtn.disabled = false;
    connectBtn.textContent = 'Connect with GitHub';
  }

  cancelDeviceFlow() {
    this.stopPolling();
    this.hideDeviceCodeSection();
  }

  async disconnectGitHub() {
    if (!confirm('Disconnect from GitHub? You can reconnect anytime.')) return;

    try {
      await this.githubOAuth.revokeAccess();
      await this.gistUploader.clearToken();
      await this.updateOAuthStatus();
      await this.updateTokenStatus();
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }

  async updateTokenStatus() {
    const hasToken = await this.gistUploader.hasToken();
    const statusEl = document.getElementById('token-status');
    const clearBtn = document.getElementById('clear-token-btn');

    if (hasToken) {
      const token = await this.gistUploader.getToken();
      const validation = await this.gistUploader.validateToken(token);

      if (validation.valid) {
        statusEl.className = 'status-chip connected';
        statusEl.innerHTML = `<span style="font-size:16px">&#9679;</span> Token valid: ${validation.username}`;
        statusEl.style.display = '';
        clearBtn.style.display = '';
        document.getElementById('github-token').placeholder = 'Token saved';
      } else {
        statusEl.className = 'status-chip disconnected';
        statusEl.innerHTML = '<span style="font-size:16px">&#9679;</span> Token invalid';
        statusEl.style.display = '';
        clearBtn.style.display = '';
      }
    } else {
      statusEl.style.display = 'none';
      clearBtn.style.display = 'none';
    }
  }

  async updateStorageInfo() {
    try {
      const result = await chrome.storage.local.getBytesInUse(null);
      const usedMB = (result / (1024 * 1024)).toFixed(2);
      const limitMB = 5;
      const percentage = ((result / (limitMB * 1024 * 1024)) * 100).toFixed(1);

      document.getElementById('storage-used').textContent = `${usedMB} MB / ${limitMB} MB`;
      document.getElementById('storage-bar-fill').style.width = `${percentage}%`;

      const recordings = await chrome.runtime.sendMessage({ action: 'getRecordings' });
      const count = recordings.recordings ? recordings.recordings.length : 0;
      document.getElementById('recordings-count').textContent = `${count} recording${count !== 1 ? 's' : ''}`;
    } catch (error) {
      console.error('Error getting storage info:', error);
      document.getElementById('storage-used').textContent = 'Error';
    }
  }

  async validateToken() {
    const tokenInput = document.getElementById('github-token');
    const validateBtn = document.getElementById('validate-token-btn');
    const token = tokenInput.value.trim();

    if (!token) {
      this.showAlert('token-message', 'error', 'Please enter a token first');
      return;
    }

    validateBtn.disabled = true;
    validateBtn.textContent = 'Validating...';

    const result = await this.gistUploader.validateToken(token);

    validateBtn.disabled = false;
    validateBtn.textContent = 'Validate';

    if (result.valid) {
      this.showAlert('token-message', 'success', `Valid token for ${result.username}`);
    } else {
      this.showAlert('token-message', 'error', `Invalid: ${result.error}`);
    }
  }

  async saveToken() {
    const tokenInput = document.getElementById('github-token');
    const saveBtn = document.getElementById('save-token-btn');
    const token = tokenInput.value.trim();

    if (!token) {
      this.showAlert('token-message', 'error', 'Please enter a token first');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    const validation = await this.gistUploader.validateToken(token);
    if (!validation.valid) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Token';
      this.showAlert('token-message', 'error', `Invalid token: ${validation.error}`);
      return;
    }

    const result = await this.gistUploader.saveToken(token);

    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Token';

    if (result.success) {
      this.showAlert('token-message', 'success', `Saved! Connected as ${validation.username}`);
      tokenInput.value = '';
      tokenInput.type = 'password';
      await this.updateTokenStatus();
      await this.updateOAuthStatus();
    } else {
      this.showAlert('token-message', 'error', `Failed: ${result.error}`);
    }
  }

  async clearToken() {
    if (!confirm('Remove your GitHub token?')) return;

    const result = await this.gistUploader.clearToken();
    if (result.success) {
      this.showAlert('token-message', 'info', 'Token removed.');
      document.getElementById('github-token').value = '';
      await this.updateTokenStatus();
    }
  }

  showAlert(elementId, type, text) {
    const el = document.getElementById(elementId);
    el.className = `alert ${type} visible`;
    el.textContent = text;

    if (type === 'success') {
      setTimeout(() => { el.className = 'alert'; }, 5000);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new SettingsManager());
} else {
  new SettingsManager();
}
