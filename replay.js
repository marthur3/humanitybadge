class TypingReplayPlayer {
  constructor() {
    this.recording = null;
    this.currentEventIndex = 0;
    this.isPlaying = false;
    this.isPaused = false;
    this.startTime = null;
    this.pausedTime = 0;
    this.speed = 1;

    this.textarea = document.getElementById('replay-textarea');
    this.cursor = document.getElementById('cursor');
    this.progressFill = document.getElementById('progress-fill');

    this.init();
  }

  async init() {
    const urlParams = new URLSearchParams(window.location.search);

    // Priority 1: Check for ?gist= parameter (GitHub Gist loading)
    const gistId = urlParams.get('gist');
    if (gistId) {
      await this.loadFromGist(gistId);
      if (this.recording) {
        this.setupReplay();
        this.setupControls();
        this.setupShareUrl();
      }
      return;
    }

    // Priority 2: Check for ?blob= parameter (JSONBlob loading)
    const blobId = urlParams.get('blob');
    if (blobId) {
      await this.loadFromJsonBlob(blobId);
      if (this.recording) {
        this.setupReplay();
        this.setupControls();
        this.setupShareUrl();
      }
      return;
    }

    // Priority 3: Check if recording data is in URL hash
    const hashData = this.loadFromHash();
    if (hashData) {
      this.recording = hashData;
      this.setupReplay();
      this.setupControls();
      this.setupShareUrl();
      return;
    }

    // Priority 4: Fall back to extension storage
    const recordingId = urlParams.get('id');
    if (!recordingId) {
      this.showError('No recording ID or data provided');
      return;
    }

    await this.loadRecording(recordingId);
    this.setupControls();
    this.setupShareUrl();
  }

  async loadFromJsonBlob(blobId) {
    try {
      console.log('Loading recording from JSONBlob:', blobId);

      const response = await fetch(`https://jsonblob.com/api/jsonBlob/${blobId}`, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`JSONBlob returned ${response.status}: ${response.statusText}`);
      }

      this.recording = await response.json();
      console.log('Recording loaded from JSONBlob:', this.recording.id);
      return this.recording;

    } catch (error) {
      console.error('Failed to load from JSONBlob:', error);
      this.showError(`Failed to load recording: ${error.message}`);
      return null;
    }
  }

  async loadFromGist(gistId) {
    try {
      console.log('Loading recording from GitHub Gist:', gistId);

      const response = await fetch(`https://api.github.com/gists/${gistId}`);

      if (!response.ok) {
        throw new Error(`GitHub API returned ${response.status}: ${response.statusText}`);
      }

      const gistData = await response.json();
      const files = Object.values(gistData.files);
      if (files.length === 0) {
        throw new Error('No files found in Gist');
      }

      const htmlFile = files[0];
      const htmlContent = htmlFile.content;

      const recordingMatch = htmlContent.match(/<script[^>]*id="recording-data"[^>]*>([\s\S]*?)<\/script>/);
      if (!recordingMatch) {
        throw new Error('Recording data not found in Gist HTML');
      }

      this.recording = JSON.parse(recordingMatch[1].trim());
      console.log('Recording loaded from Gist:', this.recording.id);
      return this.recording;

    } catch (error) {
      console.error('Failed to load from Gist:', error);
      this.showError(`Failed to load recording from Gist: ${error.message}`);
      return null;
    }
  }

  loadFromHash() {
    const hash = window.location.hash;
    if (!hash || !hash.startsWith('#data=')) {
      return null;
    }

    try {
      const encoded = hash.substring(6);
      const jsonString = decodeURIComponent(escape(atob(encoded)));
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Failed to decode hash data:', error);
      this.showError('Invalid share link - data could not be decoded');
      return null;
    }
  }

  async loadRecording(id) {
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        this.showError('This replay requires the Humanity Badge extension to be installed');
        return;
      }

      const response = await chrome.runtime.sendMessage({
        action: 'getRecording',
        id: id
      });

      if (!response.recording) {
        this.showError('Recording not found');
        return;
      }

      this.recording = response.recording;
      this.setupReplay();
    } catch (error) {
      this.showError('Failed to load recording: ' + error.message);
    }
  }

  setupReplay() {
    this.textarea.value = this.recording.initialValue;
    this.textarea.placeholder = this.recording.placeholder;

    document.getElementById('site-info').textContent = `From: ${this.recording.domain}`;
    document.getElementById('duration-info').textContent = `Duration: ${Math.round(this.recording.duration / 1000)}s`;
    document.getElementById('total-time').textContent = Math.round(this.recording.duration / 1000) + 's';

    this.updateStats();
  }

  setupControls() {
    document.getElementById('play-btn').addEventListener('click', () => this.play());
    document.getElementById('pause-btn').addEventListener('click', () => this.pause());
    document.getElementById('reset-btn').addEventListener('click', () => this.reset());

    document.getElementById('speed-select').addEventListener('change', (e) => {
      this.speed = parseFloat(e.target.value);
    });

    document.getElementById('copy-link-btn').addEventListener('click', () => {
      this.copyShareUrl();
    });

    document.getElementById('share-url').addEventListener('click', (e) => {
      e.target.select();
    });
  }

  setupShareUrl() {
    document.getElementById('share-url').value = window.location.href;
  }

  async copyShareUrl() {
    try {
      const shareUrl = document.getElementById('share-url').value;
      await navigator.clipboard.writeText(shareUrl);

      const button = document.getElementById('copy-link-btn');
      const originalText = button.textContent;
      button.textContent = 'Copied!';
      button.style.background = '#1a73e8';

      setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '';
      }, 2000);
    } catch (error) {
      document.getElementById('share-url').select();
    }
  }

  play() {
    if (!this.recording) return;

    this.isPlaying = true;
    this.isPaused = false;
    this.startTime = Date.now() - this.pausedTime;

    document.getElementById('play-btn').disabled = true;
    document.getElementById('pause-btn').disabled = false;

    this.cursor.style.display = 'block';
    this.playLoop();
  }

  pause() {
    this.isPaused = true;
    this.isPlaying = false;
    this.pausedTime = Date.now() - this.startTime;

    document.getElementById('play-btn').disabled = false;
    document.getElementById('pause-btn').disabled = true;

    this.cursor.style.display = 'none';
  }

  reset() {
    this.isPlaying = false;
    this.isPaused = false;
    this.currentEventIndex = 0;
    this.pausedTime = 0;
    this.startTime = null;

    this.textarea.value = this.recording.initialValue;
    this.cursor.style.display = 'none';
    this.progressFill.style.width = '0%';

    document.getElementById('play-btn').disabled = false;
    document.getElementById('pause-btn').disabled = true;
    document.getElementById('current-time').textContent = '0s';

    this.updateStats();
  }

  playLoop() {
    if (!this.isPlaying || this.isPaused) return;

    const elapsed = (Date.now() - this.startTime) * this.speed;
    const events = this.recording.events;

    while (this.currentEventIndex < events.length &&
           events[this.currentEventIndex].timestamp <= elapsed) {
      this.processEvent(events[this.currentEventIndex]);
      this.currentEventIndex++;
    }

    const progress = Math.min(elapsed / this.recording.duration * 100, 100);
    this.progressFill.style.width = progress + '%';
    document.getElementById('current-time').textContent = Math.round(elapsed / 1000) + 's';

    this.updateCursorPosition();
    this.updateStats();

    if (this.currentEventIndex >= events.length) {
      this.isPlaying = false;
      document.getElementById('play-btn').disabled = false;
      document.getElementById('pause-btn').disabled = true;
      this.cursor.style.display = 'none';
      return;
    }

    requestAnimationFrame(() => this.playLoop());
  }

  processEvent(event) {
    if (event.type === 'input') {
      this.textarea.value = event.value;
      if (typeof event.selectionStart === 'number') {
        this.textarea.selectionStart = event.selectionStart;
        this.textarea.selectionEnd = event.selectionEnd;
      }
    }
  }

  updateCursorPosition() {
    const textarea = this.textarea;
    const cursorPos = textarea.selectionStart;

    const textBeforeCursor = textarea.value.substring(0, cursorPos);
    const lines = textBeforeCursor.split('\n').length;
    const lineHeight = 20;

    this.cursor.style.left = '15px';
    this.cursor.style.top = (15 + (lines - 1) * lineHeight) + 'px';
  }

  updateStats() {
    const text = this.textarea.value;
    const charCount = text.length;
    const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;

    let wpm = 0;
    if (this.isPlaying && this.startTime) {
      const elapsedMinutes = ((Date.now() - this.startTime) * this.speed) / 60000;
      wpm = Math.round(wordCount / Math.max(elapsedMinutes, 0.1));
    }

    document.getElementById('char-count').textContent = charCount;
    document.getElementById('word-count').textContent = wordCount;
    document.getElementById('wpm').textContent = wpm;
  }

  showError(message) {
    document.querySelector('.replay-container').innerHTML = `
      <div class="error">
        <h2>Error</h2>
        <p>${message}</p>
      </div>
    `;
  }
}

new TypingReplayPlayer();
