import logger from './modules/Logger.js';
import TourController from './modules/TourController.js';
import StatisticsCalculator from './modules/StatisticsCalculator.js';
import PoiService from './modules/PoiService.js';
import ReverseGeocodingService from './modules/ReverseGeocodingService.js';
import Person from './modules/Person.js';
import UIManager from './modules/UIManager.js'; // New import

class App {
  constructor() {
    this.viewer = null;
    this.gpxFile = null;
    this.tourController = null;
    this.currentPoints = [];
    this.routeEntity = null;
    this.person = null;
    this.ui = null; // New UIManager instance
  }

  /**
   * Initializes the application.
   */
  init() {
    window.addEventListener('unhandledrejection', (event) => {
      logger.error('Unhandled rejection:', event.reason);
      alert('An unexpected error occurred. Please check the console for details.');
    });

    logger.info('Initializing application.');
    this.initCesium();
    this.person = new Person(this.viewer);
    this.person.create();
    this.tourController = new TourController(this.viewer, this.person);
    this.ui = new UIManager(this.viewer); // Initialize UIManager

    // Set up UI callbacks
    this.ui.onFileSelected = (file) => this.handleFileSelect(file);
    this.ui.onPlayTour = () => this.handlePlayTour();
    this.ui.onStopTour = () => this.tourController.stopTour();
    this.ui.onZoomToRoute = () => this.zoomToRoute();
    this.ui.onResetStyle = () => this.handleResetStyle(); // New callback
    this.ui.onSetSpeed = (relativeSpeed) => this.tourController.setSpeed(relativeSpeed);
    this.ui.onUpdateRouteColor = () => this.updateRouteStyle();
    this.ui.onUpdateRouteWidth = () => this.updateRouteStyle();
    this.ui.onSetCameraStrategy = (strategy) => this.tourController.setCameraStrategy(strategy);
    this.ui.onUpdatePersonStyle = (style) => this.person.updateStyle(style);
    this.ui.onToggleClampToGround = () => {
      if (this.currentPoints.length > 0) {
        this.updateRouteStyle();
        this.tourController.updateVisuals();
      }
    };

    this.ui.init(); // Initialize UI event listeners

    // Add a listener to update the person label with the current time
    this.viewer.scene.postRender.addEventListener(() => {
      if (this.tourController.tour && this.viewer.clock.shouldAnimate) {
        const currentTime = this.viewer.clock.currentTime;
        const timeString = Cesium.JulianDate.toIso8601(currentTime, 2).replace('T', ' ').replace('Z', '');
        if (this.person.entity && this.person.entity.label) {
          this.person.entity.label.text = timeString;
        }
      }
    });
  }

  /**
   * Initializes the Cesium viewer.
   */
  initCesium() {
    logger.info('Initializing Cesium viewer.');
    // Note: Using a default access token for Cesium Ion. For a production app, you should create your own token.
    Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlMzUyZmE4NC01NGViLTQ0YWYtOGFhOS00ZDI0ZjcyZGZiYTgiLCJpZCI6MzU1Mzk4LCJpYXQiOjE3NjE4MDMyMjF9.qjUg_rgsOuIkiCVKsahiTpfRzUqccBPp6M_KkDKVz2o';

    this.viewer = new Cesium.Viewer('cesiumContainer', {
      terrain: Cesium.Terrain.fromWorldTerrain(),
      //terrainProvider: Cesium.createWorldTerrain(),
      contextOptions: {
        webgl: {
		  willReadFrequently: true
        }
      },
    });
    this.viewer.camera.flyTo({
      destination : Cesium.Cartesian3.fromDegrees(114.109, 22.0, 90000),
      orientation : {
        heading : Cesium.Math.toRadians(0.0),
        pitch : Cesium.Math.toRadians(-70.0),
      }
    });
  }

  /**
   * Handles the play tour action from the UI.
   */
  handlePlayTour() {
    if (this.currentPoints.length > 0) {
      this.tourController.startTour(this.currentPoints, this.routeCenter, this.maxRouteElevation);
      this.viewer.clock.shouldAnimate = true;
    } else {
      logger.warn('No route points available to start the tour.');
    }
  }

  /**
   * Handles the selection of a GPX file.
   * @param {File} file - The selected GPX file.
   */
  handleFileSelect(file) {
    this.clearRoute(); // Clear previous route before loading a new one

    if (!file) {
      logger.warn('No file selected.');
      return;
    }

    logger.info(`Selected file: ${file.name}`);
    this.gpxFile = file;
    this.ui.showLoadingIndicator();
    this.parseAndRenderGpx();
  }

  /**
   * Clears the currently loaded route and all associated data.
   */
  clearRoute() {
    logger.info('Clearing current route.');
    this.tourController.stopTour();

    if (this.routeEntity) {
      this.viewer.entities.remove(this.routeEntity);
      this.routeEntity = null;
    }

    // Remove all entities that have our custom gpxEntity flag
    const entitiesToRemove = this.viewer.entities.values.filter(entity => entity.gpxEntity);
    entitiesToRemove.forEach(entity => this.viewer.entities.remove(entity));

    this.currentPoints = [];

    // Hide UI elements
    this.ui.hideTourControls();
    this.ui.hideRouteStats();
    this.ui.hideStyleControls();
    this.ui.hideCameraStrategyControls();
    this.ui.hideFilenameSuggestion();
    this.ui.hideCameraInfo();
  }

  /**
   * Parses and renders the selected GPX file.
   */
  parseAndRenderGpx() {
    const reader = new FileReader();
    reader.onload = (e) => {
      const gpxData = e.target.result;
      const gpx = new gpxParser();
      gpx.parse(gpxData);

      if (!gpx.tracks.length) {
        logger.error('No tracks found in the GPX file.');
        alert('Error: No tracks found in the GPX file.');
        return;
      }

      this.renderGpx(gpx);
      this.ui.hideLoadingIndicator();
    };
    reader.onerror = (e) => {
        logger.error('Error reading file:', e);
        alert('Error reading file.');
        this.ui.hideLoadingIndicator();
    }
    reader.readAsText(this.gpxFile);
  }

  /**
   * Renders the parsed GPX data on the Cesium map.
   * @param {object} gpx - The parsed GPX data from gpx-parser-builder.
   */
  renderGpx(gpx) {
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

    // Check if the GPX file has elevation data.
    const hasElevation = points.every(p => p.ele !== undefined && p.ele !== null);

    if (hasElevation) {
      logger.info('GPX file has elevation data.');
      this.renderRoute(points);
    } else {
      logger.warn('GPX file does not have elevation data. Automatic enrichment is required.');
      alert('This GPX file does not have elevation data. We will now fetch it automatically. This may take a moment.');
      this.enrichAndRenderRoute(points);
    }
  }

  /**
   * Renders the route on the map from 3D points.
   * @param {Array<object>} points - An array of points with lon, lat, and ele properties.
   */
  renderRoute(points) {
    this.currentPoints = points;
    this.updateRouteStyle(); // Draw the route polyline

    // --- One-time operations after initial rendering ---

    const positions = this.routeEntity.polyline.positions.getValue();
    const boundingSphere = Cesium.BoundingSphere.fromPoints(positions);
    this.routeCenter = boundingSphere.center;
    logger.info('routeCenter:' + this.routeCenter);

    // Calculate max elevation for top-down camera
    let maxElevation = 0;
    points.forEach(p => {
      if (p.ele > maxElevation) maxElevation = p.ele;
    });
    this.maxRouteElevation = maxElevation;

    this.viewer.zoomTo(this.routeEntity);
    logger.info('Route rendered successfully.');

    // Show the tour controls
    this.ui.showTourControls();

    // Calculate and display statistics
    const stats = StatisticsCalculator.calculate(points);
    this.ui.updateStatsContent(stats);
    this.ui.showRouteStats();

    // Show style controls
    this.ui.showStyleControls();

    // Show camera strategy controls
    this.ui.showCameraStrategyControls();

    this.fetchAndRenderPois(points);
    this.generateAndDisplayFilename(points);
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
    this.ui.showFilenameSuggestion();
  }

  /**
   * Fetches and renders points of interest near the route.
   * @param {Array<object>} points - An array of points with lon and lat properties.
   */
  async fetchAndRenderPois(points) {
    const pois = await PoiService.fetchPois(points);
    pois.forEach(poi => {
      this.viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(poi.lon, poi.lat, 300),
        description: poi.name,
        gpxEntity: true, // Flag for cleanup
        billboard: {
          image: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
          color: Cesium.Color.BLUE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          clampToGround: true,
        },
        label: {
          text: poi.name,
          font: '12pt sans-serif',
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -50),
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
      });
    });
    this.ui.hideLoadingIndicator();
  }

  /**
   * Enriches 2D points with elevation data and then renders the route.
   * @param {Array<object>} points - An array of points with lon and lat properties.
   */
  async enrichAndRenderRoute(points) {
    this.ui.showLoadingIndicator();
    const positions2D = Cesium.Cartesian3.fromDegreesArray(
        points.flatMap(p => [p.lon, p.lat])
    );

	try {
		const updatedPositions = await Cesium.sampleTerrainMostDetailed(this.viewer.terrainProvider, positions2D);
		const enrichedPoints = updatedPositions.map((position, i) => {
			const cartographic = Cesium.Cartographic.fromCartesian(position);
			return {
				lon: Cesium.Math.toDegrees(cartographic.longitude),
				lat: Cesium.Math.toDegrees(cartographic.latitude),
				ele: cartographic.height,
			};
		});

		logger.info('Elevation data enriched successfully.');
		this.renderGpx(enrichedPoints);

	} catch (error) {
		logger.error('Error during terrain sampling:', error);
		this.ui.hideLoadingIndicator();
	}  }

  /**
   * Updates only the style of the route polyline (color, width, clamp).
   */
  updateRouteStyle() {
    // Remove existing route entity if it exists
    if (this.routeEntity) {
      this.viewer.entities.remove(this.routeEntity);
    }

    const clampToGround = document.getElementById('clamp-to-ground').checked;
    const color = document.getElementById('route-color').value;
    const width = parseInt(document.getElementById('route-width').value, 10);

    const polylineOptions = {
      width: width,
      material: Cesium.Color.fromCssColorString(color),
      depthFailMaterial: new Cesium.PolylineOutlineMaterialProperty({
        color: Cesium.Color.fromCssColorString(color),
        outlineWidth: 2,
        outlineColor: Cesium.Color.fromCssColorString(color),
      }),
    };

    if (clampToGround) {
      polylineOptions.positions = Cesium.Cartesian3.fromDegreesArray(
        this.currentPoints.flatMap(p => [p.lon, p.lat])
      );
      polylineOptions.clampToGround = true;
    } else {
      polylineOptions.positions = Cesium.Cartesian3.fromDegreesArrayHeights(
        this.currentPoints.flatMap(p => [p.lon, p.lat, p.ele])
      );
      polylineOptions.clampToGround = false;
    }

    this.routeEntity = this.viewer.entities.add({
      polyline: polylineOptions,
    });
  }

  /**
   * Zooms the camera to the full extent of the route.
   */
  zoomToRoute() {
    if (this.routeEntity) {
      this.viewer.zoomTo(this.routeEntity);
    }
  }

  /**
   * Resets all style and camera controls to their default values.
   */
  handleResetStyle() {
    logger.info('Resetting styles to default.');

    // Reset UI controls to their default values
    this.ui.routeColorInput.value = '#FFA500';
    this.ui.routeWidthInput.value = 2;
    this.ui.clampToGroundInput.checked = true;
    this.ui.personColorInput.value = '#FFA500';
    this.ui.personSizeInput.value = 1;
    this.ui.cameraStrategyInput.value = 'overhead';
    this.ui.speedSlider.value = 1;

    // Programmatically trigger events to apply the changes
    this.ui.routeColorInput.dispatchEvent(new Event('input'));
    this.ui.routeWidthInput.dispatchEvent(new Event('input'));
    this.ui.clampToGroundInput.dispatchEvent(new Event('change'));
    this.ui.personColorInput.dispatchEvent(new Event('input'));
    this.ui.personSizeInput.dispatchEvent(new Event('input'));
    this.ui.cameraStrategyInput.dispatchEvent(new Event('change'));
    this.ui.speedSlider.dispatchEvent(new Event('input'));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  // Initialize and run the application
  const app = new App();
  app.init();
});
