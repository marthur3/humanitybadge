class OnboardingManager {
  constructor() {
    this.oauth = new GitHubOAuth();
    this.pollingInterval = null;
    this.pollingIntervalMs = 5000;
    this.init();
  }

  async init() {
    this.setupEventListeners();

    if (!this.oauth.isOAuthAvailable()) {
      this.showManualTokenOnboarding();
    } else {
      await this.checkExistingAuth();
    }
  }

  showManualTokenOnboarding() {
    const connectBtn = document.getElementById('connect-github-btn');
    if (connectBtn) connectBtn.parentElement.style.display = 'none';

    // Auto-skip after a brief delay
    setTimeout(() => this.skipOnboarding(), 2000);
  }

  setupEventListeners() {
    document.getElementById('connect-github-btn')?.addEventListener('click', () => {
      this.startOAuthFlow();
    });

    document.getElementById('skip-btn')?.addEventListener('click', () => {
      this.skipOnboarding();
    });

    document.getElementById('cancel-oauth-btn')?.addEventListener('click', () => {
      this.cancelOAuth();
    });

    document.getElementById('close-onboarding-btn')?.addEventListener('click', () => {
      this.closeOnboarding();
    });
  }

  async checkExistingAuth() {
    const isAuth = await this.oauth.isAuthenticated();
    if (isAuth) {
      const status = await this.oauth.getStatus();
      this.showSuccess(`Connected as ${status.username}!`);
    }
  }

  async startOAuthFlow() {
    const btn = document.getElementById('connect-github-btn');
    const statusEl = document.getElementById('status-message');

    btn.disabled = true;
    btn.textContent = 'Connecting...';
    statusEl.style.display = 'none';

    try {
      const result = await this.oauth.initiateOAuth();

      if (result.success && result.step === 'awaiting_authorization') {
        this.showOAuthStep(result.userPrompt);
        this.startPolling();
      } else {
        throw new Error(result.userMessage || result.message || 'Failed to start sign-in');
      }
    } catch (error) {
      console.error('OAuth error:', error);
      this.showError(error.message);
      btn.disabled = false;
      btn.textContent = 'Connect with GitHub';
    }
  }

  showOAuthStep(userPrompt) {
    document.getElementById('welcome-step').style.display = 'none';
    document.getElementById('oauth-step').style.display = 'block';
    document.getElementById('user-code').textContent = userPrompt.userCode;
    document.getElementById('verification-link').href = userPrompt.verificationUri;
  }

  async startPolling(pollImmediately = true) {
    this.pollingInterval = setInterval(async () => {
      await this.pollForToken();
    }, this.pollingIntervalMs);

    if (pollImmediately) await this.pollForToken();
  }

  async pollForToken() {
    try {
      const result = await this.oauth.pollForToken();
      const pollingStatus = document.getElementById('polling-status');

      if (result.success && result.status === 'authorized') {
        this.stopPolling();
        this.showSuccess(`Connected as ${result.username}!`, result);
      } else if (result.status === 'pending') {
        pollingStatus.querySelector('span').textContent = 'Waiting for authorization...';
      } else if (result.status === 'slow_down') {
        const newInterval = result.interval || 10;
        this.pollingIntervalMs = newInterval * 1000;
        this.stopPolling();
        this.startPolling(false);
        pollingStatus.querySelector('span').textContent = `Retrying in ${newInterval}s...`;
      } else if (result.status === 'expired' || result.status === 'denied') {
        this.stopPolling();
        this.showOAuthError(result.message || 'Authorization failed.');
        setTimeout(() => this.resetToWelcome(), 3000);
      } else if (result.status === 'not_enabled') {
        this.stopPolling();
        this.showOAuthError('Device Flow not enabled for this GitHub App.');
        setTimeout(() => this.resetToWelcome(), 5000);
      } else if (result.status === 'error') {
        this.stopPolling();
        this.showOAuthError(result.error || 'An error occurred.');
        setTimeout(() => this.resetToWelcome(), 3000);
      }
    } catch (error) {
      console.error('Polling error:', error);
      this.stopPolling();
      this.showOAuthError('Connection error. Please try again.');
      setTimeout(() => this.resetToWelcome(), 3000);
    }
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  cancelOAuth() {
    this.stopPolling();
    this.resetToWelcome();
  }

  resetToWelcome() {
    document.getElementById('oauth-step').style.display = 'none';
    document.getElementById('welcome-step').style.display = 'block';
    const btn = document.getElementById('connect-github-btn');
    btn.disabled = false;
    btn.textContent = 'Connect with GitHub';
    document.getElementById('status-message').style.display = 'none';
  }

  async skipOnboarding() {
    await chrome.storage.sync.set({
      hasSeenOnboarding: true,
      githubSkipped: true
    });
    this.showSuccess('Ready! Your recordings will use free cloud links.');
  }

  async closeOnboarding() {
    await chrome.storage.sync.set({ hasSeenOnboarding: true });
    window.close();
  }

  showSuccess(message, authResult = null) {
    document.getElementById('welcome-step').style.display = 'none';
    document.getElementById('oauth-step').style.display = 'none';

    const successStep = document.getElementById('success-step');
    successStep.style.display = 'block';

    const messageEl = document.getElementById('success-message');
    if (authResult && authResult.username) {
      messageEl.innerHTML = `Connected as <strong>${authResult.username}</strong>. Recordings will use GitHub Gist URLs.`;
    } else {
      messageEl.textContent = message;
    }

    setTimeout(() => this.closeOnboarding(), 5000);
  }

  showError(message) {
    const el = document.getElementById('status-message');
    el.className = 'alert error';
    el.textContent = message;
    el.style.display = 'block';
  }

  showOAuthError(message) {
    const el = document.getElementById('oauth-status-message');
    el.className = 'alert error';
    el.textContent = message;
    el.style.display = 'block';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new OnboardingManager());
} else {
  new OnboardingManager();
}
