import logger from './Logger.js';

class StatisticsCalculator {
  /**
   * Calculates the total distance and elevation gain of a route.
   * @param {Array<object>} points - An array of points with lon, lat, and ele properties.
   * @returns {object} An object with distance and elevationGain properties.
   */
  static calculate(points) {
    let distance = 0;
    let elevationGain = 0;

    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];

      // Calculate distance
      const carto1 = Cesium.Cartographic.fromDegrees(p1.lon, p1.lat);
      const carto2 = Cesium.Cartographic.fromDegrees(p2.lon, p2.lat);
      const ellipsoidGeodesic = new Cesium.EllipsoidGeodesic(carto1, carto2);
      distance += ellipsoidGeodesic.surfaceDistance;

      // Calculate elevation gain
      const ele1 = p1.ele || 0;
      const ele2 = p2.ele || 0;
      if (ele2 > ele1) {
        elevationGain += ele2 - ele1;
      }
    }

    logger.info(`Calculated statistics: distance=${distance.toFixed(2)}m, elevationGain=${elevationGain.toFixed(2)}m`);

    return {
      distance: (distance / 1000).toFixed(2), // in km
      elevationGain: elevationGain.toFixed(2), // in meters
    };
  }
}

export default StatisticsCalculator;
