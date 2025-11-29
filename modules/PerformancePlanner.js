import logger from './Logger.js';

/**
 * A utility class for simulating route completion time based on performance parameters.
 */
class PerformancePlanner {
  /**
   * Creates a planned performance profile for a route.
   * @param {Array<object>} perPointData - The rich per-point data from StatisticsCalculator.
   * @param {number} targetSpeedKmh - The user's target average speed in km/h on flat terrain.
   * @param {number} degradationFactor - The percentage of speed to lose per hour (currently unused, for future enhancement).
   * @param {Array<object>} refuelPoints - An array of points where refueling happens.
   * @param {number} restPerRefuelMin - The duration in minutes to rest at each refuel stop.
   * @returns {object} An object containing totalPlannedTime (in seconds) and the augmented perPointData.
   */
  static planPerformanceProfile(perPointData, targetSpeedKmh, degradationFactor, refuelPoints, restPerRefuelMin) {
    logger.info('Starting performance planning simulation.');
    const SMOOTHING_PERIOD_SAMPLES = 240;
    const smoothingFactor = 2 / (SMOOTHING_PERIOD_SAMPLES + 1);

    if (!perPointData || perPointData.length < 2) {
      return { totalPlannedTime: 0, perPointData: perPointData };
    }

    const targetSpeedMps = (targetSpeedKmh * 1000) / 3600;
    const restPerRefuelSec = restPerRefuelMin * 60;
    const refuelPointIndices = new Set(refuelPoints.map(p => perPointData.findIndex(d => d.cumulativeDistance === p.cumulativeDistance)));

    let cumulativeTimeSec = 0;
    const augmentedData = [];
    
    let emaPlannedSpeed = null;
    let emaPlannedEleRate = null;
    let emaPlannedKmRate = null;

    // Initialize first point
    augmentedData.push({
        ...perPointData[0],
        projectedTime: 0,
        plannedSmoothedSpeed: targetSpeedKmh,
        plannedSmoothedElevationRate: 0,
        plannedSmoothedKmEffortRate: 0,
    });

    for (let i = 1; i < perPointData.length; i++) {
        const p1 = perPointData[i - 1];
        const p2 = perPointData[i];

        const segmentDistance = p2.cumulativeDistance - p1.cumulativeDistance;
        if (segmentDistance <= 0) {
            augmentedData.push({ ...p2, projectedTime: cumulativeTimeSec, plannedSmoothedSpeed: 0, plannedSmoothedElevationRate: 0, plannedSmoothedKmEffortRate: 0 });
            continue;
        }

        const segmentElevationChange = (p2.ele || 0) - (p1.ele || 0);
        const segmentKmEffort = p2.cumulativeKmEffort - p1.cumulativeKmEffort;
        const gradient = segmentElevationChange / segmentDistance;
        
        const gradientFactor = 1 - (gradient * 2.5);
        const adjustedSpeedMps = targetSpeedMps * Math.max(gradientFactor, 0.1);
        const segmentTimeSec = adjustedSpeedMps > 0 ? segmentDistance / adjustedSpeedMps : 0;
        
        let instPlannedEleRate = 0;
        let instPlannedKmRate = 0;
        if (segmentTimeSec > 0) {
            instPlannedEleRate = (segmentElevationChange / segmentTimeSec) * 3600; // m/hr
            instPlannedKmRate = (segmentKmEffort * 3600) / segmentTimeSec; // km-effort/hr
        }
        
        cumulativeTimeSec += segmentTimeSec;

        if (refuelPointIndices.has(i)) {
            cumulativeTimeSec += restPerRefuelSec;
        }
        
        const instPlannedSpeedKmh = adjustedSpeedMps * 3.6;

        if (emaPlannedSpeed === null) {
            emaPlannedSpeed = instPlannedSpeedKmh;
            emaPlannedEleRate = instPlannedEleRate;
            emaPlannedKmRate = instPlannedKmRate;
        } else {
            emaPlannedSpeed = (instPlannedSpeedKmh * smoothingFactor) + (emaPlannedSpeed * (1 - smoothingFactor));
            emaPlannedEleRate = (instPlannedEleRate * smoothingFactor) + (emaPlannedEleRate * (1 - smoothingFactor));
            emaPlannedKmRate = (instPlannedKmRate * smoothingFactor) + (emaPlannedKmRate * (1 - smoothingFactor));
        }

        augmentedData.push({
            ...p2,
            projectedTime: cumulativeTimeSec,
            plannedSmoothedSpeed: emaPlannedSpeed,
            plannedSmoothedElevationRate: emaPlannedEleRate,
            plannedSmoothedKmEffortRate: emaPlannedKmRate,
        });
    }
    
    logger.info(`Finished planning simulation: ${cumulativeTimeSec.toFixed(0)} seconds`);

    return {
      totalPlannedTime: cumulativeTimeSec,
      perPointData: augmentedData,
    };
  }
}

export default PerformancePlanner;
