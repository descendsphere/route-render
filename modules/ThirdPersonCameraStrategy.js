import CameraStrategy from './CameraStrategy.js';
import logger from './Logger.js';

/**
 * Implements the interactive third-person camera strategy.
 * This strategy does not pre-calculate a path. Instead, it computes the camera's
 * position and orientation on-demand, based on the person's current position
 * and the user's interactive camera settings (heading, pitch, zoom).
 */
class ThirdPersonCameraStrategy extends CameraStrategy {
  /**
   * @param {Cesium.Viewer} viewer - The Cesium viewer instance.
   * @param {SettingsManager} settingsManager - The application's settings manager.
   */
  constructor(viewer, settingsManager) {
    super(viewer, settingsManager);
    logger.info('ThirdPersonCameraStrategy initialized for on-demand calculation.');
  }

  /**
   * For this interactive strategy, this method is a fast, no-op setup step.
   * It stores the tour data for use in on-demand calculations.
   * @param {object} tourData - The tour data object.
   */
  generateCameraPath(tourData) {
    logger.info('Third-person strategy is interactive; path generation is a no-op.');
    this._cameraPath = []; // This strategy does not use a pre-calculated path.
    this._currentTourData = tourData; // Store tour data for on-demand use.
  }

  /**
   * Calculates the camera's state (position and orientation) for a given time.
   * This is calculated on-demand to provide an interactive experience.
   * @param {Cesium.JulianDate} currentTime - The current time from the Cesium clock.
   * @returns {object|null} An object with camera position and orientation, or null.
   */
  getCameraStateAtTime(currentTime) {
    if (!this._currentTourData || !this._currentTourData.perPointData || this._currentTourData.perPointData.length === 0) {
      return null;
    }

    // 1. Find the person's position at the current time by interpolating the tour data.
    const personPosition = this._interpolatePersonPosition(this._currentTourData.perPointData, currentTime);
    if (!personPosition) {
      return null;
    }

    // 2. Get current interactive settings.
    const pitch = Cesium.Math.toRadians(this._settingsManager.get('cameraPitch'));
    const range = this._settingsManager.get('cameraDistance');
    // For third-person view, we respect the user's manual camera rotation (heading).
    const heading = this._viewer.camera.heading;

    // 3. Assemble the lookAt command object.
    const hpr = new Cesium.HeadingPitchRange(heading, pitch, range);
    
    return {
      lookAt: {
        target: personPosition,
        hpr: hpr
      }
    };
  }

  /**
   * Interpolates the position from a path of points at a given time.
   * @private
   * @param {Array<object>} path - The path points (tourData.perPointData).
   * @param {Cesium.JulianDate} currentTime - The time at which to find the position.
   * @returns {Cesium.Cartesian3|null} The interpolated position or null.
   */
  _interpolatePersonPosition(path, currentTime) {
    if (path.length === 0) {
      return null;
    }

    const hasNativeTimestamps = path[0].time !== null;

    // Binary search to find the segment of the path for the current time.
    let low = 0;
    let high = path.length - 1;
    let i = -1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const midTime = hasNativeTimestamps ? Cesium.JulianDate.fromDate(path[mid].time) : Cesium.JulianDate.addSeconds(this._currentTourData.startTime, path[mid].projectedTime, new Cesium.JulianDate());
      
      if (Cesium.JulianDate.lessThan(midTime, currentTime)) {
        i = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    if (i < 0) {
      return Cesium.Cartesian3.fromDegrees(path[0].lon, path[0].lat, path[0].ele);
    }
    if (i >= path.length - 1) {
      const lastPoint = path[path.length - 1];
      return Cesium.Cartesian3.fromDegrees(lastPoint.lon, lastPoint.lat, lastPoint.ele);
    }

    const p1 = path[i];
    const p2 = path[i + 1];

    const time1 = hasNativeTimestamps ? Cesium.JulianDate.fromDate(p1.time) : Cesium.JulianDate.addSeconds(this._currentTourData.startTime, p1.projectedTime, new Cesium.JulianDate());
    const time2 = hasNativeTimestamps ? Cesium.JulianDate.fromDate(p2.time) : Cesium.JulianDate.addSeconds(this._currentTourData.startTime, p2.projectedTime, new Cesium.JulianDate());

    const timeSinceP1 = Cesium.JulianDate.secondsDifference(currentTime, time1);
    const timeBetweenPoints = Cesium.JulianDate.secondsDifference(time2, time1);
    if (timeBetweenPoints <= 0) {
        return Cesium.Cartesian3.fromDegrees(p1.lon, p1.lat, p1.ele);
    }
    const alpha = timeSinceP1 / timeBetweenPoints;

    const pos1 = Cesium.Cartesian3.fromDegrees(p1.lon, p1.lat, p1.ele);
    const pos2 = Cesium.Cartesian3.fromDegrees(p2.lon, p2.lat, p2.ele);

    return Cesium.Cartesian3.lerp(pos1, pos2, alpha, new Cesium.Cartesian3());
  }
}

export default ThirdPersonCameraStrategy;
