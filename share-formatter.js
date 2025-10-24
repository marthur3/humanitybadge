// Share text formatting for different platforms
class ShareFormatter {
  constructor() {
    this.templates = {
      reddit: {
        minimal: (data) => `✓ Verified Human [proof](${data.shareUrl})`,
        standard: (data) => `✓ Verified Human - ${data.wpm} WPM [Watch Replay](${data.shareUrl})`,
        detailed: (data) => `✓ Humanity Badge: ${data.characters} chars in ${data.duration}s at ${data.wpm} WPM [Proof](${data.shareUrl})`
      },
      linkedin: {
        minimal: (data) => `✓ Humanity Badge Verified\nProof: ${data.shareUrl}`,
        standard: (data) => `✓ Humanity Badge Verified - Authentic human writing\nView typing proof: ${data.shareUrl}`,
        detailed: (data) => `✓ Humanity Badge Verification\n${data.characters} characters typed at ${data.wpm} WPM in ${data.duration} seconds\nAuthenticity proof: ${data.shareUrl}`
      }
    };
  }

  formatForReddit(recording, shareUrl, style = 'standard') {
    const data = this.extractData(recording, shareUrl);
    const template = this.templates.reddit[style] || this.templates.reddit.standard;
    return template(data);
  }

  formatForLinkedIn(recording, shareUrl, style = 'standard') {
    const data = this.extractData(recording, shareUrl);
    const template = this.templates.linkedin[style] || this.templates.linkedin.standard;
    return template(data);
  }

  extractData(recording, shareUrl) {
    const verification = recording.verification || {};
    return {
      shareUrl: shareUrl,
      wpm: verification.wpm || 0,
      duration: verification.duration || Math.round(recording.duration / 1000),
      characters: verification.characters || recording.finalValue?.length || 0,
      words: verification.words || 0
    };
  }

  getAllFormats(recording, shareUrl) {
    return {
      reddit: {
        minimal: this.formatForReddit(recording, shareUrl, 'minimal'),
        standard: this.formatForReddit(recording, shareUrl, 'standard'),
        detailed: this.formatForReddit(recording, shareUrl, 'detailed')
      },
      linkedin: {
        minimal: this.formatForLinkedIn(recording, shareUrl, 'minimal'),
        standard: this.formatForLinkedIn(recording, shareUrl, 'standard'),
        detailed: this.formatForLinkedIn(recording, shareUrl, 'detailed')
      }
    };
  }
}

// Make available globally for content script
if (typeof window !== 'undefined') {
  window.ShareFormatter = ShareFormatter;
}

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ShareFormatter;
}
