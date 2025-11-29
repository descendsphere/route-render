import logger from './Logger.js';

class UIManager {
  constructor(viewer) {
    this.viewer = viewer;
    this.currentStats = {}; // New: To hold the last stats object

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
    this.statsContent = document.getElementById('stats-content');
    this.styleControls = document.getElementById('style-controls');
    this.cameraStrategyControls = document.getElementById('camera-strategy-controls');
    this.performanceControls = document.getElementById('performance-controls');
    this.filenameSuggestion = document.getElementById('filename-suggestion');
    this.filenameContent = document.getElementById('filename-content');
    this.panelContainer = document.getElementById('panel-container');
    this.sidePanel = document.getElementById('side-panel');
    this.panelHeader = document.querySelector('.panel-header');
    this.panelToggleButton = document.getElementById('panel-toggle-icon');
    this.quickControlsContainer = document.getElementById('quick-controls-container');
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
    this.gpxUrlInput = document.getElementById('gpx-url-input');
    this.loadFromUrlBtn = document.getElementById('load-from-url-btn');
    this.clearStorageButton = document.getElementById('clear-storage-button');
    this.routeLibrarySelect = document.getElementById('route-library-select');
    this.performanceProfileInput = document.getElementById('performance-profile');
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
      this.onSetSpeed(relativeSpeed);
      this.updateSpeedDisplay(relativeSpeed);
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

    this.cameraStrategyInput.addEventListener('change', (event) => this.onSetCameraStrategy(event.target.value));
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
      this.cameraDistanceDisplay.textContent = `${Math.round(distance)}m`;
      this.onUpdateCameraDistance(distance);
    });
    this.cameraPitchSlider.addEventListener('input', (event) => {
      const pitch = parseInt(event.target.value, 10);
      this.cameraPitchDisplay.textContent = `${pitch}°`;
      this.onSetCameraPitch(pitch);
    });

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
    this.customTourControls.style.display = 'none';
    this.routeStats.style.display = 'none';
    this.styleControls.style.display = 'none';
    this.cameraStrategyControls.style.display = 'none';
    this.performanceControls.style.display = 'none';
    this.filenameSuggestion.style.display = 'none';
    this.athleteProfileControls.style.display = 'none';
    this.quickControlsContainer.classList.remove('active');

    if (state === 'LOADING') {
      this.loadingIndicator.style.display = 'block';
    } else if (state === 'NO_ROUTE') {
      // Only the file input is visible
    } else if (state === 'ROUTE_LOADED' || state === 'TOUR_PAUSED') {
      this.routeStats.style.display = 'block';
      this.styleControls.style.display = 'block';
      this.cameraStrategyControls.style.display = 'block';
      this.performanceControls.style.display = 'block';
      this.filenameSuggestion.style.display = 'block';
      this.athleteProfileControls.style.display = 'block';
      this.quickControlsContainer.classList.add('active');
      this.customTourControls.style.display = 'flex';
      this.setPlayPauseButtonState(false);
      this.tourControls.style.display = 'none';
    } else if (state === 'TOUR_PLAYING') {
      this.routeStats.style.display = 'block';
      this.styleControls.style.display = 'block';
      this.cameraStrategyControls.style.display = 'block';
      this.performanceControls.style.display = 'block';
      this.filenameSuggestion.style.display = 'block';
      this.athleteProfileControls.style.display = 'block';
      this.quickControlsContainer.classList.add('active');
      this.customTourControls.style.display = 'flex';
      this.setPlayPauseButtonState(true);
      this.tourControls.style.display = 'none';
    }
  }

  updateStatsContent(stats) {
    this.currentStats = stats; // Store the latest stats
    let html = `
      <p>Total Distance: ${stats.totalDistance} km</p>
      <p>Total Ascent: ${stats.totalElevationGain} m</p>
      <p>Total Km-effort: ${stats.totalKmEffort}</p>
    `;
    if (stats.totalCalories !== undefined) {
      html += `<p>Est. Total Calories: ${stats.totalCalories} kcal</p>`;
    }
    if (stats.totalPlannedTime !== undefined) {
      html += `<p>Planned Total Time: ${this._formatTime(stats.totalPlannedTime)}</p>`;
    }
    if (stats.totalDurationString) {
      html += `<p>Actual Total Time: ${stats.totalDurationString}</p>`;
    }
    if (stats.overallAverageSpeed) {
      html += `<p>Actual Avg Speed: ${stats.overallAverageSpeed} km/h</p>`;
    }
    if (stats.overallAverageAscentRate) {
      html += `<p>Actual Avg Ascent Rate: ${stats.overallAverageAscentRate} m/h</p>`;
    }
    this.statsContent.innerHTML = html;
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
  
  getStatsContent() {
      return this.currentStats;
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
      this.speedSliderGroup.classList.add('vertical-slider');
      this.distanceSliderGroup.classList.add('vertical-slider');
      this.pitchSliderGroup.classList.add('vertical-slider');
      this.quickControlsContainer.appendChild(this.speedSliderGroup);
      this.quickControlsContainer.appendChild(this.distanceSliderGroup);
      this.quickControlsContainer.appendChild(this.pitchSliderGroup);
    }
  }

  expandPanel() {
    if (this.sidePanel.classList.contains('collapsed')) {
      this.sidePanel.classList.remove('collapsed');
      this.speedSliderGroup.classList.remove('vertical-slider');
      this.distanceSliderGroup.classList.remove('vertical-slider');
      this.pitchSliderGroup.classList.remove('vertical-slider');
      this.tourControls.appendChild(this.speedSliderGroup);
      this.cameraStrategyControls.appendChild(this.distanceSliderGroup);
      this.cameraStrategyControls.appendChild(this.pitchSliderGroup);
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
}

export default UIManager;
