import logger from './modules/Logger.js';
import TourController from './modules/TourController.js';
import StatisticsCalculator from './modules/StatisticsCalculator.js';
import PoiService from './modules/PoiService.js';
import ReverseGeocodingService from './modules/ReverseGeocodingService.js';
import Person from './modules/Person.js';
import UIManager from './modules/UIManager.js';
import PerformanceTuner from './modules/PerformanceTuner.js';
import RouteStorage from './modules/RouteStorage.js';
import GpxGenerator from './modules/GpxGenerator.js';
import EnergyCalculator from './modules/EnergyCalculator.js';
import PerformancePlanner from './modules/PerformancePlanner.js';
import StatsOverlay from './modules/StatsOverlay.js';
import SettingsManager from './modules/SettingsManager.js';
import CameraController from './modules/CameraController.js';
import DebugOverlay from './modules/DebugOverlay.js';

class App {
  constructor() {
    this.viewer = null;
    this.gpxFile = null;
    this.tourController = null;
    this.performanceTuner = null; // New PerformanceTuner instance
    this.cameraController = null; // NEW: Manages all camera strategies and transitions
    this.currentPoints = [];
    this.routeEntity = null;
    this.person = null;
    this.ui = null; // New UIManager instance
    this.statsOverlay = null; // NEW
    this.debugOverlay = null; // NEW
    this.state = 'NO_ROUTE'; // Initial state
    this.poisAreVisible = true; // Initial state for POI visibility
    this.routes = []; // To cache routes from storage
    this.activeRouteId = null; // To track the currently loaded route
    this.poiService = null; // To hold the PoiService instance
    this.planProfile = null; // This will hold the rich object for the tour
    this.hasNativeTimestamps = false;
    this.actualPerformanceStats = null;
    this.baseRouteStats = null;
    this.tourPercentage = 0; // To track tour progress
    this.cameraUpdateListener = null; // NEW: To hold the reference to the camera update listener
  }

  /**
   * Sets the application state and triggers all necessary logic and UI updates.
   * This is the central controller for the application's state machine.
   * @param {string} newState - The new state.
   */
  setState(newState) {
    if (this.state === newState) return;
    logger.info(`State change: ${this.state} -> ${newState}`);

    // --- State Exit Logic ---
    if (this.state === 'TOUR_PLAYING') {
      this.performanceTuner.deactivate();
    }

    // --- State Entry Logic ---
    if (newState === 'TOUR_PLAYING') {
      if (this.state === 'TOUR_PAUSED') {
        // Just resume the clock, don't re-trigger the full start sequence
        this.tourController.startTour();
      } else {
        // This is a fresh start from ROUTE_LOADED
        this._startTour();
      }
    } else if (newState === 'TOUR_PAUSED') {
      this.tourController.pauseTour();
    } else if (newState === 'ROUTE_LOADED') {
      this.statsOverlay.hideReplayStats();
      this.statsOverlay.expandRouteStats();
      this.ui.setRewindButtonIcon(true); // Always initialize to forward-facing icon
      if (this.state === 'TOUR_PLAYING' || this.state === 'TOUR_PAUSED') {
        this._stopTour();
        this.ui.returnSlidersToSidePanel(); // Move sliders back to their home
      }
    }

    this.state = newState;
    this.ui.updateUIForState(this.state);
    this.performanceTuner.requestRender(); // Request render after any state change
  }

  /**
   * Initializes the application.
   */
  async init() {
    window.addEventListener('unhandledrejection', (event) => {
      logger.error('Unhandled rejection:', event.reason);
      alert('An unexpected error occurred. Please check the console for details.');
    });

    logger.info('Initializing application.');
    await this.initCesium();
    this.performanceTuner = new PerformanceTuner(this.viewer); // Instantiate PerformanceTuner
    this.cameraController = new CameraController(this.viewer, SettingsManager); 

    this.person = new Person(this.viewer);
    this.person.create();
    this.tourController = new TourController(this.viewer, this.person);
    this.poiService = new PoiService(this.viewer);
    this.ui = new UIManager(this.viewer); // Initialize UIManager
    this.statsOverlay = new StatsOverlay(); // NEW: Initialize StatsOverlay
    this.ui.setStatsOverlay(this.statsOverlay); // Inject dependency

    // NEW: Initialize Debug Overlay
    this.debugOverlay = new DebugOverlay(this.viewer.container);
    SettingsManager.subscribe('debugOverlay', (show) => {
      show ? this.debugOverlay.show() : this.debugOverlay.hide();
    });
    // Immediately set initial state
    if (SettingsManager.get('debugOverlay')) {
        this.debugOverlay.show();
    }

    let lastStorageUsage = 0;

    // Set up a slower timer for expensive metrics like storage
    setInterval(() => {
        if (SettingsManager.get('debugOverlay')) {
            // This is a "private" method on the overlay, but we call it here to orchestrate the timing.
            lastStorageUsage = this.debugOverlay._getLocalStorageUsage();
            this.debugOverlay.update({ storageUsed: lastStorageUsage });
        }
    }, 2000);

    // Set up the main render loop for fast metrics
    this.viewer.scene.postRender.addEventListener(() => {
        if (SettingsManager.get('debugOverlay')) {
            const metrics = { storageUsed: lastStorageUsage };
            if (performance.memory) {
                metrics.usedHeap = performance.memory.usedJSHeapSize;
                metrics.heapLimit = performance.memory.jsHeapSizeLimit;
            }
            this.debugOverlay.update(metrics);
        }
    });

    // Set up UI callbacks
    this.ui.onFileSelected = (file) => this.handleFileSelect(file);
    this.ui.onPlayTour = () => this.setState('TOUR_PLAYING'); // Desktop play
    this.ui.onStopTour = () => this.setState('ROUTE_LOADED'); // Desktop stop
    this.ui.onZoomToRoute = () => this.zoomToRoute();
    this.ui.onResetStyle = () => this.handleResetStyle();
    this.ui.onUpdateRouteColor = () => this.updateRouteStyle();
    this.ui.onUpdateRouteWidth = () => this.updateRouteStyle();
    this.ui.onUpdatePersonStyle = (style) => {
      this.person.updateStyle(style);
      this.performanceTuner.requestRender();
    };
    this.ui.onToggleClampToGround = () => {
      if (this.currentPoints.length > 0) {
        this.updateRouteStyle();
        this.tourController.updateVisuals();
        this.performanceTuner.requestRender();
      }
    };
    this.ui.onSetProfile = (profile) => this.performanceTuner.setProfile(profile);
    this.ui.onUrlLoad = (url) => this.handleUrlLoad(url);
    this.ui.onRouteSelected = (routeId) => this.handleRouteSelect(routeId);
    this.ui.onClearStorage = () => this.handleClearStorage();
    this.ui.onAthleteProfileChange = () => this.handleAnalysisUpdate();

    // Subscribe to tourSpeed changes
    SettingsManager.subscribe('tourSpeed', (speed) => this.tourController.setSpeed(speed));

    // Subscribe to camera-related settings changes
    SettingsManager.subscribe('cameraStrategy', (newStrategyName) => {
      // If a tour is active, immediately apply the new strategy
      if (this.state === 'TOUR_PLAYING' || this.state === 'TOUR_PAUSED') {
        logger.info(`Dynamically changing camera strategy to: ${newStrategyName}`);
        this.cameraController.setStrategy(newStrategyName, this.planProfile);
      }
    });
    SettingsManager.subscribe('cameraDistance', () => this.cameraController.onSettingsChange());
    SettingsManager.subscribe('cameraPitch', () => this.cameraController.onSettingsChange());
    SettingsManager.subscribe('cameraPathDetail', () => this.cameraController.onSettingsChange());
    SettingsManager.subscribe('cameraSplineTension', () => this.cameraController.onSettingsChange());
    SettingsManager.subscribe('cameraLookAheadTime', () => this.cameraController.onSettingsChange());
    SettingsManager.subscribe('cameraMaxAzimuth', () => this.cameraController.onSettingsChange());
    SettingsManager.subscribe('cameraAzimuthFreq', () => this.cameraController.onSettingsChange());
    SettingsManager.subscribe('cameraTransitionDur', () => this.cameraController.onSettingsChange());

    // Subscribe to smoothing factor changes
    SettingsManager.subscribe('smoothingFactor', () => this.recalculateAnalytics());

    // Custom tour controls callbacks
    this.ui.onCustomPlayPause = () => {
      if (this.state === 'TOUR_PLAYING') {
        this.setState('TOUR_PAUSED');
      } else {
        this.setState('TOUR_PLAYING');
      }
    };
    this.ui.onCustomRewind = () => {
      if (this.state === 'TOUR_PAUSED' || this.state === 'TOUR_PLAYING') {
        this.tourController.rewind();
        const isForward = this.tourController.getDirection() === 1;
        this.ui.setRewindButtonIcon(isForward);
        // If paused, start playing
        if (this.state === 'TOUR_PAUSED') {
          this.setState('TOUR_PLAYING');
        }
      }
    };
    this.ui.onCustomReset = () => this.setState('ROUTE_LOADED');
    this.ui.onCustomScrub = (percentage) => {
      if (this.state === 'NO_ROUTE') return;
      const newTime = this.tourController.seek(percentage);
      if (newTime) {
        const jsDate = Cesium.JulianDate.toDate(newTime);
        const year = jsDate.getFullYear();
        const month = (jsDate.getMonth() + 1).toString().padStart(2, '0');
        const day = jsDate.getDate().toString().padStart(2, '0');
        const hours = jsDate.getHours().toString().padStart(2, '0');
        const minutes = jsDate.getMinutes().toString().padStart(2, '0');
        const seconds = jsDate.getSeconds().toString().padStart(2, '0');
        const timeString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        this.ui.updateTimeDisplay(timeString);
        if (this.person.entity && this.person.entity.label) {
          this.person.entity.label.text = timeString;
        }
        this.performanceTuner.requestRender();
      }
    };
    this.ui.onCustomZoom = () => this.zoomToRoute();
    this.ui.onCustomResetStyle = () => this.handleResetStyle();
    this.ui.onTogglePoiVisibility = () => this.togglePoiVisibility(); // New listener

    // Tour controller tick callback
    this.tourController.onTick = ({ percentage, currentTime }) => {
      this.tourPercentage = percentage;
      this.ui.updateScrubber(percentage);
      // The time display will be updated by the postRender listener
    };

    this.ui.init(); // Initialize UI event listeners

    // --- DOM Structure Refactoring ---
    // Move the tour controls into the unified bottom panel container so they can be styled together.
    const bottomPanelContainer = document.getElementById('bottom-panel-container');
    const tourControls = document.getElementById('custom-tour-controls');
    if (bottomPanelContainer && tourControls) {
      bottomPanelContainer.appendChild(tourControls);
    }
    // --- End DOM Structure Refactoring ---

    this.setState('NO_ROUTE'); // Set initial state
    this.ui.setPoiButtonState(this.poisAreVisible); // Set initial POI button state

    // Merge static routes from the manifest and then populate the library
    await this.mergeStaticRoutes();
    this.routes = RouteStorage.getRoutes();
    this.ui.populateRouteLibrary(this.routes);

    // Check for a route_id or url in the URL and auto-load it
    const urlParams = new URLSearchParams(window.location.search);
    const routeIdToLoad = urlParams.get('route_id');
    const urlToLoad = urlParams.get('url');

    if (routeIdToLoad) {
      const routeExists = this.routes.some(route => route.id === routeIdToLoad);
      if (routeExists) {
        logger.info(`Found route_id in URL, attempting to auto-load: ${routeIdToLoad}`);
        this.ui.routeLibrarySelect.value = routeIdToLoad;
        this.ui.routeLibrarySelect.dispatchEvent(new Event('change'));
      } else {
        logger.warn(`Route with ID "${routeIdToLoad}" from URL not found in library.`);
      }
    } else if (urlToLoad) {
      logger.info(`Found url in URL, attempting to auto-load: ${urlToLoad}`);
      this.handleUrlLoad(urlToLoad);
    }
  }

  /**
   * Updates the browser's URL to make it shareable for the given route.
   * @param {object} route - The route record from storage.
   * @private
   */
  _updateShareableUrl(route) {
    const newUrl = new URL(window.location);
    newUrl.searchParams.delete('route_id');
    newUrl.searchParams.delete('url');

    if (route && route.sourceType === 'url') {
      newUrl.searchParams.set('url', route.source);
    } else if (route && route.sourceType === 'static') {
      newUrl.searchParams.set('route_id', route.id);
    }

    window.history.pushState({ path: newUrl.toString() }, '', newUrl.toString());
    logger.info(`Updated URL for sharing: ${newUrl.toString()}`);
  }

  async mergeStaticRoutes() {
    try {
      logger.info('Checking for static routes from manifests...');
      const manifestsToProcess = ['gpx/manifest.json'];
      const processedManifests = new Set();
      const existingRoutes = RouteStorage.getRoutes();
      const existingSources = new Set(existingRoutes.map(r => r.source));
      const urlsToCache = [];

      while (manifestsToProcess.length > 0) {
        const manifestUrl = manifestsToProcess.pop();
        if (processedManifests.has(manifestUrl)) {
          continue; // Cycle detected or already processed
        }
        processedManifests.add(manifestUrl);

        try {
          logger.info(`Processing manifest: ${manifestUrl}`);
          const response = await fetch(manifestUrl);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const manifest = await response.json();

          for (const entry of manifest) {
            if (entry.type === 'manifest') {
              manifestsToProcess.push(entry.url);
            } else if (entry.type === 'file') {
              if (!existingSources.has(entry.url)) {
                logger.info(`Adding new static route metadata: "${entry.name}"`);
                // Add metadata to localStorage, but not the gpxString
                RouteStorage.addRoute({
                  name: entry.name,
                  sourceType: 'static',
                  source: entry.url,
                });
              }
              // Always ensure the file is in the cache
              urlsToCache.push(entry.url);
            }
          }
        } catch (error) {
          logger.error(`Could not process manifest ${manifestUrl}:`, error);
        }
      }

      // After discovering all files, cache them in one go
      if (urlsToCache.length > 0) {
        await RouteStorage.cacheStaticRoutes(urlsToCache);
      }

    } catch (error) {
      logger.error('Could not merge static routes:', error);
    }
  }

  /**
   * Toggles the visibility of all POI entities.
   */
  togglePoiVisibility() {
    this.poisAreVisible = !this.poisAreVisible;
    this.poiService.toggleVisibility(this.poisAreVisible);
    this.ui.setPoiButtonState(this.poisAreVisible);
  }

  /**
   * Initializes the Cesium viewer.
   */
  async initCesium() {
    logger.info('Initializing Cesium viewer.');
    // Note: Using a default access token for Cesium Ion. For a production app, you should create your own token.
    Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI1Njg3Zjk2Yy02ZjM4LTRkM2QtYjY4MC1kN2ZkNWU4N2M3NjYiLCJpZCI6MzU1Mzk4LCJpYXQiOjE3NjIxNzc1OTR9.bWw5GgYYaFW-JZ2AJr6GHBEZq4tohQF8qea5FJ7eaao';

    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

    try {
      const terrainProvider = await Cesium.createWorldTerrainAsync({
        requestWaterMask: !isMobile, // Disable water mask on mobile for performance
        requestVertexNormals: !isMobile, // Disable lighting on mobile for performance
      });

      this.viewer = new Cesium.Viewer('cesiumContainer', {
        terrainProvider: terrainProvider,
        animation: false, // Always use custom animation controls
        timeline: false, // Always use custom timeline controls
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        contextOptions: {
          requestWebgl2: true,
          webgl: {
            //willReadFrequently: true,
            powerPreference: "low-power"
          }
        },
        msaaSamples: 1, // Disable MSAA (default when off)
        // Enable on-demand rendering
        requestRenderMode: true,
        maximumRenderTimeChange: Infinity,

        //skyBox: false,
        //skyAtmosphere: false,
        sun: false,
        moon: false,
        shadows: false, // No realtime dynamic shadows
        infoBox: false,
        selectionIndicator: false,
        //fullscreenButton: false
      });
    } catch (error) {
        logger.error("Failed to create terrain provider. Terrain will be disabled.", error);
        // Fallback to a viewer without terrain
        this.viewer = new Cesium.Viewer('cesiumContainer', {
            animation: false, timeline: false, geocoder: false, homeButton: false, sceneModePicker: false
        });
    }


    // Handle high DPI displays
    if (isMobile) {
      this.viewer.resolutionScale = window.devicePixelRatio;
      // Mobile-specific performance and usability adjustments
      this.viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;
      this.viewer.scene.screenSpaceCameraController.zoomEventTypes = [Cesium.CameraEventType.PINCH];
    } else {
      this.viewer.resolutionScale = Math.min(window.devicePixelRatio, 1.5);
    }

    this.viewer.camera.setView({
      destination : Cesium.Cartesian3.fromDegrees(114.109, 22.0, 90000),
      orientation : {
        heading : Cesium.Math.toRadians(0.0),
        pitch : Cesium.Math.toRadians(-70.0),
      }
    });
  }

  /**
   * Handles the selection of a GPX file.
   * @param {File} file - The selected GPX file.
   */
  handleFileSelect(file) {
    if (!file) {
      logger.warn('No file selected.');
      return;
    }

    this.setState('LOADING');
    logger.info(`Selected file: ${file.name}`);

    const reader = new FileReader();
    reader.onload = (e) => {
      const gpxData = e.target.result;
      const newRecord = RouteStorage.addRoute({
        gpxString: gpxData,
        name: file.name,
        sourceType: 'file',
        source: file.name
      });

      if (newRecord) {
        // Refresh library and auto-select the new route
        this.routes = RouteStorage.getRoutes();
        this.ui.populateRouteLibrary(this.routes);
        this.ui.routeLibrarySelect.value = newRecord.id;
        // Manually trigger the change event to load the new route
        this.ui.routeLibrarySelect.dispatchEvent(new Event('change'));
      } else {
        this.setState('NO_ROUTE');
      }
    };
    reader.onerror = (e) => {
        logger.error('Error reading file:', e);
        alert('Error reading file.');
        this.setState('NO_ROUTE');
    }
    reader.readAsText(file);
  }

  /**
   * Handles loading a GPX file from a URL.
   * @param {string} url - The URL of the GPX file to load.
   */
  async handleUrlLoad(url) {
    if (!url || !url.startsWith('http')) {
      alert('Please enter a valid URL.');
      return;
    }

    // Check if a route with this URL as its source already exists
    const existingRoute = this.routes.find(route => route.source === url);
    if (existingRoute) {
      logger.info(`Route from URL "${url}" already exists. Selecting it.`);
      this.ui.routeLibrarySelect.value = existingRoute.id;
      this.ui.routeLibrarySelect.dispatchEvent(new Event('change'));
      return;
    }

    this.setState('LOADING');
    logger.info(`Adding GPX URL to library: ${url}`);

    try {
      // Extract a name from the URL path
      const urlPath = new URL(url).pathname;
      const fileName = decodeURIComponent(urlPath.substring(urlPath.lastIndexOf('/') + 1)) || 'URL Route';

      const newRecord = RouteStorage.addRoute({
        name: fileName,
        sourceType: 'url',
        source: url
      });

      if (newRecord) {
        // Refresh library and auto-select the new route
        this.routes = RouteStorage.getRoutes();
        this.ui.populateRouteLibrary(this.routes);
        this.ui.routeLibrarySelect.value = newRecord.id;
        // Manually trigger the change event to load the new route
        this.ui.routeLibrarySelect.dispatchEvent(new Event('change'));
      } else {
        this.setState('NO_ROUTE');
      }

    } catch (error) {
      logger.error('Failed to add GPX from URL:', error);
      alert(`Failed to add GPX from URL.\n\nError: ${error.message}`);
      this.setState('NO_ROUTE');
    }
  }

  /**
   * Handles clearing all stored routes and cached data.
   */
  async handleClearStorage() {
    const confirmed = confirm('Are you sure you want to clear all stored routes and cached data? This will remove all routes you have added from files or URLs. This action cannot be undone. The page will be reloaded after clearing.');
    if (confirmed) {
      this.clearRoute();
      await RouteStorage.clearAll();
      window.location.reload();
    }
  }

  /**
   * Handles the calculation and display of energy-related metrics and refuel markers.
   */
  handleAnalysisUpdate() {
    if (!this.currentRouteAnalysisData || this.currentRouteAnalysisData.length === 0) {
      logger.warn('handleAnalysisUpdate called without base analysis data.');
      return;
    }

    const userWeightKg = this.ui.getAthleteWeight();
    const refuelThresholdKcal = this.ui.getRefuelThreshold();
    const targetSpeedKmh = this.ui.getTargetSpeed();
    const degradation = this.ui.getDegradation();
    const restPerRefuelMin = this.ui.getRestTime();

    if (isNaN(userWeightKg) || userWeightKg <= 0 || isNaN(refuelThresholdKcal) || refuelThresholdKcal <= 0) {
      alert('Please enter a valid weight and refuel threshold.');
      return;
    }

    let processedData = this.currentRouteAnalysisData;

    // --- 1. Performance Analysis (if applicable) ---
    if (this.hasNativeTimestamps) {
      this.actualPerformanceStats = StatisticsCalculator.analyzePerformance(processedData);
      processedData = this.actualPerformanceStats.augmentedPerPointData;
    } else {
      this.actualPerformanceStats = null; // Clear any previous stats
    }

    // --- 2. Energy Calculation ---
    const energyProfile = EnergyCalculator.calculateEnergyProfile(
      processedData,
      userWeightKg
    );
    processedData = energyProfile.perPointData;
    
    const refuelPoints = EnergyCalculator.findRefuelPoints(
      processedData,
      refuelThresholdKcal
    );

    // --- 3. Time Simulation & Finalization ---
    this.planProfile = PerformancePlanner.planPerformanceProfile(
      processedData,
      targetSpeedKmh,
      degradation,
      refuelPoints,
      restPerRefuelMin
    );
    
    // --- 5. Final UI Update ---
    this.statsOverlay.updateRouteStats({
      ...this.baseRouteStats,
      ...this.actualPerformanceStats,
      totalCalories: energyProfile.totalKcal.toFixed(0),
      totalPlannedTime: this.planProfile.totalPlannedTime,
    });

    this.clearRefuelMarkers();
    this.renderRefuelMarkers(refuelPoints);

    // --- 6. Prepare Tour ---
    this.tourController.prepareTour(this.planProfile);
    // NEW: Set the initial strategy on the camera controller so it's ready for playback
    this.cameraController.setStrategy(SettingsManager.get('cameraStrategy'), this.planProfile);
  }

  /**
   * Recalculates route analytics if a route is currently loaded.
   * This is typically called when a setting affecting analytics changes (e.g., smoothing factor).
   */
  recalculateAnalytics() {
    if (this.state === 'ROUTE_LOADED' || this.state === 'TOUR_PLAYING' || this.state === 'TOUR_PAUSED') {
      logger.info('Recalculating route analytics due to settings change.');
      this.handleAnalysisUpdate();
    }
  }

  /**
   * Renders refuel markers on the Cesium viewer.
   * @param {Array<object>} refuelPoints - An array of point objects where refueling should happen.
   */
  renderRefuelMarkers(refuelPoints) {
    refuelPoints.forEach((point, index) => {
      this.viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(point.lon, point.lat), // No height
        billboard: {
          image: 'assets/refuel_marker.svg',
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          scale: 1,
        },
        label: {
          text: `Refuel ${index + 1} (${point.cumulativeKcal.toFixed(0)} kcal)`,
          showBackground: true,
          backgroundColor: new Cesium.Color(0.1, 0.4, 0.1, 0.7),
          font: '12pt sans-serif',
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -30),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        gpxEntity: true, // Tag for easy removal
        refuelMarker: true, // Custom tag for specific refuel marker removal
      });
    });
  }

  /**
   * Clears all refuel markers from the Cesium viewer.
   */
  clearRefuelMarkers() {
    const markersToRemove = this.viewer.entities.values.filter(entity => entity.refuelMarker);
    markersToRemove.forEach(entity => this.viewer.entities.remove(entity));
  }

  /**
   * Handles the selection of a route from the library dropdown.
   * @param {string} routeId - The ID of the selected route.
   */
  async handleRouteSelect(routeId) {
    this.clearRoute();
    this.activeRouteId = null;

    if (routeId === 'none') {
      this.setState('NO_ROUTE');
      return;
    }

    this.setState('LOADING');
    const route = this.routes.find(r => r.id === routeId);

    if (!route) {
      logger.error(`Route with ID "${routeId}" not found in library.`);
      this.setState('NO_ROUTE');
      return;
    }

    logger.info(`Loading route from library: "${route.name}"`);
    this.activeRouteId = routeId;

    try {
      let gpxString = route.gpxString;

      // If gpxString is not stored, fetch it using the cache-first strategy.
      if (!gpxString) {
        if (!route.source) throw new Error('Route has no gpxString and no source URL.');
        gpxString = await RouteStorage.getGpx(route.source);
      } else {
        logger.info('Using gpxString from localStorage.');
      }

      if (!gpxString) {
        throw new Error(`Could not retrieve GPX content for ${route.source}`);
      }

      this._processGpxData(gpxString, route);

    } catch (error) {
      logger.error(`Failed to load route content for "${route.name}":`, error);
      alert(`Could not load route: ${error.message}`);
      this.setState('NO_ROUTE');
    }
  }

  /**
   * Clears the currently loaded route and all associated data.
   */
  clearRoute() {
    this.ui.setClampToGroundLocked(false); // Ensure lock is released
    this._updateShareableUrl(null);
    logger.info('Clearing current route.');
    this.tourController.stopTour();
    this.person.reset();

    if (this.routeEntity) {
      this.viewer.entities.remove(this.routeEntity);
      this.routeEntity = null;
    }

    // Remove all entities that have our custom gpxEntity flag
    const entitiesToRemove = this.viewer.entities.values.filter(entity => entity.gpxEntity);
    entitiesToRemove.forEach(entity => this.viewer.entities.remove(entity));
    this.poiService.clearPoisFromViewer(); // Delegate to service
    this.clearRefuelMarkers(); // New: Clear refuel markers
    this.statsOverlay.hide(); // NEW: Hide stats overlay

    this.currentPoints = [];
    this.setState('NO_ROUTE');
  }

  /**
   * Parses and renders the selected GPX file.
   */
  parseAndRenderGpx() {
    const reader = new FileReader();
    reader.onload = (e) => {
      const gpxData = e.target.result;
      this._processGpxData(gpxData, this.gpxFile.name, 'file', this.gpxFile.name);
    };
    reader.onerror = (e) => {
        logger.error('Error reading file:', e);
        alert('Error reading file.');
        this.setState('NO_ROUTE');
    }
    reader.readAsText(this.gpxFile);
  }

  /**
   * Central processing function for GPX data from any source.
   * @param {object} route - The route record from storage.
   */
  _processGpxData(gpxString, route) {
    const gpx = new gpxParser();
    gpx.parse(gpxString);

    if (!gpx.tracks.length) {
      logger.error('No tracks found in the GPX data.');
      alert('Error: No tracks found in the GPX data.');
      this.setState('NO_ROUTE');
      return;
    }

    this.renderGpx(gpx, route);
  }

  /**
   * Renders the parsed GPX data on the Cesium map.
   * @param {object} gpx - The parsed GPX data from gpx-parser-builder.
   * @param {object} route - The route record from storage.
   */
  renderGpx(gpx, route) {
    const track = gpx.tracks[0];
    const points = track.points.map(p => ({ lon: p.lon, lat: p.lat, ele: p.ele, time: p.time }));

    // Render waypoints
    if (gpx.waypoints && gpx.waypoints.length > 0) {
      logger.info(`Found ${gpx.waypoints.length} waypoints.`);
      gpx.waypoints.forEach(wpt => {
        this.viewer.entities.add({
          //position: Cesium.Cartesian3.fromDegrees(wpt.lon, wpt.lat, wpt.ele + 50 || 0),
          position: Cesium.Cartesian3.fromDegrees(wpt.lon, wpt.lat, 300),
          description: wpt.name,
          gpxEntity: true, // Flag for cleanup
          billboard: {
            image: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            //heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            clampToGround: true,
          },
          label: {
            text: wpt.name,
            font: '14pt sans-serif',
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -50),
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          },
        });
      });
    }

    // Check if the GPX file has elevation and time data.
    const hasElevation = points.every(p => p.ele !== undefined && p.ele !== null);
    this.hasNativeTimestamps = points.every(p => p.time !== undefined && p.time !== null);

    if (hasElevation) {
      logger.info('GPX file has elevation data.');
      this.renderRoute(points, route);
    } else {
      logger.warn('GPX file does not have elevation data. Automatic enrichment is required.');
      alert('This GPX file does not have elevation data. We will now fetch it automatically. This may take a moment.');
      this.enrichAndRenderRoute(points, route);
    }
  }

  /**
   * Renders the route on the map from 3D points.
   * @param {Array<object>} points - An array of points with lon, lat, and ele properties.
   * @param {object} route - The route record from storage.
   */
  renderRoute(points, route) {
    this.currentPoints = points;
    this.updateRouteStyle(); // Draw the route polyline or corridor

    // --- One-time operations after initial rendering ---

    // Get positions regardless of entity type (polyline or corridor)
    let positions;
    if (this.routeEntity.polyline) {
      positions = this.routeEntity.polyline.positions.getValue();
    } else if (this.routeEntity.corridor) {
      positions = this.routeEntity.corridor.positions.getValue();
    }

    const boundingSphere = Cesium.BoundingSphere.fromPoints(positions);
    this.routeCenter = boundingSphere.center;

    let maxElevation = 0; // Keeping this for now as it's used by TourController
    points.forEach(p => {
      if (p.ele > maxElevation) maxElevation = p.ele;
    });
    this.maxRouteElevation = maxElevation;

    this.viewer.zoomTo(this.routeEntity);
    logger.info('Route rendered successfully.');

    // Calculate and display comprehensive statistics
    this.baseRouteStats = StatisticsCalculator.calculate(points);
    this.currentRouteAnalysisData = this.baseRouteStats.perPointData; // Store rich per-point data
    
    this.handleAnalysisUpdate(); // New: Auto-calculate energy and time on load

    // Use a one-time postRender listener to show the person.
    // This ensures the engine has had a frame to process the new position
    // and clamp it to the ground before making it visible, preventing a visual glitch.
    const showPersonListener = () => {
      this.person.show();
      this.viewer.scene.postRender.removeEventListener(showPersonListener);
    };
    this.viewer.scene.postRender.addEventListener(showPersonListener);

    this.setState('ROUTE_LOADED');

    // Check if POIs are already stored, otherwise fetch them.
    if (route && route.pois && route.pois.length > 0) {
      logger.info(`Rendering ${route.pois.length} POIs from local storage.`);
      this.poiService.renderPois(route.pois, this.poisAreVisible);
    } else {
      this.fetchAndRenderPois(points);
    }

    this.generateAndDisplayFilename(points);
    this._updateShareableUrl(route);
    this.statsOverlay.show(); // NEW: Show stats overlay
  }

  /**
   * Generates and displays a suggested filename for the route.
   * @param {Array<object>} points - An array of points with lon and lat properties.
   */
  async generateAndDisplayFilename(points) {
    if (points.length < 2) return;

    const startPoint = points[0];
    const endPoint = points[points.length - 1];

    const startLocation = await ReverseGeocodingService.getLocationName(startPoint.lat, startPoint.lon);
    const endLocation = await ReverseGeocodingService.getLocationName(endPoint.lat, endPoint.lon);

    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');

    const filename = `${year}-${month}-${day}.${hours}${minutes}_${startLocation}_${endLocation}.gpx`;

    this.ui.updateFilenameContent(filename);
  }

  /**
   * Fetches and renders points of interest near the route.
   * @param {Array<object>} points - An array of points with lon and lat properties.
   */
  async fetchAndRenderPois(points) {
    // Fetch POI data from PoiService
    await this.poiService.fetchPois(points);
    const pois = this.poiService.poiData;

    // Save the fetched POIs to storage for next time
    if (this.activeRouteId && pois.length > 0) {
      RouteStorage.updateRoute(this.activeRouteId, { pois: pois });
      // Also update our cached version
      const route = this.routes.find(r => r.id === this.activeRouteId);
      if (route) route.pois = pois;
    }

    this.poiService.renderPois(pois, this.poisAreVisible);
    this.ui.setPoiButtonState(this.poisAreVisible); // Update button state
  }

  /**
   * Enriches 2D points with elevation data and then renders the route.
   * @param {Array<object>} points - An array of points with lon and lat properties.
   * @param {object} route - The route record from storage.
   */
  async enrichAndRenderRoute(points, route) {
    this.setState('LOADING');
    
    try {
      // 1. Create an array of Cartographic positions.
      const cartographicPositions = points.map(p => Cesium.Cartographic.fromDegrees(p.lon, p.lat));

      // 2. Sample the terrain.
      const updatedCartographics = await Cesium.sampleTerrainMostDetailed(this.viewer.scene.terrainProvider, cartographicPositions);

      // 3. Create the final enriched points.
      const enrichedPoints = points.map((originalPoint, index) => ({
        ...originalPoint,
        ele: updatedCartographics[index].height,
      }));

      logger.info('Elevation data enriched successfully.');

      // Generate the new GPX string and save it back to storage
      const newGpxString = GpxGenerator.generate(enrichedPoints, route.name);
      RouteStorage.updateRoute(route.id, { gpxString: newGpxString });

      this.ui.setClampToGroundLocked(false);
      this.renderRoute(enrichedPoints, route);

    } catch (error) {
      logger.error('Error during terrain sampling:', error);
      alert('Could not fetch elevation data. The route will be displayed clamped to the ground.');
      this.ui.setClampToGroundLocked(true);
      // We have to set the clamp to ground checkbox to true before rendering
      // because renderRoute uses the value from the checkbox.
      this.ui.clampToGroundInput.checked = true;
      this.renderRoute(points, route);
    }
  }

  /**
   * Updates only the style of the route polyline (color, width, clamp).
   */
  updateRouteStyle() {
    // Remove existing route entity if it exists
    if (this.routeEntity) {
      this.viewer.entities.remove(this.routeEntity);
    }

    const clampToGround = this.ui.getClampToGroundChecked();
    const color = Cesium.Color.fromCssColorString(this.ui.getRouteColor());
    const width = this.ui.getRouteWidth();

    this.routeEntity = this.viewer.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights(
          this.currentPoints.flatMap(p => [p.lon, p.lat, p.ele])
        ),
        width: width,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.2,
          color: color,
        }),
        clampToGround: true,
      },
    });
    this.performanceTuner.requestRender();
  }

  /**
   * Zooms the camera to the full extent of the route.
   */
  zoomToRoute() {
    if (this.routeEntity) {
      this.viewer.zoomTo(this.routeEntity);
      this.performanceTuner.requestRender();
    }
  }

  /**
   * Resets all style and camera controls to their default values.
   */
  handleResetStyle() {
    logger.info('Resetting styles to default.');

    // Reset UI controls to their default values
    this.ui.routeColorInput.value = '#FFA500';
    this.ui.routeWidthDisplay.textContent = 5;
    this.ui.clampToGroundInput.checked = true;
    this.ui.personColorInput.value = '#FFA500';
    this.ui.personSizeDisplay.textContent = 1;
    this.ui.speedSlider.value = this.ui._logPosition(1, 0.125, 8);
    this.ui.cameraDistanceSlider.value = this.ui._logPosition(1000, 50, 20000);

    // Programmatically trigger events to apply the changes
    this.ui.routeColorInput.dispatchEvent(new Event('input'));
    this.ui.onUpdateRouteWidth(); // Directly call the update method
    this.ui.clampToGroundInput.dispatchEvent(new Event('change'));
    this.ui.personColorInput.dispatchEvent(new Event('input'));
    this.ui.onUpdatePersonStyle({ size: 1 }); // Directly call the update method
    // Do NOT dispatch a change event for the camera, as it's disruptive.
    // The user can change this manually if they wish.
    // this.ui.cameraStrategyInput.dispatchEvent(new Event('change'));
    this.ui.speedSlider.dispatchEvent(new Event('input'));
    this.ui.cameraDistanceSlider.dispatchEvent(new Event('input'));

    this.performanceTuner.requestRender();
  }

  /**
   * Initiates the tour sequence, including fade-in animation via CameraController.
   * @private
   */
  _startTour() {
    this.performanceTuner.activate();
    this.ui.collapsePanel();
    
    // Add the listener and store the removal function
    if (this.cameraUpdateListener) {
      this.cameraUpdateListener(); // Remove any old listener just in case
    }
    this.cameraUpdateListener = this.viewer.clock.onTick.addEventListener(() => {
      if (!this.tourController.tour) return;
      this.cameraController.updateCamera(this.viewer.clock.currentTime, (state) => {
        if (!state) return;
        this.tourPercentage = state.percentage;
        this.ui.updateScrubber(state.percentage);
        this.ui.updateTimeDisplay(state.timeString);
        if (this.person.entity && this.person.entity.label) {
            this.person.entity.label.text = state.timeString;
        }
        this.statsOverlay.updateReplayStats(state.liveStats, this.hasNativeTimestamps);
      });
    });

    const overviewCameraState = {
      position: this.viewer.camera.position.clone(),
      heading: this.viewer.camera.heading,
      pitch: this.viewer.camera.pitch,
      roll: this.viewer.camera.roll
    };
    
    this.cameraController.startTour(this.planProfile, overviewCameraState, () => {
      this.viewer.clock.shouldAnimate = true;
    }, () => {
      this.setState('ROUTE_LOADED');
    });

    if (this.state === 'ROUTE_LOADED') {
      this.statsOverlay.collapseRouteStats();
      this.statsOverlay.showReplayStats();
      this.statsOverlay.expandReplayStats();
      this.ui.moveSlidersToReplayStats(); // Move sliders to the stats panel
    }
  }

  /**
   * Stops the tour sequence and correctly cleans up listeners.
   * @private
   */
  _stopTour() {
    // Remove the camera update listener
    if (this.cameraUpdateListener) {
      this.cameraUpdateListener();
      this.cameraUpdateListener = null;
    }
    
    // Explicitly restore default camera controls by resetting the transform
    this.viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);

    this.viewer.clock.shouldAnimate = false;
    if (this.viewer.clock.startTime) {
      this.viewer.clock.currentTime = this.viewer.clock.startTime.clone();
    }
    this.performanceTuner.deactivate();
    this.tourController.stopTour();
    this.ui.updateScrubber(0);
    this.ui.setPlayPauseButtonState(false);

    // Manually update time displays to the start time
    const startTime = this.viewer.clock.startTime;
    if (startTime) {
      const jsDate = Cesium.JulianDate.toDate(startTime);
      const year = jsDate.getFullYear();
      const month = (jsDate.getMonth() + 1).toString().padStart(2, '0');
      const day = jsDate.getDate().toString().padStart(2, '0');
      const hours = jsDate.getHours().toString().padStart(2, '0');
      const minutes = jsDate.getMinutes().toString().padStart(2, '0');
      const seconds = jsDate.getSeconds().toString().padStart(2, '0');
      const timeString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

      this.ui.updateTimeDisplay(timeString);
      if (this.person.entity && this.person.entity.label) {
        this.person.entity.label.text = timeString;
      }
    }

    // Call cameraController's stop AFTER all other cleanup.
    this.cameraController.stopTour();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  // Initialize and run the application
  const app = new App();
  app.init();
});