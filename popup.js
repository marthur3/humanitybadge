class PopupManager {
  constructor() {
    this.init();
  }

  async init() {
    this.setupToggle();
    this.setupSettingsButton();
    this.updateStatus();
    this.loadRecordings();
    setInterval(() => this.updateStatus(), 2000);
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
        await chrome.tabs.sendMessage(tab.id, { action: 'toggleExtension', enabled });
      } catch (error) {
        // Tab may not have content script
      }
    });
  }

  updateToggleStatus(enabled) {
    document.getElementById('toggle-status').textContent =
      enabled ? 'Active on all websites' : 'Extension disabled';
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
          <div class="empty-state-icon">✓</div>
          <div class="empty-state-text">No recordings yet.<br>Click the shield button on any page to start.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = '<div class="recordings-list">' +
      recordings
        .sort((a, b) => b.startTime - a.startTime)
        .map(rec => this.createRecordingHtml(rec))
        .join('') +
      '</div>';

    container.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      if (!id) return;
      if (e.target.classList.contains('view-btn')) this.viewReplay(id);
      else if (e.target.classList.contains('delete-btn')) this.deleteRecording(id);
    });
  }

  createRecordingHtml(rec) {
    const date = new Date(rec.startTime).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const duration = Math.round(rec.duration / 1000);
    const preview = (rec.finalValue || '').substring(0, 60) + ((rec.finalValue || '').length > 60 ? '…' : '');
    const verified = rec.verification && rec.verification.isAuthentic;

    return `
      <div class="recording-item">
        <div class="recording-top">
          <span class="recording-badge ${verified ? 'verified' : 'unverified'}">${verified ? '✓ Verified' : '✗ Unverified'}</span>
          <span class="recording-date">${date}</span>
        </div>
        <div class="recording-preview">"${preview}"</div>
        <div class="recording-meta">${duration}s${rec.verification?.wpm ? ' · ' + rec.verification.wpm + ' WPM' : ''} · ${rec.domain || ''}</div>
        <div class="recording-actions">
          <button class="btn btn-primary view-btn" data-id="${rec.id}">View Replay</button>
          <button class="btn btn-danger-outline delete-btn" data-id="${rec.id}">Delete</button>
        </div>
      </div>
    `;
  }

  viewReplay(id) {
    chrome.tabs.create({ url: chrome.runtime.getURL(`replay.html?id=${id}`) });
  }

  async deleteRecording(id) {
    if (!confirm('Delete this recording?')) return;
    await chrome.runtime.sendMessage({ action: 'deleteRecording', id });
    this.loadRecordings();
  }
}

new PopupManager();
