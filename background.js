// Import utilities
importScripts('gist-uploader.js', 'url-shortener.js', 'jsonblob-storage.js');

class RecordingManager {
  constructor() {
    this.recordings = new Map();
    this.gistUploader = new GistUploader();
    this.urlShortener = new URLShortener();
    this.jsonBlobStorage = new JsonBlobStorage();
    // GitHub Pages URL for external sharing (Gist/JSONBlob - works without extension)
    this.replayBaseUrl = 'https://marthur3.github.io/humanitybadge/replay.html';
    // Local extension URL for hash-encoded replays (always works, data is self-contained)
    this.localReplayUrl = chrome.runtime.getURL('replay.html');
    this.init();
  }

  // Wrap a promise with a timeout to prevent hanging
  withTimeout(promise, ms = 10000) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
    ]);
  }

  init() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

    // Load existing recordings
    this.loadRecordings();
  }

  async loadRecordings() {
    try {
      const result = await chrome.storage.local.get(['recordings']);
      if (result.recordings) {
        this.recordings = new Map(Object.entries(result.recordings));
      }
    } catch (error) {
      console.error('Failed to load recordings:', error);
    }
  }

  async saveRecordings() {
    try {
      const recordingsObj = Object.fromEntries(this.recordings);
      await chrome.storage.local.set({ recordings: recordingsObj });
    } catch (error) {
      console.error('Failed to save recordings:', error);
    }
  }

  handleMessage(message, sender, sendResponse) {
    switch (message.action) {
      case 'recordingStarted':
        console.log('Recording started:', message.data.id);
        sendResponse({ success: true });
        break;

      case 'saveRecording':
        this.saveRecording(message.data).then(result => {
          sendResponse(result);
        });
        break;

      case 'getRecordings':
        sendResponse({ recordings: Array.from(this.recordings.values()) });
        break;

      case 'deleteRecording':
        this.deleteRecording(message.id).then(result => {
          sendResponse(result);
        });
        break;

      case 'getRecording':
        const recording = this.recordings.get(message.id);
        sendResponse({ recording: recording || null });
        break;
    }
  }

  async saveRecording(recordingData) {
    try {
      this.recordings.set(recordingData.id, recordingData);
      await this.saveRecordings();

      const result = await this.generateShareUrl(recordingData);

      return {
        success: true,
        shareUrl: result.shareUrl,
        shareType: result.shareType,
        recordingSize: result.recordingSize,
        id: recordingData.id,
        htmlExport: result.htmlExport
      };
    } catch (error) {
      console.error('Failed to save recording:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteRecording(id) {
    try {
      this.recordings.delete(id);
      await this.saveRecordings();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async generateShareUrl(recordingData) {
    const jsonString = JSON.stringify(recordingData);
    const recordingSize = new Blob([jsonString]).size;

    // Generate standalone HTML for easy sharing
    const htmlExport = await this.generateStandaloneHTML(recordingData);

    // Prepare recording metadata for Gist
    const verification = recordingData.verification || {};
    const recordingMeta = {
      wpm: verification.wpm || 0,
      duration: verification.duration || 0,
      domain: recordingData.domain || 'unknown'
    };

    // TIER 1: Try GitHub Gist upload (if token configured)
    const hasGithubToken = await this.gistUploader.hasToken();
    if (hasGithubToken && htmlExport) {
      console.log('Attempting GitHub Gist upload...');
      const gistResult = await this.gistUploader.uploadToGist(htmlExport, recordingMeta);

      if (gistResult.success) {
        const gistId = gistResult.gistId;
        const githubPagesUrl = `${this.localReplayUrl}?gist=${gistId}`;

        console.log('GitHub Gist upload successful. Gist ID:', gistId);

        return {
          shareUrl: githubPagesUrl,
          shareType: 'github-gist',
          recordingSize: recordingSize,
          htmlExport: htmlExport,
          gistId: gistId,
          gistUrl: gistResult.url
        };
      } else {
        console.warn('GitHub Gist upload failed:', gistResult.error);
      }
    }

    // TIER 2: Try JSONBlob storage (no signup needed)
    console.log('Attempting JSONBlob storage...');
    const blobResult = await this.jsonBlobStorage.store(recordingData);

    if (blobResult.success) {
      const blobUrl = `${this.localReplayUrl}?blob=${blobResult.blobId}`;

      // Try to shorten the blob URL with is.gd (it's short enough now ~80 chars)
      const shortResult = await this.urlShortener.shortenUrl(blobUrl);
      const finalUrl = shortResult.success ? shortResult.shortUrl : blobUrl;

      console.log('JSONBlob storage successful. Blob ID:', blobResult.blobId);

      return {
        shareUrl: finalUrl,
        shareType: shortResult.success ? 'jsonblob-short' : 'jsonblob',
        recordingSize: recordingSize,
        htmlExport: htmlExport,
        blobId: blobResult.blobId
      };
    } else {
      console.warn('JSONBlob storage failed:', blobResult.error);
    }

    // TIER 3: Use hash-encoded URL with local extension replay page (always works)
    if (recordingSize < 500000) {
      const encoded = this.encodeRecording(recordingData);
      const localUrl = `${this.localReplayUrl}#data=${encoded}`;

      return {
        shareUrl: localUrl,
        shareType: recordingSize < 50000 ? 'hash' : 'hash-large',
        recordingSize: recordingSize,
        htmlExport: htmlExport
      };
    }

    // TIER 5: For very large recordings (>500KB), recommend HTML download
    return {
      shareUrl: null,
      shareType: 'html-only',
      recordingSize: recordingSize,
      htmlExport: htmlExport,
      message: 'Recording too large for URL sharing. Download HTML file to share.'
    };
  }

  encodeRecording(recordingData) {
    const jsonString = JSON.stringify(recordingData);
    return btoa(unescape(encodeURIComponent(jsonString)));
  }

  decodeRecording(encoded) {
    try {
      const jsonString = decodeURIComponent(escape(atob(encoded)));
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Failed to decode recording:', error);
      return null;
    }
  }

  async generateStandaloneHTML(recordingData) {
    try {
      const templateUrl = chrome.runtime.getURL('standalone-replay.html');
      const response = await fetch(templateUrl);
      let htmlTemplate = await response.text();

      const recordingJson = JSON.stringify(recordingData, null, 2);
      htmlTemplate = htmlTemplate.replace('{{RECORDING_DATA}}', recordingJson);

      const verification = recordingData.verification || {};
      const ogTitle = verification.isAuthentic
        ? `Humanity Badge - Verified Human: ${verification.wpm} WPM`
        : 'Humanity Badge - Typing Replay';

      const ogDescription = verification.isAuthentic
        ? `${verification.characters} characters typed at ${verification.wpm} WPM in ${verification.duration} seconds - Verified authentic human typing`
        : 'View this typing replay created with Humanity Badge';

      htmlTemplate = htmlTemplate.replace(
        '<meta property="og:title" content="Humanity Badge - Verified Human Typing">',
        `<meta property="og:title" content="${ogTitle}">`
      );

      htmlTemplate = htmlTemplate.replace(
        '<meta property="og:description" content="Authentic human typing verified with Humanity Badge">',
        `<meta property="og:description" content="${ogDescription}">`
      );

      return htmlTemplate;
    } catch (error) {
      console.error('Failed to generate standalone HTML:', error);
      return null;
    }
  }
}

new RecordingManager();
