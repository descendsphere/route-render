import logger from './Logger.js';

const TUNING_CONFIG = {
  monitoringInterval: 250, // Checking interval in millisecond
  debounceDelay: 2000,      // Waiting time in millisecond before changing preset
  upperThresholdPercent: 0.95, // Increase quality if FPS > 95% of target
  lowerThresholdPercent: 0.80, // Decrease quality if FPS < 80% of target
  profiles: {
    'Performance': {
      targetFrameRate: 60,
      maxQualityPercent: 1.0,  // Allows using up to 100% of available quality presets
    },
    'Balanced': {
      targetFrameRate: 30,
      maxQualityPercent: 0.65, // Caps quality at ~65% of the maximum
    },
    'Power Saver': {
      targetFrameRate: 20,
      maxQualityPercent: 0.45, // Caps quality at ~45% of the maximum
    },
  }
};

class PerformanceTuner {
  constructor(viewer) {
    this.viewer = viewer;
    this.onSettingsUpdate = () => {}; // Callback for UI updates

    // Auto-tuning state
    this._isActive = false; // NEW: Performance tuning is inactive by default
    this.currentProfile = 'Balanced';
    this.currentPresetIndex = 0; // Default to be overwritten by activate/deactivate
    this.debounceTimeoutId = null;
    this.isDebouncing = false;
    this.frameCount = 0;
    this.lastMonitorTime = Date.now();

    // Set FPS display to always be on
    this.viewer.scene.debugShowFramesPerSecond = true;

    // Centralized settings object.
    this.settings = {}; // Will be populated by the default preset

    this._presets = [
      {
        resolutionScaleFactor: 0.25,
        maximumScreenSpaceError: 8,
        fxaa: false,
        enableLighting: false,
        fogEnabled: false,
        shadows: false,
        atmosphere: false,
        sunAndMoon: false,
      },
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
      {
        resolutionScaleFactor: 0.5,
        maximumScreenSpaceError: 4,
        fxaa: false,
        enableLighting: false,
        fogEnabled: false,
        shadows: false,
        atmosphere: false,
        sunAndMoon: false,
      },
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
        resolutionScaleFactor: 0.5,
        maximumScreenSpaceError: 1,
        fxaa: false,
        enableLighting: false,
        fogEnabled: false,
        shadows: false,
        atmosphere: false,
        sunAndMoon: false,
      },
      {
        resolutionScaleFactor: 0.75,
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
        resolutionScaleFactor: 1.5,
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
    ];

    // Add a postRender listener to monitor performance
    this.viewer.scene.postRender.addEventListener(() => {
      if (!this._isActive) return; // Do nothing if inactive

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
    const profile = TUNING_CONFIG.profiles[profileName];
    if (profile) {
      logger.info(`Setting performance profile to: ${profileName}`);
      this.currentProfile = profileName;
      if (this._isActive) {
        this.viewer.targetFrameRate = profile.targetFrameRate;
      }
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
      return;
    }

    const profile = TUNING_CONFIG.profiles[this.currentProfile];
    if (!profile) {
      logger.warn(`No profile found for ${this.currentProfile}`);
      return;
    }

    const maxThreshold = profile.targetFrameRate * TUNING_CONFIG.upperThresholdPercent;
    const minThreshold = profile.targetFrameRate * TUNING_CONFIG.lowerThresholdPercent;
    const maxQualityIndex = Math.floor((this._presets.length - 1) * profile.maxQualityPercent);

    let newIndex = this.currentPresetIndex;

    if (avgFps < minThreshold) {
      if (this.currentPresetIndex > 0) {
        newIndex--;
      }
    } else if (avgFps > maxThreshold) {
      if (this.currentPresetIndex < maxQualityIndex) {
        newIndex++;
      }
    }

    if (newIndex !== this.currentPresetIndex) {
      logger.info(`FPS (${avgFps.toFixed(1)}) triggered adjustment for '${this.currentProfile}' profile. Changing preset from level ${this.currentPresetIndex} to ${newIndex}.`);
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

  /**
   * Activates the performance auto-tuner.
   */
  activate() {
    logger.info('PerformanceTuner activated.');
    this._isActive = true;
    const profile = TUNING_CONFIG.profiles[this.currentProfile];
    if (profile) {
      this.viewer.targetFrameRate = profile.targetFrameRate;
    }
  }

  /**
   * Deactivates the performance auto-tuner and applies a high-quality preset.
   */
  deactivate() {
    logger.info('PerformanceTuner deactivated, applying high-quality preset.');
    this._isActive = false;
    this.viewer.targetFrameRate = undefined;
    this.currentPresetIndex = this._presets.length - 1; // Revert to highest quality
    this.applyPreset(this.currentPresetIndex);
  }
}

export default PerformanceTuner;