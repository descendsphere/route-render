import logger from './Logger.js';
import SettingsManager from './SettingsManager.js';

class UIManager {
  constructor(viewer) {
    this.viewer = viewer;
    // Callbacks to be set by the App class
    this.onFileSelected = () => {};
    this.onPlayTour = () => {};
    this.onStopTour = () => {};
    this.onZoomToRoute = () => {};
    this.onResetStyle = () => {};
    this.onSetSpeed = () => {};
    this.onUpdateRouteColor = () => {};
    this.onUpdateRouteWidth = () => {};
    this.onSetCameraStrategy = () => {};
    this.onUpdatePersonStyle = () => {};
    this.onToggleClampToGround = () => {};
    this.onUpdateCameraDistance = () => {};
    this.onSetCameraPitch = () => {};
    this.onCustomPlayPause = () => {};
    this.onCustomRewind = () => {};
    this.onCustomReset = () => {};
    this.onCustomScrub = () => {};
    this.onCustomZoom = () => {};
    this.onCustomResetStyle = () => {};
    this.onTogglePoiVisibility = () => {};
    this.onSetProfile = () => {};
    this.onUrlLoad = () => {};
    this.onRouteSelected = () => {};
    this.onClearStorage = () => {};
    this.onAthleteProfileChange = () => {};

    this.statsOverlay = null; // To hold a reference to the StatsOverlay instance

    // DOM Elements
    this.gpxFileInput = document.getElementById('gpx-file');
    this.playButton = document.getElementById('play-tour');
    this.stopButton = document.getElementById('stop-tour');
    this.zoomToRouteButton = document.getElementById('zoom-to-route');
    this.resetStyleButton = document.getElementById('reset-style');
    this.speedSlider = document.getElementById('tour-speed');
    this.speedDisplay = document.getElementById('speed-display');
    this.routeColorInput = document.getElementById('route-color');
    this.routeWidthDecrement = document.getElementById('route-width-decrement');
    this.routeWidthDisplay = document.getElementById('route-width-display');
    this.routeWidthIncrement = document.getElementById('route-width-increment');
    this.personColorInput = document.getElementById('person-color');
    this.personSizeDecrement = document.getElementById('person-size-decrement');
    this.personSizeDisplay = document.getElementById('person-size-display');
    this.personSizeIncrement = document.getElementById('person-size-increment');
    this.cameraStrategyInput = document.getElementById('camera-strategy');
    this.cameraDistanceSlider = document.getElementById('camera-distance');
    this.cameraDistanceDisplay = document.getElementById('camera-distance-display');
    this.cameraPitchSlider = document.getElementById('camera-pitch');
    this.cameraPitchDisplay = document.getElementById('camera-pitch-display');
    this.clampToGroundInput = document.getElementById('clamp-to-ground');
    this.performancePresetInput = document.getElementById('performance-preset');
    this.loadingIndicator = document.getElementById('loading-indicator');
    this.tourControls = document.getElementById('tour-controls');
    this.routeStats = document.getElementById('route-stats');
    this.styleControls = document.getElementById('style-controls');
    this.cameraStrategyControls = document.getElementById('camera-strategy-controls');
    this.performanceControls = document.getElementById('performance-controls');
    this.filenameSuggestion = document.getElementById('filename-suggestion');
    this.filenameContent = document.getElementById('filename-content');
    this.panelContainer = document.getElementById('panel-container');
    this.sidePanel = document.getElementById('side-panel');
    this.panelHeader = document.querySelector('.panel-header');
    this.panelToggleButton = document.getElementById('panel-toggle-icon');
    this.speedSliderGroup = this.speedSlider.parentElement;
    this.distanceSliderGroup = this.cameraDistanceSlider.parentElement;
    this.pitchSliderGroup = this.cameraPitchSlider.parentElement;
    this.customTourControls = document.getElementById('custom-tour-controls');
    this.timeDisplay = document.getElementById('custom-time-display');
    this.timeScrubber = document.getElementById('custom-time-scrubber');
    this.customPlayPauseBtn = document.getElementById('custom-play-pause-btn');
    this.customRewindBtn = document.getElementById('custom-rewind-btn');
    this.customResetBtn = document.getElementById('custom-reset-btn');
    this.customZoomBtn = document.getElementById('custom-zoom-btn');
    this.customResetStyleBtn = document.getElementById('custom-reset-style-btn');
    this.customPoiToggleBtn = document.getElementById('custom-poi-toggle-btn');
    this.bottomPanelContainer = document.getElementById('bottom-panel-container'); // NEW
    this.gpxUrlInput = document.getElementById('gpx-url-input');
    this.loadFromUrlBtn = document.getElementById('load-from-url-btn');
    this.clearStorageButton = document.getElementById('clear-storage-button');
    this.routeLibrarySelect = document.getElementById('route-library-select');
    this.performanceProfileInput = document.getElementById('performance-profile');
    this.smoothingPeriodDecrementLarge = document.getElementById('smoothing-period-decrement-large');
    this.smoothingPeriodDecrement = document.getElementById('smoothing-period-decrement');
    this.smoothingPeriodDisplay = document.getElementById('smoothing-period-display');
    this.smoothingPeriodIncrement = document.getElementById('smoothing-period-increment');
    this.smoothingPeriodIncrementLarge = document.getElementById('smoothing-period-increment-large');
    this.advancedControls = document.getElementById('advanced-controls');
    this.advancedControlsHeader = this.advancedControls.querySelector('.collapsible-header');
    this.advancedControlsContent = this.advancedControls.querySelector('.collapsible-content');
    this.athleteProfileControls = document.getElementById('athlete-profile-controls');
    this.athleteProfileControlsHeader = this.athleteProfileControls.querySelector('.collapsible-header');
    this.athleteProfileControlsContent = this.athleteProfileControls.querySelector('.collapsible-content');
    this.athleteWeightDecrement = document.getElementById('athlete-weight-decrement');
    this.athleteWeightDisplay = document.getElementById('athlete-weight-display');
    this.athleteWeightIncrement = document.getElementById('athlete-weight-increment');
    this.refuelThresholdDecrement = document.getElementById('refuel-threshold-decrement');
    this.refuelThresholdDisplay = document.getElementById('refuel-threshold-display');
    this.refuelThresholdIncrement = document.getElementById('refuel-threshold-increment');

    this.targetSpeedDecrement = document.getElementById('target-speed-decrement');
    this.targetSpeedDisplay = document.getElementById('target-speed-display');
    this.targetSpeedIncrement = document.getElementById('target-speed-increment');
    this.degradationDecrement = document.getElementById('degradation-decrement');
    this.degradationDisplay = document.getElementById('degradation-display');
    this.degradationIncrement = document.getElementById('degradation-increment');
    this.restTimeDecrement = document.getElementById('rest-time-decrement');
    this.restTimeDisplay = document.getElementById('rest-time-display');
    this.restTimeIncrement = document.getElementById('rest-time-increment');

    // Cinematic Camera Controls
    this.cinematicCameraControls = document.getElementById('cinematic-camera-controls');
    this.cameraPathDetailDecrement = document.getElementById('camera-path-detail-decrement');
    this.cameraPathDetailDisplay = document.getElementById('camera-path-detail-display');
    this.cameraPathDetailIncrement = document.getElementById('camera-path-detail-increment');
    this.cameraSplineTensionDecrement = document.getElementById('camera-spline-tension-decrement');
    this.cameraSplineTensionDisplay = document.getElementById('camera-spline-tension-display');
    this.cameraSplineTensionIncrement = document.getElementById('camera-spline-tension-increment');
    this.cameraLookAheadDecrement = document.getElementById('camera-look-ahead-decrement');
    this.cameraLookAheadDisplay = document.getElementById('camera-look-ahead-display');
    this.cameraLookAheadIncrement = document.getElementById('camera-look-ahead-increment');
    this.cameraMaxAzimuthDecrement = document.getElementById('camera-max-azimuth-decrement');
    this.cameraMaxAzimuthDisplay = document.getElementById('camera-max-azimuth-display');
    this.cameraMaxAzimuthIncrement = document.getElementById('camera-max-azimuth-increment');
    this.cameraAzimuthFreqDecrement = document.getElementById('camera-azimuth-freq-decrement');
    this.cameraAzimuthFreqDisplay = document.getElementById('camera-azimuth-freq-display');
    this.cameraAzimuthFreqIncrement = document.getElementById('camera-azimuth-freq-increment');
    this.cameraTransitionDurDecrement = document.getElementById('camera-transition-dur-decrement');
    this.cameraTransitionDurDisplay = document.getElementById('camera-transition-dur-display');
    this.cameraTransitionDurIncrement = document.getElementById('camera-transition-dur-increment');
    this.cameraGazeSmoothingDecrement = document.getElementById('camera-gaze-smoothing-decrement');
    this.cameraGazeSmoothingDisplay = document.getElementById('camera-gaze-smoothing-display');
    this.cameraGazeSmoothingIncrement = document.getElementById('camera-gaze-smoothing-increment');
    this.cameraPathDensityDecrement = document.getElementById('camera-path-density-decrement');
    this.cameraPathDensityDisplay = document.getElementById('camera-path-density-display');
    this.cameraPathDensityIncrement = document.getElementById('camera-path-density-increment');
  }

  init() {
    logger.info('Initializing UI event listeners.');

    this.sidePanel.addEventListener('mousedown', (event) => {
      if (!this.panelHeader.contains(event.target)) {
        this.viewer.scene.screenSpaceCameraController.enableInputs = false;
      }
    });
    window.addEventListener('mouseup', () => {
      this.viewer.scene.screenSpaceCameraController.enableInputs = true;
    });

    this.panelHeader.addEventListener('click', () => {
      if (this.sidePanel.classList.contains('collapsed')) {
        this.expandPanel();
      } else {
        this.collapsePanel();
      }
    });

    this.gpxFileInput.addEventListener('change', (event) => this.onFileSelected(event.target.files[0]));
    this.loadFromUrlBtn.addEventListener('click', () => this.onUrlLoad(this.gpxUrlInput.value));
    this.clearStorageButton.addEventListener('click', () => this.onClearStorage());
    this.routeLibrarySelect.addEventListener('change', (event) => this.onRouteSelected(event.target.value));
    this.playButton.addEventListener('click', () => this.onPlayTour());
    this.stopButton.addEventListener('click', () => this.onStopTour());
    this.zoomToRouteButton.addEventListener('click', () => this.onZoomToRoute());
    this.resetStyleButton.addEventListener('click', () => this.onResetStyle());

    this.speedSlider.addEventListener('input', (event) => {
      const position = parseInt(event.target.value, 10);
      const relativeSpeed = this._logValue(position, 0.03125, 8);
      SettingsManager.set('tourSpeed', relativeSpeed);
    });

    this.routeColorInput.addEventListener('input', () => this.onUpdateRouteColor());

    this.routeWidthDecrement.addEventListener('click', () => {
      let width = parseInt(this.routeWidthDisplay.textContent, 10);
      if (width > 1) {
        width--;
        this.routeWidthDisplay.textContent = width;
        this.onUpdateRouteWidth();
      }
    });
    this.routeWidthIncrement.addEventListener('click', () => {
      let width = parseInt(this.routeWidthDisplay.textContent, 10);
      if (width < 20) {
        width++;
        this.routeWidthDisplay.textContent = width;
        this.onUpdateRouteWidth();
      }
    });

    this.cameraStrategyInput.addEventListener('change', (event) => {
        SettingsManager.set('cameraStrategy', event.target.value);
        this._updateCinematicControlsVisibility();
    });
    this.personColorInput.addEventListener('input', (event) => this.onUpdatePersonStyle({ color: event.target.value }));
    this.personSizeDecrement.addEventListener('click', () => {
      let size = parseFloat(this.personSizeDisplay.textContent);
      if (size > 0.5) {
        size -= 0.1;
        this.personSizeDisplay.textContent = size.toFixed(1);
        this.onUpdatePersonStyle({ size: size });
      }
    });
    this.personSizeIncrement.addEventListener('click', () => {
      let size = parseFloat(this.personSizeDisplay.textContent);
      if (size < 3) {
        size += 0.1;
        this.personSizeDisplay.textContent = size.toFixed(1);
        this.onUpdatePersonStyle({ size: size });
      }
    });

    this.cameraDistanceSlider.addEventListener('input', (event) => {
      const position = 100 - parseInt(event.target.value, 10);
      const distance = this._logValue(position, 25, 75000);
      SettingsManager.set('cameraDistance', distance);
    });
    this.cameraPitchSlider.addEventListener('input', (event) => SettingsManager.set('cameraPitch', parseInt(event.target.value, 10)));

    this.clampToGroundInput.addEventListener('change', () => this.onToggleClampToGround());
    this.performanceProfileInput.addEventListener('change', (event) => this.onSetProfile(event.target.value));

    this.customPlayPauseBtn.addEventListener('click', () => this.onCustomPlayPause());
    this.customRewindBtn.addEventListener('click', () => this.onCustomRewind());
    this.customResetBtn.addEventListener('click', () => this.onCustomReset());
    this.customZoomBtn.addEventListener('click', () => this.onCustomZoom());
    this.customResetStyleBtn.addEventListener('click', () => this.onCustomResetStyle());
    this.customPoiToggleBtn.addEventListener('click', () => this.onTogglePoiVisibility());
    this.timeScrubber.addEventListener('input', (event) => {
      const percentage = parseInt(event.target.value, 10) / 1000;
      this.onCustomScrub(percentage);
    });

    this.advancedControlsContent.style.display = 'block';
    this.advancedControlsHeader.addEventListener('click', () => {
      this.advancedControlsContent.style.display = this.advancedControlsContent.style.display === 'none' ? 'block' : 'none';
      this.advancedControlsHeader.classList.toggle('active');
    });

    this.athleteProfileControlsContent.style.display = 'block';
    this.athleteProfileControlsHeader.addEventListener('click', () => {
      this.athleteProfileControlsContent.style.display = this.athleteProfileControlsContent.style.display === 'none' ? 'block' : 'none';
      this.athleteProfileControlsHeader.classList.toggle('active');
    });

    this.athleteWeightDecrement.addEventListener('click', () => {
        let value = parseInt(this.athleteWeightDisplay.textContent, 10);
        if (value > 30) {
            value--;
            this.athleteWeightDisplay.textContent = value;
            this.onAthleteProfileChange();
        }
    });
    this.athleteWeightIncrement.addEventListener('click', () => {
        let value = parseInt(this.athleteWeightDisplay.textContent, 10);
        if (value < 200) {
            value++;
            this.athleteWeightDisplay.textContent = value;
            this.onAthleteProfileChange();
        }
    });

    this.refuelThresholdDecrement.addEventListener('click', () => {
        let value = parseInt(this.refuelThresholdDisplay.textContent, 10);
        if (value > 50) {
            value -= 50;
            this.refuelThresholdDisplay.textContent = value;
            this.onAthleteProfileChange();
        }
    });
    this.refuelThresholdIncrement.addEventListener('click', () => {
        let value = parseInt(this.refuelThresholdDisplay.textContent, 10);
        value += 50;
        this.refuelThresholdDisplay.textContent = value;
        this.onAthleteProfileChange();
    });

    this.targetSpeedDecrement.addEventListener('click', () => {
        let value = parseFloat(this.targetSpeedDisplay.textContent);
        if (value > 0.5) {
            value = Math.round((value - 0.5) * 10) / 10;
            this.targetSpeedDisplay.textContent = value.toFixed(1);
            this.onAthleteProfileChange();
        }
    });
    this.targetSpeedIncrement.addEventListener('click', () => {
        let value = parseFloat(this.targetSpeedDisplay.textContent);
        if (value < 20) {
            value = Math.round((value + 0.5) * 10) / 10;
            this.targetSpeedDisplay.textContent = value.toFixed(1);
            this.onAthleteProfileChange();
        }
    });

    this.degradationDecrement.addEventListener('click', () => {
        let value = parseInt(this.degradationDisplay.textContent, 10);
        if (value > 0) {
            value--;
            this.degradationDisplay.textContent = value;
            this.onAthleteProfileChange();
        }
    });
    this.degradationIncrement.addEventListener('click', () => {
        let value = parseInt(this.degradationDisplay.textContent, 10);
        if (value < 50) {
            value++;
            this.degradationDisplay.textContent = value;
            this.onAthleteProfileChange();
        }
    });

    this.restTimeDecrement.addEventListener('click', () => {
        let value = parseInt(this.restTimeDisplay.textContent, 10);
        if (value > 0) {
            value--;
            this.restTimeDisplay.textContent = value;
            this.onAthleteProfileChange();
        }
    });
            this.restTimeIncrement.addEventListener('click', () => {
                let value = parseInt(this.restTimeDisplay.textContent, 10);
                if (value < 60) {
                    value++;
                    this.restTimeDisplay.textContent = value;
                    this.onAthleteProfileChange();
                }
            });
    
            // NEW: Add Debug Overlay Toggle
            const debugContainer = document.createElement('div');
            debugContainer.className = 'slider-group';
            const debugLabel = document.createElement('label');
            debugLabel.htmlFor = 'debug-overlay-toggle';
            debugLabel.textContent = 'Show Debug Overlay:';
            const debugToggle = document.createElement('input');
            debugToggle.type = 'checkbox';
            debugToggle.id = 'debug-overlay-toggle';
            debugToggle.checked = SettingsManager.get('debugOverlay');
            debugToggle.addEventListener('change', () => {
                SettingsManager.set('debugOverlay', debugToggle.checked);
            });
            SettingsManager.subscribe('debugOverlay', (value) => {
                debugToggle.checked = value;
            });
            debugContainer.appendChild(debugLabel);
            debugContainer.appendChild(debugToggle);
            this.styleControls.appendChild(debugContainer);
    
            // Smoothing Period Listeners
            this.smoothingPeriodDecrementLarge.addEventListener('click', () => this._adjustSmoothingPeriod(-10));    this.smoothingPeriodDecrement.addEventListener('click', () => this._adjustSmoothingPeriod(-1));
    this.smoothingPeriodIncrement.addEventListener('click', () => this._adjustSmoothingPeriod(1));
    this.smoothingPeriodIncrementLarge.addEventListener('click', () => this._adjustSmoothingPeriod(10));

    // Cinematic Camera Controls Listeners
    this.cameraPathDetailDecrement.addEventListener('click', () => this._adjustCameraPathDetail(-50));
    this.cameraPathDetailIncrement.addEventListener('click', () => this._adjustCameraPathDetail(50));
    this.cameraSplineTensionDecrement.addEventListener('click', () => this._adjustCameraSplineTension(-0.1));
    this.cameraSplineTensionIncrement.addEventListener('click', () => this._adjustCameraSplineTension(0.1));
    this.cameraLookAheadDecrement.addEventListener('click', () => this._adjustCameraLookAheadTime(-15)); // Adjust in minutes
    this.cameraLookAheadIncrement.addEventListener('click', () => this._adjustCameraLookAheadTime(15)); // Adjust in minutes
    this.cameraMaxAzimuthDecrement.addEventListener('click', () => this._adjustCameraMaxAzimuth(-5));
    this.cameraMaxAzimuthIncrement.addEventListener('click', () => this._adjustCameraMaxAzimuth(5));
    this.cameraAzimuthFreqDecrement.addEventListener('click', () => this._adjustCameraAzimuthFreq(-0.01));
    this.cameraAzimuthFreqIncrement.addEventListener('click', () => this._adjustCameraAzimuthFreq(0.01));
    this.cameraTransitionDurDecrement.addEventListener('click', () => this._adjustCameraTransitionDur(-1));
    this.cameraTransitionDurIncrement.addEventListener('click', () => this._adjustCameraTransitionDur(1));

    this.cameraGazeSmoothingDecrement.addEventListener('click', () => this._adjustCameraGazeSmoothing(-5)); // Adjust in minutes
    this.cameraGazeSmoothingIncrement.addEventListener('click', () => this._adjustCameraGazeSmoothing(5)); // Adjust in minutes
    this.cameraPathDensityDecrement.addEventListener('click', () => this._adjustCameraPathDensity(-1));
    this.cameraPathDensityIncrement.addEventListener('click', () => this._adjustCameraPathDensity(1));

    this._initializeSettingsBasedUI();
    this._updateCinematicControlsVisibility(); // Set initial visibility
  }

  _logValue(position, min, max) {
    const minp = 0;
    const maxp = 100;
    const minv = Math.log(min);
    const maxv = Math.log(max);
    const scale = (maxv - minv) / (maxp - minp);
    return Math.exp(minv + scale * (position - minp));
  }

  _logPosition(value, min, max) {
    const minp = 0;
    const maxp = 100;
    const minv = Math.log(min);
    const maxv = Math.log(max);
    const scale = (maxv - minv) / (maxp - minp);
    return minp + (Math.log(value) - minv) / scale;
  }

  updateUIForState(state) {
    this.loadingIndicator.style.display = 'none';
    this.tourControls.style.display = 'none';
    this.bottomPanelContainer.style.display = 'none'; // Target the new parent
    this.routeStats.style.display = 'none';
    this.styleControls.style.display = 'none';
    this.cameraStrategyControls.style.display = 'none';
    this.performanceControls.style.display = 'none';
    this.cinematicCameraControls.style.display = 'none'; // Ensure hidden by default
    this.filenameSuggestion.style.display = 'none';
    this.athleteProfileControls.style.display = 'none';

    if (state === 'LOADING') {
      this.loadingIndicator.style.display = 'block';
    } else if (state === 'NO_ROUTE') {
      // Only the file input is visible
    } else if (state === 'ROUTE_LOADED' || state === 'TOUR_PAUSED') {
      this.styleControls.style.display = 'block';
      this.cameraStrategyControls.style.display = 'block';
      this.performanceControls.style.display = 'block';
      this.filenameSuggestion.style.display = 'block';
      this.athleteProfileControls.style.display = 'block';
      this.bottomPanelContainer.style.display = 'flex'; // Target the new parent
      this.customTourControls.style.display = 'flex'; // Also show the controls themselves
      this.setPlayPauseButtonState(false);
      this.tourControls.style.display = 'block';
      this._updateCinematicControlsVisibility(); // Update visibility based on current strategy
    } else if (state === 'TOUR_PLAYING') {
      this.styleControls.style.display = 'block';
      this.cameraStrategyControls.style.display = 'block';
      this.performanceControls.style.display = 'block';
      this.filenameSuggestion.style.display = 'block';
      this.athleteProfileControls.style.display = 'block';
      this.bottomPanelContainer.style.display = 'flex'; // Target the new parent
      this.customTourControls.style.display = 'flex'; // Also show the controls themselves
      this.setPlayPauseButtonState(true);
      this.tourControls.style.display = 'block';
      this._updateCinematicControlsVisibility(); // Update visibility based on current strategy
    }
  }

  _formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  updateFilenameContent(filename) {
    this.filenameContent.textContent = filename;
  }

  updateSpeedDisplay(relativeSpeed) {
    this.speedDisplay.textContent = `${relativeSpeed.toFixed(2)}x`;
  }

  getRouteColor() {
    return this.routeColorInput.value;
  }

  getRouteWidth() {
    return parseInt(this.routeWidthDisplay.textContent, 10);
  }

  getClampToGroundChecked() {
    return this.clampToGroundInput.checked;
  }

  getPersonColor() {
    return this.personColorInput.value;
  }

  getPersonSize() {
    return parseFloat(this.personSizeDisplay.textContent);
  }

  getCameraStrategy() {
    return this.cameraStrategyInput.value;
  }

  getCameraDistance() {
    const position = 100 - parseInt(this.cameraDistanceSlider.value, 10);
    return this._logValue(position, 50, 50000);
  }
  
  getAthleteWeight() {
    return parseFloat(this.athleteWeightDisplay.textContent);
  }

  getRefuelThreshold() {
    return parseFloat(this.refuelThresholdDisplay.textContent);
  }

  getTargetSpeed() {
    return parseFloat(this.targetSpeedDisplay.textContent);
  }

  getDegradation() {
    return parseFloat(this.degradationDisplay.textContent);
  }

  getRestTime() {
    return parseFloat(this.restTimeDisplay.textContent);
  }

  setClampToGroundLocked(isLocked) {
    this.clampToGroundInput.disabled = isLocked;
  }

  setPitchControlEnabled(isEnabled) {
    this.cameraPitchSlider.disabled = !isEnabled;
    this.pitchSliderGroup.style.opacity = isEnabled ? '1' : '0.5';
  }

  updateTimeDisplay(timeString) { this.timeDisplay.textContent = timeString; }

  updateScrubber(percentage) {
    this.timeScrubber.value = percentage * 1000;
  }

  setPlayPauseButtonState(isPlaying) {
    if (isPlaying) {
      this.customPlayPauseBtn.classList.add('is-playing');
    } else {
      this.customPlayPauseBtn.classList.remove('is-playing');
    }
  }

  setRewindButtonIcon(isForward) {
    if (isForward) {
      this.customRewindBtn.classList.add('is-forward');
    } else {
      this.customRewindBtn.classList.remove('is-forward');
    }
  }

  setPoiButtonState(isVisible) {
    if (isVisible) {
      this.customPoiToggleBtn.classList.add('is-visible');
    } else {
      this.customPoiToggleBtn.classList.remove('is-visible');
    }
  }

  collapsePanel() {
    if (!this.sidePanel.classList.contains('collapsed')) {
      this.sidePanel.classList.add('collapsed');
    }
  }

  expandPanel() {
    if (this.sidePanel.classList.contains('collapsed')) {
      this.sidePanel.classList.remove('collapsed');
    }
  }

  populateRouteLibrary(routes) {
    this.routeLibrarySelect.innerHTML = '';
    const noRouteOption = document.createElement('option');
    noRouteOption.value = 'none';
    noRouteOption.textContent = '— Select a Route —';
    this.routeLibrarySelect.appendChild(noRouteOption);
    if (routes && routes.length > 0) {
      routes.forEach(route => {
        const option = document.createElement('option');
        option.value = route.id;
        option.textContent = route.name;
        this.routeLibrarySelect.appendChild(option);
      });
    }
  }

  /**
   * Adjusts the smoothing period by a given step and updates the SettingsManager.
   * @param {number} step - The amount in seconds to adjust the smoothing period by.
   * @private
   */
  _adjustSmoothingPeriod(step) {
    const currentValue = SettingsManager.get('smoothingPeriodSeconds');
    const newValue = currentValue + step;
    SettingsManager.set('smoothingPeriodSeconds', newValue);
  }

  /**
   * Updates the display of the smoothing period.
   * @param {number} value - The new smoothing period value in seconds.
   */
  updateSmoothingPeriodDisplay(value) {
    this.smoothingPeriodDisplay.textContent = `${value}s`;
  }

  /**
   * Adjusts camera path detail by a given step and updates the SettingsManager.
   * @param {number} step - The amount in meters to adjust the path detail by.
   * @private
   */
  _adjustCameraPathDetail(step) {
    const currentValue = SettingsManager.get('cameraPathDetail');
    const newValue = currentValue + step;
    SettingsManager.set('cameraPathDetail', newValue);
  }

  /**
   * Updates the display of the camera path detail.
   * @param {number} value - The new camera path detail value in meters.
   */
  updateCameraPathDetailDisplay(value) {
    this.cameraPathDetailDisplay.textContent = `${value}m`;
  }

  /**
   * Adjusts camera spline tension by a given step and updates the SettingsManager.
   * @param {number} step - The amount to adjust the spline tension by.
   * @private
   */
  _adjustCameraSplineTension(step) {
    const currentValue = SettingsManager.get('cameraSplineTension');
    const newValue = parseFloat((currentValue + step).toFixed(1)); // ToFixed to prevent float issues
    SettingsManager.set('cameraSplineTension', newValue);
  }

  /**
   * Updates the display of the camera spline tension.
   * @param {number} value - The new camera spline tension value.
   */
  updateCameraSplineTensionDisplay(value) {
    this.cameraSplineTensionDisplay.textContent = value.toFixed(1);
  }

  /**
   * Adjusts camera look-ahead time by a given step (in minutes) and updates the SettingsManager (in seconds).
   * @param {number} stepMinutes - The amount in minutes to adjust the look-ahead time by.
   * @private
   */
  _adjustCameraLookAheadTime(stepMinutes) {
    const currentValueSeconds = SettingsManager.get('cameraLookAheadTime');
    const currentValueMinutes = currentValueSeconds / 60;
    const newValueMinutes = currentValueMinutes + stepMinutes;
    SettingsManager.set('cameraLookAheadTime', newValueMinutes * 60); // Store in seconds
  }

  /**
   * Updates the display of the camera look-ahead time (converts seconds to minutes for display).
   * @param {number} valueSeconds - The new camera look-ahead time value in seconds.
   */
  updateCameraLookAheadTimeDisplay(valueSeconds) {
    this.cameraLookAheadDisplay.textContent = `${valueSeconds / 60}min`;
  }

  /**
   * Adjusts camera max azimuth by a given step and updates the SettingsManager.
   * @param {number} step - The amount in degrees to adjust the max azimuth by.
   * @private
   */
  _adjustCameraMaxAzimuth(step) {
    const currentValue = SettingsManager.get('cameraMaxAzimuth');
    const newValue = currentValue + step;
    SettingsManager.set('cameraMaxAzimuth', newValue);
  }

  /**
   * Updates the display of the camera max azimuth.
   * @param {number} value - The new camera max azimuth value in degrees.
   */
  updateCameraMaxAzimuthDisplay(value) {
    this.cameraMaxAzimuthDisplay.textContent = `${value}°`;
  }

  /**
   * Adjusts camera azimuth frequency by a given step and updates the SettingsManager.
   * @param {number} step - The amount to adjust the azimuth frequency by.
   * @private
   */
  _adjustCameraAzimuthFreq(step) {
    const currentValue = SettingsManager.get('cameraAzimuthFreq');
    const newValue = parseFloat((currentValue + step).toFixed(2)); // ToFixed to prevent float issues
    SettingsManager.set('cameraAzimuthFreq', newValue);
  }

  /**
   * Updates the display of the camera azimuth frequency.
   * @param {number} value - The new camera azimuth frequency value.
   */
  updateCameraAzimuthFreqDisplay(value) {
    this.cameraAzimuthFreqDisplay.textContent = value.toFixed(2);
  }

  /**
   * Adjusts camera transition duration by a given step and updates the SettingsManager.
   * @param {number} step - The amount in seconds to adjust the transition duration by.
   * @private
   */
  _adjustCameraTransitionDur(step) {
    const currentValue = SettingsManager.get('cameraTransitionDur');
    const newValue = currentValue + step;
    SettingsManager.set('cameraTransitionDur', newValue);
  }

  /**
   * Updates the display of the camera transition duration.
   * @param {number} value - The new camera transition duration value in seconds.
   */
  updateCameraTransitionDurDisplay(value) {
    this.cameraTransitionDurDisplay.textContent = `${value}s`;
  }

  /**
   * Adjusts camera gaze smoothing by a given step and updates the SettingsManager.
   * @param {number} stepMinutes - The amount in minutes to adjust by.
   * @private
   */
  _adjustCameraGazeSmoothing(stepMinutes) {
    const currentValueSeconds = SettingsManager.get('cameraGazeSmoothing');
    const currentValueMinutes = currentValueSeconds / 60;
    const newValueMinutes = currentValueMinutes + stepMinutes;
    SettingsManager.set('cameraGazeSmoothing', newValueMinutes * 60);
  }

  /**
   * Updates the display of the camera gaze smoothing.
   * @param {number} valueSeconds - The new value in seconds.
   */
  updateCameraGazeSmoothingDisplay(valueSeconds) {
    this.cameraGazeSmoothingDisplay.textContent = `${valueSeconds / 60}min`;
  }

  /**
   * Adjusts camera path density by a given step and updates the SettingsManager.
   * @param {number} step - The amount to adjust by.
   * @private
   */
  _adjustCameraPathDensity(step) {
    const currentValue = SettingsManager.get('cameraPathSampleDensity');
    const newValue = currentValue + step;
    SettingsManager.set('cameraPathSampleDensity', newValue);
  }

  /**
   * Updates the display of the camera path density.
   * @param {number} value - The new value (samples per minute).
   */
  updateCameraPathDensityDisplay(value) {
    this.cameraPathDensityDisplay.textContent = value;
  }

  /**
   * Toggles the visibility of cinematic camera controls based on the active camera strategy.
   * @private
   */
  _updateCinematicControlsVisibility() {
    const currentStrategy = SettingsManager.get('cameraStrategy');
    if (currentStrategy === 'cinematic') {
      this.cinematicCameraControls.style.display = 'block';
    } else {
      this.cinematicCameraControls.style.display = 'none';
    }
  }

  /**
   * Initializes all UI elements tied to SettingsManager and subscribes them to future changes.
   * This centralizes the "hydration" of the UI from the state.
   * @private
   */
  _initializeSettingsBasedUI() {
    // --- Tour Speed Slider ---
    SettingsManager.subscribe('tourSpeed', (speed) => {
      this.speedSlider.value = this._logPosition(speed, 0.03125, 8);
      this.updateSpeedDisplay(speed);
    });
    const initialSpeed = SettingsManager.get('tourSpeed');
    this.speedSlider.value = this._logPosition(initialSpeed, 0.03125, 8);
    this.updateSpeedDisplay(initialSpeed);

    // --- Camera Strategy Dropdown ---
    this.cameraStrategyInput.value = SettingsManager.get('cameraStrategy');
    SettingsManager.subscribe('cameraStrategy', (strategy) => {
        this.cameraStrategyInput.value = strategy;
        this._updateCinematicControlsVisibility(); // Update visibility when strategy changes
    });

    // --- Camera Distance Slider ---
    SettingsManager.subscribe('cameraDistance', (distance) => {
      this.cameraDistanceSlider.value = 100 - this._logPosition(distance, 25, 75000);
      this.cameraDistanceDisplay.textContent = `${Math.round(distance)}m`;
    });
    const initialDistance = SettingsManager.get('cameraDistance');
    this.cameraDistanceSlider.value = 100 - this._logPosition(initialDistance, 25, 75000);
    this.cameraDistanceDisplay.textContent = `${Math.round(initialDistance)}m`;
    
    // --- Camera Pitch Slider ---
    SettingsManager.subscribe('cameraPitch', (pitch) => {
      this.cameraPitchSlider.value = pitch;
      this.cameraPitchDisplay.textContent = `${pitch}°`;
    });
    const initialPitch = SettingsManager.get('cameraPitch');
    this.cameraPitchSlider.value = initialPitch;
    this.cameraPitchDisplay.textContent = `${initialPitch}°`;

    // --- Smoothing Period ---
    this.updateSmoothingPeriodDisplay(SettingsManager.get('smoothingPeriodSeconds'));
    SettingsManager.subscribe('smoothingPeriodSeconds', (value) => this.updateSmoothingPeriodDisplay(value));

    // --- Cinematic Camera Settings ---
    this.updateCameraPathDetailDisplay(SettingsManager.get('cameraPathDetail'));
    SettingsManager.subscribe('cameraPathDetail', (value) => this.updateCameraPathDetailDisplay(value));

    this.updateCameraSplineTensionDisplay(SettingsManager.get('cameraSplineTension'));
    SettingsManager.subscribe('cameraSplineTension', (value) => this.updateCameraSplineTensionDisplay(value));

    this.updateCameraLookAheadTimeDisplay(SettingsManager.get('cameraLookAheadTime'));
    SettingsManager.subscribe('cameraLookAheadTime', (value) => this.updateCameraLookAheadTimeDisplay(value));

    this.updateCameraMaxAzimuthDisplay(SettingsManager.get('cameraMaxAzimuth'));
    SettingsManager.subscribe('cameraMaxAzimuth', (value) => this.updateCameraMaxAzimuthDisplay(value));

    this.updateCameraAzimuthFreqDisplay(SettingsManager.get('cameraAzimuthFreq'));
    SettingsManager.subscribe('cameraAzimuthFreq', (value) => this.updateCameraAzimuthFreqDisplay(value));

    this.updateCameraTransitionDurDisplay(SettingsManager.get('cameraTransitionDur'));
    SettingsManager.subscribe('cameraTransitionDur', (value) => this.updateCameraTransitionDurDisplay(value));

    this.updateCameraGazeSmoothingDisplay(SettingsManager.get('cameraGazeSmoothing'));
    SettingsManager.subscribe('cameraGazeSmoothing', (value) => this.updateCameraGazeSmoothingDisplay(value));

    this.updateCameraPathDensityDisplay(SettingsManager.get('cameraPathSampleDensity'));
    SettingsManager.subscribe('cameraPathSampleDensity', (value) => this.updateCameraPathDensityDisplay(value));
  }

  setStatsOverlay(statsOverlay) {
    this.statsOverlay = statsOverlay;
  }

  moveSlidersToReplayStats() {
    if (!this.statsOverlay) return;
    const sliderContainer = this.statsOverlay.getSliderContainer();
    if (sliderContainer) {
      sliderContainer.appendChild(this.speedSliderGroup);
      sliderContainer.appendChild(this.distanceSliderGroup);
      sliderContainer.appendChild(this.pitchSliderGroup);
    }
  }

  returnSlidersToSidePanel() {
    // Return sliders to their original parent containers
    this.tourControls.appendChild(this.speedSliderGroup);
    this.cameraStrategyControls.appendChild(this.distanceSliderGroup);
    this.cameraStrategyControls.appendChild(this.pitchSliderGroup);
  }
}

export default UIManager;
