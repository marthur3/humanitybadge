// URL shortener using is.gd API (free, no API key needed)

class URLShortener {
  constructor() {
    this.apiUrl = 'https://is.gd/create.php';
    this.maxUrlLength = 8000; // is.gd limit
  }

  /**
   * Shorten a long URL using is.gd
   * @param {string} longUrl - The URL to shorten
   * @param {string} customShortCode - Optional custom short code
   * @returns {Promise<object>} - Result with short URL or error
   */
  async shortenUrl(longUrl, customShortCode = null) {
    try {
      // Check URL length
      if (longUrl.length > this.maxUrlLength) {
        return {
          success: false,
          error: `URL too long (${longUrl.length} chars, max ${this.maxUrlLength})`,
          tooLong: true
        };
      }

      // Build API URL
      const params = new URLSearchParams({
        format: 'json',
        url: longUrl
      });

      // Add custom short code if provided
      if (customShortCode) {
        params.append('shorturl', customShortCode);
      }

      const apiUrl = `${this.apiUrl}?${params.toString()}`;

      // Make API request
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();

        // is.gd returns either {shorturl: "..."} or {errorcode: ..., errormessage: "..."}
        if (data.shorturl) {
          return {
            success: true,
            shortUrl: data.shorturl,
            originalUrl: longUrl
          };
        } else if (data.errorcode) {
          return {
            success: false,
            error: data.errormessage || 'Unknown error',
            errorCode: data.errorcode
          };
        } else {
          return {
            success: false,
            error: 'Unexpected response format'
          };
        }
      } else {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      console.error('Error shortening URL:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if a URL is suitable for shortening
   * @param {string} url - The URL to check
   * @returns {object} - Check result
   */
  canShorten(url) {
    if (!url || typeof url !== 'string') {
      return {
        canShorten: false,
        reason: 'Invalid URL'
      };
    }

    if (url.length > this.maxUrlLength) {
      return {
        canShorten: false,
        reason: `URL too long (${url.length} chars, max ${this.maxUrlLength})`
      };
    }

    // Check if URL is already short
    if (url.length < 100) {
      return {
        canShorten: false,
        reason: 'URL already short enough'
      };
    }

    // Check if URL is from a shortener (avoid double-shortening)
    const shortenerDomains = ['is.gd', 'bit.ly', 'tinyurl.com', 'goo.gl', 't.co'];
    try {
      const urlObj = new URL(url);
      if (shortenerDomains.some(domain => urlObj.hostname.includes(domain))) {
        return {
          canShorten: false,
          reason: 'URL already shortened'
        };
      }
    } catch (e) {
      return {
        canShorten: false,
        reason: 'Invalid URL format'
      };
    }

    return {
      canShorten: true,
      reason: 'OK'
    };
  }

  /**
   * Shorten URL with automatic fallback
   * @param {string} url - The URL to shorten
   * @returns {Promise<string>} - Short URL or original URL if shortening fails
   */
  async shortenWithFallback(url) {
    const check = this.canShorten(url);

    if (!check.canShorten) {
      console.log('URL shortening skipped:', check.reason);
      return url;
    }

    const result = await this.shortenUrl(url);

    if (result.success) {
      console.log('URL shortened:', url.length, '→', result.shortUrl.length, 'chars');
      return result.shortUrl;
    } else {
      console.warn('URL shortening failed, using original:', result.error);
      return url;
    }
  }

  /**
   * Batch shorten multiple URLs
   * @param {string[]} urls - Array of URLs to shorten
   * @param {number} delayMs - Delay between requests (rate limiting)
   * @returns {Promise<object[]>} - Array of results
   */
  async shortenBatch(urls, delayMs = 1000) {
    const results = [];

    for (const url of urls) {
      const result = await this.shortenUrl(url);
      results.push({
        originalUrl: url,
        ...result
      });

      // Rate limiting delay
      if (delayMs > 0 && urls.indexOf(url) < urls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }

  /**
   * Get statistics about URL
   * Note: is.gd doesn't provide stats API, this is for compatibility
   */
  async getStats(shortUrl) {
    return {
      success: false,
      error: 'is.gd does not provide statistics API'
    };
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.URLShortener = URLShortener;
}

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = URLShortener;
}
