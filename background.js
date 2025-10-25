// Import URL shortening utilities
importScripts('gist-uploader.js', 'url-shortener.js');

class RecordingManager {
  constructor() {
    this.recordings = new Map();
    this.gistUploader = new GistUploader();
    this.urlShortener = new URLShortener();
    // GitHub Pages URL for universal replay viewing (works without extension)
    this.replayBaseUrl = 'https://marthur3.github.io/humanitybadge/replay.html';
    this.init();
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

      // Check if we should prompt for GitHub connection
      await this.checkGitHubPrompt(result.shareType);

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

  async checkGitHubPrompt(shareType) {
    try {
      // Don't prompt if already using GitHub Gist
      if (shareType === 'github-gist') {
        return;
      }

      // Check prompt history
      const result = await chrome.storage.sync.get([
        'githubToken',
        'githubOAuthToken',
        'githubSkipped',
        'githubPromptCount',
        'githubPromptDismissed'
      ]);

      // Don't prompt if user has GitHub configured
      const hasGitHub = !!(result.githubToken || result.githubOAuthToken);
      if (hasGitHub) {
        return;
      }

      // Don't prompt if user skipped setup
      if (result.githubSkipped) {
        return;
      }

      // Don't prompt if user dismissed
      if (result.githubPromptDismissed) {
        return;
      }

      // Don't prompt more than 2 times
      const promptCount = result.githubPromptCount || 0;
      if (promptCount >= 2) {
        await chrome.storage.sync.set({ githubPromptDismissed: true });
        return;
      }

      // Show prompt (via notification)
      await chrome.storage.sync.set({ githubPromptCount: promptCount + 1 });

      // Create notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: 'Humanity Badge - Get Professional URLs',
        message: 'Connect GitHub Gist for short gist.github.com/yourname/... URLs instead of long hash links. Click Settings to connect!',
        priority: 1
      });

      console.log('GitHub connection prompt shown (count:', promptCount + 1, ')');

    } catch (error) {
      console.error('Error checking GitHub prompt:', error);
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
    // Calculate recording size
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
    // Use hybrid approach: Store in Gist, view on GitHub Pages
    const hasGithubToken = await this.gistUploader.hasToken();
    if (hasGithubToken && htmlExport) {
      console.log('Attempting GitHub Gist upload...');
      const gistResult = await this.gistUploader.uploadToGist(htmlExport, recordingMeta);

      if (gistResult.success) {
        // Extract Gist ID from URL (e.g., gist.github.com/user/abc123 -> abc123)
        const gistId = gistResult.gistId;

        // Create GitHub Pages URL that loads from Gist
        const githubPagesUrl = `${this.replayBaseUrl}?gist=${gistId}`;

        console.log('✓ GitHub Gist upload successful. Gist ID:', gistId);
        console.log('✓ Shareable URL (GitHub Pages + Gist):', githubPagesUrl);

        return {
          shareUrl: githubPagesUrl, // GitHub Pages URL (universal access)
          shareType: 'github-gist', // Still a Gist (for UI display)
          recordingSize: recordingSize,
          htmlExport: htmlExport,
          gistId: gistId,
          gistUrl: gistResult.url // Original Gist URL (for reference)
        };
      } else {
        console.warn('GitHub Gist upload failed:', gistResult.error);
        // Continue to fallback methods
      }
    }

    // TIER 2: Try is.gd URL shortening for hash-encoded URLs
    if (recordingSize < 500000) {
      const encoded = this.encodeRecording(recordingData);
      // Use GitHub Pages URL so links work for anyone (no extension needed)
      const longUrl = `${this.replayBaseUrl}#data=${encoded}`;

      // Check if URL is suitable for shortening
      const canShorten = this.urlShortener.canShorten(longUrl);

      if (canShorten.canShorten) {
        console.log('Attempting is.gd URL shortening...');
        const shortResult = await this.urlShortener.shortenUrl(longUrl);

        if (shortResult.success) {
          console.log('✓ URL shortened:', longUrl.length, '→', shortResult.shortUrl.length, 'chars');
          return {
            shareUrl: shortResult.shortUrl,
            shareType: 'is.gd-short',
            recordingSize: recordingSize,
            htmlExport: htmlExport,
            originalUrl: longUrl
          };
        } else {
          console.warn('is.gd shortening failed:', shortResult.error);
          // Use original hash URL as fallback
        }
      }

      // TIER 3: Use hash-encoded URL directly (no shortening)
      return {
        shareUrl: longUrl,
        shareType: recordingSize < 50000 ? 'hash' : 'hash-large',
        recordingSize: recordingSize,
        htmlExport: htmlExport
      };
    }

    // TIER 4: For very large recordings (>500KB), recommend HTML download
    return {
      shareUrl: null, // Too large for URL sharing
      shareType: 'html-only',
      recordingSize: recordingSize,
      htmlExport: htmlExport,
      message: 'Recording too large for URL sharing. Download HTML file to share.'
    };
  }

  encodeRecording(recordingData) {
    // Convert to JSON and encode as base64
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
      // Load the standalone template
      const templateUrl = chrome.runtime.getURL('standalone-replay.html');
      const response = await fetch(templateUrl);
      let htmlTemplate = await response.text();

      // Prepare recording data
      const recordingJson = JSON.stringify(recordingData, null, 2);

      // Replace the placeholder with actual recording data
      htmlTemplate = htmlTemplate.replace('{{RECORDING_DATA}}', recordingJson);

      // Update Open Graph meta tags with recording details
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
