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
    // First, check if recording data is in URL hash
    const hashData = this.loadFromHash();

    if (hashData) {
      this.recording = hashData;
      this.setupReplay();
      this.setupControls();
      this.setupShareUrl();
      return;
    }

    // Fall back to extension storage (original behavior)
    const urlParams = new URLSearchParams(window.location.search);
    const recordingId = urlParams.get('id');

    if (!recordingId) {
      this.showError('No recording ID or data provided');
      return;
    }

    await this.loadRecording(recordingId);
    this.setupControls();
    this.setupShareUrl();
  }

  loadFromHash() {
    // Check for #data= in URL hash
    const hash = window.location.hash;

    if (!hash || !hash.startsWith('#data=')) {
      return null;
    }

    try {
      const encoded = hash.substring(6); // Remove '#data='
      const jsonString = decodeURIComponent(escape(atob(encoded)));
      const recording = JSON.parse(jsonString);

      console.log('Loaded recording from URL hash:', recording.id);
      return recording;
    } catch (error) {
      console.error('Failed to decode hash data:', error);
      this.showError('Invalid share link - data could not be decoded');
      return null;
    }
  }

  async loadRecording(id) {
    try {
      // Check if chrome.runtime exists (extension context)
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
    // Set initial state
    this.textarea.value = this.recording.initialValue;
    this.textarea.placeholder = this.recording.placeholder;
    
    // Update info
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
    
    // Add copy link button handler
    document.getElementById('copy-link-btn').addEventListener('click', () => {
      this.copyShareUrl();
    });
    
    // Add share URL input click handler
    document.getElementById('share-url').addEventListener('click', (e) => {
      e.target.select();
    });
  }

  setupShareUrl() {
    const shareUrl = window.location.href;
    document.getElementById('share-url').value = shareUrl;
  }
  
  async copyShareUrl() {
    try {
      const shareUrl = document.getElementById('share-url').value;
      await navigator.clipboard.writeText(shareUrl);
      
      // Show feedback
      const button = document.getElementById('copy-link-btn');
      const originalText = button.textContent;
      button.textContent = '✓ Copied!';
      button.style.background = '#4CAF50';
      
      setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '';
      }, 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
      // Fallback: select the text so user can copy manually
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
    
    // Process all events that should have happened by now
    while (this.currentEventIndex < events.length && 
           events[this.currentEventIndex].timestamp <= elapsed) {
      
      const event = events[this.currentEventIndex];
      this.processEvent(event);
      this.currentEventIndex++;
    }
    
    // Update progress
    const progress = Math.min(elapsed / this.recording.duration * 100, 100);
    this.progressFill.style.width = progress + '%';
    document.getElementById('current-time').textContent = Math.round(elapsed / 1000) + 's';
    
    // Update cursor position
    this.updateCursorPosition();
    
    // Update stats
    this.updateStats();
    
    // Check if finished
    if (this.currentEventIndex >= events.length) {
      this.isPlaying = false;
      document.getElementById('play-btn').disabled = false;
      document.getElementById('pause-btn').disabled = true;
      this.cursor.style.display = 'none';
      return;
    }
    
    // Continue loop
    requestAnimationFrame(() => this.playLoop());
  }

  processEvent(event) {
    if (event.type === 'input') {
      this.textarea.value = event.value;
      
      // Set cursor position if available
      if (typeof event.selectionStart === 'number') {
        this.textarea.selectionStart = event.selectionStart;
        this.textarea.selectionEnd = event.selectionEnd;
      }
    }
  }

  updateCursorPosition() {
    const textarea = this.textarea;
    const cursorPos = textarea.selectionStart;
    
    // Create a temporary div to measure text
    const div = document.createElement('div');
    div.style.cssText = window.getComputedStyle(textarea).cssText;
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.height = 'auto';
    div.style.width = textarea.offsetWidth - 30 + 'px'; // Account for padding
    
    const textBeforeCursor = textarea.value.substring(0, cursorPos);
    div.textContent = textBeforeCursor;
    
    document.body.appendChild(div);
    
    const textRect = textarea.getBoundingClientRect();
    const lines = textBeforeCursor.split('\n').length;
    const lineHeight = 20; // Approximate line height
    
    this.cursor.style.left = (15) + 'px'; // Approximate position
    this.cursor.style.top = (15 + (lines - 1) * lineHeight) + 'px';
    
    document.body.removeChild(div);
  }

  updateStats() {
    const text = this.textarea.value;
    const charCount = text.length;
    const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
    
    // Calculate WPM based on elapsed time
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

// Initialize the replay player
new TypingReplayPlayer();