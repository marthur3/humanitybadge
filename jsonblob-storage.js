// JSONBlob.com storage for Humanity Badge recordings
// Free JSON storage API - no signup, no API key needed

class JsonBlobStorage {
  constructor() {
    this.apiUrl = 'https://jsonblob.com/api/jsonBlob';
  }

  /**
   * Store recording data on jsonblob.com
   * @param {object} recordingData - The recording to store
   * @returns {Promise<object>} - Result with blob ID or error
   */
  async store(recordingData) {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(recordingData)
      });

      if (response.ok || response.status === 201) {
        // jsonblob returns the blob URL in the Location header
        const location = response.headers.get('Location');
        if (location) {
          const blobId = location.split('/').pop();
          return {
            success: true,
            blobId: blobId,
            blobUrl: location
          };
        }

        // Fallback: try to extract from response URL or body
        const body = await response.json().catch(() => null);
        if (body) {
          // Some responses include the blob in the body
          return {
            success: true,
            blobId: response.url.split('/').pop(),
            blobUrl: response.url
          };
        }

        return {
          success: false,
          error: 'No blob ID returned from jsonblob.com'
        };
      } else {
        const errorText = await response.text().catch(() => '');
        return {
          success: false,
          error: `jsonblob.com returned ${response.status}: ${errorText}`
        };
      }
    } catch (error) {
      console.error('Error storing to jsonblob:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Retrieve recording data from jsonblob.com
   * @param {string} blobId - The blob ID
   * @returns {Promise<object>} - The recording data or null
   */
  async retrieve(blobId) {
    try {
      const response = await fetch(`${this.apiUrl}/${blobId}`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        return await response.json();
      } else {
        console.error('Failed to retrieve blob:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error retrieving from jsonblob:', error);
      return null;
    }
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.JsonBlobStorage = JsonBlobStorage;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = JsonBlobStorage;
}
