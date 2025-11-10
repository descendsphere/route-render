import logger from './Logger.js';

class SpeedController {
  constructor(viewerClock) {
    this.viewerClock = viewerClock;
    this.defaultMultiplier = 1; // Calculated based on route duration
    this.currentRelativeSpeed = 1; // From UI slider
    this.direction = 1; // 1 for forward, -1 for backward
  }

  /**
   * Calculates the default speed multiplier based on route duration and a target playback time.
   * Sets the clock multiplier to this default speed.
   * @param {Cesium.JulianDate} startTime - The start time of the tour.
   * @param {Cesium.JulianDate} stopTime - The stop time of the tour.
   * @param {number} targetDurationInSeconds - The desired duration of the tour in seconds.
   */
  calculateAndSetDefault(startTime, stopTime, targetDurationInSeconds) {
    const realDurationInSeconds = Cesium.JulianDate.secondsDifference(stopTime, startTime);
    this.defaultMultiplier = realDurationInSeconds / targetDurationInSeconds;
    this.setRelativeSpeed(this.currentRelativeSpeed); // Apply current relative speed to new default
    logger.info(`Default tour speed calculated: ${this.defaultMultiplier.toFixed(2)}x`);
  }

  /**
   * Sets the tour speed relative to the calculated default speed.
   * @param {number} relativeSpeed - The relative speed multiplier (e.g., 1 for default, 2 for double speed).
   */
  setRelativeSpeed(relativeSpeed) {
    this.currentRelativeSpeed = relativeSpeed;
    this.viewerClock.multiplier = this.defaultMultiplier * this.currentRelativeSpeed * this.direction;
    logger.info(`Relative speed set to: ${this.currentRelativeSpeed.toFixed(2)}x (Effective: ${this.viewerClock.multiplier.toFixed(0)}x)`);
  }

  /**
   * Gets the currently effective speed multiplier.
   * @returns {number} The effective speed multiplier.
   */
  getEffectiveSpeed() {
    return this.viewerClock.multiplier;
  }

  /**
   * Toggles the direction of playback and updates the clock.
   */
  toggleDirection() {
    this.direction *= -1;
    this.viewerClock.multiplier = this.defaultMultiplier * this.currentRelativeSpeed * this.direction;
  }

  /**
   * Resets the playback direction to forward.
   */
  resetDirection() {
    this.direction = 1;
    this.viewerClock.multiplier = this.defaultMultiplier * this.currentRelativeSpeed * this.direction;
  }

  /**
   * Gets the current playback direction.
   * @returns {number} 1 for forward, -1 for backward.
   */
  getDirection() {
    return this.direction;
  }
}

export default SpeedController;
