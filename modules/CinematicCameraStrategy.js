import CameraStrategy from './CameraStrategy.js';
import PathSimplifier from './PathSimplifier.js';
import CatmullRomSpline from './CatmullRomSpline.js';
import logger from './Logger.js';

/**
 * Implements the cinematic camera strategy with smooth, spline-based paths and dynamic effects.
 */
class CinematicCameraStrategy extends CameraStrategy {
  /**
   * @param {Cesium.Viewer} viewer - The Cesium viewer instance.
   * @param {SettingsManager} settingsManager - The application's settings manager.
   */
  constructor(viewer, settingsManager) {
    super(viewer, settingsManager);
    logger.info('CinematicCameraStrategy initialized.');
  }

  /**
   * Generates the pre-calculated camera path for the cinematic strategy.
   * @param {object} tourData - The full tour data object.
   * @returns {Array<object>} The generated camera path.
   */
  generateCameraPath(tourData) {
    logger.info('Generating cinematic camera path...');
    this._cameraPath = [];

    if (!tourData || !tourData.perPointData || tourData.perPointData.length < 2) {
      return this._cameraPath;
    }

    // 1. Get settings from this._settingsManager
    const cameraPathDetail = this._settingsManager.get('cameraPathDetail');
    const cameraSplineTension = this._settingsManager.get('cameraSplineTension');
    const cameraLookAheadTime = this._settingsManager.get('cameraLookAheadTime');
    const cameraMaxAzimuth = Cesium.Math.toRadians(this._settingsManager.get('cameraMaxAzimuth'));
    const cameraAzimuthFreq = this._settingsManager.get('cameraAzimuthFreq');
    const cameraDistance = this._settingsManager.get('cameraDistance');
    const cameraPitch = Cesium.Math.toRadians(this._settingsManager.get('cameraPitch'));

    // 2. Path Simplification
    // Convert tourData.perPointData (lon, lat, ele) to Cesium.Cartesian3 for PathSimplifier
    const rawCartesianPoints = tourData.perPointData.map(p => Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.ele));
    const simplifiedCartesianPoints = PathSimplifier.simplify(rawCartesianPoints, cameraPathDetail);

    if (simplifiedCartesianPoints.length < 2) {
        logger.warn('Simplified path has too few points for spline generation.');
        return this._cameraPath;
    }

    // 3. Create a new CatmullRomSpline
    const spline = new CatmullRomSpline({ points: simplifiedCartesianPoints, tension: cameraSplineTension });

    // Map time to a global t-value for the spline (0 to 1)
    const firstPointTime = tourData.perPointData[0].time;
    const lastPointTime = tourData.perPointData[tourData.perPointData.length - 1].time;
    const totalTourDurationSeconds = Cesium.JulianDate.secondsDifference(lastPointTime, firstPointTime);

    // 4. Loop through tourData, calculate camera state for each point
    tourData.perPointData.forEach((p, index) => {
      const currentTimeSeconds = Cesium.JulianDate.secondsDifference(p.time, firstPointTime);
      const globalT = totalTourDurationSeconds > 0 ? (currentTimeSeconds / totalTourDurationSeconds) : 0;

      // Ensure globalT is within [0, 1] for spline evaluation
      const clampedGlobalT = Math.max(0, Math.min(1, globalT));

      // 4.1. Determine Look-At Target (on the spline)
      const lookAtTarget = spline.getPoint(clampedGlobalT);

      // 4.2. Determine Gaze Target (on the spline, ahead in time)
      const futureTimeSeconds = currentTimeSeconds + cameraLookAheadTime;
      const futureGlobalT = totalTourDurationSeconds > 0 ? (futureTimeSeconds / totalTourDurationSeconds) : 1; // Clamp to 1 at end
      const clampedFutureGlobalT = Math.max(0, Math.min(1, futureGlobalT));
      const gazeTarget = spline.getPoint(clampedFutureGlobalT);

      // 4.3. Establish "Front" Vector (from lookAtTarget to gazeTarget)
      let frontVector = new Cesium.Cartesian3();
      if (Cesium.Cartesian3.equals(lookAtTarget, gazeTarget)) {
        // If targets are the same (e.g., at end of tour or very short path), use spline tangent
        frontVector = spline.getTangent(clampedGlobalT);
      } else {
        frontVector = Cesium.Cartesian3.normalize(
          Cesium.Cartesian3.subtract(gazeTarget, lookAtTarget, new Cesium.Cartesian3()),
          new Cesium.Cartesian3()
        );
      }

      // 4.4. Calculate dynamic Azimuth Angle (Orbit Angle)
      // Estimate local curvature. A simple way is to compare current tangent to one slightly ahead.
      const tangentCurrent = spline.getTangent(clampedGlobalT);
      const tangentSlightlyAhead = spline.getTangent(Math.min(clampedGlobalT + 0.001, 1.0)); // Small delta
      const angleBetweenTangents = Cesium.Cartesian3.angleBetween(tangentCurrent, tangentSlightlyAhead);
      
      // Modulate azimuth frequency based on curvature (higher curvature -> slower orbit change)
      // A small angleBetweenTangents means straighter path, so increased frequency
      const curvatureFactor = 1.0 - (angleBetweenTangents / Cesium.Math.PI); // 0 (sharp turn) to 1 (straight)
      const modulatedFrequency = cameraAzimuthFreq * (1 + (curvatureFactor * 2)); // Boost frequency on straights
      
      const currentAzimuthAngle = cameraMaxAzimuth * Math.sin(currentTimeSeconds * modulatedFrequency);


      // 4.5. Compute Camera Position
      let cameraPosition = new Cesium.Cartesian3();

      // Step 1: Start from Look-At Target and move backward along frontVector by cameraDistance
      let tempCameraPos = Cesium.Cartesian3.subtract(
        lookAtTarget,
        Cesium.Cartesian3.multiplyByScalar(frontVector, cameraDistance, new Cesium.Cartesian3()),
        new Cesium.Cartesian3()
      );

      // Step 2: Apply Pitch (rotation around lookAtTarget perpendicular to frontVector)
      const localUp = Cesium.Cartesian3.normalize(lookAtTarget, new Cesium.Cartesian3());
      const pitchAxis = Cesium.Cartesian3.normalize(
        Cesium.Cartesian3.cross(frontVector, localUp, new Cesium.Cartesian3()),
        new Cesium.Cartesian3()
      );
      const pitchMatrix = Cesium.Matrix3.fromAxisAngle(pitchAxis, cameraPitch);
      tempCameraPos = Cesium.Matrix3.multiplyByVector(pitchMatrix, Cesium.Cartesian3.subtract(tempCameraPos, lookAtTarget, new Cesium.Cartesian3()), new Cesium.Cartesian3());
      Cesium.Cartesian3.add(tempCameraPos, lookAtTarget, tempCameraPos);


      // Step 3: Apply Azimuth (Orbit) Rotation around the "Front" Vector
      const azimuthMatrix = Cesium.Matrix3.fromAxisAngle(frontVector, currentAzimuthAngle);
      tempCameraPos = Cesium.Matrix3.multiplyByVector(azimuthMatrix, Cesium.Cartesian3.subtract(tempCameraPos, lookAtTarget, new Cesium.Cartesian3()), new Cesium.Cartesian3());
      Cesium.Cartesian3.add(tempCameraPos, lookAtTarget, cameraPosition);


      // 4.6. Compute Camera Orientation (to look at lookAtTarget)
      // This can be done by using Cesium's internal functions
      const transform = Cesium.Transforms.eastNorthUpToFixedFrame(cameraPosition);
      const inverseTransform = Cesium.Matrix4.inverse(transform, new Cesium.Matrix4());
      
      const targetInLocal = Cesium.Matrix4.multiplyByPoint(inverseTransform, lookAtTarget, new Cesium.Cartesian3());
      const directionInLocal = Cesium.Cartesian3.normalize(Cesium.Cartesian3.subtract(targetInLocal, Cesium.Cartesian3.ZERO, new Cesium.Cartesian3()), new Cesium.Cartesian3());
      
      const heading = Math.atan2(directionInLocal.y, directionInLocal.x);
      const pitch = Math.asin(directionInLocal.z);
      const roll = 0; // Cinematic camera typically doesn't roll itself

      this._cameraPath.push({
        time: p.time,
        position: cameraPosition.clone(),
        orientation: {
          heading: heading,
          pitch: pitch,
          roll: roll
        }
      });
    });

    logger.info(`Cinematic camera path generated with ${this._cameraPath.length} points.`);
    return this._cameraPath;
  }
}

export default CinematicCameraStrategy;
