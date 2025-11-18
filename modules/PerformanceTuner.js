import logger from './Logger.js';

const TUNING_CONFIG = {
  monitoringInterval: 1000, // Check every 2 seconds
  debounceDelay: 1500,      // Wait 5 seconds before changing preset
  profiles: {
    'Prioritize Speed': { lowerBound: 30, upperBound: 60 },
    'Balanced': { lowerBound: 20, upperBound: 30 },
    'Prioritize Quality': { lowerBound: 10, upperBound: 20 },
  }
};

class PerformanceTuner {
  constructor(viewer) {
    this.viewer = viewer;
    this.onSettingsUpdate = () => {}; // Callback for UI updates

    // Auto-tuning state
    this.currentProfile = 'Balanced';
    this.currentPresetIndex = 0; // Default to be overwritten
    this.debounceTimeoutId = null;
    this.isDebouncing = false;
    this.frameCount = 0;
    this.lastMonitorTime = Date.now();

    // Set FPS display to always be on
    this.viewer.scene.debugShowFramesPerSecond = true;

    // Centralized settings object.
    this.settings = {}; // Will be populated by the default preset

    this._presets = [
      // Level 0 (Lowest)
      {
        resolutionScaleFactor: 0.5,
        maximumScreenSpaceError: 8,
        fxaa: false,
        enableLighting: false,
        fogEnabled: false,
        shadows: false,
        atmosphere: false,
        sunAndMoon: false,
      },
      // Level 1 (Low)
      {
        resolutionScaleFactor: 0.5,
        maximumScreenSpaceError: 2,
        fxaa: false,
        enableLighting: false,
        fogEnabled: false,
        shadows: false,
        atmosphere: false,
        sunAndMoon: false,
      },
      {
        resolutionScaleFactor: 0.6,
        maximumScreenSpaceError: 2,
        fxaa: false,
        enableLighting: false,
        fogEnabled: false,
        shadows: false,
        atmosphere: false,
        sunAndMoon: false,
      },
      {
        resolutionScaleFactor: 0.65,
        maximumScreenSpaceError: 2,
        fxaa: false,
        enableLighting: false,
        fogEnabled: false,
        shadows: false,
        atmosphere: false,
        sunAndMoon: false,
      },
      {
        resolutionScaleFactor: 0.7,
        maximumScreenSpaceError: 2,
        fxaa: false,
        enableLighting: false,
        fogEnabled: false,
        atmosphere: false,
        shadows: false,
        sunAndMoon: false,
      },
      {
        resolutionScaleFactor: 0.7,
        maximumScreenSpaceError: 1,
        fxaa: false,
        enableLighting: false,
        fogEnabled: false,
        atmosphere: false,
        shadows: false,
        sunAndMoon: false,
      },
      {
        resolutionScaleFactor: 0.8,
        maximumScreenSpaceError: 1,
        fxaa: false,
        enableLighting: false,
        fogEnabled: false,
        atmosphere: false,
        shadows: false,
        sunAndMoon: false,
      },
      // Level 2 (Medium)
      {
        resolutionScaleFactor: 0.9,
        maximumScreenSpaceError: 1,
        fxaa: false,
        enableLighting: false,
        fogEnabled: false,
        atmosphere: false,
        shadows: false,
        sunAndMoon: false,
      },
      {
        resolutionScaleFactor: 1.0,
        maximumScreenSpaceError: 1,
        fxaa: false,
        enableLighting: false,
        fogEnabled: false,
        atmosphere: false,
        shadows: false,
        sunAndMoon: false,
      },
      {
        resolutionScaleFactor: 1.0,
        maximumScreenSpaceError: 1,
        fxaa: true,
        enableLighting: false,
        fogEnabled: false,
        atmosphere: false,
        shadows: false,
        sunAndMoon: false,
      },
      {
        resolutionScaleFactor: 1.0,
        maximumScreenSpaceError: 1,
        fxaa: true,
        enableLighting: false,
        fogEnabled: false,
        atmosphere: true,
        shadows: false,
        sunAndMoon: false,
      },
      {
        resolutionScaleFactor: 1.0,
        maximumScreenSpaceError: 1,
        fxaa: true,
        enableLighting: true,
        fogEnabled: false,
        atmosphere: true,
        shadows: false,
        sunAndMoon: false,
      },
      {
        resolutionScaleFactor: 1.0,
        maximumScreenSpaceError: 1,
        fxaa: true,
        enableLighting: true,
        fogEnabled: true,
        atmosphere: true,
        shadows: false,
        sunAndMoon: false,
      },
      {
        resolutionScaleFactor: 1.0,
        maximumScreenSpaceError: 1,
        fxaa: true,
        enableLighting: true,
        fogEnabled: true,
        atmosphere: true,
        shadows: false, // Shadows are expensive
        sunAndMoon: true,
      },
      {
        resolutionScaleFactor: 1.0,
        maximumScreenSpaceError: 1,
        fxaa: true,
        enableLighting: true,
        fogEnabled: true,
        atmosphere: true,
        shadows: true,
        sunAndMoon: true,
      },
      {
        resolutionScaleFactor: 1.2,
        maximumScreenSpaceError: 1,
        fxaa: true,
        enableLighting: true,
        fogEnabled: true,
        atmosphere: true,
        shadows: true,
        sunAndMoon: true,
      },
      {
        resolutionScaleFactor: 1.8,
        maximumScreenSpaceError: 1,
        fxaa: true,
        enableLighting: true,
        fogEnabled: true,
        atmosphere: true,
        shadows: true,
        sunAndMoon: true,
      },
      {
        resolutionScaleFactor: 2.0,
        maximumScreenSpaceError: 1,
        fxaa: true,
        enableLighting: true,
        fogEnabled: true,
        atmosphere: true,
        shadows: true,
        sunAndMoon: true,
      },
      // Level 4 (Ultra)
      {
        resolutionScaleFactor: 2.2,
        maximumScreenSpaceError: 1,
        fxaa: true,
        enableLighting: true,
        fogEnabled: true,
        atmosphere: true,
        shadows: true,
        sunAndMoon: true,
      },
    ];

    // Set initial preset to a medium level
    this.currentPresetIndex = this._presets.length-1;//2;
    this.applyPreset(this.currentPresetIndex);

    // Add a postRender listener to monitor performance
    this.viewer.scene.postRender.addEventListener(() => {
      this.frameCount++;
      const now = Date.now();
      const elapsedTime = now - this.lastMonitorTime;

      if (elapsedTime >= TUNING_CONFIG.monitoringInterval) {
        const avgFps = (this.frameCount * 1000) / elapsedTime;
        this._adjustPreset(avgFps);

        this.frameCount = 0;
        this.lastMonitorTime = now;
      }
    });
  }

  /**
   * Applies all settings from the internal settings object to the viewer.
   * This is the central point for updating Cesium's state.
   */
  _applySettings() {
    // Apply rendering quality settings
    this.viewer.resolutionScale = this.settings.resolutionScaleFactor * window.devicePixelRatio;
    this.viewer.scene.globe.maximumScreenSpaceError = this.settings.maximumScreenSpaceError;
    this.viewer.scene.postProcessStages.fxaa.enabled = this.settings.fxaa;

    // Apply lighting and atmospheric settings
    this.viewer.scene.fog.enabled = this.settings.fogEnabled;
    this.viewer.scene.globe.enableLighting = this.settings.enableLighting;
    this.viewer.shadows = this.settings.shadows;
    this.viewer.scene.skyAtmosphere.show = this.settings.atmosphere;
    this.viewer.scene.skyBox.show = this.settings.atmosphere;
    this.viewer.scene.sun.show = this.settings.sunAndMoon;
    this.viewer.scene.moon.show = this.settings.sunAndMoon;

    this.requestRender();
  }

  /**
   * Loads a preset by its index into the current settings and applies it.
   * @param {number} index - The index of the preset in the _presets array.
   */
  applyPreset(index) {
    const preset = this._presets[index];
    if (!preset) {
      logger.error(`Performance preset with index "${index}" not found.`);
      return;
    }

    logger.info(`Applying performance preset level: ${index}`);
    // Overwrite settings with the new preset
    this.settings = { ...preset };

    this._applySettings();
    this.onSettingsUpdate(this.settings); // Notify UI to update
  }

  /**
   * Sets the current performance profile for the auto-tuner.
   * @param {string} profileName - The name of the profile to set.
   */
  setProfile(profileName) {
    if (TUNING_CONFIG.profiles[profileName]) {
      logger.info(`Setting performance profile to: ${profileName}`);
      this.currentProfile = profileName;
    } else {
      logger.warn(`Attempted to set unknown performance profile: ${profileName}`);
    }
  }

  /**
   * Adjusts the performance preset based on the average FPS and current profile.
   * @param {number} avgFps - The average frames per second.
   * @private
   */
  _adjustPreset(avgFps) {
    if (this.isDebouncing) {
      logger.info('Debouncing, no adjustment.');
      return;
    }

    const profile = TUNING_CONFIG.profiles[this.currentProfile];
    if (!profile) {
      logger.warn(`No profile found for ${this.currentProfile}`);
      return;
    }

    logger.info(`avgFps: ${avgFps.toFixed(1)}, lowerBound: ${profile.lowerBound}, upperBound: ${profile.upperBound}, currentPresetIndex: ${this.currentPresetIndex}`);
    let newIndex = this.currentPresetIndex;

    // Logic to move up or down the presets array
    if (avgFps < profile.lowerBound) {
      if (this.currentPresetIndex > 0) {
        logger.info('Decision: move down');
        newIndex--;
      } else {
        logger.info('Decision: at lowest preset, no change.');
      }
    } else if (avgFps > profile.upperBound) {
      if (this.currentPresetIndex < this._presets.length - 1) {
        logger.info('Decision: move up');
        newIndex++;
      } else {
        logger.info('Decision: at highest preset, no change.');
      }
    } else {
      logger.info('Decision: FPS within target range, no change.');
    }

    if (newIndex !== this.currentPresetIndex) {
      logger.info(`FPS (${avgFps.toFixed(1)}) is outside of range for '${this.currentProfile}' profile. Changing preset from level ${this.currentPresetIndex} to ${newIndex}.`);
      this.applyPreset(newIndex);
      this.currentPresetIndex = newIndex;

      // Start debouncing
      this.isDebouncing = true;
      this.debounceTimeoutId = setTimeout(() => {
        this.isDebouncing = false;
        logger.info('Debounce period ended. Auto-tuning re-enabled.');
      }, TUNING_CONFIG.debounceDelay);
    }
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