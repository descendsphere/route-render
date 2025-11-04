import logger from './Logger.js';
import SpeedController from './SpeedController.js';

class TourController {
  constructor(viewer, person) {
    this.viewer = viewer;
    this.person = person;
    this.tour = null;
    this.speedController = new SpeedController(this.viewer.clock); // New SpeedController instance
    this.cameraStrategy = 'overhead'; // Default strategy
    this.cameraListeners = {}; // To hold references to listeners

    this.cameraStrategies = {
      'third-person': this._activateTrackedCamera.bind(this),
      'top-down': this._activateFixedCamera.bind(this),
      'first-person': this._activateFirstPersonCamera.bind(this),
      'overhead': this._activateOverheadCamera.bind(this),
    };
  }

  /**
   * Starts the cinematic tour.
   * @param {Array<object>} points - An array of points with lon, lat, and ele properties.
   */
  startTour(points, routeCenter, maxRouteElevation) {
    logger.info('startTour called');
    this.stopTour(); // Stop any existing tour and clear camera settings

    this.routeCenter = routeCenter;
    this.maxRouteElevation = maxRouteElevation;

    const hasNativeTimestamps = points.length > 0 && points[0].time;
    if (!hasNativeTimestamps) {
      logger.warn('No timestamps found. Synthesizing time data based on constant speed.');
      points = this._synthesizeTimestamps(points);
    }

    const personPositionProperty = new Cesium.SampledPositionProperty();
    let startTime = null;
    let stopTime = null;

    points.forEach(p => {
      const julianDate = Cesium.JulianDate.fromDate(p.time);
      const personCartesian = Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.ele);

      personPositionProperty.addSample(julianDate, personCartesian);

      if (startTime === null || Cesium.JulianDate.lessThan(julianDate, startTime)) {
        startTime = julianDate;
      }
      if (stopTime === null || Cesium.JulianDate.greaterThan(julianDate, stopTime)) {
        stopTime = julianDate;
      }
    });

    if (startTime === null || stopTime === null) {
      logger.error('Cannot start tour: GPX file does not contain any valid timestamps.');
      alert('Cannot start tour: GPX file does not contain any valid timestamps.');
      return;
    }

    // Configure Cesium's clock
    this.viewer.clock.startTime = startTime.clone();
    this.viewer.clock.stopTime = stopTime.clone();
    this.viewer.clock.currentTime = startTime.clone();
    this.speedController.calculateAndSetDefault(startTime, stopTime, 90); // Calculate and set default speed
    this.viewer.clock.clockRange = Cesium.ClockRange.CLAMPED; // Stops at end
    this.viewer.clock.shouldAnimate = false; // Start paused

    // Zoom the timeline to the GPX data's time range
    this.viewer.timeline.zoomTo(startTime, stopTime);

    // Update the Person entity
    this.person.entity.position = personPositionProperty;
    this.person.entity.orientation = new Cesium.VelocityOrientationProperty(personPositionProperty);

    this.tour = {
      points: points, // Store for regeneration
      personPositionProperty: personPositionProperty,
      startTime: startTime,
      stopTime: stopTime,
    };

    this.updateVisuals(); // Set initial visual state
    this._applyCameraStrategy();
  }

  /**
   * Generates synthetic timestamps for a route based on a constant speed.
   * @param {Array<object>} points - The array of points without time data.
   * @returns {Array<object>} A new array of points with a `time` property added.
   * @private
   */
  _synthesizeTimestamps(points) {
    const constantSpeedMetersPerSecond = 5;
    let syntheticTime = Cesium.JulianDate.now();
    let lastPosition = null;

    return points.map(p => {
      const newPoint = { ...p };
      const currentPosition = Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.ele);

      if (lastPosition) {
        const distance = Cesium.Cartesian3.distance(lastPosition, currentPosition);
        const timeElapsed = distance / constantSpeedMetersPerSecond;
        Cesium.JulianDate.addSeconds(syntheticTime, timeElapsed, syntheticTime);
      }

      newPoint.time = Cesium.JulianDate.toDate(syntheticTime);
      lastPosition = currentPosition;
      return newPoint;
    });
  }

  /**
   * Updates the visual state of dynamic entities based on UI controls.
   */
  updateVisuals() {
    // Get clamp to ground state from UI and apply to person
    const clampToGround = document.getElementById('clamp-to-ground').checked;
    if (clampToGround) {
      this.person.entity.billboard.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND;
      this.person.entity.label.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND;
    } else {
      this.person.entity.billboard.heightReference = Cesium.HeightReference.NONE;
      this.person.entity.label.heightReference = Cesium.HeightReference.NONE;
    }
  }

  /**
   * Applies the currently selected camera strategy.
   * @private
   */
  _applyCameraStrategy() {
    // Clear previous camera settings
    this._cleanupCamera();

    if (this.cameraStrategies[this.cameraStrategy]) {
      this.cameraStrategies[this.cameraStrategy]();
    }
  }

  /**
   * Cleans up all camera configurations (listeners, tracked entity).
   * @private
   */
  _cleanupCamera() {
    this.viewer.trackedEntity = undefined;
    this.viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    for (const listenerName in this.cameraListeners) {
      if (this.cameraListeners.hasOwnProperty(listenerName)) {
        this.cameraListeners[listenerName](); // This calls the removal function
        delete this.cameraListeners[listenerName];
      }
    }
  }

  /**
   * Activates the Tracked Entity (Third-Person) camera.
   * @private
   */
  _activateTrackedCamera() {
    this._cleanupCamera();
    this.viewer.trackedEntity = this.person.entity;
    // Zoom to all entities to see the whole route initially
    this.viewer.zoomTo(this.viewer.entities);
  }

  /**
   * Activates the Fixed Position (Top-Down) camera.
   * @private
   */
  _activateFixedCamera() {
    this._cleanupCamera();
    const cameraPosition = Cesium.Cartesian3.fromDegrees(
      Cesium.Math.toDegrees(Cesium.Cartographic.fromCartesian(this.routeCenter).longitude),
      Cesium.Math.toDegrees(Cesium.Cartographic.fromCartesian(this.routeCenter).latitude),
      this.maxRouteElevation + 2000 // 2km above max elevation
    );

    this.viewer.camera.setView({
      destination: cameraPosition,
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-90),
        roll: 0
      }
    });
  }

  /**
   * Activates the First-Person (POV) camera.
   * @private
   */
  _activateFirstPersonCamera() {
    this._cleanupCamera();
    const listener = (clock) => {
      if (!this.tour) return; // Do nothing if no tour is active
      const currentPos = this.person.entity.position.getValue(clock.currentTime);
      const currentOri = this.person.entity.orientation.getValue(clock.currentTime);
      if (!Cesium.defined(currentPos) || !Cesium.defined(currentOri)) return;

      const transform = Cesium.Matrix4.fromRotationTranslation(
        Cesium.Matrix3.fromQuaternion(currentOri),
        currentPos
      );

      // Offset for a clear over-the-shoulder view
      const offset = new Cesium.HeadingPitchRange(
        0, // Straight ahead
        Cesium.Math.toRadians(-25), // Pitch down 25 degrees
        50 // 50 meters away from the person
      );

      this.viewer.camera.lookAtTransform(transform, offset);
    };

    this.viewer.clock.onTick.addEventListener(listener);
    this.cameraListeners['first-person'] = () => this.viewer.clock.onTick.removeEventListener(listener);
  }

  /**
   * Activates the Overhead / Dynamic camera.
   * @private
   */
  _activateOverheadCamera() {
    this._cleanupCamera();
    const listener = () => {
      if (!this.tour) return; // Do nothing if no tour is active
      const currentPos = this.person.entity.position.getValue(this.viewer.clock.currentTime);
      if (!Cesium.defined(currentPos) || !this.tour) return;

      // Calculate tour progress (0.0 to 1.0)
      const tourDuration = Cesium.JulianDate.secondsDifference(this.tour.stopTime, this.tour.startTime);
      const elapsedTime = Cesium.JulianDate.secondsDifference(this.viewer.clock.currentTime, this.tour.startTime);
      const tourProgress = Math.min(elapsedTime / tourDuration, 1.0);

      // Calculate heading to complete one 360-degree rotation over the tour duration
      const heading = Cesium.Math.toRadians(tourProgress * 360);
      const pitch = Cesium.Math.toRadians(-35); // look down at ~35°
      const range = 1000; // stay 1km away

      this.viewer.camera.lookAt(
        currentPos,
        new Cesium.HeadingPitchRange(heading, pitch, range)
      );
    };

    this.viewer.scene.postUpdate.addEventListener(listener);
    this.cameraListeners['overhead'] = () => this.viewer.scene.postUpdate.removeEventListener(listener);
  }

  /**
   * Stops the cinematic tour.
   */
  stopTour() {
    logger.info('Stopping tour.');
    if (this.viewer.clock.shouldAnimate) {
      this.viewer.clock.shouldAnimate = false;
    }
    if (this.tour) {
      this.viewer.clock.currentTime = this.tour.startTime.clone();
    }
    this._cleanupCamera();
  }

  /**
   * Sets the speed of the tour relative to the default speed.
   * @param {number} relativeSpeed - The relative speed multiplier (e.g., 1 for default, 2 for double speed).
   */
  setSpeed(relativeSpeed) {
    this.speedController.setRelativeSpeed(relativeSpeed);
  }

  // Note: setHeading, setPitch, setRoll, setHeight are currently not used by these strategies
  // but are kept for potential future use.
  setHeading(heading) {
    // this.cameraHeading = heading;
  }

  setPitch(pitch) {
    // this.cameraPitch = pitch;
  }

  setRoll(roll) {
    // this.cameraRoll = roll;
  }

  setHeight(height) {
    // this.cameraHeight = height;
  }

  regenerateTour() {
    if (this.tour) {
      this.startTour(this.tour.points, this.routeCenter, this.maxRouteElevation);
    }
  }

  setCameraStrategy(strategy) {
    this.cameraStrategy = strategy;
    this._applyCameraStrategy();
  }
}

export default TourController;
