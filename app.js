import logger from './modules/Logger.js';
import TourController from './modules/TourController.js';
import StatisticsCalculator from './modules/StatisticsCalculator.js';
import PoiService from './modules/PoiService.js';
import ReverseGeocodingService from './modules/ReverseGeocodingService.js';
import Person from './modules/Person.js';

class App {
  constructor() {
    this.viewer = null;
    this.gpxFile = null;
    this.tourController = null;
    this.currentPoints = [];
    this.routeEntity = null;
    this.person = null;
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
    this.initUI();
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
   * Initializes the user interface and event listeners.
   */
  initUI() {
    logger.info('Initializing UI.');
    const gpxFileInput = document.getElementById('gpx-file');
    gpxFileInput.addEventListener('change', (event) => this.handleFileSelect(event));

    const playButton = document.getElementById('play-tour');
    playButton.addEventListener('click', () => this.startTour());

    const pauseButton = document.getElementById('pause-tour');
    pauseButton.addEventListener('click', () => this.tourController.stopTour());

    const stopButton = document.getElementById('stop-tour');
    stopButton.addEventListener('click', () => this.tourController.stopTour());

    const speedSlider = document.getElementById('tour-speed');
    speedSlider.addEventListener('input', (event) => this.tourController.setSpeed(event.target.value));

    const zoomToRouteButton = document.getElementById('zoom-to-route');
    zoomToRouteButton.addEventListener('click', () => this.zoomToRoute());

    const cameraHeadingInput = document.getElementById('camera-heading');
    cameraHeadingInput.addEventListener('input', (event) => this.tourController.setHeading(parseFloat(event.target.value)));

    const cameraPitchInput = document.getElementById('camera-pitch');
    cameraPitchInput.addEventListener('input', (event) => this.tourController.setPitch(parseFloat(event.target.value)));

    const cameraRollInput = document.getElementById('camera-roll');
    cameraRollInput.addEventListener('input', (event) => this.tourController.setRoll(parseFloat(event.target.value)));

    const cameraHeightInput = document.getElementById('camera-height');
    cameraHeightInput.addEventListener('input', (event) => this.tourController.setHeight(parseFloat(event.target.value)));

    const routeColorInput = document.getElementById('route-color');
    routeColorInput.addEventListener('input', (event) => this.updateRouteColor(event.target.value));

    const routeWidthInput = document.getElementById('route-width');
    routeWidthInput.addEventListener('input', (event) => this.updateRouteWidth(event.target.value));

    const cameraStrategyInput = document.getElementById('camera-strategy');
    cameraStrategyInput.addEventListener('change', (event) => this.tourController.setCameraStrategy(event.target.value));
  }

  /**
   * Updates the color of the route polyline.
   * @param {string} color - The new color in hex format.
   */
  updateRouteColor(color) {
    if (this.routeEntity) {
      this.routeEntity.polyline.material = Cesium.Color.fromCssColorString(color);
    }
  }

  /**
   * Updates the width of the route polyline.
   * @param {number} width - The new width in pixels.
   */
  updateRouteWidth(width) {
    if (this.routeEntity) {
      this.routeEntity.polyline.width = parseInt(width, 10);
    }
  }

  /**
   * Starts the cinematic tour.
   */
  startTour() {
    if (this.currentPoints.length > 0) {
      this.tourController.startTour(this.currentPoints, this.routeCenter, this.maxRouteElevation);
    } else {
      logger.warn('No route points available to start the tour.');
    }
  }

  /**
   * Handles the selection of a GPX file.
   * @param {Event} event - The file input change event.
   */
  handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) {
      logger.warn('No file selected.');
      return;
    }

    logger.info(`Selected file: ${file.name}`);
    this.gpxFile = file;
    this.showLoadingIndicator();
    this.parseAndRenderGpx();
  }

  /**
   * Shows the loading indicator.
   */
  showLoadingIndicator() {
    document.getElementById('loading-indicator').style.display = 'block';
  }

  /**
   * Hides the loading indicator.
   */
  hideLoadingIndicator() {
    document.getElementById('loading-indicator').style.display = 'none';
  }

  /**
   * Parses and renders the selected GPX file.
   */
  parseAndRenderGpx() {
    const reader = new FileReader();
    reader.onload = (e) => {
      const gpxData = e.target.result;
      const gpx = new gpxParser();//GPXParser(gpxData);
      gpx.parse(gpxData);

      if (!gpx.tracks.length) {
        logger.error('No tracks found in the GPX file.');
        alert('Error: No tracks found in the GPX file.');
        return;
      }

      this.renderGpx(gpx);
      this.hideLoadingIndicator();
    };
    reader.onerror = (e) => {
        logger.error('Error reading file:', e);
        alert('Error reading file.');
        this.hideLoadingIndicator();
    }
    reader.readAsText(this.gpxFile);
  }

  /**
   * Renders the parsed GPX data on the Cesium map.
   * @param {object} gpx - The parsed GPX data from gpx-parser-builder.
   */
  renderGpx(gpx) {
    const track = gpx.tracks[0];
    const points = track.points.map(p => ({ lon: p.lon, lat: p.lat, ele: p.ele }));

    // Render waypoints
    if (gpx.waypoints && gpx.waypoints.length > 0) {
      logger.info(`Found ${gpx.waypoints.length} waypoints.`);
      gpx.waypoints.forEach(wpt => {
        this.viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(wpt.lon, wpt.lat, wpt.ele + 50 || 0),
          description: wpt.name,
          billboard: {
            image: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          },
          label: {
            text: wpt.name,
            font: '14pt sans-serif',
            verticalOrigin: Cesium.VerticalOrigin.TOP,
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
    const positions = Cesium.Cartesian3.fromDegreesArrayHeights(
      points.flatMap(p => [p.lon, p.lat, p.ele])
    );

    this.routeEntity = this.viewer.entities.add({
      polyline: {
        positions: positions,
        width: 5,
        material: Cesium.Color.RED,
        depthFailMaterial: new Cesium.PolylineOutlineMaterialProperty({
          color: Cesium.Color.RED,
          outlineWidth: 2,
          outlineColor: Cesium.Color.RED,
        }),
        clampToGround: false, // Set to false to use the provided heights
      },
    });

    const boundingSphere = new Cesium.BoundingSphere.fromPoints(positions);
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
    const tourControls = document.getElementById('tour-controls');
    tourControls.style.display = 'block';

    // Calculate and display statistics
    const stats = StatisticsCalculator.calculate(points);
    const statsContent = document.getElementById('stats-content');
    statsContent.innerHTML = `
      <p>Distance: ${stats.distance} km</p>
      <p>Elevation Gain: ${stats.elevationGain} m</p>
    `;
    const routeStats = document.getElementById('route-stats');
    routeStats.style.display = 'block';

    const styleControls = document.getElementById('style-controls');
    styleControls.style.display = 'block';

    const cameraStrategyControls = document.getElementById('camera-strategy-controls');
    cameraStrategyControls.style.display = 'block';

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

    const filenameContent = document.getElementById('filename-content');
    filenameContent.textContent = filename;

    const filenameSuggestion = document.getElementById('filename-suggestion');
    filenameSuggestion.style.display = 'block';
  }

  /**
   * Fetches and renders points of interest near the route.
   * @param {Array<object>} points - An array of points with lon and lat properties.
   */
  async fetchAndRenderPois(points) {
    const pois = await PoiService.fetchPois(points);
    pois.forEach(poi => {
      this.viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(poi.lon, poi.lat, 200),
        description: poi.name,
        billboard: {
          image: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
          color: Cesium.Color.BLUE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
        label: {
          text: poi.name,
          font: '12pt sans-serif',
          verticalOrigin: Cesium.VerticalOrigin.TOP,
        },
      });
    });
    this.hideLoadingIndicator();
  }

  /**
   * Enriches 2D points with elevation data and then renders the route.
   * @param {Array<object>} points - An array of points with lon and lat properties.
   */
  async enrichAndRenderRoute(points) {
    this.showLoadingIndicator();
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
        this.renderRoute(enrichedPoints);

    } catch (error) {
        logger.error('Error during terrain sampling:', error);
    }
  }

  /**
   * Zooms the camera to the full extent of the route.
   */
  zoomToRoute() {
    if (this.routeEntity) {
      this.viewer.zoomTo(this.routeEntity);
    }
  }
}

// Initialize and run the application
const app = new App();
app.init();
