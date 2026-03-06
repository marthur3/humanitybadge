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

    setInterval(() => this.updateStatus(), 2000);
  }

  async checkOnboarding() {
    try {
      const result = await chrome.storage.sync.get(['hasSeenOnboarding']);
      if (!result.hasSeenOnboarding) {
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

      const card = document.getElementById('github-status-card');
      const container = document.getElementById('github-connection');
      card.style.display = 'block';

      if (hasGitHub) {
        container.innerHTML = `
          <div class="connection-icon connected">G</div>
          <div class="connection-info">
            <div class="connection-title">GitHub Connected</div>
            <div class="connection-subtitle">Using professional Gist URLs</div>
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="connection-icon disconnected">G</div>
          <div class="connection-info">
            <div class="connection-title">GitHub not connected</div>
            <div class="connection-subtitle">Using JSONBlob for sharing</div>
          </div>
          <button class="connection-action" id="connect-github-link">Connect</button>
        `;

        setTimeout(() => {
          document.getElementById('connect-github-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.runtime.openOptionsPage();
          });
        }, 50);
      }
    } catch (error) {
      console.error('Error showing GitHub status:', error);
    }
  }

  setupSettingsButton() {
    document.getElementById('settings-btn')?.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
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
    status.textContent = enabled ? 'Recording on all websites' : 'Extension disabled';
  }

  async updateStatus() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getStatus' });

      const statusEl = document.getElementById('status');
      if (response && response.isRecording) {
        statusEl.className = 'status-bar recording';
        statusEl.innerHTML = '<span class="status-dot"></span> Recording in progress...';
      } else {
        statusEl.className = 'status-bar idle';
        statusEl.innerHTML = '<span class="status-dot"></span> Ready to record';
      }
    } catch (error) {
      const statusEl = document.getElementById('status');
      statusEl.className = 'status-bar idle';
      statusEl.innerHTML = '<span class="status-dot"></span> Ready to record';
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
          <div class="empty-state-icon">H</div>
          <div class="empty-state-text">No recordings yet.<br>Click the H button on any page to start.</div>
        </div>
      `;
      return;
    }

    const html = '<div class="recordings-list">' +
      recordings
        .sort((a, b) => b.startTime - a.startTime)
        .map(rec => this.createRecordingHtml(rec))
        .join('') +
      '</div>';

    container.innerHTML = html;

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
    const date = new Date(rec.startTime).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const duration = Math.round(rec.duration / 1000);
    const preview = (rec.finalValue || '').substring(0, 60) + ((rec.finalValue || '').length > 60 ? '...' : '');
    const verified = rec.verification && rec.verification.isAuthentic;

    return `
      <div class="recording-item">
        <div class="recording-top">
          <span class="recording-domain">${verified ? 'Verified' : 'Unverified'} &middot; ${rec.domain}</span>
          <span class="recording-date">${date}</span>
        </div>
        <div class="recording-preview">"${preview}"</div>
        <div class="recording-meta">${duration}s &middot; ${(rec.finalValue || '').length} chars${rec.verification?.wpm ? ' &middot; ' + rec.verification.wpm + ' WPM' : ''}</div>
        <div class="recording-actions">
          <button class="btn btn-primary share-btn" data-id="${rec.id}">View</button>
          <button class="btn btn-outline copy-btn" data-id="${rec.id}">Copy Link</button>
          <button class="btn btn-danger-outline delete-btn" data-id="${rec.id}">Delete</button>
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
    if (!confirm('Delete this recording?')) return;
    await chrome.runtime.sendMessage({ action: 'deleteRecording', id });
    this.loadRecordings();
  }
}

new PopupManager();
