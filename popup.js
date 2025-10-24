class PopupManager {
  constructor() {
    this.init();
  }

  async init() {
    this.setupToggle();
    this.setupSettingsButton();
    this.checkOnboarding();
    this.showGitHubStatus();
    this.updateStatus();
    this.loadRecordings();

    // Refresh status every 2 seconds
    setInterval(() => this.updateStatus(), 2000);
  }

  async checkOnboarding() {
    try {
      const result = await chrome.storage.sync.get(['hasSeenOnboarding']);

      if (!result.hasSeenOnboarding) {
        // First time user - open onboarding
        const onboardingUrl = chrome.runtime.getURL('onboarding.html');
        chrome.tabs.create({ url: onboardingUrl });
      }
    } catch (error) {
      console.error('Error checking onboarding:', error);
    }
  }

  async showGitHubStatus() {
    try {
      const result = await chrome.storage.sync.get(['githubToken', 'githubOAuthToken', 'githubSkipped']);
      const hasOAuth = !!(result.githubOAuthToken && result.githubOAuthToken.access_token);
      const hasManual = !!(result.githubToken && result.githubToken.trim());
      const hasGitHub = hasOAuth || hasManual;

      // Add GitHub status indicator to popup
      const statusContainer = document.querySelector('.toggle-section');
      if (statusContainer && !document.getElementById('github-status-indicator')) {
        const indicator = document.createElement('div');
        indicator.id = 'github-status-indicator';
        indicator.style.cssText = `
          margin-top: 15px;
          padding: 12px;
          border-radius: 6px;
          font-size: 13px;
          background: ${hasGitHub ? '#e8f5e8' : '#fff3e0'};
          border: 1px solid ${hasGitHub ? '#c8e6c9' : '#ffe0b2'};
          color: ${hasGitHub ? '#2e7d32' : '#f57c00'};
        `;

        if (hasGitHub) {
          indicator.innerHTML = `
            <strong>✓ GitHub Connected</strong><br>
            <span style="font-size: 12px;">Your recordings will use professional Gist URLs</span>
          `;
        } else if (result.githubSkipped) {
          indicator.innerHTML = `
            <strong>Using is.gd URLs</strong><br>
            <span style="font-size: 12px;">
              <a href="#" id="connect-github-link" style="color: #f57c00; text-decoration: underline;">Connect GitHub</a> for better URLs
            </span>
          `;

          // Add click listener for connect link
          setTimeout(() => {
            document.getElementById('connect-github-link')?.addEventListener('click', (e) => {
              e.preventDefault();
              chrome.runtime.openOptionsPage();
            });
          }, 100);
        } else {
          indicator.innerHTML = `
            <strong>Setup Incomplete</strong><br>
            <span style="font-size: 12px;">
              <a href="#" id="connect-github-link" style="color: #f57c00; text-decoration: underline;">Connect GitHub</a> or <a href="#" id="skip-github-link" style="color: #f57c00; text-decoration: underline;">skip</a>
            </span>
          `;

          // Add click listeners
          setTimeout(() => {
            document.getElementById('connect-github-link')?.addEventListener('click', (e) => {
              e.preventDefault();
              chrome.runtime.openOptionsPage();
            });
            document.getElementById('skip-github-link')?.addEventListener('click', async (e) => {
              e.preventDefault();
              await chrome.storage.sync.set({ githubSkipped: true });
              window.location.reload();
            });
          }, 100);
        }

        statusContainer.appendChild(indicator);
      }
    } catch (error) {
      console.error('Error showing GitHub status:', error);
    }
  }

  setupSettingsButton() {
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
      });
    }
  }

  async setupToggle() {
    const toggle = document.getElementById('extension-toggle');
    const result = await chrome.storage.sync.get(['extensionEnabled']);
    const isEnabled = result.extensionEnabled !== false;

    toggle.checked = isEnabled;
    this.updateToggleStatus(isEnabled);

    toggle.addEventListener('change', async (e) => {
      const enabled = e.target.checked;
      await chrome.storage.sync.set({ extensionEnabled: enabled });
      this.updateToggleStatus(enabled);

      // Notify active tab
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.tabs.sendMessage(tab.id, {
          action: 'toggleExtension',
          enabled: enabled
        });
      } catch (error) {
        // Tab may not have content script loaded
      }
    });
  }

  updateToggleStatus(enabled) {
    const status = document.getElementById('toggle-status');
    status.innerHTML = enabled
      ? '✅ Active - Button appears on all sites'
      : '❌ Disabled - No button will appear';
    status.style.color = enabled ? '#2e7d32' : '#c62828';
  }

  async updateStatus() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getStatus' });

      const statusEl = document.getElementById('status');
      if (response && response.isRecording) {
        statusEl.className = 'status recording';
        statusEl.textContent = '🔴 Recording in progress...';
      } else {
        statusEl.className = 'status idle';
        statusEl.textContent = '✅ Ready to record';
      }
    } catch (error) {
      // Tab doesn't have content script
      const statusEl = document.getElementById('status');
      statusEl.className = 'status idle';
      statusEl.textContent = '✅ Ready to record';
    }
  }

  async loadRecordings() {
    const response = await chrome.runtime.sendMessage({ action: 'getRecordings' });
    this.displayRecordings(response.recordings || []);
  }

  displayRecordings(recordings) {
    const container = document.getElementById('recordings-container');

    if (recordings.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          No recordings yet. Click the green ✓ button on any site to start recording!
        </div>
      `;
      return;
    }

    const html = recordings
      .sort((a, b) => b.startTime - a.startTime)
      .map(rec => this.createRecordingHtml(rec))
      .join('');

    container.innerHTML = html;

    // Event delegation
    container.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      if (!id) return;

      if (e.target.classList.contains('share-btn')) {
        this.viewReplay(id);
      } else if (e.target.classList.contains('copy-btn')) {
        this.copyLink(id);
      } else if (e.target.classList.contains('delete-btn')) {
        this.deleteRecording(id);
      }
    });
  }

  createRecordingHtml(rec) {
    const date = new Date(rec.startTime).toLocaleString();
    const duration = Math.round(rec.duration / 1000);
    const preview = rec.finalValue.substring(0, 50) + (rec.finalValue.length > 50 ? '...' : '');

    return `
      <div class="recording-item">
        <div class="recording-header">
          <div class="recording-title">${rec.domain}</div>
          <div class="recording-date">${date}</div>
        </div>
        <div class="recording-details">
          Duration: ${duration}s | Characters: ${rec.finalValue.length}<br>
          Preview: "${preview}"
        </div>
        <div class="recording-actions">
          <button class="btn btn-primary share-btn" data-id="${rec.id}">View Replay</button>
          <button class="btn btn-secondary copy-btn" data-id="${rec.id}">Copy Link</button>
          <button class="btn btn-danger delete-btn" data-id="${rec.id}">Delete</button>
        </div>
      </div>
    `;
  }

  viewReplay(id) {
    const url = chrome.runtime.getURL(`replay.html?id=${id}`);
    chrome.tabs.create({ url });
  }

  async copyLink(id) {
    const url = chrome.runtime.getURL(`replay.html?id=${id}`);
    await navigator.clipboard.writeText(url);

    const btn = document.querySelector(`.copy-btn[data-id="${id}"]`);
    const original = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = original, 2000);
  }

  async deleteRecording(id) {
    if (!confirm('Delete this recording? This action cannot be undone.')) return;

    await chrome.runtime.sendMessage({ action: 'deleteRecording', id });
    this.loadRecordings();
  }
}

new PopupManager();
