import logger from './Logger.js';

/**
 * Utility class to create and query a 3D Catmull-Rom spline.
 * This version supports non-uniform parameterization via a `times` array,
 * which is essential for correctly mapping GPX data where points are not
 * equidistant in time or distance.
 */
class CatmullRomSpline {
  /**
   * @param {object} options
   * @param {Array<Cesium.Cartesian3>} options.points - The array of control points.
   * @param {Array<number>} [options.times] - Array of t-values [0, 1] for each point. If not provided, assumes uniform spacing.
   * @param {number} [options.tension=0.5] - The tension of the spline.
   */
  constructor({ points, times, tension = 0.5 }) {
    if (points.length < 2) {
      throw new Error("CatmullRomSpline requires at least 2 control points.");
    }
    this.points = points;
    this.tension = tension;
    this.times = times && times.length === points.length ? times : this._createUniformTimes();
  }

  /**
   * Generates a uniformly spaced time array if none is provided.
   * @private
   */
  _createUniformTimes() {
    const numPoints = this.points.length;
    const times = new Array(numPoints);
    for (let i = 0; i < numPoints; i++) {
      times[i] = i / (numPoints - 1);
    }
    return times;
  }

  /**
   * Finds the segment index and local t-value for a global t.
   * @private
   */
  _getSegment(t) {
    if (t <= this.times[0]) {
      return { index: 0, localT: 0 };
    }
    if (t >= this.times[this.times.length - 1]) {
      return { index: this.times.length - 2, localT: 1 };
    }

    // Binary search would be more efficient here, but for a few hundred points, linear is fine.
    for (let i = 0; i < this.times.length - 1; i++) {
      if (t >= this.times[i] && t <= this.times[i+1]) {
        const segmentDuration = this.times[i+1] - this.times[i];
        const localT = (segmentDuration > 0) ? (t - this.times[i]) / segmentDuration : 0;
        return { index: i, localT };
      }
    }
    
    // Fallback for floating point precision issues at the very end.
    return { index: this.times.length - 2, localT: 1 };
  }

  /**
   * Standard Catmull-Rom interpolation formula for a single segment.
   * @private
   */
  _interpolate(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;

    // Standard Catmull-Rom formula
    const c1 = -0.5 * t3 + t2 - 0.5 * t;
    const c2 = 1.5 * t3 - 2.5 * t2 + 1.0;
    const c3 = -1.5 * t3 + 2.0 * t2 + 0.5 * t;
    const c4 = 0.5 * t3 - 0.5 * t2;

    const out = new Cesium.Cartesian3();
    Cesium.Cartesian3.multiplyByScalar(p0, c1, out);
    Cesium.Cartesian3.add(Cesium.Cartesian3.multiplyByScalar(p1, c2, new Cesium.Cartesian3()), out, out);
    Cesium.Cartesian3.add(Cesium.Cartesian3.multiplyByScalar(p2, c3, new Cesium.Cartesian3()), out, out);
    Cesium.Cartesian3.add(Cesium.Cartesian3.multiplyByScalar(p3, c4, new Cesium.Cartesian3()), out, out);

    return out;
  }

  /**
   * Gets a point on the spline at a given global t-value (0.0 to 1.0).
   * @param {number} t - A global value from 0.0 (start) to 1.0 (end).
   * @returns {Cesium.Cartesian3} The interpolated position on the spline.
   */
  getPoint(t) {
    t = Math.max(0, Math.min(1, t));
    const { index, localT } = this._getSegment(t);

    const p0 = this.points[Math.max(0, index - 1)];
    const p1 = this.points[index];
    const p2 = this.points[Math.min(this.points.length - 1, index + 1)];
    const p3 = this.points[Math.min(this.points.length - 1, index + 2)];

    return this._interpolate(p0, p1, p2, p3, localT);
  }

  /**
   * Gets the tangent (forward vector) on the spline at a given global t-value.
   * @param {number} t - A global value from 0.0 (start) to 1.0 (end).
   * @returns {Cesium.Cartesian3} The normalized tangent vector.
   */
  getTangent(t) {
    // Simplified: calculate two close points and find the vector between them
    const epsilon = 0.0001;
    const p1 = this.getPoint(t - epsilon);
    const p2 = this.getPoint(t + epsilon);
    return Cesium.Cartesian3.normalize(Cesium.Cartesian3.subtract(p2, p1, new Cesium.Cartesian3()), new Cesium.Cartesian3());
  }
}

export default CatmullRomSpline;
