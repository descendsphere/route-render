import logger from './Logger.js';

/**
 * A utility class for simplifying a route path by resampling its points based on a minimum distance.
 */
class PathSimplifier {
  /**
   * Simplifies a path by ensuring a minimum distance between consecutive points.
   * @param {Array<object>} points - An array of points, each with lon, lat, and ele properties.
   * @param {number} minDistance - The minimum distance in meters between points in the simplified path.
   * @returns {Array<object>} A new, smaller array of points that represents the simplified path.
   */
  static simplify(points, minDistance) {
    if (!points || points.length < 2 || minDistance <= 0) {
      return points;
    }

    const simplifiedPoints = [points[0]];
    let lastPoint = points[0];

    for (let i = 1; i < points.length; i++) {
      const currentPoint = points[i];
      const distance = Cesium.Cartesian3.distance(lastPoint, currentPoint);

      if (distance >= minDistance) {
        simplifiedPoints.push(currentPoint);
        lastPoint = currentPoint;
      }
    }

    // Always include the very last point of the original path.
    const finalPoint = points[points.length - 1];
    if (simplifiedPoints[simplifiedPoints.length - 1] !== finalPoint) {
      simplifiedPoints.push(finalPoint);
    }
    
    logger.info(`Path simplified from ${points.length} to ${simplifiedPoints.length} points.`);
    return simplifiedPoints;
  }
}

export default PathSimplifier;
