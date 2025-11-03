import logger from './Logger.js';

class ReverseGeocodingService {
  /**
   * Gets the location name for a given latitude and longitude.
   * @param {number} lat - The latitude.
   * @param {number} lon - The longitude.
   * @returns {Promise<string>} A promise that resolves to the location name.
   */
  static async getLocationName(lat, lon) {
    try {
      logger.info(`Fetching location name for lat=${lat}, lon=${lon}`);
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const address = data.address;
      const location = address.city || address.town || address.village || address.hamlet || 'Unknown Location';
      logger.info(`Found location: ${location}`);
      return location;
    } catch (error) {
      logger.error('Error fetching location name:', error);
      return 'Unknown Location';
    }
  }
}

export default ReverseGeocodingService;
