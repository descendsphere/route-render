import logger from './Logger.js';

const STORAGE_KEY = 'gpx_route_library';
const CACHE_NAME = 'gpx-cache-v1';

class RouteStorage {
  /**
   * Caches an array of GPX file URLs.
   * @param {Array<string>} urls - An array of URLs to cache.
   */
  static async cacheStaticRoutes(urls) {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(urls);
      logger.info(`${urls.length} static routes successfully cached.`);
    } catch (error) {
      logger.error('Error caching static routes:', error);
    }
  }

  /**
   * Retrieves a GPX file's content, using a cache-first strategy.
   * @param {string} url - The URL of the GPX file to retrieve.
   * @returns {Promise<string|null>} The GPX content as a string, or null if an error occurs.
   */
  static async getGpx(url) {
    try {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(url);

      if (cachedResponse) {
        logger.info(`Serving GPX from cache: ${url}`);
        return cachedResponse.text();
      }

      logger.warn(`GPX not in cache, fetching from network: ${url}`);
      const networkResponse = await fetch(url);

      if (networkResponse.ok) {
        // Clone the response to put it in the cache, as a response can only be read once.
        await cache.put(url, networkResponse.clone());
        logger.info(`Successfully cached new GPX: ${url}`);
        return networkResponse.text();
      } else {
        // Don't cache bad responses
        throw new Error(`HTTP error! status: ${networkResponse.status}`);
      }
    } catch (error) {
      logger.error(`Error getting GPX for ${url}:`, error);
      return null;
    }
  }

  /**
   * Retrieves all route records from local storage.
   * @returns {Array<object>} An array of route records.
   */
  static getRoutes() {
    try {
      const routesJson = localStorage.getItem(STORAGE_KEY);
      return routesJson ? JSON.parse(routesJson) : [];
    } catch (error) {
      logger.error('Error reading routes from local storage:', error);
      return [];
    }
  }

  /**
   * Adds a new route record to local storage.
   * @param {object} routeData - The data for the new route.
   * @param {string} routeData.gpxString - The raw GPX content.
   * @param {string} routeData.name - The name for the route.
   * @param {string} routeData.sourceType - 'file', 'url', or 'static'.
   * @param {string} routeData.source - The original filename or URL.
   * @returns {object} The newly created route record with its ID.
   */
  static addRoute({ gpxString, name, sourceType, source }) {
    if (!name) {
      logger.error('Cannot add route: name is required.');
      return null;
    }

    const routes = this.getRoutes();
    const now = new Date();
    let id;

    if (sourceType === 'static' || sourceType === 'url') {
      id = source;
    } else {
      id = crypto.randomUUID();
    }

    // Check if a route with this ID already exists
    if (routes.some(route => route.id === id)) {
      logger.warn(`Route with ID "${id}" already exists. Not adding duplicate.`);
      return routes.find(route => route.id === id);
    }

    const newRecord = {
      id,
      name,
      sourceType,
      source,
      createdAt: now.toISOString(),
    };

    // Only add gpxString if it's provided (for file-based routes)
    if (gpxString) {
      newRecord.originalGpxString = gpxString; // Preserve original
      newRecord.gpxString = this._reduceGpxPrecision(gpxString);
    }

    routes.push(newRecord);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
      logger.info(`Successfully added route "${name}" with ID "${id}" to local storage.`);
      return newRecord;
    } catch (error) {
      logger.error('Error saving route to local storage:', error);
      // Attempt to remove the failed item to prevent corruption
      routes.pop();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
      return null;
    }
  }

  /**
   * Finds a route by its ID and merges new data into it.
   * @param {string} routeId - The ID of the route to update.
   * @param {object} updatedData - An object containing the properties to merge.
   * @returns {object|null} The updated route record or null if not found.
   */
  static updateRoute(routeId, updatedData) {
    const routes = this.getRoutes();
    const routeIndex = routes.findIndex(route => route.id === routeId);

    if (routeIndex === -1) {
      logger.error(`Cannot update route: ID "${routeId}" not found.`);
      return null;
    }

    // If gpxString is part of the update, ensure its precision is reduced.
    if (updatedData.gpxString) {
      updatedData.gpxString = this._reduceGpxPrecision(updatedData.gpxString);
    }

    // Merge the new data into the existing record
    const updatedRoute = { ...routes[routeIndex], ...updatedData };
    routes[routeIndex] = updatedRoute;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
      logger.info(`Successfully updated route "${updatedRoute.name}" in local storage.`);
      return updatedRoute;
    } catch (error) {
      logger.error('Error updating route in local storage:', error);
      return null;
    }
  }

  /**
   * Reduces the precision of coordinates and elevation in a GPX string.
   * @param {string} gpxString - The original GPX content.
   * @returns {string} The GPX content with reduced precision.
   * @private
   */
  static _reduceGpxPrecision(gpxString) {
    // Reduce precision of lat and lon attributes in any tag to 6 decimal places
    let reducedGpx = gpxString.replace(/(lat|lon)="(-?\d+\.\d+)"/g, (match, p1, p2) => {
      const value = parseFloat(p2).toFixed(6);
      return `${p1}="${value}"`;
    });

    // Reduce precision of content within <ele> tags to 2 decimal places
    reducedGpx = reducedGpx.replace(/(<ele>)(-?\d+(?:\.\d+)?)(<\/ele>)/g, (match, p1, p2, p3) => {
      const value = parseFloat(p2).toFixed(2);
      return `${p1}${value}${p3}`;
    });

    logger.info('Original GPX string length:', gpxString.length);
    logger.info('Reduced GPX string length:', reducedGpx.length);

    return reducedGpx;
  }

  /**
   * Clears all routes from local storage and the static asset cache.
   */
  static async clearAll() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      logger.info('Route library cleared from local storage.');
      await caches.delete(CACHE_NAME);
      logger.info('Static route cache cleared.');
    } catch (error) {
      logger.error('Error clearing storage:', error);
      alert('Could not clear all storage. See console for details.');
    }
  }
}

export default RouteStorage;
