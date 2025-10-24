// GitHub Gist uploader for Humanity Badge recordings

class GistUploader {
  constructor() {
    this.apiUrl = 'https://api.github.com/gists';
  }

  /**
   * Check if GitHub token is configured (either OAuth or manual)
   */
  async hasToken() {
    try {
      const result = await chrome.storage.sync.get(['githubToken', 'githubOAuthToken']);
      const hasOAuth = !!(result.githubOAuthToken && result.githubOAuthToken.access_token);
      const hasManual = !!(result.githubToken && result.githubToken.trim());
      return hasOAuth || hasManual;
    } catch (error) {
      console.error('Error checking GitHub token:', error);
      return false;
    }
  }

  /**
   * Get GitHub token from storage (prioritize OAuth, fallback to manual)
   */
  async getToken() {
    try {
      const result = await chrome.storage.sync.get(['githubToken', 'githubOAuthToken']);

      // Prioritize OAuth token
      if (result.githubOAuthToken && result.githubOAuthToken.access_token) {
        return result.githubOAuthToken.access_token;
      }

      // Fallback to manual token
      return result.githubToken || null;
    } catch (error) {
      console.error('Error getting GitHub token:', error);
      return null;
    }
  }

  /**
   * Get token source (oauth or manual)
   */
  async getTokenSource() {
    try {
      const result = await chrome.storage.sync.get(['githubToken', 'githubOAuthToken']);

      if (result.githubOAuthToken && result.githubOAuthToken.access_token) {
        return 'oauth';
      }

      if (result.githubToken && result.githubToken.trim()) {
        return 'manual';
      }

      return null;
    } catch (error) {
      console.error('Error getting token source:', error);
      return null;
    }
  }

  /**
   * Save GitHub token to storage
   */
  async saveToken(token) {
    try {
      await chrome.storage.sync.set({ githubToken: token.trim() });
      return { success: true };
    } catch (error) {
      console.error('Error saving GitHub token:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clear GitHub token from storage
   */
  async clearToken() {
    try {
      await chrome.storage.sync.remove(['githubToken']);
      return { success: true };
    } catch (error) {
      console.error('Error clearing GitHub token:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate GitHub token by making a test API call
   */
  async validateToken(token) {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        return {
          valid: true,
          username: userData.login,
          name: userData.name
        };
      } else {
        const error = await response.json();
        return {
          valid: false,
          error: error.message || 'Invalid token'
        };
      }
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Upload HTML content to GitHub Gist
   * @param {string} htmlContent - The HTML content to upload
   * @param {object} recordingMeta - Metadata about the recording
   * @returns {Promise<object>} - Result with gist URL or error
   */
  async uploadToGist(htmlContent, recordingMeta = {}) {
    try {
      const token = await this.getToken();
      if (!token) {
        return {
          success: false,
          error: 'No GitHub token configured',
          needsToken: true
        };
      }

      // Create filename based on recording metadata
      const timestamp = new Date().toISOString().split('T')[0];
      const wpm = recordingMeta.wpm || 0;
      const filename = `humanity-badge-${wpm}wpm-${timestamp}.html`;

      // Create gist
      const gistData = {
        description: `Humanity Badge Typing Verification - ${wpm} WPM`,
        public: false, // Private by default
        files: {
          [filename]: {
            content: htmlContent
          }
        }
      };

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(gistData)
      });

      if (response.ok) {
        const gist = await response.json();
        return {
          success: true,
          url: gist.html_url,
          rawUrl: gist.files[filename].raw_url,
          gistId: gist.id
        };
      } else {
        const error = await response.json();

        // Check if token is invalid
        if (response.status === 401) {
          return {
            success: false,
            error: 'Invalid GitHub token',
            needsToken: true
          };
        }

        return {
          success: false,
          error: error.message || 'Failed to create Gist'
        };
      }
    } catch (error) {
      console.error('Error uploading to Gist:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete a Gist by ID
   * @param {string} gistId - The Gist ID to delete
   */
  async deleteGist(gistId) {
    try {
      const token = await this.getToken();
      if (!token) {
        return {
          success: false,
          error: 'No GitHub token configured'
        };
      }

      const response = await fetch(`${this.apiUrl}/${gistId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.status === 204) {
        return { success: true };
      } else {
        return {
          success: false,
          error: 'Failed to delete Gist'
        };
      }
    } catch (error) {
      console.error('Error deleting Gist:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List user's Gists
   */
  async listGists(perPage = 10) {
    try {
      const token = await this.getToken();
      if (!token) {
        return {
          success: false,
          error: 'No GitHub token configured'
        };
      }

      const response = await fetch(`${this.apiUrl}?per_page=${perPage}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.ok) {
        const gists = await response.json();
        return {
          success: true,
          gists: gists.map(g => ({
            id: g.id,
            url: g.html_url,
            description: g.description,
            createdAt: g.created_at,
            files: Object.keys(g.files)
          }))
        };
      } else {
        return {
          success: false,
          error: 'Failed to list Gists'
        };
      }
    } catch (error) {
      console.error('Error listing Gists:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Make available globally for background script
if (typeof window !== 'undefined') {
  window.GistUploader = GistUploader;
}

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GistUploader;
}
