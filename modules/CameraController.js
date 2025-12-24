import logger from './Logger.js';
import SettingsManager from './SettingsManager.js';
import CinematicCameraStrategy from './CinematicCameraStrategy.js';
import OverheadCameraStrategy from './OverheadCameraStrategy.js';
import ThirdPersonCameraStrategy from './ThirdPersonCameraStrategy.js';

/**
 * Manages camera strategies, transitions, and provides the final camera state to the application.
 */
class CameraController {
  /**
   * @param {Cesium.Viewer} viewer - The Cesium viewer instance.
   * @param {SettingsManager} settingsManager - The application's settings manager.
   * @param {TourController} tourController - The application's tour controller.
   */
  constructor(viewer, settingsManager, tourController) {
    this._viewer = viewer;
    this._settingsManager = settingsManager;
    this._tourController = tourController;
    this._activeStrategy = null;
    this._clockShouldAnimateCallback = null; // Callback to start Cesium clock
    this._tourEndCallback = null; // Callback for when tour ends (fade-out complete)
    this._fadeTween = null; // Holds the active Cesium.Tween for transitions

    /**
     * Maps strategy names to their implementation classes.
     * @private
     */
    this._strategyMap = {
        'cinematic': CinematicCameraStrategy,
        'overhead': OverheadCameraStrategy,
        'third-person': ThirdPersonCameraStrategy,
    };

    /**
     * The internal state of the camera controller.
     * @type {'IDLE' | 'FADING_IN' | 'PLAYING' | 'FADING_OUT'}
     * @private
     */
    this._state = 'IDLE';
  }

  /**
   * Sets the active camera strategy.
   * @param {string} strategyName - The name of the strategy to activate.
   * @param {object} tourData - The tour data to pass to the new strategy.
   */
  setStrategy(strategyName, tourData) {
    if (this._strategyMap[strategyName]) {
      logger.info(`CameraController: Activating strategy "${strategyName}".`);
      this._activeStrategy = new this._strategyMap[strategyName](this._viewer, this._settingsManager);
      this._currentTourData = tourData; // Store tour data for regeneration

      if (tourData) {
        this._activeStrategy.generateCameraPath(tourData);
      }
    } else {
      logger.warn(`CameraController: Unknown camera strategy "${strategyName}".`);
      this._activeStrategy = null;
      this._currentTourData = null;
    }
  }

  /**
   * Starts the tour, beginning with the fade-in transition.
   * @param {object} tourData - The tour data for the playback.
   * @param {object} overviewCameraState - The camera state { position, orientation } from the 'Zoom to Route' view.
   * @param {function} clockShouldAnimateCallback - Callback to call when Cesium clock should start animating.
   * @param {function} tourEndCallback - Callback to call when tour playback (fade-out) is complete.
   */
  startTour(tourData, overviewCameraState, clockShouldAnimateCallback, tourEndCallback) {
    logger.info('CameraController: Starting tour with fade-in.');

    this._currentTourData = tourData;
    this._clockShouldAnimateCallback = clockShouldAnimateCallback;
    this._tourEndCallback = tourEndCallback;

    // Set/update the strategy first based on current settings
    this.setStrategy(this._settingsManager.get('cameraStrategy'), tourData);

    // Now, check if the strategy was successfully set
    if (!this._activeStrategy) {
      logger.error('No active or valid camera strategy set. Cannot start tour.');
      return;
    }

    this._state = 'FADING_IN';

    const transitionDuration = this._settingsManager.get('cameraTransitionDur');
    if (transitionDuration === 0) {
      // Skip fade-in if duration is 0
      this._onFadeInComplete();
      return;
    }

    const startCameraState = overviewCameraState;
    const endCameraState = this._activeStrategy.getCameraStateAtTime(this._currentTourData.startTime);

    if (!endCameraState) {
        logger.error("CameraController: Could not get start state for camera strategy.");
        this._onFadeInComplete(); // Proceed without fade
        return;
    }

    this._fadeTween = new Cesium.Tween({
      startObject: {
        position: startCameraState.position,
        heading: startCameraState.heading,
        pitch: startCameraState.pitch,
        roll: startCameraState.roll,
      },
      stopObject: {
        position: endCameraState.position,
        heading: endCameraState.orientation.heading,
        pitch: endCameraState.orientation.pitch,
        roll: endCameraState.orientation.roll,
      },
      duration: transitionDuration,
      easingFunction: Cesium.EasingFunction.SINE_IN_OUT,
      update: (value) => {
        this._viewer.camera.setView({
          destination: value.position,
          orientation: {
            heading: value.heading,
            pitch: value.pitch,
            roll: value.roll,
          },
        });
      },
      complete: () => {
        this._onFadeInComplete();
      },
    });
  }

  /**
   * Callback executed when fade-in transition is complete.
   * @private
   */
  _onFadeInComplete() {
    logger.info('CameraController: Fade-in complete. Starting tour playback.');
    this._state = 'PLAYING';
    if (this._clockShouldAnimateCallback) {
      this._clockShouldAnimateCallback();
    }
  }

  /**
   * Stops the tour, beginning with the fade-out transition.
   */
  stopTour() {
    logger.info('CameraController: Stopping tour with fade-out.');
    if (this._state === 'IDLE') return; // Already stopped or not playing

    const transitionDuration = this._settingsManager.get('cameraTransitionDur');
    const startCameraState = {
      position: this._viewer.camera.position.clone(),
      heading: this._viewer.camera.heading,
      pitch: this._viewer.camera.pitch,
      roll: this._viewer.camera.roll,
    };
    
    // Determine the end overview state (what would `zoomToRoute` produce)
    let endOverviewState = {};
    if (this._currentTourData && this._currentTourData.perPointData && this._currentTourData.perPointData.length > 0) {
      // Temporarily set state to IDLE to prevent updateCamera from interfering while we calculate overview
      const originalState = this._state;
      this._state = 'IDLE';

      const boundingSphere = Cesium.BoundingSphere.fromPoints(
        this._currentTourData.perPointData.map(p => Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.ele))
      );
      this._viewer.camera.flyToBoundingSphere(boundingSphere, {
        duration: 0, // Instant fly to get the target camera state
        complete: () => {
          endOverviewState.position = this._viewer.camera.position.clone();
          endOverviewState.heading = this._viewer.camera.heading;
          endOverviewState.pitch = this._viewer.camera.pitch;
          endOverviewState.roll = this._viewer.camera.roll;

          // Now initiate the fade-out tween
          this._state = 'FADING_OUT'; // Restore state for tween
          if (transitionDuration === 0) {
            this._viewer.camera.setView({
              destination: endOverviewState.position,
              orientation: {
                heading: endOverviewState.heading,
                pitch: endOverviewState.pitch,
                roll: endOverviewState.roll,
              },
            });
            this._onFadeOutComplete();
          } else {
            this._startFadeOutTween(startCameraState, endOverviewState, transitionDuration);
          }
        }
      });
    } else {
        // No tour data or invalid, just fade to current view if duration > 0 or instant complete
        endOverviewState = startCameraState; // Stay at current view
        this._state = 'FADING_OUT';
        if (transitionDuration === 0) {
            this._onFadeOutComplete();
        } else {
            this._startFadeOutTween(startCameraState, endOverviewState, transitionDuration);
        }
    }
  }

  /**
   * Helper to start the fade-out tween.
   * @param {object} startState - The camera state at the beginning of the fade-out.
   * @param {object} endState - The camera state at the end of the fade-out (overview).
   * @param {number} duration - The duration of the tween.
   * @private
   */
  _startFadeOutTween(startState, endState, duration) {
    this._fadeTween = new Cesium.Tween({
      startObject: startState,
      stopObject: endState,
      duration: duration,
      easingFunction: Cesium.EasingFunction.SINE_IN_OUT,
      update: (value) => {
        this._viewer.camera.setView({
          destination: value.position,
          orientation: {
            heading: value.heading,
            pitch: value.pitch,
            roll: value.roll,
          },
        });
      },
      complete: () => {
        this._onFadeOutComplete();
      },
    });
  }

  /**
   * Callback executed when fade-out transition is complete.
   * @private
   */
  _onFadeOutComplete() {
    logger.info('CameraController: Fade-out complete. Tour stopped.');
    this._state = 'IDLE';
    this._activeStrategy = null; // Clear active strategy
    this._currentTourData = null; // Clear tour data
    if (this._tourEndCallback) {
      this._tourEndCallback();
    }
  }

  /**
   * The main update method, called every frame by the post-render listener.
   * @param {Cesium.JulianDate} currentTime - The current time from the Cesium clock.
   * @param {function} uiUpdateCallback - Callback to notify app.js for UI updates with current state.
   */
  updateCamera(currentTime, uiUpdateCallback) {
    if (this._state === 'IDLE') {
      return;
    }
    
    // Sync app state with clock state
    if ((this._state === 'PLAYING') && !this._viewer.clock.shouldAnimate) {
        // User paused via timeline, etc.
        // This should notify app.js to change its state to PAUSED
    } else if (this._state === 'PAUSED' && this._viewer.clock.shouldAnimate) {
        // User unpaused via timeline, etc.
    }

    switch (this._state) {
      case 'PLAYING':
        if (!this._activeStrategy) return;
        const cameraState = this._activeStrategy.getCameraStateAtTime(currentTime);
        if (cameraState) {
          this._viewer.camera.setView({
            destination: cameraState.position,
            orientation: {
              heading: cameraState.orientation.heading,
              pitch: cameraState.orientation.pitch,
              roll: cameraState.orientation.roll,
            },
          });
        }
        break;
      case 'FADING_IN':
      case 'FADING_OUT':
        // Cesium.Tween is controlling the camera directly, no action needed here.
        break;
    }

    // Always provide current time and other UI-relevant data for UI updates
    if (uiUpdateCallback && this._currentTourData && this._currentTourData.perPointData.length > 0) {
        const tourStartTime = this._currentTourData.startTime;
        const tourStopTime = this._currentTourData.stopTime;

        const totalDuration = Cesium.JulianDate.secondsDifference(tourStopTime, tourStartTime);
        const elapsedTimeSeconds = Cesium.JulianDate.secondsDifference(currentTime, tourStartTime);
        const percentage = Math.min(elapsedTimeSeconds / totalDuration, 1.0);
        
        const elapsedHours = Math.floor(elapsedTimeSeconds / 3600).toString().padStart(2, '0');
        const elapsedMinutes = Math.floor((elapsedTimeSeconds % 3600) / 60).toString().padStart(2, '0');
        const elapsedSeconds = Math.floor(elapsedTimeSeconds % 60).toString().padStart(2, '0');
        const elapsedTimeString = `${elapsedHours}:${elapsedMinutes}:${elapsedSeconds}`;
        
        let timeString;
        const hasNativeTimestamps = this._currentTourData.perPointData[0].time !== null;

        if (hasNativeTimestamps) {
            const jsDate = Cesium.JulianDate.toDate(currentTime);
            timeString = `${jsDate.getFullYear()}-${(jsDate.getMonth() + 1).toString().padStart(2, '0')}-${jsDate.getDate().toString().padStart(2, '0')} ${jsDate.getHours().toString().padStart(2, '0')}:${jsDate.getMinutes().toString().padStart(2, '0')}:${jsDate.getSeconds().toString().padStart(2, '0')}`;
        } else {
            timeString = elapsedTimeString;
        }

        const liveStats = {};
        let currentPoint;
        if (percentage >= 1) {
            currentPoint = this._currentTourData.perPointData[this._currentTourData.perPointData.length - 1];
        } else {
            if (hasNativeTimestamps) {
                const currentIndex = this._currentTourData.perPointData.findIndex(p => p.time && (Cesium.JulianDate.fromDate(p.time) > currentTime));
                currentPoint = this._currentTourData.perPointData[Math.max(0, currentIndex - 1)];
            } else {
                currentPoint = this._currentTourData.perPointData.find(p => p.projectedTime >= elapsedTimeSeconds);
            }
        }

        if (currentPoint) {
            liveStats.elapsedTime = elapsedTimeString;
            liveStats.distance = (currentPoint.cumulativeDistance / 1000).toFixed(2);
            liveStats.ascent = (currentPoint.cumulativeElevationGain).toFixed(0);
            liveStats.kcal = currentPoint.cumulativeKcal.toFixed(0);

            if (hasNativeTimestamps) {
                liveStats.actualSpeed = currentPoint.actualSmoothedSpeedKmh.toFixed(1);
                liveStats.plannedSpeed = currentPoint.plannedSmoothedSpeed.toFixed(1);
                liveStats.actualVSpeed = (Math.round(currentPoint.actualSmoothedElevationRate / 10) * 10);
                liveStats.plannedVSpeed = (Math.round(currentPoint.plannedSmoothedElevationRate / 10) * 10);
                liveStats.actualKmEffortRate = currentPoint.actualSmoothedKmEffortRate.toFixed(1);
                liveStats.plannedKmEffortRate = currentPoint.plannedSmoothedKmEffortRate.toFixed(1);
            } else {
                liveStats.plannedSpeed = currentPoint.plannedSmoothedSpeed.toFixed(1);
                liveStats.plannedVSpeed = (Math.round(currentPoint.plannedSmoothedElevationRate / 10) * 10);
                liveStats.plannedKmEffortRate = currentPoint.plannedSmoothedKmEffortRate.toFixed(1);
            }
        }

        uiUpdateCallback({
            percentage,
            timeString,
            liveStats,
        });
    }
  }

  /**
   * Called when a camera-related setting changes.
   */
  onSettingsChange() {
    // Regenerate path only if there's an active strategy and tour data.
    // This is especially important for the Cinematic strategy.
    if (this._activeStrategy && this._currentTourData) {
      logger.info('CameraController: Camera settings changed, regenerating camera path.');
      this._activeStrategy.generateCameraPath(this._currentTourData);
    }
  }
}

export default CameraController;
