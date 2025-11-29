import logger from './Logger.js';

class StatisticsCalculator {
  /**
   * Calculates the total distance and elevation gain of a route.
   * @param {Array<object>} points - An array of points with lon, lat, and ele properties.
   * @returns {object} An object with distance and elevationGain properties.
   */
  static calculate(points) {
    if (!points || points.length < 2) {
      return {
        totalDistance: 0,
        totalElevationGain: 0,
        totalKmEffort: 0,
        perPointData: [],
      };
    }

    const perPointData = [];
    let cumulativeDistance = 0; // in meters
    let cumulativeElevationGain = 0; // in meters
    let cumulativeKmEffort = 0;

    // Initialize first point's data
    perPointData.push({
      ...points[0],
      cumulativeDistance: 0,
      cumulativeElevationGain: 0,
      cumulativeKmEffort: 0,
    });

    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];

      // Calculate segment distance
      const carto1 = Cesium.Cartographic.fromDegrees(p1.lon, p1.lat);
      const carto2 = Cesium.Cartographic.fromDegrees(p2.lon, p2.lat);
      const ellipsoidGeodesic = new Cesium.EllipsoidGeodesic(carto1, carto2);
      const segmentDistanceMeters = ellipsoidGeodesic.surfaceDistance;
      cumulativeDistance += segmentDistanceMeters;

      // Calculate segment elevation gain/loss
      const ele1 = p1.ele || 0;
      const ele2 = p2.ele || 0;
      let segmentAscent = 0;
      if (ele2 > ele1) {
        segmentAscent = ele2 - ele1;
        cumulativeElevationGain += segmentAscent;
      }

      // Calculate Km-effort for the segment
      const segmentKmEffort = (segmentDistanceMeters / 1000) + (segmentAscent / 100);
      cumulativeKmEffort += segmentKmEffort;

      perPointData.push({
        ...points[i],
        cumulativeDistance: cumulativeDistance,
        cumulativeElevationGain: cumulativeElevationGain,
        cumulativeKmEffort: cumulativeKmEffort,
      });
    }

    const totalDistanceKm = cumulativeDistance / 1000;

    logger.info(`Calculated statistics: Total Distance=${totalDistanceKm.toFixed(2)}km, Total Elevation Gain=${cumulativeElevationGain.toFixed(2)}m, Total Km-effort=${cumulativeKmEffort.toFixed(2)}`);

    return {
      totalDistance: totalDistanceKm.toFixed(2), // in km
      totalElevationGain: cumulativeElevationGain.toFixed(2), // in meters
      totalKmEffort: cumulativeKmEffort.toFixed(2), // km-effort
      perPointData: perPointData, // Rich data for each point
    };
  }

  /**
   * Analyzes the recorded performance of a route if timestamps are available.
   * @param {Array<object>} perPointData - The rich per-point data from calculate.
   * @returns {object} An object with overall average metrics and augmented per-point data with actual speed.
   */
  static analyzePerformance(perPointData) {
    const SMOOTHING_PERIOD_SAMPLES = 240;
    const smoothingFactor = 2 / (SMOOTHING_PERIOD_SAMPLES + 1);

    if (!perPointData || perPointData.length < 2 || !perPointData[0].time) {
      return {
        overallAverageSpeed: null,
        overallAverageAscentRate: null,
        totalDurationString: "00:00:00",
        augmentedPerPointData: perPointData,
      };
    }

    const startTime = perPointData[0].time;
    const endTime = perPointData[perPointData.length - 1].time;
    const totalTimeSeconds = (endTime.getTime() - startTime.getTime()) / 1000;
    const totalTimeHours = totalTimeSeconds / 3600;

    const totalDistanceKm = perPointData[perPointData.length - 1].cumulativeDistance / 1000;
    const totalElevationGainMeters = perPointData[perPointData.length - 1].cumulativeElevationGain;

    const overallAverageSpeed = totalTimeHours > 0 ? totalDistanceKm / totalTimeHours : 0;
    const overallAverageAscentRate = totalTimeHours > 0 ? totalElevationGainMeters / totalTimeHours : 0;

    let emaSpeed = null;
    let emaEleRate = null;
    let emaKmRate = null;

    const augmentedPerPointData = perPointData.map((point, i) => {
        if (i === 0) {
            return {
                ...point,
                actualSmoothedSpeedKmh: 0,
                actualSmoothedElevationRate: 0,
                actualSmoothedKmEffortRate: 0,
            };
        }

        const p1 = perPointData[i - 1];
        const p2 = point;

        // 1. Calculate instantaneous values for the current segment
        const segmentTimeHours = (p2.time.getTime() - p1.time.getTime()) / (1000 * 3600);
        const segmentDistKm = (p2.cumulativeDistance - p1.cumulativeDistance) / 1000;
        const segmentEleGain = (p2.ele || 0) - (p1.ele || 0);
        const segmentKmEffort = p2.cumulativeKmEffort - p1.cumulativeKmEffort;

        let instSpeed = 0, instEleRate = 0, instKmRate = 0;
        if (segmentTimeHours > 0) {
            instSpeed = segmentDistKm / segmentTimeHours;
            instEleRate = segmentEleGain / segmentTimeHours;
            instKmRate = segmentKmEffort / segmentTimeHours;
        }

        // 2. Apply EMA formula
        if (emaSpeed === null) { // First valid segment, prime the EMA
            emaSpeed = instSpeed;
            emaEleRate = instEleRate;
            emaKmRate = instKmRate;
        } else {
            emaSpeed = (instSpeed * smoothingFactor) + (emaSpeed * (1 - smoothingFactor));
            emaEleRate = (instEleRate * smoothingFactor) + (emaEleRate * (1 - smoothingFactor));
            emaKmRate = (instKmRate * smoothingFactor) + (emaKmRate * (1 - smoothingFactor));
        }

        return {
            ...point,
            actualSmoothedSpeedKmh: emaSpeed,
            actualSmoothedElevationRate: emaEleRate,
            actualSmoothedKmEffortRate: emaKmRate,
        };
    });

    logger.info(`Performance Analysis: Avg Speed=${overallAverageSpeed.toFixed(2)}km/h, Avg Ascent Rate=${overallAverageAscentRate.toFixed(2)}m/h`);

    return {
      overallAverageSpeed: overallAverageSpeed.toFixed(2),
      overallAverageAscentRate: overallAverageAscentRate.toFixed(2),
      augmentedPerPointData: augmentedPerPointData,
      totalDurationString: StatisticsCalculator.getDurationString(totalTimeSeconds),
    };
  }

  static getDurationString(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}

export default StatisticsCalculator;
