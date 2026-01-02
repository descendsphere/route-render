import CatmullRomSpline from './CatmullRomSpline.js';
import logger from './Logger.js';

/**
 * Creates and manages a time-aware Catmull-Rom spline for a given route.
 * It uses distance-based parameterization for the spline's shape but allows
 * for time-based sampling and evaluation.
 */
class RouteSpline {
  /**
   * @param {Array<object>} downsampledGpxPoints - The array of downsampled GPX points.
   * @param {object} config - Configuration options.
   * @param {number} [config.tension=0.5] - The tension of the Catmull-Rom spline.
   */
  constructor(downsampledGpxPoints, config = {}) {
    this.gpxPoints = downsampledGpxPoints;
    this.tension = config.tension !== undefined ? config.tension : 0.5;
    this.spline = null;

    // This array will map the time of each GPX point to a spline parameter t [0, 1]
    this._timeParamMap = [];
    this._init();
  }

  /**
   * Initializes the spline by parameterizing by distance and creating the spline object.
   * @private
   */
  _init() {
    if (this.gpxPoints.length < 2) {
      return;
    }
    // Step 1: Convert GPX points to Cartesian3
    const cartesianPoints = this.gpxPoints.map(p =>
      Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.ele || 0)
    );

    // Step 2: Create time parameterization based on cumulative distance
    this._timeParamMap = this._createDistanceParameterization();

    // Step 3: Build the Catmull-Rom Spline
    this.spline = new CatmullRomSpline({
      points: cartesianPoints,
      times: this._timeParamMap,
      tension: this.tension
    });
  }

  /**
   * Creates a parameterization map where the spline's `t` value [0, 1] corresponds
   * to the cumulative distance along the path. This prevents speed variations
   * from distorting the spline's shape.
   * @private
   */
  _createDistanceParameterization() {
    const distances = [0];
    let cumulativeDistance = 0;
    for (let i = 1; i < this.gpxPoints.length; i++) {
      const p1 = this.gpxPoints[i - 1];
      const p2 = this.gpxPoints[i];
      const dist = this._getDistanceMeters(p1.lat, p1.lon, p2.lat, p2.lon);
      cumulativeDistance += dist;
      distances.push(cumulativeDistance);
    }

    if (cumulativeDistance === 0) {
      return this.gpxPoints.map(() => 0);
    }

    return distances.map(d => d / cumulativeDistance);
  }

  /**
   * Converts a time in seconds (from the start of the route) into a `t` parameter
   * for spline evaluation, by linearly interpolating between the GPX points.
   * @param {number} timeSeconds - The time in seconds from the start of the route.
   * @returns {number} The corresponding spline parameter `t` [0, 1].
   */
  timeToSplineParameter(timeSeconds) {
    const startTime = this.gpxPoints[0].time;
    if (timeSeconds <= startTime) {
      return 0;
    }

    const endTime = this.gpxPoints[this.gpxPoints.length - 1].time;
    if (timeSeconds >= endTime) {
      return 1;
    }

    for (let i = 0; i < this.gpxPoints.length - 1; i++) {
      const p1 = this.gpxPoints[i];
      const p2 = this.gpxPoints[i + 1];

      if (timeSeconds >= p1.time && timeSeconds <= p2.time) {
        const timeSegmentDuration = p2.time - p1.time;
        if (timeSegmentDuration <= 0) {
          return this._timeParamMap[i];
        }
        const alpha = (timeSeconds - p1.time) / timeSegmentDuration;
        const param1 = this._timeParamMap[i];
        const param2 = this._timeParamMap[i + 1];
        return param1 + alpha * (param2 - param1);
      }
    }

    return 1; // Should not be reached if time is within bounds
  }

  /**
   * Evaluates the spline at a given time in seconds.
   * @param {number} timeSeconds - The time in seconds from the start of the route.
   * @returns {Cesium.Cartesian3} The position on the spline.
   */
  getPointAtTime(timeSeconds) {
    if (!this.spline) return null;
    const t = this.timeToSplineParameter(timeSeconds);
    return this.spline.getPoint(t);
  }

  /**
   * Gets the tangent of the spline at a given time in seconds.
   * @param {number} timeSeconds - The time in seconds from the start of the route.
   * @returns {Cesium.Cartesian3} The tangent vector on the spline.
   */
  getTangentAtTime(timeSeconds) {
    if (!this.spline) return null;
    const t = this.timeToSplineParameter(timeSeconds);
    return this.spline.getTangent(t);
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

export default RouteSpline;
