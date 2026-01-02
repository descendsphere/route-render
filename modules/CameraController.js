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
  constructor(viewer, settingsManager) {
    this._viewer = viewer;
    this._settingsManager = settingsManager;
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

    const transitionDuration = 0; //this._settingsManager.get('cameraTransitionDur');
    if (transitionDuration === 0) {
      // Skip fade-in if duration is 0
      this._onFadeInComplete();
      return;
    }

    const endCameraStateCommand = this._activeStrategy.getCameraStateAtTime(this._currentTourData.startTime);

    if (!endCameraStateCommand) {
        logger.error("CameraController: Could not get start state for camera strategy.");
        this._onFadeInComplete(); // Proceed without fade
        return;
    }
    
    // Convert the command to a state flyTo can use.
    const flyToState = this._calculateFlyToState(endCameraStateCommand);

    if (this._settingsManager.get('cameraStrategy') === 'cinematic') {
        this._viewer.camera.flyTo({
          destination: flyToState.position,
          orientation: flyToState.orientation,
          duration: transitionDuration,
          easingFunction: Cesium.EasingFunction.SINE_IN_OUT,
          complete: () => {
            this._onFadeInComplete();
          },
        });
    } else {
        // For interactive cameras, snap instantly to the start position.
        this._viewer.camera.setView({
            destination: flyToState.position,
            orientation: flyToState.orientation
        });
        this._onFadeInComplete();
    }
  }

  /**
   * Converts a state command object (which could be lookAt or setView)
   * into a { position, orientation } object suitable for flyTo.
   * @param {object} stateCommand - The command object from a strategy.
   * @returns {object} A { position, orientation } object.
   * @private
   */
  _calculateFlyToState(stateCommand) {
    if (stateCommand.setView) {
      return {
        position: stateCommand.setView.destination,
        orientation: stateCommand.setView.orientation
      };
    }

    if (stateCommand.lookAt) {
      const { target, hpr } = stateCommand.lookAt;
      
      // This is the robust manual calculation to find the camera position
      // and orientation that results from a "lookAt" command.
      const transform = Cesium.Transforms.headingPitchRollToFixedFrame(target, new Cesium.HeadingPitchRoll(hpr.heading, 0, 0));
      const x = -hpr.range * Math.cos(hpr.pitch);
      const z = hpr.range * Math.sin(hpr.pitch);
      const localOffset = new Cesium.Cartesian3(x, 0, z);
      const position = Cesium.Matrix4.multiplyByPoint(transform, localOffset, new Cesium.Cartesian3());

      const direction = Cesium.Cartesian3.normalize(Cesium.Cartesian3.subtract(target, position, new Cesium.Cartesian3()), new Cesium.Cartesian3());
      const up = Cesium.Cartesian3.normalize(target, new Cesium.Cartesian3());
      const right = Cesium.Cartesian3.normalize(Cesium.Cartesian3.cross(direction, up, new Cesium.Cartesian3()), new Cesium.Cartesian3());
      const trueUp = Cesium.Cartesian3.cross(right, direction, new Cesium.Cartesian3());
      const rotationMatrix = Cesium.Matrix3.fromRowMajorArray([right.x, right.y, right.z, trueUp.x, trueUp.y, trueUp.z, -direction.x, -direction.y, -direction.z]);
      const finalHpr = Cesium.HeadingPitchRoll.fromQuaternion(Cesium.Quaternion.fromRotationMatrix(rotationMatrix));
      
      return {
        position: position,
        orientation: {
          heading: finalHpr.heading,
          pitch: finalHpr.pitch,
          roll: 0.0 // Force roll to be zero for transitions
        }
      };
    }
    
    // Fallback for older strategies that might still return position/orientation directly
    // This path is temporary for the current debugging phase.
    return stateCommand;
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

    const transitionDuration = 0; //this._settingsManager.get('cameraTransitionDur');
    this._state = 'FADING_OUT';

    // Determine the end overview state by flying to the bounding sphere of the route
    if (this._settingsManager.get('cameraStrategy') === 'cinematic') {
      if (this._currentTourData && this._currentTourData.perPointData && this._currentTourData.perPointData.length > 0) {
        const boundingSphere = Cesium.BoundingSphere.fromPoints(
          this._currentTourData.perPointData.map(p => Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.ele))
        );
        
        this._viewer.camera.flyToBoundingSphere(boundingSphere, {
          duration: transitionDuration,
          easingFunction: Cesium.EasingFunction.SINE_IN_OUT,
          complete: () => {
            this._onFadeOutComplete();
          }
        });
      } else {
        // If no tour data, just complete the stop immediately.
        this._onFadeOutComplete();
      }
    } else {
      // For interactive cameras, just stop without any camera movement.
      this._onFadeOutComplete();
    }
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
          if (cameraState.lookAt) {
            this._viewer.camera.lookAt(cameraState.lookAt.target, cameraState.lookAt.hpr);
          } else if (cameraState.setView) {
            this._viewer.camera.setView(cameraState.setView);
          }
        }
        break;
      case 'FADING_IN':
      case 'FADING_OUT':
        // The camera is being controlled by flyTo or flyToBoundingSphere, no action needed.
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
