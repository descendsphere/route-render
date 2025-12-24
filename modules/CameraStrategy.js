/**
 * Abstract base class for all camera strategies.
 * Defines the contract for generating a camera path and providing camera state.
 */
class CameraStrategy {
  /**
   * @param {Cesium.Viewer} viewer - The Cesium viewer instance.
   * @param {object} settingsManager - An instance of the SettingsManager.
   */
  constructor(viewer, settingsManager) {
    if (this.constructor === CameraStrategy) {
      throw new Error("Abstract classes can't be instantiated.");
    }
    this._viewer = viewer;
    this._settingsManager = settingsManager;
    this._cameraPath = [];
  }

  /**
   * Generates a pre-calculated camera path based on the tour data and settings.
   * This method must be implemented by subclasses.
   * @param {object} tourData - The full tour data object.
   * @returns {Array<object>} The generated camera path.
   */
  generateCameraPath(tourData) {
    throw new Error("Method 'generateCameraPath()' must be implemented.");
  }

  /**
   * Gets the interpolated camera state for a given time.
   * @param {Cesium.JulianDate} currentTime - The current time of the tour.
   * @returns {object|null} An object with { position, orientation }, or null if not possible.
   */
  getCameraStateAtTime(currentTime) {
    // In a full implementation, this would interpolate between points in _cameraPath.
    // For now, we'll return a placeholder.
    if (this._cameraPath.length === 0) {
      return null;
    }
    // Placeholder: just return the first state.
    return this._cameraPath[0];
  }

  /**
   * Triggers a regeneration of the camera path, for example, when a setting changes.
   * @param {object} tourData - The full tour data object.
   */
  regeneratePath(tourData) {
    this.generateCameraPath(tourData);
  }
}

export default CameraStrategy;
