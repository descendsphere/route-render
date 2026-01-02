import CameraStrategy from './CameraStrategy.js';
import GPXDownsampler from './GPXDownsampler.js';
import RouteSpline from './RouteSpline.js';
import logger from './Logger.js';

/**
 * Implements the cinematic camera strategy.
 * This strategy pre-calculates all camera parameters (HPR) for the entire route
 * based on a sophisticated look-ahead mechanism, resulting in a smooth, stable,
 * and performant playback controlled by `lookAt` commands.
 */
class CinematicCameraStrategy extends CameraStrategy {
  /**
   * @param {Cesium.Viewer} viewer - The Cesium viewer instance.
   * @param {SettingsManager} settingsManager - The application's settings manager.
   */
  constructor(viewer, settingsManager) {
    super(viewer, settingsManager);
    this._hprData = [];
    this._splinePoints = []; // The points sampled from the RouteSpline
    this._tourStartTime = null;
    logger.info('CinematicCameraStrategy initialized.');
  }

  /**
   * Generates the pre-calculated HPR (Heading, Pitch, Range) data for the entire tour.
   * This is the main orchestration method for the cinematic strategy.
   * @param {object} tourData - The full tour data object.
   */
  generateCameraPath(tourData) {
    logger.info('Generating cinematic camera path...');
    const startTime = performance.now();

    if (!tourData || !tourData.perPointData || tourData.perPointData.length < 2) {
      this._hprData = [];
      this._splinePoints = [];
      return;
    }
    this._tourStartTime = tourData.startTime;

    // Normalize the perPointData to have a consistent `time` property in seconds.
    const hasNativeTimestamps = tourData.perPointData[0] && tourData.perPointData[0].time instanceof Date;
    const pointsInSeconds = tourData.perPointData.map(p => {
        let timeInSeconds = 0;
            if (hasNativeTimestamps) {
                timeInSeconds = Cesium.JulianDate.secondsDifference(Cesium.JulianDate.fromDate(p.time), tourData.startTime);
            } else if (p.projectedTime !== undefined) {            timeInSeconds = p.projectedTime;
        }
        return { ...p, time: timeInSeconds };
    });

    const downsampler = new GPXDownsampler({ minDistanceMeters: this._settingsManager.get('cameraPathDetail') });
    const downsampledPoints = downsampler.downsample(pointsInSeconds);
    if (downsampledPoints.length < 2) {
        logger.warn("Downsampled route has too few points for spline generation.");
        return;
    }

    const routeSpline = new RouteSpline(downsampledPoints, { tension: this._settingsManager.get('cameraSplineTension') });

    // The HPR pre-calculation logic is now encapsulated in a private method.
    const { hprData, splinePoints } = this._precalculateHPR(routeSpline, tourData);
    this._hprData = hprData;
    this._splinePoints = splinePoints;

    const duration = performance.now() - startTime;
    logger.info(`Cinematic camera path generated with ${this._hprData.length} HPR data points in ${duration.toFixed(1)} ms.`);
  }

  /**
   * Performs the HPR pre-calculation, including the EMA backward pass for the look-ahead target.
   * @private
   * @param {RouteSpline} routeSpline - The route spline object.
   * @param {object} tourData - The original tour data.
   * @returns {{hprData: Array<object>, splinePoints: Array<object>}}
   */
  _precalculateHPR(routeSpline, tourData) {
    const upcomingDurationSeconds = this._settingsManager.get('cameraLookAheadTime');
    const emaTimeConstantSeconds = this._settingsManager.get('cameraGazeSmoothing');
    const cameraDistance = this._settingsManager.get('cameraDistance');
    const cameraPitchDeg = this._settingsManager.get('cameraPitch');
    const cameraPathSampleDensity = this._settingsManager.get('cameraPathSampleDensity');

    // Invert the 'density' setting to get the interval in seconds
    const sampleIntervalSeconds = 60 / cameraPathSampleDensity;
    const tourStartTime = tourData.startTime;
    const tourEndTime = tourData.stopTime;

    // 1. Sample the spline at regular time intervals
    const splinePoints = [];
    let currentTime = Cesium.JulianDate.clone(tourStartTime);
    while (Cesium.JulianDate.lessThanOrEquals(currentTime, tourEndTime)) {
      const timeSeconds = Cesium.JulianDate.secondsDifference(currentTime, tourStartTime);
      const cartesian = routeSpline.getPointAtTime(timeSeconds);
      if (cartesian) {
        splinePoints.push({ time: timeSeconds, cartesian });
      }
      Cesium.JulianDate.addSeconds(currentTime, sampleIntervalSeconds, currentTime);
    }
    if (splinePoints.length < 2) {
        logger.warn("Not enough spline points generated for HPR calculation.");
        return { hprData: [], splinePoints: [] };
    }

    // 2. Calculate EMA-weighted centers (the look-ahead target) in a backward pass
    const weightedCenters = new Array(splinePoints.length);
    for (let i = splinePoints.length - 1; i >= 0; i--) {
      const currentPointTime = splinePoints[i].time;
      const lookAheadEndTime = currentPointTime + upcomingDurationSeconds;

      let weightedSum = new Cesium.Cartesian3(0, 0, 0);
      let totalWeight = 0;

      for (let j = i; j < splinePoints.length; j++) {
        const futurePointTime = splinePoints[j].time;
        if (futurePointTime <= lookAheadEndTime) {
          const ageSeconds = futurePointTime - currentPointTime;
          const weight = Math.exp(-ageSeconds / emaTimeConstantSeconds);
          totalWeight += weight;
          Cesium.Cartesian3.add(weightedSum, Cesium.Cartesian3.multiplyByScalar(splinePoints[j].cartesian, weight, new Cesium.Cartesian3()), weightedSum);
        } else {
          break;
        }
      }
      weightedCenters[i] = totalWeight > 0 ? Cesium.Cartesian3.divideByScalar(weightedSum, totalWeight, new Cesium.Cartesian3()) : splinePoints[i].cartesian;
    }

    // 3. Calculate final heading for each point
    const hprData = [];
    for (let i = 0; i < splinePoints.length; i++) {
      const currentPos = splinePoints[i].cartesian;
      const targetPos = weightedCenters[i];
      
      let heading = this._calculateHeading(currentPos, targetPos);
      
      // Handle the last point, which has no future to look at
      if (i === splinePoints.length - 1 && i > 0) {
        heading = hprData[i-1].heading; // Reuse previous heading (in radians)
      } else {
        heading = Cesium.Math.toRadians(heading);
      }
      
      hprData.push({
        heading: heading,
        pitch: Cesium.Math.toRadians(cameraPitchDeg),
        range: cameraDistance,
        target: currentPos, // The 'lookAt' target is the point on the spline
      });
    }
    return { hprData, splinePoints };
  }

  /**
   * Calculates the geodetic heading from one point to another.
   * @private
   */
  _calculateHeading(fromCartesian, toCartesian) {
      const fromCartographic = Cesium.Cartographic.fromCartesian(fromCartesian);
      const toCartographic = Cesium.Cartographic.fromCartesian(toCartesian);
      
      const deltaLon = toCartographic.longitude - fromCartographic.longitude;
      
      const y = Math.sin(deltaLon) * Math.cos(toCartographic.latitude);
      const x = Math.cos(fromCartographic.latitude) * Math.sin(toCartographic.latitude) -
                Math.sin(fromCartographic.latitude) * Math.cos(toCartographic.latitude) * Math.cos(deltaLon);
      
      const heading = Math.atan2(y, x);
      let headingDegrees = Cesium.Math.toDegrees(heading);
      return (headingDegrees + 360) % 360;
  }

  /**
   * Gets the interpolated camera state for a given time and returns a `lookAt` command.
   * @param {Cesium.JulianDate} currentTime - The current time of the tour.
   * @returns {object|null} A `{ lookAt: { ... } }' command object, or null.
   */
  getCameraStateAtTime(currentTime) {
    if (this._hprData.length < 2 || !this._tourStartTime) {
      return this._hprData.length === 1 ? { lookAt: this._hprData[0] } : null;
    }

    const elapsedSeconds = Cesium.JulianDate.secondsDifference(currentTime, this._tourStartTime);

    // Find the two HPR data points to interpolate between
    let i = 0;
    while (i < this._splinePoints.length - 2 && this._splinePoints[i + 1].time < elapsedSeconds) {
      i++;
    }
    const iNext = i + 1;

    const hpr1 = this._hprData[i];
    const hpr2 = this._hprData[iNext];
    const time1 = this._splinePoints[i].time;
    const time2 = this._splinePoints[iNext].time;

    const alpha = (time2 - time1 > 0) ? (elapsedSeconds - time1) / (time2 - time1) : 0;

    const heading = this._interpolateHeading(hpr1.heading, hpr2.heading, alpha);
    const pitch = hpr1.pitch; // Pitch is constant
    const range = hpr1.range; // Range is constant
    const target = Cesium.Cartesian3.lerp(hpr1.target, hpr2.target, alpha, new Cesium.Cartesian3());
    const hpr = new Cesium.HeadingPitchRange(heading, pitch, range);

    return {
      lookAt: {
        target: target,
        hpr: hpr
      }
    };
  }

  /**
   * Interpolates heading, correctly handling the wraparound from 359° to 1°.
   * @private
   */
  _interpolateHeading(h1Rad, h2Rad, alpha) {
    let delta = h2Rad - h1Rad;
    if (delta > Math.PI) {
      delta -= 2 * Math.PI;
    } else if (delta < -Math.PI) {
      delta += 2 * Math.PI;
    }
    return h1Rad + delta * alpha;
  }
}

export default CinematicCameraStrategy;
