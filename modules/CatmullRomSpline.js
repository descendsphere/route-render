import logger from './Logger.js';

/**
 * Utility class to create and query a 3D Catmull-Rom spline.
 * This is essential for creating a smooth path from a series of discrete points.
 */
class CatmullRomSpline {
  /**
   * @param {object} options
   * @param {Array<Cesium.Cartesian3>} options.points - The array of control points for the spline.
   * @param {number} [options.tension=0.5] - The tension of the spline. 0. Standard is 0.5.
   */
  constructor({ points, tension = 0.5 }) {
    if (points.length < 2) {
      throw new Error("CatmullRomSpline requires at least 2 control points.");
    }
    this.controlPoints = points;
    this.tension = tension; // For standard Catmull-Rom, tension is typically 0.5. Could be used to scale intermediate calculations if desired, but default to standard.
  }

  /**
   * Helper to get a point on the spline for a local t (0-1) within a segment.
   * Based on the standard Catmull-Rom formula.
   * @private
   */
  _interpolate(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;

    const factor1 = 0.5 * ((-t3 + (2 * t2) - t));
    const factor2 = 0.5 * (((2 * t3) - (3 * t2) + 1));
    const factor3 = 0.5 * ((-2 * t3) + (3 * t2) + t);
    const factor4 = 0.5 * (t3 - t2);

    const out = new Cesium.Cartesian3();
    Cesium.Cartesian3.multiplyByScalar(p0, factor1, out);
    Cesium.Cartesian3.add(Cesium.Cartesian3.multiplyByScalar(p1, factor2, new Cesium.Cartesian3()), out, out);
    Cesium.Cartesian3.add(Cesium.Cartesian3.multiplyByScalar(p2, factor3, new Cesium.Cartesian3()), out, out);
    Cesium.Cartesian3.add(Cesium.Cartesian3.multiplyByScalar(p3, factor4, new Cesium.Cartesian3()), out, out);

    return out;
  }

  /**
   * Gets a point on the spline at a given global t-value (0.0 to 1.0).
   * @param {number} t - A global value from 0.0 (start) to 1.0 (end).
   * @returns {Cesium.Cartesian3} The interpolated position on the spline.
   */
  getPoint(t) {
    // Clamp t to valid range
    t = Math.max(0, Math.min(1, t));

    const numPoints = this.controlPoints.length;
    if (numPoints < 2) {
      return numPoints === 1 ? this.controlPoints[0].clone() : Cesium.Cartesian3.ZERO;
    }

    // For fewer than 4 control points, we need special handling or clamping.
    // For 2 points, it's a line. For 3, it's a simple curve.
    if (numPoints === 2) {
        return Cesium.Cartesian3.lerp(this.controlPoints[0], this.controlPoints[1], t, new Cesium.Cartesian3());
    }

    // Map global t to local segment and local t
    const lastSegmentIndex = numPoints - 3;
    const segmentIndex = Math.min(Math.floor(t * lastSegmentIndex), lastSegmentIndex - 1); // Clamp to avoid going past P2
    const localT = (t * lastSegmentIndex) - segmentIndex;

    const p0 = this.controlPoints[segmentIndex];
    const p1 = this.controlPoints[segmentIndex + 1];
    const p2 = this.controlPoints[segmentIndex + 2];
    const p3 = this.controlPoints[segmentIndex + 3];

    return this._interpolate(p0, p1, p2, p3, localT);
  }

  /**
   * Gets the tangent (forward vector) on the spline at a given global t-value (0.0 to 1.0).
   * @param {number} t - A global value from 0.0 (start) to 1.0 (end).
   * @returns {Cesium.Cartesian3} The normalized tangent vector.
   */
  getTangent(t) {
    // Clamp t to valid range
    t = Math.max(0, Math.min(1, t));

    const numPoints = this.controlPoints.length;
    if (numPoints < 2) {
      return Cesium.Cartesian3.UNIT_X; // Default tangent
    }
    if (numPoints === 2) { // Tangent for a line segment
        return Cesium.Cartesian3.normalize(Cesium.Cartesian3.subtract(this.controlPoints[1], this.controlPoints[0], new Cesium.Cartesian3()), new Cesium.Cartesian3());
    }

    const lastSegmentIndex = numPoints - 3;
    const segmentIndex = Math.min(Math.floor(t * lastSegmentIndex), lastSegmentIndex - 1);
    const localT = (t * lastSegmentIndex) - segmentIndex;

    const p0 = this.controlPoints[segmentIndex];
    const p1 = this.controlPoints[segmentIndex + 1];
    const p2 = this.controlPoints[segmentIndex + 2];
    const p3 = this.controlPoints[segmentIndex + 3];

    // Derivative of Catmull-Rom formula:
    // P'(t) = 0.5 * ((-3*t^2 + 4*t - 1) * P0 + (9*t^2 - 10*t) * P1 + (-9*t^2 + 8*t + 1) * P2 + (3*t^2 - 2*t) * P3) (variant)
    // Or simplified:
    // P'(t) = 0.5 * ((P2 - P0) + (2*P0 - 5*P1 + 4*P2 - P3) * 2t + (-P0 + 3*P1 - 3*P2 + P3) * 3t^2)
    
    const t2 = localT * localT;

    const factor1_prime = 0.5 * (-3 * t2 + 4 * localT - 1);
    const factor2_prime = 0.5 * ((6 * t2) - (10 * localT));
    const factor3_prime = 0.5 * ((-6 * t2) + (8 * localT) + 1);
    const factor4_prime = 0.5 * ((3 * t2) - (2 * localT));

    const out = new Cesium.Cartesian3();
    Cesium.Cartesian3.multiplyByScalar(p0, factor1_prime, out);
    Cesium.Cartesian3.add(Cesium.Cartesian3.multiplyByScalar(p1, factor2_prime, new Cesium.Cartesian3()), out, out);
    Cesium.Cartesian3.add(Cesium.Cartesian3.multiplyByScalar(p2, factor3_prime, new Cesium.Cartesian3()), out, out);
    Cesium.Cartesian3.add(Cesium.Cartesian3.multiplyByScalar(p3, factor4_prime, new Cesium.Cartesian3()), out, out);

    return Cesium.Cartesian3.normalize(out, new Cesium.Cartesian3());
  }
}

export default CatmullRomSpline;
