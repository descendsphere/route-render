import logger from './Logger.js';
import SpeedController from './SpeedController.js';
import SettingsManager from './SettingsManager.js';

class TourController {
  constructor(viewer, person) {
    this.viewer = viewer;
    this.person = person;
    this.tour = null;
    this.speedController = new SpeedController(this.viewer.clock); // New SpeedController instance

    this.uiTickListener = null; // To hold the UI tick listener
    this.onTick = () => {}; // Callback for UI updates
  }

  /**
   * Prepares the cinematic tour by setting up the clock and position properties.
   * @param {object} planProfile - The full tour data object from PerformancePlanner.
   */
  prepareTour(planProfile) {
    logger.info('prepareTour called');
    
    const { perPointData, startTime, stopTime } = planProfile;
    const points = perPointData;
    const hasNativeTimestamps = points.length > 0 && points[0].time;

    if (!startTime || !stopTime) {
      logger.error('Cannot start tour: The plan profile is missing start or stop time.');
      alert('Cannot start tour: The plan profile is missing start or stop time.');
      return;
    }

    const personPositionProperty = new Cesium.SampledPositionProperty();
    const syntheticBaseTime = Cesium.JulianDate.fromIso8601("2025-01-01T00:00:00Z");

    points.forEach(p => {
      let julianDate;
      if (hasNativeTimestamps) {
        julianDate = Cesium.JulianDate.fromDate(p.time);
      } else {
        julianDate = Cesium.JulianDate.addSeconds(syntheticBaseTime, p.projectedTime, new Cesium.JulianDate());
      }
      
      const personCartesian = Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.ele);
      personPositionProperty.addSample(julianDate, personCartesian);
    });

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
   * Stops the cinematic tour and resets the camera to its default interactive state.
   */
  stopTour() {
    logger.info('TourController: Stopping tour. Camera handled by CameraController.');
    // CameraController will now manage stopping the clock, resetting time, and camera cleanup.
    // This method only needs to reset the speed controller's direction.
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
      this.prepareTour(this.tour.points);
    }
  }

  // --- Custom Controls API ---

  startTour() {
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
