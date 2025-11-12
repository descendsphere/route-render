import logger from './Logger.js';

class PerformanceTuner {
  constructor(viewer) {
    this.viewer = viewer;
    this.onSettingsUpdate = () => {}; // Callback for UI updates

    // Centralized settings object. Initialized with 'medium' defaults.
    this.settings = {
      resolutionScaleFactor: 1.0,
      maximumScreenSpaceError: 2,
      targetFrameRate: 30,
      fxaa: false,
      enableLighting: false,
      fogEnabled: false,
      shadows: false,
      atmosphere: true,
      sunAndMoon: false,
      debugShowFramesPerSecond: true,
    };

    this._presets = {
      low: {
        resolutionScaleFactor: 0.75,
        maximumScreenSpaceError: 4,
        targetFrameRate: 20,
        fxaa: false,
        enableLighting: false,
        fogEnabled: false,
        shadows: false,
        atmosphere: false,
        sunAndMoon: false,
      },
      medium: {
        resolutionScaleFactor: 1.0,
        maximumScreenSpaceError: 2,
        targetFrameRate: 30,
        fxaa: false,
        enableLighting: false,
        fogEnabled: false,
        atmosphere: true,
        shadows: false,
        sunAndMoon: false,
      },
      high: {
        resolutionScaleFactor: 1.0,
        maximumScreenSpaceError: 2,
        targetFrameRate: 60,
        fxaa: true,
        enableLighting: true,
        fogEnabled: true,
        atmosphere: true,
        shadows: true,
        sunAndMoon: true,
      },
    };
  }

  /**
   * Applies all settings from the internal settings object to the viewer.
   * This is the central point for updating Cesium's state.
   */
  _applySettings() {
    // Apply rendering quality settings
    this.viewer.resolutionScale = this.settings.resolutionScaleFactor * window.devicePixelRatio;
    this.viewer.scene.globe.maximumScreenSpaceError = this.settings.maximumScreenSpaceError;
    this.viewer.targetFrameRate = this.settings.targetFrameRate;
    this.viewer.scene.postProcessStages.fxaa.enabled = this.settings.fxaa;

    // Apply lighting and atmospheric settings
    this.viewer.scene.fog.enabled = this.settings.fogEnabled;
    this.viewer.scene.globe.enableLighting = this.settings.enableLighting;
    this.viewer.shadows = this.settings.shadows;
    this.viewer.scene.skyAtmosphere.show = this.settings.atmosphere;
    this.viewer.scene.skyBox.show = this.settings.atmosphere;
    this.viewer.scene.sun.show = this.settings.sunAndMoon;
    this.viewer.scene.moon.show = this.settings.sunAndMoon;

    // Apply debug settings
    this.viewer.scene.debugShowFramesPerSecond = this.settings.debugShowFramesPerSecond;

    this.requestRender();
  }

  /**
   * Loads a named preset into the current settings and applies it.
   * @param {string} name - The name of the preset ('low', 'medium', 'high').
   */
  applyPreset(name) {
    const preset = this._presets[name];
    if (!preset) {
      logger.error(`Performance preset "${name}" not found.`);
      return;
    }

    logger.info(`Applying performance preset: ${name}`);
    // Merge preset into current settings
    Object.assign(this.settings, preset);

    this._applySettings();
    this.onSettingsUpdate(this.settings); // Notify UI to update
  }

  /**
   * Updates a single setting and re-applies all settings.
   * @param {string} key - The setting key to update.
   * @param {*} value - The new value for the setting.
   */
  updateSetting(key, value) {
    if (key in this.settings) {
      logger.info(`Updating setting: ${key} -> ${value}`);
      this.settings[key] = value;
      this._applySettings();
      // No UI notification here, as this is triggered BY the UI.
    } else {
      logger.warn(`Attempted to update unknown setting: ${key}`);
    }
  }

  /**
   * Requests a new frame to be rendered, if in requestRenderMode.
   */
  requestRender() {
    if (this.viewer.scene.requestRenderMode) {
      this.viewer.scene.requestRender();
    }
  }
}

export default PerformanceTuner;