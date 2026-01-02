/**
 * A utility class to downsample an array of GPX points based on a minimum distance.
 * This helps reduce noise and simplifies paths before more complex processing.
 */
class GPXDownsampler {
  /**
   * @param {object} config - Configuration options.
   * @param {number} [config.minDistanceMeters=10] - The minimum distance between points.
   */
  constructor(config = {}) {
    this.minDistanceMeters = config.minDistanceMeters || 10;
  }

  /**
   * Downsamples the provided GPX points.
   * @param {Array<object>} gpxPoints - An array of points, each with { lat, lon, elevation, time }.
   * @returns {Array<object>} The downsampled array of points.
   */
  downsample(gpxPoints) {
    if (gpxPoints.length <= 1) {
      return gpxPoints;
    }

    const downsampled = [gpxPoints[0]]; // Always keep the first point

    for (let i = 1; i < gpxPoints.length; i++) {
      const current = gpxPoints[i];
      const previous = downsampled[downsampled.length - 1];

      const distance = this._getDistanceMeters(
        previous.lat, previous.lon,
        current.lat, current.lon
      );

      if (distance >= this.minDistanceMeters) {
        downsampled.push(current);
      }
    }

    // Always keep the last point to preserve the route's exact end
    const lastOriginalPoint = gpxPoints[gpxPoints.length - 1];
    if (downsampled[downsampled.length - 1] !== lastOriginalPoint) {
      downsampled.push(lastOriginalPoint);
    }

    return downsampled;
  }

  /**
   * Calculates the distance between two lat/lon coordinates using the Haversine formula.
   * @private
   */
  _getDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

export default GPXDownsampler;
