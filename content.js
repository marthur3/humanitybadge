class TypingRecorder {
  constructor() {
    this.isRecording = false;
    this.recording = null;
    this.startTime = null;
    this.modalTextarea = null;
    this.button = null;
    this.modal = null;
    this.enabled = true;
    this.wpmInterval = null;
    this.boundHandlers = null;

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
    this.button.title = 'Humanity Badge — Type a verified comment';
    this.button.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;

    this.button.style.cssText = `
      position: fixed !important;
      bottom: 20px !important;
      right: 20px !important;
      width: 52px !important;
      height: 52px !important;
      background: #1a73e8 !important;
      border: none !important;
      border-radius: 50% !important;
      cursor: pointer !important;
      z-index: 2147483647 !important;
      color: white !important;
      font-family: 'Google Sans', 'Segoe UI', Roboto, sans-serif !important;
      box-shadow: 0 2px 8px rgba(26,115,232,0.4), 0 6px 20px rgba(26,115,232,0.2) !important;
      transition: all 0.2s cubic-bezier(0.4,0,0.2,1) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 0 !important;
    `;

    this.button.addEventListener('mouseenter', () => {
      this.button.style.transform = 'scale(1.08)';
      this.button.style.boxShadow = '0 4px 12px rgba(26,115,232,0.5), 0 8px 24px rgba(26,115,232,0.25)';
    });

    this.button.addEventListener('mouseleave', () => {
      this.button.style.transform = 'scale(1)';
      this.button.style.boxShadow = '0 2px 8px rgba(26,115,232,0.4), 0 6px 20px rgba(26,115,232,0.2)';
    });

    this.button.addEventListener('click', () => this.openComposer());
    document.body.appendChild(this.button);
  }

  openComposer() {
    if (this.modal) return;

    if (!document.getElementById('hb-styles')) {
      const style = document.createElement('style');
      style.id = 'hb-styles';
      style.textContent = `
        @keyframes hb-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        #humanity-modal * { box-sizing: border-box; }
      `;
      document.head.appendChild(style);
    }

    this.modal = document.createElement('div');
    this.modal.id = 'humanity-modal';
    this.modal.style.cssText = `
      position: fixed !important;
      top: 0 !important; left: 0 !important;
      right: 0 !important; bottom: 0 !important;
      background: rgba(0,0,0,0.5) !important;
      z-index: 2147483647 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 20px !important;
      font-family: 'Google Sans', 'Segoe UI', Roboto, sans-serif !important;
    `;

    this.modal.innerHTML = `
      <div id="hb-panel" style="
        background: white;
        border-radius: 14px;
        width: 100%;
        max-width: 560px;
        box-shadow: 0 12px 40px rgba(0,0,0,0.3);
        overflow: hidden;
        display: flex;
        flex-direction: column;
      ">
        <div style="
          padding: 16px 20px;
          border-bottom: 1px solid #e8eaed;
          display: flex;
          align-items: center;
          gap: 10px;
        ">
          <div style="
            width: 10px; height: 10px;
            background: #d93025; border-radius: 50%;
            animation: hb-pulse 1.5s infinite;
            flex-shrink: 0;
          "></div>
          <span style="font-weight: 600; font-size: 15px; color: #202124; flex: 1;">
            Humanity Badge — Type Your Comment
          </span>
          <button id="hb-cancel-x" style="
            background: none; border: none; cursor: pointer;
            color: #5f6368; font-size: 22px; padding: 0 4px;
            line-height: 1; font-family: inherit;
          ">×</button>
        </div>

        <div id="hb-paste-warning" style="
          display: none;
          background: #fce8e6; color: #c5221f;
          padding: 8px 20px; font-size: 12px; font-weight: 500;
          border-bottom: 1px solid #f5c6c2;
        ">Paste blocked — type manually to earn Humanity Badge verification</div>

        <textarea id="hb-textarea"
          placeholder="Type your comment here... Paste is blocked to ensure authenticity."
          autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="true"
          style="
            width: 100%; min-height: 160px; max-height: 320px;
            padding: 16px 20px; border: none; outline: none; resize: vertical;
            font-size: 15px; line-height: 1.6; color: #202124;
            font-family: inherit; background: #fafafa;
          "
        ></textarea>

        <div style="
          padding: 8px 20px;
          background: #f8f9fa;
          border-top: 1px solid #f1f3f4;
          border-bottom: 1px solid #e8eaed;
          display: flex; align-items: center; gap: 16px;
          font-size: 12px; color: #80868b;
        ">
          <span id="hb-stat-wpm">— WPM</span>
          <span id="hb-stat-chars">0 chars</span>
          <span id="hb-stat-time">0s</span>
          <span style="margin-left: auto; font-size: 11px; color: #bdc1c6;">
            No paste · No drag-drop · 100% human
          </span>
        </div>

        <div style="padding: 14px 20px; display: flex; justify-content: flex-end; gap: 10px;">
          <button id="hb-cancel-btn" style="
            padding: 9px 20px; border: 1px solid #dadce0;
            border-radius: 8px; cursor: pointer;
            font-size: 14px; font-weight: 500; color: #5f6368;
            background: white; font-family: inherit;
          ">Cancel</button>
          <button id="hb-done-btn" style="
            padding: 9px 24px; background: #1a73e8; color: white;
            border: none; border-radius: 8px; cursor: pointer;
            font-size: 14px; font-weight: 500; font-family: inherit;
          ">Verify & Get Badge</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.modal);

    const textarea = this.modal.querySelector('#hb-textarea');
    this.modalTextarea = textarea;
    textarea.focus();

    this.startRecording(textarea);

    this.modal.querySelector('#hb-done-btn').addEventListener('click', () => this.finishRecording());
    this.modal.querySelector('#hb-cancel-btn').addEventListener('click', () => this.closeModal());
    this.modal.querySelector('#hb-cancel-x').addEventListener('click', () => this.closeModal());
    this.modal.addEventListener('click', (e) => { if (e.target === this.modal) this.closeModal(); });

    this.wpmInterval = setInterval(() => this.updateLiveStats(), 1000);
  }

  startRecording(element) {
    this.isRecording = true;
    this.startTime = Date.now();
    this.recording = {
      id: this.generateId(),
      startTime: this.startTime,
      events: [],
      initialValue: '',
      url: window.location.href,
      domain: window.location.hostname
    };

    const handlers = {
      keydown: (e) => this.handleKeydown(e),
      input: (e) => this.handleInput(e),
      paste: (e) => this.blockPaste(e),
      drop: (e) => this.blockPaste(e),
      dragover: (e) => { e.preventDefault(); e.stopPropagation(); },
      contextmenu: (e) => { e.preventDefault(); e.stopPropagation(); }
    };

    this.boundHandlers = Object.entries(handlers).map(([type, handler]) => {
      element.addEventListener(type, handler, { passive: false });
      return { type, handler };
    });
  }

  blockPaste(e) {
    e.preventDefault();
    e.stopPropagation();
    const warning = this.modal && this.modal.querySelector('#hb-paste-warning');
    if (warning) {
      warning.style.display = 'block';
      clearTimeout(this._pasteWarnTimeout);
      this._pasteWarnTimeout = setTimeout(() => { warning.style.display = 'none'; }, 3000);
    }
  }

  handleKeydown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      this.blockPaste(e);
      return;
    }
    if (!this.isRecording) return;
    this.recording.events.push({
      type: 'keydown',
      timestamp: Date.now() - this.startTime,
      key: e.key,
      value: this.modalTextarea ? this.modalTextarea.value : ''
    });
  }

  handleInput(e) {
    if (!this.isRecording) return;
    this.recording.events.push({
      type: 'input',
      timestamp: Date.now() - this.startTime,
      key: '',
      value: this.modalTextarea ? this.modalTextarea.value : ''
    });
  }

  updateLiveStats() {
    if (!this.modal || !this.isRecording) return;
    const text = this.modalTextarea ? this.modalTextarea.value : '';
    const elapsed = Math.round((Date.now() - this.startTime) / 1000);
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const wpm = elapsed > 0 && words > 0 ? Math.round(words / (elapsed / 60)) : 0;

    const wpmEl = this.modal.querySelector('#hb-stat-wpm');
    const charsEl = this.modal.querySelector('#hb-stat-chars');
    const durEl = this.modal.querySelector('#hb-stat-time');
    if (wpmEl) wpmEl.textContent = wpm > 0 ? `${wpm} WPM` : '— WPM';
    if (charsEl) charsEl.textContent = `${text.length} chars`;
    if (durEl) durEl.textContent = `${elapsed}s`;
  }

  finishRecording() {
    if (!this.isRecording) return;

    const text = this.modalTextarea ? this.modalTextarea.value.trim() : '';
    if (!text) {
      this.showMessage('Nothing typed yet!', '#f29900');
      return;
    }

    this.isRecording = false;
    clearInterval(this.wpmInterval);
    this.removeListeners();

    this.recording.endTime = Date.now();
    this.recording.duration = this.recording.endTime - this.recording.startTime;
    this.recording.finalValue = this.modalTextarea ? this.modalTextarea.value : '';

    const verification = this.verify();
    this.recording.verification = verification;

    const doneBtn = this.modal && this.modal.querySelector('#hb-done-btn');
    if (doneBtn) {
      doneBtn.textContent = 'Verifying...';
      doneBtn.disabled = true;
    }

    this.saveRecording();
  }

  removeListeners() {
    if (!this.modalTextarea || !this.boundHandlers) return;
    this.boundHandlers.forEach(({ type, handler }) => {
      this.modalTextarea.removeEventListener(type, handler);
    });
    this.boundHandlers = null;
  }

  verify() {
    if (!this.recording || !this.recording.events.length) {
      return { isAuthentic: false, reason: 'No typing data recorded' };
    }

    const duration = this.recording.duration;
    const text = this.recording.finalValue || '';
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const wpm = words / (duration / 60000);

    if (duration < 5000) {
      return { isAuthentic: false, reason: 'Too fast — minimum 5 seconds required' };
    }

    if (wpm < 10 || wpm > 200) {
      return { isAuthentic: false, reason: `Speed outside human range: ${Math.round(wpm)} WPM` };
    }

    return {
      isAuthentic: true,
      wpm: Math.round(wpm),
      duration: Math.round(duration / 1000),
      characters: text.length,
      words
    };
  }

  saveRecording() {
    chrome.runtime.sendMessage({ action: 'saveRecording', data: this.recording }, (response) => {
      if (chrome.runtime.lastError) {
        const msg = chrome.runtime.lastError.message;
        if (msg.includes('Extension context invalidated')) {
          this.showMessage('Extension reloaded — please refresh the page.', '#f29900');
        } else {
          this.showMessage('Save failed: ' + msg, '#d93025');
        }
        const doneBtn = this.modal && this.modal.querySelector('#hb-done-btn');
        if (doneBtn) { doneBtn.textContent = 'Verify & Get Badge'; doneBtn.disabled = false; }
        return;
      }

      if (response && response.success) {
        this.showResultScreen(response);
      } else {
        this.showMessage('Failed: ' + (response ? response.error : 'Unknown error'), '#d93025');
        const doneBtn = this.modal && this.modal.querySelector('#hb-done-btn');
        if (doneBtn) { doneBtn.textContent = 'Verify & Get Badge'; doneBtn.disabled = false; }
      }
    });
  }

  showResultScreen(response) {
    if (!this.modal) return;
    const { shareUrl } = response;
    const verification = this.recording.verification;
    const commentText = this.recording.finalValue || '';
    const isAuthentic = verification && verification.isAuthentic;

    const badgeLine = isAuthentic && shareUrl
      ? `\n\n[Humanity Badge: Verified Human \u2713 | ${verification.wpm} WPM](${shareUrl})`
      : '';
    const fullText = commentText + badgeLine;

    const panel = this.modal.querySelector('#hb-panel');
    if (!panel) return;

    panel.innerHTML = `
      <div style="
        padding: 18px 20px;
        background: ${isAuthentic ? '#1a73e8' : '#d93025'};
        color: white;
        display: flex; align-items: center; gap: 12px;
      ">
        <div style="font-size: 24px; line-height: 1;">${isAuthentic ? '✓' : '✗'}</div>
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 15px;">
            ${isAuthentic ? 'Humanity Badge Verified' : 'Verification Failed'}
          </div>
          <div style="font-size: 12px; opacity: 0.88; margin-top: 2px;">
            ${isAuthentic
              ? `${verification.wpm} WPM &middot; ${verification.duration}s &middot; ${verification.words} words`
              : verification.reason}
          </div>
        </div>
        <button id="hb-close-result" style="
          background: rgba(255,255,255,0.2); border: none; cursor: pointer;
          color: white; font-size: 18px; border-radius: 50%;
          width: 28px; height: 28px; display: flex; align-items: center;
          justify-content: center; font-family: inherit; padding: 0; flex-shrink: 0;
        ">×</button>
      </div>

      ${isAuthentic && shareUrl ? `
        <div style="padding: 16px 20px 8px;">
          <div style="font-size: 11px; font-weight: 600; color: #80868b; letter-spacing: 0.5px; margin-bottom: 8px;">
            YOUR COMMENT + HUMANITY BADGE — READY TO PASTE
          </div>
          <textarea id="hb-result-text" readonly style="
            width: 100%; min-height: 120px; max-height: 240px;
            padding: 12px 14px; border: 1px solid #e8eaed; border-radius: 8px;
            font-size: 14px; line-height: 1.6; color: #202124;
            font-family: inherit; background: #f8f9fa; resize: vertical; outline: none;
          ">${fullText}</textarea>
        </div>

        <div style="padding: 8px 20px 14px; display: flex; gap: 8px;">
          <button id="hb-copy-all" style="
            flex: 1; padding: 11px; background: #1a73e8; color: white;
            border: none; border-radius: 8px; cursor: pointer;
            font-weight: 600; font-size: 14px; font-family: inherit;
          ">Copy Comment + Badge</button>
          <button id="hb-copy-link" style="
            padding: 11px 14px; background: white; color: #1a73e8;
            border: 1px solid #dadce0; border-radius: 8px; cursor: pointer;
            font-weight: 500; font-size: 13px; font-family: inherit; white-space: nowrap;
          ">Link only</button>
          <button id="hb-view-replay" style="
            padding: 11px 14px; background: white; color: #5f6368;
            border: 1px solid #dadce0; border-radius: 8px; cursor: pointer;
            font-weight: 500; font-size: 13px; font-family: inherit; white-space: nowrap;
          ">View replay</button>
        </div>

        <div style="
          padding: 10px 20px; background: #e8f0fe;
          border-top: 1px solid #d2e3fc;
          font-size: 12px; color: #1967d2;
        ">
          Paste into your comment. Anyone can verify by clicking the badge link — no extension needed.
        </div>
      ` : `
        <div style="padding: 20px; font-size: 14px; color: #5f6368; line-height: 1.6;">
          ${verification.reason}<br><br>
          <button id="hb-try-again" style="
            padding: 9px 20px; background: #1a73e8; color: white;
            border: none; border-radius: 8px; cursor: pointer;
            font-size: 14px; font-weight: 500; font-family: inherit;
          ">Try Again</button>
        </div>
      `}
    `;

    panel.querySelector('#hb-close-result').addEventListener('click', () => this.closeModal());
    panel.querySelector('#hb-try-again') && panel.querySelector('#hb-try-again').addEventListener('click', () => this.closeModal());

    const copyAllBtn = panel.querySelector('#hb-copy-all');
    if (copyAllBtn) {
      copyAllBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(fullText);
          copyAllBtn.textContent = '✓ Copied!';
          copyAllBtn.style.background = '#1e8e3e';
          setTimeout(() => {
            copyAllBtn.textContent = 'Copy Comment + Badge';
            copyAllBtn.style.background = '#1a73e8';
          }, 2000);
        } catch (err) {
          const ta = panel.querySelector('#hb-result-text');
          if (ta) { ta.select(); document.execCommand('copy'); }
        }
      });
    }

    const copyLinkBtn = panel.querySelector('#hb-copy-link');
    if (copyLinkBtn) {
      copyLinkBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(shareUrl);
          copyLinkBtn.textContent = '✓ Copied';
          setTimeout(() => { copyLinkBtn.textContent = 'Link only'; }, 2000);
        } catch (err) {}
      });
    }

    const viewBtn = panel.querySelector('#hb-view-replay');
    if (viewBtn) {
      viewBtn.addEventListener('click', () => window.open(shareUrl, '_blank'));
    }
  }

  closeModal() {
    clearInterval(this.wpmInterval);
    if (this.isRecording) {
      this.isRecording = false;
      this.removeListeners();
    }
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
    this.modalTextarea = null;
  }

  formatShareText(shareUrl, verification) {
    const wpm = (verification && verification.wpm) || 0;
    return {
      reddit: `Verified Human - ${wpm} WPM [Watch Replay](${shareUrl})`,
      linkedin: `Humanity Badge Verified - Authentic human writing\nView typing proof: ${shareUrl}`
    };
  }

  showMessage(text, color) {
    const msg = document.createElement('div');
    msg.textContent = text;
    msg.style.cssText = `
      position: fixed !important;
      top: 16px !important; right: 16px !important;
      background: ${color} !important; color: white !important;
      padding: 10px 20px !important; border-radius: 8px !important;
      z-index: 2147483647 !important; font-weight: 500 !important;
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
      if (this.button) { this.button.remove(); this.button = null; }
      if (this.isRecording) this.closeModal();
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new TypingRecorder());
} else {
  new TypingRecorder();
}
