import logger from './Logger.js';

class TourController {
  constructor(viewer, person) {
    this.viewer = viewer;
    this.person = person;
    this.tour = null;
    this.animationRequest = null;
    this.startTime = null;
    this.tourSpeed = 5; // Default speed
    this.cameraHeading = 0;
    this.cameraPitch = -45;
    this.cameraRoll = 0;
    this.cameraHeight = 200;
    this.cameraStrategy = 'top-down'; // Default strategy
    this.fixedTopDownCameraPosition = null;

    // Bind the animate method to the class instance
    this.animate = this.animate.bind(this);
  }

  /**
   * Starts the cinematic tour.
   * @param {Array<object>} points - An array of points with lon, lat, and ele properties.
   */
  startTour(points, routeCenter, maxRouteElevation) {
    logger.info('startTour called');
    this.stopTour(); // Stop any existing tour

    this.routeCenter = routeCenter;
    this.maxRouteElevation = maxRouteElevation;

    const positions = Cesium.Cartesian3.fromDegreesArrayHeights(
      points.flatMap(p => [p.lon, p.lat, p.ele]) // Original GPX points for person
    );

    const personSpline = new Cesium.CatmullRomSpline({
      times: Array.from({ length: positions.length }, (_, i) => i),
      points: positions,
    });

    const cameraPositions = Cesium.Cartesian3.fromDegreesArrayHeights(
      points.flatMap(p => [p.lon, p.lat, p.ele + this.cameraHeight]) // Elevated path for camera
    );

    const cameraSpline = new Cesium.CatmullRomSpline({
      times: Array.from({ length: cameraPositions.length }, (_, i) => i),
      points: cameraPositions,
    });

    logger.info('Generating camera track...');
    const cameraTrack = this.generateCameraTrack(cameraSpline, cameraPositions.length);
    logger.info('Camera track generated.');

    this.tour = {
      points: points, // Store for regeneration
      personSpline: personSpline,
      cameraSpline: cameraSpline,
      duration: cameraTrack.length * (1 / this.tourSpeed) / 10,
      cameraTrack: cameraTrack,
    };

    document.getElementById('camera-info').style.display = 'block';
    this.startTime = performance.now();
    this.animationRequest = window.requestAnimationFrame(this.animate);
  }

  /**
   * Generates a pre-calculated camera track.
   * @param {Cesium.CatmullRomSpline} spline - The spline for the camera path.
   * @param {number} numPoints - The number of points in the spline.
   * @returns {Array<object>} An array of camera states.
   */
  generateCameraTrack(spline, numPoints) {
    const cameraTrack = [];
    const numSteps = numPoints * 10; // Increase for smoother animation

    for (let i = 0; i < numSteps; i++) {
      const time = i / (numSteps - 1) * (numPoints - 1);
      const position = spline.evaluate(time);
      const nextPosition = spline.evaluate(time + 0.01);

      const direction = Cesium.Cartesian3.normalize(
        Cesium.Cartesian3.subtract(nextPosition, position, new Cesium.Cartesian3()),
        new Cesium.Cartesian3()
      );

      const heading = Math.atan2(direction.y, direction.x) - Cesium.Math.PI_OVER_TWO + Cesium.Math.toRadians(this.cameraHeading);
      const pitch = Cesium.Math.toRadians(this.cameraPitch);
      const roll = Cesium.Math.toRadians(this.cameraRoll);

      cameraTrack.push({
        position: position,
        orientation: {
          heading: heading,
          pitch: pitch,
          roll: roll,
        },
      });
    }
    return cameraTrack;
  }

  /**
   * The main animation loop for the tour.
   * @param {number} timestamp - The current time from requestAnimationFrame.
   */
  animate(timestamp) {
    if (!this.tour) return;

    const elapsedTime = (timestamp - this.startTime) / 1000; // in seconds
    const time = (elapsedTime % this.tour.duration) / this.tour.duration;
    const trackIndex = Math.floor(time * (this.tour.cameraTrack.length - 1));

    logger.debug(`elapsedTime: ${elapsedTime}, time: ${time}, trackIndex: ${trackIndex}`);

    const personPosition = this.tour.personSpline.evaluate(time * (this.tour.personSpline.points.length - 1));
    logger.info(`personPosition: ${personPosition}`);
    this.person.updatePosition(personPosition);

    const cameraState = this.tour.cameraTrack[trackIndex];

    if (this.cameraStrategy === 'top-down') {
      // Calculate fixed camera position once when tour starts
      if (!this.fixedTopDownCameraPosition) {
        this.fixedTopDownCameraPosition = Cesium.Cartesian3.fromDegrees(
          Cesium.Math.toDegrees(Cesium.Cartographic.fromCartesian(this.routeCenter).longitude),
          Cesium.Math.toDegrees(Cesium.Cartographic.fromCartesian(this.routeCenter).latitude),
          this.maxRouteElevation * 20 + 500 // 2 times max elevation + some offset
        );
        //this.viewer.camera.flyTo({
        //    destination: this.fixedTopDownCameraPosition
        //});
        this.viewer.zoomTo(this.fixedTopDownCameraPosition);
      }
      //this.viewer.camera.position = this.fixedTopDownCameraPosition;
      //this.viewer.camera.lookAt(this.person.entity.position.getValue(this.viewer.clock.currentTime), Cesium.Cartesian3.UNIT_Z);
      //this.viewer.camera.lookAt(personPosition, Cesium.Cartesian3.UNIT_Z);

      var transform = Cesium.Transforms.eastNorthUpToFixedFrame(personPosition);
      this.viewer.scene.camera.lookAtTransform(transform, new Cesium.HeadingPitchRange(0, -Math.PI/8, 2900));

    } else if (this.cameraStrategy === 'third-person') {
      this.viewer.camera.setView({
        destination: cameraState.position,
        orientation: cameraState.orientation,
      });
    }

    // Update camera info display
    const cameraInfoContent = document.getElementById('camera-info-content');
    cameraInfoContent.innerHTML = `
      <p>Heading: ${Cesium.Math.toDegrees(cameraState.orientation.heading).toFixed(2)}</p>
      <p>Pitch: ${Cesium.Math.toDegrees(cameraState.orientation.pitch).toFixed(2)}</p>
      <p>Roll: ${Cesium.Math.toDegrees(cameraState.orientation.roll).toFixed(2)}</p>
      <p>Height: ${this.cameraHeight} m</p>
    `;

    this.animationRequest = window.requestAnimationFrame(this.animate);
  }

  /**
   * Stops the cinematic tour.
   */
  stopTour() {
    logger.info('Stopping tour.');
    if (this.animationRequest) {
      window.cancelAnimationFrame(this.animationRequest);
      this.animationRequest = null;
      this.tour = null;
      this.fixedTopDownCameraPosition = null;
    }
  }

  /**
   * Sets the speed of the tour.
   * @param {number} speed - The tour speed (1-10).
   */
  setSpeed(speed) {
    this.tourSpeed = speed;
    logger.info(`Tour speed set to: ${speed}`);
  }

  setHeading(heading) {
    this.cameraHeading = heading;
    this.regenerateTour();
  }

  setPitch(pitch) {
    this.cameraPitch = pitch;
    this.regenerateTour();
  }

  setRoll(roll) {
    this.cameraRoll = roll;
    this.regenerateTour();
  }

  setHeight(height) {
    this.cameraHeight = height;
    this.regenerateTour();
  }

  regenerateTour() {
    if (this.tour) {
      this.fixedTopDownCameraPosition = null;
      this.startTour(this.tour.points, this.routeCenter, this.maxRouteElevation);
    }
  }

  setCameraStrategy(strategy) {
    this.cameraStrategy = strategy;
    this.regenerateTour();
  }
}

export default TourController;
