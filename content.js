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
    this.button.innerHTML = 'H';
    this.button.title = 'Humanity Badge - Click to record authentic typing';

    this.button.style.cssText = `
      position: fixed !important;
      bottom: 20px !important;
      right: 20px !important;
      width: 48px !important;
      height: 48px !important;
      background: #1a73e8 !important;
      border: none !important;
      border-radius: 50% !important;
      cursor: pointer !important;
      font-size: 20px !important;
      z-index: 2147483647 !important;
      color: white !important;
      font-weight: 700 !important;
      font-family: 'Google Sans', 'Segoe UI', Roboto, sans-serif !important;
      box-shadow: 0 2px 8px rgba(26,115,232,0.4), 0 6px 20px rgba(26,115,232,0.2) !important;
      transition: all 0.2s cubic-bezier(0.4,0,0.2,1) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      letter-spacing: 0 !important;
      line-height: 1 !important;
      padding: 0 !important;
    `;

    this.button.addEventListener('mouseenter', () => {
      if (!this.isRecording) {
        this.button.style.transform = 'scale(1.08)';
        this.button.style.boxShadow = '0 4px 12px rgba(26,115,232,0.5), 0 8px 24px rgba(26,115,232,0.25)';
      }
    });

    this.button.addEventListener('mouseleave', () => {
      if (!this.isRecording) {
        this.button.style.transform = 'scale(1)';
        this.button.style.boxShadow = '0 2px 8px rgba(26,115,232,0.4), 0 6px 20px rgba(26,115,232,0.2)';
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
      this.showMessage('No input field found on this page', '#d93025');
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

    // Update button to recording state
    this.button.innerHTML = '<span style="width:18px;height:18px;background:white;border-radius:3px;display:block;"></span>';
    this.button.title = 'Recording - Click to stop';
    this.button.style.background = '#d93025 !important';
    this.button.style.boxShadow = '0 2px 8px rgba(217,48,37,0.4), 0 6px 20px rgba(217,48,37,0.2) !important';

    this.addListeners(element);
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
      this.showMessage('Paste blocked - Type manually for verification', '#d93025');
      return;
    }

    // Block keyboard paste
    if (e.type === 'keydown' && (e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault();
      e.stopPropagation();
      this.showMessage('Paste blocked - Type manually for verification', '#d93025');
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

    // Reset button
    this.button.innerHTML = 'H';
    this.button.title = 'Humanity Badge - Click to record';
    this.button.style.background = '#1a73e8 !important';
    this.button.style.boxShadow = '0 2px 8px rgba(26,115,232,0.4), 0 6px 20px rgba(26,115,232,0.2) !important';
    this.button.style.transform = 'scale(1)';

    this.hideRecordingIndicator();

    // Finalize recording
    this.recording.endTime = Date.now();
    this.recording.duration = this.recording.endTime - this.recording.startTime;
    this.recording.finalValue = this.currentElement ?
      (this.currentElement.value || this.currentElement.textContent || '') : '';

    const verification = this.verify();
    this.recording.verification = verification;

    this.saveRecording();
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

    if (duration < 5000) {
      return { isAuthentic: false, reason: 'Too fast - minimum 5 seconds required' };
    }

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
      if (chrome.runtime.lastError) {
        console.error('Runtime error:', chrome.runtime.lastError);
        if (chrome.runtime.lastError.message.includes('Extension context invalidated')) {
          this.showMessage('Extension was reloaded. Please refresh this page.', '#f29900');
        } else {
          this.showMessage('Failed to save: ' + chrome.runtime.lastError.message, '#d93025');
        }
        return;
      }

      if (response && response.success) {
        this.showShareDialog(response);
      } else {
        this.showMessage('Failed to save recording: ' + (response?.error || 'Unknown error'), '#d93025');
      }
    });
  }

  showShareDialog(response) {
    const { shareUrl, shareType, recordingSize, htmlExport } = response;
    const verification = this.recording.verification;
    const isAuthentic = verification && verification.isAuthentic;
    const sizeKB = Math.round(recordingSize / 1024);

    // Share method label
    let methodLabel = '';
    let methodColor = '#1a73e8';
    switch (shareType) {
      case 'github-gist':
        methodLabel = 'GitHub Gist';
        methodColor = '#1e8e3e';
        break;
      case 'jsonblob-short':
      case 'jsonblob':
        methodLabel = 'Cloud link';
        methodColor = '#1a73e8';
        break;
      case 'is.gd-short':
        methodLabel = 'Shortened URL';
        methodColor = '#1a73e8';
        break;
      case 'hash':
      case 'hash-large':
        methodLabel = `Direct link (${sizeKB}KB)`;
        methodColor = '#f29900';
        break;
      case 'html-only':
        methodLabel = 'Download only';
        methodColor = '#d93025';
        break;
      default:
        methodLabel = 'Shareable link';
    }

    // Detect platform
    const hostname = window.location.hostname.toLowerCase();
    const isReddit = hostname.includes('reddit.com');
    const isLinkedIn = hostname.includes('linkedin.com');
    const defaultTab = isReddit ? 'reddit' : (isLinkedIn ? 'linkedin' : 'link');

    const shareData = this.formatShareText(shareUrl, verification);

    const dialog = document.createElement('div');
    dialog.id = 'humanity-share-dialog';

    const escapedReddit = (shareData.reddit || '').replace(/"/g, '&quot;');
    const escapedLinkedIn = (shareData.linkedin || '').replace(/"/g, '&quot;');

    dialog.innerHTML = `
      <div style="
        background: white;
        border-radius: 12px;
        max-width: 520px;
        width: 100%;
        box-shadow: 0 8px 28px rgba(0,0,0,0.28);
        font-family: 'Google Sans', 'Segoe UI', Roboto, sans-serif;
        overflow: hidden;
      ">
        <!-- Header -->
        <div style="
          padding: 20px 24px;
          background: ${isAuthentic ? '#1a73e8' : '#d93025'};
          color: white;
        ">
          <div style="font-size: 18px; font-weight: 500; margin-bottom: 4px;">
            ${isAuthentic ? 'Verified Human Typing' : 'Verification Failed'}
          </div>
          ${isAuthentic ? `
            <div style="font-size: 13px; opacity: 0.9;">
              ${verification.wpm} WPM &middot; ${verification.duration}s &middot; ${verification.characters} characters
            </div>
          ` : `
            <div style="font-size: 13px; opacity: 0.9;">${verification.reason}</div>
          `}
        </div>

        <!-- Method badge -->
        <div style="
          padding: 10px 24px;
          background: #f8f9fa;
          border-bottom: 1px solid #e8eaed;
          font-size: 12px;
          color: #5f6368;
          display: flex;
          align-items: center;
          gap: 6px;
        ">
          <span style="
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: ${methodColor};
          "></span>
          Shared via ${methodLabel}
        </div>

        <!-- Tabs -->
        <div style="display: flex; border-bottom: 1px solid #e8eaed;">
          ${['reddit', 'linkedin', 'link', 'download'].map(tab => `
            <button class="humanity-tab" data-tab="${tab}" style="
              flex: 1;
              padding: 12px 8px;
              border: none;
              background: none;
              cursor: pointer;
              font-size: 13px;
              font-weight: 500;
              color: ${defaultTab === tab ? '#1a73e8' : '#5f6368'};
              border-bottom: 2px solid ${defaultTab === tab ? '#1a73e8' : 'transparent'};
              font-family: inherit;
              transition: all 0.15s;
            ">${tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
          `).join('')}
        </div>

        <!-- Tab Content -->
        <div style="padding: 20px 24px;">

          <div class="humanity-tab-content" data-content="reddit" style="display: ${defaultTab === 'reddit' ? 'block' : 'none'};">
            <div style="font-size: 13px; color: #5f6368; margin-bottom: 10px;">
              Add to the end of your Reddit comment or post:
            </div>
            <textarea readonly style="
              width: 100%; height: 72px; padding: 10px; border: 1px solid #dadce0;
              border-radius: 8px; font-family: monospace; font-size: 12px;
              resize: none; box-sizing: border-box; margin-bottom: 10px;
              color: #202124; background: #f8f9fa;
            ">${shareData.reddit}</textarea>
            <button class="humanity-copy-format" data-text="${escapedReddit}" style="
              width: 100%; padding: 10px; background: #ff4500; color: white;
              border: none; border-radius: 8px; cursor: pointer;
              font-weight: 500; font-size: 13px; font-family: inherit;
              transition: background 0.15s;
            ">Copy Reddit Format</button>
          </div>

          <div class="humanity-tab-content" data-content="linkedin" style="display: ${defaultTab === 'linkedin' ? 'block' : 'none'};">
            <div style="font-size: 13px; color: #5f6368; margin-bottom: 10px;">
              Add to your LinkedIn post:
            </div>
            <textarea readonly style="
              width: 100%; height: 72px; padding: 10px; border: 1px solid #dadce0;
              border-radius: 8px; font-family: monospace; font-size: 12px;
              resize: none; box-sizing: border-box; margin-bottom: 10px;
              color: #202124; background: #f8f9fa;
            ">${shareData.linkedin}</textarea>
            <button class="humanity-copy-format" data-text="${escapedLinkedIn}" style="
              width: 100%; padding: 10px; background: #0a66c2; color: white;
              border: none; border-radius: 8px; cursor: pointer;
              font-weight: 500; font-size: 13px; font-family: inherit;
              transition: background 0.15s;
            ">Copy LinkedIn Format</button>
          </div>

          <div class="humanity-tab-content" data-content="link" style="display: ${defaultTab === 'link' ? 'block' : 'none'};">
            ${shareUrl ? `
              <input type="text" id="humanity-share-url" value="${shareUrl}" readonly style="
                width: 100%; padding: 10px; border: 1px solid #dadce0;
                border-radius: 8px; font-family: monospace; font-size: 12px;
                box-sizing: border-box; margin-bottom: 10px;
                color: #202124; background: #f8f9fa;
              " onclick="this.select()">
              <div style="display: flex; gap: 8px;">
                <button id="humanity-copy-url" style="
                  flex: 1; padding: 10px; background: #1a73e8; color: white;
                  border: none; border-radius: 8px; cursor: pointer;
                  font-weight: 500; font-size: 13px; font-family: inherit;
                ">Copy Link</button>
                <button id="humanity-view-btn" style="
                  flex: 1; padding: 10px; background: white; color: #1a73e8;
                  border: 1px solid #dadce0; border-radius: 8px; cursor: pointer;
                  font-weight: 500; font-size: 13px; font-family: inherit;
                ">View Replay</button>
              </div>
              <div style="
                font-size: 12px; color: #1e8e3e; margin-top: 10px;
                background: #e6f4ea; padding: 8px 12px; border-radius: 6px;
              ">Works for anyone - no extension needed</div>
            ` : `
              <div style="font-size: 13px; color: #5f6368;">
                Recording too large for URL sharing. Use the Download tab instead.
              </div>
            `}
          </div>

          <div class="humanity-tab-content" data-content="download" style="display: none;">
            <div style="font-size: 13px; color: #5f6368; margin-bottom: 12px;">
              Download a standalone HTML file that works anywhere:
            </div>
            <button id="humanity-download-html" style="
              width: 100%; padding: 12px; background: #1a73e8; color: white;
              border: none; border-radius: 8px; cursor: pointer;
              font-weight: 500; font-size: 14px; font-family: inherit;
              margin-bottom: 12px;
            ">Download HTML File</button>
            <div style="
              background: #f8f9fa; padding: 12px; border-radius: 8px;
              font-size: 12px; color: #5f6368; line-height: 1.6;
            ">
              <strong>How to share:</strong><br>
              1. Download the HTML file<br>
              2. Upload to GitHub Gist, Dropbox, or any host<br>
              3. Share the public link
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="
          padding: 12px 24px;
          border-top: 1px solid #e8eaed;
          display: flex;
          justify-content: flex-end;
        ">
          <button id="humanity-close-btn" style="
            padding: 8px 20px; background: none; color: #1a73e8;
            border: none; border-radius: 8px; cursor: pointer;
            font-weight: 500; font-size: 13px; font-family: inherit;
            transition: background 0.15s;
          ">Close</button>
        </div>
      </div>
    `;

    dialog.style.cssText = `
      position: fixed !important;
      top: 0 !important; left: 0 !important;
      right: 0 !important; bottom: 0 !important;
      background: rgba(0,0,0,0.4) !important;
      z-index: 2147483647 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 20px !important;
      font-family: 'Google Sans', 'Segoe UI', Roboto, sans-serif !important;
    `;

    document.body.appendChild(dialog);

    // Tab switching
    dialog.querySelectorAll('.humanity-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const targetTab = e.target.dataset.tab;
        dialog.querySelectorAll('.humanity-tab').forEach(t => {
          const isActive = t.dataset.tab === targetTab;
          t.style.color = isActive ? '#1a73e8' : '#5f6368';
          t.style.borderBottom = isActive ? '2px solid #1a73e8' : '2px solid transparent';
        });
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
          e.target.textContent = 'Copied!';
          setTimeout(() => { e.target.textContent = originalText; }, 2000);
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
          copyUrlBtn.textContent = 'Copied!';
          setTimeout(() => { copyUrlBtn.textContent = 'Copy Link'; }, 2000);
        } catch (err) {
          document.getElementById('humanity-share-url').select();
        }
      });
    }

    // View button
    document.getElementById('humanity-view-btn')?.addEventListener('click', () => {
      window.open(shareUrl, '_blank');
    });

    // Download HTML button
    const downloadBtn = document.getElementById('humanity-download-html');
    if (downloadBtn && htmlExport) {
      downloadBtn.addEventListener('click', () => {
        this.downloadHTML(htmlExport, this.recording.id);
      });
    }

    // Close
    document.getElementById('humanity-close-btn').addEventListener('click', () => dialog.remove());
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.remove(); });
  }

  formatShareText(shareUrl, verification) {
    const wpm = verification.wpm || 0;
    return {
      reddit: `Verified Human - ${wpm} WPM [Watch Replay](${shareUrl})`,
      linkedin: `Humanity Badge Verified - Authentic human writing\nView typing proof: ${shareUrl}`
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
    this.showMessage('HTML file downloaded!', '#1e8e3e');
  }

  showRecordingIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'humanity-recording-indicator';
    indicator.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="width: 10px; height: 10px; background: #d93025; border-radius: 50%; animation: hb-pulse 1.5s infinite;"></div>
        <span style="font-size: 13px; font-weight: 500;">Recording - Type normally</span>
      </div>
    `;
    indicator.style.cssText = `
      position: fixed !important;
      top: 16px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      background: white !important;
      color: #202124 !important;
      padding: 10px 20px !important;
      border-radius: 24px !important;
      z-index: 2147483646 !important;
      font-family: 'Google Sans', 'Segoe UI', Roboto, sans-serif !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15), 0 6px 20px rgba(0,0,0,0.1) !important;
    `;

    if (!document.getElementById('hb-pulse-animation')) {
      const style = document.createElement('style');
      style.id = 'hb-pulse-animation';
      style.textContent = `
        @keyframes hb-pulse {
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

  showMessage(text, color) {
    const msg = document.createElement('div');
    msg.textContent = text;
    msg.style.cssText = `
      position: fixed !important;
      top: 16px !important;
      right: 16px !important;
      background: ${color} !important;
      color: white !important;
      padding: 10px 20px !important;
      border-radius: 8px !important;
      z-index: 2147483647 !important;
      font-weight: 500 !important;
      font-size: 13px !important;
      font-family: 'Google Sans', 'Segoe UI', Roboto, sans-serif !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new TypingRecorder());
} else {
  new TypingRecorder();
}
