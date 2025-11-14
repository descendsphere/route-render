import logger from './Logger.js';

class PoiService {
  constructor(viewer) {
    this.viewer = viewer;
    this._poiData = [];
    this._poiEntities = [];
  }

  get poiData() {
    return this._poiData;
  }

  /**
   * Fetches POIs from the Overpass API based on the route's bounding box.
   * @param {Array<object>} points - An array of points from the GPX track.
   */
  async fetchPois(points) {
    if (points.length === 0) {
      this._poiData = [];
      return;
    }

    // Calculate bounding box
    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
    points.forEach(p => {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lon < minLon) minLon = p.lon;
      if (p.lon > maxLon) maxLon = p.lon;
    });

    // Add a small buffer
    const buffer = 0.01;
    const bbox = `${minLat - buffer},${minLon - buffer},${maxLat + buffer},${maxLon + buffer}`;

    const query = `[out:json];(node["tourism"~"attraction|hotel|museum|viewpoint"](${bbox});way["tourism"~"attraction|hotel|museum|viewpoint"](${bbox}););out center;`;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

    logger.info('Fetching POIs from Overpass API...');
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      logger.info(`Found ${data.elements.length} potential POIs.`);

      this._poiData = data.elements.map(el => {
        const tags = el.tags;
        // Robust name finding
        const name = tags.name || tags['name:en'] || tags.alt_name || tags.old_name || 'Unnamed';
        return {
          id: el.id,
          lat: el.lat || el.center.lat,
          lon: el.lon || el.center.lon,
          name: name,
        };
      }).filter(poi => poi.name !== 'Unnamed'); // Filter out unnamed POIs

      logger.info(`Filtered to ${this._poiData.length} named POIs.`);
    } catch (error) {
      logger.error('Error fetching POIs:', error);
      this._poiData = [];
    }
  }

  /**
   * Renders an array of POI objects on the map.
   * @param {Array<object>} pois - An array of POI data.
   * @param {boolean} isVisible - The initial visibility state.
   */
  renderPois(pois, isVisible) {
    this.clearPoisFromViewer();
    this._poiData = pois; // Cache the data

    this._poiEntities = this._poiData.map(poi => {
      return this.viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(poi.lon, poi.lat, 300),
        description: poi.name,
        gpxEntity: true, // Flag for cleanup
        billboard: {
          image: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
          color: Cesium.Color.BLUE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          clampToGround: true,
          show: isVisible,
        },
        label: {
          text: poi.name,
          font: '12pt sans-serif',
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -50),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          show: isVisible,
        },
      });
    });
  }

  /**
   * Toggles the visibility of all managed POI entities.
   * @param {boolean} visible - The desired visibility state.
   */
  toggleVisibility(visible) {
    this._poiEntities.forEach(entity => {
      if (entity.billboard) entity.billboard.show = visible;
      if (entity.label) entity.label.show = visible;
    });
    if (this.viewer.scene.requestRenderMode) {
      this.viewer.scene.requestRender();
    }
  }

  /**
   * Removes all POI entities from the viewer.
   */
  clearPoisFromViewer() {
    this._poiEntities.forEach(entity => this.viewer.entities.remove(entity));
    this._poiEntities = [];
    this._poiData = [];
  }
}

export default PoiService;
