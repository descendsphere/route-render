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
    if (this._cameraPath.length === 0) {
      return null;
    }

    // Use a binary search to find the current segment in the path
    let low = 0;
    let high = this._cameraPath.length - 1;
    let i = -1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const midTime = this._cameraPath[mid].time;

      if (Cesium.JulianDate.lessThan(midTime, currentTime)) {
        i = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    // Handle edge cases
    if (i < 0) {
      return this._cameraPath[0]; // Before the start of the tour
    }
    if (i >= this._cameraPath.length - 1) {
      return this._cameraPath[this._cameraPath.length - 1]; // After the end of the tour
    }

    const p1 = this._cameraPath[i];
    const p2 = this._cameraPath[i + 1];

    // Calculate interpolation factor (alpha)
    const timeSinceP1 = Cesium.JulianDate.secondsDifference(currentTime, p1.time);
    const timeBetweenPoints = Cesium.JulianDate.secondsDifference(p2.time, p1.time);
    if (timeBetweenPoints <= 0) {
      return p1; // Avoid division by zero
    }
    const alpha = timeSinceP1 / timeBetweenPoints;

    // --- Interpolate Position ---
    const position = Cesium.Cartesian3.lerp(p1.position, p2.position, alpha, new Cesium.Cartesian3());

    // --- Interpolate Orientation (HPR) ---
    // Handle heading wrap-around (e.g., from 359 to 1 degree)
    let h1 = p1.orientation.heading;
    let h2 = p2.orientation.heading;
    const angleDiff = h2 - h1;
    if (Math.abs(angleDiff) > Math.PI) {
      if (angleDiff > 0) {
        h1 += 2 * Math.PI;
      } else {
        h2 += 2 * Math.PI;
      }
    }

    const heading = h1 + (h2 - h1) * alpha;
    const pitch = p1.orientation.pitch + (p2.orientation.pitch - p1.orientation.pitch) * alpha;
    const roll = p1.orientation.roll + (p2.orientation.roll - p1.orientation.roll) * alpha;
    
    return {
      position: position,
      orientation: {
        heading: heading,
        pitch: pitch,
        roll: roll,
      },
    };
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
