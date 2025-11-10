import logger from './Logger.js';

class PoiService {
  /**
   * Fetches points of interest (POIs) near a given route.
   * @param {Array<object>} points - An array of points with lon and lat properties.
   * @returns {Promise<Array<object>>} A promise that resolves to an array of POIs.
   */
  static async fetchPois(points) {
    if (points.length === 0) {
      return [];
    }

    const bounds = this.getBounds(points);
    const query = this.buildOverpassQuery(bounds);

    try {
      logger.info('Fetching POIs from Overpass API.');
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      logger.info(`Found ${data.elements.length} POIs.`);

      return data.elements.map(element => {
        const tags = element.tags;
        const poiName = tags.name || tags['name:en'] || tags.alt_name || tags.old_name || 'Unnamed';

        const poi = {
          id: element.id,
          lat: element.lat,
          lon: element.lon,
          name: poiName,
          tags: tags,
        };

        if (poiName === 'Unnamed') {
          logger.warn('Found POI with no usable name tag. Full tags object:', tags);
        }
        return poi;
      });
    } catch (error) {
      logger.error('Error fetching POIs:', error);
      return [];
    }
  }

  /**
   * Calculates the bounding box of a route.
   * @param {Array<object>} points - An array of points with lon and lat properties.
   * @returns {object} An object with minLat, minLon, maxLat, and maxLon properties.
   */
  static getBounds(points) {
    let minLat = Infinity;
    let minLon = Infinity;
    let maxLat = -Infinity;
    let maxLon = -Infinity;

    points.forEach(p => {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lon < minLon) minLon = p.lon;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lon > maxLon) maxLon = p.lon;
    });

    return { minLat, minLon, maxLat, maxLon };
  }

  /**
   * Builds an Overpass API query to fetch POIs within a given bounding box.
   * @param {object} bounds - An object with minLat, minLon, maxLat, and maxLon properties.
   * @returns {string} The Overpass API query string.
   */
  static buildOverpassQuery(bounds) {
    const { minLat, minLon, maxLat, maxLon } = bounds;
    return `
      [out:json];
      (
        node["tourism"="viewpoint"](${minLat},${minLon},${maxLat},${maxLon});
        node["natural"="peak"](${minLat},${minLon},${maxLat},${maxLon});
      );
      out center;
    `;
  }
}

export default PoiService;
