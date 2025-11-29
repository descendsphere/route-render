import logger from './Logger.js';
import SpeedController from './SpeedController.js';

class TourController {
  constructor(viewer, person) {
    this.viewer = viewer;
    this.person = person;
    this.tour = null;
    this.speedController = new SpeedController(this.viewer.clock); // New SpeedController instance
    this.cameraStrategy = 'overhead'; // Default strategy
    this.cameraDistance = 1000; // Default distance
    this.cameraPitch = -45; // Default pitch
    this.cameraListeners = {}; // To hold references to listeners
    this.uiTickListener = null; // To hold the UI tick listener
    this.onTick = () => {}; // Callback for UI updates

    this.cameraStrategies = {
      'third-person': this._activateTrackedCamera.bind(this),
      'overhead': this._activateOverheadCamera.bind(this),
    };
  }

  /**
   * Prepares the cinematic tour by setting up the clock and position properties.
   * @param {Array<object>} performanceData - An array of points with lon, lat, ele, and time properties.
   */
  prepareTour(performanceData, routeCenter, maxRouteElevation) {
    logger.info('prepareTour called');
    this.stopTour(); // Stop any existing tour and clear camera settings

    this.routeCenter = routeCenter;
    this.maxRouteElevation = maxRouteElevation;

    const hasNativeTimestamps = performanceData.length > 0 && performanceData[0].time;
    let points = performanceData;

    const personPositionProperty = new Cesium.SampledPositionProperty();
    let startTime = null;
    let stopTime = null;

    // Use a fixed start time for synthetic routes for consistency
    const syntheticBaseTime = Cesium.JulianDate.fromIso8601("2025-01-01T00:00:00Z");

    points.forEach(p => {
      let julianDate;
      if (hasNativeTimestamps) {
        julianDate = Cesium.JulianDate.fromDate(p.time);
      } else {
        // Use projected time in seconds, add it to a consistent base time
        julianDate = Cesium.JulianDate.addSeconds(syntheticBaseTime, p.projectedTime, new Cesium.JulianDate());
      }
      
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
    this.speedController.setRelativeSpeed(this.speedController.currentRelativeSpeed); // Apply current relative speed and direction
    this.viewer.clock.clockRange = Cesium.ClockRange.CLAMPED; // Stops at end
    this.viewer.clock.shouldAnimate = false; // Start paused

    // Zoom the timeline to the GPX data's time range, if it exists
    if (this.viewer.timeline) {
      this.viewer.timeline.zoomTo(startTime, stopTime);
    }

    // Update the Person entity
    this.person.entity.position = personPositionProperty;
    this.person.entity.orientation = new Cesium.VelocityOrientationProperty(personPositionProperty);

    this.tour = {
      points: points, // Store for regeneration
      personPositionProperty: personPositionProperty,
      startTime: startTime,
      stopTime: stopTime,
    };

    // Add a listener to update the UI on each tick
    const onTickListener = () => {
      if (!this.tour) return;
      const totalDuration = Cesium.JulianDate.secondsDifference(this.tour.stopTime, this.tour.startTime);
      const elapsedTime = Cesium.JulianDate.secondsDifference(this.viewer.clock.currentTime, this.tour.startTime);
      const percentage = Math.min(elapsedTime / totalDuration, 1.0);

      const currentTime = this.viewer.clock.currentTime;

      this.onTick({ percentage, currentTime });
    };
    this.viewer.clock.onTick.addEventListener(onTickListener);
    this.uiTickListener = () => this.viewer.clock.onTick.removeEventListener(onTickListener);
  }

  /**
   * Sets up the camera and UI listeners for the tour.
   * @private
   */
  _initializeListeners() {
    this._applyCameraStrategy();

    // Add a listener to update the UI on each tick
    const onTickListener = () => {
      if (!this.tour) return;
      const totalDuration = Cesium.JulianDate.secondsDifference(this.tour.stopTime, this.tour.startTime);
      const elapsedTime = Cesium.JulianDate.secondsDifference(this.viewer.clock.currentTime, this.tour.startTime);
      const percentage = Math.min(elapsedTime / totalDuration, 1.0);

      const currentTime = this.viewer.clock.currentTime;

      this.onTick({ percentage, currentTime });
    };
    this.viewer.clock.onTick.addEventListener(onTickListener);
    this.cameraListeners['ui-tick'] = () => this.viewer.clock.onTick.removeEventListener(onTickListener);
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
    const listener = (clock) => {
      if (!this.tour) return; // Do nothing if no tour is active
      const currentPos = this.person.entity.position.getValue(clock.currentTime);
      if (!Cesium.defined(currentPos)) return;

      const pitch = Cesium.Math.toRadians(this.cameraPitch);
      const heading = this.viewer.camera.heading; // Keep the current heading
      const range = this.cameraDistance;

      this.viewer.camera.lookAt(
        currentPos,
        new Cesium.HeadingPitchRange(heading, pitch, range)
      );
    };

    this.viewer.clock.onTick.addEventListener(listener);
    this.cameraListeners['third-person'] = () => this.viewer.clock.onTick.removeEventListener(listener);
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
      const pitch = Cesium.Math.toRadians(this.cameraPitch);
      const range = this.cameraDistance; // Use the new distance property

      this.viewer.camera.lookAt(
        currentPos,
        new Cesium.HeadingPitchRange(heading, pitch, range)
      );
    };

    this.viewer.scene.postUpdate.addEventListener(listener);
    this.cameraListeners['overhead'] = () => this.viewer.scene.postUpdate.removeEventListener(listener);
  }

  /**
   * Stops the cinematic tour and resets the camera to its default interactive state.
   */
  stopTour() {
    logger.info('Stopping tour and resetting camera.');
    // 1. Stop the clock
    if (this.viewer.clock.shouldAnimate) {
      this.viewer.clock.shouldAnimate = false;
    }
    // 2. Reset the time
    if (this.tour) {
      this.viewer.clock.currentTime = this.tour.startTime.clone();
    }
    // 3. Clean up all tour-related listeners
    if (this.uiTickListener) {
      this.uiTickListener();
      this.uiTickListener = null;
    }
    this._cleanupCamera(); // This already removes camera listeners

    // 4. Explicitly restore default camera control
    this.viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);

    // 5. Reset speed controller direction
    this.speedController.resetDirection();
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
      this.prepareTour(this.tour.points, this.routeCenter, this.maxRouteElevation);
    }
  }

  setCameraStrategy(strategy) {
    if (strategy === this.cameraStrategy && this.viewer.trackedEntity === undefined) return; // Do nothing if strategy is the same and not tracking
    this.cameraStrategy = strategy;
    this._applyCameraStrategy();
  }

  setCameraDistance(distance) {
    this.cameraDistance = distance;
    // The active camera strategy listener will automatically pick up this new value on the next frame.
    // There is no need to re-apply the strategy.
  }

  setCameraPitch(pitch) {
    this.cameraPitch = pitch;
  }

  // --- Custom Controls API ---

  startTour() {
    this._initializeListeners();
    this.viewer.clock.shouldAnimate = true;
  }

  pauseTour() {
    this.viewer.clock.shouldAnimate = false;
  }

  togglePlayPause() {
    this.viewer.clock.shouldAnimate = !this.viewer.clock.shouldAnimate;
    return this.viewer.clock.shouldAnimate;
  }

  getDirection() {
    return this.speedController.getDirection();
  }

  rewind() {
    this.speedController.toggleDirection();
  }

  seek(percentage) {
    if (this.tour) {
      const totalDuration = Cesium.JulianDate.secondsDifference(this.tour.stopTime, this.tour.startTime);
      const newTime = Cesium.JulianDate.addSeconds(this.tour.startTime, totalDuration * percentage, new Cesium.JulianDate());
      this.viewer.clock.currentTime = newTime;
      return newTime;
    }
    return null;
  }
}

export default TourController;
