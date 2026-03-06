importScripts('url-shortener.js', 'jsonblob-storage.js');

class RecordingManager {
  constructor() {
    this.recordings = new Map();
    this.urlShortener = new URLShortener();
    this.jsonBlobStorage = new JsonBlobStorage();
    this.replayBaseUrl = 'https://humanitype.netlify.app';
    this.init();
  }

  init() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true;
    });
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
      await chrome.storage.local.set({ recordings: Object.fromEntries(this.recordings) });
    } catch (error) {
      console.error('Failed to save recordings:', error);
    }
  }

  handleMessage(message, sender, sendResponse) {
    switch (message.action) {
      case 'saveRecording':
        this.saveRecording(message.data).then(result => sendResponse(result));
        break;
      case 'getRecordings':
        sendResponse({ recordings: Array.from(this.recordings.values()) });
        break;
      case 'deleteRecording':
        this.deleteRecording(message.id).then(result => sendResponse(result));
        break;
      case 'getRecording':
        sendResponse({ recording: this.recordings.get(message.id) || null });
        break;
    }
  }

  async saveRecording(recordingData) {
    try {
      this.recordings.set(recordingData.id, recordingData);
      await this.saveRecordings();
      const shareUrl = await this.generateShareUrl(recordingData);
      return { success: true, shareUrl, id: recordingData.id };
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
    // Tier 1: JSONBlob (no account needed, short URL via is.gd)
    try {
      const blobResult = await this.jsonBlobStorage.store(recordingData);
      if (blobResult.success) {
        const blobUrl = `${this.replayBaseUrl}?blob=${blobResult.blobId}`;
        const shortResult = await this.urlShortener.shortenUrl(blobUrl);
        return shortResult.success ? shortResult.shortUrl : blobUrl;
      }
    } catch (e) {
      console.warn('JSONBlob failed:', e.message);
    }

    // Tier 2: Hash-encoded URL (always works, data self-contained)
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(recordingData))));
    const localUrl = chrome.runtime.getURL('replay.html');
    return `${localUrl}#data=${encoded}`;
  }
}

new RecordingManager();
