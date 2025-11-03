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

    // DOM Elements
    this.gpxFileInput = document.getElementById('gpx-file');
    this.playButton = document.getElementById('play-tour');
    this.stopButton = document.getElementById('stop-tour');
    this.zoomToRouteButton = document.getElementById('zoom-to-route');
    this.resetStyleButton = document.getElementById('reset-style'); // New element
    this.speedSlider = document.getElementById('tour-speed');
    this.speedDisplay = document.getElementById('speed-display');
    this.routeColorInput = document.getElementById('route-color');
    this.routeWidthInput = document.getElementById('route-width');
    this.cameraStrategyInput = document.getElementById('camera-strategy');
    this.personColorInput = document.getElementById('person-color');
    this.personSizeInput = document.getElementById('person-size');
    this.clampToGroundInput = document.getElementById('clamp-to-ground');

    this.loadingIndicator = document.getElementById('loading-indicator');
    this.tourControls = document.getElementById('tour-controls');
    this.routeStats = document.getElementById('route-stats');
    this.statsContent = document.getElementById('stats-content');
    this.styleControls = document.getElementById('style-controls');
    this.cameraStrategyControls = document.getElementById('camera-strategy-controls');
    this.filenameSuggestion = document.getElementById('filename-suggestion');
    this.filenameContent = document.getElementById('filename-content');
    this.cameraInfo = document.getElementById('camera-info');
    this.cameraInfoContent = document.getElementById('camera-info-content');
    this.panelContainer = document.getElementById('panel-container'); // New element
    this.sidePanel = document.getElementById('side-panel'); // New element
    this.panelToggleButton = document.getElementById('panel-toggle'); // New element
  }

  /**
   * Initializes all UI event listeners.
   */
  init() {
    logger.info('Initializing UI event listeners.');

    // Prevent Cesium from interfering with UI mouse events
    this.sidePanel.addEventListener('mousedown', () => {
      this.viewer.scene.screenSpaceCameraController.enableInputs = false;
    });
    window.addEventListener('mouseup', () => {
      this.viewer.scene.screenSpaceCameraController.enableInputs = true;
    });

    // Panel toggle functionality
    this.panelToggleButton.addEventListener('click', () => {
      this.sidePanel.classList.toggle('collapsed');
      if (this.sidePanel.classList.contains('collapsed')) {
        this.panelToggleButton.textContent = '+';
      } else {
        this.panelToggleButton.textContent = '-';
      }
    });

    this.gpxFileInput.addEventListener('change', (event) => this.onFileSelected(event.target.files[0]));

    this.playButton.addEventListener('click', () => this.onPlayTour());
    this.stopButton.addEventListener('click', () => this.onStopTour());
    this.zoomToRouteButton.addEventListener('click', () => this.onZoomToRoute());
    this.resetStyleButton.addEventListener('click', () => this.onResetStyle()); // New listener

    this.speedSlider.addEventListener('input', (event) => {
      const relativeSpeed = parseFloat(event.target.value);
      this.onSetSpeed(relativeSpeed);
      this.updateSpeedDisplay(relativeSpeed);
    });

    this.routeColorInput.addEventListener('input', () => this.onUpdateRouteColor());
    this.routeWidthInput.addEventListener('input', () => this.onUpdateRouteWidth());

    this.cameraStrategyInput.addEventListener('change', (event) => this.onSetCameraStrategy(event.target.value));

    this.personColorInput.addEventListener('input', (event) => this.onUpdatePersonStyle({ color: event.target.value }));
    this.personSizeInput.addEventListener('input', (event) => this.onUpdatePersonStyle({ size: parseFloat(event.target.value) }));

    this.clampToGroundInput.addEventListener('change', () => this.onToggleClampToGround());
  }

  showLoadingIndicator() {
    this.loadingIndicator.style.display = 'block';
  }

  hideLoadingIndicator() {
    this.loadingIndicator.style.display = 'none';
  }

  showTourControls() {
    this.tourControls.style.display = 'block';
  }

  hideTourControls() {
    this.tourControls.style.display = 'none';
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

  showCameraInfo() {
    this.cameraInfo.style.display = 'block';
  }

  hideCameraInfo() {
    this.cameraInfo.style.display = 'none';
  }

  updateCameraInfoContent(info) {
    this.cameraInfoContent.innerHTML = `
      <p>Heading: ${info.heading.toFixed(2)}</p>
      <p>Pitch: ${info.pitch.toFixed(2)}</p>
      <p>Roll: ${info.roll.toFixed(2)}</p>
      <p>Height: ${info.height.toFixed(2)} m</p>
    `;
  }

  updateSpeedDisplay(relativeSpeed) {
    this.speedDisplay.textContent = `${relativeSpeed.toFixed(2)}x`;
  }

  getRouteColor() {
    return this.routeColorInput.value;
  }

  getRouteWidth() {
    return parseInt(this.routeWidthInput.value, 10);
  }

  getClampToGroundChecked() {
    return this.clampToGroundInput.checked;
  }

  getPersonColor() {
    return this.personColorInput.value;
  }

  getPersonSize() {
    return parseFloat(this.personSizeInput.value);
  }

  getCameraStrategy() {
    return this.cameraStrategyInput.value;
  }
}

export default UIManager;
