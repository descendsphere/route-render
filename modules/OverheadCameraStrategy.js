import CameraStrategy from './CameraStrategy.js';
import logger from './Logger.js';

/**
 * Implements the overhead camera strategy.
 */
class OverheadCameraStrategy extends CameraStrategy {
  /**
   * @param {Cesium.Viewer} viewer - The Cesium viewer instance.
   * @param {SettingsManager} settingsManager - The application's settings manager.
   */
  constructor(viewer, settingsManager) {
    super(viewer, settingsManager);
    logger.info('OverheadCameraStrategy initialized.');
  }

  /**
   * Generates the pre-calculated camera path for the overhead strategy.
   * @param {object} tourData - The full tour data object.
   * @returns {Array<object>} The generated camera path.
   */
  generateCameraPath(tourData) {
    logger.info('Generating overhead camera path...');
    this._cameraPath = [];

    if (!tourData || tourData.perPointData.length < 2) {
      return this._cameraPath;
    }

    const cameraPitch = Cesium.Math.toRadians(this._settingsManager.get('cameraPitch'));
    const cameraDistance = this._settingsManager.get('cameraDistance');

    const hasNativeTimestamps = tourData.perPointData[0].time !== null;

    let tourDuration;
    if (hasNativeTimestamps) {
        const firstPointTime = tourData.perPointData[0].time;
        const lastPointTime = tourData.perPointData[tourData.perPointData.length - 1].time;
        tourDuration = Cesium.JulianDate.secondsDifference(lastPointTime, firstPointTime);
    } else {
        tourDuration = tourData.perPointData[tourData.perPointData.length - 1].projectedTime;
    }


    tourData.perPointData.forEach(p => {
      const personPosition = Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.ele);
      
      let elapsedTime;
      if (hasNativeTimestamps) {
        elapsedTime = Cesium.JulianDate.secondsDifference(p.time, tourData.perPointData[0].time);
      } else {
        elapsedTime = p.projectedTime;
      }
      
      const tourProgress = tourDuration > 0 ? (elapsedTime / tourDuration) : 0;

      // Calculate heading to complete one 360-degree rotation over the tour duration
      const heading = Cesium.Math.toRadians(tourProgress * 360);
      
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

      this._cameraPath.push({
        time: hasNativeTimestamps ? p.time : Cesium.JulianDate.addSeconds(tourData.startTime, p.projectedTime, new Cesium.JulianDate()),
        position: tempCamera.position.clone(),
        orientation: {
          heading: tempCamera.heading,
          pitch: tempCamera.pitch,
          roll: tempCamera.roll
        }
      });
    });

    logger.info(`Overhead camera path generated with ${this._cameraPath.length} points.`);
    return this._cameraPath;
  }
}

export default OverheadCameraStrategy;
