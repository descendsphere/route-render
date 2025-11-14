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

    const newRecord = {
      id: crypto.randomUUID(), // Use a true UUID for uniqueness
      name,
      sourceType,
      source,
      createdAt: now.toISOString(),
    };

    // Only add gpxString if it's provided (for file-based routes)
    if (gpxString) {
      newRecord.gpxString = gpxString;
    }

    routes.push(newRecord);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
      logger.info(`Successfully added route "${name}" to local storage.`);
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
}

export default RouteStorage;
