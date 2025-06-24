const axios = require('axios');

/**
 * Geocoding service using Nominatim (OpenStreetMap)
 * Free service with rate limiting: 1 request per second
 */
class GeocodingService {
  constructor() {
    this.baseUrl = 'https://nominatim.openstreetmap.org';
    this.rateLimitDelay = 1000; // 1 second delay between requests
    this.lastRequestTime = 0;
  }

  /**
   * Add delay to respect rate limiting
   */
  async respectRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const delay = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Geocode a place name to coordinates
   * @param {string} placeName - The place name to geocode
   * @param {string} region - The region to search in (e.g., "Ahmedabad, Gujarat, India")
   * @returns {Promise<{latitude: number, longitude: number, address: string}>}
   */
  async geocode(placeName, region = 'Ahmedabad, Gujarat, India') {
    try {
      await this.respectRateLimit();

      // Construct search query with region bias for Ahmedabad
      const searchQuery = `${placeName}, ${region}`;
      
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          q: searchQuery,
          format: 'json',
          limit: 1,
          addressdetails: 1,
          countrycodes: 'in', // Limit to India
          viewbox: '72.0,23.0,73.0,24.0', // Rough bounding box for Ahmedabad district
          bounded: 1
        },
        headers: {
          'User-Agent': 'PatrolMonitoringSystem/1.0'
        }
      });

      if (response.data && response.data.length > 0) {
        const result = response.data[0];
        
        return {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          address: result.display_name,
          confidence: this.calculateConfidence(result, placeName, region)
        };
      }

      throw new Error('No results found for the given place name');
    } catch (error) {
      console.error('Geocoding error:', error.message);
      throw new Error(`Failed to geocode "${placeName}": ${error.message}`);
    }
  }

  /**
   * Calculate confidence score for the geocoding result
   * @param {Object} result - The geocoding result
   * @param {string} placeName - The original place name
   * @param {string} region - The expected region
   * @returns {number} - Confidence score (0-1)
   */
  calculateConfidence(result, placeName, region) {
    let confidence = 0.5; // Base confidence
    
    const displayName = result.display_name.toLowerCase();
    const searchName = placeName.toLowerCase();
    const searchRegion = region.toLowerCase();
    
    // Check if place name is in the result
    if (displayName.includes(searchName)) {
      confidence += 0.3;
    }
    
    // Check if region is in the result
    if (displayName.includes('ahmedabad') && displayName.includes('gujarat')) {
      confidence += 0.2;
    }
    
    // Check importance score (higher is better)
    if (result.importance > 0.5) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Reverse geocode coordinates to address
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @returns {Promise<string>} - Formatted address
   */
  async reverseGeocode(latitude, longitude) {
    try {
      await this.respectRateLimit();

      const response = await axios.get(`${this.baseUrl}/reverse`, {
        params: {
          lat: latitude,
          lon: longitude,
          format: 'json',
          addressdetails: 1
        },
        headers: {
          'User-Agent': 'PatrolMonitoringSystem/1.0'
        }
      });

      if (response.data && response.data.display_name) {
        return response.data.display_name;
      }

      throw new Error('No address found for the given coordinates');
    } catch (error) {
      console.error('Reverse geocoding error:', error.message);
      throw new Error(`Failed to reverse geocode coordinates: ${error.message}`);
    }
  }

  /**
   * Validate if coordinates are within Ahmedabad district
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @returns {boolean} - True if within Ahmedabad district
   */
  isWithinAhmedabadDistrict(latitude, longitude) {
    // Rough bounding box for Ahmedabad district
    const ahmedabadBounds = {
      north: 24.0,
      south: 22.5,
      east: 73.0,
      west: 72.0
    };

    return (
      latitude >= ahmedabadBounds.south &&
      latitude <= ahmedabadBounds.north &&
      longitude >= ahmedabadBounds.west &&
      longitude <= ahmedabadBounds.east
    );
  }

  /**
   * Get nearby landmarks for a given location
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @param {number} radius - Search radius in meters (default: 1000)
   * @returns {Promise<Array>} - Array of nearby places
   */
  async getNearbyPlaces(latitude, longitude, radius = 1000) {
    try {
      await this.respectRateLimit();

      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          q: 'landmark',
          format: 'json',
          limit: 5,
          addressdetails: 1,
          viewbox: `${longitude - 0.01},${latitude - 0.01},${longitude + 0.01},${latitude + 0.01}`,
          bounded: 1
        },
        headers: {
          'User-Agent': 'PatrolMonitoringSystem/1.0'
        }
      });

      return response.data || [];
    } catch (error) {
      console.error('Nearby places error:', error.message);
      return [];
    }
  }
}

module.exports = new GeocodingService(); 