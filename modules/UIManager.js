import logger from './Logger.js';

class UIManager {
  constructor(viewer) {
    this.viewer = viewer;

    // Callbacks to be set by the App class
    this.onFileSelected = () => {};
    this.onPlayTour = () => {};
    this.onStopTour = () => {};
    this.onZoomToRoute = () => {};
    this.onResetStyle = () => {}; // New callback
    this.onSetSpeed = () => {};
    this.onUpdateRouteColor = () => {};
    this.onUpdateRouteWidth = () => {};
    this.onSetCameraStrategy = () => {};
    this.onUpdatePersonStyle = () => {};
    this.onToggleClampToGround = () => {};
    this.onUpdateCameraDistance = () => {};

    // DOM Elements
    this.gpxFileInput = document.getElementById('gpx-file');
    this.playButton = document.getElementById('play-tour');
    this.stopButton = document.getElementById('stop-tour');
    this.zoomToRouteButton = document.getElementById('zoom-to-route');
    this.resetStyleButton = document.getElementById('reset-style'); // New element
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
    this.clampToGroundInput = document.getElementById('clamp-to-ground');

    this.loadingIndicator = document.getElementById('loading-indicator');
    this.tourControls = document.getElementById('tour-controls');
    this.routeStats = document.getElementById('route-stats');
    this.statsContent = document.getElementById('stats-content');
    this.styleControls = document.getElementById('style-controls');
    this.cameraStrategyControls = document.getElementById('camera-strategy-controls');
    this.filenameSuggestion = document.getElementById('filename-suggestion');
    this.filenameContent = document.getElementById('filename-content');
    this.panelContainer = document.getElementById('panel-container'); // New element
    this.sidePanel = document.getElementById('side-panel'); // New element
    this.panelHeader = document.querySelector('.panel-header');
    this.panelToggleButton = document.getElementById('panel-toggle-icon'); // New element
    this.quickControlsContainer = document.getElementById('quick-controls-container');
    this.speedSliderGroup = this.speedSlider.parentElement;
    this.distanceSliderGroup = this.cameraDistanceSlider.parentElement;
  }

  /**
   * Initializes all UI event listeners.
   */
  init() {
    logger.info('Initializing UI event listeners.');

    // Prevent Cesium from interfering with UI mouse events
    this.sidePanel.addEventListener('mousedown', (event) => {
      // Allow clicks on the header to pass through
      if (!this.panelHeader.contains(event.target)) {
        this.viewer.scene.screenSpaceCameraController.enableInputs = false;
      }
    });
    window.addEventListener('mouseup', () => {
      this.viewer.scene.screenSpaceCameraController.enableInputs = true;
    });

    // Panel toggle functionality
    this.panelHeader.addEventListener('click', () => {
      this.sidePanel.classList.toggle('collapsed');
      if (this.sidePanel.classList.contains('collapsed')) {
        // Move sliders to quick controls and add vertical class
        this.speedSliderGroup.classList.add('vertical-slider');
        this.distanceSliderGroup.classList.add('vertical-slider');
        this.speedSliderGroup.querySelector('label').textContent = 'S:';
        this.distanceSliderGroup.querySelector('label').textContent = 'Z:';
        this.quickControlsContainer.appendChild(this.speedSliderGroup);
        this.quickControlsContainer.appendChild(this.distanceSliderGroup);
      } else {
        // Move sliders back to main panel and restore labels
        this.speedSliderGroup.classList.remove('vertical-slider');
        this.distanceSliderGroup.classList.remove('vertical-slider');
        this.speedSliderGroup.querySelector('label').textContent = 'Speed:';
        this.distanceSliderGroup.querySelector('label').textContent = 'Zoom:';
        this.tourControls.appendChild(this.speedSliderGroup);
        this.cameraStrategyControls.appendChild(this.distanceSliderGroup);
      }
    });

    this.gpxFileInput.addEventListener('change', (event) => this.onFileSelected(event.target.files[0]));

    this.playButton.addEventListener('click', () => this.onPlayTour());
    this.stopButton.addEventListener('click', () => this.onStopTour());
    this.zoomToRouteButton.addEventListener('click', () => this.onZoomToRoute());
    this.resetStyleButton.addEventListener('click', () => this.onResetStyle()); // New listener

    this.speedSlider.addEventListener('input', (event) => {
      const position = parseInt(event.target.value, 10);
      const relativeSpeed = this._logValue(position, 0.125, 8);
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
      const position = 100 - parseInt(event.target.value, 10); // Reverse the position
      const distance = this._logValue(position, 50, 20000);
      this.cameraDistanceDisplay.textContent = `${Math.round(distance)}m`;
      this.onUpdateCameraDistance(distance);
    });

    this.clampToGroundInput.addEventListener('change', () => this.onToggleClampToGround());
  }

  // --- Helper methods for logarithmic slider ---
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

  showLoadingIndicator() {
    this.loadingIndicator.style.display = 'block';
  }

  hideLoadingIndicator() {
    this.loadingIndicator.style.display = 'none';
  }

  showTourControls() {
    this.tourControls.style.display = 'block';
    this.quickControlsContainer.classList.add('active');
  }

  hideTourControls() {
    this.tourControls.style.display = 'none';
    this.quickControlsContainer.classList.remove('active');
  }

  showRouteStats() {
    this.routeStats.style.display = 'block';
  }

  hideRouteStats() {
    this.routeStats.style.display = 'none';
  }

  updateStatsContent(stats) {
    this.statsContent.innerHTML = `
      <p>Distance: ${stats.distance} km</p>
      <p>Elevation Gain: ${stats.elevationGain} m</p>
    `;
  }

  showStyleControls() {
    this.styleControls.style.display = 'block';
  }

  hideStyleControls() {
    this.styleControls.style.display = 'none';
  }

  showCameraStrategyControls() {
    this.cameraStrategyControls.style.display = 'block';
  }

  hideCameraStrategyControls() {
    this.cameraStrategyControls.style.display = 'none';
  }

  showFilenameSuggestion() {
    this.filenameSuggestion.style.display = 'block';
  }

  hideFilenameSuggestion() {
    this.filenameSuggestion.style.display = 'none';
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
    const position = 100 - parseInt(this.cameraDistanceSlider.value, 10); // Reverse the position
    return this._logValue(position, 50, 20000);
  }
}

export default UIManager;
