import CameraStrategy from './CameraStrategy.js';
import logger from './Logger.js';

/**
 * Implements the third-person camera strategy.
 */
class ThirdPersonCameraStrategy extends CameraStrategy {
  /**
   * @param {Cesium.Viewer} viewer - The Cesium viewer instance.
   * @param {SettingsManager} settingsManager - The application's settings manager.
   */
  constructor(viewer, settingsManager) {
    super(viewer, settingsManager);
    logger.info('ThirdPersonCameraStrategy initialized.');
  }

  /**
   * Generates the pre-calculated camera path for the third-person strategy.
   * @param {object} tourData - The full tour data object.
   * @returns {Array<object>} The generated camera path.
   */
  generateCameraPath(tourData) {
    logger.info('Generating third-person camera path...');
    this._cameraPath = [];

    if (!tourData || tourData.perPointData.length < 2) {
      return this._cameraPath;
    }

    const cameraPitch = Cesium.Math.toRadians(this._settingsManager.get('cameraPitch'));
    const cameraDistance = this._settingsManager.get('cameraDistance');

    // This strategy tracks the person. We need the direction of travel for heading.
    // For a pre-calculated path, we can derive this from consecutive points.
    for (let i = 0; i < tourData.perPointData.length; i++) {
      const p = tourData.perPointData[i];
      const personPosition = Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.ele);

      let heading = 0;
      if (i < tourData.perPointData.length - 1) {
        // Calculate heading from current point to next point
        const nextP = tourData.perPointData[i + 1];
        const nextPosition = Cesium.Cartesian3.fromDegrees(nextP.lon, nextP.lat, nextP.ele);
        const direction = Cesium.Cartesian3.subtract(nextPosition, personPosition, new Cesium.Cartesian3());
        const eastNorthUp = Cesium.Transforms.eastNorthUpToFixedFrame(personPosition);
        const inverseEastNorthUp = Cesium.Matrix4.inverse(eastNorthUp, new Cesium.Matrix4());
        const directionLocal = Cesium.Matrix4.multiplyByPointAsVector(inverseEastNorthUp, direction, new Cesium.Cartesian3());
        heading = Math.atan2(directionLocal.y, directionLocal.x); // Heading is measured from East
      } else if (i > 0) {
        // For the last point, use the heading of the previous segment
        const prevP = tourData.perPointData[i - 1];
        const prevPosition = Cesium.Cartesian3.fromDegrees(prevP.lon, prevP.lat, prevP.ele);
        const direction = Cesium.Cartesian3.subtract(personPosition, prevPosition, new Cesium.Cartesian3());
        const eastNorthUp = Cesium.Transforms.eastNorthUpToFixedFrame(prevPosition);
        const inverseEastNorthUp = Cesium.Matrix4.inverse(eastNorthUp, new Cesium.Matrix4());
        const directionLocal = Cesium.Matrix4.multiplyByPointAsVector(inverseEastNorthUp, direction, new Cesium.Cartesian3());
        heading = Math.atan2(directionLocal.y, directionLocal.x);
      }

      // Use a temporary camera to get the view from lookAt, then extract position/orientation
      const tempCamera = new Cesium.Camera(this._viewer.scene);
      tempCamera.setView({
        destination: personPosition,
        orientation: {
          heading: heading,
          pitch: cameraPitch,
          range: cameraDistance
        }
      });

      const hasNativeTimestamps = tourData.perPointData[0].time !== null;

      this._cameraPath.push({
        time: hasNativeTimestamps ? p.time : Cesium.JulianDate.addSeconds(tourData.startTime, p.projectedTime, new Cesium.JulianDate()),
        position: tempCamera.position.clone(),
        orientation: {
          heading: tempCamera.heading,
          pitch: tempCamera.pitch,
          roll: tempCamera.roll // Third-person camera roll is typically 0
        }
      });
    }

    logger.info(`Third-person camera path generated with ${this._cameraPath.length} points.`);
    return this._cameraPath;
  }
}

export default ThirdPersonCameraStrategy;
