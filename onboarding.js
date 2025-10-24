// Onboarding flow logic for Humanity Badge

class OnboardingManager {
  constructor() {
    this.oauth = new GitHubOAuth();
    this.pollingInterval = null;
    this.pollingIntervalMs = 5000; // Start with 5 seconds
    this.init();
  }

  async init() {
    this.setupEventListeners();

    // Check if OAuth is available
    const oauthAvailable = this.oauth.isOAuthAvailable();

    if (!oauthAvailable) {
      // OAuth not configured - show alternative onboarding
      this.showManualTokenOnboarding();
    } else {
      // OAuth available - show normal flow
      await this.checkExistingAuth();
    }
  }

  showManualTokenOnboarding() {
    // Hide OAuth-specific elements
    const connectBtn = document.getElementById('connect-github-btn');
    if (connectBtn) {
      connectBtn.parentElement.style.display = 'none';
    }

    // Show message about manual tokens
    const welcomeMsg = document.querySelector('.welcome-message');
    if (welcomeMsg) {
      welcomeMsg.innerHTML = `
        <h2>Welcome! Let's Get You Set Up</h2>
        <p>Humanity Badge helps you prove you're human by recording your natural typing patterns.</p>
        <div style="background: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <p style="margin: 0; color: #f57c00;">
            <strong>Note:</strong> GitHub sign-in is not available in this version.
            You can use manual Personal Access Tokens in Settings for GitHub Gist integration,
            or use is.gd URL shortening (works great with no setup).
          </p>
        </div>
      `;
    }

    // Mark onboarding as seen and skip immediately
    setTimeout(() => {
      this.skipOnboarding();
    }, 3000);
  }

  setupEventListeners() {
    // Connect with GitHub button
    document.getElementById('connect-github-btn')?.addEventListener('click', () => {
      this.startOAuthFlow();
    });

    // Skip button
    document.getElementById('skip-btn')?.addEventListener('click', () => {
      this.skipOnboarding();
    });

    // Cancel OAuth button
    document.getElementById('cancel-oauth-btn')?.addEventListener('click', () => {
      this.cancelOAuth();
    });

    // Close onboarding button
    document.getElementById('close-onboarding-btn')?.addEventListener('click', () => {
      this.closeOnboarding();
    });
  }

  async checkExistingAuth() {
    // Check if user is already authenticated
    const isAuth = await this.oauth.isAuthenticated();
    if (isAuth) {
      const status = await this.oauth.getStatus();
      this.showSuccess(`Already connected as ${status.username}!`);
    }
  }

  async startOAuthFlow() {
    const btn = document.getElementById('connect-github-btn');
    const statusEl = document.getElementById('status-message');

    // Disable button
    btn.disabled = true;
    btn.textContent = 'Connecting...';
    statusEl.style.display = 'none';

    try {
      // Initiate OAuth
      const result = await this.oauth.initiateOAuth();

      if (result.success && result.step === 'awaiting_authorization') {
        // Show OAuth step with device code
        this.showOAuthStep(result.userPrompt);
        // Start polling for authorization
        this.startPolling();
      } else {
        // Show user-friendly error message
        const userMsg = result.userMessage || result.message || 'Failed to start GitHub sign-in';
        throw new Error(userMsg);
      }

    } catch (error) {
      console.error('OAuth error:', error);
      this.showError(error.message);
      btn.disabled = false;
      btn.textContent = 'Connect with GitHub';
    }
  }

  showOAuthStep(userPrompt) {
    // Hide welcome step
    document.getElementById('welcome-step').style.display = 'none';

    // Show OAuth step
    const oauthStep = document.getElementById('oauth-step');
    oauthStep.style.display = 'block';

    // Display user code
    document.getElementById('user-code').textContent = userPrompt.userCode;

    // Set verification link
    const verificationLink = document.getElementById('verification-link');
    verificationLink.href = userPrompt.verificationUri;

    console.log('OAuth Device Flow initiated:', userPrompt);
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
      const result = await this.oauth.pollForToken();

      const pollingStatus = document.getElementById('polling-status');
      const statusEl = document.getElementById('oauth-status-message');

      if (result.success && result.status === 'authorized') {
        // Success! Stop polling
        this.stopPolling();

        // Show success
        this.showSuccess(`Connected as ${result.username}!`, result);

      } else if (result.status === 'pending') {
        // Still waiting, update UI
        pollingStatus.querySelector('span').textContent = 'Waiting for authorization...';
        statusEl.style.display = 'none';

      } else if (result.status === 'slow_down') {
        // Polling too fast, GitHub told us to slow down
        const newInterval = result.interval || 10; // GitHub suggests new interval
        console.log(`[Onboarding] ⚠️ Polling too fast. Slowing down from ${this.pollingIntervalMs / 1000}s to ${newInterval}s`);

        // Update interval and restart polling WITHOUT polling immediately
        this.pollingIntervalMs = newInterval * 1000;
        this.stopPolling();
        this.startPolling(false); // false = don't poll immediately

        pollingStatus.querySelector('span').textContent = `Waiting ${newInterval}s before next check...`;

      } else if (result.status === 'expired') {
        // Code expired
        this.stopPolling();
        this.showOAuthError('Verification code expired. Please try again.');
        setTimeout(() => {
          this.resetToWelcome();
        }, 3000);

      } else if (result.status === 'denied') {
        // User denied
        this.stopPolling();
        this.showOAuthError('Authorization denied. You can try again or skip for now.');
        setTimeout(() => {
          this.resetToWelcome();
        }, 3000);

      } else if (result.status === 'not_enabled') {
        // Device Flow not enabled
        this.stopPolling();
        this.showOAuthError('⚠️  Device Flow must be enabled in your GitHub App settings. See ENABLE_DEVICE_FLOW.md for instructions.');
        setTimeout(() => {
          this.resetToWelcome();
        }, 5000);

      } else if (result.status === 'error') {
        // Error occurred
        this.stopPolling();
        this.showOAuthError(result.error || 'An error occurred.');
        setTimeout(() => {
          this.resetToWelcome();
        }, 3000);
      }

    } catch (error) {
      console.error('Polling error:', error);
      this.stopPolling();
      this.showOAuthError('Connection error. Please try again.');
      setTimeout(() => {
        this.resetToWelcome();
      }, 3000);
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
    // Hide OAuth step
    document.getElementById('oauth-step').style.display = 'none';

    // Show welcome step
    document.getElementById('welcome-step').style.display = 'block';

    // Reset button
    const btn = document.getElementById('connect-github-btn');
    btn.disabled = false;
    btn.textContent = 'Connect with GitHub';

    // Clear status
    document.getElementById('status-message').style.display = 'none';
  }

  async skipOnboarding() {
    // Mark onboarding as complete
    await chrome.storage.sync.set({
      hasSeenOnboarding: true,
      githubSkipped: true
    });

    // Show success without GitHub
    this.showSuccess('Extension ready! You\'ll use is.gd for URL shortening.');
  }

  async closeOnboarding() {
    // Mark onboarding as complete
    await chrome.storage.sync.set({
      hasSeenOnboarding: true
    });

    // Close the tab
    window.close();
  }

  showSuccess(message, authResult = null) {
    // Hide all steps
    document.getElementById('welcome-step').style.display = 'none';
    document.getElementById('oauth-step').style.display = 'none';

    // Show success step
    const successStep = document.getElementById('success-step');
    successStep.style.display = 'block';

    // Update success message
    document.getElementById('success-message').textContent = message;

    if (authResult) {
      // Add GitHub username to success message
      const messageEl = document.getElementById('success-message');
      messageEl.innerHTML = `
        Connected as <strong>${authResult.username}</strong>!<br>
        All your typing verifications will now be uploaded to GitHub Gist.
      `;
    }

    // Auto-close in 5 seconds
    setTimeout(() => {
      this.closeOnboarding();
    }, 5000);
  }

  showError(message) {
    const statusEl = document.getElementById('status-message');
    statusEl.className = 'status-message error';
    statusEl.textContent = message;
    statusEl.style.display = 'block';
  }

  showOAuthError(message) {
    const statusEl = document.getElementById('oauth-status-message');
    statusEl.className = 'status-message error';
    statusEl.textContent = message;
    statusEl.style.display = 'block';
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new OnboardingManager());
} else {
  new OnboardingManager();
}
