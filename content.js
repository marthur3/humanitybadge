class TypingRecorder {
  constructor() {
    this.isRecording = false;
    this.recording = null;
    this.startTime = null;
    this.currentElement = null;
    this.button = null;
    this.enabled = true;

    this.init();
  }

  async init() {
    await this.checkEnabled();
    if (this.enabled) {
      this.createButton();
      this.listenForMessages();
    }
  }

  async checkEnabled() {
    try {
      const result = await chrome.storage.sync.get(['extensionEnabled']);
      this.enabled = result.extensionEnabled !== false;
    } catch (error) {
      this.enabled = true;
    }
  }

  createButton() {
    if (this.button) return;

    this.button = document.createElement('button');
    this.button.className = 'humanity-badge-btn';
    this.button.innerHTML = '✓';
    this.button.title = 'Humanity Badge - Click to record authentic typing';

    this.button.style.cssText = `
      position: fixed !important;
      bottom: 20px !important;
      right: 20px !important;
      width: 60px !important;
      height: 60px !important;
      background: linear-gradient(135deg, #4CAF50, #45a049) !important;
      border: 3px solid white !important;
      border-radius: 50% !important;
      cursor: pointer !important;
      font-size: 24px !important;
      z-index: 2147483647 !important;
      color: white !important;
      font-weight: bold !important;
      box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4) !important;
      transition: all 0.3s ease !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    `;

    this.button.addEventListener('mouseenter', () => {
      if (!this.isRecording) {
        this.button.style.transform = 'scale(1.1)';
      }
    });

    this.button.addEventListener('mouseleave', () => {
      if (!this.isRecording) {
        this.button.style.transform = 'scale(1)';
      }
    });

    this.button.addEventListener('click', () => {
      if (this.isRecording) {
        this.stopRecording();
      } else {
        const element = this.findInputElement();
        this.startRecording(element);
      }
    });

    document.body.appendChild(this.button);
  }

  findInputElement() {
    const selectors = [
      'textarea',
      '[contenteditable="true"]',
      'div[role="textbox"]',
      'input[type="text"]'
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && !el.disabled && !el.readOnly) {
          return el;
        }
      }
    }
    return null;
  }

  startRecording(element) {
    if (!element) {
      this.showMessage('⚠️ No input field found on this page', '#ff9800');
      return;
    }

    this.isRecording = true;
    this.currentElement = element;
    this.startTime = Date.now();
    this.recording = {
      id: this.generateId(),
      startTime: this.startTime,
      events: [],
      initialValue: element.value || element.textContent || '',
      url: window.location.href,
      domain: window.location.hostname
    };

    // Update button
    this.button.innerHTML = '⏹️';
    this.button.title = 'Recording - Click to stop';
    this.button.style.background = 'linear-gradient(135deg, #ff4444, #cc2222) !important';

    // Add event listeners
    this.addListeners(element);

    // Show recording indicator
    this.showRecordingIndicator();
  }

  addListeners(element) {
    const events = ['input', 'keydown', 'paste', 'drop', 'dragover'];

    this.boundHandlers = events.map(type => {
      const handler = (e) => this.handleEvent(e);
      element.addEventListener(type, handler, { passive: false });
      return { type, handler };
    });
  }

  removeListeners() {
    if (!this.currentElement || !this.boundHandlers) return;

    this.boundHandlers.forEach(({ type, handler }) => {
      this.currentElement.removeEventListener(type, handler);
    });
    this.boundHandlers = null;
  }

  handleEvent(e) {
    // Block paste and drop
    if (e.type === 'paste' || e.type === 'drop' || e.type === 'dragover') {
      e.preventDefault();
      e.stopPropagation();
      this.showMessage('⚠️ Paste blocked - Type manually for verification', '#ff4444');
      return;
    }

    // Block keyboard paste
    if (e.type === 'keydown' && (e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault();
      e.stopPropagation();
      this.showMessage('⚠️ Paste blocked - Type manually for verification', '#ff4444');
      return;
    }

    // Record event
    if (this.isRecording) {
      this.recording.events.push({
        type: e.type,
        timestamp: Date.now() - this.startTime,
        key: e.key || '',
        value: this.currentElement.value || this.currentElement.textContent || ''
      });
    }
  }

  stopRecording() {
    if (!this.isRecording) return;

    this.isRecording = false;
    this.removeListeners();

    // Update button
    this.button.innerHTML = '✓';
    this.button.title = 'Humanity Badge - Click to record';
    this.button.style.background = 'linear-gradient(135deg, #4CAF50, #45a049) !important';
    this.button.style.transform = 'scale(1)';

    this.hideRecordingIndicator();

    // Finalize recording
    this.recording.endTime = Date.now();
    this.recording.duration = this.recording.endTime - this.recording.startTime;
    this.recording.finalValue = this.currentElement ?
      (this.currentElement.value || this.currentElement.textContent || '') : '';

    // Verify
    const verification = this.verify();
    this.recording.verification = verification;

    // Save
    this.saveRecording();

    // Cleanup
    this.currentElement = null;
  }

  verify() {
    if (!this.recording || !this.recording.events.length) {
      return { isAuthentic: false, reason: 'No typing data' };
    }

    const duration = this.recording.duration;
    const text = this.recording.finalValue || '';
    const words = text.split(/\s+/).filter(w => w.length > 0).length;
    const minutes = duration / 60000;
    const wpm = words / minutes;

    // Minimum duration
    if (duration < 5000) {
      return { isAuthentic: false, reason: 'Too fast - minimum 5 seconds required' };
    }

    // WPM range
    if (wpm < 10 || wpm > 200) {
      return { isAuthentic: false, reason: `Unrealistic speed: ${Math.round(wpm)} WPM` };
    }

    return {
      isAuthentic: true,
      wpm: Math.round(wpm),
      duration: Math.round(duration / 1000),
      characters: text.length,
      words: words
    };
  }

  saveRecording() {
    chrome.runtime.sendMessage({
      action: 'saveRecording',
      data: this.recording
    }, (response) => {
      // Check for extension context invalidation (happens when extension is reloaded)
      if (chrome.runtime.lastError) {
        console.error('Runtime error:', chrome.runtime.lastError);

        // Check if it's a context invalidation error
        if (chrome.runtime.lastError.message.includes('Extension context invalidated')) {
          this.showMessage('⚠️ Extension was reloaded. Please refresh this page and try again.', '#ff9800');
        } else {
          this.showMessage('❌ Failed to save recording: ' + chrome.runtime.lastError.message, '#f44336');
        }
        return;
      }

      if (response && response.success) {
        // Show share dialog with link and metadata
        this.showShareDialog(response);
      } else {
        this.showMessage('❌ Failed to save recording: ' + (response?.error || 'Unknown error'), '#f44336');
      }
    });
  }

  showShareDialog(response) {
    const { shareUrl, shareType, recordingSize, htmlExport, message, gistId } = response;
    const verification = this.recording.verification;
    const isAuthentic = verification && verification.isAuthentic;
    const sizeKB = Math.round(recordingSize / 1024);

    // Determine share method info
    let shareMethodInfo = '';
    let shareMethodColor = '#4CAF50';

    switch (shareType) {
      case 'github-gist':
        shareMethodInfo = `🎯 <strong>GitHub Gist</strong> - Short, professional URL`;
        shareMethodColor = '#4CAF50';
        break;
      case 'is.gd-short':
        shareMethodInfo = `🔗 <strong>Shortened URL</strong> (is.gd) - Works everywhere`;
        shareMethodColor = '#2196F3';
        break;
      case 'hash':
        shareMethodInfo = `📦 <strong>Direct Link</strong> (${sizeKB}KB) - May be long for some platforms`;
        shareMethodColor = '#FF9800';
        break;
      case 'hash-large':
        shareMethodInfo = `⚠️ <strong>Long URL</strong> (${sizeKB}KB) - Consider downloading HTML`;
        shareMethodColor = '#FF9800';
        break;
      case 'html-only':
        shareMethodInfo = `💾 <strong>Download Required</strong> (${sizeKB}KB) - Too large for URL`;
        shareMethodColor = '#f44336';
        break;
      default:
        shareMethodInfo = `🔗 <strong>Shareable Link</strong> (${sizeKB}KB)`;
        shareMethodColor = '#4CAF50';
    }

    // Detect platform
    const hostname = window.location.hostname.toLowerCase();
    const isReddit = hostname.includes('reddit.com');
    const isLinkedIn = hostname.includes('linkedin.com');
    const defaultTab = isReddit ? 'reddit' : (isLinkedIn ? 'linkedin' : 'link');

    // Generate platform-specific share text
    const shareData = this.formatShareText(shareUrl, verification);

    const dialog = document.createElement('div');
    dialog.id = 'humanity-share-dialog';
    dialog.innerHTML = `
      <div style="background: white; padding: 25px; border-radius: 12px; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
        <h3 style="margin: 0 0 15px 0; color: ${isAuthentic ? '#4CAF50' : '#f44336'}; font-size: 20px;">
          ${isAuthentic ? '✅ Recording Saved!' : '❌ Verification Failed'}
        </h3>

        ${isAuthentic ? `
          <div style="background: #e8f5e8; color: #2e7d32; padding: 12px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #4CAF50;">
            <strong>✓ Humanity Badge Verified</strong><br>
            <small>${verification.wpm} WPM • ${verification.duration}s • ${verification.characters} chars</small>
          </div>
        ` : `
          <div style="background: #ffebee; color: #c62828; padding: 12px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #f44336;">
            <strong>Reason:</strong> ${verification.reason}
          </div>
        `}

        <!-- Share Method Info -->
        <div style="background: ${shareMethodColor === '#4CAF50' ? '#e8f5e8' : (shareMethodColor === '#2196F3' ? '#e3f2fd' : '#fff3e0')}; color: ${shareMethodColor === '#4CAF50' ? '#2e7d32' : (shareMethodColor === '#2196F3' ? '#1565c0' : '#f57c00')}; padding: 10px; border-radius: 6px; margin-bottom: 15px; font-size: 13px; border-left: 3px solid ${shareMethodColor};">
          ${shareMethodInfo}
        </div>

        <!-- Tab Navigation -->
        <div style="display: flex; gap: 5px; margin-bottom: 15px; border-bottom: 2px solid #e0e0e0;">
          <button class="humanity-tab" data-tab="reddit" style="padding: 10px 15px; border: none; background: ${defaultTab === 'reddit' ? '#4CAF50' : 'transparent'}; color: ${defaultTab === 'reddit' ? 'white' : '#666'}; cursor: pointer; font-weight: 600; border-radius: 4px 4px 0 0; font-size: 13px;">
            Reddit
          </button>
          <button class="humanity-tab" data-tab="linkedin" style="padding: 10px 15px; border: none; background: ${defaultTab === 'linkedin' ? '#4CAF50' : 'transparent'}; color: ${defaultTab === 'linkedin' ? 'white' : '#666'}; cursor: pointer; font-weight: 600; border-radius: 4px 4px 0 0; font-size: 13px;">
            LinkedIn
          </button>
          <button class="humanity-tab" data-tab="link" style="padding: 10px 15px; border: none; background: ${defaultTab === 'link' ? '#4CAF50' : 'transparent'}; color: ${defaultTab === 'link' ? 'white' : '#666'}; cursor: pointer; font-weight: 600; border-radius: 4px 4px 0 0; font-size: 13px;">
            Link
          </button>
          <button class="humanity-tab" data-tab="download" style="padding: 10px 15px; border: none; background: transparent; color: #666; cursor: pointer; font-weight: 600; border-radius: 4px 4px 0 0; font-size: 13px;">
            Download
          </button>
        </div>

        <!-- Tab Content -->
        <div class="humanity-tab-content" data-content="reddit" style="display: ${defaultTab === 'reddit' ? 'block' : 'none'};">
          <p style="font-size: 13px; color: #666; margin: 0 0 10px 0;">
            Add this to the end of your Reddit comment or post:
          </p>
          <textarea readonly style="width: 100%; height: 80px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; font-size: 12px; resize: vertical; box-sizing: border-box; margin-bottom: 10px;">${shareData.reddit}</textarea>
          <button class="humanity-copy-format" data-text="${shareData.reddit.replace(/"/g, '&quot;')}" style="width: 100%; padding: 10px; background: #FF4500; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 13px;">
            📋 Copy Reddit Format
          </button>
          <p style="font-size: 12px; color: #999; margin: 10px 0 0 0;">
            Paste at the end of your comment to prove authenticity!
          </p>
        </div>

        <div class="humanity-tab-content" data-content="linkedin" style="display: ${defaultTab === 'linkedin' ? 'block' : 'none'};">
          <p style="font-size: 13px; color: #666; margin: 0 0 10px 0;">
            Add this to your LinkedIn post:
          </p>
          <textarea readonly style="width: 100%; height: 80px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; font-size: 12px; resize: vertical; box-sizing: border-box; margin-bottom: 10px;">${shareData.linkedin}</textarea>
          <button class="humanity-copy-format" data-text="${shareData.linkedin.replace(/"/g, '&quot;')}" style="width: 100%; padding: 10px; background: #0A66C2; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 13px;">
            📋 Copy LinkedIn Format
          </button>
          <p style="font-size: 12px; color: #999; margin: 10px 0 0 0;">
            Add at the end of posts to verify authentic human writing.
          </p>
        </div>

        <div class="humanity-tab-content" data-content="link" style="display: ${defaultTab === 'link' ? 'block' : 'none'};">
          <p style="font-size: 13px; color: #666; margin: 0 0 10px 0;">
            Share this link (${sizeKB}KB):
          </p>
          <input
            type="text"
            id="humanity-share-url"
            value="${shareUrl}"
            readonly
            style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; font-size: 11px; box-sizing: border-box; margin-bottom: 10px;"
            onclick="this.select()"
          >
          <button id="humanity-copy-url" style="width: 100%; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 13px; margin-bottom: 10px;">
            📋 Copy Link
          </button>
          <button id="humanity-view-btn" style="width: 100%; padding: 10px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 13px;">
            👁️ View Replay
          </button>
          <p style="font-size: 12px; color: #4CAF50; margin: 10px 0 0 0; background: #e8f5e8; padding: 8px; border-radius: 4px;">
            ✓ Works for anyone - No extension needed!
          </p>
        </div>

        <div class="humanity-tab-content" data-content="download" style="display: none;">
          <p style="font-size: 13px; color: #666; margin: 0 0 10px 0;">
            Download standalone HTML file (works anywhere, no extension needed):
          </p>
          <button id="humanity-download-html" style="width: 100%; padding: 12px; background: #673AB7; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 14px; margin-bottom: 10px;">
            💾 Download HTML File
          </button>
          <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; font-size: 12px; color: #555;">
            <strong>How to share:</strong><br>
            1. Download the HTML file<br>
            2. Upload to GitHub Gist, Dropbox, or any file host<br>
            3. Share the public link<br>
            4. Anyone can view without the extension!
          </div>
        </div>

        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
          <button
            id="humanity-close-btn"
            style="padding: 10px 20px; background: #ddd; color: #333; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 13px;"
          >
            Close
          </button>
        </div>
      </div>
    `;

    dialog.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      background: rgba(0,0,0,0.5) !important;
      z-index: 2147483647 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 20px !important;
    `;

    document.body.appendChild(dialog);

    // Tab switching
    dialog.querySelectorAll('.humanity-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const targetTab = e.target.dataset.tab;

        // Update tab buttons
        dialog.querySelectorAll('.humanity-tab').forEach(t => {
          t.style.background = t.dataset.tab === targetTab ? '#4CAF50' : 'transparent';
          t.style.color = t.dataset.tab === targetTab ? 'white' : '#666';
        });

        // Update tab content
        dialog.querySelectorAll('.humanity-tab-content').forEach(content => {
          content.style.display = content.dataset.content === targetTab ? 'block' : 'none';
        });
      });
    });

    // Copy format buttons
    dialog.querySelectorAll('.humanity-copy-format').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        try {
          const text = e.target.dataset.text.replace(/&quot;/g, '"');
          await navigator.clipboard.writeText(text);
          const originalText = e.target.textContent;
          e.target.textContent = '✓ Copied!';
          e.target.style.opacity = '0.8';
          setTimeout(() => {
            e.target.textContent = originalText;
            e.target.style.opacity = '1';
          }, 2000);
        } catch (err) {
          console.error('Copy failed:', err);
        }
      });
    });

    // Copy URL button
    const copyUrlBtn = document.getElementById('humanity-copy-url');
    if (copyUrlBtn) {
      copyUrlBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(shareUrl);
          copyUrlBtn.textContent = '✓ Copied!';
          copyUrlBtn.style.background = '#45a049';
          setTimeout(() => {
            copyUrlBtn.textContent = '📋 Copy Link';
            copyUrlBtn.style.background = '#4CAF50';
          }, 2000);
        } catch (err) {
          document.getElementById('humanity-share-url').select();
        }
      });
    }

    // View button
    const viewBtn = document.getElementById('humanity-view-btn');
    if (viewBtn) {
      viewBtn.addEventListener('click', () => {
        window.open(shareUrl, '_blank');
      });
    }

    // Download HTML button
    const downloadBtn = document.getElementById('humanity-download-html');
    if (downloadBtn && htmlExport) {
      downloadBtn.addEventListener('click', () => {
        this.downloadHTML(htmlExport, this.recording.id);
      });
    }

    // Close button
    document.getElementById('humanity-close-btn').addEventListener('click', () => {
      dialog.remove();
    });

    // Click outside to close
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        dialog.remove();
      }
    });
  }

  formatShareText(shareUrl, verification) {
    const wpm = verification.wpm || 0;
    const duration = verification.duration || 0;
    const characters = verification.characters || 0;

    return {
      reddit: `✓ Verified Human - ${wpm} WPM [Watch Replay](${shareUrl})`,
      linkedin: `✓ Humanity Badge Verified - Authentic human writing\nView typing proof: ${shareUrl}`
    };
  }

  downloadHTML(htmlContent, recordingId) {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `humanity-badge-${recordingId}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Show confirmation
    this.showMessage('✓ HTML file downloaded! Upload it anywhere to share.', '#4CAF50');
  }

  showRecordingIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'humanity-recording-indicator';
    indicator.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="width: 12px; height: 12px; background: #ff4444; border-radius: 50%; animation: pulse 1.5s infinite;"></div>
        <span>RECORDING - Type normally</span>
      </div>
    `;
    indicator.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      background: rgba(0,0,0,0.85) !important;
      color: white !important;
      padding: 12px 20px !important;
      border-radius: 8px !important;
      z-index: 2147483646 !important;
      font-weight: 500 !important;
    `;

    if (!document.getElementById('humanity-pulse-animation')) {
      const style = document.createElement('style');
      style.id = 'humanity-pulse-animation';
      style.textContent = `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(indicator);
  }

  hideRecordingIndicator() {
    const indicator = document.getElementById('humanity-recording-indicator');
    if (indicator) indicator.remove();
  }

  showSuccess(verification) {
    const banner = document.createElement('div');
    banner.innerHTML = `
      <div style="text-align: center;">
        <div style="font-size: 40px; margin-bottom: 10px;">✅</div>
        <div style="font-weight: 600; font-size: 18px; margin-bottom: 8px;">Humanity Badge Verified!</div>
        <div style="font-size: 14px; opacity: 0.9;">${verification.wpm} WPM • ${verification.duration}s • ${verification.characters} chars</div>
      </div>
    `;
    banner.style.cssText = `
      position: fixed !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      background: #4CAF50 !important;
      color: white !important;
      padding: 30px !important;
      border-radius: 15px !important;
      z-index: 2147483647 !important;
      box-shadow: 0 10px 40px rgba(76, 175, 80, 0.4) !important;
    `;

    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 3000);
  }

  showFailure(reason) {
    this.showMessage(`❌ Verification Failed: ${reason}`, '#f44336');
  }

  showMessage(text, color) {
    const msg = document.createElement('div');
    msg.textContent = text;
    msg.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      background: ${color} !important;
      color: white !important;
      padding: 12px 20px !important;
      border-radius: 8px !important;
      z-index: 2147483647 !important;
      font-weight: 600 !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
    `;

    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 3000);
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  listenForMessages() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'getStatus') {
        sendResponse({ isRecording: this.isRecording });
      } else if (message.action === 'toggleExtension') {
        this.handleToggle(message.enabled);
        sendResponse({ success: true });
      }
    });
  }

  handleToggle(enabled) {
    this.enabled = enabled;

    if (enabled) {
      if (!this.button) this.createButton();
    } else {
      if (this.button) {
        this.button.remove();
        this.button = null;
      }
      if (this.isRecording) {
        this.stopRecording();
      }
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new TypingRecorder());
} else {
  new TypingRecorder();
}
