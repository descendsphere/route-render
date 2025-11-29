import logger from './Logger.js';

/**
 * A utility class for calculating energy expenditure and related metrics for a route.
 */
class EnergyCalculator {
  /**
   * Calculates the energy profile for a route based on user's weight.
   * This method augments the per-point route data with cumulative calorie expenditure.
   * @param {Array<object>} perPointData - The rich per-point data from StatisticsCalculator.
   * @param {number} userWeightKg - The user's weight in kilograms.
   * @returns {object} An object containing the augmented perPointData with a `cumulativeKcal` property and the `totalKcal`.
   */
  static calculateEnergyProfile(perPointData, userWeightKg) {
    if (!perPointData || perPointData.length === 0 || !userWeightKg || userWeightKg <= 0) {
      // Return a zero-value object but keep the original data structure
      const zeroedData = perPointData.map(p => ({ ...p, cumulativeKcal: 0 }));
      return { totalKcal: 0, perPointData: zeroedData };
    }

    const energyProfileData = perPointData.map(point => {
      const kcal = point.cumulativeKmEffort * userWeightKg;
      return { ...point, cumulativeKcal: kcal };
    });

    const totalKcal = (perPointData[perPointData.length - 1]?.cumulativeKmEffort || 0) * userWeightKg;

    logger.info(`Calculated energy profile: Total Kcal = ${totalKcal.toFixed(0)}`);
    return { totalKcal, perPointData: energyProfileData };
  }

  /**
   * Finds the points along a route where refueling is recommended based on calorie expenditure.
   * @param {Array<object>} energyProfileData - The per-point data output from calculateEnergyProfile.
   * @param {number} kcalThreshold - The calorie expenditure that triggers a refuel stop.
   * @returns {Array<object>} An array of the point objects where refueling should happen.
   */
  static findRefuelPoints(energyProfileData, kcalThreshold) {
    if (!energyProfileData || !kcalThreshold || kcalThreshold <= 0) {
      return [];
    }
    const refuelPoints = [];
    let nextRefuelTarget = parseFloat(kcalThreshold);

    for (const point of energyProfileData) {
        if (point.cumulativeKcal >= nextRefuelTarget) {
            refuelPoints.push(point);
            nextRefuelTarget += parseFloat(kcalThreshold);
        }
    }
    logger.info(`Identified ${refuelPoints.length} refuel stops at a ${kcalThreshold} kcal threshold.`);
    return refuelPoints;
  }
}

export default EnergyCalculator;
